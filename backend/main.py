from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents.api import router as agents_router
from agents.network_api import router as network_router

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
        "agents": "/api/agents"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "agents": "operational"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

