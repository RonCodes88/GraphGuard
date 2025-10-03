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
      <div className="bg-black/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 px-6 py-4 min-w-[300px] max-w-[400px] transform transition-all duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <h3 className="text-white text-lg font-bold tracking-wide">
              {data.country}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
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
              <span className="text-gray-500">Network Nodes:</span>
              <span className="text-white font-medium">{data.nodes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Connections:</span>
              <span className="text-white font-medium">{data.edges.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Active Attacks:</span>
              <span className={`font-medium ${data.attack_count > 0 ? 'text-red-500' : 'text-gray-400'}`}>{data.attack_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Suspicious:</span>
              <span className={`font-medium ${data.suspicious_count > 0 ? 'text-yellow-500' : 'text-gray-400'}`}>{data.suspicious_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Normal:</span>
              <span className="text-gray-400 font-medium">{data.normal_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Traffic:</span>
              <span className="text-white font-medium">{data.total_traffic.toLocaleString()}</span>
            </div>
          </div>

          {/* Threat Level Indicator */}
          <div className="pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">Threat Level:</span>
              <div className={`px-2 py-1 rounded text-xs font-medium border ${
                data.attack_count === 0 ? 'bg-black text-gray-400 border-gray-700' :
                data.attack_count < 5 ? 'bg-black text-yellow-500 border-yellow-500' :
                data.attack_count < 10 ? 'bg-black text-orange-500 border-orange-500' :
                'bg-black text-red-500 border-red-500'
              }`}>
                {data.attack_count === 0 ? 'LOW' :
                 data.attack_count < 5 ? 'MEDIUM' :
                 data.attack_count < 10 ? 'HIGH' : 'CRITICAL'}
              </div>
            </div>
          </div>

          {/* Node List */}
          <div className="pt-3 border-t border-gray-800">
            <h4 className="text-white text-sm font-medium mb-2">Network Nodes</h4>
            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
              {data.nodes.slice(0, 10).map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedNode?.id === node.id 
                      ? 'bg-white/10 border border-white/30' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      node.status === 'normal' ? 'bg-gray-400' :
                      node.status === 'suspicious' ? 'bg-yellow-500' :
                      node.status === 'attacked' ? 'bg-red-500' :
                      'bg-gray-600'
                    }`}></div>
                    <span className="text-gray-300 text-xs">{node.ip}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {node.node_type}
                  </div>
                </div>
              ))}
              {data.nodes.length > 10 && (
                <div className="text-xs text-gray-600 text-center py-1">
                  +{data.nodes.length - 10} more nodes
                </div>
              )}
            </div>
          </div>

          {/* Edge List */}
          <div className="pt-3 border-t border-gray-800">
            <h4 className="text-white text-sm font-medium mb-2">Connections</h4>
            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
              {data.edges.slice(0, 10).map((edge) => (
                <div
                  key={edge.id}
                  onClick={() => handleEdgeClick(edge)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    selectedEdge?.id === edge.id 
                      ? 'bg-white/10 border border-white/30' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      edge.connection_type === 'normal' ? 'bg-gray-400' :
                      edge.connection_type === 'suspicious' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-gray-300 text-xs">
                      {edge.source_id.split('_').pop()} → {edge.target_id.split('_').pop()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {edge.connection_type}
                  </div>
                </div>
              ))}
              {data.edges.length > 10 && (
                <div className="text-xs text-gray-600 text-center py-1">
                  +{data.edges.length - 10} more connections
                </div>
              )}
            </div>
          </div>

          {/* Selected Item Details */}
          {selectedNode && (
            <div className="pt-3 border-t border-gray-800">
              <h4 className="text-white text-sm font-medium mb-2">Node Details</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">IP:</span>
                  <span className="text-white">{selectedNode.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-300">{selectedNode.node_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`${
                    selectedNode.status === 'normal' ? 'text-gray-400' :
                    selectedNode.status === 'suspicious' ? 'text-yellow-500' :
                    selectedNode.status === 'attacked' ? 'text-red-500' :
                    'text-gray-300'
                  }`}>{selectedNode.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Traffic:</span>
                  <span className="text-gray-300">{selectedNode.traffic_volume.toLocaleString()}</span>
                </div>
                {selectedNode.city && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">City:</span>
                    <span className="text-gray-300">{selectedNode.city}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="pt-3 border-t border-gray-800">
              <h4 className="text-white text-sm font-medium mb-2">Connection Details</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span className={`${
                    selectedEdge.connection_type === 'normal' ? 'text-gray-400' :
                    selectedEdge.connection_type === 'suspicious' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>{selectedEdge.connection_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bandwidth:</span>
                  <span className="text-gray-300">{selectedEdge.bandwidth} Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Latency:</span>
                  <span className="text-gray-300">{selectedEdge.latency.toFixed(1)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Packets:</span>
                  <span className="text-gray-300">{selectedEdge.packet_count.toLocaleString()}</span>
                </div>
                {selectedEdge.attack_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Attack:</span>
                    <span className="text-red-500">{selectedEdge.attack_type}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-purple-500/20 rounded-full blur-xl"></div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500/20 rounded-full blur-lg"></div>
      </div>
    </div>
  );
}
