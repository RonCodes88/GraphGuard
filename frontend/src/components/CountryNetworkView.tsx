"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";

interface CountryNetworkViewProps {
  country: string;
  onBack: () => void;
}

export default function CountryNetworkView({ country, onBack }: CountryNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  
  const [networkData, setNetworkData] = useState<NetworkTrafficData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [stats, setStats] = useState({
    totalPackets: 0,
    packetsPerSecond: 0,
    activeAttacks: 0,
    blockedThreats: 0,
  });

  // Generate realistic network traffic with attacks
  const generateRealisticNetworkData = (): NetworkTrafficData => {
    const attackTypes = [
      "DDoS Volumetric",
      "Port Scan",
      "Botnet C&C",
      "SQL Injection",
      "Cross-Site Scripting",
      "Brute Force",
      "Malware Distribution",
      "Zero-Day Exploit",
      "APT (Advanced Persistent Threat)",
      "Ransomware",
      "Man-in-the-Middle",
      "DNS Tunneling",
    ];

    const nodeTypes = [
      { type: "server", weight: 0.2 },
      { type: "client", weight: 0.5 },
      { type: "router", weight: 0.15 },
      { type: "firewall", weight: 0.1 },
      { type: "load_balancer", weight: 0.05 },
    ];

    const getRandomNodeType = () => {
      const random = Math.random();
      let cumulative = 0;
      for (const { type, weight } of nodeTypes) {
        cumulative += weight;
        if (random < cumulative) return type;
      }
      return "client";
    };

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];

    // Generate 50-100 nodes
    const nodeCount = Math.floor(Math.random() * 51) + 50;

    for (let i = 0; i < nodeCount; i++) {
      const statusRandom = Math.random();
      let status = "normal";
      if (statusRandom > 0.85) status = "attacked";
      else if (statusRandom > 0.70) status = "suspicious";
      else if (statusRandom > 0.95) status = "blocked";

      const node: NetworkNode = {
        id: `node_${country}_${i}`,
        ip: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
        country: country,
        city: `City_${Math.floor(Math.random() * 10)}`,
        latitude: Math.random() * 180 - 90,
        longitude: Math.random() * 360 - 180,
        node_type: getRandomNodeType(),
        status: status,
        traffic_volume: Math.floor(Math.random() * 50000) + 1000,
        last_seen: new Date().toISOString(),
      };
      nodes.push(node);
    }

    // Generate 100-200 edges with realistic attack patterns
    const edgeCount = Math.floor(Math.random() * 101) + 100;

    for (let i = 0; i < edgeCount; i++) {
      const source = nodes[Math.floor(Math.random() * nodes.length)];
      const target = nodes[Math.floor(Math.random() * nodes.length)];

      if (source.id !== target.id) {
        const typeRandom = Math.random();
        let connectionType = "normal";
        let attackType = undefined;

        if (typeRandom > 0.90) {
          connectionType = "attack";
          attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        } else if (typeRandom > 0.75) {
          connectionType = "suspicious";
        }

        const edge: NetworkEdge = {
          id: `edge_${country}_${i}`,
          source_id: source.id,
          target_id: target.id,
          connection_type: connectionType,
          bandwidth: Math.floor(Math.random() * 10000) + 100,
          latency: Math.random() * 200 + 5,
          packet_count: Math.floor(Math.random() * 100000) + 100,
          attack_type: attackType,
        };
        edges.push(edge);
      }
    }

    const totalTraffic = nodes.reduce((sum, node) => sum + node.traffic_volume, 0);
    const attackCount = edges.filter((e) => e.connection_type === "attack").length;
    const suspiciousCount = edges.filter((e) => e.connection_type === "suspicious").length;
    const normalCount = edges.filter((e) => e.connection_type === "normal").length;

    return {
      country: country,
      timestamp: new Date().toISOString(),
      nodes: nodes,
      edges: edges,
      total_traffic: totalTraffic,
      attack_count: attackCount,
      suspicious_count: suspiciousCount,
      normal_count: normalCount,
    };
  };

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.002);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(0, 100, 300);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 500;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(400, 40, 0x00ffff, 0x003333);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Update animations
      scene.traverse((obj: THREE.Object3D) => {
        if (obj.userData.update) {
          obj.userData.update(Date.now());
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Generate and update network data continuously
  useEffect(() => {
    const updateData = () => {
      const newData = generateRealisticNetworkData();
      setNetworkData(newData);
      
      // Update stats
      setStats(prev => ({
        totalPackets: prev.totalPackets + Math.floor(Math.random() * 10000),
        packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
        activeAttacks: newData.attack_count,
        blockedThreats: prev.blockedThreats + Math.floor(Math.random() * 5),
      }));
    };

    updateData();
    const interval = setInterval(updateData, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [country]);

  // Render network visualization
  useEffect(() => {
    if (!networkData || !sceneRef.current) return;

    const scene = sceneRef.current;

    // Clear previous network objects
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if (obj.userData.isNetworkObject) {
        objectsToRemove.push(obj);
      }
    });
    objectsToRemove.forEach((obj: THREE.Object3D) => scene.remove(obj));

    // Create node map for edge connections
    const nodePositions = new Map<string, THREE.Vector3>();

    // Create nodes with force-directed layout
    networkData.nodes.forEach((node, index) => {
      const angle = (index / networkData.nodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 100;
      const height = (Math.random() - 0.5) * 100;

      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      nodePositions.set(node.id, position);

      // Create node mesh
      const size = Math.max(2, Math.min(8, node.traffic_volume / 5000));
      let geometry: THREE.BufferGeometry;

      switch (node.node_type) {
        case "server":
          geometry = new THREE.BoxGeometry(size, size, size);
          break;
        case "firewall":
          geometry = new THREE.OctahedronGeometry(size);
          break;
        case "router":
          geometry = new THREE.CylinderGeometry(size, size, size * 1.5, 6);
          break;
        default:
          geometry = new THREE.SphereGeometry(size, 16, 16);
      }

      let color: number;
      switch (node.status) {
        case "attacked":
          color = 0xff0000;
          break;
        case "suspicious":
          color = 0xffaa00;
          break;
        case "blocked":
          color = 0x666666;
          break;
        default:
          color = 0x00ff88;
      }

      const material = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData.isNetworkObject = true;
      mesh.userData.nodeData = node;

      // Add pulsing animation for attacked nodes
      if (node.status === "attacked") {
        mesh.userData.update = (t: number) => {
          const scale = 1 + Math.sin(t * 0.003) * 0.3;
          mesh.scale.setScalar(scale);
          material.emissiveIntensity = 0.3 + Math.sin(t * 0.005) * 0.3;
        };
      }

      // Add particle system for high traffic nodes
      if (node.traffic_volume > 30000) {
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i++) {
          positions[i] = (Math.random() - 0.5) * size * 3;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
          color: color,
          size: 0.5,
          transparent: true,
          opacity: 0.6,
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.position.copy(position);
        particles.userData.isNetworkObject = true;
        
        particles.userData.update = (t: number) => {
          particles.rotation.y = t * 0.001;
        };

        scene.add(particles);
      }

      scene.add(mesh);
    });

    // Create edges
    networkData.edges.forEach((edge) => {
      const sourcePos = nodePositions.get(edge.source_id);
      const targetPos = nodePositions.get(edge.target_id);

      if (sourcePos && targetPos) {
        let color: number;
        let opacity: number;

        switch (edge.connection_type) {
          case "attack":
            color = 0xff0000;
            opacity = 0.8;
            break;
          case "suspicious":
            color = 0xffaa00;
            opacity = 0.5;
            break;
          default:
            color = 0x00ffaa;
            opacity = 0.2;
        }

        // Create curved line for better visualization
        const curve = new THREE.QuadraticBezierCurve3(
          sourcePos,
          new THREE.Vector3(
            (sourcePos.x + targetPos.x) / 2,
            (sourcePos.y + targetPos.y) / 2 + 20,
            (sourcePos.z + targetPos.z) / 2
          ),
          targetPos
        );

        const points = curve.getPoints(20);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity,
          linewidth: edge.connection_type === "attack" ? 3 : 1,
        });

        const line = new THREE.Line(geometry, material);
        line.userData.isNetworkObject = true;
        line.userData.edgeData = edge;

        // Animate attack connections
        if (edge.connection_type === "attack") {
          line.userData.update = (t: number) => {
            material.opacity = 0.5 + Math.sin(t * 0.005) * 0.3;
          };
        }

        scene.add(line);

        // Add flowing particles for attack edges
        if (edge.connection_type === "attack") {
          const particleGeometry = new THREE.BufferGeometry();
          const particlePositions = new Float32Array(10 * 3);
          
          particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
          const particleMaterial = new THREE.PointsMaterial({
            color: 0xff0000,
            size: 2,
            transparent: true,
            opacity: 0.8,
          });

          const flowParticles = new THREE.Points(particleGeometry, particleMaterial);
          flowParticles.userData.isNetworkObject = true;
          
          let flowProgress = 0;
          flowParticles.userData.update = (t: number) => {
            flowProgress += 0.01;
            if (flowProgress > 1) flowProgress = 0;
            
            const positions = particleGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < 10; i++) {
              const progress = (flowProgress + i * 0.1) % 1;
              const point = curve.getPoint(progress);
              positions[i * 3] = point.x;
              positions[i * 3 + 1] = point.y;
              positions[i * 3 + 2] = point.z;
            }
            particleGeometry.attributes.position.needsUpdate = true;
          };

          scene.add(flowParticles);
        }
      }
    });

    // Add mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      setMousePosition({ x: event.clientX, y: event.clientY });

      if (!cameraRef.current || !sceneRef.current) return;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      setHoveredNode(null);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object.userData.nodeData) {
          setHoveredNode(object.userData.nodeData);
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (hoveredNode) {
        setSelectedNode(hoveredNode);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, [networkData, hoveredNode]);

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-screen" />

      {/* Header with country name and back button */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Globe
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{country}</h1>
              <p className="text-cyan-400">Network Security Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time stats panel */}
      <div className="absolute top-24 left-6 z-50 space-y-4">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30 min-w-[300px]">
          <h2 className="text-xl font-bold text-cyan-300 mb-4">Real-Time Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Packets:</span>
              <span className="text-green-300 font-mono text-lg">{stats.totalPackets.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Packets/sec:</span>
              <span className="text-blue-300 font-mono text-lg">{stats.packetsPerSecond.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Active Attacks:</span>
              <span className="text-red-300 font-mono text-lg">{stats.activeAttacks}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Blocked Threats:</span>
              <span className="text-yellow-300 font-mono text-lg">{stats.blockedThreats}</span>
            </div>
          </div>
        </div>

        {networkData && (
          <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30">
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Network Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Nodes:</span>
                <span className="text-white">{networkData.nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connections:</span>
                <span className="text-white">{networkData.edges.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Normal:</span>
                <span className="text-green-300">{networkData.normal_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Suspicious:</span>
                <span className="text-yellow-300">{networkData.suspicious_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Under Attack:</span>
                <span className="text-red-300">{networkData.attack_count}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y - 20}px`,
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md rounded-lg p-4 border border-cyan-500/30 min-w-[250px]">
            <div className="text-cyan-300 font-bold text-lg mb-2">{hoveredNode.ip}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Type:</span>
                <span className="text-white">{hoveredNode.node_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-medium ${
                  hoveredNode.status === "normal" ? "text-green-300" :
                  hoveredNode.status === "suspicious" ? "text-yellow-300" :
                  hoveredNode.status === "attacked" ? "text-red-300" :
                  "text-gray-300"
                }`}>
                  {hoveredNode.status.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traffic:</span>
                <span className="text-white">{hoveredNode.traffic_volume.toLocaleString()} pkts</span>
              </div>
              {hoveredNode.city && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-white">{hoveredNode.city}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected node details */}
      {selectedNode && (
        <div className="absolute bottom-6 left-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-cyan-500/30 max-w-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-cyan-300">{selectedNode.ip}</h3>
              <p className="text-slate-400">{selectedNode.city}, {selectedNode.country}</p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-slate-400 text-sm">Node Type</div>
              <div className="text-white font-medium mt-1">{selectedNode.node_type}</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm">Status</div>
              <div className={`font-medium mt-1 ${
                selectedNode.status === "normal" ? "text-green-300" :
                selectedNode.status === "suspicious" ? "text-yellow-300" :
                selectedNode.status === "attacked" ? "text-red-300" :
                "text-gray-300"
              }`}>
                {selectedNode.status.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm">Traffic Volume</div>
              <div className="text-white font-medium mt-1">{selectedNode.traffic_volume.toLocaleString()} packets</div>
            </div>
          </div>
          {networkData && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm text-slate-400">
                Connected to {networkData.edges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id).length} other nodes
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30">
        <h4 className="text-white font-bold mb-3">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-slate-300">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-slate-300">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-slate-300">Under Attack</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded"></div>
            <span className="text-slate-300">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

