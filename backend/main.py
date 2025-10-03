from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from agents.api import router as agents_router
from agents.network_api import router as network_router
from agents.network_stream import network_streamer

app = FastAPI(
    title="A10Hacks AI Agent System",
    description="AI-powered cybersecurity agent system with conflict resolution",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include agent API routes
app.include_router(agents_router)
app.include_router(network_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to A10Hacks AI Agent System",
        "docs": "/docs",
        "agents": "/api/agents",
        "network": "/api/network",
        "stream": "/ws/network/stream"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "agents": "operational"}

@app.websocket("/ws/network/stream")
async def websocket_network_stream(
    websocket: WebSocket,
    interval: float = 2.0,
    duration: int = 300
):
    """
    WebSocket endpoint for continuous network traffic streaming
    
    Query params:
        interval: Seconds between batches (default 2.0)
        duration: Total duration in seconds (default 300 = 5 minutes)
    """
    await network_streamer.connect(websocket)
    await network_streamer.stream_traffic(websocket, interval=interval, duration=duration)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

