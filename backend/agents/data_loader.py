"""
Real Traffic Data Loader
Loads preprocessed CIC DDoS 2019 data and provides streaming interface
Supports both batch loading and real-time simulation
"""
import json
import random
from pathlib import Path
from typing import Dict, List, Optional, Iterator
from datetime import datetime
import glob


class RealTrafficDataLoader:
    """
    Loads and serves real CIC DDoS 2019 network traffic data
    Provides fallback to synthetic data if dataset not available
    """

    def __init__(self, processed_data_dir: str = "data/processed"):
        self.processed_data_dir = Path(processed_data_dir)
        self.available_datasets = []
        self.current_dataset_index = 0
        self.mode = "demo"  # "demo" or "real"

        self._load_available_datasets()

    def _load_available_datasets(self):
        """Scan for available processed dataset files"""
        if not self.processed_data_dir.exists():
            print(f"Processed data directory not found: {self.processed_data_dir}")
            print("Operating in DEMO mode with synthetic data")
            return

        json_files = list(self.processed_data_dir.glob("*.json"))

        if not json_files:
            print(f"No processed datasets found in {self.processed_data_dir}")
            print("Operating in DEMO mode with synthetic data")
            print("\nTo use real CIC DDoS 2019 data:")
            print("1. Download dataset CSV files")
            print("2. Place in backend/data/raw/")
            print("3. Run: python -m agents.data_preprocessor")
            return

        self.available_datasets = sorted(json_files)
        self.mode = "real"
        print(f"Found {len(self.available_datasets)} processed datasets:")
        for dataset in self.available_datasets:
            print(f"  - {dataset.name}")

    def is_real_data_available(self) -> bool:
        """Check if real CIC DDoS data is available"""
        return self.mode == "real" and len(self.available_datasets) > 0

    def load_dataset(self, dataset_name: Optional[str] = None) -> Optional[Dict]:
        """
        Load a specific dataset or select one randomly

        Args:
            dataset_name: Optional specific dataset filename

        Returns:
            Dictionary with network data or None if not found
        """
        if not self.is_real_data_available():
            return None

        if dataset_name:
            # Load specific dataset
            dataset_path = self.processed_data_dir / dataset_name
            if not dataset_path.exists():
                dataset_path = self.processed_data_dir / f"{dataset_name}.json"

            if not dataset_path.exists():
                print(f"Dataset not found: {dataset_name}")
                return None
        else:
            # Select random dataset
            dataset_path = random.choice(self.available_datasets)

        try:
            with open(dataset_path, 'r') as f:
                data = json.load(f)
                print(f"Loaded dataset: {dataset_path.name}")
                return data
        except Exception as e:
            print(f"Error loading dataset {dataset_path}: {e}")
            return None

    def get_traffic_batch(self, batch_size: int = 50, dataset_name: Optional[str] = None) -> Dict:
        """
        Get a batch of network traffic (nodes and edges)

        Args:
            batch_size: Maximum number of edges to return
            dataset_name: Optional specific dataset to use

        Returns:
            Dictionary with nodes, edges, and statistics
        """
        dataset = self.load_dataset(dataset_name)

        if not dataset:
            # Return empty structure if no data
            return {
                "nodes": [],
                "edges": [],
                "statistics": {
                    "total_nodes": 0,
                    "total_edges": 0,
                    "total_traffic": 0,
                    "attack_count": 0,
                    "suspicious_count": 0,
                    "normal_count": 0
                },
                "metadata": {
                    "source": "none",
                    "timestamp": datetime.now().isoformat()
                }
            }

        # Sample a batch from the dataset
        all_edges = dataset.get("edges", [])
        all_nodes = dataset.get("nodes", [])

        # Strategy: Ensure diverse node types by including edges with different node types
        # Group nodes by type
        nodes_by_type = {}
        for node in all_nodes:
            node_type = node.get("node_type", "client")
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = []
            nodes_by_type[node_type].append(node)

        # Sample edges, but ensure we get edges involving servers/routers
        sampled_edges = []
        if len(all_edges) > batch_size:
            # First, prioritize edges involving servers, routers, and other infrastructure
            priority_edges = []
            regular_edges = []

            # Build node type lookup
            node_type_lookup = {node["id"]: node.get("node_type", "client") for node in all_nodes}

            for edge in all_edges:
                src_type = node_type_lookup.get(edge["source_id"], "client")
                dst_type = node_type_lookup.get(edge["target_id"], "client")

                # Prioritize edges with servers, routers, firewalls
                if src_type in ["server", "router", "firewall", "load_balancer", "database"] or \
                   dst_type in ["server", "router", "firewall", "load_balancer", "database"]:
                    priority_edges.append(edge)
                else:
                    regular_edges.append(edge)

            # Sample: 60% priority edges, 40% regular edges to show diverse topology
            priority_count = min(len(priority_edges), int(batch_size * 0.6))
            regular_count = batch_size - priority_count

            if priority_edges:
                sampled_edges.extend(random.sample(priority_edges, min(priority_count, len(priority_edges))))
            if regular_edges and regular_count > 0:
                sampled_edges.extend(random.sample(regular_edges, min(regular_count, len(regular_edges))))
        else:
            sampled_edges = all_edges

        # Get all nodes referenced by sampled edges
        edge_node_ids = set()
        for edge in sampled_edges:
            edge_node_ids.add(edge["source_id"])
            edge_node_ids.add(edge["target_id"])

        sampled_nodes = [node for node in all_nodes if node["id"] in edge_node_ids]

        # Calculate batch statistics
        total_traffic = sum(node.get("traffic_volume", 0) for node in sampled_nodes)
        attack_count = len([e for e in sampled_edges if e.get("connection_type") == "attack"])
        suspicious_count = len([e for e in sampled_edges if e.get("connection_type") == "suspicious"])
        normal_count = len([e for e in sampled_edges if e.get("connection_type") == "normal"])

        return {
            "nodes": sampled_nodes,
            "edges": sampled_edges,
            "statistics": {
                "total_nodes": len(sampled_nodes),
                "total_edges": len(sampled_edges),
                "total_traffic": total_traffic,
                "attack_count": attack_count,
                "suspicious_count": suspicious_count,
                "normal_count": normal_count
            },
            "metadata": {
                "source": "CIC-DDoS-2019",
                "timestamp": datetime.now().isoformat(),
                "dataset": dataset.get("metadata", {})
            }
        }

    def stream_traffic(self, dataset_name: Optional[str] = None,
                      batch_size: int = 50,
                      interval: float = 2.0) -> Iterator[Dict]:
        """
        Stream traffic data in batches (generator)

        Args:
            dataset_name: Optional specific dataset to use
            batch_size: Edges per batch
            interval: Seconds between batches (for reference)

        Yields:
            Traffic batch dictionaries
        """
        dataset = self.load_dataset(dataset_name)

        if not dataset:
            return

        all_edges = dataset.get("edges", [])
        all_nodes = dataset.get("nodes", [])

        # Create node lookup
        node_lookup = {node["id"]: node for node in all_nodes}

        # Stream edges in batches
        for i in range(0, len(all_edges), batch_size):
            batch_edges = all_edges[i:i + batch_size]

            # Get nodes for this batch
            edge_node_ids = set()
            for edge in batch_edges:
                edge_node_ids.add(edge["source_id"])
                edge_node_ids.add(edge["target_id"])

            batch_nodes = [node_lookup[node_id] for node_id in edge_node_ids if node_id in node_lookup]

            # Calculate statistics
            total_traffic = sum(node.get("traffic_volume", 0) for node in batch_nodes)
            attack_count = len([e for e in batch_edges if e.get("connection_type") == "attack"])
            suspicious_count = len([e for e in batch_edges if e.get("connection_type") == "suspicious"])
            normal_count = len([e for e in batch_edges if e.get("connection_type") == "normal"])

            yield {
                "nodes": batch_nodes,
                "edges": batch_edges,
                "statistics": {
                    "total_nodes": len(batch_nodes),
                    "total_edges": len(batch_edges),
                    "total_traffic": total_traffic,
                    "attack_count": attack_count,
                    "suspicious_count": suspicious_count,
                    "normal_count": normal_count
                },
                "metadata": {
                    "source": "CIC-DDoS-2019",
                    "timestamp": datetime.now().isoformat(),
                    "batch_number": i // batch_size,
                    "total_batches": (len(all_edges) + batch_size - 1) // batch_size
                }
            }

    def get_dataset_info(self) -> Dict:
        """Get information about available datasets"""
        return {
            "mode": self.mode,
            "available_datasets": [d.name for d in self.available_datasets],
            "total_datasets": len(self.available_datasets),
            "data_directory": str(self.processed_data_dir)
        }

    def get_attack_types_available(self) -> List[str]:
        """Get list of attack types across all datasets"""
        attack_types = set()

        for dataset_file in self.available_datasets:
            try:
                with open(dataset_file, 'r') as f:
                    data = json.load(f)
                    stats = data.get("statistics", {})
                    attack_type_dist = stats.get("attack_types", {})
                    attack_types.update(attack_type_dist.keys())
            except Exception as e:
                print(f"Error reading {dataset_file}: {e}")

        return sorted(list(attack_types))


# Singleton instance
real_traffic_loader = RealTrafficDataLoader()


# Utility function for backward compatibility
def get_real_or_demo_traffic(batch_size: int = 50) -> Dict:
    """
    Get traffic data - real if available, otherwise return indicator for demo mode

    Args:
        batch_size: Number of edges to return

    Returns:
        Traffic data dictionary
    """
    if real_traffic_loader.is_real_data_available():
        return real_traffic_loader.get_traffic_batch(batch_size)
    else:
        return {
            "mode": "demo",
            "message": "Using synthetic data - CIC DDoS dataset not loaded"
        }
