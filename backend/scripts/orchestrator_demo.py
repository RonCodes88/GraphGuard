"""
Orchestrator Agent Demo Script

Demonstrates rule-based network traffic analysis and routing decisions.
Includes basic assertions to catch regressions without requiring a testing framework.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/orchestrator_demo.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import agents module
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.workflow import AgentWorkflow


async def demo_orchestrator():
    """Demo the orchestrator with various network scenarios"""
    
    workflow = AgentWorkflow()
    
    # Test Case 1: Normal traffic (minimal threat)
    print("\n" + "="*80)
    print("TEST CASE 1: Normal Traffic")
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
    decision = result["orchestrator_decision"]
    
    print(f"\n🎯 Decision: {decision.decision}")
    print(f"📊 Confidence: {decision.confidence}")
    print(f"💭 Reasoning: {decision.reasoning}")
    print(f"📋 Metadata:")
    print(f"   - Threat Level: {decision.metadata['threat_level']}")
    print(f"   - Priority: {decision.metadata['priority']}")
    print(f"   - DDoS Detected: {decision.metadata['ddos_detected']}")
    print(f"   - APT Detected: {decision.metadata['apt_detected']}")
    
    # Assertions for normal traffic
    assert decision.metadata['threat_level'] in ['NONE', 'LOW'], "Normal traffic should be NONE or LOW threat"
    assert decision.metadata['ddos_detected'] == False, "No DDoS should be detected in normal traffic"
    
    # Test Case 2: Low threat with some suspicious activity
    print("\n" + "="*80)
    print("TEST CASE 2: Low Threat - Suspicious Activity")
    print("="*80)
    
    suspicious_data = {
        "nodes": [
            {"id": "node1", "ip": "10.0.0.1", "status": "normal", "traffic_volume": 5000},
            {"id": "node2", "ip": "10.0.0.2", "status": "suspicious", "traffic_volume": 15000},
            {"id": "node3", "ip": "10.0.0.3", "status": "normal", "traffic_volume": 3000},
            {"id": "node4", "ip": "10.0.0.4", "status": "suspicious", "traffic_volume": 8000}
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "normal"},
            {"id": "e2", "source_id": "node2", "target_id": "node3", "connection_type": "suspicious"},
            {"id": "e3", "source_id": "node2", "target_id": "node4", "connection_type": "suspicious"},
            {"id": "e4", "source_id": "node1", "target_id": "node3", "connection_type": "attack", "attack_type": "Port Scan"}
        ]
    }
    
    result = await workflow.run(input_data=suspicious_data)
    decision = result["orchestrator_decision"]
    
    print(f"\n🎯 Decision: {decision.decision}")
    print(f"📊 Confidence: {decision.confidence}")
    print(f"💭 Reasoning: {decision.reasoning}")
    print(f"📋 Metadata:")
    print(f"   - Threat Level: {decision.metadata['threat_level']}")
    print(f"   - Priority: {decision.metadata['priority']}")
    print(f"   - Statistics: {decision.metadata['statistics']}")
    
    # Assertions for suspicious activity
    assert decision.metadata['statistics']['attack_count'] == 1, "Should detect 1 attack"
    assert decision.metadata['statistics']['suspicious_count'] == 2, "Should detect 2 suspicious connections"
    
    # Test Case 3: High threat - DDoS attack
    print("\n" + "="*80)
    print("TEST CASE 3: Critical Threat - DDoS Attack")
    print("="*80)
    
    ddos_data = {
        "nodes": [
            {"id": "server1", "ip": "203.0.113.5", "status": "attacked", "traffic_volume": 75000},
            {"id": "bot1", "ip": "198.51.100.1", "status": "normal", "traffic_volume": 2000},
            {"id": "bot2", "ip": "198.51.100.2", "status": "normal", "traffic_volume": 2000},
            {"id": "bot3", "ip": "198.51.100.3", "status": "normal", "traffic_volume": 2000},
            {"id": "bot4", "ip": "198.51.100.4", "status": "normal", "traffic_volume": 2000}
        ],
        "edges": [
            {"id": "e1", "source_id": "bot1", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e2", "source_id": "bot2", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e3", "source_id": "bot3", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e4", "source_id": "bot4", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e5", "source_id": "bot1", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e6", "source_id": "bot2", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e7", "source_id": "bot3", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"},
            {"id": "e8", "source_id": "bot4", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"}
        ]
    }
    
    result = await workflow.run(input_data=ddos_data)
    decision = result["orchestrator_decision"]
    
    print(f"\n🎯 Decision: {decision.decision}")
    print(f"📊 Confidence: {decision.confidence}")
    print(f"💭 Reasoning: {decision.reasoning}")
    print(f"📋 Metadata:")
    print(f"   - Threat Level: {decision.metadata['threat_level']}")
    print(f"   - Priority: {decision.metadata['priority']}")
    print(f"   - DDoS Detected: {decision.metadata['ddos_detected']}")
    print(f"   - Agent Priorities: {decision.metadata['agent_priorities']}")
    
    # Assertions for DDoS attack
    assert decision.metadata['ddos_detected'] == True, "DDoS should be detected"
    assert decision.metadata['threat_level'] == 'CRITICAL', "DDoS should trigger CRITICAL threat level"
    
    # Test Case 4: APT - Advanced Persistent Threat
    print("\n" + "="*80)
    print("TEST CASE 4: High Threat - APT Exfiltration")
    print("="*80)
    
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
    decision = result["orchestrator_decision"]
    
    print(f"\n🎯 Decision: {decision.decision}")
    print(f"📊 Confidence: {decision.confidence}")
    print(f"💭 Reasoning: {decision.reasoning}")
    print(f"📋 Metadata:")
    print(f"   - Threat Level: {decision.metadata['threat_level']}")
    print(f"   - Priority: {decision.metadata['priority']}")
    print(f"   - APT Detected: {decision.metadata['apt_detected']}")
    print(f"   - Attack Types: {decision.metadata['statistics']['attack_types']}")
    
    # Assertions for APT
    assert decision.metadata['apt_detected'] == True, "APT should be detected"
    assert decision.metadata['threat_level'] in ['HIGH', 'CRITICAL'], "APT should trigger HIGH or CRITICAL"
    
    # Test Case 5: Medium threat - Mixed traffic
    print("\n" + "="*80)
    print("TEST CASE 5: Medium Threat - Mixed Attack Patterns")
    print("="*80)
    
    mixed_data = {
        "nodes": [
            {"id": f"node{i}", "ip": f"10.1.1.{i}", "status": "normal" if i % 3 != 0 else "suspicious", "traffic_volume": 5000 + i * 1000}
            for i in range(1, 11)
        ],
        "edges": [
            {"id": "e1", "source_id": "node1", "target_id": "node2", "connection_type": "attack", "attack_type": "SQL Injection"},
            {"id": "e2", "source_id": "node3", "target_id": "node4", "connection_type": "suspicious"},
            {"id": "e3", "source_id": "node5", "target_id": "node6", "connection_type": "attack", "attack_type": "Port Scan"},
            {"id": "e4", "source_id": "node7", "target_id": "node8", "connection_type": "normal"},
            {"id": "e5", "source_id": "node9", "target_id": "node10", "connection_type": "suspicious"},
            {"id": "e6", "source_id": "node2", "target_id": "node5", "connection_type": "attack", "attack_type": "DNS Tunneling"},
            {"id": "e7", "source_id": "node4", "target_id": "node7", "connection_type": "normal"},
            {"id": "e8", "source_id": "node6", "target_id": "node9", "connection_type": "suspicious"}
        ]
    }
    
    result = await workflow.run(input_data=mixed_data)
    decision = result["orchestrator_decision"]
    
    print(f"\n🎯 Decision: {decision.decision}")
    print(f"📊 Confidence: {decision.confidence}")
    print(f"💭 Reasoning: {decision.reasoning}")
    print(f"📋 Metadata:")
    print(f"   - Threat Level: {decision.metadata['threat_level']}")
    print(f"   - Priority: {decision.metadata['priority']}")
    print(f"   - Attack Types: {decision.metadata['statistics']['attack_types']}")
    print(f"   - Agent Priorities: {decision.metadata['agent_priorities']}")
    
    # Assertions for mixed traffic
    assert decision.metadata['statistics']['attack_count'] == 3, "Should detect 3 attacks"
    assert decision.decision.startswith('route_workflow_'), "Should route to workflow"
    
    print("\n" + "="*80)
    print("✅ All demos completed successfully!")
    print("="*80 + "\n")


if __name__ == "__main__":
    try:
        asyncio.run(demo_orchestrator())
    except AssertionError as e:
        print(f"\n❌ ASSERTION FAILED: {e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        sys.exit(1)

