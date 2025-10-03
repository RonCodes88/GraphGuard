"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import getStarfield from "@/utils/getStarfield";
import { drawThreeGeo } from "@/utils/threeGeoJSON";

interface TooltipData {
  x: number;
  y: number;
  country: string;
  city?: string;
  featureData: any;
}

export default function Earth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.3);
    const camera = new THREE.PerspectiveCamera(75, w / h, 1, 100);
    camera.position.z = 5;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const geometry = new THREE.SphereGeometry(2);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    const edges = new THREE.EdgesGeometry(geometry, 1);
    const line = new THREE.LineSegments(edges, lineMat);
    scene.add(line);

    const stars = getStarfield({ numStars: 1000 });
    scene.add(stars);

    // Raycaster for hover detection
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line2 = { threshold: 0.1 };
    const mouse = new THREE.Vector2();
    let hoveredObject: any = null;

    // Load GeoJSON data with country names
    let countries: THREE.Object3D;
    // Option 1: Use a real countries dataset from CDN
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then((response) => response.json())
      .then((data) => {
        countries = drawThreeGeo({
          json: data,
          radius: 2,
          materialOptions: {
            color: 0x80ff80,
          },
        });
        scene.add(countries);
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
                color: 0x80ff80,
              },
            });
            scene.add(countries);
          });
      });

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
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleWindowResize, false);

    // Mouse move handler for hover detection
    function handleMouseMove(event: MouseEvent) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

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
          setTooltip(null);
        }

        // Apply new hover
        if (intersects.length > 0) {
          const object = intersects[0].object;
          if (object.userData.isHoverable) {
            hoveredObject = object;
            const material = (object as any).material;
            if (material) {
              material.color.setHex(0xffff00); // Yellow highlight
              material.linewidth = 0.004; // Thicker line
              material.needsUpdate = true;
            }

            // Show tooltip
            const featureData = object.userData.featureData || {};
            const countryName = featureData.name || featureData.ADMIN || featureData.NAME || `Region ${featureData.featureIndex || ''}`;
            const capital = featureData.capital || featureData.CAPITAL || undefined;
            
            setTooltip({
              x: event.clientX,
              y: event.clientY,
              country: countryName,
              city: capital,
              featureData: featureData,
            });
          }
        }
      }
    }

    window.addEventListener("mousemove", handleMouseMove, false);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleWindowResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement.parentElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="w-full h-screen" />
      
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: `${tooltip.x + 20}px`,
            top: `${tooltip.y + 20}px`,
          }}
        >
          <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-cyan-500/30 px-6 py-4 min-w-[200px] transform transition-all duration-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <h3 className="text-cyan-300 text-lg font-bold tracking-wide">
                {tooltip.country}
              </h3>
            </div>
            
            {tooltip.city && (
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{tooltip.city}</span>
              </div>
            )}
            
            {tooltip.featureData && (
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="text-xs text-slate-400 space-y-1">
                  {tooltip.featureData.scalerank !== undefined && (
                    <div className="flex justify-between">
                      <span className="opacity-75">Scale Rank:</span>
                      <span className="text-cyan-300 font-medium">{tooltip.featureData.scalerank}</span>
                    </div>
                  )}
                  {tooltip.featureData.featurecla && (
                    <div className="flex justify-between">
                      <span className="opacity-75">Type:</span>
                      <span className="text-cyan-300 font-medium capitalize">{tooltip.featureData.featurecla}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-cyan-500/20 rounded-full blur-xl"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500/20 rounded-full blur-lg"></div>
          </div>
        </div>
      )}
    </div>
  );
}

