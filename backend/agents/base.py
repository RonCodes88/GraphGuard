
"""
Base classes and interfaces for AI agents
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from enum import Enum


class AgentRole(str, Enum):
    """Roles in the AI agent system"""
    ORCHESTRATOR = "orchestrator"
    DETECTOR = "detector"
    INVESTIGATOR = "investigator"
    MONITOR = "monitor"
    JUDGE = "judge"
    MITIGATOR = "mitigator"


class ThreatLevel(str, Enum):
    """Threat severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AgentDecision(BaseModel):
    """Base decision structure for all agents"""
    agent_id: str
    decision: str
    confidence: float
    reasoning: str
    metadata: Dict[str, Any] = {}
    timestamp: Optional[str] = None


class AgentInput(BaseModel):
    """Base input structure for agents"""
    data: Dict[str, Any]
    context: Dict[str, Any] = {}
    previous_decisions: List[AgentDecision] = []


class AgentOutput(BaseModel):
    """Base output structure for agents"""
    decision: AgentDecision
    next_agents: List[str] = []
    should_continue: bool = True


class BaseAgent(ABC):
    """Abstract base class for all AI agents"""
    
    def __init__(self, agent_id: str, role: AgentRole):
        self.agent_id = agent_id
        self.role = role
        self.confidence_threshold = 0.7
    
    @abstractmethod
    async def process(self, input_data: AgentInput) -> AgentOutput:
        """Process input and return decision"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """Return list of agent capabilities"""
        pass
    
    def validate_confidence(self, confidence: float) -> bool:
        """Validate if confidence meets threshold"""
        return confidence >= self.confidence_threshold
    
    def create_decision(
        self, 
        decision: str, 
        confidence: float, 
        reasoning: str,
        metadata: Dict[str, Any] = None
    ) -> AgentDecision:
        """Create a standardized decision object"""
        return AgentDecision(
            agent_id=self.agent_id,
            decision=decision,
            confidence=confidence,
            reasoning=reasoning,
            metadata=metadata or {}
        )
