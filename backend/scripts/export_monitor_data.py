"""
Export Monitor Agent Data to JSON

Generates JSON files for easy frontend consumption.
Creates sample logs and dashboard data that can be served to the visualization.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/export_monitor_data.py
"""
import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import agents module
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.workflow import AgentWorkflow


async def export_monitor_data():
    """Export monitor data to JSON files for frontend"""
    
    workflow = AgentWorkflow()
    
    # Create output directory
    output_dir = Path(__file__).parent.parent / "sample_data"
    output_dir.mkdir(exist_ok=True)
    
    print(f"📁 Exporting monitor data to: {output_dir}")
    print("="*80)
    
    # Scenario 1: Normal traffic
    print("\n1️⃣ Generating normal traffic data...")
    normal_data = {
        "nodes": [
            {"id": "node1", "ip": "192.168.1.1", "status": "normal", "traffic_volume": 1000},
            {"id": "node2", "ip": "192.168.1.2", "status": "normal", "traffic_volume": 2000},
            {"id": "node3", "ip": "192.168.1.3", "status": "normal", "traffic_volume": 1500}
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "normal"},
            {"id": "e2", "source_id": "node2", "target_id": "node3", "connection_type": "normal"},
            {"id": "e3", "source_id": "node1", "target_id": "node3", "connection_type": "normal"}
        ]
    }
    
    result = await workflow.run(input_data=normal_data)
    monitor_decision = result["monitor_decision"]
    
    export_data = {
        "scenario": "normal_traffic",
        "generated_at": datetime.now().isoformat(),
        "decision": monitor_decision.decision,
        "confidence": monitor_decision.confidence,
        "summary": monitor_decision.reasoning,
        "logs": monitor_decision.metadata["logs"],
        "dashboard": monitor_decision.metadata["dashboard"]
    }
    
    with open(output_dir / "monitor_normal.json", "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"   ✅ Saved: monitor_normal.json")
    
    # Scenario 2: DDoS attack
    print("\n2️⃣ Generating DDoS attack data...")
    ddos_data = {
        "nodes": [
            {"id": "server1", "ip": "203.0.113.5", "status": "attacked", "traffic_volume": 75000},
            {"id": "bot1", "ip": "198.51.100.1", "status": "normal", "traffic_volume": 2000},
            {"id": "bot2", "ip": "198.51.100.2", "status": "normal", "traffic_volume": 2000},
            {"id": "bot3", "ip": "198.51.100.3", "status": "normal", "traffic_volume": 2000}
        ],
        "edges": [
            {"id": "e1", "source_id": "bot1", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e2", "source_id": "bot2", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e3", "source_id": "bot3", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e4", "source_id": "bot1", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e5", "source_id": "bot2", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e6", "source_id": "bot3", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"}
        ]
    }
    
    result = await workflow.run(input_data=ddos_data)
    monitor_decision = result["monitor_decision"]
    
    export_data = {
        "scenario": "ddos_attack",
        "generated_at": datetime.now().isoformat(),
        "decision": monitor_decision.decision,
        "confidence": monitor_decision.confidence,
        "summary": monitor_decision.reasoning,
        "logs": monitor_decision.metadata["logs"],
        "dashboard": monitor_decision.metadata["dashboard"]
    }
    
    with open(output_dir / "monitor_ddos.json", "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"   ✅ Saved: monitor_ddos.json")
    
    # Scenario 3: APT campaign
    print("\n3️⃣ Generating APT campaign data...")
    apt_data = {
        "nodes": [
            {"id": "server1", "ip": "172.16.0.10", "status": "attacked", "traffic_volume": 55000},
            {"id": "attacker1", "ip": "203.0.113.88", "status": "normal", "traffic_volume": 12000},
            {"id": "client1", "ip": "172.16.0.50", "status": "suspicious", "traffic_volume": 8000}
        ],
        "edges": [
            {"id": "e1", "source_id": "server1", "target_id": "attacker1", "connection_type": "attack", "attack_type": "APT Exfiltration"},
            {"id": "e2", "source_id": "attacker1", "target_id": "client1", "connection_type": "attack", "attack_type": "Zero-Day Exploit"},
            {"id": "e3", "source_id": "client1", "target_id": "server1", "connection_type": "suspicious"}
        ]
    }
    
    result = await workflow.run(input_data=apt_data)
    monitor_decision = result["monitor_decision"]
    
    export_data = {
        "scenario": "apt_campaign",
        "generated_at": datetime.now().isoformat(),
        "decision": monitor_decision.decision,
        "confidence": monitor_decision.confidence,
        "summary": monitor_decision.reasoning,
        "logs": monitor_decision.metadata["logs"],
        "dashboard": monitor_decision.metadata["dashboard"]
    }
    
    with open(output_dir / "monitor_apt.json", "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"   ✅ Saved: monitor_apt.json")
    
    # Scenario 4: Mixed traffic
    print("\n4️⃣ Generating mixed traffic data...")
    mixed_data = {
        "nodes": [
            {"id": f"node{i}", "ip": f"10.1.1.{i}", 
             "status": "attacked" if i % 5 == 0 else "suspicious" if i % 3 == 0 else "normal",
             "traffic_volume": 5000 + i * 1000}
            for i in range(1, 11)
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "attack", "attack_type": "SQL Injection"},
            {"id": "e2", "source_id": "node3", "target_id": "node4", "connection_type": "suspicious"},
            {"id": "e3", "source_id": "node5", "target_id": "node6", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e4", "source_id": "node7", "target_id": "node8", "connection_type": "normal"},
            {"id": "e5", "source_id": "node9", "target_id": "node10", "connection_type": "suspicious"},
            {"id": "e6", "source_id": "node2", "target_id": "node5", "connection_type": "attack", "attack_type": "DNS Tunneling"}
        ]
    }
    
    result = await workflow.run(input_data=mixed_data)
    monitor_decision = result["monitor_decision"]
    
    export_data = {
        "scenario": "mixed_traffic",
        "generated_at": datetime.now().isoformat(),
        "decision": monitor_decision.decision,
        "confidence": monitor_decision.confidence,
        "summary": monitor_decision.reasoning,
        "logs": monitor_decision.metadata["logs"],
        "dashboard": monitor_decision.metadata["dashboard"]
    }
    
    with open(output_dir / "monitor_mixed.json", "w") as f:
        json.dump(export_data, f, indent=2)
    print(f"   ✅ Saved: monitor_mixed.json")
    
    # Create index file
    print("\n5️⃣ Generating index file...")
    index_data = {
        "generated_at": datetime.now().isoformat(),
        "scenarios": [
            {
                "id": "normal",
                "name": "Normal Traffic",
                "file": "monitor_normal.json",
                "description": "Healthy network with no threats"
            },
            {
                "id": "ddos",
                "name": "DDoS Attack",
                "file": "monitor_ddos.json",
                "description": "Distributed Denial of Service attack in progress"
            },
            {
                "id": "apt",
                "name": "APT Campaign",
                "file": "monitor_apt.json",
                "description": "Advanced Persistent Threat with sophisticated attacks"
            },
            {
                "id": "mixed",
                "name": "Mixed Traffic",
                "file": "monitor_mixed.json",
                "description": "Multiple attack types and suspicious activity"
            }
        ]
    }
    
    with open(output_dir / "monitor_index.json", "w") as f:
        json.dump(index_data, f, indent=2)
    print(f"   ✅ Saved: monitor_index.json")
    
    print("\n" + "="*80)
    print("✅ Export complete!")
    print("\n📊 Files created:")
    print(f"   - {output_dir}/monitor_normal.json")
    print(f"   - {output_dir}/monitor_ddos.json")
    print(f"   - {output_dir}/monitor_apt.json")
    print(f"   - {output_dir}/monitor_mixed.json")
    print(f"   - {output_dir}/monitor_index.json")
    
    print("\n💡 Frontend Usage:")
    print("   1. Fetch monitor_index.json to list available scenarios")
    print("   2. Load individual JSON files for logs and dashboard data")
    print("   3. Display logs in a scrolling feed")
    print("   4. Visualize dashboard metrics in charts/gauges")
    print("   5. Update 3D visualization based on threat level")
    
    # Display sample structure
    print("\n📋 Sample JSON structure:")
    print(json.dumps({
        "scenario": "string",
        "generated_at": "ISO 8601 timestamp",
        "decision": "monitoring_status",
        "confidence": "0.0-1.0",
        "summary": "plain English summary",
        "logs": [
            {
                "timestamp": "ISO 8601",
                "level": "INFO|WARNING|CRITICAL",
                "category": "system|threat_detection|ddos|apt|attack_pattern|node_status|health",
                "message": "human readable message",
                "details": {}
            }
        ],
        "dashboard": {
            "network_health": {"score": 0-100, "status": "...", "threat_level": "..."},
            "traffic_statistics": {},
            "attack_metrics": {},
            "critical_nodes": {},
            "trends": {}
        }
    }, indent=2))
    
    print("\n")


if __name__ == "__main__":
    try:
        asyncio.run(export_monitor_data())
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

