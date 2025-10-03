"use client";

import { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";

interface CytoscapeNetworkViewProps {
  country: string;
  onBack: () => void;
}

interface NetworkNode {
  data: {
    id: string;
    label: string;
    type: string;
    status: string;
    traffic: number;
  };
}

interface NetworkEdge {
  data: {
    id: string;
    source: string;
    target: string;
    weight: number;
    type: string;
  };
}

export default function CytoscapeNetworkView({ country, onBack }: CytoscapeNetworkViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [stats, setStats] = useState({
    totalNodes: 0,
    totalEdges: 0,
    activeConnections: 0,
    threatLevel: "Low"
  });

  // Generate clean network data
  const generateNetworkData = () => {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    
    const nodeTypes = ["server", "router", "firewall", "client", "database"];
    const statuses = ["normal", "suspicious", "attacked"];
    const edgeTypes = ["normal", "attack", "suspicious"];
    
    // Generate nodes with cleaner naming
    for (let i = 0; i < 12; i++) {
      const nodeId = `node_${i}`;
      const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const traffic = Math.floor(Math.random() * 8000) + 2000;
      
      nodes.push({
        data: {
          id: nodeId,
          label: `${type.toUpperCase()}_${String(i + 1).padStart(2, '0')}`,
          type: type,
          status: status,
          traffic: traffic
        }
      });
    }
    
    // Generate edges with better distribution
    for (let i = 0; i < 18; i++) {
      const sourceId = `node_${Math.floor(Math.random() * 12)}`;
      const targetId = `node_${Math.floor(Math.random() * 12)}`;
      
      if (sourceId !== targetId) {
        const edgeType = edgeTypes[Math.floor(Math.random() * edgeTypes.length)];
        const weight = Math.floor(Math.random() * 8) + 2;
        
        edges.push({
          data: {
            id: `edge_${i}`,
            source: sourceId,
            target: targetId,
            weight: weight,
            type: edgeType
          }
        });
      }
    }
    
    return { nodes, edges };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const { nodes, edges } = generateNetworkData();
    
    // Update stats
    setStats({
      totalNodes: nodes.length,
      totalEdges: edges.length,
      activeConnections: edges.filter(e => e.data.type === "normal").length,
      threatLevel: edges.filter(e => e.data.type === "attack").length > 3 ? "High" : 
                   edges.filter(e => e.data.type === "attack").length > 1 ? "Medium" : "Low"
    });

    // Initialize Cytoscape with clean styling
    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#FFFFFF',
            'border-color': '#000000',
            'border-width': 2,
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#000000',
            'font-size': '11px',
            'font-weight': '600',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-outline-width': 0,
            'width': 'mapData(traffic, 2000, 10000, 30, 50)',
            'height': 'mapData(traffic, 2000, 10000, 30, 50)',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[status="suspicious"]',
          style: {
            'background-color': '#F5F5F5',
            'border-color': '#666666',
            'border-width': 3,
            'border-style': 'dashed'
          }
        },
        {
          selector: 'node[status="attacked"]',
          style: {
            'background-color': '#000000',
            'border-color': '#000000',
            'border-width': 3,
            'color': '#FFFFFF'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 'mapData(weight, 2, 10, 1, 3)',
            'line-color': '#CCCCCC',
            'target-arrow-color': '#CCCCCC',
            'target-arrow-shape': 'triangle',
            'curve-style': 'straight',
            'opacity': 0.6
          }
        },
        {
          selector: 'edge[type="attack"]',
          style: {
            'line-color': '#000000',
            'target-arrow-color': '#000000',
            'width': 2,
            'opacity': 0.8,
            'line-style': 'dashed'
          }
        },
        {
          selector: 'edge[type="suspicious"]',
          style: {
            'line-color': '#666666',
            'target-arrow-color': '#666666',
            'width': 1.5,
            'opacity': 0.7
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#000000',
            'border-width': 4,
            'background-color': '#F0F0F0'
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 120,
        nodeOverlap: 30,
        refresh: 20,
        fit: true,
        padding: 50,
        randomize: false,
        componentSpacing: 120,
        nodeRepulsion: 500000,
        edgeElasticity: 120,
        nestingFactor: 5,
        gravity: 100,
        numIter: 1200,
        initialTemp: 250,
        coolingFactor: 0.95,
        minTemp: 1.0
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      selectionType: 'single',
      minZoom: 0.3,
      maxZoom: 2
    });

    cyRef.current = cy;

    // Add event listeners
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      setSelectedNode({
        data: {
          id: node.id(),
          label: node.data('label'),
          type: node.data('type'),
          status: node.data('status'),
          traffic: node.data('traffic')
        }
      });
    });

    cy.on('tap', (event) => {
      if (event.target === cy) {
        setSelectedNode(null);
      }
    });

    // Cleanup
    return () => {
      cy.destroy();
    };
  }, [country]);

  return (
    <div className="relative w-full h-screen bg-white">
      {/* Minimal Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-8 py-6">
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
              <p className="text-sm text-gray-500">Network Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cytoscape container */}
      <div 
        ref={containerRef} 
        className="w-full"
        style={{ marginTop: '88px', height: 'calc(100vh - 88px)' }}
      />

      {/* Minimal Stats Panel */}
      <div className="absolute top-24 left-8 z-50">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm min-w-[240px]">
          <h2 className="text-lg font-semibold text-black mb-4">Overview</h2>
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
              <span className="text-sm text-gray-600">Active</span>
              <span className="text-sm font-medium text-black">{stats.activeConnections}</span>
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

      {/* Clean Node Details Panel */}
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

      {/* Minimal Legend */}
      <div className="absolute bottom-8 right-8 z-50 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-black mb-3">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white border-2 border-black rounded"></div>
            <span className="text-gray-600">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 border-2 border-dashed border-gray-600 rounded"></div>
            <span className="text-gray-600">Suspicious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-black rounded"></div>
            <span className="text-gray-600">Attacked</span>
          </div>
        </div>
      </div>
    </div>
  );
}