/**
 * Network data service for fetching country-specific network traffic data
 */

export interface NetworkNode {
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

export interface NetworkEdge {
  id: string;
  source_id: string;
  target_id: string;
  connection_type: string;
  bandwidth: number;
  latency: number;
  packet_count: number;
  attack_type?: string;
}

export interface NetworkTrafficData {
  country: string;
  timestamp: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  total_traffic: number;
  attack_count: number;
  suspicious_count: number;
  normal_count: number;
}

export interface GlobalNetworkStats {
  total_countries: number;
  total_nodes: number;
  total_connections: number;
  active_attacks: number;
  suspicious_activity: number;
  last_updated: string;
}

export interface AttackIncident {
  incident_id: string;
  attack_type: string;
  center_lat: number;
  center_lon: number;
  severity: string;
  affected_countries: string[];
  victim_count: number;
  attacker_count: number;
  total_nodes: number;
  total_edges: number;
  total_packets: number;
  timestamp: string;
}

export interface IncidentsList {
  incidents: AttackIncident[];
  total_incidents: number;
  timestamp: string;
}

export interface IncidentDetails {
  incident: AttackIncident & {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
  timestamp: string;
}

class NetworkDataService {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch network traffic data for a specific country
   */
  async getCountryNetworkData(
    country: string, 
    timeRange: string = "1h"
  ): Promise<NetworkTrafficData> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/network/country/${encodeURIComponent(country)}?time_range=${timeRange}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching country network data:", error);
      throw error;
    }
  }

  /**
   * Get list of available countries
   */
  async getAvailableCountries(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/countries`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.countries;
    } catch (error) {
      console.error("Error fetching available countries:", error);
      throw error;
    }
  }

  /**
   * Get global network statistics
   */
  async getGlobalNetworkStats(): Promise<GlobalNetworkStats> {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/stats/global`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching global network stats:", error);
      throw error;
    }
  }

  /**
   * Get global network data for monitoring agent analysis
   */
  async getGlobalNetworkData(): Promise<NetworkTrafficData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/global`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching global network data:", error);
      // Fallback to demo data if backend is unavailable
      console.warn("Falling back to demo global network data");
      return this.generateDemoGlobalNetworkData();
    }
  }

  /**
   * Check if the backend is available and healthy
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error("Backend health check failed:", error);
      return false;
    }
  }

  /**
   * Generate demo network data for offline demonstration
   */
  generateDemoNetworkData(country: string): NetworkTrafficData {
    const cities = ["Capital City", "Major City", "Regional Hub"];
    const nodeTypes = ["server", "client", "router", "firewall"];
    const statuses = ["normal", "suspicious", "attacked", "blocked"];
    const connectionTypes = ["normal", "suspicious", "attack"];
    const attackTypes = ["ddos", "port_scan", "botnet", "malware"];

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    
    // Generate 15-30 nodes
    const nodeCount = Math.floor(Math.random() * 16) + 15;
    
    for (let i = 0; i < nodeCount; i++) {
      const node: NetworkNode = {
        id: `demo_node_${country}_${i}`,
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: country,
        city: cities[Math.floor(Math.random() * cities.length)],
        latitude: Math.random() * 180 - 90,
        longitude: Math.random() * 360 - 180,
        node_type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        traffic_volume: Math.floor(Math.random() * 10000) + 100,
        last_seen: new Date().toISOString()
      };
      nodes.push(node);
    }

    // Generate 20-50 edges
    const edgeCount = Math.floor(Math.random() * 31) + 20;
    
    for (let i = 0; i < edgeCount; i++) {
      const source = nodes[Math.floor(Math.random() * nodes.length)];
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      
      if (source.id !== target.id) {
        const connectionType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
        const edge: NetworkEdge = {
          id: `demo_edge_${country}_${i}`,
          source_id: source.id,
          target_id: target.id,
          connection_type: connectionType,
          bandwidth: Math.floor(Math.random() * 1000) + 1,
          latency: Math.random() * 100 + 1,
          packet_count: Math.floor(Math.random() * 10000) + 10,
          attack_type: connectionType === "attack" ? attackTypes[Math.floor(Math.random() * attackTypes.length)] : undefined
        };
        edges.push(edge);
      }
    }

    const totalTraffic = nodes.reduce((sum, node) => sum + node.traffic_volume, 0);
    const attackCount = edges.filter(edge => edge.connection_type === "attack").length;
    const suspiciousCount = edges.filter(edge => edge.connection_type === "suspicious").length;
    const normalCount = edges.filter(edge => edge.connection_type === "normal").length;

    return {
      country: country,
      timestamp: new Date().toISOString(),
      nodes: nodes,
      edges: edges,
      total_traffic: totalTraffic,
      attack_count: attackCount,
      suspicious_count: suspiciousCount,
      normal_count: normalCount
    };
  }

  /**
   * Generate demo global network data for monitoring agent analysis
   */
  generateDemoGlobalNetworkData(): NetworkTrafficData {
    const countries = ["Global", "Multiple", "Worldwide"];
    const cities = ["Global Hub", "International Gateway", "World Network"];
    const nodeTypes = ["server", "client", "router", "firewall", "database"];
    const statuses = ["normal", "suspicious", "attacked", "blocked"];
    const connectionTypes = ["normal", "suspicious", "attack"];

    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    
    // Generate 50-100 nodes for global view
    const nodeCount = Math.floor(Math.random() * 51) + 50;
    
    for (let i = 0; i < nodeCount; i++) {
      const node: NetworkNode = {
        id: `global_node_${i}`,
        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        latitude: Math.random() * 180 - 90,
        longitude: Math.random() * 360 - 180,
        node_type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        traffic_volume: Math.floor(Math.random() * 50000) + 1000,
        last_seen: new Date().toISOString()
      };
      nodes.push(node);
    }

    // Generate 80-150 edges for global view
    const edgeCount = Math.floor(Math.random() * 71) + 80;
    
    for (let i = 0; i < edgeCount; i++) {
      const source = nodes[Math.floor(Math.random() * nodes.length)];
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      
      if (source.id !== target.id) {
        const connectionType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
        const edge: NetworkEdge = {
          id: `global_edge_${i}`,
          source_id: source.id,
          target_id: target.id,
          connection_type: connectionType,
          bandwidth: Math.floor(Math.random() * 10000) + 100,
          latency: Math.random() * 200 + 10,
          packet_count: Math.floor(Math.random() * 50000) + 100,
          attack_type: connectionType === "attack" ? "ddos" : undefined
        };
        edges.push(edge);
      }
    }

    const totalTraffic = nodes.reduce((sum, node) => sum + node.traffic_volume, 0);
    const attackCount = edges.filter(edge => edge.connection_type === "attack").length;
    const suspiciousCount = edges.filter(edge => edge.connection_type === "suspicious").length;
    const normalCount = edges.filter(edge => edge.connection_type === "normal").length;

    return {
      country: "Global",
      timestamp: new Date().toISOString(),
      nodes: nodes,
      edges: edges,
      total_traffic: totalTraffic,
      attack_count: attackCount,
      suspicious_count: suspiciousCount,
      normal_count: normalCount
    };
  }

  /**
   * Get list of attack incidents for globe visualization
   */
  async getAttackIncidents(): Promise<IncidentsList> {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/incidents`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching attack incidents:", error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific incident
   */
  async getIncidentDetails(incidentId: string): Promise<IncidentDetails> {
    try {
      const response = await fetch(`${this.baseUrl}/api/network/incident/${incidentId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching incident ${incidentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const networkDataService = new NetworkDataService();
