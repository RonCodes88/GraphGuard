"""
LangGraph workflow for AI agent system
"""
from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from operator import add
import json
from datetime import datetime

from agents.base import AgentInput, AgentOutput, AgentDecision
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from config import config


class AgentState(TypedDict):
    """State structure for the LangGraph workflow"""
    # Input data
    input_data: Dict[str, Any]
    context: Dict[str, Any]
    
    # Agent decisions
    orchestrator_decision: AgentDecision
    detector_decision: AgentDecision
    investigator_decision: AgentDecision
    monitor_decision: AgentDecision
    judge_decision: AgentDecision
    mitigator_decision: AgentDecision
    
    # Workflow control
    current_step: str
    completed_agents: Annotated[List[str], add]
    should_continue: bool
    
    # Results
    final_decision: AgentDecision
    explanation: str
    confidence_score: float


class AgentWorkflow:
    """LangGraph workflow for coordinating AI agents"""
    
    def __init__(self):
        self.graph = None
        self.memory = MemorySaver()
        self._build_graph()
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes for each agent
        workflow.add_node("orchestrator", self._orchestrator_node)
        workflow.add_node("detector", self._detector_node)
        workflow.add_node("investigator", self._investigator_node)
        workflow.add_node("monitor", self._monitor_node)
        workflow.add_node("judge", self._judge_node)
        workflow.add_node("mitigator", self._mitigator_node)
        
        # Define the workflow edges - sequential for now
        workflow.set_entry_point("orchestrator")
        
        # Sequential flow: orchestrator -> detector -> investigator -> monitor -> judge -> mitigator
        workflow.add_edge("orchestrator", "detector")
        workflow.add_edge("detector", "investigator")
        workflow.add_edge("investigator", "monitor")
        workflow.add_edge("monitor", "judge")
        workflow.add_edge("judge", "mitigator")
        workflow.add_edge("mitigator", END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=self.memory)
    
    async def _orchestrator_node(self, state: AgentState) -> AgentState:
        """
        Orchestrator agent node - Rule-based coordination and routing
        
        Responsibilities:
        1. Analyze incoming network traffic data
        2. Determine threat level and priority
        3. Set workflow routing decisions
        4. Enrich context for downstream agents
        5. Handle edge cases and data validation
        """
        input_data = state["input_data"]
        
        # Initialize analysis metrics
        total_nodes = 0
        total_edges = 0
        attack_count = 0
        suspicious_count = 0
        normal_count = 0
        
        # Attack type distribution
        attack_types = {}
        attacked_nodes = []
        suspicious_nodes = []
        high_traffic_nodes = []
        
        # Analyze network data structure
        if "nodes" in input_data:
            nodes = input_data["nodes"]
            total_nodes = len(nodes)
            
            for node in nodes:
                # Track node statuses
                if node.get("status") == "attacked":
                    attacked_nodes.append(node)
                elif node.get("status") == "suspicious":
                    suspicious_nodes.append(node)
                
                # Track high traffic nodes (potential targets or sources)
                traffic = node.get("traffic_volume", 0)
                if traffic > 50000:
                    high_traffic_nodes.append(node)
        
        if "edges" in input_data:
            edges = input_data["edges"]
            total_edges = len(edges)
            
            for edge in edges:
                conn_type = edge.get("connection_type", "normal")
                
                if conn_type == "attack":
                    attack_count += 1
                    # Track attack types
                    attack_type = edge.get("attack_type", "Unknown")
                    attack_types[attack_type] = attack_types.get(attack_type, 0) + 1
                elif conn_type == "suspicious":
                    suspicious_count += 1
                else:
                    normal_count += 1
        
        # Rule-based threat level calculation
        threat_level = "LOW"
        priority = "standard"
        workflow_mode = "full_analysis"
        
        # Calculate threat indicators
        if total_edges > 0:
            attack_ratio = attack_count / total_edges
            suspicious_ratio = suspicious_count / total_edges
            threat_ratio = attack_ratio + (suspicious_ratio * 0.5)
        else:
            attack_ratio = 0
            suspicious_ratio = 0
            threat_ratio = 0
        
        # Rule 1: Critical threat - High attack volume
        if attack_count > 20 or attack_ratio > 0.25:
            threat_level = "CRITICAL"
            priority = "immediate"
            workflow_mode = "full_analysis"
        
        # Rule 2: High threat - Moderate attacks or specific attack patterns
        elif attack_count > 10 or attack_ratio > 0.15:
            threat_level = "HIGH"
            priority = "high"
            workflow_mode = "full_analysis"
        
        # Rule 3: Medium threat - Some attacks or many suspicious connections
        elif attack_count > 3 or suspicious_count > 15 or threat_ratio > 0.10:
            threat_level = "MEDIUM"
            priority = "elevated"
            workflow_mode = "full_analysis"
        
        # Rule 4: Low threat - Minimal suspicious activity
        elif suspicious_count > 5 or attack_count > 0:
            threat_level = "LOW"
            priority = "standard"
            workflow_mode = "full_analysis"
        
        # Rule 5: No threat - All normal traffic
        else:
            threat_level = "NONE"
            priority = "monitoring_only"
            workflow_mode = "monitoring_only"
        
        # Special case: DDoS detection (many attacks on same target)
        ddos_detected = False
        if "DDoS Volumetric" in attack_types and attack_types["DDoS Volumetric"] > 5:
            ddos_detected = True
            threat_level = "CRITICAL"
            priority = "immediate"
        
        # Special case: APT or sophisticated attacks
        sophisticated_attacks = ["APT Exfiltration", "Zero-Day Exploit", "Ransomware"]
        apt_detected = any(attack in attack_types for attack in sophisticated_attacks)
        if apt_detected:
            threat_level = "HIGH" if threat_level == "LOW" else threat_level
            priority = "high"
        
        # Determine routing and agent priorities
        agent_priorities = {
            "detector": "high" if threat_ratio > 0.1 else "standard",
            "investigator": "high" if attack_count > 5 else "standard",
            "monitor": "standard",
            "judge": "high" if threat_level in ["CRITICAL", "HIGH"] else "standard",
            "mitigator": "immediate" if threat_level == "CRITICAL" else "standard"
        }
        
        # Build enriched context for downstream agents
        enriched_context = {
            **state.get("context", {}),
            "orchestrator_analysis": {
                "threat_level": threat_level,
                "priority": priority,
                "workflow_mode": workflow_mode,
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "attack_count": attack_count,
                "suspicious_count": suspicious_count,
                "normal_count": normal_count,
                "attack_ratio": round(attack_ratio, 3),
                "suspicious_ratio": round(suspicious_ratio, 3),
                "threat_ratio": round(threat_ratio, 3),
                "attack_types": attack_types,
                "attacked_node_count": len(attacked_nodes),
                "suspicious_node_count": len(suspicious_nodes),
                "high_traffic_node_count": len(high_traffic_nodes),
                "ddos_detected": ddos_detected,
                "apt_detected": apt_detected,
                "agent_priorities": agent_priorities
            }
        }
        
        # Generate human-readable reasoning
        reasoning_parts = [
            f"Analyzed network traffic: {total_nodes} nodes, {total_edges} connections.",
            f"Detected {attack_count} attacks, {suspicious_count} suspicious, {normal_count} normal.",
            f"Threat assessment: {threat_level} ({round(threat_ratio * 100, 1)}% threat ratio)."
        ]
        
        if ddos_detected:
            reasoning_parts.append(f"⚠️ DDoS attack detected with {attack_types['DDoS Volumetric']} volumetric vectors.")
        
        if apt_detected:
            apt_types = [a for a in sophisticated_attacks if a in attack_types]
            reasoning_parts.append(f"⚠️ Sophisticated attacks detected: {', '.join(apt_types)}.")
        
        if threat_level in ["CRITICAL", "HIGH"]:
            reasoning_parts.append(f"Routing with {priority} priority for immediate analysis.")
        elif threat_level == "MEDIUM":
            reasoning_parts.append("Routing for standard security analysis.")
        elif threat_level == "LOW":
            reasoning_parts.append("Routing for monitoring and light analysis.")
        else:
            reasoning_parts.append("Normal traffic detected, minimal analysis required.")
        
        reasoning = " ".join(reasoning_parts)
        
        # Calculate confidence based on data completeness
        confidence = 1.0
        if total_edges == 0:
            confidence = 0.3  # Low confidence with no data
        elif total_edges < 10:
            confidence = 0.7  # Medium confidence with limited data
        elif total_nodes < 5:
            confidence = 0.8  # Good confidence but few nodes
        
        # Create orchestrator decision
        state["orchestrator_decision"] = AgentDecision(
            agent_id="orchestrator",
            decision=f"route_workflow_{workflow_mode}",
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "threat_level": threat_level,
                "priority": priority,
                "workflow_mode": workflow_mode,
                "agent_priorities": agent_priorities,
                "ddos_detected": ddos_detected,
                "apt_detected": apt_detected,
                "statistics": {
                    "total_nodes": total_nodes,
                    "total_edges": total_edges,
                    "attack_count": attack_count,
                    "suspicious_count": suspicious_count,
                    "attack_types": attack_types
                }
            }
        )
        
        # Update state
        state["context"] = enriched_context
        state["current_step"] = "orchestrator"
        state["completed_agents"] = ["orchestrator"]
        state["should_continue"] = True
        
        return state
    
    async def _detector_node(self, state: AgentState) -> AgentState:
        """
        Detector agent node - LLM-powered threat detection using GPT-4o-mini
        
        Responsibilities:
        1. Identify suspicious network activity in real-time
        2. Analyze network traffic using heavy-hitter detection and graph anomaly algorithms
        3. Flag abnormal IPs, ports, or traffic clusters
        4. Generate confidence scores for potential attacks
        """
        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Initialize GPT-4o-mini
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.2,  # Low temperature for analytical tasks
            api_key=config.openai_api_key
        )
        
        # Create detection prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI-powered network threat detector specialized in identifying suspicious activity and anomalies in network traffic.

Your role:
- Analyze network traffic patterns to identify threats
- Apply heavy-hitter detection (identify nodes/edges with abnormally high traffic)
- Detect graph anomalies (unusual connection patterns, clustering, isolated nodes)
- Flag abnormal IPs, ports, and traffic volumes
- Generate confidence scores for each detected threat

You will receive:
1. Orchestrator analysis (initial threat assessment)
2. Network nodes (IPs with statuses and traffic volumes)
3. Network edges (connections between nodes with types and attack classifications)

You must generate a JSON response with:
{{
  "threats_detected": [
    {{
      "threat_id": "unique_id",
      "threat_type": "heavy_hitter" | "graph_anomaly" | "suspicious_pattern" | "port_scan" | "ddos_source" | "botnet_node",
      "confidence": 0.0-1.0,
      "severity": "low" | "medium" | "high" | "critical",
      "flagged_entities": {{
        "nodes": ["node_id1", "node_id2"],
        "edges": ["edge_id1"],
        "ips": ["ip1", "ip2"],
        "ports": [80, 443]
      }},
      "reasoning": "Detailed explanation",
      "indicators": ["indicator1", "indicator2"]
    }}
  ],
  "heavy_hitters": [
    {{
      "entity_id": "node_id or ip",
      "entity_type": "source" | "target",
      "traffic_volume": int,
      "connection_count": int,
      "anomaly_score": 0.0-1.0,
      "reason": "explanation"
    }}
  ],
  "graph_anomalies": [
    {{
      "anomaly_type": "isolated_cluster" | "star_topology" | "unusual_connectivity" | "traffic_spike",
      "affected_nodes": ["node1", "node2"],
      "description": "explanation",
      "severity": "low" | "medium" | "high"
    }}
  ],
  "flagged_ips": [
    {{
      "ip": "x.x.x.x",
      "reason": "explanation",
      "confidence": 0.0-1.0,
      "suggested_action": "monitor" | "investigate" | "block"
    }}
  ],
  "overall_assessment": {{
    "total_threats": int,
    "critical_threats": int,
    "high_confidence_threats": int,
    "recommended_action": "none" | "monitor" | "investigate" | "immediate_response"
  }},
  "summary": "Plain-English summary of findings"
}}

Analysis guidelines:
- Consider traffic volume relative to network average
- Identify nodes with disproportionately high in/out connections
- Detect clustering patterns indicative of botnets
- Flag IPs marked as "attacked" or "suspicious" in input
- Look for port scanning patterns (many connections from one source to different targets)
- Calculate confidence based on evidence strength
- Provide actionable reasoning for security teams"""),
            ("human", """Analyze this network traffic and detect threats:

ORCHESTRATOR ANALYSIS:
{orchestrator_analysis}

NETWORK NODES:
{nodes}

NETWORK EDGES:
{edges}

Perform threat detection analysis and return a comprehensive JSON report.""")
        ])
        
        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke({
                "orchestrator_analysis": json.dumps(orchestrator_analysis, indent=2),
                "nodes": json.dumps(input_data.get("nodes", []), indent=2),
                "edges": json.dumps(input_data.get("edges", []), indent=2)
            })
            
            # Parse LLM response
            llm_output = response.content
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in llm_output:
                llm_output = llm_output.split("```json")[1].split("```")[0].strip()
            elif "```" in llm_output:
                llm_output = llm_output.split("```")[1].split("```")[0].strip()
            
            detector_data = json.loads(llm_output)
            
            # Extract key fields
            threats_detected = detector_data.get("threats_detected", [])
            heavy_hitters = detector_data.get("heavy_hitters", [])
            graph_anomalies = detector_data.get("graph_anomalies", [])
            flagged_ips = detector_data.get("flagged_ips", [])
            overall_assessment = detector_data.get("overall_assessment", {})
            summary = detector_data.get("summary", "Threat detection analysis complete")
            
            # Determine decision based on threats
            total_threats = overall_assessment.get("total_threats", 0)
            if total_threats == 0:
                decision = "no_threats_detected"
            elif overall_assessment.get("recommended_action") == "immediate_response":
                decision = "critical_threats_detected"
            elif overall_assessment.get("recommended_action") == "investigate":
                decision = "threats_require_investigation"
            else:
                decision = "threats_detected_monitoring"
            
            # Calculate overall confidence
            if threats_detected:
                avg_confidence = sum(t.get("confidence", 0) for t in threats_detected) / len(threats_detected)
                confidence = round(avg_confidence, 2)
            else:
                confidence = 0.95  # High confidence when no threats detected
            
        except Exception as e:
            # Fallback to basic detection if LLM fails
            print(f"LLM detection failed: {e}. Using fallback.")
            threats_detected = []
            heavy_hitters = []
            graph_anomalies = []
            flagged_ips = []
            overall_assessment = {
                "total_threats": 0,
                "critical_threats": 0,
                "high_confidence_threats": 0,
                "recommended_action": "none"
            }
            summary = f"Detector agent encountered an error: {str(e)}"
            decision = "detection_error"
            confidence = 0.3
        
        # Create detector decision
        state["detector_decision"] = AgentDecision(
            agent_id="detector",
            decision=decision,
            confidence=confidence,
            reasoning=summary,
            metadata={
                "threats_detected": threats_detected,
                "heavy_hitters": heavy_hitters,
                "graph_anomalies": graph_anomalies,
                "flagged_ips": flagged_ips,
                "overall_assessment": overall_assessment,
                "llm_model": "gpt-4o-mini",
                "llm_powered": True
            }
        )
        
        # Update state
        state["current_step"] = "detector"
        state["completed_agents"] = state.get("completed_agents", []) + ["detector"]
        
        return state
    
    async def _investigator_node(self, state: AgentState) -> AgentState:
        """Investigator agent node - placeholder for now"""
        # TODO: Implement investigator logic
        state["investigator_decision"] = AgentDecision(
            agent_id="investigator",
            decision="investigation_complete",
            confidence=0.9,
            reasoning="Investigation completed successfully"
        )
        state["current_step"] = "investigator"
        return state
    
    async def _monitor_node(self, state: AgentState) -> AgentState:
        """
        Monitor agent node - LLM-powered monitoring and log summarization using GPT-3.5-Turbo
        
        Responsibilities:
        1. Translate logs and events into plain-English summaries using AI
        2. Highlight trends, critical nodes, and abnormal traffic patterns
        3. Generate structured logs for frontend visualization
        4. Track network health metrics over time
        """
        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Initialize GPT-3.5-Turbo
        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.3,  # Slightly creative but mostly factual
            api_key=config.openai_api_key
        )
        
        # Create monitoring prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI-powered network security monitoring agent. Your role is to analyze network traffic data and generate comprehensive monitoring reports.

You will receive:
1. Network node and edge data
2. Orchestrator analysis (threat levels, attack detection)

You must generate a JSON response with:
1. logs: Array of timestamped log entries
2. dashboard: Network health metrics
3. summary: Plain-English summary for security analysts
4. network_status: "healthy" | "degraded" | "at_risk" | "critical"
5. health_score: Integer 0-100

Log entry structure:
{{
  "timestamp": "ISO 8601 timestamp",
  "level": "INFO" | "WARNING" | "CRITICAL",
  "category": "system" | "threat_detection" | "ddos" | "apt" | "attack_pattern" | "node_status" | "health",
  "message": "Human-readable message with emojis",
  "details": {{}}
}}

Dashboard structure:
{{
  "network_health": {{"score": 0-100, "status": "...", "threat_level": "..."}},
  "traffic_statistics": {{"total_nodes": int, "total_edges": int, ...}},
  "attack_metrics": {{"total_attacks": int, "attack_types": {{}}, "ddos_detected": bool, "apt_detected": bool}},
  "critical_nodes": {{"most_targeted": [...], "most_attacking": [...], "attacked_list": [...]}},
  "trends": {{"threat_increasing": bool, "primary_attack_vector": str, "health_trend": "..."}}
}}

Rules:
- Use emojis in messages (✅, ⚠️, 🚨, 🔴, 🟡, 🎯, 📊)
- Provide actionable recommendations
- Identify attack patterns and trends
- Highlight critical nodes under attack
- Calculate realistic health scores based on attack ratios"""),
            ("human", """Analyze this network traffic data and generate a monitoring report:

ORCHESTRATOR ANALYSIS:
{orchestrator_analysis}

NETWORK DATA:
Nodes: {nodes}
Edges: {edges}

Generate a comprehensive JSON monitoring report.""")
        ])
        
        # Prepare data for LLM
        network_data_summary = {
            "total_nodes": len(input_data.get("nodes", [])),
            "total_edges": len(input_data.get("edges", [])),
            "nodes_sample": input_data.get("nodes", [])[:10],  # First 10 nodes
            "edges_sample": input_data.get("edges", [])[:20]  # First 20 edges
        }
        
        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke({
                "orchestrator_analysis": json.dumps(orchestrator_analysis, indent=2),
                "nodes": json.dumps(input_data.get("nodes", []), indent=2),
                "edges": json.dumps(input_data.get("edges", []), indent=2)
            })
            
            # Parse LLM response
            llm_output = response.content
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in llm_output:
                llm_output = llm_output.split("```json")[1].split("```")[0].strip()
            elif "```" in llm_output:
                llm_output = llm_output.split("```")[1].split("```")[0].strip()
            
            monitor_data = json.loads(llm_output)
            
            # Add timestamps to logs if not present
            current_time = datetime.now().isoformat()
            for log in monitor_data.get("logs", []):
                if "timestamp" not in log:
                    log["timestamp"] = current_time
            
            # Extract key fields
            logs = monitor_data.get("logs", [])
            dashboard = monitor_data.get("dashboard", {})
            summary = monitor_data.get("summary", "Network monitoring analysis complete")
            network_status = monitor_data.get("network_status", "unknown")
            health_score = monitor_data.get("health_score", 50)
            
            # Calculate confidence based on LLM output quality
            confidence = 0.9  # High confidence in LLM analysis
            
        except Exception as e:
            # Fallback to basic analysis if LLM fails
            print(f"LLM analysis failed: {e}. Using fallback.")
            logs = [{
                "timestamp": datetime.now().isoformat(),
                "level": "WARNING",
                "category": "system",
                "message": f"LLM monitoring unavailable. Error: {str(e)}",
                "details": {}
            }]
            dashboard = {
                "network_health": {"score": 50, "status": "unknown", "threat_level": "UNKNOWN"},
                "traffic_statistics": {},
                "attack_metrics": {},
                "critical_nodes": {},
                "trends": {}
            }
            summary = "Monitoring agent encountered an error. Fallback mode active."
            network_status = "unknown"
            health_score = 50
            confidence = 0.3
        
        # Create monitor decision
        state["monitor_decision"] = AgentDecision(
            agent_id="monitor",
            decision=f"monitoring_{network_status}",
            confidence=confidence,
            reasoning=summary,
            metadata={
                "logs": logs,
                "dashboard": dashboard,
                "summary": summary,
                "network_status": network_status,
                "health_score": health_score,
                "llm_powered": True
            }
        )
        
        # Update state
        state["current_step"] = "monitor"
        state["completed_agents"] = state.get("completed_agents", []) + ["monitor"]
        
        return state
    
    def _get_timestamp(self):
        """Generate timestamp for logs"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    async def _judge_node(self, state: AgentState) -> AgentState:
        """Judge agent node - placeholder for now"""
        # TODO: Implement judge logic
        state["judge_decision"] = AgentDecision(
            agent_id="judge",
            decision="no_action_required",
            confidence=0.85,
            reasoning="All agents report normal conditions"
        )
        state["current_step"] = "judge"
        return state
    
    async def _mitigator_node(self, state: AgentState) -> AgentState:
        """Mitigator agent node - placeholder for now"""
        # TODO: Implement mitigator logic
        state["mitigator_decision"] = AgentDecision(
            agent_id="mitigator",
            decision="no_mitigation_needed",
            confidence=0.9,
            reasoning="No threats detected requiring mitigation"
        )
        state["final_decision"] = state["mitigator_decision"]
        state["current_step"] = "mitigator"
        return state
    
    async def run(self, input_data: Dict[str, Any], context: Dict[str, Any] = None) -> AgentState:
        """Run the agent workflow"""
        initial_state = AgentState(
            input_data=input_data,
            context=context or {},
            orchestrator_decision=None,
            detector_decision=None,
            investigator_decision=None,
            monitor_decision=None,
            judge_decision=None,
            mitigator_decision=None,
            current_step="",
            completed_agents=[],
            should_continue=True,
            final_decision=None,
            explanation="",
            confidence_score=0.0
        )
        
        # Run the workflow with configuration
        config = {"configurable": {"thread_id": "agent_session_1"}}
        result = await self.graph.ainvoke(initial_state, config=config)
        return result
