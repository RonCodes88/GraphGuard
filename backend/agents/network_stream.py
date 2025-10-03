"""
WebSocket streaming for continuous network traffic simulation
Provides real-time network traffic updates for visualization
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Set
import asyncio
import json
import random
from datetime import datetime
from agents.network_api import generate_realistic_attack_patterns, NetworkNode

class NetworkTrafficStreamer:
    """Manages WebSocket connections and streams network traffic data"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.streaming_active = False
        
        # Available countries for rotation
        self.countries = [
            "United States", "China", "Germany", "United Kingdom", "Japan", 
            "Russia", "Brazil", "India", "France", "South Korea"
        ]
        
        self.city_database = {
            "United States": ["New York", "Washington DC", "Los Angeles", "Chicago", "Dallas"],
            "China": ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Chengdu"],
            "United Kingdom": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow"],
            "Germany": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"],
            "Japan": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"],
            "France": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
            "Russia": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan"],
            "India": ["New Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai"],
            "Brazil": ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador", "Fortaleza"],
            "South Korea": ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon"],
        }
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"WebSocket connected. Active connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.active_connections.discard(websocket)
        print(f"WebSocket disconnected. Active connections: {len(self.active_connections)}")
    
    def generate_traffic_batch(self, country: str = None) -> dict:
        """Generate a batch of network traffic"""
        
        if not country:
            country = random.choice(self.countries)
        
        cities = self.city_database.get(country, ["Capital City", "Major City"])
        
        # Node type distribution
        node_type_weights = {
            "client": 50,
            "server": 25,
            "router": 15,
            "firewall": 7,
            "load_balancer": 3
        }
        
        # Generate 20-40 nodes for each batch
        node_count = random.randint(20, 40)
        nodes = []
        
        for i in range(node_count):
            node_type = random.choices(
                list(node_type_weights.keys()),
                weights=list(node_type_weights.values())
            )[0]
            
            status_roll = random.random()
            if status_roll < 0.70:
                status = "normal"
            elif status_roll < 0.85:
                status = "suspicious"
            elif status_roll < 0.95:
                status = "attacked"
            else:
                status = "blocked"
            
            node = NetworkNode(
                id=f"node_{country}_{i}_{int(datetime.now().timestamp() * 1000)}",
                ip=f"{random.randint(10, 200)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
                country=country,
                city=random.choice(cities),
                latitude=random.uniform(-90, 90),
                longitude=random.uniform(-180, 180),
                node_type=node_type,
                status=status,
                traffic_volume=random.randint(1000, 50000),
                last_seen=datetime.now().isoformat()
            )
            nodes.append(node)
        
        # Generate edges with attack patterns
        edges = generate_realistic_attack_patterns(nodes, country)
        
        # Calculate statistics
        total_traffic = sum(node.traffic_volume for node in nodes)
        attack_count = len([e for e in edges if e.connection_type == "attack"])
        suspicious_count = len([e for e in edges if e.connection_type == "suspicious"])
        normal_count = len([e for e in edges if e.connection_type == "normal"])
        
        return {
            "country": country,
            "timestamp": datetime.now().isoformat(),
            "nodes": [node.dict() for node in nodes],
            "edges": [edge.dict() for edge in edges],
            "total_traffic": total_traffic,
            "attack_count": attack_count,
            "suspicious_count": suspicious_count,
            "normal_count": normal_count,
            "batch_id": int(datetime.now().timestamp() * 1000)
        }
    
    async def stream_traffic(
        self, 
        websocket: WebSocket,
        interval: float = 2.0,
        duration: int = 300  # 5 minutes default
    ):
        """
        Stream network traffic continuously
        
        Args:
            websocket: WebSocket connection
            interval: Seconds between traffic batches (default 2.0)
            duration: Total duration in seconds (default 300 = 5 minutes)
        """
        try:
            start_time = datetime.now().timestamp()
            batch_count = 0
            
            # Send initial connection confirmation
            await websocket.send_json({
                "type": "connection",
                "status": "connected",
                "message": f"Streaming will run for {duration} seconds with {interval}s intervals",
                "timestamp": datetime.now().isoformat()
            })
            
            while True:
                # Check if duration exceeded
                elapsed = datetime.now().timestamp() - start_time
                if elapsed > duration:
                    await websocket.send_json({
                        "type": "complete",
                        "message": f"Stream completed. Sent {batch_count} batches.",
                        "timestamp": datetime.now().isoformat()
                    })
                    break
                
                # Generate and send traffic batch
                country = random.choice(self.countries)
                traffic_data = self.generate_traffic_batch(country)
                traffic_data["type"] = "traffic"
                traffic_data["batch_number"] = batch_count
                traffic_data["elapsed_time"] = int(elapsed)
                traffic_data["remaining_time"] = int(duration - elapsed)
                
                await websocket.send_json(traffic_data)
                
                batch_count += 1
                
                # Wait before next batch
                await asyncio.sleep(interval)
                
        except WebSocketDisconnect:
            print(f"Client disconnected after {batch_count} batches")
            self.disconnect(websocket)
        except Exception as e:
            print(f"Error in stream_traffic: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

# Global streamer instance
network_streamer = NetworkTrafficStreamer()
