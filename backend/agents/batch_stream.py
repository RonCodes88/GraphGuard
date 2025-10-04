"""
WebSocket endpoint for streaming network data in batches
Provides progressive revelation of network nodes and edges
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
import asyncio
import json
from datetime import datetime
from agents.batch_processor import country_batch_manager

class BatchStreamManager:
    """Manages WebSocket connections for batch streaming"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.country_streams: Dict[str, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, country: str):
        """Accept new WebSocket connection for a specific country"""
        await websocket.accept()
        connection_id = f"{country}_{datetime.now().timestamp()}"
        self.active_connections[connection_id] = websocket
        
        # Initialize stream state for this country
        self.country_streams[connection_id] = {
            'country': country,
            'is_streaming': False,
            'current_batch': 0,
            'total_batches': 0,
            'start_time': None
        }
        
        print(f"Batch stream connected for {country}. Connection ID: {connection_id}")
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Remove WebSocket connection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if connection_id in self.country_streams:
            del self.country_streams[connection_id]
        print(f"Batch stream disconnected: {connection_id}")
    
    async def start_country_batch_stream(
        self, 
        connection_id: str, 
        country: str,
        batch_interval: float = 3.0
    ):
        """
        Start streaming batches for a specific country
        """
        if connection_id not in self.active_connections:
            print(f"Connection {connection_id} not found in active connections")
            return
        
        websocket = self.active_connections[connection_id]
        stream_state = self.country_streams[connection_id]
        
        try:
            # Get batches for this country
            print(f"Getting batches for country: {country}")
            batches = country_batch_manager.get_country_batches(country)
            
            if not batches:
                print(f"No batches found for {country}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"No data available for {country}",
                    "timestamp": datetime.now().isoformat()
                })
                return
            
            stream_state['is_streaming'] = True
            stream_state['total_batches'] = len(batches)
            stream_state['start_time'] = datetime.now().timestamp()
            
            # Send initial connection confirmation
            print(f"Sending connection confirmation for {country} with {len(batches)} batches")
            await websocket.send_json({
                "type": "connection",
                "status": "connected",
                "country": country,
                "total_batches": len(batches),
                "batch_interval": batch_interval,
                "message": f"Starting batch stream for {country} with {len(batches)} batches",
                "timestamp": datetime.now().isoformat()
            })
            
            # Stream each batch
            for i, batch in enumerate(batches):
                if not stream_state['is_streaming']:
                    break
                
                # Update batch info
                batch['batch_number'] = i
                batch['total_batches'] = len(batches)
                batch['elapsed_time'] = datetime.now().timestamp() - stream_state['start_time']
                batch['type'] = "batch"
                
                # Send batch data
                print(f"Sending batch {i+1}/{len(batches)} for {country} with {len(batch.get('nodes', []))} nodes")
                await websocket.send_json(batch)
                
                stream_state['current_batch'] = i + 1
                
                # Wait before next batch (except for last batch)
                if i < len(batches) - 1:
                    await asyncio.sleep(batch_interval)
            
            # Send completion message
            await websocket.send_json({
                "type": "complete",
                "country": country,
                "total_batches_sent": len(batches),
                "message": f"Batch stream completed for {country}",
                "timestamp": datetime.now().isoformat()
            })
            
        except WebSocketDisconnect:
            print(f"Client disconnected during batch stream for {country}")
            self.disconnect(connection_id)
        except Exception as e:
            print(f"Error in batch stream for {country}: {e}")
            await websocket.send_json({
                "type": "error",
                "message": f"Stream error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })
            self.disconnect(connection_id)
    
    async def pause_stream(self, connection_id: str):
        """Pause the current stream"""
        if connection_id in self.country_streams:
            self.country_streams[connection_id]['is_streaming'] = False
    
    async def resume_stream(self, connection_id: str):
        """Resume the current stream"""
        if connection_id in self.country_streams:
            self.country_streams[connection_id]['is_streaming'] = True
    
    async def stop_stream(self, connection_id: str):
        """Stop the current stream"""
        if connection_id in self.country_streams:
            self.country_streams[connection_id]['is_streaming'] = False
    
    def get_stream_status(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get current stream status"""
        if connection_id in self.country_streams:
            state = self.country_streams[connection_id]
            return {
                'country': state['country'],
                'is_streaming': state['is_streaming'],
                'current_batch': state['current_batch'],
                'total_batches': state['total_batches'],
                'progress_percentage': (state['current_batch'] / state['total_batches'] * 100) if state['total_batches'] > 0 else 0
            }
        return None


# Global batch stream manager
batch_stream_manager = BatchStreamManager()


async def handle_batch_stream_websocket(websocket: WebSocket, country: str):
    """
    WebSocket endpoint for streaming network data in batches
    """
    await websocket.accept()
    print(f"WebSocket connection accepted for {country}")
    
    try:
        # Get batches for this country
        batches = country_batch_manager.get_country_batches(country)
        
        if not batches:
            await websocket.send_json({
                "type": "error",
                "message": f"No data available for {country}",
                "timestamp": datetime.now().isoformat()
            })
            return
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "country": country,
            "total_batches": len(batches),
            "batch_interval": 3.0,
            "message": f"Starting batch stream for {country} with {len(batches)} batches",
            "timestamp": datetime.now().isoformat()
        })
        
        # Stream each batch
        for i, batch in enumerate(batches):
            # Update batch info
            batch['batch_number'] = i
            batch['total_batches'] = len(batches)
            batch['elapsed_time'] = i * 3.0  # Simulate elapsed time
            batch['type'] = "batch"
            
            # Send batch data
            await websocket.send_json(batch)
            print(f"Sent batch {i+1}/{len(batches)} for {country}")
            
            # Wait before next batch (except for last batch)
            if i < len(batches) - 1:
                await asyncio.sleep(3.0)
        
        # Send completion message
        await websocket.send_json({
            "type": "complete",
            "message": f"Batch stream completed for {country}",
            "timestamp": datetime.now().isoformat()
        })
        
    except WebSocketDisconnect:
        print(f"Client disconnected: {country}")
    except Exception as e:
        print(f"WebSocket error for {country}: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Stream error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            })
        except:
            pass
