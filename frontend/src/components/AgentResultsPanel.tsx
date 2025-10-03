"use client";

import { useState } from "react";

interface AgentResultsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  analysisResult: any;
  selectedNode: any;
  isLoading: boolean;
}

interface AgentResult {
  agent: string;
  status: 'completed' | 'processing' | 'error';
  decision?: string;
  reasoning?: string;
  confidence?: number;
  metadata?: any;
  error?: string;
  timestamp?: string;
}

export default function AgentResultsPanel({ 
  isOpen, 
  onClose, 
  analysisResult, 
  selectedNode, 
  isLoading 
}: AgentResultsPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extract agent results from the analysis result
  const extractAgentResults = (result: any): AgentResult[] => {
    if (!result || !result.success) {
      return [];
    }

    // Check if we have agent interactions data (new format)
    if (result.agent_interactions && result.agent_interactions.interactions) {
      return result.agent_interactions.interactions.map((interaction: any) => ({
        agent: interaction.agent,
        status: interaction.status === 'completed' ? 'completed' : 'processing',
        decision: interaction.action,
        reasoning: interaction.summary,
        confidence: interaction.confidence,
        metadata: interaction.details,
        timestamp: interaction.timestamp
      }));
    }

    // Fallback to old format
    const workflowState = result.result?.workflow_state;
    const metadata = result.result?.metadata || {};
    const completedAgents = workflowState?.completed_agents || [];

    // Handle the new structure where each agent has its own decision object
    const agents: AgentResult[] = [];
    
    // Extract each agent's decision if available
    if (metadata.detector_decision) {
      agents.push({
        agent: 'Detector',
        status: completedAgents.includes('detector') ? 'completed' : 'processing',
        decision: metadata.detector_decision.decision,
        reasoning: metadata.detector_decision.reasoning,
        confidence: metadata.detector_decision.confidence,
        metadata: metadata.detector_decision.metadata
      });
    }

    if (metadata.investigator_decision) {
      agents.push({
        agent: 'Investigator',
        status: completedAgents.includes('investigator') ? 'completed' : 'processing',
        decision: metadata.investigator_decision.decision,
        reasoning: metadata.investigator_decision.reasoning,
        confidence: metadata.investigator_decision.confidence,
        metadata: metadata.investigator_decision.metadata
      });
    }

    if (metadata.monitor_decision) {
      agents.push({
        agent: 'Monitor',
        status: completedAgents.includes('monitor') ? 'completed' : 'processing',
        decision: metadata.monitor_decision.decision,
        reasoning: metadata.monitor_decision.reasoning,
        confidence: metadata.monitor_decision.confidence,
        metadata: metadata.monitor_decision.metadata
      });
    }

    if (metadata.judge_decision) {
      agents.push({
        agent: 'Judge',
        status: completedAgents.includes('judge') ? 'completed' : 'processing',
        decision: metadata.judge_decision.decision,
        reasoning: metadata.judge_decision.reasoning,
        confidence: metadata.judge_decision.confidence,
        metadata: metadata.judge_decision.metadata
      });
    }

    if (metadata.mitigator_decision) {
      agents.push({
        agent: 'Mitigator',
        status: completedAgents.includes('mitigator') ? 'completed' : 'processing',
        decision: metadata.mitigator_decision.decision,
        reasoning: metadata.mitigator_decision.reasoning,
        confidence: metadata.mitigator_decision.confidence,
        metadata: metadata.mitigator_decision.metadata
      });
    }

    return agents;
  };

  const agentResults = extractAgentResults(analysisResult);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-blue-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDecisionColor = (decision: string) => {
    if (decision?.includes('critical') || decision?.includes('threat')) return 'text-red-400';
    if (decision?.includes('warning') || decision?.includes('suspicious')) return 'text-yellow-400';
    if (decision?.includes('safe') || decision?.includes('normal')) return 'text-green-400';
    return 'text-blue-400';
  };

  const formatDecision = (decision: string) => {
    if (!decision) return 'No decision';
    return decision.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-[480px] bg-black/95 backdrop-blur-md border-l border-gray-800 text-white overflow-hidden flex flex-col font-mono z-50">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-b from-gray-950/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
            <h1 className="text-xl font-bold tracking-widest">AGENT ANALYSIS</h1>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1 tracking-wide">AI Agent Analysis Results</p>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="p-4 border-b border-gray-800 bg-gray-900/30">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">ANALYZED NODE</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <div><span className="text-gray-500">IP:</span> {selectedNode.ip || selectedNode.id}</div>
            <div><span className="text-gray-500">Type:</span> {selectedNode.type || 'Unknown'}</div>
            <div><span className="text-gray-500">Country:</span> {selectedNode.country || 'Unknown'}</div>
            {selectedNode.traffic && (
              <div><span className="text-gray-500">Traffic:</span> {selectedNode.traffic.toLocaleString()} packets</div>
            )}
          </div>
        </div>
      )}

      {/* Overall Analysis Summary */}
      {analysisResult && analysisResult.success && (
        <div className="p-4 border-b border-gray-800 bg-gray-900/30">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">OVERALL ASSESSMENT</h3>
          <div className="text-xs text-gray-300 space-y-2">
            <div className="flex items-center justify-between">
              <span>Final Decision:</span>
              <span className={`font-semibold ${getDecisionColor(analysisResult.result?.decision)}`}>
                {formatDecision(analysisResult.result?.decision)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Confidence:</span>
              <span className={`font-semibold ${getConfidenceColor(analysisResult.confidence)}`}>
                {Math.round((analysisResult.confidence || 0) * 100)}%
              </span>
            </div>
            <div className="mt-3">
              <span className="text-gray-500 block mb-1">Reasoning:</span>
              <p className="text-gray-300 leading-relaxed">
                {analysisResult.explanation || 'No explanation provided'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400 text-sm">Analyzing with AI Agents...</p>
            <p className="text-gray-500 text-xs mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      {/* Agent Results */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-blue-400 mb-4">AGENT BREAKDOWN</h3>
            
            {agentResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No agent analysis available</p>
                <p className="text-gray-500 text-xs mt-2">Click on a node to analyze</p>
              </div>
            ) : (
              <div className="space-y-4">
                {agentResults.map((agent, index) => (
                  <div key={agent.agent} className="border border-gray-700 rounded-lg overflow-hidden">
                    {/* Agent Header */}
                    <div 
                      className="p-3 bg-gray-800/50 cursor-pointer hover:bg-gray-800/70 transition-colors"
                      onClick={() => setExpandedAgent(expandedAgent === agent.agent ? null : agent.agent)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg ${getStatusColor(agent.status)}`}>
                            {getStatusIcon(agent.status)}
                          </span>
                          <span className="font-semibold text-white">{agent.agent}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {agent.confidence && (
                            <span className={`text-xs ${getConfidenceColor(agent.confidence)}`}>
                              {Math.round(agent.confidence * 100)}%
                            </span>
                          )}
                          <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedAgent === agent.agent ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      
                      {agent.decision && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Decision: </span>
                          <span className={`text-xs font-medium ${getDecisionColor(agent.decision)}`}>
                            {formatDecision(agent.decision)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Agent Details (Expandable) */}
                    {expandedAgent === agent.agent && (
                      <div className="p-3 bg-gray-900/50 border-t border-gray-700">
                        <div className="space-y-3 text-xs">
                          {agent.timestamp && (
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{new Date(agent.timestamp).toLocaleTimeString()}</span>
                            </div>
                          )}

                          {agent.reasoning && (
                            <div>
                              <span className="text-gray-500 block mb-1">Step-by-Step Analysis:</span>
                              <p className="text-gray-300 leading-relaxed">
                                {agent.reasoning}
                              </p>
                            </div>
                          )}
                          
                          {agent.metadata && Object.keys(agent.metadata).length > 0 && (
                            <div>
                              <span className="text-gray-500 block mb-1">Key Findings:</span>
                              <div className="bg-gray-800/50 p-2 rounded border border-gray-600">
                                {Object.entries(agent.metadata).map(([key, value]) => (
                                  <div key={key} className="mb-1">
                                    <span className="text-blue-300 font-medium">
                                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                                    </span>
                                    <span className="text-gray-300 ml-2">
                                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                                       typeof value === 'object' ? JSON.stringify(value) :
                                       value?.toString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {agent.error && (
                            <div>
                              <span className="text-red-400 block mb-1">Error:</span>
                              <p className="text-red-300">{agent.error}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>AI-Powered Analysis</span>
          <span>Real-time Processing</span>
        </div>
      </div>
    </div>
  );
}
