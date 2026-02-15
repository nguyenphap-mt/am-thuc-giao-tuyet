from uuid import UUID
from typing import Dict, Any

async def run_workflow_step_task(ctx, workflow_id: UUID, step_name: str, input_data: Dict[str, Any]):
    """
    Background task to execute a single workflow step.
    """
    print(f"Executing step {step_name} for workflow {workflow_id}")
    
    # In a real implementation:
    # orchestrator = AgentOrchestrator(ctx['db'])
    # result = await orchestrator.execute_step(workflow_id, input_data)
    # return result.dict()
    
    return {"status": "success", "step": step_name}

# Add to worker settings
# WorkerSettings.functions = [run_workflow_step_task]
