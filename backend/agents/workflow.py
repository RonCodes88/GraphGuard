"""
LangGraph workflow for AI agent system
"""
from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from operator import add

from agents.base import AgentInput, AgentOutput, AgentDecision


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
        """Detector agent node - placeholder for now"""
        # TODO: Implement detector logic
        state["detector_decision"] = AgentDecision(
            agent_id="detector",
            decision="no_threat_detected",
            confidence=0.8,
            reasoning="No suspicious patterns detected"
        )
        state["current_step"] = "detector"
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
        Monitor agent node - Rule-based monitoring and log summarization
        
        Responsibilities:
        1. Translate logs and events into plain-English summaries
        2. Highlight trends, critical nodes, and abnormal traffic patterns
        3. Generate structured logs for frontend visualization
        4. Track network health metrics over time
        """
        input_data = state["input_data"]
        context = state.get("context", {})
        orchestrator_analysis = context.get("orchestrator_analysis", {})
        
        # Extract orchestrator insights
        threat_level = orchestrator_analysis.get("threat_level", "UNKNOWN")
        attack_count = orchestrator_analysis.get("attack_count", 0)
        suspicious_count = orchestrator_analysis.get("suspicious_count", 0)
        total_nodes = orchestrator_analysis.get("total_nodes", 0)
        total_edges = orchestrator_analysis.get("total_edges", 0)
        attack_types = orchestrator_analysis.get("attack_types", {})
        ddos_detected = orchestrator_analysis.get("ddos_detected", False)
        apt_detected = orchestrator_analysis.get("apt_detected", False)
        
        # Analyze nodes for critical patterns
        nodes = input_data.get("nodes", [])
        edges = input_data.get("edges", [])
        
        # Identify critical nodes
        attacked_nodes = [n for n in nodes if n.get("status") == "attacked"]
        suspicious_nodes = [n for n in nodes if n.get("status") == "suspicious"]
        blocked_nodes = [n for n in nodes if n.get("status") == "blocked"]
        high_traffic_nodes = [n for n in nodes if n.get("traffic_volume", 0) > 50000]
        
        # Analyze traffic patterns
        attack_edges = [e for e in edges if e.get("connection_type") == "attack"]
        suspicious_edges = [e for e in edges if e.get("connection_type") == "suspicious"]
        
        # Build attack target map (who is being attacked the most)
        attack_targets = {}
        attack_sources = {}
        for edge in attack_edges:
            target = edge.get("target_id")
            source = edge.get("source_id")
            attack_targets[target] = attack_targets.get(target, 0) + 1
            attack_sources[source] = attack_sources.get(source, 0) + 1
        
        # Find most targeted nodes
        most_targeted = sorted(attack_targets.items(), key=lambda x: x[1], reverse=True)[:5]
        most_attacking = sorted(attack_sources.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Calculate network health score (0-100)
        if total_edges > 0:
            normal_ratio = (total_edges - attack_count - suspicious_count) / total_edges
            health_score = int(normal_ratio * 100)
        else:
            health_score = 100
        
        # Determine network status
        if health_score >= 90:
            network_status = "healthy"
        elif health_score >= 70:
            network_status = "degraded"
        elif health_score >= 50:
            network_status = "at_risk"
        else:
            network_status = "critical"
        
        # Generate log entries (chronological events)
        log_entries = []
        
        # System startup log
        log_entries.append({
            "timestamp": self._get_timestamp(),
            "level": "INFO",
            "category": "system",
            "message": f"Monitor agent initialized. Analyzing {total_nodes} nodes and {total_edges} connections.",
            "details": {}
        })
        
        # Threat level log
        if threat_level != "NONE":
            log_entries.append({
                "timestamp": self._get_timestamp(),
                "level": "WARNING" if threat_level in ["LOW", "MEDIUM"] else "CRITICAL",
                "category": "threat_detection",
                "message": f"Threat level: {threat_level}. {attack_count} attacks and {suspicious_count} suspicious connections detected.",
                "details": {
                    "threat_level": threat_level,
                    "attack_count": attack_count,
                    "suspicious_count": suspicious_count
                }
            })
        
        # DDoS detection log
        if ddos_detected:
            log_entries.append({
                "timestamp": self._get_timestamp(),
                "level": "CRITICAL",
                "category": "ddos",
                "message": f"⚠️ DDoS attack in progress! {attack_types.get('DDoS Volumetric', 0)} volumetric attack vectors detected.",
                "details": {
                    "attack_type": "DDoS Volumetric",
                    "vector_count": attack_types.get('DDoS Volumetric', 0)
                }
            })
        
        # APT detection log
        if apt_detected:
            apt_types_found = [a for a in ["APT Exfiltration", "Zero-Day Exploit", "Ransomware"] 
                             if a in attack_types]
            log_entries.append({
                "timestamp": self._get_timestamp(),
                "level": "CRITICAL",
                "category": "apt",
                "message": f"🎯 Advanced Persistent Threat detected: {', '.join(apt_types_found)}",
                "details": {
                    "attack_types": apt_types_found
                }
            })
        
        # Attack type breakdown logs
        for attack_type, count in attack_types.items():
            if count > 0:
                log_entries.append({
                    "timestamp": self._get_timestamp(),
                    "level": "WARNING",
                    "category": "attack_pattern",
                    "message": f"{attack_type}: {count} instance(s) detected",
                    "details": {
                        "attack_type": attack_type,
                        "count": count
                    }
                })
        
        # Critical nodes logs
        for node in attacked_nodes[:5]:  # Top 5 attacked nodes
            log_entries.append({
                "timestamp": self._get_timestamp(),
                "level": "CRITICAL",
                "category": "node_status",
                "message": f"🔴 Node {node.get('id')} ({node.get('ip')}) is under attack",
                "details": {
                    "node_id": node.get("id"),
                    "ip": node.get("ip"),
                    "status": "attacked",
                    "traffic_volume": node.get("traffic_volume", 0)
                }
            })
        
        # Suspicious nodes logs
        for node in suspicious_nodes[:3]:  # Top 3 suspicious nodes
            log_entries.append({
                "timestamp": self._get_timestamp(),
                "level": "WARNING",
                "category": "node_status",
                "message": f"🟡 Suspicious activity on node {node.get('id')} ({node.get('ip')})",
                "details": {
                    "node_id": node.get("id"),
                    "ip": node.get("ip"),
                    "status": "suspicious"
                }
            })
        
        # Network health log
        log_entries.append({
            "timestamp": self._get_timestamp(),
            "level": "INFO" if health_score >= 70 else "WARNING",
            "category": "health",
            "message": f"Network health: {health_score}% ({network_status})",
            "details": {
                "health_score": health_score,
                "status": network_status
            }
        })
        
        # Generate plain-English summary
        summary_parts = []
        
        # Opening statement
        summary_parts.append(f"📊 Network Monitoring Summary:")
        summary_parts.append(f"Monitoring {total_nodes} nodes with {total_edges} active connections.")
        
        # Threat assessment
        if threat_level == "NONE":
            summary_parts.append("✅ All systems operating normally. No threats detected.")
        elif threat_level == "LOW":
            summary_parts.append(f"⚠️ Low threat level. {attack_count} minor attack(s) detected.")
        elif threat_level == "MEDIUM":
            summary_parts.append(f"⚠️ Medium threat level. {attack_count} attack(s) require monitoring.")
        elif threat_level == "HIGH":
            summary_parts.append(f"🔴 High threat level! {attack_count} active attack(s) detected.")
        else:  # CRITICAL
            summary_parts.append(f"🚨 CRITICAL ALERT! {attack_count} severe attack(s) in progress!")
        
        # Critical patterns
        if ddos_detected:
            summary_parts.append(f"DDoS attack targeting network infrastructure with {attack_types.get('DDoS Volumetric', 0)} vectors.")
        
        if apt_detected:
            summary_parts.append("Advanced Persistent Threat (APT) activity detected - sophisticated attack campaign underway.")
        
        # Most targeted nodes
        if most_targeted:
            top_target = most_targeted[0]
            summary_parts.append(f"Most targeted node: {top_target[0]} ({top_target[1]} attacks)")
        
        # Attack type distribution
        if attack_types:
            top_attacks = sorted(attack_types.items(), key=lambda x: x[1], reverse=True)[:3]
            attack_list = ", ".join([f"{name} ({count})" for name, count in top_attacks])
            summary_parts.append(f"Primary attack vectors: {attack_list}")
        
        # Network health
        summary_parts.append(f"Overall network health: {health_score}% ({network_status})")
        
        # Recommendations
        if threat_level in ["CRITICAL", "HIGH"]:
            summary_parts.append("🔔 Recommendation: Immediate mitigation required.")
        elif threat_level == "MEDIUM":
            summary_parts.append("🔔 Recommendation: Continue monitoring and prepare defensive measures.")
        
        summary = " ".join(summary_parts)
        
        # Build monitoring dashboard data
        dashboard_data = {
            "network_health": {
                "score": health_score,
                "status": network_status,
                "threat_level": threat_level
            },
            "traffic_statistics": {
                "total_nodes": total_nodes,
                "total_edges": total_edges,
                "attacked_nodes": len(attacked_nodes),
                "suspicious_nodes": len(suspicious_nodes),
                "blocked_nodes": len(blocked_nodes),
                "high_traffic_nodes": len(high_traffic_nodes)
            },
            "attack_metrics": {
                "total_attacks": attack_count,
                "total_suspicious": suspicious_count,
                "attack_types": attack_types,
                "ddos_detected": ddos_detected,
                "apt_detected": apt_detected
            },
            "critical_nodes": {
                "most_targeted": [{"node_id": node_id, "attack_count": count} 
                                 for node_id, count in most_targeted],
                "most_attacking": [{"node_id": node_id, "attack_count": count} 
                                  for node_id, count in most_attacking],
                "attacked_list": [{"id": n.get("id"), "ip": n.get("ip"), 
                                  "traffic": n.get("traffic_volume", 0)} 
                                 for n in attacked_nodes]
            },
            "trends": {
                "threat_increasing": attack_count > suspicious_count,
                "primary_attack_vector": max(attack_types.items(), key=lambda x: x[1])[0] if attack_types else None,
                "health_trend": "declining" if health_score < 70 else "stable"
            }
        }
        
        # Calculate confidence based on data quality
        confidence = 1.0
        if total_edges == 0:
            confidence = 0.5
        elif total_edges < 5:
            confidence = 0.8
        
        # Create monitor decision
        state["monitor_decision"] = AgentDecision(
            agent_id="monitor",
            decision=f"monitoring_{network_status}",
            confidence=confidence,
            reasoning=summary,
            metadata={
                "logs": log_entries,
                "dashboard": dashboard_data,
                "summary": summary,
                "network_status": network_status,
                "health_score": health_score
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
