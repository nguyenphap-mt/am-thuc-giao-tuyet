from typing import Optional
from backend.core.workflow.models import WorkflowStep, RequestType, StepResult

class WorkflowRouter:
    """
    Determines the next step in the workflow based on the current step,
    the result of the execution, and the request type (Feature, Bug, Refactor).
    """

    @staticmethod
    def get_initial_step(request_type: RequestType) -> WorkflowStep:
        if request_type == RequestType.FEATURE:
            return WorkflowStep.ROADMAP_ALIGNMENT
        elif request_type == RequestType.BUG:
            return WorkflowStep.ANALYSIS # Analyze the bug first
        elif request_type == RequestType.REFACTOR:
            return WorkflowStep.ANALYSIS
        elif request_type == RequestType.MODULE:
            return WorkflowStep.ANALYSIS
        return WorkflowStep.ROADMAP_ALIGNMENT

    @staticmethod
    def get_next_step(current_step: WorkflowStep, result: StepResult, request_type: RequestType) -> Optional[WorkflowStep]:
        if not result.success:
            return None # Stop on failure logic handled by Orchestrator (loops or error state)

        # Default linear flow overrides
        if current_step == WorkflowStep.ROADMAP_ALIGNMENT:
            return WorkflowStep.ANALYSIS
        
        if current_step == WorkflowStep.ANALYSIS:
            # If DA level is Low, skip Database?
            # This logic is partly in StepExecutor, but Router is better place for global flow
            analysis_data = result.data
            if analysis_data.get('da', {}).get('level') == 'Low':
                return WorkflowStep.BACKEND
            return WorkflowStep.DATABASE

        if current_step == WorkflowStep.DATABASE:
            return WorkflowStep.BACKEND

        if current_step == WorkflowStep.BACKEND:
            return WorkflowStep.FRONTEND

        if current_step == WorkflowStep.FRONTEND:
            return WorkflowStep.BROWSER_TEST
        
        if current_step == WorkflowStep.BROWSER_TEST:
            return WorkflowStep.PERMISSION_CHECK

        if current_step == WorkflowStep.PERMISSION_CHECK:
            return WorkflowStep.DOCUMENTATION
            
        if current_step == WorkflowStep.DOCUMENTATION:
            if request_type == RequestType.FEATURE:
                return WorkflowStep.ROADMAP_UPDATE
            return WorkflowStep.FINAL_VERIFICATION
            
        return None
