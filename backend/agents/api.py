"""
AI Agent System API endpoints
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from pydantic import BaseModel
import json
import asyncio

from agents.workflow import AgentWorkflow, AgentState


router = APIRouter(prefix="/api/agents", tags=["agents"])

# Initialize the workflow
workflow = AgentWorkflow()


class AgentRequest(BaseModel):
    """Request model for agent processing"""
    data: Dict[str, Any]
    context: Dict[str, Any] = {}


class AgentResponse(BaseModel):
    """Response model for agent processing"""
    success: bool
    result: Dict[str, Any]
    explanation: str
    confidence: float
    error: str = None


@router.post("/process/stream")
async def process_with_agents_stream(request: AgentRequest):
    """
    Stream agent processing results in real-time using Server-Sent Events

    This endpoint streams updates as each agent completes its analysis
    """
    async def generate_agent_stream():
        try:
            # Debug: Log the NetFlow data received by agents
            print("=== AGENT API RECEIVED NETFLOW DATA (STREAMING) ===")
            print(f"Nodes: {len(request.data.get('nodes', []))}")
            print(f"Edges: {len(request.data.get('edges', []))}")
            if request.data.get('edges'):
                sample_edge = request.data['edges'][0]
                print(f"Sample Edge: {sample_edge}")
            print("====================================================")

            # Create a streaming callback workflow
            async for agent_update in workflow.run_streaming(
                input_data=request.data,
                context=request.context
            ):
                # Send agent update as SSE
                yield f"data: {json.dumps(agent_update)}\n\n"
                await asyncio.sleep(0.01)  # Small delay to ensure delivery

        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            print(f"❌ AGENT WORKFLOW STREAMING ERROR: {str(e)}")
            print(f"❌ TRACEBACK:\n{error_traceback}")

            error_data = {
                "type": "error",
                "error": str(e),
                "final_decision": {
                    "decision": "Error",
                    "confidence": 0,
                    "reasoning": f"Agent system encountered an error: {str(e)}"
                }
            }
            yield f"data: {json.dumps(error_data)}\n\n"

    return StreamingResponse(
        generate_agent_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/process")
async def process_with_agents(request: AgentRequest):
    """
    Process data through the AI agent system with detailed agent interactions

    This endpoint runs data through all agents and returns detailed reasoning:
    1. Orchestrator - Routes and coordinates
    2. Detector - Identifies potential threats
    3. Investigator - Deep analysis
    4. Monitor - System monitoring
    5. Judge - Makes final decisions
    6. Mitigator - Takes action
    """
    try:
        # Debug: Log the NetFlow data received by agents
        print("=== AGENT API RECEIVED NETFLOW DATA ===")
        print(f"Nodes: {len(request.data.get('nodes', []))}")
        print(f"Edges: {len(request.data.get('edges', []))}")
        if request.data.get('edges'):
            sample_edge = request.data['edges'][0]
            print(f"Sample Edge: {sample_edge}")
        print("=====================================")

        # Run the agent workflow
        result: AgentState = await workflow.run(
            input_data=request.data,
            context=request.context
        )

        # Generate agent interactions summary with transparency
        interactions_summary = workflow.get_agent_interactions_summary(result)

        # Debug: Log the workflow result and interactions
        print(f"✅ WORKFLOW COMPLETED")
        print(f"   Completed agents: {result.get('completed_agents', [])}")
        print(f"   Current step: {result.get('current_step')}")
        print(f"   Total interactions: {interactions_summary.get('total_interactions', 0)}")

        # Extract final results
        final_decision = result.get("final_decision")
        if not final_decision:
            print(f"❌ NO FINAL DECISION FOUND IN WORKFLOW RESULT")
            print(f"   Available keys: {list(result.keys())}")
            raise HTTPException(status_code=500, detail="No final decision reached")

        return {
            "success": True,
            "result": {
                "decision": final_decision.decision,
                "reasoning": final_decision.reasoning,
                "metadata": final_decision.metadata,
                "workflow_state": {
                    "current_step": result.get("current_step"),
                    "completed_agents": result.get("completed_agents", [])
                }
            },
            "explanation": final_decision.reasoning,
            "confidence": final_decision.confidence,
            # NEW: Detailed agent interactions for transparency
            "agent_interactions": interactions_summary
        }

    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"❌ AGENT WORKFLOW ERROR: {str(e)}")
        print(f"❌ TRACEBACK:\n{error_traceback}")
        return {
            "success": False,
            "result": {},
            "explanation": f"Agent workflow error: {str(e)}",
            "confidence": 0.0,
            "error": str(e),
            "agent_interactions": {
                "total_interactions": 0,
                "workflow_status": "error",
                "completed_agents": [],
                "interactions": [],
                "final_decision": {
                    "decision": "Error",
                    "confidence": 0,
                    "reasoning": f"Agent system encountered an error: {str(e)}"
                }
            }
        }


@router.post("/process-with-interactions")
async def process_with_interactions(request: AgentRequest):
    """
    Process data through the AI agent system and return detailed agent interactions
    
    This endpoint provides full visibility into each agent's actions and decisions
    for display in the UI side panel
    """
    try:
        # Run the agent workflow
        result: AgentState = await workflow.run(
            input_data=request.data,
            context=request.context
        )
        
        # Generate agent interactions summary
        interactions_summary = workflow.get_agent_interactions_summary(result)
        
        # Extract final results
        final_decision = result.get("final_decision")
        
        return {
            "success": True,
            "result": {
                "final_decision": final_decision.decision if final_decision else "pending",
                "reasoning": final_decision.reasoning if final_decision else "No final decision yet",
                "confidence": final_decision.confidence if final_decision else 0.0,
                "metadata": final_decision.metadata if final_decision else {}
            },
            "agent_interactions": interactions_summary,
            "workflow_state": {
                "current_step": result.get("current_step"),
                "completed_agents": result.get("completed_agents", [])
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "result": {},
            "agent_interactions": {
                "total_interactions": 0,
                "workflow_status": "error",
                "completed_agents": [],
                "interactions": [],
                "final_decision": {
                    "decision": "error",
                    "confidence": 0,
                    "reasoning": f"Agent system encountered an error: {str(e)}"
                }
            },
            "workflow_state": {
                "current_step": "error",
                "completed_agents": []
            },
            "error": str(e)
        }


@router.get("/status")
async def get_agent_status():
    """Get the status of the agent system"""
    return {
        "status": "operational",
        "agents": [
            "orchestrator",
            "detector", 
            "investigator",
            "monitor",
            "judge",
            "mitigator"
        ],
        "workflow_ready": workflow.graph is not None
    }


@router.get("/capabilities")
async def get_agent_capabilities():
    """Get capabilities of each agent"""
    return {
        "orchestrator": {
            "role": "coordination",
            "capabilities": ["routing", "coordination", "workflow_management"]
        },
        "detector": {
            "role": "threat_detection", 
            "capabilities": ["pattern_analysis", "anomaly_detection", "threat_classification"]
        },
        "investigator": {
            "role": "deep_analysis",
            "capabilities": ["forensic_analysis", "correlation", "evidence_gathering"]
        },
        "monitor": {
            "role": "system_monitoring",
            "capabilities": ["real_time_monitoring", "performance_tracking", "alerting"]
        },
        "judge": {
            "role": "decision_making",
            "capabilities": ["decision_aggregation", "confidence_scoring", "explainability"]
        },
        "mitigator": {
            "role": "threat_response",
            "capabilities": ["automated_response", "escalation", "remediation"]
        }
    }
    