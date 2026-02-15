from uuid import UUID
from datetime import datetime
from typing import Dict, Any, Optional

# Async database session (mock/interface for now, usually from sqlalchemy.ext.asyncio)
from backend.core.workflow.models import (
    WorkflowExecution, WorkflowStep, WorkflowStatus, RequestType, StepResult, AgentType
)
from backend.core.workflow.steps import StepExecutorFactory
from backend.core.workflow.router import WorkflowRouter

class AgentOrchestrator:
    def __init__(self, db_session: Any):
        self.db = db_session

    async def create_workflow(
        self, 
        tenant_id: UUID, 
        feature_name: str, 
        request_type: RequestType
    ) -> WorkflowExecution:
        
        initial_step = WorkflowRouter.get_initial_step(request_type)
        
        return WorkflowExecution(
            id=UUID("00000000-0000-0000-0000-000000000000"),
            tenant_id=tenant_id,
            feature_name=feature_name,
            request_type=request_type,
            current_step=initial_step,
            status=WorkflowStatus.RUNNING,
            started_at=datetime.utcnow()
        )

    async def execute_step(self, workflow_id: UUID, input_data: Dict[str, Any]) -> StepResult:
        """
        Executes the current step of the workflow using the specific Agent logic.
        """
        # 1. Load workflow state (Mock) - In real app, load from DB using workflow_id
        # For this demo, we assume we know the context or pass it in input_data
        # Let's verify we have a request_type available
        request_type = input_data.get('request_type', RequestType.FEATURE)
        current_step = input_data.get('current_step', WorkflowStep.ANALYSIS)
        
        context = {
            "feature_name": input_data.get('feature_name', "Test Feature"),
            "request_type": request_type
        }
        
        # 2. Get Executor
        try:
            executor = StepExecutorFactory.get_executor(current_step)
        except ValueError as e:
            return StepResult(success=False, step=current_step, agent=AgentType.ORCHESTRATOR, error=str(e))
        
        # 3. Execute
        result = await executor.execute(context, input_data)
        
        # 4. Determine Next Step via Router
        next_step = WorkflowRouter.get_next_step(current_step, result, request_type)
        
        if result.success and next_step:
            print(f"[{current_step}] Success. Advancing to [{next_step}]")
            # In real app: Update DB with new step
            result.next_step = next_step
        
        return result

    async def broadcast_state(self, workflow_id: UUID, state: WorkflowExecution):
        """
        Send state update to WebSocket
        """
        # In main.py we will have a connection manager.
        # await connection_manager.send_personal_message(state.json(), workflow_id)
        pass

    async def _load_workflow(self, workflow_id: UUID) -> WorkflowExecution:
        # Fetch from DB
        pass
    
    async def _save_workflow(self, state: WorkflowExecution):
        # Update DB
        pass
