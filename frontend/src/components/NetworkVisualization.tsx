"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface NetworkNode {
  id: string;
  ip: string;
  country: string;
  city?: string;
  latitude: number;
  longitude: number;
  node_type: string;
  status: string;
  traffic_volume: number;
  last_seen: string;
}

interface NetworkEdge {
  id: string;
  source_id: string;
  target_id: string;
  connection_type: string;
  bandwidth: number;
  latency: number;
  packet_count: number;
  attack_type?: string;
}

interface NetworkTrafficData {
  country: string;
  timestamp: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  total_traffic: number;
  attack_count: number;
  suspicious_count: number;
  normal_count: number;
}

interface NetworkVisualizationProps {
  data: NetworkTrafficData | null;
  visible: boolean;
  onNodeClick?: (node: NetworkNode) => void;
  onEdgeClick?: (edge: NetworkEdge) => void;
}

export default function NetworkVisualization({ 
  data, 
  visible, 
  onNodeClick, 
  onEdgeClick 
}: NetworkVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<NetworkEdge | null>(null);

  useEffect(() => {
    if (!containerRef.current || !visible) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    scene.fog = new THREE.FogExp2(0x000011, 0.1);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 50);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    containerRef.current.appendChild(renderer.domElement);

    // Add orbit controls
    const { OrbitControls } = require("three/examples/jsm/controls/OrbitControls.js");
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [visible]);

  useEffect(() => {
    if (!data || !sceneRef.current) return;

    // Clear existing network objects
    const objectsToRemove: THREE.Object3D[] = [];
    sceneRef.current.traverse((obj) => {
      if (obj.userData.isNetworkObject) {
        objectsToRemove.push(obj);
      }
    });
    objectsToRemove.forEach((obj) => {
      sceneRef.current?.remove(obj);
    });

    // Create network visualization
    createNetworkVisualization(data);

  }, [data]);

  const createNetworkVisualization = (networkData: NetworkTrafficData) => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const nodes = networkData.nodes;
    const edges = networkData.edges;

    // Create node lookup map
    const nodeMap = new Map<string, NetworkNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Create nodes
    nodes.forEach((node) => {
      const nodeMesh = createNodeMesh(node);
      nodeMesh.userData.isNetworkObject = true;
      nodeMesh.userData.nodeData = node;
      scene.add(nodeMesh);
    });

    // Create edges
    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source_id);
      const targetNode = nodeMap.get(edge.target_id);
      
      if (sourceNode && targetNode) {
        const edgeMesh = createEdgeMesh(sourceNode, targetNode, edge);
        edgeMesh.userData.isNetworkObject = true;
        edgeMesh.userData.edgeData = edge;
        scene.add(edgeMesh);
      }
    });

    // Add mouse interaction
    addMouseInteraction();
  };

  const createNodeMesh = (node: NetworkNode): THREE.Object3D => {
    // Node size based on traffic volume
    const size = Math.max(0.5, Math.min(3, node.traffic_volume / 3000));
    
    // Node color based on status
    let color = 0x00ff00; // Green for normal
    switch (node.status) {
      case "suspicious":
        color = 0xffaa00; // Orange
        break;
      case "attacked":
        color = 0xff0000; // Red
        break;
      case "blocked":
        color = 0x666666; // Gray
        break;
    }

    // Node shape based on type
    let geometry: THREE.BufferGeometry;
    switch (node.node_type) {
      case "server":
        geometry = new THREE.BoxGeometry(size, size, size);
        break;
      case "firewall":
        geometry = new THREE.ConeGeometry(size, size * 2, 8);
        break;
      case "router":
        geometry = new THREE.CylinderGeometry(size, size, size * 2, 8);
        break;
      default: // client
        geometry = new THREE.SphereGeometry(size, 16, 16);
    }

    const material = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Position based on latitude/longitude (simplified projection)
    const x = (node.longitude / 180) * 30;
    const y = (node.latitude / 90) * 30;
    const z = Math.random() * 10 - 5; // Random depth
    mesh.position.set(x, y, z);

    // Add pulsing animation for attacked nodes
    if (node.status === "attacked") {
      mesh.userData.update = (t: number) => {
        const scale = 1 + Math.sin(t * 0.005) * 0.3;
        mesh.scale.setScalar(scale);
      };
    }

    return mesh;
  };

  const createEdgeMesh = (
    sourceNode: NetworkNode,
    targetNode: NetworkNode,
    edge: NetworkEdge
  ): THREE.Object3D => {
    // Edge color based on connection type
    let color = 0x00ff00; // Green for normal
    let opacity = 0.3;
    
    switch (edge.connection_type) {
      case "suspicious":
        color = 0xffaa00; // Orange
        opacity = 0.6;
        break;
      case "attack":
        color = 0xff0000; // Red
        opacity = 0.8;
        break;
    }

    // Edge thickness based on bandwidth
    const thickness = Math.max(0.1, Math.min(2, edge.bandwidth / 500));

    const sourcePos = new THREE.Vector3(
      (sourceNode.longitude / 180) * 30,
      (sourceNode.latitude / 90) * 30,
      Math.random() * 10 - 5
    );
    
    const targetPos = new THREE.Vector3(
      (targetNode.longitude / 180) * 30,
      (targetNode.latitude / 90) * 30,
      Math.random() * 10 - 5
    );

    const geometry = new THREE.BufferGeometry().setFromPoints([sourcePos, targetPos]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      linewidth: thickness
    });

    const line = new THREE.Line(geometry, material);
    
    // Add flowing animation for attack connections
    if (edge.connection_type === "attack") {
      line.userData.update = (t: number) => {
        material.opacity = 0.5 + Math.sin(t * 0.01) * 0.3;
      };
    }

    return line;
  };

  const addMouseInteraction = () => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);
      
      const intersects = raycaster.intersectObjects(sceneRef.current!.children, true);
      
      // Reset previous hover
      setHoveredNode(null);
      setHoveredEdge(null);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.nodeData) {
          setHoveredNode(object.userData.nodeData);
        } else if (object.userData.edgeData) {
          setHoveredEdge(object.userData.edgeData);
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current!);
      
      const intersects = raycaster.intersectObjects(sceneRef.current!.children, true);
      
      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.nodeData && onNodeClick) {
          onNodeClick(object.userData.nodeData);
        } else if (object.userData.edgeData && onEdgeClick) {
          onEdgeClick(object.userData.edgeData);
        }
      }
    };

    rendererRef.current.domElement.addEventListener("mousemove", handleMouseMove);
    rendererRef.current.domElement.addEventListener("click", handleClick);

    return () => {
      rendererRef.current?.domElement.removeEventListener("mousemove", handleMouseMove);
      rendererRef.current?.domElement.removeEventListener("click", handleClick);
    };
  };

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Hover tooltips */}
      {hoveredNode && (
        <div className="absolute pointer-events-none z-50 bg-slate-900/95 backdrop-blur-md rounded-lg p-3 border border-purple-500/30">
          <div className="text-purple-300 font-bold">{hoveredNode.ip}</div>
          <div className="text-sm text-slate-300">{hoveredNode.city}, {hoveredNode.country}</div>
          <div className="text-xs text-slate-400">
            Type: {hoveredNode.node_type} | Status: {hoveredNode.status}
          </div>
          <div className="text-xs text-slate-400">
            Traffic: {hoveredNode.traffic_volume.toLocaleString()} packets
          </div>
        </div>
      )}
      
      {hoveredEdge && (
        <div className="absolute pointer-events-none z-50 bg-slate-900/95 backdrop-blur-md rounded-lg p-3 border border-purple-500/30">
          <div className="text-purple-300 font-bold">Connection</div>
          <div className="text-sm text-slate-300">
            {hoveredEdge.source_id} → {hoveredEdge.target_id}
          </div>
          <div className="text-xs text-slate-400">
            Type: {hoveredEdge.connection_type}
          </div>
          {hoveredEdge.attack_type && (
            <div className="text-xs text-red-400">
              Attack: {hoveredEdge.attack_type}
            </div>
          )}
          <div className="text-xs text-slate-400">
            Bandwidth: {hoveredEdge.bandwidth} Mbps | Latency: {hoveredEdge.latency.toFixed(1)}ms
          </div>
        </div>
      )}
    </div>
  );
}
