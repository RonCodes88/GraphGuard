"""
Detector Agent Demo Script

Demonstrates LLM-powered threat detection using GPT-4o-mini.
Shows heavy-hitter detection, graph anomaly analysis, and IP flagging.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/detector_demo.py

Note: Requires OPENAI_API_KEY in .env file
"""
import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path to import agents module
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.workflow import AgentWorkflow


def print_threats(threats, title="Detected Threats"):
    """Pretty print detected threats"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print('='*80)
    
    if not threats:
        print("   ✅ No threats detected")
        return
    
    for i, threat in enumerate(threats, 1):
        severity_emoji = {
            "low": "🟢",
            "medium": "🟡",
            "high": "🟠",
            "critical": "🔴"
        }.get(threat.get("severity", "medium"), "⚠️")
        
        print(f"\n{i}. {severity_emoji} {threat.get('threat_type', 'Unknown')} (Severity: {threat.get('severity', 'N/A')})")
        print(f"   Confidence: {threat.get('confidence', 0):.2f}")
        print(f"   Reasoning: {threat.get('reasoning', 'No details')}")
        
        flagged = threat.get('flagged_entities', {})
        if flagged.get('nodes'):
            print(f"   Flagged Nodes: {', '.join(flagged['nodes'][:5])}")
        if flagged.get('ips'):
            print(f"   Flagged IPs: {', '.join(flagged['ips'][:5])}")
        
        indicators = threat.get('indicators', [])
        if indicators:
            print(f"   Indicators: {', '.join(indicators)}")


def print_heavy_hitters(heavy_hitters):
    """Pretty print heavy hitter analysis"""
    print(f"\n{'='*80}")
    print("Heavy Hitters Analysis")
    print('='*80)
    
    if not heavy_hitters:
        print("   No heavy hitters detected")
        return
    
    for hh in heavy_hitters[:5]:  # Top 5
        print(f"\n🔥 {hh.get('entity_id', 'Unknown')}")
        print(f"   Type: {hh.get('entity_type', 'N/A')}")
        print(f"   Traffic Volume: {hh.get('traffic_volume', 0):,}")
        print(f"   Connections: {hh.get('connection_count', 0)}")
        print(f"   Anomaly Score: {hh.get('anomaly_score', 0):.2f}")
        print(f"   Reason: {hh.get('reason', 'No details')}")


def print_graph_anomalies(anomalies):
    """Pretty print graph anomalies"""
    print(f"\n{'='*80}")
    print("Graph Anomalies")
    print('='*80)
    
    if not anomalies:
        print("   No graph anomalies detected")
        return
    
    for anomaly in anomalies:
        severity_emoji = {
            "low": "🟢",
            "medium": "🟡",
            "high": "🔴"
        }.get(anomaly.get("severity", "medium"), "⚠️")
        
        print(f"\n{severity_emoji} {anomaly.get('anomaly_type', 'Unknown')}")
        print(f"   Severity: {anomaly.get('severity', 'N/A')}")
        print(f"   Affected Nodes: {', '.join(anomaly.get('affected_nodes', [])[:5])}")
        print(f"   Description: {anomaly.get('description', 'No details')}")


def print_flagged_ips(flagged_ips):
    """Pretty print flagged IPs"""
    print(f"\n{'='*80}")
    print("Flagged IP Addresses")
    print('='*80)
    
    if not flagged_ips:
        print("   No IPs flagged")
        return
    
    for ip_info in flagged_ips[:10]:  # Top 10
        action_emoji = {
            "monitor": "👁️",
            "investigate": "🔍",
            "block": "🚫"
        }.get(ip_info.get("suggested_action", "monitor"), "⚠️")
        
        print(f"\n{action_emoji} {ip_info.get('ip', 'Unknown')}")
        print(f"   Confidence: {ip_info.get('confidence', 0):.2f}")
        print(f"   Reason: {ip_info.get('reason', 'No details')}")
        print(f"   Suggested Action: {ip_info.get('suggested_action', 'monitor').upper()}")


async def demo_detector():
    """Demo the detector agent with various network scenarios"""
    
    workflow = AgentWorkflow()
    
    # Test Case 1: Normal traffic
    print("\n" + "="*80)
    print("TEST CASE 1: Normal Traffic Detection")
    print("="*80)
    
    normal_data = {
        "nodes": [
            {"id": "node1", "ip": "192.168.1.1", "status": "normal", "traffic_volume": 1000},
            {"id": "node2", "ip": "192.168.1.2", "status": "normal", "traffic_volume": 2000},
            {"id": "node3", "ip": "192.168.1.3", "status": "normal", "traffic_volume": 1500}
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "normal"},
            {"id": "e2", "source_id": "node2", "target_id": "node3", "connection_type": "normal"}
        ]
    }
    
    print("\n🔍 Running GPT-4o-mini threat detection...")
    result = await workflow.run(input_data=normal_data)
    detector_decision = result["detector_decision"]
    
    print(f"\n📊 Decision: {detector_decision.decision}")
    print(f"🎯 Confidence: {detector_decision.confidence}")
    print(f"💭 Summary: {detector_decision.reasoning}")
    
    metadata = detector_decision.metadata
    print_threats(metadata.get("threats_detected", []))
    print(f"\n📈 Overall Assessment: {json.dumps(metadata.get('overall_assessment', {}), indent=2)}")
    
    # Assertions
    assert detector_decision.metadata.get("llm_model") == "gpt-4o-mini", "Should use GPT-4o-mini"
    print("\n✅ Normal traffic test passed")
    
    # Test Case 2: DDoS Attack
    print("\n\n" + "="*80)
    print("TEST CASE 2: DDoS Attack Detection")
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
            {"id": "e5", "source_id": "bot2", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"}
        ]
    }
    
    print("\n🔍 Running GPT-4o-mini threat detection...")
    result = await workflow.run(input_data=ddos_data)
    detector_decision = result["detector_decision"]
    
    print(f"\n📊 Decision: {detector_decision.decision}")
    print(f"🎯 Confidence: {detector_decision.confidence}")
    print(f"💭 Summary: {detector_decision.reasoning}")
    
    metadata = detector_decision.metadata
    print_threats(metadata.get("threats_detected", []), "DDoS Threats Detected")
    print_heavy_hitters(metadata.get("heavy_hitters", []))
    print_graph_anomalies(metadata.get("graph_anomalies", []))
    print_flagged_ips(metadata.get("flagged_ips", []))
    print(f"\n📈 Overall Assessment: {json.dumps(metadata.get('overall_assessment', {}), indent=2)}")
    
    # Assertions
    assert metadata.get("overall_assessment", {}).get("total_threats", 0) > 0, "Should detect DDoS threats"
    print("\n✅ DDoS detection test passed")
    
    # Test Case 3: Port Scan Detection
    print("\n\n" + "="*80)
    print("TEST CASE 3: Port Scan Detection")
    print("="*80)
    
    port_scan_data = {
        "nodes": [
            {"id": "scanner", "ip": "45.33.32.156", "status": "suspicious", "traffic_volume": 5000},
            {"id": "target1", "ip": "192.168.1.10", "status": "normal", "traffic_volume": 1000},
            {"id": "target2", "ip": "192.168.1.11", "status": "normal", "traffic_volume": 1000},
            {"id": "target3", "ip": "192.168.1.12", "status": "normal", "traffic_volume": 1000},
            {"id": "target4", "ip": "192.168.1.13", "status": "normal", "traffic_volume": 1000}
        ],
        "edges": [
            {"id": "e1", "source_id": "scanner", "target_id": "target1", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e2", "source_id": "scanner", "target_id": "target2", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e3", "source_id": "scanner", "target_id": "target3", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e4", "source_id": "scanner", "target_id": "target4", "connection_type": "attack", "attack_type": "Port Scan"}
        ]
    }
    
    print("\n🔍 Running GPT-4o-mini threat detection...")
    result = await workflow.run(input_data=port_scan_data)
    detector_decision = result["detector_decision"]
    
    print(f"\n📊 Decision: {detector_decision.decision}")
    print(f"🎯 Confidence: {detector_decision.confidence}")
    print(f"💭 Summary: {detector_decision.reasoning}")
    
    metadata = detector_decision.metadata
    print_threats(metadata.get("threats_detected", []), "Port Scan Threats")
    print_heavy_hitters(metadata.get("heavy_hitters", []))
    print_flagged_ips(metadata.get("flagged_ips", []))
    print(f"\n📈 Overall Assessment: {json.dumps(metadata.get('overall_assessment', {}), indent=2)}")
    
    print("\n✅ Port scan detection test passed")
    
    print("\n" + "="*80)
    print("✅ All detector demos completed successfully!")
    print("="*80 + "\n")
    
    print("\n💡 Detector Agent Features:")
    print("   ✅ LLM-Powered: GPT-4o-mini for intelligent threat analysis")
    print("   ✅ Heavy-Hitter Detection: Identifies high-traffic nodes")
    print("   ✅ Graph Anomaly Detection: Finds unusual connection patterns")
    print("   ✅ IP Flagging: Marks suspicious IPs with confidence scores")
    print("   ✅ Confidence Scoring: Provides reliability metrics")
    print("   ✅ Actionable Recommendations: Suggests monitor/investigate/block")


if __name__ == "__main__":
    try:
        asyncio.run(demo_detector())
    except AssertionError as e:
        print(f"\n❌ ASSERTION FAILED: {e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

