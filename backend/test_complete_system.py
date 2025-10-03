"""
Test script for the complete AI agent system
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from agents.workflow import AgentWorkflow
from agents.network_api import generate_realistic_attack_patterns, NetworkNode
import random
from datetime import datetime

async def test_complete_workflow():
    """Test the complete agent workflow"""
    
    print("🚀 Testing Complete AI Agent Workflow")
    print("=" * 60)
    
    # Initialize workflow
    workflow = AgentWorkflow()
    
    # Generate test network data with realistic attacks
    nodes = []
    for i in range(20):
        node = NetworkNode(
            id=f"test_node_{i}",
            ip=f"192.168.1.{i}",
            country="Test Country",
            city="Test City",
            latitude=0.0,
            longitude=0.0,
            node_type=random.choice(["client", "server", "router", "firewall"]),
            status=random.choice(["normal", "suspicious", "attacked"]),
            traffic_volume=random.randint(1000, 50000),
            last_seen=datetime.now().isoformat()
        )
        nodes.append(node)
    
    # Generate edges with attacks
    edges = generate_realistic_attack_patterns(nodes, "Test Country")
    
    # Prepare input data
    input_data = {
        "nodes": [node.dict() for node in nodes],
        "edges": [edge.dict() for edge in edges]
    }
    
    print(f"📊 Generated test data:")
    print(f"   Nodes: {len(nodes)}")
    print(f"   Edges: {len(edges)}")
    print(f"   Attack edges: {len([e for e in edges if e.connection_type == 'attack'])}")
    
    try:
        # Run the workflow
        print("\n🔄 Running complete agent workflow...")
        result = await workflow.run(input_data)
        
        # Display results
        print("\n📊 WORKFLOW RESULTS:")
        print(f"Current Step: {result.get('current_step')}")
        print(f"Completed Agents: {', '.join(result.get('completed_agents', []))}")
        
        # Show each agent's decision
        agents = ["orchestrator", "detector", "investigator", "monitor", "judge", "mitigator"]
        
        for agent in agents:
            decision = result.get(f"{agent}_decision")
            if decision:
                print(f"\n🤖 {agent.upper()} AGENT:")
                print(f"   Decision: {decision.decision}")
                print(f"   Confidence: {decision.confidence:.2f}")
                print(f"   Reasoning: {decision.reasoning[:150]}...")
                
                # Show key metadata for some agents
                if agent == "detector" and decision.metadata.get("threats_detected"):
                    threats = decision.metadata["threats_detected"]
                    print(f"   Threats Detected: {len(threats)}")
                
                elif agent == "investigator" and decision.metadata.get("investigations"):
                    investigations = decision.metadata["investigations"]
                    print(f"   Investigations: {len(investigations)}")
                
                elif agent == "judge" and decision.metadata.get("final_assessment"):
                    threat_level = decision.metadata["final_assessment"].get("threat_level", "NONE")
                    print(f"   Final Threat Level: {threat_level}")
                
                elif agent == "mitigator" and decision.metadata.get("mitigation_actions"):
                    actions = decision.metadata["mitigation_actions"]
                    print(f"   Mitigation Actions: {len(actions)}")
        
        # Show final decision
        final_decision = result.get("final_decision")
        if final_decision:
            print(f"\n🎯 FINAL DECISION:")
            print(f"   Decision: {final_decision.decision}")
            print(f"   Confidence: {final_decision.confidence:.2f}")
            print(f"   Reasoning: {final_decision.reasoning}")
            
            # Show mitigation actions if any
            if final_decision.metadata.get("mitigation_actions"):
                actions = final_decision.metadata["mitigation_actions"]
                print(f"\n🛡️  MITIGATION ACTIONS:")
                for i, action in enumerate(actions, 1):
                    print(f"   {i}. {action.get('action_type', 'unknown')} - {action.get('target', 'N/A')}")
        
        print("\n✅ Complete workflow test finished!")
        return True
        
    except Exception as e:
        print(f"\n❌ Workflow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_agent_capabilities():
    """Test individual agent capabilities"""
    
    print("\n🔍 Testing Individual Agent Capabilities")
    print("=" * 50)
    
    # Test with different threat scenarios
    scenarios = [
        {"name": "Normal Traffic", "attack_ratio": 0.0},
        {"name": "Low Threat", "attack_ratio": 0.05},
        {"name": "Medium Threat", "attack_ratio": 0.15},
        {"name": "High Threat", "attack_ratio": 0.30},
        {"name": "Critical Threat", "attack_ratio": 0.50}
    ]
    
    workflow = AgentWorkflow()
    
    for scenario in scenarios:
        print(f"\n📋 Testing: {scenario['name']}")
        
        # Generate nodes
        nodes = []
        for i in range(15):
            node = NetworkNode(
                id=f"scenario_node_{i}",
                ip=f"10.0.{scenario['attack_ratio']*100:.0f}.{i}",
                country="Test Country",
                city="Test City",
                latitude=0.0,
                longitude=0.0,
                node_type=random.choice(["client", "server", "router"]),
                status="normal",
                traffic_volume=random.randint(1000, 30000),
                last_seen=datetime.now().isoformat()
            )
            nodes.append(node)
        
        # Generate edges with controlled attack ratio
        edges = generate_realistic_attack_patterns(nodes, "Test Country")
        
        # Adjust attack ratio
        total_edges = len(edges)
        target_attacks = int(total_edges * scenario['attack_ratio'])
        current_attacks = len([e for e in edges if e.connection_type == "attack"])
        
        # Convert some normal edges to attacks if needed
        if current_attacks < target_attacks:
            normal_edges = [e for e in edges if e.connection_type == "normal"]
            for i in range(min(target_attacks - current_attacks, len(normal_edges))):
                normal_edges[i].connection_type = "attack"
                normal_edges[i].attack_type = random.choice(["Port Scan", "DDoS Volumetric", "Botnet C&C"])
        
        input_data = {
            "nodes": [node.dict() for node in nodes],
            "edges": [edge.dict() for edge in edges]
        }
        
        try:
            result = await workflow.run(input_data)
            final_decision = result.get("final_decision")
            
            if final_decision:
                print(f"   Result: {final_decision.decision}")
                print(f"   Confidence: {final_decision.confidence:.2f}")
            else:
                print("   Result: No final decision")
                
        except Exception as e:
            print(f"   Error: {e}")

if __name__ == "__main__":
    async def main():
        print("🎯 AI Agent System Test Suite")
        print("=" * 60)
        
        # Test complete workflow
        success = await test_complete_workflow()
        
        if success:
            # Test different scenarios
            await test_agent_capabilities()
        
        print("\n🏁 All tests completed!")
    
    asyncio.run(main())
