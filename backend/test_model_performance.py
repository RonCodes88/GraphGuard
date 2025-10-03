#!/usr/bin/env python3
"""
Test script to compare AI model performance in the network security simulation.
This script tests the speed improvements from using faster models.
"""

import asyncio
import time
import json
import os
from datetime import datetime

# Add the backend directory to the path
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.workflow import AgentWorkflow
from config import config

# Sample network data for testing
SAMPLE_NETWORK_DATA = {
    "nodes": [
        {"id": "192.168.1.1", "type": "server", "country": "US", "traffic": 1500},
        {"id": "10.0.0.5", "type": "client", "country": "US", "traffic": 200},
        {"id": "172.16.0.10", "type": "router", "country": "US", "traffic": 800},
        {"id": "203.0.113.1", "type": "external", "country": "CN", "traffic": 5000},
        {"id": "198.51.100.5", "type": "external", "country": "RU", "traffic": 12000}
    ],
    "edges": [
        {"source": "192.168.1.1", "target": "10.0.0.5", "weight": 200, "port": 80},
        {"source": "10.0.0.5", "target": "172.16.0.10", "weight": 150, "port": 443},
        {"source": "203.0.113.1", "target": "192.168.1.1", "weight": 5000, "port": 22},
        {"source": "198.51.100.5", "target": "192.168.1.1", "weight": 12000, "port": 80}
    ],
    "timestamp": datetime.now().isoformat(),
    "total_traffic": 19950,
    "anomaly_score": 0.85
}

async def test_agent_performance():
    """Test the performance of the agent workflow with faster models"""
    
    print("🚀 Testing AI Model Performance Improvements")
    print("=" * 60)
    
    # Display current model configuration
    print(f"📋 Current Model Configuration:")
    print(f"   Fast Model: {config.fast_model}")
    print(f"   Fast Model Temperature: {config.fast_model_temperature}")
    print(f"   Standard Model: {config.standard_model}")
    print(f"   Standard Model Temperature: {config.standard_model_temperature}")
    print()
    
    # Initialize workflow
    workflow = AgentWorkflow()
    
    # Test 1: Single workflow execution
    print("🔍 Test 1: Single Workflow Execution")
    print("-" * 40)
    
    start_time = time.time()
    
    try:
        result = await workflow.run(
            input_data=SAMPLE_NETWORK_DATA,
            context={"test_mode": True}
        )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        print(f"✅ Workflow completed successfully!")
        print(f"⏱️  Total execution time: {execution_time:.2f} seconds")
        
        # Extract agent performance data
        final_decision = result.get("final_decision")
        if final_decision:
            print(f"🎯 Final Decision: {final_decision.decision}")
            print(f"📊 Confidence: {final_decision.confidence:.2f}")
            print(f"🤖 Model Used: {final_decision.metadata.get('llm_model', 'unknown')}")
        
        # Show completed agents
        completed_agents = result.get("completed_agents", [])
        print(f"🔄 Agents Completed: {', '.join(completed_agents)}")
        
    except Exception as e:
        print(f"❌ Workflow failed: {str(e)}")
        return
    
    print()
    
    # Test 2: Multiple rapid executions (stress test)
    print("⚡ Test 2: Multiple Rapid Executions (Stress Test)")
    print("-" * 40)
    
    num_tests = 3
    total_time = 0
    successful_runs = 0
    
    for i in range(num_tests):
        print(f"   Run {i+1}/{num_tests}...", end=" ")
        
        start_time = time.time()
        try:
            result = await workflow.run(
                input_data=SAMPLE_NETWORK_DATA,
                context={"test_mode": True, "run_id": i+1}
            )
            end_time = time.time()
            run_time = end_time - start_time
            total_time += run_time
            successful_runs += 1
            print(f"✅ {run_time:.2f}s")
        except Exception as e:
            print(f"❌ Failed: {str(e)}")
    
    if successful_runs > 0:
        avg_time = total_time / successful_runs
        print(f"\n📈 Performance Summary:")
        print(f"   Successful runs: {successful_runs}/{num_tests}")
        print(f"   Average time per run: {avg_time:.2f} seconds")
        print(f"   Total time: {total_time:.2f} seconds")
        
        # Performance assessment
        if avg_time < 10:
            print("🏆 EXCELLENT: Very fast response times!")
        elif avg_time < 20:
            print("🚀 GOOD: Fast response times")
        elif avg_time < 30:
            print("⚡ ACCEPTABLE: Reasonable response times")
        else:
            print("🐌 SLOW: Consider further optimization")
    
    print()
    print("=" * 60)
    print("🎉 Performance test completed!")
    
    # Model recommendations
    print("\n💡 Model Optimization Recommendations:")
    print("   • All agents now use GPT-4o-mini for speed")
    print("   • Temperature optimized for each agent type")
    print("   • Consider GPT-4o only for complex reasoning tasks")
    print("   • Monitor performance and adjust as needed")

if __name__ == "__main__":
    # Check for API key
    if not config.openai_api_key or config.openai_api_key == "your_openai_api_key_here":
        print("❌ Error: Please set your OPENAI_API_KEY in the .env file")
        print("   Copy backend/env.example to backend/.env and add your API key")
        sys.exit(1)
    
    # Run the performance test
    asyncio.run(test_agent_performance())
