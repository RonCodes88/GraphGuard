"use client";

import { useState } from "react";
import { NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";

interface NetworkActivityTrackerProps {
  data: NetworkTrafficData | null;
  visible: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
}

export default function NetworkActivityTracker({
  data,
  visible,
  position,
  onClose,
  onNodeClick,
  onEdgeClick
}: NetworkActivityTrackerProps) {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);

  if (!visible || !data) return null;

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    onNodeClick?.(node);
  };

  const handleEdgeClick = (edge: NetworkEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    onEdgeClick?.(edge);
  };

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: `${position.x + 20}px`,
        top: `${position.y - 20}px`,
      }}
    >
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-cyan-500/30 px-6 py-4 min-w-[300px] max-w-[400px] transform transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <h3 className="text-cyan-300 text-lg font-bold tracking-wide">
              {data.country}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Network Statistics */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Network Nodes:</span>
              <span className="text-green-300 font-medium">{data.nodes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Connections:</span>
              <span className="text-blue-300 font-medium">{data.edges.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Attacks:</span>
              <span className="text-red-300 font-medium">{data.attack_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Suspicious:</span>
              <span className="text-yellow-300 font-medium">{data.suspicious_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Normal:</span>
              <span className="text-green-300 font-medium">{data.normal_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Traffic:</span>
              <span className="text-cyan-300 font-medium">{data.total_traffic.toLocaleString()}</span>
            </div>
          </div>

          {/* Threat Level Indicator */}
          <div className="pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Threat Level:</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                data.attack_count === 0 ? 'bg-green-100 text-green-800' :
                data.attack_count < 5 ? 'bg-yellow-100 text-yellow-800' :
                data.attack_count < 10 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {data.attack_count === 0 ? 'LOW' :
                 data.attack_count < 5 ? 'MEDIUM' :
                 data.attack_count < 10 ? 'HIGH' : 'CRITICAL'}
              </div>
            </div>
          </div>

          {/* Node List */}
          <div className="pt-3 border-t border-slate-700/50">
            <h4 className="text-slate-300 text-sm font-medium mb-2">Network Nodes</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {data.nodes.slice(0, 10).map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedNode?.id === node.id 
                      ? 'bg-cyan-500/20 border border-cyan-500/30' 
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      node.status === 'normal' ? 'bg-green-400' :
                      node.status === 'suspicious' ? 'bg-yellow-400' :
                      node.status === 'attacked' ? 'bg-red-400' :
                      'bg-gray-400'
                    }`}></div>
                    <span className="text-slate-300 text-xs">{node.ip}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {node.node_type}
                  </div>
                </div>
              ))}
              {data.nodes.length > 10 && (
                <div className="text-xs text-slate-500 text-center py-1">
                  +{data.nodes.length - 10} more nodes
                </div>
              )}
            </div>
          </div>

          {/* Edge List */}
          <div className="pt-3 border-t border-slate-700/50">
            <h4 className="text-slate-300 text-sm font-medium mb-2">Connections</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {data.edges.slice(0, 10).map((edge) => (
                <div
                  key={edge.id}
                  onClick={() => handleEdgeClick(edge)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedEdge?.id === edge.id 
                      ? 'bg-cyan-500/20 border border-cyan-500/30' 
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      edge.connection_type === 'normal' ? 'bg-green-400' :
                      edge.connection_type === 'suspicious' ? 'bg-yellow-400' :
                      'bg-red-400'
                    }`}></div>
                    <span className="text-slate-300 text-xs">
                      {edge.source_id.split('_').pop()} → {edge.target_id.split('_').pop()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {edge.connection_type}
                  </div>
                </div>
              ))}
              {data.edges.length > 10 && (
                <div className="text-xs text-slate-500 text-center py-1">
                  +{data.edges.length - 10} more connections
                </div>
              )}
            </div>
          </div>

          {/* Selected Item Details */}
          {selectedNode && (
            <div className="pt-3 border-t border-slate-700/50">
              <h4 className="text-slate-300 text-sm font-medium mb-2">Node Details</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">IP:</span>
                  <span className="text-cyan-300">{selectedNode.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-slate-300">{selectedNode.node_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`${
                    selectedNode.status === 'normal' ? 'text-green-300' :
                    selectedNode.status === 'suspicious' ? 'text-yellow-300' :
                    selectedNode.status === 'attacked' ? 'text-red-300' :
                    'text-gray-300'
                  }`}>{selectedNode.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Traffic:</span>
                  <span className="text-slate-300">{selectedNode.traffic_volume.toLocaleString()}</span>
                </div>
                {selectedNode.city && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">City:</span>
                    <span className="text-slate-300">{selectedNode.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="pt-3 border-t border-slate-700/50">
              <h4 className="text-slate-300 text-sm font-medium mb-2">Connection Details</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className={`${
                    selectedEdge.connection_type === 'normal' ? 'text-green-300' :
                    selectedEdge.connection_type === 'suspicious' ? 'text-yellow-300' :
                    'text-red-300'
                  }`}>{selectedEdge.connection_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bandwidth:</span>
                  <span className="text-slate-300">{selectedEdge.bandwidth} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Latency:</span>
                  <span className="text-slate-300">{selectedEdge.latency.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Packets:</span>
                  <span className="text-slate-300">{selectedEdge.packet_count.toLocaleString()}</span>
                </div>
                {selectedEdge.attack_type && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Attack:</span>
                    <span className="text-red-300">{selectedEdge.attack_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-cyan-500/20 rounded-full blur-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500/20 rounded-full blur-lg"></div>
      </div>
    </div>
  );
}
