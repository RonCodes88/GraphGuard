"""
Monitor Agent Demo Script

Demonstrates rule-based network monitoring, log generation, and health tracking.
Shows how the Monitor agent creates structured logs for frontend visualization.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/monitor_demo.py
"""
import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path to import agents module
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.workflow import AgentWorkflow


def print_logs(logs, title="Generated Logs"):
    """Pretty print log entries"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print('='*80)
    for i, log in enumerate(logs, 1):
        level_emoji = {
            "INFO": "ℹ️",
            "WARNING": "⚠️",
            "CRITICAL": "🚨"
        }.get(log["level"], "📝")
        print(f"\n{i}. [{log['level']}] {level_emoji} {log['category']}")
        print(f"   Time: {log['timestamp']}")
        print(f"   Message: {log['message']}")
        if log.get("details"):
            print(f"   Details: {json.dumps(log['details'], indent=4)}")


def print_dashboard(dashboard, title="Monitoring Dashboard"):
    """Pretty print dashboard data"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print('='*80)
    
    health = dashboard.get("network_health", {})
    print(f"\n🏥 Network Health:")
    print(f"   Score: {health.get('score', 0)}%")
    print(f"   Status: {health.get('status', 'unknown')}")
    print(f"   Threat Level: {health.get('threat_level', 'UNKNOWN')}")
    
    stats = dashboard.get("traffic_statistics", {})
    print(f"\n📊 Traffic Statistics:")
    print(f"   Total Nodes: {stats.get('total_nodes', 0)}")
    print(f"   Total Connections: {stats.get('total_edges', 0)}")
    print(f"   Attacked Nodes: {stats.get('attacked_nodes', 0)}")
    print(f"   Suspicious Nodes: {stats.get('suspicious_nodes', 0)}")
    print(f"   High Traffic Nodes: {stats.get('high_traffic_nodes', 0)}")
    
    metrics = dashboard.get("attack_metrics", {})
    print(f"\n🎯 Attack Metrics:")
    print(f"   Total Attacks: {metrics.get('total_attacks', 0)}")
    print(f"   Suspicious Connections: {metrics.get('total_suspicious', 0)}")
    print(f"   DDoS Detected: {metrics.get('ddos_detected', False)}")
    print(f"   APT Detected: {metrics.get('apt_detected', False)}")
    if metrics.get('attack_types'):
        print(f"   Attack Types: {json.dumps(metrics['attack_types'], indent=4)}")
    
    critical = dashboard.get("critical_nodes", {})
    if critical.get("most_targeted"):
        print(f"\n🎯 Most Targeted Nodes:")
        for node in critical["most_targeted"][:3]:
            print(f"   - {node['node_id']}: {node['attack_count']} attacks")
    
    trends = dashboard.get("trends", {})
    print(f"\n📈 Trends:")
    print(f"   Threat Increasing: {trends.get('threat_increasing', False)}")
    print(f"   Primary Vector: {trends.get('primary_attack_vector', 'None')}")
    print(f"   Health Trend: {trends.get('health_trend', 'unknown')}")


async def demo_monitor():
    """Demo the monitor agent with various network scenarios"""
    
    workflow = AgentWorkflow()
    
    # Test Case 1: Normal traffic monitoring
    print("\n" + "="*80)
    print("TEST CASE 1: Normal Traffic Monitoring")
    print("="*80)
    
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
    
    print(f"\n📊 Monitor Decision: {monitor_decision.decision}")
    print(f"🎯 Confidence: {monitor_decision.confidence}")
    print(f"\n💭 Summary:\n{monitor_decision.reasoning}")
    
    print_logs(monitor_decision.metadata["logs"], "Normal Traffic Logs")
    print_dashboard(monitor_decision.metadata["dashboard"], "Normal Traffic Dashboard")
    
    # Assertions
    assert monitor_decision.metadata["health_score"] >= 90, "Healthy network should have 90%+ health"
    assert monitor_decision.metadata["network_status"] == "healthy", "Should be healthy status"
    
    # Test Case 2: DDoS Attack Monitoring
    print("\n\n" + "="*80)
    print("TEST CASE 2: DDoS Attack Monitoring")
    print("="*80)
    
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
    
    print(f"\n📊 Monitor Decision: {monitor_decision.decision}")
    print(f"🎯 Confidence: {monitor_decision.confidence}")
    print(f"\n💭 Summary:\n{monitor_decision.reasoning}")
    
    print_logs(monitor_decision.metadata["logs"], "DDoS Attack Logs")
    print_dashboard(monitor_decision.metadata["dashboard"], "DDoS Attack Dashboard")
    
    # Assertions
    assert monitor_decision.metadata["health_score"] < 50, "DDoS should severely impact health"
    assert monitor_decision.metadata["network_status"] in ["critical", "at_risk"], "Should be critical status"
    
    # Test Case 3: APT Activity Monitoring
    print("\n\n" + "="*80)
    print("TEST CASE 3: APT Activity Monitoring")
    print("="*80)
    
    apt_data = {
        "nodes": [
            {"id": "server1", "ip": "172.16.0.10", "status": "attacked", "traffic_volume": 55000},
            {"id": "attacker1", "ip": "203.0.113.88", "status": "normal", "traffic_volume": 12000},
            {"id": "client1", "ip": "172.16.0.50", "status": "suspicious", "traffic_volume": 8000},
            {"id": "client2", "ip": "172.16.0.51", "status": "suspicious", "traffic_volume": 7000}
        ],
        "edges": [
            {"id": "e1", "source_id": "server1", "target_id": "attacker1", "connection_type": "attack", "attack_type": "APT Exfiltration"},
            {"id": "e2", "source_id": "attacker1", "target_id": "client1", "connection_type": "attack", "attack_type": "Zero-Day Exploit"},
            {"id": "e3", "source_id": "client1", "target_id": "server1", "connection_type": "suspicious"},
            {"id": "e4", "source_id": "client2", "target_id": "server1", "connection_type": "attack", "attack_type": "Ransomware"}
        ]
    }
    
    result = await workflow.run(input_data=apt_data)
    monitor_decision = result["monitor_decision"]
    
    print(f"\n📊 Monitor Decision: {monitor_decision.decision}")
    print(f"🎯 Confidence: {monitor_decision.confidence}")
    print(f"\n💭 Summary:\n{monitor_decision.reasoning}")
    
    print_logs(monitor_decision.metadata["logs"], "APT Activity Logs")
    print_dashboard(monitor_decision.metadata["dashboard"], "APT Activity Dashboard")
    
    # Assertions
    assert "apt" in [log["category"] for log in monitor_decision.metadata["logs"]], "Should have APT logs"
    
    # Test Case 4: Mixed Traffic Monitoring
    print("\n\n" + "="*80)
    print("TEST CASE 4: Mixed Traffic with Trends")
    print("="*80)
    
    mixed_data = {
        "nodes": [
            {"id": f"node{i}", "ip": f"10.1.1.{i}", 
             "status": "attacked" if i % 5 == 0 else "suspicious" if i % 3 == 0 else "normal",
             "traffic_volume": 5000 + i * 1000}
            for i in range(1, 16)
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "attack", "attack_type": "SQL Injection"},
            {"id": "e2", "source_id": "node3", "target_id": "node4", "connection_type": "suspicious"},
            {"id": "e3", "source_id": "node5", "target_id": "node6", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e4", "source_id": "node7", "target_id": "node8", "connection_type": "normal"},
            {"id": "e5", "source_id": "node9", "target_id": "node10", "connection_type": "suspicious"},
            {"id": "e6", "source_id": "node2", "target_id": "node5", "connection_type": "attack", "attack_type": "DNS Tunneling"},
            {"id": "e7", "source_id": "node4", "target_id": "node7", "connection_type": "normal"},
            {"id": "e8", "source_id": "node6", "target_id": "node9", "connection_type": "suspicious"},
            {"id": "e9", "source_id": "node11", "target_id": "node12", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e10", "source_id": "node13", "target_id": "node14", "connection_type": "normal"}
        ]
    }
    
    result = await workflow.run(input_data=mixed_data)
    monitor_decision = result["monitor_decision"]
    
    print(f"\n📊 Monitor Decision: {monitor_decision.decision}")
    print(f"🎯 Confidence: {monitor_decision.confidence}")
    print(f"\n💭 Summary:\n{monitor_decision.reasoning}")
    
    print_logs(monitor_decision.metadata["logs"], "Mixed Traffic Logs")
    print_dashboard(monitor_decision.metadata["dashboard"], "Mixed Traffic Dashboard")
    
    # Assertions
    assert len(monitor_decision.metadata["logs"]) > 5, "Should have multiple log entries"
    assert monitor_decision.metadata["dashboard"]["trends"]["primary_attack_vector"] is not None
    
    print("\n" + "="*80)
    print("✅ All monitor demos completed successfully!")
    print("="*80 + "\n")
    
    print("\n💡 Frontend Integration Notes:")
    print("   - Logs are in: decision.metadata['logs']")
    print("   - Dashboard data in: decision.metadata['dashboard']")
    print("   - Summary in: decision.metadata['summary']")
    print("   - Each log has: timestamp, level, category, message, details")
    print("   - Ready for real-time display in the visualization!")


if __name__ == "__main__":
    try:
        asyncio.run(demo_monitor())
    except AssertionError as e:
        print(f"\n❌ ASSERTION FAILED: {e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

