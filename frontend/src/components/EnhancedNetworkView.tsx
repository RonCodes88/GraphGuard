"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { networkDataService, NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";

interface EnhancedNetworkViewProps {
  country: string;
  onBack: () => void;
}

interface NetworkStats {
  totalPackets: number;
  packetsPerSecond: number;
  activeAttacks: number;
  blockedThreats: number;
  threatLevel: "Low" | "Medium" | "High";
}

interface D3Node extends NetworkNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Edge extends NetworkEdge {
  source: D3Node | string;
  target: D3Node | string;
}

export default function EnhancedNetworkView({ country, onBack }: EnhancedNetworkViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [networkData, setNetworkData] = useState<NetworkTrafficData | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [stats, setStats] = useState<NetworkStats>({
    totalPackets: 0,
    packetsPerSecond: 0,
    activeAttacks: 0,
    blockedThreats: 0,
    threatLevel: "Low",
  });
  const [loading, setLoading] = useState(true);
  const [useStaticLayout, setUseStaticLayout] = useState(false);

  // Fetch network data
  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      const data = await networkDataService.getCountryNetworkData(country);
      
      // Validate and sanitize the data
      if (!data || !data.nodes || !data.edges) {
        throw new Error("Invalid data structure received");
      }
      
      // Ensure all nodes have required properties
      const sanitizedNodes = data.nodes.map(node => ({
        id: node.id || `node_${Math.random().toString(36).substr(2, 9)}`,
        ip: node.ip || `192.168.1.${Math.floor(Math.random() * 255)}`,
        node_type: node.node_type || "server",
        status: node.status || "normal",
        traffic_volume: node.traffic_volume || Math.floor(Math.random() * 10000) + 1000,
        city: node.city || "Unknown",
        country: node.country || country,
      }));
      
      // Ensure all edges have required properties
      const sanitizedEdges = data.edges.map(edge => ({
        id: edge.id || `edge_${Math.random().toString(36).substr(2, 9)}`,
        source_id: edge.source_id || sanitizedNodes[0]?.id,
        target_id: edge.target_id || sanitizedNodes[1]?.id,
        connection_type: edge.connection_type || "normal",
        packet_count: edge.packet_count || Math.floor(Math.random() * 5000) + 1000,
      }));
      
      const sanitizedData = {
        ...data,
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
      };
      
      setNetworkData(sanitizedData);
      
      // Update stats
      const totalPackets = sanitizedEdges.reduce((sum, e) => sum + e.packet_count, 0);
      const attackCount = sanitizedData.attack_count || 0;
      
      setStats({
        totalPackets: totalPackets,
        packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
        activeAttacks: attackCount,
        blockedThreats: Math.floor(Math.random() * 10),
        threatLevel: attackCount > 3 ? "High" : attackCount > 1 ? "Medium" : "Low",
      });
    } catch (error) {
      console.error("Failed to fetch network data:", error);
      try {
        const demoData = networkDataService.generateDemoNetworkData(country);
        console.log("Using demo data:", demoData);
        setNetworkData(demoData);
      } catch (demoError) {
        console.error("Failed to generate demo data:", demoError);
        // Create minimal fallback data
        const fallbackData = {
          country: country,
          timestamp: new Date().toISOString(),
          nodes: [
            {
              id: "fallback_node_1",
              ip: "192.168.1.1",
              country: country,
              city: "Unknown",
              latitude: 0,
              longitude: 0,
              node_type: "server",
              status: "normal",
              traffic_volume: 1000,
              last_seen: new Date().toISOString()
            },
            {
              id: "fallback_node_2", 
              ip: "192.168.1.2",
              country: country,
              city: "Unknown",
              latitude: 0,
              longitude: 0,
              node_type: "client",
              status: "normal",
              traffic_volume: 500,
              last_seen: new Date().toISOString()
            }
          ],
          edges: [
            {
              id: "fallback_edge_1",
              source_id: "fallback_node_1",
              target_id: "fallback_node_2",
              connection_type: "normal",
              bandwidth: 100,
              latency: 10,
              packet_count: 1000
            }
          ],
          total_traffic: 1500,
          attack_count: 0,
          suspicious_count: 0,
          normal_count: 1
        };
        setNetworkData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize network visualization
  useEffect(() => {
    if (!networkData || !svgRef.current || !containerRef.current) {
      console.log("Missing required data or refs:", { networkData: !!networkData, svgRef: !!svgRef.current, containerRef: !!containerRef.current });
      return;
    }

    console.log("Initializing network visualization with data:", networkData);

    // Validate data structure
    if (!networkData.nodes || !networkData.edges || 
        !Array.isArray(networkData.nodes) || !Array.isArray(networkData.edges)) {
      console.error("Invalid network data structure:", networkData);
      return;
    }

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    // Clear previous visualization
    svg.selectAll("*").remove();

    // Create main group
    const g = svg.append("g");

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Ensure nodes have proper structure
    const validNodes = networkData.nodes.filter(node => node && node.id);
    const validEdges = networkData.edges.filter(edge => 
      edge && edge.source_id && edge.target_id &&
      validNodes.some(n => n.id === edge.source_id) &&
      validNodes.some(n => n.id === edge.target_id)
    );

    if (validNodes.length === 0) {
      console.error("No valid nodes found");
      return;
    }

    // Create a map for quick node lookup
    const nodeMap = new Map(validNodes.map(node => [node.id, node]));

    // Convert edges to reference actual node objects instead of IDs
    const edgesWithNodes = validEdges.map(edge => ({
      ...edge,
      source: nodeMap.get(edge.source_id),
      target: nodeMap.get(edge.target_id)
    })).filter(edge => edge.source && edge.target);

    console.log(`Creating simulation with ${validNodes.length} nodes and ${edgesWithNodes.length} edges`);

    let simulation: d3.Simulation<D3Node, D3Edge> | null = null;

    if (useStaticLayout) {
      // Use static circular layout
      const radius = Math.min(width, height) * 0.3;
      const centerX = width / 2;
      const centerY = height / 2;
      
      validNodes.forEach((node, index) => {
        const angle = (index / validNodes.length) * Math.PI * 2;
        node.x = centerX + Math.cos(angle) * radius;
        node.y = centerY + Math.sin(angle) * radius;
        node.vx = 0;
        node.vy = 0;
      });
    } else {
      // Create force simulation with stable parameters
      simulation = d3.forceSimulation<D3Node>(validNodes as D3Node[])
        .force("link", d3.forceLink<D3Node, D3Edge>(edgesWithNodes as D3Edge[])
          .id((d: D3Node) => d.id)
          .distance(150) // Increased distance for more stable layout
          .strength(0.1) // Reduced strength to prevent bouncing
        )
        .force("charge", d3.forceManyBody().strength(-300)) // Reduced repulsion
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(50)) // Increased collision radius
        .alphaDecay(0.05) // Faster decay to stop simulation sooner
        .velocityDecay(0.8) // Higher velocity decay to reduce bouncing
        .alpha(0.3); // Start with lower alpha for gentler movement
    }

    // Create arrow markers for edges
    const defs = svg.append("defs");
    
    // Normal flow arrow
    defs.append("marker")
      .attr("id", "arrow-normal")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#00ff88");

    // Attack flow arrow
    defs.append("marker")
      .attr("id", "arrow-attack")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#ff0000");

    // Suspicious flow arrow
    defs.append("marker")
      .attr("id", "arrow-suspicious")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#ffaa00");

    // Create edges
    const edges = g.append("g")
      .attr("class", "edges")
      .selectAll("line")
      .data(edgesWithNodes)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        switch (d.connection_type) {
          case "attack": return "#ff0000";
          case "suspicious": return "#ffaa00";
          default: return "#00ff88";
        }
      })
      .attr("stroke-width", (d) => Math.max(2, Math.min(8, d.packet_count / 1000)))
      .attr("stroke-opacity", (d) => d.connection_type === "attack" ? 0.9 : 0.6)
      .attr("stroke-dasharray", (d) => d.connection_type === "attack" ? "8,4" : "none")
      .attr("marker-end", (d) => {
        switch (d.connection_type) {
          case "attack": return "url(#arrow-attack)";
          case "suspicious": return "url(#arrow-suspicious)";
          default: return "url(#arrow-normal)";
        }
      });

    // No animated particles - keeping it static

    // Create nodes
    const nodes = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(validNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer");

    // Add node circles with different shapes based on type
    nodes.each(function(d) {
      const nodeGroup = d3.select(this);
      
      // Main node circle
      const circle = nodeGroup.append("circle")
        .attr("r", (d) => Math.max(15, Math.min(35, d.traffic_volume / 1000)))
        .attr("fill", (d) => {
          switch (d.status) {
            case "attacked": return "#ff0000";
            case "suspicious": return "#ffaa00";
            case "blocked": return "#666666";
            default: return "#00ff88";
          }
        })
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .attr("opacity", 0.9);

      // No pulsing animation - keeping it static

      // Add node type icon
      const icon = nodeGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#ffffff")
        .text((d) => {
          switch (d.node_type) {
            case "server": return "🖥️";
            case "firewall": return "🛡️";
            case "router": return "🔀";
            case "database": return "🗄️";
            default: return "💻";
          }
        });

      // Add node label
      const label = nodeGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "2.5em")
        .attr("font-family", "Arial, sans-serif")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("fill", "#ffffff")
        .text((d) => d.ip.split('.').slice(-1)[0]); // Show last octet of IP
    });

    // Add hover effects
    nodes
      .on("mouseover", function(event, d) {
        setHoveredNode(d);
        
        // Highlight connected edges
        edges
          .attr("stroke-opacity", (edge) => 
            edge.source_id === d.id || edge.target_id === d.id ? 1 : 0.3
          );
        
        // Highlight connected nodes
        nodes
          .attr("opacity", (node) => 
            node.id === d.id || 
            edgesWithNodes.some(edge => 
              (edge.source_id === d.id && edge.target_id === node.id) ||
              (edge.target_id === d.id && edge.source_id === node.id)
            ) ? 1 : 0.3
          );
      })
      .on("mouseout", function() {
        setHoveredNode(null);
        
        // Reset all elements
        edges.attr("stroke-opacity", (d) => d.connection_type === "attack" ? 0.9 : 0.6);
        nodes.attr("opacity", 1);
      })
      .on("click", function(event, d) {
        setSelectedNode(d);
      });

    // Function to update positions
    const updatePositions = () => {
      edges
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    };

    if (useStaticLayout) {
      // For static layout, just update positions once
      updatePositions();
    } else {
      // For dynamic layout, use simulation with damping
      let lastPositions = new Map();
      let stableCount = 0;
      
      simulation!.on("tick", () => {
        let hasMoved = false;
        
        edges
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        nodes.attr("transform", (d: any) => {
          // Check if node has moved significantly
          const lastPos = lastPositions.get(d.id);
          if (lastPos) {
            const dx = d.x - lastPos.x;
            const dy = d.y - lastPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 1) { // Threshold for significant movement
              hasMoved = true;
            }
          }
          lastPositions.set(d.id, { x: d.x, y: d.y });
          return `translate(${d.x},${d.y})`;
        });
        
        // Stop simulation if it's been stable for a while
        if (!hasMoved) {
          stableCount++;
          if (stableCount > 10) {
            simulation!.alpha(0); // Stop the simulation completely
          }
        } else {
          stableCount = 0;
        }
      });
    }

    // Fit view after simulation or for static layout
    const fitView = () => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const fullWidth = width;
        const fullHeight = height;
        const widthScale = fullWidth / bounds.width;
        const heightScale = fullHeight / bounds.height;
        const scale = Math.min(widthScale, heightScale) * 0.8;
        const translate = [
          fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
          fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
        ];

        svg.transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    };

    if (useStaticLayout) {
      // For static layout, fit view immediately
      setTimeout(fitView, 100);
    } else {
      // For dynamic layout, fit view after simulation ends
      simulation!.on("end", fitView);
    }

    // Cleanup function
    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [networkData, useStaticLayout]);

  // Fetch data on mount only (no real-time updates)
  useEffect(() => {
    fetchNetworkData();
  }, [country]);

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white hover:bg-gray-200 rounded-lg text-black font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Globe
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{country}</h1>
              <p className="text-gray-400 flex items-center gap-2">
                Network Security Dashboard
                {loading && (
                  <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUseStaticLayout(!useStaticLayout)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                useStaticLayout
                  ? 'bg-white hover:bg-gray-200 text-black'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {useStaticLayout ? 'Static Layout' : 'Dynamic Layout'}
            </button>
          </div>
        </div>
      </div>

      {/* Network Visualization */}
      <div ref={containerRef} className="w-full h-screen">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="bg-black"
        />
      </div>

      {/* Real-time stats panel */}
      <div className="absolute top-24 left-6 z-50 space-y-4">
        <div className="bg-black/95 backdrop-blur-md rounded-xl p-6 border border-gray-700 min-w-[300px]">
          <h2 className="text-xl font-bold text-white mb-4">Real-Time Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Packets:</span>
              <span className="text-white font-mono text-lg">{stats.totalPackets.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Packets/sec:</span>
              <span className="text-white font-mono text-lg">{stats.packetsPerSecond.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Active Attacks:</span>
              <span className={`font-mono text-lg ${stats.activeAttacks > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stats.activeAttacks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Blocked Threats:</span>
              <span className="text-white font-mono text-lg">{stats.blockedThreats}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Threat Level:</span>
              <span className={`font-mono text-lg ${
                stats.threatLevel === "High" ? "text-red-500" :
                stats.threatLevel === "Medium" ? "text-yellow-500" :
                "text-gray-400"
              }`}>
                {stats.threatLevel}
              </span>
            </div>
          </div>
        </div>

        {networkData && (
          <div className="bg-black/95 backdrop-blur-md rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-3">Network Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nodes:</span>
                <span className="text-white">{networkData.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Connections:</span>
                <span className="text-white">{networkData.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Normal:</span>
                <span className="text-gray-400">{networkData.normal_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Suspicious:</span>
                <span className={networkData.suspicious_count > 0 ? "text-yellow-500" : "text-gray-400"}>{networkData.suspicious_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Under Attack:</span>
                <span className={networkData.attack_count > 0 ? "text-red-500" : "text-gray-400"}>{networkData.attack_count}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute z-50 pointer-events-none bg-black/95 backdrop-blur-md rounded-lg p-4 border border-gray-700 min-w-[250px]">
          <div className="text-white font-bold text-lg mb-2">{hoveredNode.ip}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="text-white">{hoveredNode.node_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className={`font-medium ${
                hoveredNode.status === "normal" ? "text-gray-400" :
                hoveredNode.status === "suspicious" ? "text-yellow-500" :
                hoveredNode.status === "attacked" ? "text-red-500" :
                "text-gray-300"
              }`}>
                {hoveredNode.status.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Traffic:</span>
              <span className="text-white">{hoveredNode.traffic_volume.toLocaleString()} pkts</span>
            </div>
            {hoveredNode.city && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="text-white">{hoveredNode.city}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected node details */}
      {selectedNode && (
        <div className="absolute bottom-6 left-6 right-6 z-50 bg-black/95 backdrop-blur-md rounded-xl p-6 border border-gray-700 max-w-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-white">{selectedNode.ip}</h3>
              <p className="text-gray-500">{selectedNode.city}, {selectedNode.country}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-gray-500 text-sm">Node Type</div>
              <div className="text-white font-medium mt-1">{selectedNode.node_type}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Status</div>
              <div className={`font-medium mt-1 ${
                selectedNode.status === "normal" ? "text-gray-400" :
                selectedNode.status === "suspicious" ? "text-yellow-500" :
                selectedNode.status === "attacked" ? "text-red-500" :
                "text-gray-300"
              }`}>
                {selectedNode.status.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Traffic Volume</div>
              <div className="text-white font-medium mt-1">{selectedNode.traffic_volume.toLocaleString()} packets</div>
            </div>
          </div>
          {networkData && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm text-gray-500">
                Connected to {networkData.edges.filter(e => e && e.source_id === selectedNode.id || e.target_id === selectedNode.id).length} other nodes
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-50 bg-black/95 backdrop-blur-md rounded-xl p-4 border border-gray-700">
        <h4 className="text-white font-bold mb-3">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span className="text-gray-400">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-400">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-400">Under Attack</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-gray-400">Blocked</span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700">
          <h5 className="text-white font-medium mb-2">Node Types</h5>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span>🖥️</span>
              <span className="text-gray-400">Server</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🛡️</span>
              <span className="text-gray-400">Firewall</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔀</span>
              <span className="text-gray-400">Router</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🗄️</span>
              <span className="text-gray-400">Database</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
