"use client";

import { useState, useEffect } from "react";

interface AgentInteraction {
  agent: string;
  timestamp: string;
  action: string;
  summary: string;
  confidence: number;
  status: "completed" | "in_progress" | "pending" | "error";
  details: Record<string, any>;
}

interface AgentInteractionsSummary {
  total_interactions: number;
  workflow_status: string;
  completed_agents: string[];
  interactions: AgentInteraction[];
  final_decision: {
    decision: string;
    confidence: number;
    reasoning: string;
  };
}

interface AgentInteractionsPanelProps {
  interactions: AgentInteractionsSummary | null;
  isProcessing: boolean;
  onAnalyzeWithAgents: () => void;
}

export default function AgentInteractionsPanel({ 
  interactions, 
  isProcessing, 
  onAnalyzeWithAgents 
}: AgentInteractionsPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-400";
      case "in_progress":
        return "text-blue-400";
      case "pending":
        return "text-yellow-400";
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      case "pending":
        return "⏳";
      case "error":
        return "❌";
      default:
        return "❓";
    }
  };

  const getAgentIcon = (agent: string) => {
    switch (agent.toLowerCase()) {
      case "orchestrator":
        return "🎯";
      case "detector":
        return "🔍";
      case "investigator":
        return "🕵️";
      case "monitor":
        return "📊";
      case "judge":
        return "⚖️";
      case "mitigator":
        return "🛡️";
      default:
        return "🤖";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-sm border-l border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">AI Agent Interactions</h3>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {interactions ? `${interactions.total_interactions} interactions` : "No interactions"}
          </div>
          {isProcessing && (
            <div className="flex items-center text-blue-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2"></div>
              Processing
            </div>
          )}
        </div>
      </div>

      {/* Analyze Button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onAnalyzeWithAgents}
          disabled={isProcessing}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
            isProcessing
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isProcessing ? "Analyzing..." : "🤖 Analyze with AI Agents"}
        </button>
      </div>

      {/* Workflow Status */}
      {interactions && (
        <div className="p-4 border-b border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Workflow Status</div>
          <div className="flex items-center justify-between">
            <span className="text-white capitalize">
              {interactions.workflow_status.replace("_", " ")}
            </span>
            <div className="flex space-x-1">
              {interactions.completed_agents.map((agent) => (
                <div
                  key={agent}
                  className="w-2 h-2 bg-green-400 rounded-full"
                  title={agent}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Final Decision */}
      {interactions?.final_decision && (
        <div className="p-4 border-b border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Final Decision</div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">
                {interactions.final_decision.decision.replace("_", " ")}
              </span>
              <span className="text-blue-400 text-sm">
                {formatConfidence(interactions.final_decision.confidence)}
              </span>
            </div>
            <p className="text-sm text-gray-300">
              {interactions.final_decision.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* Agent Interactions */}
      <div className="flex-1 overflow-y-auto">
        {interactions?.interactions?.length ? (
          <div className="space-y-2 p-4">
            {interactions.interactions.map((interaction, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                {/* Agent Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedAgent(
                    expandedAgent === interaction.agent ? null : interaction.agent
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getAgentIcon(interaction.agent)}</span>
                    <div>
                      <div className="text-white font-medium">{interaction.agent}</div>
                      <div className="text-xs text-gray-400">
                        {formatTimestamp(interaction.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${getStatusColor(interaction.status)}`}>
                      {getStatusIcon(interaction.status)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatConfidence(interaction.confidence)}
                    </span>
                  </div>
                </div>

                {/* Action Summary */}
                <div className="mt-2 text-sm text-gray-300">
                  <div className="font-medium mb-1">{interaction.action}</div>
                  <p className="text-gray-400">{interaction.summary}</p>
                </div>

                {/* Expanded Details */}
                {expandedAgent === interaction.agent && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-2">Details</div>
                    <div className="space-y-2">
                      {Object.entries(interaction.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">
                            {key.replace("_", " ")}:
                          </span>
                          <span className="text-white">
                            {typeof value === "boolean" 
                              ? (value ? "Yes" : "No")
                              : String(value)
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-4">🤖</div>
            <p>No agent interactions yet</p>
            <p className="text-sm mt-2">Click "Analyze with AI Agents" to start</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          AI-Powered Network Security Analysis
        </div>
      </div>
    </div>
  );
}
