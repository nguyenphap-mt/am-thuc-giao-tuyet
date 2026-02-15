from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class RequestType(str, Enum):
    FEATURE = "feature"
    BUG = "bug"
    REFACTOR = "refactor"
    MODULE = "module"

class WorkflowStatus(str, Enum):
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AgentType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"
    SECURITY = "security"
    QA = "qa"
    BROWSER_TEST = "browser_test"

class WorkflowStep(str, Enum):
    ROADMAP_ALIGNMENT = "roadmap_alignment"
    ANALYSIS = "analysis"
    DATABASE = "database"
    BACKEND = "backend"
    FRONTEND = "frontend"
    BROWSER_TEST = "browser_test"
    PERMISSION_CHECK = "permission_check"
    DOCUMENTATION = "documentation"
    FINAL_VERIFICATION = "final_verification"
    ROADMAP_UPDATE = "roadmap_update"

class WorkflowExecution(BaseModel):
    id: UUID
    tenant_id: UUID
    feature_name: str
    request_type: RequestType
    current_step: WorkflowStep
    checkpoints: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    errors: List[str] = Field(default_factory=list)
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: WorkflowStatus

    class Config:
        from_attributes = True

class StepResult(BaseModel):
    success: bool
    step: WorkflowStep
    agent: AgentType
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    next_step: Optional[WorkflowStep] = None

class AgentLog(BaseModel):
    workflow_id: UUID
    agent_type: AgentType
    action: str
    details: Dict[str, Any]
    level: str = "info"
