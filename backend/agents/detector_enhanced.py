"""
Enhanced DetectorAgent with CIC DDoS 2019 feature awareness
Utilizes real dataset features for improved attack detection
"""
from typing import Dict, List, Any
from agents.base import BaseAgent, AgentRole, AgentInput, AgentOutput, ThreatLevel
from datetime import datetime
import math


class EnhancedDetectorAgent(BaseAgent):
    """
    Enhanced DetectorAgent with CIC DDoS dataset feature extraction
    Implements heavy-hitter detection and anomaly scoring based on real traffic characteristics
    """

    # Attack signatures based on CIC DDoS 2019 patterns
    ATTACK_SIGNATURES = {
        "DDoS-DNS": {
            "port": 53,
            "protocol": "UDP",
            "packet_rate_threshold": 10000,
            "bandwidth_threshold": 1000,
            "description": "DNS Amplification/Reflection Attack"
        },
        "DDoS-NTP": {
            "port": 123,
            "protocol": "UDP",
            "packet_rate_threshold": 8000,
            "bandwidth_threshold": 800,
            "description": "NTP Amplification Attack"
        },
        "DDoS-LDAP": {
            "port": 389,
            "protocol": "UDP",
            "packet_rate_threshold": 12000,
            "bandwidth_threshold": 1500,
            "description": "LDAP Reflection Attack"
        },
        "DDoS-MSSQL": {
            "port": 1434,
            "protocol": "UDP",
            "packet_rate_threshold": 9000,
            "bandwidth_threshold": 900,
            "description": "MSSQL Amplification Attack"
        },
        "DDoS-NetBIOS": {
            "port": 137,
            "protocol": "UDP",
            "packet_rate_threshold": 7000,
            "bandwidth_threshold": 700,
            "description": "NetBIOS Reflection Attack"
        },
        "DDoS-SNMP": {
            "port": 161,
            "protocol": "UDP",
            "packet_rate_threshold": 11000,
            "bandwidth_threshold": 1100,
            "description": "SNMP Amplification Attack"
        },
        "DDoS-SSDP": {
            "port": 1900,
            "protocol": "UDP",
            "packet_rate_threshold": 13000,
            "bandwidth_threshold": 1300,
            "description": "SSDP Reflection Attack"
        },
        "SYN-Flood": {
            "port": None,  # Any port
            "protocol": "TCP",
            "packet_rate_threshold": 15000,
            "bandwidth_threshold": 500,
            "description": "TCP SYN Flood Attack"
        },
        "UDP-Flood": {
            "port": None,
            "protocol": "UDP",
            "packet_rate_threshold": 20000,
            "bandwidth_threshold": 2000,
            "description": "UDP Flood Attack"
        },
        "Port-Scan": {
            "port": None,
            "protocol": None,
            "unique_ports_threshold": 50,
            "packet_rate_threshold": 1000,
            "description": "Port Scanning Activity"
        }
    }

    def __init__(self):
        super().__init__(agent_id="detector-enhanced", role=AgentRole.DETECTOR)
        self.confidence_threshold = 0.6
        self.detection_stats = {
            "total_flows_analyzed": 0,
            "attacks_detected": 0,
            "suspicious_flagged": 0
        }

    def get_capabilities(self) -> List[str]:
        return [
            "heavy_hitter_detection",
            "anomaly_detection",
            "ddos_signature_matching",
            "port_scan_detection",
            "traffic_volume_analysis",
            "protocol_analysis",
            "bandwidth_anomaly_detection"
        ]

    async def process(self, input_data: AgentInput) -> AgentOutput:
        """
        Analyze network traffic data for suspicious patterns

        Args:
            input_data: Contains nodes, edges, and traffic statistics

        Returns:
            Detection decision with threat analysis
        """
        data = input_data.data
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        stats = data.get("statistics", {})

        # Perform multi-level detection
        detections = []

        # 1. Analyze edges for attack patterns
        edge_detections = self._analyze_edges(edges)
        detections.extend(edge_detections)

        # 2. Analyze nodes for heavy-hitter behavior
        node_detections = self._analyze_nodes(nodes)
        detections.extend(node_detections)

        # 3. Analyze overall traffic statistics
        stat_detections = self._analyze_statistics(stats, len(edges))
        detections.extend(stat_detections)

        # 4. Check for coordinated attack patterns
        coordinated_detections = self._detect_coordinated_attacks(edges, nodes)
        detections.extend(coordinated_detections)

        # Update statistics
        self.detection_stats["total_flows_analyzed"] += len(edges)
        self.detection_stats["attacks_detected"] += len([d for d in detections if d["severity"] in ["high", "critical"]])
        self.detection_stats["suspicious_flagged"] += len([d for d in detections if d["severity"] == "medium"])

        # Calculate overall threat level
        threat_level, confidence = self._calculate_threat_level(detections)

        # Generate decision
        decision_text = self._generate_decision_text(detections, threat_level)
        reasoning = self._generate_reasoning(detections, stats)

        decision = self.create_decision(
            decision=decision_text,
            confidence=confidence,
            reasoning=reasoning,
            metadata={
                "detections": detections,
                "threat_level": threat_level,
                "stats": self.detection_stats,
                "flows_analyzed": len(edges),
                "timestamp": datetime.now().isoformat()
            }
        )

        # Determine next agents based on threat level
        next_agents = []
        if threat_level in ["high", "critical"]:
            next_agents = ["investigator", "judge"]
        elif threat_level == "medium":
            next_agents = ["investigator"]

        return AgentOutput(
            decision=decision,
            next_agents=next_agents,
            should_continue=True
        )

    def _analyze_edges(self, edges: List[Dict]) -> List[Dict]:
        """Analyze individual edges for attack patterns"""
        detections = []

        for edge in edges:
            # Check if already labeled as attack from dataset
            if edge.get("connection_type") == "attack":
                attack_type = edge.get("attack_type", "Unknown")
                detections.append({
                    "type": "labeled_attack",
                    "attack_type": attack_type,
                    "edge_id": edge.get("id"),
                    "severity": "high",
                    "confidence": 0.95,
                    "source": edge.get("source_id"),
                    "target": edge.get("target_id"),
                    "evidence": f"Labeled as {attack_type} in dataset"
                })

            # Analyze metrics for attack signatures
            packet_count = edge.get("packet_count", 0)
            bandwidth = edge.get("bandwidth", 0)
            protocol = edge.get("protocol", "").upper()

            # Extract port from node IDs (format: "ip:port")
            target_id = edge.get("target_id", "")
            target_port = None
            if ":" in target_id:
                target_port = int(target_id.split(":")[-1])

            # Check against attack signatures
            for attack_name, signature in self.ATTACK_SIGNATURES.items():
                sig_port = signature.get("port")
                sig_protocol = signature.get("protocol")
                packet_threshold = signature.get("packet_rate_threshold", float('inf'))
                bandwidth_threshold = signature.get("bandwidth_threshold", float('inf'))

                # Port and protocol matching
                port_match = sig_port is None or (target_port == sig_port)
                protocol_match = sig_protocol is None or (protocol == sig_protocol)

                if port_match and protocol_match:
                    # Check thresholds
                    if packet_count > packet_threshold or bandwidth > bandwidth_threshold:
                        confidence = min(0.99, 0.6 + (packet_count / packet_threshold) * 0.3)

                        detections.append({
                            "type": "signature_match",
                            "attack_type": attack_name,
                            "edge_id": edge.get("id"),
                            "severity": "high",
                            "confidence": confidence,
                            "source": edge.get("source_id"),
                            "target": edge.get("target_id"),
                            "evidence": f"Packet rate: {packet_count}, Bandwidth: {bandwidth}, Port: {target_port}"
                        })

        return detections

    def _analyze_nodes(self, nodes: List[Dict]) -> List[Dict]:
        """Analyze nodes for heavy-hitter behavior"""
        detections = []

        if not nodes:
            return detections

        # Calculate traffic volume statistics
        traffic_volumes = [n.get("traffic_volume", 0) for n in nodes]
        avg_traffic = sum(traffic_volumes) / len(traffic_volumes) if traffic_volumes else 0
        max_traffic = max(traffic_volumes) if traffic_volumes else 0

        # Heavy-hitter threshold: 5x average or >100MB
        heavy_hitter_threshold = max(avg_traffic * 5, 100_000_000)

        for node in nodes:
            traffic_vol = node.get("traffic_volume", 0)
            status = node.get("status", "normal")

            # Detect heavy-hitters
            if traffic_vol > heavy_hitter_threshold:
                severity = "critical" if traffic_vol > heavy_hitter_threshold * 2 else "high"
                confidence = min(0.95, 0.7 + (traffic_vol / (heavy_hitter_threshold * 2)) * 0.25)

                detections.append({
                    "type": "heavy_hitter",
                    "node_id": node.get("id"),
                    "ip": node.get("ip"),
                    "severity": severity,
                    "confidence": confidence,
                    "evidence": f"Traffic volume: {traffic_vol:,} bytes ({traffic_vol / avg_traffic:.1f}x average)"
                })

            # Check node status
            if status in ["attacked", "suspicious"]:
                detections.append({
                    "type": "node_status_anomaly",
                    "node_id": node.get("id"),
                    "ip": node.get("ip"),
                    "severity": "high" if status == "attacked" else "medium",
                    "confidence": 0.85,
                    "evidence": f"Node status: {status}"
                })

        return detections

    def _analyze_statistics(self, stats: Dict, total_edges: int) -> List[Dict]:
        """Analyze overall traffic statistics"""
        detections = []

        attack_count = stats.get("attack_count", 0)
        suspicious_count = stats.get("suspicious_count", 0)
        normal_count = stats.get("normal_count", 0)

        if total_edges == 0:
            return detections

        # Calculate attack ratio
        attack_ratio = attack_count / total_edges
        suspicious_ratio = suspicious_count / total_edges

        # High attack ratio detection
        if attack_ratio > 0.3:  # >30% attack traffic
            severity = "critical" if attack_ratio > 0.5 else "high"
            detections.append({
                "type": "high_attack_ratio",
                "severity": severity,
                "confidence": 0.9,
                "evidence": f"{attack_ratio * 100:.1f}% of traffic is malicious ({attack_count}/{total_edges} flows)"
            })

        # Elevated suspicious activity
        if suspicious_ratio > 0.2:  # >20% suspicious
            detections.append({
                "type": "elevated_suspicious_activity",
                "severity": "medium",
                "confidence": 0.75,
                "evidence": f"{suspicious_ratio * 100:.1f}% of traffic is suspicious ({suspicious_count}/{total_edges} flows)"
            })

        return detections

    def _detect_coordinated_attacks(self, edges: List[Dict], nodes: List[Dict]) -> List[Dict]:
        """Detect coordinated attack patterns (botnet, DDoS)"""
        detections = []

        # Build attack flow graph
        attack_edges = [e for e in edges if e.get("connection_type") == "attack"]

        if len(attack_edges) < 5:
            return detections

        # Group by target
        targets = {}
        for edge in attack_edges:
            target = edge.get("target_id")
            if target not in targets:
                targets[target] = []
            targets[target].append(edge)

        # Detect coordinated attacks (multiple sources -> single target)
        for target, target_edges in targets.items():
            if len(target_edges) >= 5:  # 5+ sources attacking same target
                unique_sources = len(set(e.get("source_id") for e in target_edges))

                if unique_sources >= 5:
                    severity = "critical" if unique_sources >= 10 else "high"
                    confidence = min(0.95, 0.7 + (unique_sources / 20) * 0.25)

                    detections.append({
                        "type": "coordinated_ddos",
                        "target": target,
                        "severity": severity,
                        "confidence": confidence,
                        "evidence": f"{unique_sources} unique sources attacking {target} ({len(target_edges)} attack flows)"
                    })

        return detections

    def _calculate_threat_level(self, detections: List[Dict]) -> tuple:
        """Calculate overall threat level and confidence"""
        if not detections:
            return "low", 0.5

        # Count severities
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        total_confidence = 0

        for detection in detections:
            severity = detection.get("severity", "low")
            severity_counts[severity] += 1
            total_confidence += detection.get("confidence", 0.5)

        avg_confidence = total_confidence / len(detections)

        # Determine threat level
        if severity_counts["critical"] > 0:
            return "critical", min(0.95, avg_confidence)
        elif severity_counts["high"] >= 3:
            return "high", min(0.9, avg_confidence)
        elif severity_counts["high"] >= 1:
            return "high", min(0.85, avg_confidence)
        elif severity_counts["medium"] >= 5:
            return "medium", min(0.8, avg_confidence)
        elif severity_counts["medium"] >= 1:
            return "medium", min(0.75, avg_confidence)
        else:
            return "low", 0.6

    def _generate_decision_text(self, detections: List[Dict], threat_level: str) -> str:
        """Generate human-readable decision text"""
        if not detections:
            return "No significant threats detected - traffic appears normal"

        detection_types = {}
        for d in detections:
            dtype = d.get("type", "unknown")
            detection_types[dtype] = detection_types.get(dtype, 0) + 1

        summary_parts = []
        for dtype, count in detection_types.items():
            summary_parts.append(f"{count} {dtype.replace('_', ' ')}")

        summary = ", ".join(summary_parts)

        return f"THREAT LEVEL: {threat_level.upper()} - Detected: {summary}"

    def _generate_reasoning(self, detections: List[Dict], stats: Dict) -> str:
        """Generate detailed reasoning for the decision"""
        if not detections:
            return "All traffic metrics within normal parameters. No anomalies detected."

        reasoning_parts = []

        # Group detections by type
        by_type = {}
        for d in detections:
            dtype = d.get("type", "unknown")
            if dtype not in by_type:
                by_type[dtype] = []
            by_type[dtype].append(d)

        # Generate reasoning for each detection type
        for dtype, items in by_type.items():
            if dtype == "labeled_attack":
                attack_types = set(d.get("attack_type") for d in items)
                reasoning_parts.append(
                    f"• {len(items)} labeled attacks detected: {', '.join(attack_types)}"
                )
            elif dtype == "signature_match":
                reasoning_parts.append(
                    f"• {len(items)} flows matching known attack signatures"
                )
            elif dtype == "heavy_hitter":
                reasoning_parts.append(
                    f"• {len(items)} nodes exhibiting heavy-hitter traffic patterns"
                )
            elif dtype == "coordinated_ddos":
                reasoning_parts.append(
                    f"• {len(items)} coordinated DDoS attacks detected (multiple sources targeting single victim)"
                )
            elif dtype == "high_attack_ratio":
                reasoning_parts.append(
                    f"• Abnormally high ratio of malicious traffic detected"
                )

        # Add statistics context
        total_traffic = stats.get("total_traffic", 0)
        attack_count = stats.get("attack_count", 0)
        reasoning_parts.append(
            f"\nAnalyzed {stats.get('total_edges', 0)} flows, "
            f"{attack_count} confirmed attacks, "
            f"{total_traffic:,} bytes total traffic"
        )

        return "\n".join(reasoning_parts)


# Singleton instance
enhanced_detector = EnhancedDetectorAgent()
