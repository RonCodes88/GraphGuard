"""
Attack Incident Aggregator
Groups real CIC DDoS data into discrete attack incidents for visualization
Each incident represents a cohesive attack campaign
"""
import json
from typing import Dict, List, Tuple
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import random


class AttackIncidentAggregator:
    """
    Aggregates network traffic data into attack incidents
    Each incident is a self-contained attack with all involved nodes and edges
    """

    def __init__(self):
        self.incidents = []

    def create_incidents_from_dataset(self, dataset: Dict, max_incidents: int = 5) -> List[Dict]:
        """
        Break a dataset into multiple attack incidents

        Args:
            dataset: Processed CIC DDoS dataset (nodes, edges, statistics)
            max_incidents: Maximum number of incidents to create

        Returns:
            List of incident dictionaries
        """
        all_nodes = dataset.get("nodes", [])
        all_edges = dataset.get("edges", [])

        # Group edges by attack type
        edges_by_attack = defaultdict(list)
        for edge in all_edges:
            attack_type = edge.get("attack_type", "normal")
            if attack_type and attack_type != "normal":
                edges_by_attack[attack_type].append(edge)

        incidents = []

        # Create one incident per attack type
        for attack_type, attack_edges in edges_by_attack.items():
            if not attack_edges:
                continue

            # Limit edges per incident for performance
            incident_edges = attack_edges[:100] if len(attack_edges) > 100 else attack_edges

            # Get all nodes involved in these edges
            node_ids_in_incident = set()
            for edge in incident_edges:
                node_ids_in_incident.add(edge["source_id"])
                node_ids_in_incident.add(edge["target_id"])

            incident_nodes = [n for n in all_nodes if n["id"] in node_ids_in_incident]

            if not incident_nodes:
                continue

            # Find attacked nodes (victims)
            victims = [n for n in incident_nodes if n.get("status") == "attacked"]
            attackers = [n for n in incident_nodes if n.get("status") == "suspicious"]

            # Calculate geographic center using the primary victim cluster
            # (to avoid ocean coordinates when victims span multiple continents)
            if victims:
                # Group victims by country to find primary target location
                from collections import Counter
                victim_countries = [v.get("country", "Unknown") for v in victims]
                most_common_country = Counter(victim_countries).most_common(1)[0][0]

                # Use average location of victims in the most targeted country
                primary_victims = [v for v in victims if v.get("country") == most_common_country]
                avg_lat = sum(v.get("latitude", 0) for v in primary_victims) / len(primary_victims)
                avg_lon = sum(v.get("longitude", 0) for v in primary_victims) / len(primary_victims)
            else:
                # Fallback to all nodes
                avg_lat = sum(n.get("latitude", 0) for n in incident_nodes) / len(incident_nodes)
                avg_lon = sum(n.get("longitude", 0) for n in incident_nodes) / len(incident_nodes)

            # Get affected countries
            affected_countries = list(set(n.get("country", "Unknown") for n in incident_nodes))

            # Calculate severity based on packet count
            total_packets = sum(e.get("packet_count", 0) for e in incident_edges)
            if total_packets > 500000:
                severity = "critical"
            elif total_packets > 100000:
                severity = "high"
            elif total_packets > 10000:
                severity = "medium"
            else:
                severity = "low"

            # Create incident
            incident = {
                "incident_id": f"{attack_type.lower().replace('-', '_')}_{random.randint(1000, 9999)}",
                "attack_type": attack_type,
                "center_lat": avg_lat,
                "center_lon": avg_lon,
                "severity": severity,
                "affected_countries": affected_countries,
                "victim_count": len(victims),
                "attacker_count": len(attackers),
                "total_nodes": len(incident_nodes),
                "total_edges": len(incident_edges),
                "total_packets": total_packets,
                "timestamp": datetime.now().isoformat(),
                "nodes": incident_nodes,
                "edges": incident_edges,
                "dataset_source": dataset.get("metadata", {}).get("source", "Unknown")
            }

            incidents.append(incident)

            if len(incidents) >= max_incidents:
                break

        return incidents

    def load_all_incidents(self, processed_data_dir: str = "data/processed",
                          incidents_per_dataset: int = 1) -> List[Dict]:
        """
        Load all datasets and create incident list

        Args:
            processed_data_dir: Directory with processed JSON files
            incidents_per_dataset: Number of incidents to extract per dataset

        Returns:
            List of all incidents
        """
        processed_dir = Path(processed_data_dir)

        if not processed_dir.exists():
            print(f"Processed data directory not found: {processed_dir}")
            return []

        json_files = list(processed_dir.glob("*.json"))
        all_incidents = []

        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    dataset = json.load(f)

                # Create incidents from this dataset
                incidents = self.create_incidents_from_dataset(dataset, max_incidents=incidents_per_dataset)
                all_incidents.extend(incidents)

                print(f"Created {len(incidents)} incidents from {json_file.name}")

            except Exception as e:
                print(f"Error processing {json_file}: {e}")
                continue

        print(f"\nTotal incidents created: {len(all_incidents)}")
        return all_incidents

    def get_incident_summary(self, incidents: List[Dict]) -> Dict:
        """
        Get summary statistics about incidents

        Args:
            incidents: List of incident dictionaries

        Returns:
            Summary dictionary
        """
        if not incidents:
            return {
                "total_incidents": 0,
                "attack_types": {},
                "severity_distribution": {},
                "total_affected_countries": 0
            }

        attack_types = defaultdict(int)
        severity_dist = defaultdict(int)
        all_countries = set()

        for incident in incidents:
            attack_types[incident["attack_type"]] += 1
            severity_dist[incident["severity"]] += 1
            all_countries.update(incident["affected_countries"])

        return {
            "total_incidents": len(incidents),
            "attack_types": dict(attack_types),
            "severity_distribution": dict(severity_dist),
            "total_affected_countries": len(all_countries),
            "countries": sorted(list(all_countries))
        }


# Singleton instance
incident_aggregator = AttackIncidentAggregator()


# CLI for testing
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate attack incidents from CIC DDoS data")
    parser.add_argument("--data-dir", type=str, default="data/processed",
                       help="Processed data directory")
    parser.add_argument("--incidents-per-dataset", type=int, default=1,
                       help="Number of incidents per dataset")
    parser.add_argument("--output", type=str, default="data/incidents.json",
                       help="Output file for incidents")

    args = parser.parse_args()

    # Load all incidents
    incidents = incident_aggregator.load_all_incidents(
        processed_data_dir=args.data_dir,
        incidents_per_dataset=args.incidents_per_dataset
    )

    # Get summary
    summary = incident_aggregator.get_incident_summary(incidents)

    print("\n=== Incident Summary ===")
    print(f"Total incidents: {summary['total_incidents']}")
    print(f"\nAttack types:")
    for attack_type, count in summary['attack_types'].items():
        print(f"  {attack_type}: {count}")
    print(f"\nSeverity distribution:")
    for severity, count in summary['severity_distribution'].items():
        print(f"  {severity}: {count}")
    print(f"\nTotal affected countries: {summary['total_affected_countries']}")

    # Save incidents to file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump({
            "incidents": incidents,
            "summary": summary,
            "generated_at": datetime.now().isoformat()
        }, f, indent=2)

    print(f"\nSaved {len(incidents)} incidents to {output_path}")
