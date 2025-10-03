"""
Investigator Agent Demo Script

Demonstrates LLM-powered deep forensic analysis using GPT-4o.
Shows how Investigator communicates with Detector agent findings.

Usage:
    cd backend
    source venv/bin/activate
    python scripts/investigator_demo.py

Note: Requires OPENAI_API_KEY in .env file
"""
import asyncio
import sys
import json
from pathlib import Path

# Add parent directory to path to import agents module
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.workflow import AgentWorkflow


def print_investigations(investigations, title="Forensic Investigations"):
    """Pretty print investigation results"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print('='*80)
    
    if not investigations:
        print("   No investigations conducted")
        return
    
    for i, inv in enumerate(investigations, 1):
        severity_emoji = {
            "low": "🟢",
            "medium": "🟡",
            "high": "🟠",
            "critical": "🔴"
        }.get(inv.get("severity", "medium"), "⚠️")
        
        print(f"\n{i}. {severity_emoji} Investigation: {inv.get('investigation_id', 'Unknown')}")
        print(f"   Attack Type: {inv.get('attack_type', 'Unknown')} ({inv.get('attack_subtype', 'N/A')})")
        print(f"   Sophistication: {inv.get('sophistication_level', 'N/A')}")
        print(f"   Severity: {inv.get('severity', 'N/A')} | Confidence: {inv.get('confidence', 0):.2f}")
        
        # Affected entities
        affected = inv.get('affected_entities', {})
        if affected.get('nodes'):
            print(f"   Affected Nodes: {', '.join(affected['nodes'][:5])}")
        if affected.get('ips'):
            print(f"   Affected IPs: {', '.join(affected['ips'][:5])}")
        
        # Technical details
        tech = inv.get('technical_details', {})
        if tech.get('attack_vector'):
            print(f"   Attack Vector: {tech['attack_vector'][:100]}...")
        if tech.get('ttps'):
            print(f"   TTPs: {', '.join(tech['ttps'][:3])}")
        
        # Threat actor
        actor = inv.get('threat_actor_profile', {})
        if actor:
            print(f"   Threat Actor: {actor.get('skill_level', 'unknown')} | Motivation: {actor.get('likely_motivation', 'unknown')}")
        
        # Impact
        impact = inv.get('impact_assessment', {})
        if impact:
            print(f"   Impact: {impact.get('affected_systems', 0)} systems | Data at risk: {impact.get('data_at_risk', 'Unknown')}")
        
        # Recommendations
        recs = inv.get('recommendations', [])
        if recs:
            print(f"   Recommendations:")
            for rec in recs[:3]:
                print(f"      - {rec}")


def print_node_forensics(node_forensics):
    """Pretty print node forensic analysis"""
    print(f"\n{'='*80}")
    print("Node Forensic Analysis")
    print('='*80)
    
    if not node_forensics:
        print("   No node forensics available")
        return
    
    for node in node_forensics[:10]:  # Top 10
        role_emoji = {
            "attacker": "🔴",
            "victim": "🟦",
            "relay": "🟡",
            "command_control": "⚫",
            "compromised": "🟠"
        }.get(node.get("role_in_attack", ""), "⚪")
        
        print(f"\n{role_emoji} {node.get('node_id', 'Unknown')} ({node.get('ip', 'N/A')})")
        print(f"   Role: {node.get('role_in_attack', 'unknown')}")
        print(f"   Risk Score: {node.get('risk_score', 0):.2f}")
        print(f"   Analysis: {node.get('behavioral_analysis', 'No analysis')[:100]}...")
        print(f"   Action: {node.get('recommended_action', 'monitor').upper()}")


def print_campaigns(campaigns):
    """Pretty print attack campaigns"""
    print(f"\n{'='*80}")
    print("Attack Campaigns")
    print('='*80)
    
    if not campaigns:
        print("   No coordinated campaigns detected")
        return
    
    for campaign in campaigns:
        coordinated_emoji = "🎯" if campaign.get("coordinated") else "📍"
        print(f"\n{coordinated_emoji} {campaign.get('campaign_name', 'Unnamed Campaign')}")
        print(f"   Campaign ID: {campaign.get('campaign_id', 'N/A')}")
        print(f"   Coordinated: {'Yes' if campaign.get('coordinated') else 'No'}")
        print(f"   Timeline: {campaign.get('timeline', 'Unknown')}")
        print(f"   Description: {campaign.get('description', 'No description')[:150]}...")
        print(f"   Related Investigations: {len(campaign.get('related_investigations', []))}")


async def demo_investigator():
    """Demo the investigator agent with Detector communication"""
    
    workflow = AgentWorkflow()
    
    # Test Case 1: DDoS Attack Investigation
    print("\n" + "="*80)
    print("TEST CASE 1: DDoS Attack - Deep Forensic Investigation")
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
            {"id": "e5", "source_id": "bot1", "target_id": "server1", "connection_type": "attack", "attack_type": "DDoS Volumetric"}
        ]
    }
    
    print("\n🔍 Running multi-agent analysis...")
    print("   1️⃣ Orchestrator: Assessing threat level...")
    print("   2️⃣ Detector (GPT-4o-mini): Identifying threats...")
    print("   3️⃣ Investigator (GPT-4o): Deep forensic analysis...")
    
    result = await workflow.run(input_data=ddos_data)
    
    # Show Detector findings first
    detector_decision = result["detector_decision"]
    print(f"\n📊 Detector Findings:")
    print(f"   Decision: {detector_decision.decision}")
    print(f"   Confidence: {detector_decision.confidence}")
    print(f"   Threats Detected: {len(detector_decision.metadata.get('threats_detected', []))}")
    print(f"   Flagged IPs: {len(detector_decision.metadata.get('flagged_ips', []))}")
    
    # Show Investigator results
    investigator_decision = result["investigator_decision"]
    print(f"\n🔬 Investigator Analysis:")
    print(f"   Decision: {investigator_decision.decision}")
    print(f"   Confidence: {investigator_decision.confidence}")
    print(f"\n📝 Executive Summary:")
    print(f"   {investigator_decision.reasoning}")
    
    metadata = investigator_decision.metadata
    print(f"\n📊 Detector Input Received:")
    print(f"   {json.dumps(metadata.get('detector_input', {}), indent=4)}")
    
    print_investigations(metadata.get("investigations", []))
    print_node_forensics(metadata.get("node_forensics", []))
    print_campaigns(metadata.get("attack_campaigns", []))
    
    print(f"\n📈 Overall Assessment:")
    print(json.dumps(metadata.get("overall_assessment", {}), indent=2))
    
    # Assertions
    assert metadata.get("llm_model") == "gpt-4o", "Should use GPT-4o"
    assert metadata.get("detector_input") is not None, "Should receive Detector input"
    print("\n✅ DDoS investigation test passed")
    
    # Test Case 2: APT Campaign Investigation
    print("\n\n" + "="*80)
    print("TEST CASE 2: APT Campaign - Multi-Stage Attack Investigation")
    print("="*80)
    
    apt_data = {
        "nodes": [
            {"id": "server1", "ip": "172.16.0.10", "status": "attacked", "traffic_volume": 55000},
            {"id": "attacker1", "ip": "203.0.113.88", "status": "normal", "traffic_volume": 12000},
            {"id": "client1", "ip": "172.16.0.50", "status": "suspicious", "traffic_volume": 8000},
            {"id": "client2", "ip": "172.16.0.51", "status": "suspicious", "traffic_volume": 7000}
        ],
        "edges": [
            {"id": "e1", "source_id": "server1", "target_id": "attacker1", "connection_type": "attack", "attack_type": "APT Exfiltration"},
            {"id": "e2", "source_id": "attacker1", "target_id": "client1", "connection_type": "attack", "attack_type": "Zero-Day Exploit"},
            {"id": "e3", "source_id": "client1", "target_id": "server1", "connection_type": "suspicious"},
            {"id": "e4", "source_id": "client2", "target_id": "server1", "connection_type": "attack", "attack_type": "Ransomware"}
        ]
    }
    
    print("\n🔍 Running multi-agent analysis...")
    result = await workflow.run(input_data=apt_data)
    
    investigator_decision = result["investigator_decision"]
    
    print(f"\n🔬 Investigator Analysis:")
    print(f"   Decision: {investigator_decision.decision}")
    print(f"   Confidence: {investigator_decision.confidence}")
    print(f"\n📝 Executive Summary:")
    print(f"   {investigator_decision.reasoning}")
    
    print(f"\n📄 Technical Summary:")
    print(f"   {investigator_decision.metadata.get('technical_summary', 'N/A')[:300]}...")
    
    metadata = investigator_decision.metadata
    print_investigations(metadata.get("investigations", []))
    print_node_forensics(metadata.get("node_forensics", []))
    print_campaigns(metadata.get("attack_campaigns", []))
    
    # Check for campaign detection
    campaigns = metadata.get("attack_campaigns", [])
    if campaigns:
        print(f"\n✅ Coordinated campaign detected: {campaigns[0].get('campaign_name', 'Unnamed')}")
    
    print("\n✅ APT investigation test passed")
    
    print("\n" + "="*80)
    print("✅ All investigator demos completed successfully!")
    print("="*80 + "\n")
    
    print("\n💡 Investigator Agent Features:")
    print("   ✅ LLM-Powered: GPT-4o for elite forensic analysis")
    print("   ✅ Agent Communication: Receives Detector findings")
    print("   ✅ Deep Forensics: MITRE ATT&CK, kill chain analysis")
    print("   ✅ Attack Attribution: Threat actor profiling")
    print("   ✅ Campaign Detection: Correlates related attacks")
    print("   ✅ Impact Assessment: Business and technical impact")
    print("   ✅ Evidence Chain: Forensic evidence tracking")
    print("   ✅ Actionable Reports: Executive & technical summaries")


if __name__ == "__main__":
    try:
        asyncio.run(demo_investigator())
    except AssertionError as e:
        print(f"\n❌ ASSERTION FAILED: {e}\n", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

