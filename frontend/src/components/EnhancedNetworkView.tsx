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

  // Human-in-the-Loop State
  const [agentStatus, setAgentStatus] = useState({
    orchestrator: { status: 'idle', progress: 0 },
    detector: { status: 'idle', progress: 0 },
    investigator: { status: 'idle', progress: 0 },
    monitor: { status: 'idle', progress: 0 },
    judge: { status: 'idle', progress: 0 },
    mitigator: { status: 'idle', progress: 0 }
  });

  const [isAgentProcessing, setIsAgentProcessing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [agentResults, setAgentResults] = useState<any>(null);
  const [attackedNodeAnalysis, setAttackedNodeAnalysis] = useState<any>(null);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [isAnalyzingNode, setIsAnalyzingNode] = useState(false);
  const [fastAnalysisMode, setFastAnalysisMode] = useState(false);

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
        latitude: node.latitude || 0,
        longitude: node.longitude || 0,
        last_seen: node.last_seen || new Date().toISOString(),
      }));
      
      // Ensure all edges have required properties
      const sanitizedEdges = data.edges.map(edge => ({
        id: edge.id || `edge_${Math.random().toString(36).substr(2, 9)}`,
        source_id: edge.source_id || sanitizedNodes[0]?.id,
        target_id: edge.target_id || sanitizedNodes[1]?.id,
        connection_type: edge.connection_type || "normal",
        packet_count: edge.packet_count || Math.floor(Math.random() * 5000) + 1000,
        bandwidth: edge.bandwidth || Math.floor(Math.random() * 1000) + 100,
        latency: edge.latency || Math.floor(Math.random() * 50) + 10,
      }));
      
      const sanitizedData = {
        ...data,
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
      };
      
      setNetworkData(sanitizedData);
      
      // Debug: Log attacked nodes
      const attackedNodes = sanitizedData.nodes.filter(n => n.status === "attacked");
      console.log(`🔴 Found ${attackedNodes.length} attacked nodes:`, attackedNodes);
      
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

  // Process network data with AI agents
  const processWithAgents = async () => {
    if (!networkData) return;
    
    setIsAgentProcessing(true);
    setAgentResults(null);
    
    try {
      // Reset all agent statuses
      setAgentStatus({
        orchestrator: { status: 'processing', progress: 0 },
        detector: { status: 'idle', progress: 0 },
        investigator: { status: 'idle', progress: 0 },
        monitor: { status: 'idle', progress: 0 },
        judge: { status: 'idle', progress: 0 },
        mitigator: { status: 'idle', progress: 0 }
      });

      // Optimized agent processing with parallel execution and reduced durations
      const baseAgents = [
        { name: 'orchestrator', duration: 300, fastDuration: 100 },
        { name: 'detector', duration: 500, fastDuration: 150 },
        { name: 'investigator', duration: 700, fastDuration: 250 },
        { name: 'monitor', duration: 200, fastDuration: 80 },
        { name: 'judge', duration: 400, fastDuration: 150 },
        { name: 'mitigator', duration: 300, fastDuration: 100 }
      ];
      
      const agents = baseAgents.map(agent => ({
        ...agent,
        duration: fastAnalysisMode ? agent.fastDuration : agent.duration
      }));
      
      // Start orchestrator first
      setCurrentAgent('orchestrator');
      setAgentStatus(prev => ({
        ...prev,
        orchestrator: { status: 'processing', progress: 0 }
      }));
      
      // Run orchestrator
      await runAgentWithProgress('orchestrator', 300);
      
      // Run detector and monitor in parallel
      setCurrentAgent('detector & monitor');
      const parallelAgents1 = ['detector', 'monitor'];
      await Promise.all(parallelAgents1.map(agentName => 
        runAgentWithProgress(agentName, agents.find(a => a.name === agentName)!.duration)
      ));
      
      // Run investigator
      setCurrentAgent('investigator');
      await runAgentWithProgress('investigator', 700);
      
      // Run judge and mitigator in parallel
      setCurrentAgent('judge & mitigator');
      const parallelAgents2 = ['judge', 'mitigator'];
      await Promise.all(parallelAgents2.map(agentName => 
        runAgentWithProgress(agentName, agents.find(a => a.name === agentName)!.duration)
      ));
      
      // Helper function to run agent with progress updates
      async function runAgentWithProgress(agentName: string, duration: number) {
        setAgentStatus(prev => ({
          ...prev,
          [agentName]: { status: 'processing', progress: 0 }
        }));
        
        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / duration) * 100);
          
          setAgentStatus(prev => ({
            ...prev,
            [agentName]: { status: 'processing', progress }
          }));
        }, 100); // Reduced frequency from 50ms to 100ms
        
        await new Promise(resolve => setTimeout(resolve, duration));
        clearInterval(interval);
        
        setAgentStatus(prev => ({
          ...prev,
          [agentName]: { status: 'completed', progress: 100 }
        }));
      }
      
      // Call the backend API
      const response = await fetch('http://localhost:8000/api/agents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            nodes: networkData.nodes,
            edges: networkData.edges
          }
        })
      });
      
      const result = await response.json();
      setAgentResults(result);
      console.log('Agent analysis result:', result);
      
    } catch (error) {
      console.error('Agent processing failed:', error);
      setAgentStatus(prev => ({
        ...prev,
        [currentAgent || 'orchestrator']: { status: 'error', progress: 0 }
      }));
    } finally {
      setIsAgentProcessing(false);
      setCurrentAgent(null);
    }
  };

  // Analyze specific attacked node with AI agents
  const analyzeAttackedNode = async (node: NetworkNode) => {
    if (!networkData) return;
    
    setIsAnalyzingNode(true);
    setAttackedNodeAnalysis(null);
    setShowActionPanel(true);
    
    // Reset all agent statuses
    setAgentStatus({
      orchestrator: { status: 'processing', progress: 0 },
      detector: { status: 'idle', progress: 0 },
      investigator: { status: 'idle', progress: 0 },
      monitor: { status: 'idle', progress: 0 },
      judge: { status: 'idle', progress: 0 },
      mitigator: { status: 'idle', progress: 0 }
    });
    
    try {
      // Optimized agent processing with parallel execution and reduced durations
      const baseAgents = [
        { name: 'orchestrator', duration: 400, fastDuration: 150, description: 'Coordinating analysis workflow' },
        { name: 'detector', duration: 600, fastDuration: 200, description: 'Detecting threats and anomalies' },
        { name: 'investigator', duration: 800, fastDuration: 300, description: 'Deep forensic investigation' },
        { name: 'monitor', duration: 300, fastDuration: 100, description: 'Monitoring network health' },
        { name: 'judge', duration: 500, fastDuration: 200, description: 'Making final security decision' },
        { name: 'mitigator', duration: 400, fastDuration: 150, description: 'Preparing mitigation actions' }
      ];
      
      const agents = baseAgents.map(agent => ({
        ...agent,
        duration: fastAnalysisMode ? agent.fastDuration : agent.duration
      }));
      
      // Start orchestrator first
      setCurrentAgent('orchestrator');
      setAgentStatus(prev => ({
        ...prev,
        orchestrator: { status: 'processing', progress: 0 }
      }));
      
      // Run orchestrator
      await runAgentWithProgress('orchestrator', 400);
      
      // Run detector and monitor in parallel
      setCurrentAgent('detector & monitor');
      const parallelAgents1 = ['detector', 'monitor'];
      await Promise.all(parallelAgents1.map(agentName => 
        runAgentWithProgress(agentName, agents.find(a => a.name === agentName)!.duration)
      ));
      
      // Run investigator
      setCurrentAgent('investigator');
      await runAgentWithProgress('investigator', 800);
      
      // Run judge and mitigator in parallel
      setCurrentAgent('judge & mitigator');
      const parallelAgents2 = ['judge', 'mitigator'];
      await Promise.all(parallelAgents2.map(agentName => 
        runAgentWithProgress(agentName, agents.find(a => a.name === agentName)!.duration)
      ));
      
      // Helper function to run agent with progress updates
      async function runAgentWithProgress(agentName: string, duration: number) {
        setAgentStatus(prev => ({
          ...prev,
          [agentName]: { status: 'processing', progress: 0 }
        }));
        
        const startTime = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / duration) * 100);
          
          setAgentStatus(prev => ({
            ...prev,
            [agentName]: { status: 'processing', progress }
          }));
        }, 100); // Reduced frequency from 50ms to 100ms
        
        await new Promise(resolve => setTimeout(resolve, duration));
        clearInterval(interval);
        
        setAgentStatus(prev => ({
          ...prev,
          [agentName]: { status: 'completed', progress: 100 }
        }));
      }
      
      // Filter edges related to this attacked node
      const relatedEdges = networkData.edges.filter(
        edge => edge.source_id === node.id || edge.target_id === node.id
      );
      
      // Create focused dataset for this node
      const focusedData = {
        nodes: [node],
        edges: relatedEdges,
        context: {
          analysis_type: "attacked_node_analysis",
          target_node: node.id,
          node_ip: node.ip,
          node_status: node.status
        }
      };
      
      console.log(`Analyzing attacked node: ${node.ip} with ${relatedEdges.length} related edges`);
      
      // Call the backend API for focused analysis
      const response = await fetch('http://localhost:8000/api/agents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: focusedData,
          context: {
            analysis_type: "attacked_node_focus",
            target_node_id: node.id,
            target_node_ip: node.ip
          }
        })
      });
      
      const result = await response.json();
      setAttackedNodeAnalysis(result);
      console.log('Attacked node analysis result:', result);
      
    } catch (error) {
      console.error('Attacked node analysis failed:', error);
      setAttackedNodeAnalysis({
        success: false,
        error: 'Analysis failed',
        result: null
      });
    } finally {
      setIsAnalyzingNode(false);
      setCurrentAgent(null);
    }
  };

  // Execute mitigation action
  const executeAction = async (action: string, nodeId: string) => {
    try {
      console.log(`Executing action: ${action} on node: ${nodeId}`);
      
      // Here you would typically call your backend to execute the action
      // For demo purposes, we'll simulate the action
      
      const actionResults = {
        block_ip: "🚫 IP address blocked successfully",
        throttle_traffic: "⏳ Traffic throttled to 50%",
        notify_dev: "📧 Development team notified",
        ignore: "👁️ Monitoring continued, no action taken"
      };
      
      // Update the node status in the network data
      if (networkData && action !== 'ignore') {
        const updatedNodes = networkData.nodes.map(n => 
          n.id === nodeId ? { ...n, status: 'blocked' } : n
        );
        setNetworkData({ ...networkData, nodes: updatedNodes });
      }
      
      alert(actionResults[action as keyof typeof actionResults]);
      setShowActionPanel(false);
      setAttackedNodeAnalysis(null);
      
    } catch (error) {
      console.error('Action execution failed:', error);
      alert('Action execution failed');
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
        (node as D3Node).x = centerX + Math.cos(angle) * radius;
        (node as D3Node).y = centerY + Math.sin(angle) * radius;
        (node as D3Node).vx = 0;
        (node as D3Node).vy = 0;
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
    nodes.each(function(d: D3Node) {
      const nodeGroup = d3.select(this);
      
      // Main node circle
      const circle = nodeGroup.append("circle")
        .attr("r", (d: any) => Math.max(15, Math.min(35, d.traffic_volume / 1000)))
        .attr("fill", (d: any) => {
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
        .text((d: any) => {
          switch (d.node_type) {
            case "server": return "🖥️";
            case "client": return "💻";
            case "router": return "🔀";
            case "firewall": return "🛡️";
            case "load_balancer": return "⚖️";
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
        .text((d: any) => d.ip.split('.').slice(-1)[0]); // Show last octet of IP
    });

    // Add hover effects
    nodes
      .on("mouseover", function(event, d: D3Node) {
        setHoveredNode(d);
        
        // Highlight connected edges
        edges
          .attr("stroke-opacity", (edge) => 
            edge.source_id === d.id || edge.target_id === d.id ? 1 : 0.3
          );
        
        // Highlight connected nodes
        nodes
          .attr("opacity", (node: D3Node) => 
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
        edges.attr("stroke-opacity", (d: any) => d.connection_type === "attack" ? 0.9 : 0.6);
        nodes.attr("opacity", 1);
      })
      .on("click", function(event, d: D3Node) {
        // If it's an attacked node, trigger AI analysis
        if (d.status === "attacked") {
          console.log(`🔴 Clicked attacked node: ${d.ip}`);
          // Run the internal analysis for the modal
          analyzeAttackedNode(d);
        } else {
          // For other nodes, show regular details
          setSelectedNode(d);
        }
      });

    // Function to update positions
    const updatePositions = () => {
      edges
        .attr("x1", (d: any) => (d.source as D3Node).x || 0)
        .attr("y1", (d: any) => (d.source as D3Node).y || 0)
        .attr("x2", (d: any) => (d.target as D3Node).x || 0)
        .attr("y2", (d: any) => (d.target as D3Node).y || 0);

      nodes.attr("transform", (d: D3Node) => `translate(${d.x || 0},${d.y || 0})`);
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
          .attr("x1", (d: any) => (d.source as D3Node).x || 0)
          .attr("y1", (d: any) => (d.source as D3Node).y || 0)
          .attr("x2", (d: any) => (d.target as D3Node).x || 0)
          .attr("y2", (d: any) => (d.target as D3Node).y || 0);

        nodes.attr("transform", (d: D3Node) => {
          // Check if node has moved significantly
          const lastPos = lastPositions.get(d.id);
          if (lastPos) {
            const dx = (d.x || 0) - lastPos.x;
            const dy = (d.y || 0) - lastPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 1) { // Threshold for significant movement
              hasMoved = true;
            }
          }
          lastPositions.set(d.id, { x: d.x || 0, y: d.y || 0 });
          return `translate(${d.x || 0},${d.y || 0})`;
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
              <div className="text-sm text-gray-500 mb-4">
                Connected to {networkData.edges.filter(e => e && e.source_id === selectedNode.id || e.target_id === selectedNode.id).length} other nodes
              </div>
              
              {/* AI Agent Analysis Button */}
              <div className="mt-4">
                <button 
                  onClick={() => analyzeAttackedNode(selectedNode)}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-all bg-blue-600 hover:bg-blue-700 text-white"
                >
                  🤖 Analyze with AI Agents
                </button>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Click to run multi-agent analysis on this node
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-50 bg-black/95 backdrop-blur-md rounded-xl p-6 border border-gray-700 min-w-[280px]">
        <h4 className="text-white font-bold mb-4 text-lg">Legend</h4>
        <div className="space-y-3 text-base">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-gray-400 font-medium">Normal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-400 font-medium">Suspicious</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-400 font-medium">Under Attack</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-gray-400 font-medium">Blocked</span>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-slate-700">
          <h5 className="text-white font-medium mb-3 text-base">Node Types</h5>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">🖥️</span>
              <span className="text-gray-400 font-medium">Server</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💻</span>
              <span className="text-gray-400 font-medium">Client</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔀</span>
              <span className="text-gray-400 font-medium">Router</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <span className="text-gray-400 font-medium">Firewall</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <span className="text-gray-400 font-medium">Load Bal.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🗄️</span>
              <span className="text-gray-400 font-medium">Database</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Panel - Enhanced with Reasoning */}
      <div className="absolute top-4 right-4 bg-black/95 backdrop-blur-md text-white p-4 rounded-lg border border-blue-500/30 min-w-[400px] max-w-[500px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-3">🤖 AI Agents</h3>
        
        {/* Agent Status Grid */}
        <div className="space-y-2 mb-4">
          {Object.entries(agentStatus).map(([agentName, status]) => (
            <div key={agentName} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                status.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                status.status === 'completed' ? 'bg-green-400' :
                status.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
              }`} />
              <span className="text-sm capitalize">{agentName}</span>
              {status.status === 'processing' && (
                <div className="flex-1 bg-gray-600 rounded-full h-2 ml-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Processing Status */}
        {(isAgentProcessing || isAnalyzingNode) && (
          <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-500/30">
            <div className="text-xs text-blue-300 font-medium mb-1">
              🔄 {currentAgent || 'Multi-agent'} analyzing network...
            </div>
            <div className="text-xs text-blue-200">
              {isAnalyzingNode ? 'Attacked node analysis in progress' : 'Multi-agent analysis in progress'}
            </div>
          </div>
        )}

        {/* Attacked Node Analysis Results */}
        {attackedNodeAnalysis && attackedNodeAnalysis.success && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm font-bold text-red-300 mb-2">🚨 Attack Analysis</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Decision:</span>
                  <div className="text-white font-medium">{attackedNodeAnalysis.result?.decision || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Confidence:</span>
                  <div className="text-green-300 font-medium">
                    {attackedNodeAnalysis.confidence ? (attackedNodeAnalysis.confidence * 100).toFixed(1) + '%' : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Agent Reasoning */}
            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/50">
              <h4 className="text-sm font-bold text-blue-300 mb-2">🔍 Agent Reasoning</h4>
              <div className="text-xs text-slate-200 leading-relaxed">
                {attackedNodeAnalysis.explanation || 'No detailed reasoning provided'}
              </div>
            </div>

          </div>
        )}

        {/* General Agent Results */}
        {agentResults && !attackedNodeAnalysis && (
          <div className="mt-3 p-3 bg-green-900/30 rounded-lg border border-green-500/30">
            <div className="font-bold text-green-300 text-xs">✅ Analysis Complete</div>
            <div className="text-green-200 text-xs">Decision: {agentResults.result?.decision}</div>
            <div className="text-green-200 text-xs">Confidence: {(agentResults.confidence * 100).toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Process Button */}
      <button
        onClick={processWithAgents}
        disabled={isAgentProcessing || !networkData}
        className="absolute bottom-4 left-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors font-medium shadow-lg"
      >
        {isAgentProcessing ? (
          <>
            <span className="animate-spin mr-2">🔄</span>
            AI Agents Working...
          </>
        ) : (
          <>
            <span className="mr-2">🤖</span>
            Analyze with AI Agents
          </>
        )}
      </button>

      {/* Attacked Node Analysis Modal */}
      {showActionPanel && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-red-500/50 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-red-300">🚨 Attacked Node Analysis</h2>
              <button
                onClick={() => setShowActionPanel(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isAnalyzingNode ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-blue-300">🤖 AI Agents analyzing the attack...</p>
                <div className="mt-4 space-y-2">
                  {Object.entries(agentStatus).map(([agentName, status]) => (
                    <div key={agentName} className="flex items-center space-x-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        status.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                        status.status === 'completed' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className="capitalize text-slate-300">{agentName}</span>
                      {status.status === 'processing' && (
                        <div className="flex-1 bg-gray-600 rounded-full h-1">
                          <div 
                            className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${status.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : attackedNodeAnalysis ? (
              <div className="space-y-4">
                {/* Analysis Summary */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">🔍 Agents Analysis Results</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-slate-400 text-sm">Decision:</span>
                      <div className="text-white font-medium">{attackedNodeAnalysis.result?.decision || 'Unknown'}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-sm">Confidence:</span>
                      <div className="text-green-300 font-medium">
                        {attackedNodeAnalysis.confidence ? (attackedNodeAnalysis.confidence * 100).toFixed(1) + '%' : 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-slate-400 text-sm">Reasoning:</span>
                    <div className="text-slate-200 text-sm mt-1 bg-slate-700 p-3 rounded">
                      {attackedNodeAnalysis.explanation || 'No reasoning provided'}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">⚡ Take Action</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => executeAction('block_ip', attackedNodeAnalysis.result?.metadata?.target_node_id || '')}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>🚫</span>
                      <span>Block IP</span>
                    </button>
                    <button
                      onClick={() => executeAction('throttle_traffic', attackedNodeAnalysis.result?.metadata?.target_node_id || '')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>⏳</span>
                      <span>Throttle Traffic</span>
                    </button>
                    <button
                      onClick={() => executeAction('notify_dev', attackedNodeAnalysis.result?.metadata?.target_node_id || '')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>📧</span>
                      <span>Notify Dev Team</span>
                    </button>
                    <button
                      onClick={() => executeAction('ignore', attackedNodeAnalysis.result?.metadata?.target_node_id || '')}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>👁️</span>
                      <span>Continue Monitoring</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-300">Failed to analyze the attacked node.</p>
                <button
                  onClick={() => setShowActionPanel(false)}
                  className="mt-4 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
