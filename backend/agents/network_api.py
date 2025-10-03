"""
Network Data API endpoints for the Earth visualization
Enhanced with realistic network attack patterns and AI agent integration
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import random
from datetime import datetime
import time

router = APIRouter(prefix="/api/network", tags=["network"])

# Global state for attack simulation
attack_state = {
    "ddos_active": False,
    "botnet_nodes": [],
    "port_scan_target": None,
    "apt_campaign": None,
    "last_update": time.time()
}


class NetworkNode(BaseModel):
    id: str
    ip: str
    country: str
    city: Optional[str] = None
    latitude: float
    longitude: float
    node_type: str
    status: str
    traffic_volume: int
    last_seen: str


class NetworkEdge(BaseModel):
    id: str
    source_id: str
    target_id: str
    connection_type: str
    bandwidth: int
    latency: float
    packet_count: int
    attack_type: Optional[str] = None


class NetworkTrafficData(BaseModel):
    country: str
    timestamp: str
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    total_traffic: int
    attack_count: int
    suspicious_count: int
    normal_count: int


class GlobalNetworkStats(BaseModel):
    total_countries: int
    total_nodes: int
    total_connections: int
    active_attacks: int
    suspicious_activity: int
    last_updated: str


@router.get("/countries")
async def get_available_countries():
    """Get list of available countries"""
    countries = [
        "United States", "China", "Germany", "United Kingdom", "Japan", 
        "Russia", "Brazil", "India", "France", "South Korea", "Canada",
        "Australia", "Italy", "Spain", "Mexico", "Netherlands", "Sweden",
        "Norway", "Switzerland", "Belgium"
    ]
    return {"countries": countries}


def generate_realistic_attack_patterns(nodes: List[NetworkNode], country_name: str):
    """
    Generate sophisticated attack patterns based on real-world cybersecurity scenarios
    Implements various attack types: DDoS, APT, Botnet, Port Scanning, etc.
    """
    edges = []
    current_time = time.time()
    
    # Attack type definitions with realistic characteristics
    attack_scenarios = {
        "DDoS Volumetric": {
            "probability": 0.15,
            "target_types": ["server", "firewall"],
            "bandwidth_range": (5000, 20000),
            "latency_range": (200, 500),
            "packet_count_range": (50000, 200000)
        },
        "Port Scan": {
            "probability": 0.20,
            "target_types": ["server", "router", "firewall"],
            "bandwidth_range": (10, 100),
            "latency_range": (5, 50),
            "packet_count_range": (1000, 10000)
        },
        "Botnet C&C": {
            "probability": 0.10,
            "target_types": ["client"],
            "bandwidth_range": (100, 500),
            "latency_range": (50, 150),
            "packet_count_range": (5000, 25000)
        },
        "SQL Injection": {
            "probability": 0.08,
            "target_types": ["server"],
            "bandwidth_range": (50, 300),
            "latency_range": (10, 100),
            "packet_count_range": (500, 5000)
        },
        "Ransomware": {
            "probability": 0.05,
            "target_types": ["server", "client"],
            "bandwidth_range": (200, 1000),
            "latency_range": (20, 80),
            "packet_count_range": (10000, 50000)
        },
        "APT Exfiltration": {
            "probability": 0.07,
            "target_types": ["server"],
            "bandwidth_range": (500, 2000),
            "latency_range": (30, 120),
            "packet_count_range": (15000, 75000)
        },
        "Zero-Day Exploit": {
            "probability": 0.03,
            "target_types": ["server", "firewall"],
            "bandwidth_range": (100, 800),
            "latency_range": (10, 60),
            "packet_count_range": (2000, 15000)
        },
        "DNS Tunneling": {
            "probability": 0.12,
            "target_types": ["router", "server"],
            "bandwidth_range": (50, 400),
            "latency_range": (15, 90),
            "packet_count_range": (3000, 20000)
        }
    }
    
    # Simulate ongoing attack campaigns
    if random.random() < 0.3:  # 30% chance of active DDoS
        attack_state["ddos_active"] = True
        ddos_target = random.choice([n for n in nodes if n.node_type in ["server", "firewall"]])
        ddos_target.status = "attacked"
        
        # Create multiple attack vectors for DDoS
        num_attackers = random.randint(5, 15)
        for _ in range(num_attackers):
            attacker = random.choice(nodes)
            if attacker.id != ddos_target.id:
                attack_info = attack_scenarios["DDoS Volumetric"]
                edge = NetworkEdge(
                    id=f"edge_ddos_{country_name}_{len(edges)}",
                    source_id=attacker.id,
                    target_id=ddos_target.id,
                    connection_type="attack",
                    bandwidth=random.randint(*attack_info["bandwidth_range"]),
                    latency=random.uniform(*attack_info["latency_range"]),
                    packet_count=random.randint(*attack_info["packet_count_range"]),
                    attack_type="DDoS Volumetric"
                )
                edges.append(edge)
    
    # Regular network connections with random attacks
    edge_count = random.randint(20, 50)
    
    for i in range(edge_count):
        source = random.choice(nodes)
        target = random.choice(nodes)
        
        if source.id != target.id:
            # Determine if this is an attack
            attack_type = None
            connection_type = "normal"
            
            attack_roll = random.random()
            if attack_roll < 0.15:  # 15% attack rate
                connection_type = "attack"
                # Select attack type based on probabilities
                for attack_name, attack_info in attack_scenarios.items():
                    if target.node_type in attack_info["target_types"] and random.random() < attack_info["probability"]:
                        attack_type = attack_name
                        target.status = "attacked" if random.random() < 0.7 else "suspicious"
                        bandwidth = random.randint(*attack_info["bandwidth_range"])
                        latency = random.uniform(*attack_info["latency_range"])
                        packet_count = random.randint(*attack_info["packet_count_range"])
                        break
                
                if not attack_type:  # Fallback to generic attack
                    attack_type = random.choice(list(attack_scenarios.keys()))
                    attack_info = attack_scenarios[attack_type]
                    bandwidth = random.randint(*attack_info["bandwidth_range"])
                    latency = random.uniform(*attack_info["latency_range"])
                    packet_count = random.randint(*attack_info["packet_count_range"])
            elif attack_roll < 0.25:  # 10% suspicious
                connection_type = "suspicious"
                source.status = "suspicious" if random.random() < 0.5 else source.status
                bandwidth = random.randint(100, 1000)
                latency = random.uniform(10, 150)
                packet_count = random.randint(1000, 15000)
            else:  # Normal traffic
                bandwidth = random.randint(10, 500)
                latency = random.uniform(1, 50)
                packet_count = random.randint(100, 5000)
            
            edge = NetworkEdge(
                id=f"edge_{country_name}_{i}",
                source_id=source.id,
                target_id=target.id,
                connection_type=connection_type,
                bandwidth=bandwidth,
                latency=latency,
                packet_count=packet_count,
                attack_type=attack_type if connection_type == "attack" else None
            )
            edges.append(edge)
    
    return edges


@router.get("/country/{country_name}")
async def get_country_network_data(country_name: str, time_range: str = "1h"):
    """
    Get network traffic data for a specific country with realistic attack patterns
    Simulates real-world network security scenarios
    """
    
    # City data for major global locations
    city_database = {
        "United States": ["New York", "Washington DC", "Los Angeles", "Chicago", "Dallas"],
        "China": ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Chengdu"],
        "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow"],
        "Germany": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"],
        "Japan": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"],
        "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
        "Russia": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan"],
        "India": ["New Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai"],
        "Brazil": ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador", "Fortaleza"],
        "Canada": ["Ottawa", "Toronto", "Vancouver", "Montreal", "Calgary"],
    }
    
    cities = city_database.get(country_name, ["Capital City", "Major City", "Regional Hub", "Data Center"])
    
    # Node type distribution (realistic network composition)
    node_type_weights = {
        "client": 50,      # Most nodes are clients
        "server": 25,      # Servers hosting services
        "router": 15,      # Network infrastructure
        "firewall": 7,     # Security appliances
        "load_balancer": 3 # Load balancers
    }
    
    nodes = []
    
    # Generate 20-40 nodes for better performance
    node_count = random.randint(20, 40)
    
    for i in range(node_count):
        # Weighted random selection for node type
        node_type = random.choices(
            list(node_type_weights.keys()),
            weights=list(node_type_weights.values())
        )[0]
        
        # Initial status (most are normal)
        status_roll = random.random()
        if status_roll < 0.75:
            status = "normal"
        elif status_roll < 0.90:
            status = "suspicious"
        elif status_roll < 0.97:
            status = "attacked"
        else:
            status = "blocked"
        
        node = NetworkNode(
            id=f"node_{country_name}_{i}",
            ip=f"{random.randint(10, 200)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
            country=country_name,
            city=random.choice(cities),
            latitude=random.uniform(-90, 90),
            longitude=random.uniform(-180, 180),
            node_type=node_type,
            status=status,
            traffic_volume=random.randint(1000, 75000),
            last_seen=datetime.now().isoformat()
        )
        nodes.append(node)
    
    # Generate edges with sophisticated attack patterns
    edges = generate_realistic_attack_patterns(nodes, country_name)
    
    # Calculate statistics
    total_traffic = sum(node.traffic_volume for node in nodes)
    attack_count = len([e for e in edges if e.connection_type == "attack"])
    suspicious_count = len([e for e in edges if e.connection_type == "suspicious"])
    normal_count = len([e for e in edges if e.connection_type == "normal"])
    
    return NetworkTrafficData(
        country=country_name,
        timestamp=datetime.now().isoformat(),
        nodes=nodes,
        edges=edges,
        total_traffic=total_traffic,
        attack_count=attack_count,
        suspicious_count=suspicious_count,
        normal_count=normal_count
    )


@router.get("/stats/global")
async def get_global_network_stats():
    """Get global network statistics"""
    return GlobalNetworkStats(
        total_countries=20,
        total_nodes=random.randint(500, 1000),
        total_connections=random.randint(2000, 5000),
        active_attacks=random.randint(10, 50),
        suspicious_activity=random.randint(50, 200),
        last_updated=datetime.now().isoformat()
    )


@router.get("/global")
async def get_global_network_data():
    """
    Get global network data for monitoring agent analysis
    Returns aggregated data from multiple countries with attack patterns
    """
    
    # Generate global network data with multiple countries
    countries = ["United States", "China", "Germany", "United Kingdom", "Japan", "Russia", "Brazil", "India"]
    
    all_nodes = []
    all_edges = []
    total_attack_count = 0
    total_suspicious_count = 0
    total_normal_count = 0
    total_traffic = 0
    
    # Generate data for each country (smaller sample for performance)
    for country in countries[:4]:  # Limit to 4 countries for performance
        # Get country data
        country_data = await get_country_network_data(country, "1h")
        
        # Add country prefix to IDs to avoid conflicts
        for node in country_data.nodes:
            node.id = f"global_{node.id}"
            all_nodes.append(node)
            total_traffic += node.traffic_volume
        
        for edge in country_data.edges:
            edge.id = f"global_{edge.id}"
            edge.source_id = f"global_{edge.source_id}"
            edge.target_id = f"global_{edge.target_id}"
            all_edges.append(edge)
            
            if edge.connection_type == "attack":
                total_attack_count += 1
            elif edge.connection_type == "suspicious":
                total_suspicious_count += 1
            else:
                total_normal_count += 1
    
    # Add some cross-country connections
    cross_country_edges = []
    if len(all_nodes) > 10:
        for _ in range(min(20, len(all_nodes) // 2)):  # Limit cross-country edges
            source = random.choice(all_nodes)
            target = random.choice(all_nodes)
            
            if source.id != target.id and source.country != target.country:
                # Cross-country connections are often suspicious
                connection_type = random.choices(
                    ["normal", "suspicious", "attack"],
                    weights=[0.6, 0.3, 0.1]
                )[0]
                
                edge = NetworkEdge(
                    id=f"cross_country_{len(cross_country_edges)}",
                    source_id=source.id,
                    target_id=target.id,
                    connection_type=connection_type,
                    bandwidth=random.randint(100, 2000),
                    latency=random.uniform(50, 200),
                    packet_count=random.randint(1000, 10000),
                    attack_type="Cross-border APT" if connection_type == "attack" else None
                )
                cross_country_edges.append(edge)
                
                if connection_type == "attack":
                    total_attack_count += 1
                elif connection_type == "suspicious":
                    total_suspicious_count += 1
                else:
                    total_normal_count += 1
    
    all_edges.extend(cross_country_edges)
    
    return NetworkTrafficData(
        country="Global",
        timestamp=datetime.now().isoformat(),
        nodes=all_nodes,
        edges=all_edges,
        total_traffic=total_traffic,
        attack_count=total_attack_count,
        suspicious_count=total_suspicious_count,
        normal_count=total_normal_count
    )