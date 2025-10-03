"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import getStarfield from "@/utils/getStarfield";
import { drawThreeGeo } from "@/utils/threeGeoJSON";
import NetworkActivityTracker from "./NetworkActivityTracker";
import EnhancedNetworkView from "./EnhancedNetworkView";
import { networkDataService, NetworkTrafficData, NetworkNode, NetworkEdge } from "@/services/networkDataService";
import { MAJOR_CITIES, getCitiesByCountry } from "@/data/cities";
import { getCityThreatLevel, getThreatColor, type ThreatLevel } from "@/data/countryThreats";

interface EarthProps {
  onCountryViewChange?: (isActive: boolean) => void;
}

export default function Earth({ onCountryViewChange }: EarthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [networkData, setNetworkData] = useState<NetworkTrafficData | null>(null);
  const [networkTrackerPosition, setNetworkTrackerPosition] = useState({ x: 0, y: 0 });
  const [loadingNetworkData, setLoadingNetworkData] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  // Notify parent when country view changes
  useEffect(() => {
    onCountryViewChange?.(selectedCountry !== null);
  }, [selectedCountry, onCountryViewChange]);


  // Function to fetch network data for a country with real-time updates
  const fetchNetworkData = async (country: string) => {
    setLoadingNetworkData(true);
    try {
      let data: NetworkTrafficData;
      
      // Use demo data
      data = networkDataService.generateDemoNetworkData(country);
      
      setNetworkData(data);
    } catch (error) {
      console.error("Failed to fetch network data:", error);
      // Fallback to demo data even if backend call fails
      const demoData = networkDataService.generateDemoNetworkData(country);
      setNetworkData(demoData);
    } finally {
      setLoadingNetworkData(false);
    }
  };

  // Real-time data updates for hovered country
  useEffect(() => {
    if (!hoveredCountry) return;

    // Update immediately
    fetchNetworkData(hoveredCountry);

    // Set up interval for continuous updates
    const interval = setInterval(() => {
      if (hoveredCountry) {
        fetchNetworkData(hoveredCountry);
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [hoveredCountry]);

  // Function to handle node clicks in network visualization
  const handleNodeClick = (node: NetworkNode) => {
    console.log("Node clicked:", node);
    // You can add more detailed node information display here
  };

  // Function to handle edge clicks in network visualization
  const handleEdgeClick = (edge: NetworkEdge) => {
    console.log("Edge clicked:", edge);
    // You can add more detailed edge information display here
  };

  useEffect(() => {
    if (!containerRef.current || selectedCountry) return;

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

        // Add city markers after countries are loaded
        addCityMarkers();
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
            addCityMarkers();
          });
      });

    // Function to add city markers
    const addCityMarkers = () => {
      MAJOR_CITIES.forEach((city) => {
        // Convert lat/lon to 3D position on sphere
        const phi = (90 - city.latitude) * (Math.PI / 180);
        const theta = (city.longitude + 180) * (Math.PI / 180);
        const radius = 2.05; // Slightly above globe surface

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Determine threat level based on country
        const threatLevel: ThreatLevel = getCityThreatLevel(city.country);
        const markerColor: number = getThreatColor(threatLevel);

        // Create city marker with color-coded threat level
        const markerSize = city.isCapital ? 0.03 : 0.02;
        const markerGeometry = new THREE.SphereGeometry(markerSize, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({
          color: markerColor,
          transparent: true,
          opacity: 0.85,
        });

        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(x, y, z);
        marker.userData.cityData = city;
        marker.userData.isCityMarker = true;
        marker.userData.threatLevel = threatLevel;

        // Add pulsing animation for critical threats
        if (threatLevel === 'critical') {
          marker.userData.update = (t: number) => {
            const scale = 1 + Math.sin(t * 0.004) * 0.4;
            marker.scale.setScalar(scale);
          };
        }

        scene.add(marker);
        cityMarkers.push(marker);

        // Add glow effect for critical and medium threats
        if (threatLevel === 'critical' || (threatLevel === 'medium' && city.population > 5000000)) {
          const glowGeometry = new THREE.SphereGeometry(markerSize * 2, 8, 8);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: markerColor,
            transparent: true,
            opacity: 0.4,
          });
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          glow.position.set(x, y, z);
          glow.userData.update = (t: number) => {
            glow.scale.setScalar(1 + Math.sin(t * 0.003) * 0.5);
            glowMaterial.opacity = 0.25 + Math.sin(t * 0.003) * 0.15;
          };
          scene.add(glow);
          cityMarkers.push(glow);
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

      // Check for city marker intersections first
      const cityIntersects = raycaster.intersectObjects(cityMarkers, false);
      
      if (cityIntersects.length > 0) {
        const cityObject = cityIntersects[0].object;
        if (cityObject.userData.cityData) {
          // Hovering over a city
          const cityData = cityObject.userData.cityData;
          setNetworkTrackerPosition({
            x: event.clientX,
            y: event.clientY
          });
          setHoveredCountry(cityData.country);
          return;
        }
      }

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
          setHoveredCountry(null);
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

            // Show tooltip
            const featureData = object.userData.featureData || {};
            const countryName = featureData.name || featureData.ADMIN || featureData.NAME || `Region ${featureData.featureIndex || ''}`;
            

            // Set position for network activity tracker
            setNetworkTrackerPosition({
              x: event.clientX,
              y: event.clientY
            });

            // Set hovered country for real-time data updates
            if (countryName) {
              setHoveredCountry(countryName);
            }
          }
        } else {
          setHoveredCountry(null);
        }
      }
    }

    // Click handler for country selection
    function handleClick(event: MouseEvent) {
      const panelWidth = 384;
      const viewportWidth = window.innerWidth - panelWidth;
      mouse.x = (event.clientX / viewportWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      if (countries) {
        const intersects = raycaster.intersectObjects(countries.children, true);
        
        if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object.userData.isHoverable) {
            const featureData = object.userData.featureData || {};
            const countryName = featureData.name || featureData.ADMIN || featureData.NAME;
            
            if (countryName) {
              setSelectedCountry(countryName);
            }
          }
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove, false);
    window.addEventListener("click", handleClick, false);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedCountry]);

  return (
    <>
      {/* Show country detail view if a country is selected */}
      {selectedCountry && (
        <EnhancedNetworkView 
          country={selectedCountry} 
          onBack={() => setSelectedCountry(null)} 
        />
      )}
      
      {/* Show Earth globe when no country is selected */}
      {!selectedCountry && (
        <div className="relative w-full h-screen">
          <div ref={containerRef} className="w-full h-screen" />
      
      {/* Network Activity Tracker Overlay */}
      <NetworkActivityTracker
        data={networkData}
        visible={!!networkData}
        position={networkTrackerPosition}
        onClose={() => setNetworkData(null)}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
      />


        </div>
      )}
    </>
  );
}

