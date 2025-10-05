
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
        
        # Define the workflow edges with conditional routing
        workflow.set_entry_point("orchestrator")
        
        # Conditional routing based on orchestrator decision
        workflow.add_conditional_edges(
            "orchestrator",
            self._route_after_orchestrator,
            {
                "full_analysis": "detector",
                "monitoring_only": "monitor",
                "skip_to_judge": "judge"
            }
        )
        
        # After detector - route to investigator if threats detected
        workflow.add_conditional_edges(
            "detector", 
            self._route_after_detector,
            {
                "investigate": "investigator",
                "skip_to_monitor": "monitor",
                "no_threats": "monitor"
            }
        )
        
        # After investigator - always go to judge for decision
        workflow.add_edge("investigator", "judge")
        
        # After monitor - go to judge for final decision
        workflow.add_edge("monitor", "judge")
        
        # After judge - conditional routing to mitigator
        workflow.add_conditional_edges(
            "judge",
            self._route_after_judge,
            {
                "mitigate": "mitigator",
                "no_action": END,
                "human_review": END
            }
        )
        
        # Mitigator is final step
        workflow.add_edge("mitigator", END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=self.memory)
    
    def _route_after_orchestrator(self, state: AgentState) -> str:
        """Route after orchestrator based on threat level and workflow mode"""
        orchestrator_decision = state.get("orchestrator_decision")
        if not orchestrator_decision:
            return "full_analysis"
        
        metadata = orchestrator_decision.metadata
        threat_level = metadata.get("threat_level", "NONE")
        workflow_mode = metadata.get("workflow_mode", "full_analysis")
        
        if workflow_mode == "monitoring_only":
            return "monitoring_only"
        elif threat_level == "NONE":
            return "skip_to_judge"  # Skip directly to judge for final decision
        else:
            return "full_analysis"  # Go to detector for threat analysis
    
    def _route_after_detector(self, state: AgentState) -> str:
        """Route after detector based on threats detected"""
        detector_decision = state.get("detector_decision")
        if not detector_decision:
            return "no_threats"
        
        metadata = detector_decision.metadata
        threats_detected = metadata.get("threats_detected", [])
        overall_assessment = metadata.get("overall_assessment", {})
        recommended_action = overall_assessment.get("recommended_action", "none")
        
        # If threats detected and need investigation
        if threats_detected and recommended_action in ["investigate", "immediate_response"]:
            return "investigate"
        elif recommended_action == "monitor":
            return "skip_to_monitor"
        else:
            return "no_threats"
    
    def _route_after_judge(self, state: AgentState) -> str:
        """Route after judge based on final assessment"""
        judge_decision = state.get("judge_decision")
        if not judge_decision:
            return "no_action"
        
        metadata = judge_decision.metadata
        final_assessment = metadata.get("final_assessment", {})
        
        requires_action = final_assessment.get("requires_immediate_action", False)
        automated_approved = final_assessment.get("automated_response_approved", False)
        human_required = final_assessment.get("human_intervention_required", False)
        
        if human_required:
            return "human_review"
        elif requires_action and automated_approved:
            return "mitigate"
        else:
            return "no_action"
    
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
        import time
        start_time = time.time()

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
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to ms

        # Build intermediate steps for transparency
        intermediate_steps = [
            {"step": "Received network traffic data", "details": f"{total_nodes} nodes, {total_edges} edges"},
            {"step": "Analyzed traffic patterns", "details": f"{attack_count} attacks, {suspicious_count} suspicious, {normal_count} normal"},
            {"step": "Calculated threat metrics", "details": f"Threat ratio: {round(threat_ratio * 100, 1)}%"},
            {"step": "Determined threat level", "details": f"{threat_level} with {priority} priority"},
            {"step": "Selected workflow mode", "details": f"Routing to {workflow_mode}"}
        ]

        # Create orchestrator decision with transparency
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
            },
            llm_prompt=f"Coordinating analysis of {total_nodes} nodes and {total_edges} edges with {attack_count} detected attacks",
            llm_response=f"Threat Level: {threat_level}, Workflow: {workflow_mode}",
            intermediate_steps=intermediate_steps,
            processing_time_ms=processing_time
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
        import time
        start_time = time.time()

        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Debug: Log NetFlow data received by Detector
        print("=== DETECTOR AGENT RECEIVED NETFLOW DATA ===")
        print(f"Nodes: {len(input_data.get('nodes', []))}")
        print(f"Edges: {len(input_data.get('edges', []))}")
        if input_data.get('edges'):
            sample_edge = input_data['edges'][0]
            print(f"Sample Edge: {sample_edge}")
        print("=============================================")
        
        # Initialize fast model for detection
        llm = ChatOpenAI(
            model=config.fast_model,
            temperature=config.fast_model_temperature,  # Low temperature for analytical tasks
            api_key=config.openai_api_key
        )
        
        # Create detection prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI-powered network threat detector specialized in analyzing NetFlow data to identify suspicious activity and anomalies.

Your role:
- Analyze NetFlow records (packet counts, protocols, IPs, ports, bandwidth) to identify threats
- Apply heavy-hitter detection using NetFlow metrics (identify nodes/edges with abnormally high packet volumes)
- Detect graph anomalies using NetFlow patterns (unusual connection patterns, clustering, isolated nodes)
- Flag abnormal IPs, ports, and traffic volumes based on NetFlow data
- Generate confidence scores for each detected threat using NetFlow evidence

You will receive:
1. Orchestrator analysis (initial threat assessment based on NetFlow data)
2. Network nodes (IPs with statuses and traffic volumes from NetFlow)
3. Network edges (NetFlow records with packet_count, protocol, source_ip, target_ip, bandwidth, attack_type)

CRITICAL: Always reference specific NetFlow metrics in your analysis:
- Extract exact packet counts (d_pkts) from edges
- Identify protocol numbers (6=TCP, 17=UDP, 1=ICMP)
- Analyze source/target IP addresses and ports
- Calculate bandwidth consumption (d_octets)
- Compare against normal baselines

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
      "reasoning": "Detailed NetFlow-based explanation with specific metrics",
      "netflow_indicators": [
        "UDP protocol (17) with 15,000+ packets indicating DDoS",
        "Packet volume exceeds baseline by 500%",
        "Bandwidth consumption of 1.5MB/s",
        "Source IP 172.16.0.5 targeting port 53"
      ],
      "quantitative_analysis": {{
        "packet_count": "exact packet count from NetFlow",
        "protocol": "exact protocol number",
        "bandwidth": "exact bytes transferred",
        "baseline_comparison": "percentage above normal"
      }}
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

Analysis guidelines - BE SPECIFIC WITH NETFLOW DATA:
- Extract exact packet counts, protocols, IPs, and ports from NetFlow records
- Calculate attack intensity ratios (packet volume vs baseline)
- Identify specific attack patterns using NetFlow metrics
- Reference exact NetFlow data points in reasoning
- Calculate bandwidth consumption rates
- Match attack patterns to CIC dataset attack types
- Provide quantitative analysis with specific numbers
- Use NetFlow terminology (d_pkts, d_octets, srcaddr, dstaddr, prot)
- Calculate confidence based on NetFlow evidence strength
- Provide actionable reasoning with specific NetFlow metrics"""),
            ("human", """Analyze NetFlow data and detect threats with SPECIFIC METRICS:

ORCHESTRATOR ANALYSIS (NetFlow-based):
{orchestrator_analysis}

NETWORK NODES (NetFlow Sources/Destinations):
{nodes}

NETWORK EDGES (NetFlow Records):
{edges}

CRITICAL REQUIREMENTS - PROVIDE SPECIFIC NETFLOW ANALYSIS:

MANDATORY: You MUST extract and reference EXACT NetFlow metrics from the provided data. Do NOT use generic language.

1. EXTRACT EXACT METRICS from each edge:
   - packet_count: Exact number of packets (d_pkts) - USE THE ACTUAL NUMBER
   - protocol: Exact protocol number (6=TCP, 17=UDP, 1=ICMP) - USE THE ACTUAL NUMBER
   - source_ip: Exact source IP address - USE THE ACTUAL IP
   - target_ip: Exact destination IP address - USE THE ACTUAL IP
   - bandwidth: Exact bytes transferred (d_octets) - USE THE ACTUAL NUMBER
   - attack_type: Specific attack type from CIC dataset - USE THE ACTUAL TYPE

2. CALCULATE ATTACK INTENSITY WITH EXACT NUMBERS:
   - Compare packet counts to normal baselines (typically 100-1000 packets)
   - Calculate bandwidth consumption rates (MB/s = bytes/1000000)
   - Determine packet-per-second rates
   - Calculate exact percentages above baseline

3. PROVIDE QUANTITATIVE ANALYSIS WITH EXACT NUMBERS:
   - "UDP protocol (17) with [EXACT PACKET COUNT] packets from [EXACT SOURCE IP] targeting port [EXACT PORT]"
   - "Packet volume exceeds baseline by [EXACT PERCENTAGE]% ([EXACT COUNT] vs 1000 normal)"
   - "Bandwidth consumption of [EXACT MB/s]MB/s indicates high-volume attack"
   - "Attack pattern matches CIC [EXACT ATTACK TYPE] signature"

4. MAKE EACH ANALYSIS UNIQUE FOR THE SPECIFIC NODE:
   - Reference the specific node ID being analyzed
   - Include unique NetFlow metrics for that specific node
   - Provide node-specific reasoning based on its exact traffic patterns
   - Do NOT use generic phrases like "high traffic volume" or "suspicious patterns"

Detect threats with SPECIFIC NetFlow data points and quantitative analysis.""")
        ])

        # Prepare the prompt for transparency
        prompt_input = {
            "orchestrator_analysis": json.dumps(orchestrator_analysis, indent=2),
            "nodes": json.dumps(input_data.get("nodes", []), indent=2),
            "edges": json.dumps(input_data.get("edges", []), indent=2)
        }

        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke(prompt_input)

            # Parse LLM response
            llm_output = response.content
            llm_prompt_text = f"Analyzing {len(input_data.get('nodes', []))} nodes and {len(input_data.get('edges', []))} edges for threat detection"

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
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # Convert to ms

        # Create detector decision with transparency fields
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
                "llm_model": config.fast_model,
                "llm_powered": True
            },
            llm_prompt=llm_prompt_text,
            llm_response=summary,
            intermediate_steps=[
                {"step": "Received data from Orchestrator", "details": f"Threat level: {orchestrator_analysis.get('threat_level', 'UNKNOWN')}"},
                {"step": "Analyzed network traffic", "details": f"Found {len(threats_detected)} threats"},
                {"step": "Generated threat assessment", "details": f"Confidence: {confidence}"}
            ],
            processing_time_ms=processing_time
        )
        
        # Update state
        state["current_step"] = "detector"
        state["completed_agents"] = state.get("completed_agents", []) + ["detector"]
        
        return state
    
    async def _investigator_node(self, state: AgentState) -> AgentState:
        """
        Investigator agent node - LLM-powered deep analysis using fast model

        Responsibilities:
        1. Perform deep analysis on flagged network activity from Detector
        2. Inspect suspicious nodes and edges identified by Detector
        3. Determine attack type (DDoS, port scan, botnet burst, etc.)
        4. Provide detailed reports for mitigation and monitoring agents
        5. Communicate with Detector agent findings
        """
        import time
        start_time = time.time()

        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Debug: Log NetFlow data received by Investigator
        print("=== INVESTIGATOR AGENT RECEIVED NETFLOW DATA ===")
        print(f"Nodes: {len(input_data.get('nodes', []))}")
        print(f"Edges: {len(input_data.get('edges', []))}")
        if input_data.get('edges'):
            sample_edge = input_data['edges'][0]
            print(f"Sample Edge: {sample_edge}")
        print("================================================")
        
        # Get Detector's findings
        detector_decision = state.get("detector_decision")
        detector_metadata = detector_decision.metadata if detector_decision else {}
        
        # Initialize GPT-4o-mini (faster model for analysis with good reasoning)
        llm = ChatOpenAI(
            model=config.fast_model,
            temperature=config.fast_model_temperature,  # Balanced temperature for speed and precision
            api_key=config.openai_api_key
        )
        
        # Create investigation prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an elite AI-powered network security investigator specialized in deep forensic analysis of cyber threats using NetFlow data.

Your role:
- Perform comprehensive forensic analysis on threats detected by the Detector agent
- Analyze NetFlow records (packet counts, protocols, IP addresses, ports, timestamps)
- Inspect suspicious nodes and edges in detail using NetFlow flow data
- Determine precise attack types and methodologies based on NetFlow patterns
- Correlate multiple threat indicators into attack campaigns using flow analysis
- Provide detailed technical reports for security teams with NetFlow evidence
- Assess attack sophistication and likely threat actor profiles using traffic patterns

You will receive:
1. Orchestrator's initial threat assessment based on NetFlow data
2. Detector's threat findings (threats, heavy hitters, anomalies, flagged IPs) from NetFlow analysis
3. Full network node and edge data (NetFlow records with packet_count, protocol, source_ip, target_ip, etc.)
4. Context from previous agent decisions

CRITICAL: Always reference specific NetFlow data points in your analysis:
- Packet counts (d_pkts) indicating attack volume
- Protocol numbers (TCP=6, UDP=17, ICMP=1) showing attack vectors
- Source/target IP addresses and ports showing attack patterns
- Bandwidth/octet counts showing data transfer volumes
- Timestamps showing attack duration and timing patterns

You must generate a JSON response with:
{{
  "investigations": [
    {{
      "investigation_id": "unique_id",
      "related_threats": ["threat_id1", "threat_id2"],
      "attack_type": "DDoS" | "Port Scan" | "Botnet" | "APT Campaign" | "Data Exfiltration" | "Ransomware" | "Zero-Day Exploit" | "Brute Force" | "SQL Injection" | "DNS Tunneling" | "Other",
      "attack_subtype": "Specific variant or technique",
      "sophistication_level": "low" | "medium" | "high" | "advanced_persistent",
      "confidence": 0.0-1.0,
      "severity": "low" | "medium" | "high" | "critical",
      "affected_entities": {{
        "nodes": ["node_id1", "node_id2"],
        "edges": ["edge_id1"],
        "ips": ["ip1", "ip2"]
      }},
      "attack_timeline": [
        {{
          "stage": "reconnaissance" | "initial_access" | "execution" | "persistence" | "exfiltration" | "impact",
          "description": "What happened",
          "evidence": ["evidence1", "evidence2"]
        }}
      ],
      "technical_details": {{
        "attack_vector": "Description of how the attack works based on NetFlow analysis",
        "netflow_evidence": {{
          "packet_counts": "Analysis of packet volumes (d_pkts) indicating attack intensity",
          "protocol_analysis": "Protocol usage patterns (TCP/UDP/ICMP) showing attack vectors",
          "ip_port_patterns": "Source/target IP and port patterns revealing attack methodology",
          "bandwidth_analysis": "Data transfer volumes (d_octets) showing attack scale",
          "timing_patterns": "Flow timing analysis showing attack duration and intervals"
        }},
        "indicators_of_compromise": ["ioc1", "ioc2"],
        "ttps": ["MITRE ATT&CK technique IDs or descriptions"],
        "payload_analysis": "If applicable"
      }},
      "threat_actor_profile": {{
        "likely_motivation": "financial" | "espionage" | "disruption" | "activism" | "unknown",
        "skill_level": "script_kiddie" | "intermediate" | "advanced" | "nation_state",
        "attribution_confidence": 0.0-1.0
      }},
      "impact_assessment": {{
        "affected_systems": int,
        "data_at_risk": "None" | "Low" | "Medium" | "High" | "Critical",
        "business_impact": "Description",
        "estimated_scope": "Localized" | "Network-wide" | "Multi-network"
      }},
      "evidence_chain": [
        {{
          "evidence_type": "netflow_traffic_pattern" | "netflow_node_behavior" | "netflow_connection_anomaly" | "netflow_protocol_anomaly" | "netflow_volume_anomaly",
          "description": "Detailed NetFlow-based evidence with specific data points",
          "netflow_data_points": ["specific packet counts", "protocol numbers", "IP addresses", "port numbers", "timestamps"],
          "confidence": 0.0-1.0
        }}
      ],
      "correlation_analysis": "How this relates to other threats or campaigns",
      "recommendations": [
        "Specific action item 1",
        "Specific action item 2"
      ]
    }}
  ],
  "attack_campaigns": [
    {{
      "campaign_id": "unique_id",
      "campaign_name": "Descriptive name",
      "related_investigations": ["inv_id1", "inv_id2"],
      "coordinated": bool,
      "description": "Campaign overview",
      "timeline": "When it started/ongoing"
    }}
  ],
  "node_forensics": [
    {{
      "node_id": "node_id",
      "ip": "x.x.x.x",
      "role_in_attack": "attacker" | "victim" | "relay" | "command_control" | "compromised",
      "behavioral_analysis": "Detailed behavior description",
      "risk_score": 0.0-1.0,
      "recommended_action": "isolate" | "monitor" | "block" | "investigate_further"
    }}
  ],
  "edge_forensics": [
    {{
      "edge_id": "edge_id",
      "source_ip": "x.x.x.x",
      "target_ip": "x.x.x.x",
      "connection_purpose": "Analysis of connection intent",
      "anomaly_indicators": ["indicator1", "indicator2"],
      "threat_level": "low" | "medium" | "high" | "critical"
    }}
  ],
  "overall_assessment": {{
    "total_investigations": int,
    "critical_investigations": int,
    "coordinated_attack": bool,
    "attack_in_progress": bool,
    "recommended_priority": "low" | "medium" | "high" | "critical",
    "requires_immediate_action": bool
  }},
  "executive_summary": "Plain-English summary for security leadership",
  "technical_summary": "Detailed technical summary for SOC analysts"
}}

Investigation guidelines:
- ALWAYS reference specific NetFlow data points in your analysis
- Extract exact packet counts, protocol numbers, IP addresses, and ports from the edges data
- Calculate attack intensity ratios (e.g., "packet volume exceeds baseline by 500%")
- Identify specific attack signatures from NetFlow patterns
- Provide quantitative analysis (bandwidth consumption, packet rates, etc.)
- Cross-reference with CIC DDoS 2019 dataset attack types
- Use specific NetFlow terminology (d_pkts, d_octets, srcaddr, dstaddr, prot)
- Calculate attack severity based on NetFlow metrics
- Provide evidence-based conclusions with exact data points
- Consider false positive possibilities using NetFlow validation
- Recommend specific, actionable next steps based on NetFlow analysis
- Use industry-standard terminology (MITRE, NIST, NetFlow RFC)"""),
            ("human", """Perform deep forensic investigation on the detected threats using NetFlow data analysis:

ORCHESTRATOR ANALYSIS:
{orchestrator_analysis}

DETECTOR FINDINGS:
{detector_findings}

NETWORK NODES (NetFlow Sources/Destinations):
{nodes}

NETWORK EDGES (NetFlow Records):
{edges}

CRITICAL ANALYSIS REQUIREMENTS - BE SPECIFIC WITH NETFLOW DATA:

MANDATORY: You MUST extract and reference EXACT NetFlow metrics from the provided data. Do NOT use generic language.

1. EXTRACT EXACT NETFLOW METRICS from each edge:
   - packet_count: Exact number of packets (d_pkts) - USE THE ACTUAL NUMBER
   - protocol: Exact protocol number (6=TCP, 17=UDP, 1=ICMP) - USE THE ACTUAL NUMBER
   - source_ip: Exact source IP address - USE THE ACTUAL IP
   - target_ip: Exact destination IP address - USE THE ACTUAL IP
   - bandwidth: Exact bytes transferred (d_octets) - USE THE ACTUAL NUMBER
   - attack_type: Specific attack type from CIC dataset - USE THE ACTUAL TYPE

2. CALCULATE ATTACK INTENSITY RATIOS:
   - Compare packet counts to normal baselines (typically 100-1000 packets)
   - Calculate bandwidth consumption rates (MB/s = bytes/1000000)
   - Determine packet-per-second rates
   - Assess attack duration from timestamps

3. PROVIDE QUANTITATIVE ANALYSIS WITH EXACT NUMBERS:
   - "UDP protocol (17) with [EXACT PACKET COUNT] packets from [EXACT SOURCE IP] targeting port [EXACT PORT]"
   - "Packet volume exceeds baseline by [EXACT PERCENTAGE]% ([EXACT COUNT] vs 1000 normal)"
   - "Bandwidth consumption of [EXACT MB/s]MB/s indicates high-volume attack"
   - "Attack pattern matches CIC [EXACT ATTACK TYPE] signature with [EXACT CONFIDENCE]% confidence"

4. REFERENCE SPECIFIC CIC DATASET ATTACK TYPES:
   - DrDoS_DNS, SYN-Flood, UDP-Flood, Port-Scan, etc.
   - Match NetFlow patterns to known attack signatures
   - Provide confidence scores based on pattern matching

5. EXPLAIN SEVERITY USING EXACT NETFLOW METRICS:
   - Critical: >10,000 packets, >1MB/s bandwidth, coordinated IPs
   - High: 5,000-10,000 packets, 500KB-1MB/s bandwidth
   - Medium: 1,000-5,000 packets, 100-500KB/s bandwidth
   - Low: <1,000 packets, <100KB/s bandwidth

6. MAKE EACH ANALYSIS UNIQUE:
   - Reference the specific node ID being analyzed
   - Include unique NetFlow metrics for that specific node
   - Provide node-specific reasoning based on its exact traffic patterns
   - Do NOT use generic phrases like "high traffic volume" or "suspicious patterns"

Conduct comprehensive NetFlow-based investigation and return a detailed JSON forensic report.""")
        ])
        
        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke({
                "orchestrator_analysis": json.dumps(orchestrator_analysis, indent=2),
                "detector_findings": json.dumps({
                    "decision": detector_decision.decision if detector_decision else "no_detection",
                    "confidence": detector_decision.confidence if detector_decision else 0,
                    "reasoning": detector_decision.reasoning if detector_decision else "",
                    "threats_detected": detector_metadata.get("threats_detected", []),
                    "heavy_hitters": detector_metadata.get("heavy_hitters", []),
                    "graph_anomalies": detector_metadata.get("graph_anomalies", []),
                    "flagged_ips": detector_metadata.get("flagged_ips", []),
                    "overall_assessment": detector_metadata.get("overall_assessment", {})
                }, indent=2),
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
            
            investigator_data = json.loads(llm_output)
            
            # Extract key fields
            investigations = investigator_data.get("investigations", [])
            attack_campaigns = investigator_data.get("attack_campaigns", [])
            node_forensics = investigator_data.get("node_forensics", [])
            edge_forensics = investigator_data.get("edge_forensics", [])
            overall_assessment = investigator_data.get("overall_assessment", {})
            executive_summary = investigator_data.get("executive_summary", "Investigation complete")
            technical_summary = investigator_data.get("technical_summary", "Technical analysis complete")
            
            # Determine decision based on investigation findings
            if overall_assessment.get("requires_immediate_action"):
                decision = "critical_threats_confirmed"
            elif overall_assessment.get("attack_in_progress"):
                decision = "active_attack_confirmed"
            elif overall_assessment.get("coordinated_attack"):
                decision = "coordinated_campaign_detected"
            elif overall_assessment.get("total_investigations", 0) > 0:
                decision = "threats_investigated"
            else:
                decision = "no_actionable_threats"
            
            # Calculate overall confidence from investigations
            if investigations:
                avg_confidence = sum(inv.get("confidence", 0) for inv in investigations) / len(investigations)
                confidence = round(avg_confidence, 2)
            else:
                confidence = 0.9  # High confidence when no threats found
            
        except Exception as e:
            # Fallback if LLM fails
            print(f"LLM investigation failed: {e}. Using fallback.")
            investigations = []
            attack_campaigns = []
            node_forensics = []
            edge_forensics = []
            overall_assessment = {
                "total_investigations": 0,
                "critical_investigations": 0,
                "coordinated_attack": False,
                "attack_in_progress": False,
                "recommended_priority": "low",
                "requires_immediate_action": False
            }
            executive_summary = f"Investigator agent encountered an error: {str(e)}"
            technical_summary = "Investigation failed due to technical error"
            decision = "investigation_error"
            confidence = 0.3
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000

        # Build intermediate steps
        intermediate_steps = [
            {"step": "Received Detector findings", "details": f"{len(detector_metadata.get('threats_detected', []))} threats flagged"},
            {"step": "Analyzed attack patterns", "details": f"{len(investigations)} investigations conducted"},
            {"step": "Performed forensic analysis", "details": f"{len(node_forensics)} nodes analyzed"},
            {"step": "Generated assessment", "details": f"Priority: {overall_assessment.get('recommended_priority', 'unknown')}"}
        ]

        # Create investigator decision with transparency
        state["investigator_decision"] = AgentDecision(
            agent_id="investigator",
            decision=decision,
            confidence=confidence,
            reasoning=executive_summary,
            metadata={
                "investigations": investigations,
                "attack_campaigns": attack_campaigns,
                "node_forensics": node_forensics,
                "edge_forensics": edge_forensics,
                "overall_assessment": overall_assessment,
                "executive_summary": executive_summary,
                "technical_summary": technical_summary,
                "detector_input": {
                    "threats_count": len(detector_metadata.get("threats_detected", [])),
                    "flagged_ips_count": len(detector_metadata.get("flagged_ips", []))
                },
                "llm_model": config.fast_model,
                "llm_powered": True
            },
            llm_prompt=f"Deep investigation of {len(detector_metadata.get('threats_detected', []))} flagged threats",
            llm_response=technical_summary,
            intermediate_steps=intermediate_steps,
            processing_time_ms=processing_time
        )
        
        # Update state
        state["current_step"] = "investigator"
        state["completed_agents"] = state.get("completed_agents", []) + ["investigator"]
        
        return state
    
    async def _monitor_node(self, state: AgentState) -> AgentState:
        """
        Monitor agent node - LLM-powered monitoring and log summarization using fast model

        Responsibilities:
        1. Translate logs and events into plain-English summaries using AI
        2. Highlight trends, critical nodes, and abnormal traffic patterns
        3. Generate structured logs for frontend visualization
        4. Track network health metrics over time
        """
        import time
        start_time = time.time()

        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Initialize fast model for monitoring
        llm = ChatOpenAI(
            model=config.fast_model,
            temperature=config.fast_model_temperature,  # Balanced temperature for summarization
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
```
  "timestamp": "ISO 8601 timestamp"
  "level": "INFO" | "WARNING" | "CRITICAL"
  "category": "system" | "threat_detection" | "ddos" | "apt" | "attack_pattern" | "node_status" | "health"
  "message": "Human-readable message with emojis"
  "details": {{}}
```

Dashboard structure:
```
  "network_health": {{"score": 0-100, "status": "...", "threat_level": "..."}}
  "traffic_statistics": {{"total_nodes": int, "total_edges": int, ...}}
  "attack_metrics": {{"total_attacks": int, "attack_types": {{}}, "ddos_detected": bool, "apt_detected": bool}}
  "critical_nodes": {{"most_targeted": [...], "most_attacking": [...], "attacked_list": [...]}}
  "trends": {{"threat_increasing": bool, "primary_attack_vector": str, "health_trend": "..."}}
```

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
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000

        # Build intermediate steps
        intermediate_steps = [
            {"step": "Analyzed network health", "details": f"Status: {network_status}, Score: {health_score}"},
            {"step": "Generated monitoring logs", "details": f"{len(logs)} log entries created"},
            {"step": "Assessed trends", "details": f"Health assessment complete"}
        ]

        # Create monitor decision with transparency
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
            },
            llm_prompt=f"Monitoring network with {len(input_data.get('nodes', []))} nodes",
            llm_response=summary,
            intermediate_steps=intermediate_steps,
            processing_time_ms=processing_time
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
        """
        Judge agent node - LLM-powered decision arbitration using fast model

        Responsibilities:
        1. Aggregate findings from Detector, Investigator, and Monitor
        2. Evaluate conflicting information and make final decisions
        3. Assign confidence and risk scores
        4. Provide reasoning in plain English for security teams
        """
        import time
        start_time = time.time()

        input_data = state["input_data"]
        context = state.get("context", {})
        
        # Get decisions from all previous agents
        orchestrator_decision = state.get("orchestrator_decision")
        detector_decision = state.get("detector_decision")
        investigator_decision = state.get("investigator_decision")
        monitor_decision = state.get("monitor_decision")
        
        # Initialize GPT-4o-mini for faster final decision making
        llm = ChatOpenAI(
            model=config.fast_model,
            temperature=config.fast_model_temperature,  # Balanced temperature for speed and precision
            api_key=config.openai_api_key
        )
        
        # Create judge prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI-powered security judge responsible for making final decisions in cybersecurity incidents based on NetFlow data analysis.

Your role:
- Aggregate findings from Detector, Investigator, and Monitor agents based on NetFlow evidence
- Resolve conflicts between agent recommendations using NetFlow data validation
- Make final decisions on threat severity and required actions based on NetFlow metrics
- Provide clear reasoning for security teams referencing specific NetFlow data points
- Determine if automated mitigation should be applied based on NetFlow attack patterns

You will receive:
1. Orchestrator's initial threat assessment based on NetFlow data
2. Detector's threat findings and flagged entities from NetFlow analysis
3. Investigator's forensic analysis and attack details using NetFlow records
4. Monitor's health assessment and trends from NetFlow monitoring

CRITICAL: Always base your decisions on NetFlow evidence:
- Packet counts (d_pkts) indicating attack volume and severity
- Protocol analysis (TCP/UDP/ICMP) showing attack vectors
- IP address patterns revealing attack sources and targets
- Port analysis showing attack methodologies
- Bandwidth/octet counts showing attack scale and impact

You must generate a JSON response with:
{{
  "final_assessment": {{
    "threat_level": "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "confidence": 0.0-1.0,
    "requires_immediate_action": bool,
    "automated_response_approved": bool,
    "human_intervention_required": bool
  }},
  "decision_summary": {{
    "primary_threat": "Description of main threat",
    "attack_in_progress": bool,
    "coordinated_campaign": bool,
    "business_impact": "low" | "medium" | "high" | "critical"
  }},
  "conflict_resolution": [
    {{
      "conflict": "Description of conflicting agent findings",
      "resolution": "How the conflict was resolved",
      "confidence": 0.0-1.0
    }}
  ],
  "action_recommendations": {{
    "immediate_actions": ["Action 1", "Action 2"],
    "investigation_actions": ["Action 1", "Action 2"],
    "monitoring_actions": ["Action 1", "Action 2"],
    "escalation_required": bool
  }},
  "risk_scoring": {{
    "overall_risk_score": 0-100,
    "data_exposure_risk": 0-100,
    "service_disruption_risk": 0-100,
    "reputation_risk": 0-100
  }},
  "reasoning": "Plain-English explanation of the decision process based on NetFlow evidence analysis",
  "netflow_evidence_summary": {{
    "packet_volume_analysis": "Analysis of packet counts supporting the decision",
    "protocol_pattern_analysis": "Protocol usage patterns indicating attack type",
    "ip_traffic_analysis": "IP address patterns showing attack sources/targets",
    "severity_justification": "How NetFlow metrics justify the threat severity level"
  }},
  "next_steps": "What should happen next based on NetFlow analysis"
}}

Decision guidelines - BE SPECIFIC WITH NETFLOW EVIDENCE:
- ALWAYS reference exact NetFlow metrics in your reasoning
- Extract specific packet counts, protocols, IPs, and ports from the data
- Calculate attack intensity ratios and bandwidth consumption
- Match attack patterns to specific CIC dataset attack types
- Provide quantitative severity justification using NetFlow metrics
- Consider confidence levels from all agents based on NetFlow analysis
- Prioritize high-confidence NetFlow findings over low-confidence ones
- Look for consensus between Detector and Investigator on NetFlow patterns
- Consider Monitor's health trends and NetFlow patterns
- Err on the side of caution for critical NetFlow-based threats
- Provide actionable recommendations based on NetFlow evidence
- Explain reasoning with specific NetFlow data points for human review
- Use exact NetFlow terminology (d_pkts, d_octets, srcaddr, dstaddr, prot)"""),
            ("human", """Make final security decisions based on NetFlow data analysis and agent findings:

ORCHESTRATOR ANALYSIS (NetFlow-based):
{orchestrator_analysis}

DETECTOR FINDINGS (NetFlow analysis):
{detector_findings}

INVESTIGATOR FINDINGS (NetFlow forensics):
{investigator_findings}

MONITOR FINDINGS (NetFlow monitoring):
{monitor_findings}

NETFLOW DATA (Raw network flows):
Nodes: {nodes}
Edges: {edges}

CRITICAL REQUIREMENTS - PROVIDE SPECIFIC NETFLOW ANALYSIS:

MANDATORY: You MUST extract and reference EXACT NetFlow metrics from the provided data. Do NOT use generic language.

1. EXTRACT AND REFERENCE EXACT NETFLOW METRICS:
   - "UDP protocol (17) with [EXACT PACKET COUNT] packets from source IP [EXACT SOURCE IP] targeting port [EXACT PORT]"
   - "Packet volume exceeds baseline by [EXACT PERCENTAGE]% ([EXACT COUNT] vs 1000 normal packets)"
   - "Bandwidth consumption of [EXACT MB/s]MB/s indicates high-volume attack"
   - "Attack pattern matches CIC [EXACT ATTACK TYPE] signature with [EXACT CONFIDENCE]% confidence"

2. CALCULATE AND EXPLAIN SEVERITY METRICS:
   - Critical: >10,000 packets, >1MB/s bandwidth, coordinated attack IPs
   - High: 5,000-10,000 packets, 500KB-1MB/s bandwidth
   - Medium: 1,000-5,000 packets, 100-500KB/s bandwidth
   - Low: <1,000 packets, <100KB/s bandwidth

3. PROVIDE QUANTITATIVE REASONING WITH EXACT NUMBERS:
   - "NetFlow analysis reveals [EXACT PROTOCOL] with [EXACT PACKET COUNT] packets from [EXACT SOURCE IP] targeting [EXACT PORT]"
   - "Packet volume exceeds normal baseline by [EXACT PERCENTAGE]%"
   - "Bandwidth consumption of [EXACT MB/s]MB/s indicates [EXACT ATTACK TYPE]"
   - "Investigator confirmed this pattern matches known [EXACT CIC ATTACK TYPE] signatures"

4. REFERENCE SPECIFIC CIC DATASET ATTACK TYPES:
   - DrDoS_DNS, SYN-Flood, UDP-Flood, Port-Scan, etc.
   - Match exact NetFlow patterns to known attack signatures

5. MAKE EACH ANALYSIS UNIQUE FOR THE SPECIFIC NODE:
   - Reference the specific node ID being analyzed
   - Include unique NetFlow metrics for that specific node
   - Provide node-specific reasoning based on its exact traffic patterns
   - Do NOT use generic phrases like "high traffic volume" or "suspicious patterns"

Provide final judgment with SPECIFIC NetFlow data points and quantitative analysis.""")
        ])
        
        # Prepare agent findings for LLM
        agent_findings = {
            "orchestrator": {
                "decision": orchestrator_decision.decision if orchestrator_decision else "no_data",
                "confidence": orchestrator_decision.confidence if orchestrator_decision else 0,
                "reasoning": orchestrator_decision.reasoning if orchestrator_decision else "",
                "metadata": orchestrator_decision.metadata if orchestrator_decision else {}
            },
            "detector": {
                "decision": detector_decision.decision if detector_decision else "no_data",
                "confidence": detector_decision.confidence if detector_decision else 0,
                "reasoning": detector_decision.reasoning if detector_decision else "",
                "metadata": detector_decision.metadata if detector_decision else {}
            },
            "investigator": {
                "decision": investigator_decision.decision if investigator_decision else "no_data",
                "confidence": investigator_decision.confidence if investigator_decision else 0,
                "reasoning": investigator_decision.reasoning if investigator_decision else "",
                "metadata": investigator_decision.metadata if investigator_decision else {}
            },
            "monitor": {
                "decision": monitor_decision.decision if monitor_decision else "no_data",
                "confidence": monitor_decision.confidence if monitor_decision else 0,
                "reasoning": monitor_decision.reasoning if monitor_decision else "",
                "metadata": monitor_decision.metadata if monitor_decision else {}
            }
        }
        
        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke({
                "orchestrator_analysis": json.dumps(context.get("orchestrator_analysis", {}), indent=2),
                "detector_findings": json.dumps(agent_findings["detector"], indent=2),
                "investigator_findings": json.dumps(agent_findings["investigator"], indent=2),
                "monitor_findings": json.dumps(agent_findings["monitor"], indent=2),
                "nodes": json.dumps(input_data.get("nodes", []), indent=2),
                "edges": json.dumps(input_data.get("edges", []), indent=2)
            })
            
            # Parse LLM response
            llm_output = response.content
            
            # Extract JSON from response
            if "```json" in llm_output:
                llm_output = llm_output.split("```json")[1].split("```")[0].strip()
            elif "```" in llm_output:
                llm_output = llm_output.split("```")[1].split("```")[0].strip()
            
            judge_data = json.loads(llm_output)
            
            # Extract key fields
            final_assessment = judge_data.get("final_assessment", {})
            decision_summary = judge_data.get("decision_summary", {})
            conflict_resolution = judge_data.get("conflict_resolution", [])
            action_recommendations = judge_data.get("action_recommendations", {})
            risk_scoring = judge_data.get("risk_scoring", {})
            reasoning = judge_data.get("reasoning", "Judgment complete")
            next_steps = judge_data.get("next_steps", "Continue monitoring")
            
            # Determine decision
            threat_level = final_assessment.get("threat_level", "NONE")
            if threat_level == "CRITICAL":
                decision = "critical_threat_confirmed"
            elif threat_level == "HIGH":
                decision = "high_threat_confirmed"
            elif threat_level == "MEDIUM":
                decision = "medium_threat_confirmed"
            elif threat_level == "LOW":
                decision = "low_threat_confirmed"
            else:
                decision = "no_threat_detected"
            
            confidence = final_assessment.get("confidence", 0.8)
            
        except Exception as e:
            # Fallback if LLM fails
            print(f"Judge LLM failed: {e}. Using fallback.")
            final_assessment = {"threat_level": "NONE", "confidence": 0.5}
            decision_summary = {"primary_threat": "Analysis failed"}
            conflict_resolution = []
            action_recommendations = {"immediate_actions": []}
            risk_scoring = {"overall_risk_score": 0}
            reasoning = f"Judge agent encountered an error: {str(e)}"
            next_steps = "Manual review required"
            decision = "judgment_error"
            confidence = 0.3
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000

        # Build intermediate steps
        intermediate_steps = [
            {"step": "Received input from all agents", "details": f"Orchestrator, Detector, Investigator, Monitor"},
            {"step": "Aggregated findings", "details": f"Threat level: {final_assessment.get('threat_level', 'UNKNOWN')}"},
            {"step": "Resolved conflicts", "details": f"{len(conflict_resolution)} conflicts addressed"},
            {"step": "Made final decision", "details": f"Confidence: {confidence}"}
        ]

        # Create judge decision with transparency
        state["judge_decision"] = AgentDecision(
            agent_id="judge",
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "final_assessment": final_assessment,
                "decision_summary": decision_summary,
                "conflict_resolution": conflict_resolution,
                "action_recommendations": action_recommendations,
                "risk_scoring": risk_scoring,
                "next_steps": next_steps,
                "llm_model": config.fast_model,
                "llm_powered": True
            },
            llm_prompt=f"Making final decision based on {len([d for d in [orchestrator_decision, detector_decision, investigator_decision, monitor_decision] if d])} agent inputs",
            llm_response=reasoning,
            intermediate_steps=intermediate_steps,
            processing_time_ms=processing_time
        )
        
        # Set final decision in judge node (before routing)
        state["final_decision"] = state["judge_decision"]
        state["current_step"] = "judge"
        state["completed_agents"] = state.get("completed_agents", []) + ["judge"]
        
        return state
    
    async def _mitigator_node(self, state: AgentState) -> AgentState:
        """
        Mitigator agent node - LLM-powered automated response using fast model

        Responsibilities:
        1. Execute mitigation actions based on Judge's decisions
        2. Apply automated responses (block IPs, throttle traffic, etc.)
        3. Track effectiveness of mitigation actions
        4. Provide detailed action logs and results
        """
        import time
        start_time = time.time()

        input_data = state["input_data"]
        context = state.get("context", {})
        
        # Get Judge's decision
        judge_decision = state.get("judge_decision")
        judge_metadata = judge_decision.metadata if judge_decision else {}
        
        # Initialize fast model for mitigation planning
        llm = ChatOpenAI(
            model=config.fast_model,
            temperature=config.fast_model_temperature,  # Low temperature for consistent actions
            api_key=config.openai_api_key
        )
        
        # Create mitigator prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an elite AI-powered cybersecurity mitigator responsible for generating ACTIONABLE, PRODUCTION-READY mitigation strategies with SPECIFIC commands and code.

Your role:
- Generate intelligent, executable mitigation actions based on Judge's decisions
- Provide SPECIFIC recommendations tailored to the exact attack detected
- Create ready-to-deploy commands: A10 Thunder aXAPI, Python scripts, firewall rules
- Output detailed incident reports for dev teams
- Ensure all actions are justified, safe, reversible, and include exact IP addresses/ports from the data

CRITICAL: You must analyze the attack data and provide SPECIFIC, CUSTOMIZED actions for these 4 button types:
1. 🚫 BLOCK IP - Complete IP blocking with exact commands
2. ⏳ THROTTLE TRAFFIC - Rate limiting with specific thresholds
3. 📧 NOTIFY DEV TEAM - Detailed incident report
4. 👁️ CONTINUE MONITORING - Enhanced monitoring rules

You will receive:
1. Judge's final assessment and action recommendations
2. Network nodes and edges with SPECIFIC attack details
3. Previous agent findings (Detector threats, Investigator analysis)

You must generate a JSON response with:
{{
  "recommended_action": "block_ip" | "throttle_traffic" | "notify_dev" | "monitor_only",
  "mitigation_actions": [
    {{
      "action_id": "mitigation_001",
      "action_type": "block_ip" | "throttle_traffic" | "notify_dev" | "monitor_only",
      "action_label": "🚫 Block IP 192.168.1.50",
      "target": "SPECIFIC IP address or node_id from the data",
      "severity": "critical",
      "priority": 1,
      "automated": true,
      "success_probability": 0.92,
      "justification": "SPECIFIC reason based on the EXACT attack detected (e.g., 'Source IP 192.168.1.50 launched 15,000 UDP packets in DDoS-DNS attack')",
      "technical_details": {{
        "a10_axapi_command": "curl -X POST https://thunder.a10networks.com/axapi/v3/slb/virtual-server/block-ip -d '{{\\"ip\\":\\"EXACT_IP\\",\\"duration\\":3600}}'",
        "firewall_rule": "iptables -A INPUT -s EXACT_IP -j DROP",
        "python_script": "import requests\\nrequests.post('http://firewall/api/block', json={{\\'ip\\': \\'EXACT_IP\\'}})",
        "bash_command": "sudo iptables -A INPUT -s EXACT_IP -j DROP && sudo iptables-save"
      }},
      "estimated_impact": "95% threat reduction, blocks all traffic from malicious source",
      "rollback_plan": "sudo iptables -D INPUT -s EXACT_IP -j DROP",
      "false_positive_risk": "5%"
    }}
  ],
  "action_buttons": {{
    "block_ip": {{
      "enabled": true,
      "label": "🚫 Block IP 192.168.1.50",
      "description": "Block EXACT_IP which sent 15,000 DDoS packets",
      "command_preview": "iptables -A INPUT -s EXACT_IP -j DROP",
      "estimated_effectiveness": "95% threat reduction"
    }},
    "throttle_traffic": {{
      "enabled": true,
      "label": "⏳ Throttle to 1000 pps",
      "description": "Rate limit EXACT_IP to 1000 packets/sec",
      "command_preview": "tc qdisc add dev eth0 root handle 1: htb default 10",
      "estimated_effectiveness": "70% threat reduction"
    }},
    "notify_dev": {{
      "enabled": true,
      "label": "📧 Send Incident Report",
      "description": "Notify team of DDoS attack from EXACT_IP",
      "command_preview": "Incident Report with forensic details",
      "estimated_effectiveness": "Human review required"
    }},
    "monitor_only": {{
      "enabled": true,
      "label": "👁️ Enhanced Monitoring",
      "description": "Watch EXACT_IP for continued suspicious activity",
      "command_preview": "tcpdump -i eth0 src EXACT_IP",
      "estimated_effectiveness": "Baseline observation"
    }}
  }},
  "incident_report": {{
    "attack_summary": "DDoS-DNS attack detected from source IP EXACT_IP targeting port 53 with 15,000 UDP packets. Attack intensity exceeds baseline by 1500%.",
    "technical_analysis": "Protocol 17 (UDP) with EXACT packet count from source EXACT_IP. Matches CIC DDoS-DNS signature with 95% confidence.",
    "recommended_actions": ["Immediately block source IP EXACT_IP", "Enable rate limiting on DNS port 53", "Monitor for additional attack vectors"],
    "affected_systems": ["EXACT target IPs", "DNS servers on port 53"],
    "forensic_evidence": ["Packet count: EXACT_NUMBER", "Protocol: UDP (17)", "Target port: 53", "Duration: EXACT_TIME"]
  }},
  "a10_integration": {{
    "axapi_endpoint": "/axapi/v3/slb/virtual-server/EXACT_IP/action/block",
    "payload": "{{\\"ip\\": \\"EXACT_IP\\", \\"duration\\": 3600, \\"reason\\": \\"DDoS attack detected\\"}}",
    "curl_command": "curl -X POST -H 'Content-Type: application/json' https://thunder.a10networks.com/axapi/v3/slb/virtual-server/block -d '{{\\"ip\\":\\"EXACT_IP\\",\\"duration\\":3600}}'"
  }},
  "effectiveness_prediction": {{
    "threat_reduction": 95,
    "false_positive_risk": 5,
    "business_impact": "low",
    "estimated_resolution_time": "immediate"
  }},
  "summary": "Recommend immediately blocking source IP EXACT_IP responsible for DDoS-DNS attack with 15,000 packets. Action will stop 95% of malicious traffic.",
  "next_steps": "After blocking, monitor for attack migration to new IPs. Review logs in 1 hour to confirm effectiveness."
}}

MANDATORY ACTION GENERATION RULES:
1. ALWAYS extract EXACT IP addresses, ports, packet counts from the provided nodes/edges data
2. NEVER use placeholder IPs like "192.168.1.x" - use ACTUAL IPs from the data
3. Generate SPECIFIC commands with real syntax (iptables, A10 aXAPI, Python)
4. Calculate realistic effectiveness percentages based on attack severity
5. Provide UNIQUE justifications for each action based on specific attack patterns detected
6. Include exact packet counts, protocol numbers, and attack types from Detector/Investigator findings
7. Make incident reports detailed enough for human analysts to act on
8. Enable ALL 4 action buttons with specific, different strategies
9. Use actual CIC DDoS attack types from the data (DrDoS_DNS, UDP-Flood, SYN-Flood, etc.)"""),
            ("human", """Execute mitigation actions based on the Judge's decision:

JUDGE'S FINAL ASSESSMENT:
{judge_assessment}

ACTION RECOMMENDATIONS:
{action_recommendations}

NETWORK DATA:
{nodes}
{edges}

Execute appropriate mitigation actions and return detailed results.""")
        ])
        
        # Invoke LLM
        try:
            chain = prompt | llm
            response = await chain.ainvoke({
                "judge_assessment": json.dumps(judge_metadata.get("final_assessment", {}), indent=2),
                "action_recommendations": json.dumps(judge_metadata.get("action_recommendations", {}), indent=2),
                "nodes": json.dumps(input_data.get("nodes", []), indent=2),
                "edges": json.dumps(input_data.get("edges", []), indent=2)
            })
            
            # Parse LLM response
            llm_output = response.content
            
            # Extract JSON from response
            if "```json" in llm_output:
                llm_output = llm_output.split("```json")[1].split("```")[0].strip()
            elif "```" in llm_output:
                llm_output = llm_output.split("```")[1].split("```")[0].strip()
            
            mitigator_data = json.loads(llm_output)
            
            # Extract key fields
            mitigation_actions = mitigator_data.get("mitigation_actions", [])
            action_timeline = mitigator_data.get("action_timeline", [])
            effectiveness_prediction = mitigator_data.get("effectiveness_prediction", {})
            monitoring_plan = mitigator_data.get("monitoring_plan", {})
            escalation_triggers = mitigator_data.get("escalation_triggers", [])
            summary = mitigator_data.get("summary", "Mitigation actions executed")
            next_review = mitigator_data.get("next_review", "Monitor and review")
            
            # Determine decision based on actions
            if not mitigation_actions or all(a.get("action_type") == "none" for a in mitigation_actions):
                decision = "no_mitigation_required"
            elif any(a.get("severity") == "critical" for a in mitigation_actions):
                decision = "critical_mitigation_executed"
            elif any(a.get("automated") for a in mitigation_actions):
                decision = "automated_mitigation_executed"
            else:
                decision = "mitigation_planned"
            
            # Calculate confidence based on action success probability
            if mitigation_actions:
                avg_success = sum(a.get("success_probability", 0.5) for a in mitigation_actions) / len(mitigation_actions)
                confidence = round(avg_success, 2)
            else:
                confidence = 0.9  # High confidence when no action needed
            
        except Exception as e:
            # Fallback if LLM fails
            print(f"Mitigator LLM failed: {e}. Using fallback.")
            mitigation_actions = [{"action_type": "none", "reason": "Mitigation failed due to error"}]
            action_timeline = []
            effectiveness_prediction = {"threat_reduction": 0}
            monitoring_plan = {}
            escalation_triggers = []
            summary = f"Mitigator agent encountered an error: {str(e)}"
            next_review = "Manual intervention required"
            decision = "mitigation_error"
            confidence = 0.3
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000

        # Build intermediate steps
        intermediate_steps = [
            {"step": "Received Judge's decision", "details": f"Actions approved: {len(mitigation_actions)}"},
            {"step": "Planned mitigation actions", "details": f"{len([a for a in mitigation_actions if a.get('automated', False)])} automated actions"},
            {"step": "Assessed effectiveness", "details": f"Predicted threat reduction: {effectiveness_prediction.get('threat_reduction', 0)}%"}
        ]

        # Create mitigator decision with transparency
        state["mitigator_decision"] = AgentDecision(
            agent_id="mitigator",
            decision=decision,
            confidence=confidence,
            reasoning=summary,
            metadata={
                "mitigation_actions": mitigation_actions,
                "action_timeline": action_timeline,
                "effectiveness_prediction": effectiveness_prediction,
                "monitoring_plan": monitoring_plan,
                "escalation_triggers": escalation_triggers,
                "next_review": next_review,
                "llm_model": config.fast_model,
                "llm_powered": True
            },
            llm_prompt=f"Planning mitigation for {len(mitigation_actions)} recommended actions",
            llm_response=summary,
            intermediate_steps=intermediate_steps,
            processing_time_ms=processing_time
        )

        # DON'T override final decision - Judge has already set it
        # Mitigator only executes what Judge decided
        state["current_step"] = "mitigator"
        state["completed_agents"] = state.get("completed_agents", []) + ["mitigator"]

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

    async def run_streaming(self, input_data: Dict[str, Any], context: Dict[str, Any] = None):
        """
        Run the agent workflow and stream updates after each agent completes

        This generator yields agent interaction updates in real-time
        """
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

        # Run the workflow with streaming using astream
        config = {"configurable": {"thread_id": f"agent_session_streaming_{id(initial_state)}"}}

        async for chunk in self.graph.astream(initial_state, config=config):
            # Each chunk contains the state after a node execution
            # The chunk is a dict with node name as key and state as value
            for node_name, state in chunk.items():
                if not isinstance(state, dict):
                    continue

                # Get the decision for the node that just completed
                decision_key = f"{node_name}_decision"
                decision = state.get(decision_key)

                if decision:
                    # Create agent interaction for this completed agent
                    interaction = self._create_agent_interaction(node_name, decision)

                    yield {
                        "type": "agent_update",
                        "agent": node_name,
                        "interaction": interaction,
                        "completed_agents": state.get("completed_agents", []),
                        "current_step": state.get("current_step", node_name)
                    }

        # After workflow completes, send final decision
        # Note: We need to track the final state from the last chunk
        # The final_decision is set by the Judge node
        # We'll send it as part of the judge's agent_update instead

    def _create_agent_interaction(self, agent_name: str, decision) -> Dict[str, Any]:
        """Helper to create agent interaction dict from decision"""
        # Map node names to display names
        display_names = {
            "orchestrator": "Orchestrator",
            "detector": "Detector",
            "investigator": "Investigator",
            "monitor": "Monitor",
            "judge": "Judge",
            "mitigator": "Mitigator"
        }

        # Map node names to actions
        actions = {
            "orchestrator": "Network traffic analysis and routing",
            "detector": "Threat detection and analysis",
            "investigator": "Deep forensic investigation",
            "monitor": "Network health monitoring",
            "judge": "Final security decision",
            "mitigator": "Mitigation actions execution"
        }

        return {
            "agent": display_names.get(agent_name, agent_name.title()),
            "timestamp": decision.timestamp or datetime.now().isoformat(),
            "action": actions.get(agent_name, "Processing"),
            "summary": decision.reasoning,
            "confidence": decision.confidence,
            "status": "completed",
            "details": self._extract_agent_details(agent_name, decision),
            "llm_prompt": decision.llm_prompt,
            "llm_response": decision.llm_response,
            "intermediate_steps": decision.intermediate_steps,
            "processing_time_ms": decision.processing_time_ms
        }

    def _extract_agent_details(self, agent_name: str, decision) -> Dict[str, Any]:
        """Extract relevant details from agent decision metadata"""
        metadata = decision.metadata or {}

        if agent_name == "orchestrator":
            return {
                "threat_level": metadata.get("threat_level", "UNKNOWN"),
                "workflow_mode": metadata.get("workflow_mode", "unknown"),
                "total_attacks": metadata.get("statistics", {}).get("attack_count", 0)
            }
        elif agent_name == "detector":
            return {
                "threats_detected": len(metadata.get("threats_detected", [])),
                "flagged_ips": len(metadata.get("flagged_ips", [])),
                "heavy_hitters": len(metadata.get("heavy_hitters", [])),
                "recommended_action": metadata.get("overall_assessment", {}).get("recommended_action", "none")
            }
        elif agent_name == "investigator":
            return {
                "investigations_count": len(metadata.get("investigations", [])),
                "attack_campaigns": len(metadata.get("attack_campaigns", [])),
                "requires_immediate_action": metadata.get("overall_assessment", {}).get("requires_immediate_action", False),
                "coordinated_attack": metadata.get("overall_assessment", {}).get("coordinated_attack", False)
            }
        elif agent_name == "monitor":
            return {
                "network_status": metadata.get("network_status", "unknown"),
                "health_score": metadata.get("health_score", 50),
                "logs_generated": len(metadata.get("logs", []))
            }
        elif agent_name == "judge":
            return {
                "final_threat_level": metadata.get("final_assessment", {}).get("threat_level", "UNKNOWN"),
                "requires_immediate_action": metadata.get("final_assessment", {}).get("requires_immediate_action", False),
                "automated_response_approved": metadata.get("final_assessment", {}).get("automated_response_approved", False),
                "human_intervention_required": metadata.get("final_assessment", {}).get("human_intervention_required", False)
            }
        elif agent_name == "mitigator":
            actions = metadata.get("mitigation_actions", [])
            return {
                "actions_executed": len(actions),
                "automated_actions": len([a for a in actions if a.get("automated", False)]),
                "effectiveness_prediction": metadata.get("effectiveness_prediction", {}).get("threat_reduction", 0)
            }

        return {}
    
    def get_agent_interactions_summary(self, state: AgentState) -> Dict[str, Any]:
        """Generate a summary of agent interactions for UI display"""
        # Defensive check: ensure state is a dict-like object
        if not isinstance(state, dict):
            print(f"⚠️ WARNING: state is not a dict, it's a {type(state)}")
            return {
                "total_interactions": 0,
                "workflow_status": "error",
                "completed_agents": [],
                "interactions": [],
                "final_decision": {
                    "decision": "error",
                    "confidence": 0,
                    "reasoning": "Invalid state object received"
                }
            }

        interactions = []

        # Orchestrator interaction
        if state.get("orchestrator_decision"):
            decision = state["orchestrator_decision"]
            interactions.append({
                "agent": "Orchestrator",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Network traffic analysis and routing",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "threat_level": decision.metadata.get("threat_level", "UNKNOWN"),
                    "workflow_mode": decision.metadata.get("workflow_mode", "unknown"),
                    "total_attacks": decision.metadata.get("statistics", {}).get("attack_count", 0)
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })
        
        # Detector interaction
        if state.get("detector_decision"):
            decision = state["detector_decision"]
            threats_count = len(decision.metadata.get("threats_detected", []))
            interactions.append({
                "agent": "Detector",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Threat detection and analysis",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "threats_detected": threats_count,
                    "flagged_ips": len(decision.metadata.get("flagged_ips", [])),
                    "heavy_hitters": len(decision.metadata.get("heavy_hitters", [])),
                    "recommended_action": decision.metadata.get("overall_assessment", {}).get("recommended_action", "none")
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })
        
        # Investigator interaction
        if state.get("investigator_decision"):
            decision = state["investigator_decision"]
            investigations_count = len(decision.metadata.get("investigations", []))
            interactions.append({
                "agent": "Investigator",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Deep forensic investigation",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "investigations_count": investigations_count,
                    "attack_campaigns": len(decision.metadata.get("attack_campaigns", [])),
                    "requires_immediate_action": decision.metadata.get("overall_assessment", {}).get("requires_immediate_action", False),
                    "coordinated_attack": decision.metadata.get("overall_assessment", {}).get("coordinated_attack", False)
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })
        
        # Monitor interaction
        if state.get("monitor_decision"):
            decision = state["monitor_decision"]
            interactions.append({
                "agent": "Monitor",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Network health monitoring",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "network_status": decision.metadata.get("network_status", "unknown"),
                    "health_score": decision.metadata.get("health_score", 50),
                    "logs_generated": len(decision.metadata.get("logs", []))
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })

        # Judge interaction
        if state.get("judge_decision"):
            decision = state["judge_decision"]
            interactions.append({
                "agent": "Judge",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Final security decision",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "final_threat_level": decision.metadata.get("final_assessment", {}).get("threat_level", "UNKNOWN"),
                    "requires_immediate_action": decision.metadata.get("final_assessment", {}).get("requires_immediate_action", False),
                    "automated_response_approved": decision.metadata.get("final_assessment", {}).get("automated_response_approved", False),
                    "human_intervention_required": decision.metadata.get("final_assessment", {}).get("human_intervention_required", False)
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })

        # Mitigator interaction
        if state.get("mitigator_decision"):
            decision = state["mitigator_decision"]
            actions_count = len(decision.metadata.get("mitigation_actions", []))
            interactions.append({
                "agent": "Mitigator",
                "timestamp": decision.timestamp or datetime.now().isoformat(),
                "action": "Mitigation actions execution",
                "summary": decision.reasoning,
                "confidence": decision.confidence,
                "status": "completed",
                "details": {
                    "actions_executed": actions_count,
                    "automated_actions": len([a for a in decision.metadata.get("mitigation_actions", []) if a.get("automated", False)]),
                    "effectiveness_prediction": decision.metadata.get("effectiveness_prediction", {}).get("threat_reduction", 0)
                },
                "llm_prompt": decision.llm_prompt,
                "llm_response": decision.llm_response,
                "intermediate_steps": decision.intermediate_steps,
                "processing_time_ms": decision.processing_time_ms
            })
        
        # Get final decision (it's an AgentDecision object, not a dict)
        final_decision = state.get("final_decision")

        return {
            "total_interactions": len(interactions),
            "workflow_status": state.get("current_step", "unknown"),
            "completed_agents": state.get("completed_agents", []),
            "interactions": interactions,
            "final_decision": {
                "decision": final_decision.decision if final_decision else "pending",
                "confidence": final_decision.confidence if final_decision else 0,
                "reasoning": final_decision.reasoning if final_decision else "No final decision yet"
            }
        }
