"use client";

import { useState } from "react";
import Earth from "@/components/Earth";
import NetworkViewTest from "@/components/NetworkViewTest";
import MonitoringPanel from "@/components/MonitoringPanel";
import AgentResultsPanel from "@/components/AgentResultsPanel";

export default function Home() {
  const [isCountryViewActive, setIsCountryViewActive] = useState(false);
  const [isAgentResultsOpen, setIsAgentResultsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mock function to simulate agent analysis
  const handleAnalyzeWithAgents = async () => {
    setIsAnalyzing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock analysis result
    const mockResult = {
      success: true,
      result: {
        decision: "critical_threat_detected",
        reasoning: "Multiple indicators suggest coordinated attack pattern with high confidence",
        confidence: 0.87,
        workflow_state: {
          completed_agents: ["detector", "investigator", "judge", "mitigator"]
        },
        metadata: {
          detector_decision: "threat_detected",
          detector_reasoning: "Heavy traffic patterns detected from suspicious IP ranges",
          detector_confidence: 0.82,
          investigator_decision: "coordinated_attack",
          investigator_reasoning: "Analysis reveals multi-vector attack targeting critical infrastructure",
          investigator_confidence: 0.89,
          judge_decision: "immediate_mitigation_required",
          judge_reasoning: "Risk assessment indicates high probability of successful breach",
          judge_confidence: 0.85,
          mitigator_decision: "block_and_monitor",
          mitigator_reasoning: "Implementing immediate blocking measures and enhanced monitoring",
          mitigator_confidence: 0.91
        }
      },
      explanation: "The AI agent system has detected a coordinated attack pattern targeting critical network infrastructure. Immediate mitigation measures have been implemented."
    };

    setAnalysisResult(mockResult);
    setIsAnalyzing(false);
    setIsAgentResultsOpen(true);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-black relative">
      {/* Main visualization area */}
      <Earth 
        onCountryViewChange={setIsCountryViewActive}
        onNodeSelect={setSelectedNode}
        onAnalyzeWithAgents={handleAnalyzeWithAgents}
        isAnalyzing={isAnalyzing}
      />
      {/* Uncomment the line below to test the network view directly */}
      {/* <NetworkViewTest /> */}
      
      {/* Monitoring panel overlay on the right - hidden during country view */}
      {!isCountryViewActive && <MonitoringPanel />}
      
      {/* Agent Results Panel */}
      <AgentResultsPanel
        isOpen={isAgentResultsOpen}
        onClose={() => setIsAgentResultsOpen(false)}
        analysisResult={analysisResult}
        selectedNode={selectedNode}
        isLoading={isAnalyzing}
      />
      
    </main>
  );
}
