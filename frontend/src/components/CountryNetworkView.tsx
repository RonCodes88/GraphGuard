"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { networkDataService, NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPackets: 0,
    packetsPerSecond: 0,
    activeAttacks: 0,
    blockedThreats: 0,
  });

  // Fetch network data from backend
  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      const data = await networkDataService.getCountryNetworkData(country);
      setNetworkData(data);
      
      // Update stats
      setStats(prev => ({
        totalPackets: prev.totalPackets + data.edges.reduce((sum, e) => sum + e.packet_count, 0),
        packetsPerSecond: Math.floor(Math.random() * 5000) + 1000,
        activeAttacks: data.attack_count,
        blockedThreats: prev.blockedThreats + Math.floor(Math.random() * 5),
      }));
    } catch (error) {
      console.error("Failed to fetch network data:", error);
      // Fallback to demo data if backend fails
      const demoData = networkDataService.generateDemoNetworkData(country);
      setNetworkData(demoData);
    } finally {
      setLoading(false);
    }
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
    camera.position.set(0, 150, 400); // Moved camera back and up to see the network better

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

  // Fetch and update network data continuously from backend
  useEffect(() => {
    // Initial fetch
    fetchNetworkData();
    
    // Set up interval for continuous updates
    const interval = setInterval(() => {
      fetchNetworkData();
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [country]);

  // Render network visualization
  useEffect(() => {
    if (!networkData || !sceneRef.current) return;

    console.log(`Rendering network for ${country}:`, {
      nodes: networkData.nodes.length,
      edges: networkData.edges.length,
      sceneReady: !!sceneRef.current
    });

    const scene = sceneRef.current;

    // Clear previous network objects
    const objectsToRemove: THREE.Object3D[] = [];
    scene.traverse((obj: THREE.Object3D) => {
      if (obj.userData.isNetworkObject) {
        objectsToRemove.push(obj);
      }
    });
    console.log(`Clearing ${objectsToRemove.length} previous network objects`);
    objectsToRemove.forEach((obj: THREE.Object3D) => {
      scene.remove(obj);
      // Dispose of geometry and materials to prevent memory leaks
      if (obj instanceof THREE.Mesh && obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj instanceof THREE.Mesh && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

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

    console.log(`Added ${networkData.nodes.length} nodes to scene`);
    console.log('Sample node positions:', Array.from(nodePositions.entries()).slice(0, 5));

        // Create edges
        console.log(`Creating ${networkData.edges.length} edges...`);
        let edgesCreated = 0;
        let attackEdges = 0;
        let suspiciousEdges = 0;
        let normalEdges = 0;
        
        networkData.edges.forEach((edge) => {
          const sourcePos = nodePositions.get(edge.source_id);
          const targetPos = nodePositions.get(edge.target_id);

          if (sourcePos && targetPos) {
            let color: number;
            let opacity: number;

            switch (edge.connection_type) {
              case "attack":
                color = 0xff0000;
                opacity = 0.9;
                attackEdges++;
                break;
              case "suspicious":
                color = 0xffaa00;
                opacity = 0.8;
                suspiciousEdges++;
                break;
              default:
                color = 0x00ffaa;
                opacity = 0.6; // Increased further to make normal connections clearly visible
                normalEdges++;
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
        
        // Create thicker lines using cylinder geometry for better visibility
        const lineWidth = edge.connection_type === "attack" ? 0.5 : 0.15;
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // For attack connections, create a thicker tube
        if (edge.connection_type === "attack") {
          const tubeGeometry = new THREE.TubeGeometry(curve, 20, lineWidth, 8, false);
          const tubeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
          });
          const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
          tube.userData.isNetworkObject = true;
          tube.userData.edgeData = edge;
          
          // Animate attack connections
          tube.userData.update = (t: number) => {
            tubeMaterial.opacity = 0.7 + Math.sin(t * 0.005) * 0.3;
          };
          
          scene.add(tube);
          console.log(`Added attack tube from ${edge.source_id} to ${edge.target_id}`);
        } else {
          // Create a cylinder-based line for better visibility
          const lineWidth = 0.1;
          const tubeGeometry = new THREE.TubeGeometry(curve, 20, lineWidth, 6, false);
          const tubeMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
          });
          const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
          tube.userData.isNetworkObject = true;
          tube.userData.edgeData = edge;
          scene.add(tube);
          if (edgesCreated < 5) { // Log first few edges for debugging
            console.log(`Added ${edge.connection_type} tube from ${edge.source_id} to ${edge.target_id} at positions:`, sourcePos, targetPos);
          }
        }
        edgesCreated++;

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
      } else {
        console.warn(`Could not find positions for edge: ${edge.source_id} -> ${edge.target_id}`);
      }
    });

    console.log(`Successfully created ${edgesCreated} edges out of ${networkData.edges.length} total edges.`);
    console.log(`Edge breakdown: ${attackEdges} attacks, ${suspiciousEdges} suspicious, ${normalEdges} normal`);
    console.log(`Total children in scene: ${scene.children.length}`);
    
    // Add a test line to verify rendering is working
    if (networkData.nodes.length >= 2) {
      const testNode1 = networkData.nodes[0];
      const testNode2 = networkData.nodes[1];
      const pos1 = nodePositions.get(testNode1.id);
      const pos2 = nodePositions.get(testNode2.id);
      
      if (pos1 && pos2) {
        const testGeometry = new THREE.BufferGeometry().setFromPoints([pos1, pos2]);
        const testMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 1.0,
        });
        const testLine = new THREE.Line(testGeometry, testMaterial);
        testLine.userData.isNetworkObject = true;
        testLine.userData.isTestLine = true;
        scene.add(testLine);
        console.log('Added test line between first two nodes');
      }
    }

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
  }, [networkData]);

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={containerRef} className="w-full h-screen" />

      {/* Header with country name and back button */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Globe
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{country}</h1>
              <p className="text-purple-400 flex items-center gap-2">
                Network Security Dashboard
                {loading && (
                  <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time stats panel */}
      <div className="absolute top-24 left-6 z-50 space-y-4">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 min-w-[300px]">
          <h2 className="text-xl font-bold text-purple-300 mb-4">Real-Time Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Packets:</span>
              <span className="text-green-300 font-mono text-lg">{stats.totalPackets.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Packets/sec:</span>
              <span className="text-purple-300 font-mono text-lg">{stats.packetsPerSecond.toLocaleString()}</span>
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
          <div className="bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-300 mb-3">Network Overview</h3>
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
          <div className="bg-slate-900/95 backdrop-blur-md rounded-lg p-4 border border-purple-500/30 min-w-[250px]">
            <div className="text-purple-300 font-bold text-lg mb-2">{hoveredNode.ip}</div>
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
        <div className="absolute bottom-6 left-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md rounded-xl p-6 border border-purple-500/30 max-w-2xl">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-purple-300">{selectedNode.ip}</h3>
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
      <div className="absolute bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-purple-500/30">
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

