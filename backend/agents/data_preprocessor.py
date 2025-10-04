"""
CIC DDoS 2019 Data Preprocessor
Loads, cleans, and transforms raw CSV files into usable format
Maps dataset features to network graph representation
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import json
from datetime import datetime

# Try absolute import first (when run as module), fall back to relative
try:
    from agents.geoip_service import geoip_service
except ImportError:
    from geoip_service import geoip_service


class CICDDoSPreprocessor:
    """
    Preprocessor for CIC DDoS 2019 dataset
    Handles CSV parsing, feature extraction, and data transformation
    """

    # Attack type mappings from CIC DDoS labels and filenames
    ATTACK_TYPE_MAP = {
        # Label-based mappings
        "BENIGN": "normal",
        "DrDoS_DNS": "DDoS-DNS",
        "DrDoS_LDAP": "DDoS-LDAP",
        "DrDoS_MSSQL": "DDoS-MSSQL",
        "DrDoS_NetBIOS": "DDoS-NetBIOS",
        "DrDoS_NTP": "DDoS-NTP",
        "DrDoS_SNMP": "DDoS-SNMP",
        "DrDoS_SSDP": "DDoS-SSDP",
        "DrDoS_UDP": "DDoS-UDP",
        "TFTP": "DDoS-TFTP",
        "Syn": "SYN-Flood",
        "UDP": "UDP-Flood",
        "UDPLag": "UDP-Lag",
        "WebDDoS": "Web-DDoS",
        "LDAP": "DDoS-LDAP",
        "MSSQL": "DDoS-MSSQL",
        "NetBIOS": "DDoS-NetBIOS",
        "Portmap": "DDoS-Portmap",
        "PortScan": "Port-Scan"
    }

    # Node type inference from ports
    SERVER_PORTS = {80, 443, 22, 21, 25, 53, 110, 143, 3306, 5432, 8080, 8443, 123, 389, 1434, 161, 1900, 69}
    DATABASE_PORTS = {3306, 5432, 1433, 1434, 27017, 6379, 5984}  # MySQL, PostgreSQL, MSSQL, MongoDB, Redis, CouchDB
    WEB_SERVER_PORTS = {80, 443, 8080, 8443, 8000, 8888}  # HTTP/HTTPS servers

    def __init__(self, raw_data_dir: str = "data/raw",
                 processed_data_dir: str = "data/processed"):
        self.raw_data_dir = Path(raw_data_dir)
        self.processed_data_dir = Path(processed_data_dir)
        self.processed_data_dir.mkdir(parents=True, exist_ok=True)

        # Cache for IP to geo mapping
        self.ip_geo_cache = {}

    def find_data_files(self) -> List[Path]:
        """Find all CSV and Parquet files in raw data directory"""
        csv_files = list(self.raw_data_dir.rglob("*.csv"))
        parquet_files = list(self.raw_data_dir.rglob("*.parquet"))
        return csv_files + parquet_files

    def load_data_file(self, filepath: Path, nrows: Optional[int] = None) -> pd.DataFrame:
        """
        Load a single CSV or Parquet file with error handling

        Args:
            filepath: Path to CSV or Parquet file
            nrows: Optional limit on number of rows to load

        Returns:
            DataFrame with loaded data
        """
        print(f"Loading {filepath.name}...")

        try:
            # Detect file type and load accordingly
            if filepath.suffix.lower() == '.parquet':
                # Load Parquet file
                df = pd.read_parquet(filepath)

                # Apply row limit if specified
                if nrows is not None:
                    df = df.head(nrows)

                # Convert categorical columns to regular types to avoid issues
                for col in df.columns:
                    if pd.api.types.is_categorical_dtype(df[col]):
                        df[col] = df[col].astype(str)
            else:
                # Load CSV file
                # CIC DDoS CSVs may have inconsistent whitespace in headers
                df = pd.read_csv(filepath, nrows=nrows, low_memory=False)

            # Clean column names (remove leading/trailing spaces)
            df.columns = df.columns.str.strip()

            # Handle infinity and NaN values
            df.replace([float('inf'), float('-inf')], 0, inplace=True)
            df.fillna(0, inplace=True)

            print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")
            return df

        except Exception as e:
            print(f"  Error loading {filepath}: {e}")
            return pd.DataFrame()

    def infer_node_type(self, port: int, is_source: bool) -> str:
        """
        Infer node type from port number

        Args:
            port: Port number
            is_source: Whether this is source or destination

        Returns:
            Node type string (server, client, router, database)
        """
        # Router traffic (port 0)
        if port == 0:
            return "router"

        # Database servers
        elif port in self.DATABASE_PORTS:
            return "database"

        # Web/application servers
        elif port in self.SERVER_PORTS:
            return "server"

        # Ephemeral client ports
        elif is_source and port > 49152:
            return "client"

        # Default to client
        else:
            return "client"

    def extract_label(self, row: pd.Series) -> str:
        """Extract and normalize attack label from row"""
        # Try common label column names
        label_columns = [' Label', 'Label', ' label', 'label']

        for col in label_columns:
            if col in row:
                raw_label = str(row[col]).strip()
                return self.ATTACK_TYPE_MAP.get(raw_label, raw_label)

        return "unknown"

    def process_flow_to_nodes_edges(self, row: pd.Series, flow_id: int) -> Tuple[List[Dict], List[Dict]]:
        """
        Convert a single flow record to nodes and edges

        Args:
            row: DataFrame row with flow data
            flow_id: Unique flow identifier

        Returns:
            Tuple of (nodes, edges) lists
        """
        nodes = []
        edges = []

        # Extract flow identifiers (handle variations in column naming)
        src_ip = str(row.get(' Source IP', row.get('Source IP', '0.0.0.0'))).strip()
        dst_ip = str(row.get(' Destination IP', row.get('Destination IP', '0.0.0.0'))).strip()
        src_port = int(row.get(' Source Port', row.get('Source Port', 0)))
        dst_port = int(row.get(' Destination Port', row.get('Destination Port', 0)))
        protocol = str(row.get(' Protocol', row.get('Protocol', 'TCP'))).strip()

        # Get attack label
        label = self.extract_label(row)

        # Determine connection type and status
        if label == "normal":
            connection_type = "normal"
            src_status = "normal"
            dst_status = "normal"
        elif "Scan" in label:
            connection_type = "suspicious"
            src_status = "suspicious"
            dst_status = "normal"
        else:
            connection_type = "attack"
            src_status = "suspicious"  # Attacker
            dst_status = "attacked"    # Victim

        # Get geo data for IPs
        if src_ip not in self.ip_geo_cache:
            self.ip_geo_cache[src_ip] = geoip_service.lookup(src_ip)
        if dst_ip not in self.ip_geo_cache:
            self.ip_geo_cache[dst_ip] = geoip_service.lookup(dst_ip)

        src_geo = self.ip_geo_cache[src_ip]
        dst_geo = self.ip_geo_cache[dst_ip]

        # Calculate traffic metrics
        total_fwd_packets = int(row.get(' Total Fwd Packets', row.get('Total Fwd Packets', 0)))
        total_bwd_packets = int(row.get(' Total Backward Packets', row.get('Total Backward Packets', 0)))
        total_packets = total_fwd_packets + total_bwd_packets

        fwd_bytes = int(row.get(' Total Length of Fwd Packets', row.get('Total Length of Fwd Packets', 0)))
        bwd_bytes = int(row.get(' Total Length of Bwd Packets', row.get('Total Length of Bwd Packets', 0)))
        total_bytes = fwd_bytes + bwd_bytes

        flow_duration = float(row.get(' Flow Duration', row.get('Flow Duration', 1)))

        # Calculate bandwidth (bytes per second)
        bandwidth = int((total_bytes / (flow_duration / 1_000_000)) if flow_duration > 0 else 0)

        # Calculate latency estimate from IAT (Inter-Arrival Time)
        fwd_iat_mean = float(row.get(' Fwd IAT Mean', row.get('Fwd IAT Mean', 0)))
        latency = fwd_iat_mean / 1000  # Convert microseconds to milliseconds

        # Create source node
        src_node = {
            "id": f"{src_ip}:{src_port}",
            "ip": src_ip,
            "port": src_port,
            "country": src_geo["country"],
            "city": src_geo["city"],
            "latitude": src_geo["latitude"],
            "longitude": src_geo["longitude"],
            "node_type": self.infer_node_type(src_port, True),
            "status": src_status,
            "traffic_volume": fwd_bytes,
            "last_seen": datetime.now().isoformat()
        }

        # Create destination node
        dst_node = {
            "id": f"{dst_ip}:{dst_port}",
            "ip": dst_ip,
            "port": dst_port,
            "country": dst_geo["country"],
            "city": dst_geo["city"],
            "latitude": dst_geo["latitude"],
            "longitude": dst_geo["longitude"],
            "node_type": self.infer_node_type(dst_port, False),
            "status": dst_status,
            "traffic_volume": bwd_bytes,
            "last_seen": datetime.now().isoformat()
        }

        # Create edge
        edge = {
            "id": f"flow_{flow_id}",
            "source_id": src_node["id"],
            "target_id": dst_node["id"],
            "connection_type": connection_type,
            "bandwidth": bandwidth,
            "latency": latency,
            "packet_count": total_packets,
            "protocol": protocol,
            "attack_type": label if connection_type == "attack" else None,
            "timestamp": datetime.now().isoformat()
        }

        nodes.extend([src_node, dst_node])
        edges.append(edge)

        return nodes, edges

    def process_dataframe(self, df: pd.DataFrame, max_flows: Optional[int] = None) -> Dict:
        """
        Process entire dataframe into network graph format

        Args:
            df: DataFrame with CIC DDoS flow data
            max_flows: Optional limit on flows to process

        Returns:
            Dictionary with nodes, edges, and statistics
        """
        all_nodes = {}  # Use dict to deduplicate by ID
        all_edges = []

        # Limit flows if specified
        if max_flows:
            df = df.head(max_flows)

        print(f"Processing {len(df)} flows...")

        for idx, row in df.iterrows():
            nodes, edges = self.process_flow_to_nodes_edges(row, idx)

            # Add nodes (avoiding duplicates)
            for node in nodes:
                node_id = node["id"]
                if node_id not in all_nodes:
                    all_nodes[node_id] = node
                else:
                    # Aggregate traffic volume
                    all_nodes[node_id]["traffic_volume"] += node["traffic_volume"]
                    # Update status to most severe
                    if node["status"] == "attacked":
                        all_nodes[node_id]["status"] = "attacked"
                    elif node["status"] == "suspicious" and all_nodes[node_id]["status"] != "attacked":
                        all_nodes[node_id]["status"] = "suspicious"

            # Add edges
            all_edges.extend(edges)

        # Convert nodes dict to list
        nodes_list = list(all_nodes.values())

        # Calculate statistics
        total_traffic = sum(node["traffic_volume"] for node in nodes_list)
        attack_count = len([e for e in all_edges if e["connection_type"] == "attack"])
        suspicious_count = len([e for e in all_edges if e["connection_type"] == "suspicious"])
        normal_count = len([e for e in all_edges if e["connection_type"] == "normal"])

        # Get attack type distribution
        attack_types = {}
        for edge in all_edges:
            if edge["attack_type"]:
                attack_types[edge["attack_type"]] = attack_types.get(edge["attack_type"], 0) + 1

        print(f"Processed: {len(nodes_list)} unique nodes, {len(all_edges)} edges")
        print(f"  Attacks: {attack_count}, Suspicious: {suspicious_count}, Normal: {normal_count}")

        return {
            "nodes": nodes_list,
            "edges": all_edges,
            "statistics": {
                "total_nodes": len(nodes_list),
                "total_edges": len(all_edges),
                "total_traffic": total_traffic,
                "attack_count": attack_count,
                "suspicious_count": suspicious_count,
                "normal_count": normal_count,
                "attack_types": attack_types
            },
            "metadata": {
                "processed_at": datetime.now().isoformat(),
                "source": "CIC-DDoS-2019",
                "flow_count": len(df)
            }
        }

    def save_processed_data(self, data: Dict, output_name: str):
        """Save processed data to JSON file"""
        output_path = self.processed_data_dir / f"{output_name}.json"

        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Saved processed data to {output_path}")

    def process_all_data_files(self, max_flows_per_file: int = 1000):
        """
        Process all CSV and Parquet files in raw data directory

        Args:
            max_flows_per_file: Maximum flows to process per file
        """
        data_files = self.find_data_files()

        if not data_files:
            print(f"No CSV or Parquet files found in {self.raw_data_dir}")
            print("Please download CIC DDoS 2019 dataset and place files in backend/data/raw/")
            return

        print(f"Found {len(data_files)} data files")

        for data_file in data_files:
            # Load data file
            df = self.load_data_file(data_file, nrows=max_flows_per_file)

            if df.empty:
                continue

            # Process to network graph
            processed_data = self.process_dataframe(df, max_flows=max_flows_per_file)

            # Save processed data
            output_name = data_file.stem  # Filename without extension
            self.save_processed_data(processed_data, output_name)

            print(f"✓ Completed {data_file.name}\n")


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Preprocess CIC DDoS 2019 dataset")
    parser.add_argument("--max-flows", type=int, default=1000,
                       help="Maximum flows to process per file")
    parser.add_argument("--raw-dir", type=str, default="backend/data/raw",
                       help="Raw data directory")
    parser.add_argument("--output-dir", type=str, default="backend/data/processed",
                       help="Processed data output directory")

    args = parser.parse_args()

    preprocessor = CICDDoSPreprocessor(
        raw_data_dir=args.raw_dir,
        processed_data_dir=args.output_dir
    )

    preprocessor.process_all_data_files(max_flows_per_file=args.max_flows)
