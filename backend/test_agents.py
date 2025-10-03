#!/usr/bin/env python3
"""
Quick test script for AI agents
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Set up environment (you'll need to add your actual API key)
os.environ.setdefault('OPENAI_API_KEY', 'your-api-key-here')

from agents.workflow import AgentWorkflow

async def quick_test():
    """Quick test of the agent workflow"""
    
    print("🚀 Quick Test of AI Agent System")
    print("=" * 40)
    
    # Initialize workflow
    workflow = AgentWorkflow()
    
    # Simple test data
    input_data = {
        "nodes": [
            {
                "id": "server_1",
                "ip": "192.168.1.100",
                "country": "Test Country",
                "city": "Test City",
                "latitude": 0.0,
                "longitude": 0.0,
                "node_type": "server",
                "status": "attacked",
                "traffic_volume": 75000,
                "last_seen": "2024-01-01T00:00:00"
            },
            {
                "id": "client_1",
                "ip": "192.168.1.101",
                "country": "Test Country",
                "city": "Test City",
                "latitude": 0.0,
                "longitude": 0.0,
                "node_type": "client",
                "status": "suspicious",
                "traffic_volume": 25000,
                "last_seen": "2024-01-01T00:00:00"
            }
        ],
        "edges": [
            {
                "id": "attack_edge",
                "source_id": "client_1",
                "target_id": "server_1",
                "connection_type": "attack",
                "bandwidth": 5000,
                "latency": 200.0,
                "packet_count": 100000,
                "attack_type": "DDoS Volumetric"
            }
        ]
    }
    
    print(f"📊 Test Data:")
    print(f"   Nodes: {len(input_data['nodes'])}")
    print(f"   Edges: {len(input_data['edges'])}")
    print(f"   Attack edges: {len([e for e in input_data['edges'] if e['connection_type'] == 'attack'])}")
    
    try:
        print("\n🔄 Running agent workflow...")
        result = await workflow.run(input_data)
        
        print("\n📊 RESULTS:")
        print(f"Current Step: {result.get('current_step')}")
        print(f"Completed Agents: {', '.join(result.get('completed_agents', []))}")
        
        # Show each agent's decision
        agents = ["orchestrator", "detector", "investigator", "monitor", "judge", "mitigator"]
        
        for agent in agents:
            decision = result.get(f"{agent}_decision")
            if decision:
                print(f"\n🤖 {agent.upper()}:")
                print(f"   Decision: {decision.decision}")
                print(f"   Confidence: {decision.confidence:.2f}")
                print(f"   Reasoning: {decision.reasoning[:100]}...")
        
        # Show final decision
        final_decision = result.get("final_decision")
        if final_decision:
            print(f"\n🎯 FINAL DECISION:")
            print(f"   Decision: {final_decision.decision}")
            print(f"   Confidence: {final_decision.confidence:.2f}")
            print(f"   Reasoning: {final_decision.reasoning}")
        
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(quick_test())
