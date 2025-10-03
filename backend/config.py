"""
AI Agent System Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class AgentConfig(BaseSettings):
    """Configuration for the AI agent system"""
    
    # OpenAI Configuration
    openai_api_key: str
    
    # LangSmith Configuration (optional)
    langchain_tracing_v2: bool = False
    langchain_api_key: Optional[str] = None
    langchain_project: str = "a10hacks-agents"
    
    # Agent System Settings
    agent_confidence_threshold: float = 0.7
    agent_learning_enabled: bool = True
    agent_explainability_enabled: bool = True
    
    # Model Settings
    model_name: str = "gpt-4o-mini"  # Default to fastest model
    model_temperature: float = 0.1
    
    # Fast model settings for speed-critical agents
    fast_model: str = "gpt-4o-mini"
    fast_model_temperature: float = 0.2
    
    # Standard model for complex reasoning (when needed)
    standard_model: str = "gpt-4o"
    standard_model_temperature: float = 0.1
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global configuration instance
config = AgentConfig()
