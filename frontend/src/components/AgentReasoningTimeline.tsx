"use client";

import React, { useState, useEffect } from 'react';

interface IntermediateStep {
  step: string;
  details: string;
}

interface AgentInteraction {
  agent: string;
  timestamp: string;
  action: string;
  summary: string;
  confidence: number;
  status: string;
  details: any;
  llm_prompt?: string;
  llm_response?: string;
  intermediate_steps?: IntermediateStep[];
  processing_time_ms?: number;
}

interface AgentReasoningTimelineProps {
  interactions: AgentInteraction[];
  finalDecision?: {
    decision: string;
    confidence: number;
    reasoning: string;
  };
  isLoading?: boolean;
}

export default function AgentReasoningTimeline({ interactions, finalDecision, isLoading }: AgentReasoningTimelineProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [visibleInteractions, setVisibleInteractions] = useState<AgentInteraction[]>([]);

  // Simulate real-time agent processing appearance
  useEffect(() => {
    if (interactions.length > visibleInteractions.length) {
      const timer = setTimeout(() => {
        setVisibleInteractions(interactions.slice(0, visibleInteractions.length + 1));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setVisibleInteractions(interactions);
    }
  }, [interactions, visibleInteractions.length]);

  const toggleAgent = (agentName: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentName)) {
      newExpanded.delete(agentName);
    } else {
      newExpanded.add(agentName);
    }
    setExpandedAgents(newExpanded);
  };

  const getAgentColor = (agentName: string) => {
    const colors: Record<string, string> = {
      "Orchestrator": "border-slate-800",
      "Detector": "border-slate-800",
      "Investigator": "border-slate-800",
      "Monitor": "border-slate-800",
      "Judge": "border-slate-800",
      "Mitigator": "border-slate-800"
    };
    return colors[agentName] || "border-slate-800";
  };

  const getAgentNumberColor = (agentName: string) => {
    const colors: Record<string, string> = {
      "Orchestrator": "text-blue-400",
      "Detector": "text-cyan-400",
      "Investigator": "text-purple-400",
      "Monitor": "text-emerald-400",
      "Judge": "text-amber-400",
      "Mitigator": "text-red-400"
    };
    return colors[agentName] || "text-slate-400";
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.9) return { label: "HIGH", color: "text-emerald-400" };
    if (confidence >= 0.7) return { label: "MEDIUM", color: "text-cyan-400" };
    if (confidence >= 0.5) return { label: "LOW", color: "text-amber-400" };
    return { label: "CRITICAL", color: "text-red-400" };
  };

  const formatNetFlowMetrics = (details: any) => {
    const metrics: { label: string; value: string }[] = [];

    if (details.threats_detected !== undefined) {
      metrics.push({ label: "Threats Detected", value: String(details.threats_detected) });
    }
    if (details.flagged_ips !== undefined) {
      metrics.push({ label: "Flagged srcaddr", value: String(details.flagged_ips) });
    }
    if (details.heavy_hitters !== undefined) {
      metrics.push({ label: "Heavy Hitters", value: String(details.heavy_hitters) });
    }
    if (details.investigations_count !== undefined) {
      metrics.push({ label: "Investigations", value: String(details.investigations_count) });
    }
    if (details.attack_campaigns !== undefined) {
      metrics.push({ label: "Attack Campaigns", value: String(details.attack_campaigns) });
    }
    if (details.coordinated_attack !== undefined) {
      metrics.push({ label: "Coordinated", value: details.coordinated_attack ? "TRUE" : "FALSE" });
    }
    if (details.network_status) {
      metrics.push({ label: "Network Status", value: details.network_status.toUpperCase() });
    }
    if (details.health_score !== undefined) {
      metrics.push({ label: "Health Score", value: `${details.health_score}/100` });
    }
    if (details.final_threat_level) {
      metrics.push({ label: "Threat Level", value: details.final_threat_level });
    }
    if (details.requires_immediate_action !== undefined) {
      metrics.push({ label: "Immediate Action", value: details.requires_immediate_action ? "REQUIRED" : "NOT REQUIRED" });
    }
    if (details.actions_executed !== undefined) {
      metrics.push({ label: "Actions Executed", value: String(details.actions_executed) });
    }
    if (details.automated_actions !== undefined) {
      metrics.push({ label: "Automated", value: String(details.automated_actions) });
    }

    return metrics;
  };

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
      `}</style>

      <div className="border-b border-slate-800 pb-3 mb-5">
        <h3 className="text-lg font-semibold text-white tracking-wide">
          Agent Workflow Trace
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Sequential agent execution log with NetFlow analysis metrics
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800"></div>

        {/* Agent Cards */}
        <div className="space-y-2">
          {visibleInteractions.map((interaction, index) => {
            const isExpanded = expandedAgents.has(interaction.agent);
            const agentColor = getAgentColor(interaction.agent);
            const agentNumberColor = getAgentNumberColor(interaction.agent);
            const confidenceLevel = getConfidenceLevel(interaction.confidence);
            const metrics = formatNetFlowMetrics(interaction.details);

            return (
              <div key={index} className="relative pl-12">
                {/* Timeline Dot */}
                <div className="absolute left-3 top-3 w-4 h-4 rounded-full border-2 border-slate-700 bg-black z-10"></div>

                {/* Agent Card */}
                <div className={`border ${agentColor} rounded-lg overflow-hidden bg-black`}>
                  {/* Header */}
                  <button
                    onClick={() => toggleAgent(interaction.agent)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-left">
                        <div className="font-semibold text-white text-base">{interaction.agent}</div>
                        <div className="text-sm text-slate-500">{interaction.action}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-mono ${confidenceLevel.color} font-semibold text-sm`}>
                          {(interaction.confidence * 100).toFixed(1)}%
                        </div>
                        {interaction.processing_time_ms && (
                          <div className="text-slate-600 text-xs">
                            {interaction.processing_time_ms.toFixed(0)}ms
                          </div>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-900">
                      {/* Analysis Summary */}
                      <div className="px-4 py-3 border-b border-slate-800">
                        <div className="text-sm font-semibold text-slate-400 mb-2">ANALYSIS OUTPUT</div>
                        <div className="text-sm text-slate-300 leading-relaxed font-mono">
                          {interaction.summary}
                        </div>
                      </div>

                      {/* Processing Steps */}
                      {interaction.intermediate_steps && interaction.intermediate_steps.length > 0 && (
                        <div className="px-4 py-3 border-b border-slate-800">
                          <div className="text-sm font-semibold text-slate-400 mb-2">EXECUTION TRACE</div>
                          <div className="space-y-2">
                            {interaction.intermediate_steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-start gap-3 text-sm">
                                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2"></div>
                                <div className="flex-1">
                                  <div className="text-slate-300">{step.step}</div>
                                  <div className="text-slate-500 font-mono text-xs mt-0.5">{step.details}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LLM Task */}
                      {interaction.llm_prompt && (
                        <div className="px-4 py-3 border-b border-slate-800">
                          <div className="text-sm font-semibold text-slate-400 mb-2">LLM TASK</div>
                          <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded font-mono leading-relaxed">
                            {interaction.llm_prompt}
                          </div>
                        </div>
                      )}

                      {/* NetFlow Metrics */}
                      {metrics.length > 0 && (
                        <div className="px-4 py-3">
                          <div className="text-sm font-semibold text-slate-400 mb-3">NETFLOW METRICS</div>
                          <div className="grid grid-cols-2 gap-3">
                            {metrics.map((metric, idx) => (
                              <div key={idx} className="bg-slate-900/30 rounded px-3 py-2">
                                <div className="text-xs text-slate-500 uppercase tracking-wide">
                                  {metric.label}
                                </div>
                                <div className="text-sm text-slate-200 font-mono font-semibold mt-1">
                                  {metric.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator for Next Agent */}
          {isLoading && visibleInteractions.length < 6 && (
            <div className="relative pl-12">
              <div className="absolute left-3 top-3 w-4 h-4 rounded-full border-2 border-slate-700 bg-black z-10 animate-pulse"></div>
              <div className="border border-slate-800 bg-black rounded-lg px-4 py-3">
                <div className="text-sm text-slate-500">Processing next agent...</div>
              </div>
            </div>
          )}
        </div>

        {/* No separate Final Decision Card - Judge agent card contains the final decision */}
      </div>
    </div>
  );
}
