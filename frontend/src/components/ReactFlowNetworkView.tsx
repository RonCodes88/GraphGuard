"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

interface ReactFlowNetworkViewProps {
  country: string;
  onBack: () => void;
}

interface NetworkStats {
  totalNodes: number;
  totalEdges: number;
  activeFlows: number;
  totalTraffic: number;
  threatLevel: "Low" | "Medium" | "High";
}

// Custom node component for better styling
const CustomNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const getNodeStyle = () => {
    const baseStyle = "px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all duration-200";
    
    if (selected) {
      return `${baseStyle} bg-gray-100 border-black text-black`;
    }
    
    switch (data.status) {
      case "attacked":
        return `${baseStyle} bg-black text-white border-black`;
      case "suspicious":
        return `${baseStyle} bg-gray-50 border-gray-400 border-dashed text-gray-700`;
      default:
        return `${baseStyle} bg-white border-gray-300 text-black`;
    }
  };

  return (
    <div className={getNodeStyle()}>
      <div className="font-semibold">{data.label}</div>
      <div className="text-xs opacity-70 mt-1">{data.type}</div>
    </div>
  );
};

// Custom edge component with realistic traffic flow
const AnimatedEdge = ({ id, sourceX, sourceY, targetX, targetY, data }: any) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [packets, setPackets] = useState<Array<{ id: number; progress: number; size: number }>>([]);

  useEffect(() => {
    const speed = data?.speed || 0.015;
    const traffic = data?.traffic || 1000;
    
    // Create realistic packet flow based on traffic volume
    const packetInterval = Math.max(50, 2000 / (traffic / 100)); // More packets for higher traffic
    const maxPackets = Math.min(10, Math.floor(traffic / 500)); // Limit packets for performance

    const interval = setInterval(() => {
      setAnimationProgress((prev) => (prev + speed) % 1);
      
      // Add new packets based on traffic volume
      if (Math.random() < 0.3 && packets.length < maxPackets) {
        setPackets(prev => [...prev, {
          id: Date.now() + Math.random(),
          progress: 0,
          size: Math.random() * 4 + 2
        }]);
      }
    }, packetInterval);

    // Update packet positions
    const packetUpdateInterval = setInterval(() => {
      setPackets(prev => prev.map(packet => ({
        ...packet,
        progress: packet.progress + speed
      })).filter(packet => packet.progress < 1));
    }, 30);

    return () => {
      clearInterval(interval);
      clearInterval(packetUpdateInterval);
    };
  }, [data?.speed, data?.traffic, packets.length]);

  const getEdgeColor = () => {
    switch (data?.type) {
      case "attack":
        return "#ff0000"; // Bright red for attacks
      case "suspicious":
        return "#ff8800"; // Orange for suspicious
      default:
        return "#00aa44"; // Green for normal
    }
  };

  const getEdgeStyle = () => {
    const isDashed = data?.type === "attack";
    const traffic = data?.traffic || 1000;
    const width = Math.min(6, Math.max(2, traffic / 1500)); // Increased minimum width
    
    return {
      stroke: getEdgeColor(),
      strokeWidth: width,
      strokeDasharray: isDashed ? "8,4" : "none",
    };
  };

  // Calculate animated point position
  const progress = animationProgress;
  const x = sourceX + (targetX - sourceX) * progress;
  const y = sourceY + (targetY - sourceY) * progress;

  return (
    <g>
      {/* Main edge line */}
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        style={getEdgeStyle()}
        strokeOpacity={1.0}
      />
      
      {/* Render individual packets */}
      {packets.map((packet) => {
        const packetX = sourceX + (targetX - sourceX) * packet.progress;
        const packetY = sourceY + (targetY - sourceY) * packet.progress;
        
        return (
          <circle
            key={packet.id}
            cx={packetX}
            cy={packetY}
            r={packet.size}
            fill={getEdgeColor()}
            opacity={0.8 - packet.progress * 0.3} // Fade as it travels
          />
        );
      })}
      
      {/* Continuous flow indicator for high traffic */}
      {data?.traffic > 5000 && (
        <circle
          cx={x}
          cy={y}
          r="3"
          fill={getEdgeColor()}
          opacity={0.6}
        />
      )}
    </g>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// Simple edge component as fallback
const SimpleEdge = ({ sourceX, sourceY, targetX, targetY, data }: any) => {
  const getEdgeColor = () => {
    switch (data?.type) {
      case "attack":
        return "#ff0000";
      case "suspicious":
        return "#ff8800";
      default:
        return "#00aa44";
    }
  };

  return (
    <line
      x1={sourceX}
      y1={sourceY}
      x2={targetX}
      y2={targetY}
      stroke={getEdgeColor()}
      strokeWidth={3}
      strokeOpacity={1.0}
    />
  );
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
  simple: SimpleEdge,
};

export default function ReactFlowNetworkView({ country, onBack }: ReactFlowNetworkViewProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [stats, setStats] = useState<NetworkStats>({
    totalNodes: 0,
    totalEdges: 0,
    activeFlows: 0,
    totalTraffic: 0,
    threatLevel: "Low",
  });

  // Generate realistic network data with proper topology
  const generateNetworkData = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Define realistic network topology
    const networkTopology = [
      { id: "firewall_01", type: "firewall", status: "normal", x: 200, y: 300, connections: ["router_01", "router_02"] },
      { id: "router_01", type: "router", status: "normal", x: 400, y: 200, connections: ["firewall_01", "server_01", "server_02"] },
      { id: "router_02", type: "router", status: "normal", x: 400, y: 400, connections: ["firewall_01", "server_03", "database_01"] },
      { id: "server_01", type: "server", status: "normal", x: 600, y: 150, connections: ["router_01", "client_01", "client_02"] },
      { id: "server_02", type: "server", status: "suspicious", x: 600, y: 250, connections: ["router_01", "client_03"] },
      { id: "server_03", type: "server", status: "attacked", x: 600, y: 350, connections: ["router_02", "client_04"] },
      { id: "database_01", type: "database", status: "normal", x: 600, y: 450, connections: ["router_02", "server_02"] },
      { id: "client_01", type: "client", status: "normal", x: 800, y: 100, connections: ["server_01"] },
      { id: "client_02", type: "client", status: "normal", x: 800, y: 200, connections: ["server_01"] },
      { id: "client_03", type: "client", status: "suspicious", x: 800, y: 300, connections: ["server_02"] },
      { id: "client_04", type: "client", status: "attacked", x: 800, y: 400, connections: ["server_03"] },
    ];

    // Generate nodes based on topology
    networkTopology.forEach((nodeData) => {
      const traffic = Math.floor(Math.random() * 8000) + 2000;
      
      nodes.push({
        id: nodeData.id,
        type: "custom",
        position: {
          x: nodeData.x,
          y: nodeData.y,
        },
        data: {
          label: nodeData.id.toUpperCase(),
          type: nodeData.type,
          status: nodeData.status,
          traffic: traffic,
        },
      });
    });

    // Generate edges based on topology with realistic traffic patterns
    let edgeId = 0;
    networkTopology.forEach((nodeData) => {
      nodeData.connections.forEach((targetId) => {
        // Determine edge type based on source and target status
        const sourceNode = networkTopology.find(n => n.id === nodeData.id);
        const targetNode = networkTopology.find(n => n.id === targetId);
        
        let edgeType = "normal";
        if (sourceNode?.status === "attacked" || targetNode?.status === "attacked") {
          edgeType = "attack";
        } else if (sourceNode?.status === "suspicious" || targetNode?.status === "suspicious") {
          edgeType = "suspicious";
        }

        // Add bidirectional edges for realistic network flow
        edges.push({
          id: `edge_${edgeId++}`,
          source: nodeData.id,
          target: targetId,
          type: "simple", // Using simple edge for testing
          data: { 
            type: edgeType,
            traffic: Math.floor(Math.random() * 5000) + 1000,
            speed: edgeType === "attack" ? 0.03 : edgeType === "suspicious" ? 0.02 : 0.015
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: edgeType === "attack" ? "#ff0000" : edgeType === "suspicious" ? "#ff8800" : "#00aa44",
          },
        });
      });
    });

    console.log(`Generated ${nodes.length} nodes and ${edges.length} edges for ${country}`);
    console.log('Sample edges:', edges.slice(0, 3));
    return { nodes, edges };
  };

  const initialData = useMemo(() => generateNetworkData(), [country]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Update stats when data changes
  useEffect(() => {
    const attackCount = edges.filter((e) => e.data?.type === "attack").length;
    const suspiciousCount = edges.filter((e) => e.data?.type === "suspicious").length;
    const totalTraffic = edges.reduce((sum, e) => sum + (e.data?.traffic || 0), 0);
    const activeFlows = edges.filter((e) => e.data?.type === "normal").length;
    
    setStats({
      totalNodes: nodes.length,
      totalEdges: edges.length,
      activeFlows: activeFlows,
      totalTraffic: totalTraffic,
      threatLevel: attackCount > 3 ? "High" : attackCount > 1 ? "Medium" : "Low",
    });
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="relative w-full h-screen bg-white">
      {/* Clean Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-black">{country}</h1>
              <p className="text-sm text-gray-500">Network Flow Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* React Flow */}
      <div className="w-full" style={{ height: "calc(100vh - 100px)", marginTop: "100px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#f0f0f0" />
          <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        </ReactFlow>
      </div>

      {/* Stats Panel */}
      <div className="absolute top-24 left-8 z-50">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm min-w-[240px]">
          <h2 className="text-lg font-semibold text-black mb-4">Network Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Nodes</span>
              <span className="text-sm font-medium text-black">{stats.totalNodes}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Connections</span>
              <span className="text-sm font-medium text-black">{stats.totalEdges}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Flows</span>
              <span className="text-sm font-medium text-black">{stats.activeFlows}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Traffic</span>
              <span className="text-sm font-medium text-black">{stats.totalTraffic.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Threat Level</span>
              <span className={`text-sm font-medium ${
                stats.threatLevel === "High" ? "text-black" :
                stats.threatLevel === "Medium" ? "text-gray-700" :
                "text-gray-500"
              }`}>
                {stats.threatLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="absolute bottom-8 left-8 right-8 z-50 bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-black">{selectedNode.data.label}</h3>
              <p className="text-sm text-gray-500 capitalize">{selectedNode.data.type}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Status</div>
              <div className={`text-sm font-medium mt-1 capitalize ${
                selectedNode.data.status === "normal" ? "text-black" :
                selectedNode.data.status === "suspicious" ? "text-gray-600" :
                "text-black"
              }`}>
                {selectedNode.data.status}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Traffic</div>
              <div className="text-sm font-medium mt-1 text-black">{selectedNode.data.traffic.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 right-8 z-50 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-black mb-3">Flow Types</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-300"></div>
            <span className="text-gray-600">Normal Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-gray-600"></div>
            <span className="text-gray-600">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-black border-dashed border-t border-black"></div>
            <span className="text-gray-600">Attack Flow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
