"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import getStarfield from "@/utils/getStarfield";
import { drawThreeGeo } from "@/utils/threeGeoJSON";
import NetworkActivityTracker from "./NetworkActivityTracker";
import EnhancedNetworkView from "./EnhancedNetworkView";
import { networkDataService, NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";

interface EarthProps {
  onCountryViewChange?: (isActive: boolean) => void;
}

interface AttackIncident {
  incident_id: string;
  attack_type: string;
  center_lat: number;
  center_lon: number;
  severity: "critical" | "high" | "medium" | "low";
  affected_countries: string[];
  victim_count: number;
  attacker_count: number;
  total_nodes: number;
  total_edges: number;
  total_packets: number;
  timestamp: string;
}

export default function Earth({ onCountryViewChange }: EarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [incidents, setIncidents] = useState<AttackIncident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [hoveredIncident, setHoveredIncident] = useState<AttackIncident | null>(null);
  const [incidentMarkerPosition, setIncidentMarkerPosition] = useState({ x: 0, y: 0 });
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [countryHoverPosition, setCountryHoverPosition] = useState({ x: 0, y: 0 });
  const [countryNetworkData, setCountryNetworkData] = useState<NetworkTrafficData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Notify parent when incident view changes
  useEffect(() => {
    onCountryViewChange?.(selectedIncidentId !== null);
  }, [selectedIncidentId, onCountryViewChange]);


  // Fetch incidents from backend
  const fetchIncidents = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/network/incidents');
      const data = await response.json();
      setIncidents(data.incidents || []);
      console.log(`Loaded ${data.incidents?.length || 0} attack incidents`);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      setIncidents([]);
    }
  };

  // Load incidents on mount
  useEffect(() => {
    fetchIncidents();
  }, []);

  // Fetch network data for hovered country
  const fetchCountryNetworkData = async (country: string) => {
    try {
      console.log(`Fetching network data for: ${country}`);
      const response = await fetch(`http://localhost:8000/api/network/country/${country}`);
      const data = await response.json();
      console.log(`Received data for ${country}:`, data);
      setCountryNetworkData(data);
    } catch (error) {
      console.error("Failed to fetch country network data:", error);
      setCountryNetworkData(null);
    }
  };

  // Update network data when country changes
  useEffect(() => {
    if (hoveredCountry) {
      fetchCountryNetworkData(hoveredCountry);
    } else {
      setCountryNetworkData(null);
    }
  }, [hoveredCountry]);

  useEffect(() => {
    if (!containerRef.current || selectedIncidentId || selectedCountry) return;

    // Adjust for monitoring panel width (384px = w-96)
    const panelWidth = 384;
    const w = window.innerWidth - panelWidth;
    const h = window.innerHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.15);
    const camera = new THREE.PerspectiveCamera(75, w / h, 1, 100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false; // Disable panning to focus on rotation
    controls.minDistance = 3;
    controls.maxDistance = 8;

            // Create sphere outline with more visible wireframe
            const geometry = new THREE.SphereGeometry(2, 32, 32);
            const lineMat = new THREE.LineBasicMaterial({
              color: 0x888888,
              transparent: true,
              opacity: 0.6,
            });
            const edges = new THREE.EdgesGeometry(geometry, 1);
            const line = new THREE.LineSegments(edges, lineMat);
            scene.add(line);

            // Add a subtle sphere surface to make countries appear connected
            const sphereMaterial = new THREE.MeshBasicMaterial({
              color: 0x111111,
              transparent: true,
              opacity: 0.1,
              side: THREE.DoubleSide,
            });
            const sphereMesh = new THREE.Mesh(geometry, sphereMaterial);
            scene.add(sphereMesh);

    const stars = getStarfield({ numStars: 1000 });
    scene.add(stars);

    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line2 = { threshold: 0.1 };
    const mouse = new THREE.Vector2();
    let hoveredObject: any = null;

    // Drag vs Click detection variables
    let isDragging = false;
    let mouseDownPosition = { x: 0, y: 0 };
    let mouseDownTime = 0;
    const DRAG_THRESHOLD = 5; // pixels
    const CLICK_TIME_THRESHOLD = 300; // milliseconds

    // Load GeoJSON data with country names
    let countries: THREE.Object3D;
    let cityMarkers: THREE.Object3D[] = [];
    
    // Option 1: Use a real countries dataset from CDN
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then((response) => response.json())
      .then((data) => {
        countries = drawThreeGeo({
          json: data,
          radius: 2,
          materialOptions: {
            color: 0xffffff,
          },
        });
        scene.add(countries);

        // Add incident markers after countries are loaded
        addIncidentMarkers();
      })
      .catch((error) => {
        console.error("Error loading countries data:", error);
        // Fallback to local file if CDN fails
        fetch("/geojson/ne_110m_land.json")
          .then((response) => response.json())
          .then((data) => {
            countries = drawThreeGeo({
              json: data,
              radius: 2,
              materialOptions: {
                color: 0xffffff,
              },
            });
            scene.add(countries);
            addIncidentMarkers();
          });
      });

    // Function to add incident markers
    const addIncidentMarkers = () => {
      // Group incidents by location to add slight offsets for overlapping markers
      const locationMap = new Map<string, number>();

      incidents.forEach((incident) => {
        // Round coordinates to detect overlaps
        const locationKey = `${incident.center_lat.toFixed(1)}_${incident.center_lon.toFixed(1)}`;
        const offsetIndex = locationMap.get(locationKey) || 0;
        locationMap.set(locationKey, offsetIndex + 1);

        // Add small random offset if multiple incidents at same location (spread them out slightly)
        const latOffset = offsetIndex > 0 ? (Math.random() - 0.5) * 2 : 0;
        const lonOffset = offsetIndex > 0 ? (Math.random() - 0.5) * 2 : 0;

        const adjustedLat = incident.center_lat + latOffset;
        const adjustedLon = incident.center_lon + lonOffset;

        // Convert lat/lon to 3D position on sphere
        const phi = (90 - adjustedLat) * (Math.PI / 180);
        const theta = (adjustedLon + 180) * (Math.PI / 180);
        const radius = 2.05; // Slightly above globe surface

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Color and size based on severity
        const severityConfig = {
          critical: { color: 0xff0000, size: 0.05, glowSize: 0.12 },
          high: { color: 0xff3300, size: 0.04, glowSize: 0.10 },
          medium: { color: 0xff9900, size: 0.03, glowSize: 0.08 },
          low: { color: 0xffcc00, size: 0.025, glowSize: 0.06 }
        };

        const config = severityConfig[incident.severity];

        // Create incident marker
        const markerGeometry = new THREE.SphereGeometry(config.size, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.9,
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(x, y, z);
        marker.userData.incidentData = incident;
        marker.userData.isIncidentMarker = true;

        // Add pulsing animation for all incidents
        marker.userData.update = (t: number) => {
          const scale = 1 + Math.sin(t * 0.005) * 0.3;
          marker.scale.setScalar(scale);
        };

        scene.add(marker);
        cityMarkers.push(marker);

        // Add glow effect for high severity incidents
        if (incident.severity === 'critical' || incident.severity === 'high') {
          const glowGeometry = new THREE.SphereGeometry(config.glowSize, 16, 16);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.3,
          });
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          glow.position.set(x, y, z);
          glow.userData.update = (t: number) => {
            glow.scale.setScalar(1 + Math.sin(t * 0.004) * 0.6);
            glowMaterial.opacity = 0.2 + Math.sin(t * 0.004) * 0.15;
          };
          scene.add(glow);
          cityMarkers.push(glow);
        }

        // Add expanding ring waves for all severity levels (attack propagation effect)
        for (let i = 0; i < 2; i++) {
          const ringGeometry = new THREE.RingGeometry(0.01, 0.02, 32);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.position.set(x, y, z);

          // Orient ring to be tangent to sphere surface
          const normal = new THREE.Vector3(x, y, z).normalize();
          ring.lookAt(ring.position.clone().add(normal));

          const delay = i * 1000; // Stagger the waves
          ring.userData.update = (t: number) => {
            const wave = ((t + delay) % 3000) / 3000; // 3 second cycle
            const scale = 1 + wave * 3; // Expand outward
            ring.scale.setScalar(scale);
            ringMaterial.opacity = 0.6 * (1 - wave); // Fade out as it expands
          };

          scene.add(ring);
          cityMarkers.push(ring);
        }
      });
    };

    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime() * 1000;
      
      // Update all objects that have an update function
      scene.traverse((obj) => {
        if (obj.userData.update) {
          obj.userData.update(t);
        }
      });
      
      renderer.render(scene, camera);
      controls.update();
    }

    animate();

    function handleWindowResize() {
      const panelWidth = 384;
      const newWidth = window.innerWidth - panelWidth;
      camera.aspect = newWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(newWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleWindowResize, false);

    // Mouse move handler for hover detection
    function handleMouseMove(event: MouseEvent) {
      const panelWidth = 384;
      const viewportWidth = window.innerWidth - panelWidth;
      mouse.x = (event.clientX / viewportWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check for incident marker intersections first
      const incidentIntersects = raycaster.intersectObjects(cityMarkers, false);

      if (incidentIntersects.length > 0) {
        const incidentObject = incidentIntersects[0].object;
        if (incidentObject.userData.incidentData) {
          // Hovering over an incident
          const incidentData = incidentObject.userData.incidentData;
          setIncidentMarkerPosition({
            x: event.clientX,
            y: event.clientY
          });
          setHoveredIncident(incidentData);
          return;
        }
      }

      // Check for country intersections
      if (countries) {
        const intersects = raycaster.intersectObjects(countries.children, true);

        // Reset previous hover
        if (hoveredObject && hoveredObject !== intersects[0]?.object) {
          const material = (hoveredObject as any).material;
          if (material && hoveredObject.userData.originalColor !== undefined) {
            material.color.setHex(hoveredObject.userData.originalColor);
            material.linewidth = 0.002;
            material.needsUpdate = true;
          }
          hoveredObject = null;
        }

        // Apply new hover
        if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object.userData.isHoverable) {
            hoveredObject = object;
            const material = (object as any).material;
            if (material) {
              material.color.setHex(0xffffff); // White highlight
              material.linewidth = 0.004; // Thicker line
              material.needsUpdate = true;
            }

            // Show country tooltip
            const featureData = object.userData.featureData || {};
            const countryName = featureData.name || featureData.ADMIN || featureData.NAME || `Region ${featureData.featureIndex || ''}`;

            if (countryName) {
              setCountryHoverPosition({
                x: event.clientX,
                y: event.clientY
              });
              setHoveredCountry(countryName);
            }
          }
        } else {
          setHoveredCountry(null);
        }
      }

      // Clear incident hover if not over anything
      setHoveredIncident(null);
    }

    // Mouse down handler - start tracking potential drag
    function handleMouseDown(event: MouseEvent) {
      mouseDownPosition = { x: event.clientX, y: event.clientY };
      mouseDownTime = Date.now();
      isDragging = false;
    }

    // Mouse move handler during drag - detect if dragging
    function handleMouseMoveDrag(event: MouseEvent) {
      if (mouseDownTime > 0) {
        const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
        const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
        
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging = true;
        }
      }
    }

    // Mouse up handler - handle click if not dragging
    function handleMouseUp(event: MouseEvent) {
      const clickDuration = Date.now() - mouseDownTime;
      const deltaX = Math.abs(event.clientX - mouseDownPosition.x);
      const deltaY = Math.abs(event.clientY - mouseDownPosition.y);
      
      // Only treat as click if:
      // 1. Mouse didn't move much (not a drag)
      // 2. Click was quick (not a long press)
      // 3. Not already detected as dragging
      if (!isDragging &&
          deltaX <= DRAG_THRESHOLD &&
          deltaY <= DRAG_THRESHOLD &&
          clickDuration <= CLICK_TIME_THRESHOLD) {

        // This is a genuine click - check for incident marker click
        const panelWidth = 384;
        const viewportWidth = window.innerWidth - panelWidth;
        mouse.x = (event.clientX / viewportWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check if clicking on an incident marker
        const incidentIntersects = raycaster.intersectObjects(cityMarkers, false);

        if (incidentIntersects.length > 0) {
          const incidentObject = incidentIntersects[0].object;
          if (incidentObject.userData.incidentData) {
            const incidentData = incidentObject.userData.incidentData;
            setSelectedIncidentId(incidentData.incident_id);
            return;
          }
        }

        // Check if clicking on a country
        if (countries) {
          const countryIntersects = raycaster.intersectObjects(countries.children, true);

          if (countryIntersects.length > 0) {
            const object = countryIntersects[0].object;
            if (object.userData.isHoverable) {
              const featureData = object.userData.featureData || {};
              const countryName = featureData.name || featureData.ADMIN || featureData.NAME;

              if (countryName) {
                console.log(`Country clicked: ${countryName}`);
                setSelectedCountry(countryName);
              }
            }
          }
        }
      }
      
      // Reset drag tracking
      mouseDownTime = 0;
      isDragging = false;
    }

    window.addEventListener("mousemove", handleMouseMove, false);
    window.addEventListener("mousedown", handleMouseDown, false);
    window.addEventListener("mousemove", handleMouseMoveDrag, false);
    window.addEventListener("mouseup", handleMouseUp, false);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMoveDrag);
      window.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedIncidentId, selectedCountry, incidents]);

  return (
    <>
      {/* Show incident detail view if an incident is selected */}
      {selectedIncidentId && (
        <EnhancedNetworkView
          incidentId={selectedIncidentId}
          onBack={() => setSelectedIncidentId(null)}
        />
      )}

      {/* Show country network view if a country is selected */}
      {selectedCountry && !selectedIncidentId && (
        <EnhancedNetworkView
          country={selectedCountry}
          onBack={() => setSelectedCountry(null)}
        />
      )}

      {/* Show Earth globe when nothing is selected */}
      {!selectedIncidentId && !selectedCountry && (
        <div className="relative w-full h-screen">
          <div ref={containerRef} className="w-full h-screen" />

          {/* Network Activity Tracker for Country Hover */}
          <NetworkActivityTracker
            data={countryNetworkData}
            visible={!!countryNetworkData && !hoveredIncident}
            position={countryHoverPosition}
            onClose={() => setCountryNetworkData(null)}
            onNodeClick={(node) => console.log("Node clicked:", node)}
            onEdgeClick={(edge) => console.log("Edge clicked:", edge)}
          />

          {/* Incident Hover Tooltip */}
          {hoveredIncident && (
            <div
              className="absolute z-50 pointer-events-none bg-black/95 backdrop-blur-md rounded-lg p-4 border border-red-500/50 min-w-[320px] max-w-[380px]"
              style={{
                left: incidentMarkerPosition.x + 15,
                top: incidentMarkerPosition.y + 15,
              }}
            >
              <div className="text-red-400 font-bold text-lg mb-2 flex items-center gap-2">
                🚨 {hoveredIncident.attack_type}
                <span className={`text-xs px-2 py-0.5 rounded uppercase ${
                  hoveredIncident.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                  hoveredIncident.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                  hoveredIncident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                  'bg-yellow-300/20 text-yellow-300 border border-yellow-300/50'
                }`}>
                  {hoveredIncident.severity}
                </span>
              </div>

              {/* Attack Technique Description */}
              <div className="text-xs text-gray-400 mb-3 italic border-l-2 border-red-500/30 pl-2">
                {(() => {
                  const descriptions: Record<string, string> = {
                    'DDoS-NTP': 'NTP amplification attack exploiting time servers',
                    'DDoS-DNS': 'DNS amplification flooding victim with queries',
                    'DDoS-LDAP': 'LDAP reflection attack using directory services',
                    'DDoS-MSSQL': 'SQL Server reflection amplification attack',
                    'DDoS-NetBIOS': 'NetBIOS name service amplification attack',
                    'DDoS-SNMP': 'SNMP reflection using network devices',
                    'DDoS-SSDP': 'SSDP reflection via UPnP devices',
                    'DDoS-UDP': 'Generic UDP flood attack',
                    'DDoS-TFTP': 'TFTP amplification attack',
                    'DDoS-Portmap': 'Portmap reflection attack via RPC services',
                    'SYN-Flood': 'TCP SYN flood exhausting connection pools',
                    'UDP-Flood': 'High-volume UDP packet flood'
                  };
                  return descriptions[hoveredIncident.attack_type] || 'Distributed denial of service attack';
                })()}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Target Hosts:</span>
                  <span className="text-red-400 font-mono font-bold">{hoveredIncident.victim_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Attack Sources:</span>
                  <span className="text-orange-400 font-mono">{hoveredIncident.attacker_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Traffic Volume:</span>
                  <span className="text-white font-mono">{hoveredIncident.total_packets.toLocaleString()} pkts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Connections:</span>
                  <span className="text-gray-300 font-mono">{hoveredIncident.total_edges}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Attack Ratio:</span>
                  <span className="text-purple-400 font-mono">
                    1:{(hoveredIncident.victim_count / Math.max(1, hoveredIncident.attacker_count)).toFixed(1)}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs">Geographic Spread:</span>
                    <span className="text-blue-400 text-xs font-bold">{hoveredIncident.affected_countries.length} countries</span>
                  </div>
                  <div className="text-white text-xs">
                    {hoveredIncident.affected_countries.slice(0, 3).join(' • ')}
                    {hoveredIncident.affected_countries.length > 3 && ` +${hoveredIncident.affected_countries.length - 3} more`}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Detected:</span>
                    <span className="text-gray-400">
                      {new Date(hoveredIncident.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-center bg-red-500/10 border border-red-500/30 rounded px-2 py-1.5">
                <span className="text-red-300">⚡ Click to investigate attack flow</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

