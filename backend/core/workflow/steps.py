from abc import ABC, abstractmethod
from typing import Dict, Any
from backend.core.workflow.models import StepResult, WorkflowStep, AgentType

class BaseStepExecutor(ABC):
    @property
    @abstractmethod
    def step(self) -> WorkflowStep:
        pass
        
    @property
    @abstractmethod
    def agent_type(self) -> AgentType:
        pass

    @abstractmethod
    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        pass

class RoadmapAlignmentStep(BaseStepExecutor):
    step = WorkflowStep.ROADMAP_ALIGNMENT
    agent_type = AgentType.ORCHESTRATOR

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        found_in_roadmap = True # Mock
        return StepResult(
            success=True,
            step=self.step,
            agent=self.agent_type,
            data={"roadmap_aligned": found_in_roadmap},
            next_step=WorkflowStep.ANALYSIS if found_in_roadmap else None
        )

class AnalysisStep(BaseStepExecutor):
    step = WorkflowStep.ANALYSIS
    agent_type = AgentType.ORCHESTRATOR

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        from backend.core.llm.service import llm_client
        from backend.core.utils.rule_loader import RuleLoader
        
        feature_name = context.get('feature_name', input_data.get('feature_name'))
        request_details = input_data.get('details', '')
        core_rules = RuleLoader.get_core_rules()

        system_prompt = f"""
        You are the Lead Architect. Perform a 5-Dimensional Assessment for this feature.
        GLOBAL RULES (MUST FOLLOW): {core_rules}
        Output JSON with keys: ux, ui, fe, be, da.
        """
        prompt = f"Feature: {feature_name}\nDetails: {request_details}"
        
        try:
            analysis = await llm_client.generate_json(prompt, system_prompt=system_prompt)
            return StepResult(success=True, step=self.step, agent=self.agent_type, data=analysis, next_step=WorkflowStep.DATABASE)
        except Exception as e:
            return StepResult(success=False, step=self.step, agent=self.agent_type, error=str(e))

class DatabaseStep(BaseStepExecutor):
    step = WorkflowStep.DATABASE
    agent_type = AgentType.DATABASE

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        from backend.core.llm.service import llm_client
        from backend.core.utils.rule_loader import RuleLoader
        
        feature_name = context.get('feature_name', input_data.get('feature_name'))
        analysis = context.get('analysis', {})
        
        if analysis.get('da', {}).get('level') == 'Low':
            return StepResult(success=True, step=self.step, agent=self.agent_type, data={"message": "No DB changes"}, next_step=WorkflowStep.BACKEND)

        db_rules = RuleLoader.get_database_rules()
        system_prompt = f"""
        You are the Database Specialist. Generate PostgreSQL migration SQL.
        DATABASE RULES: {db_rules}
        """
        prompt = f"Feature: {feature_name}\nGenerate SQL migration."
        
        try:
            sql = await llm_client.generate_response(prompt, system_prompt=system_prompt)
            return StepResult(success=True, step=self.step, agent=self.agent_type, data={"sql": sql}, next_step=WorkflowStep.BACKEND)
        except Exception as e:
            return StepResult(success=False, step=self.step, agent=self.agent_type, error=str(e))

class BackendStep(BaseStepExecutor):
    step = WorkflowStep.BACKEND
    agent_type = AgentType.BACKEND

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        from backend.core.llm.service import llm_client
        from backend.core.utils.rule_loader import RuleLoader
        
        feature_name = context.get('feature_name', input_data.get('feature_name'))
        db_sql = input_data.get('sql', 'No DB Changes')
        core_rules = RuleLoader.get_core_rules() # Should have backend rules too
        
        system_prompt = f"""
        You are the Backend Developer (Python/FastAPI).
        CORE RULES: {core_rules}
        Generate the Python implementation (Models, Routes, Service).
        """
        prompt = f"Feature: {feature_name}\nDB Schema: {db_sql}\nGenerate Python Code."
        
        try:
            code = await llm_client.generate_response(prompt, system_prompt=system_prompt)
            return StepResult(success=True, step=self.step, agent=self.agent_type, data={"python_code": code}, next_step=WorkflowStep.FRONTEND)
        except Exception as e:
            return StepResult(success=False, step=self.step, agent=self.agent_type, error=str(e))

class FrontendStep(BaseStepExecutor):
    step = WorkflowStep.FRONTEND
    agent_type = AgentType.FRONTEND

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        from backend.core.llm.service import llm_client
        from backend.core.utils.rule_loader import RuleLoader
        
        feature_name = context.get('feature_name', input_data.get('feature_name'))
        fe_rules = RuleLoader.get_frontend_rules()
        
        system_prompt = f"""
        You are the Frontend Developer (Angular).
        FRONTEND RULES: {fe_rules}
        Generate Angular Components and Services.
        """
        prompt = f"Feature: {feature_name}\nGenerate Angular Code."
        
        try:
            code = await llm_client.generate_response(prompt, system_prompt=system_prompt)
            return StepResult(success=True, step=self.step, agent=self.agent_type, data={"angular_code": code}, next_step=WorkflowStep.BROWSER_TEST)
        except Exception as e:
            return StepResult(success=False, step=self.step, agent=self.agent_type, error=str(e))

class BrowserTestStep(BaseStepExecutor):
    step = WorkflowStep.BROWSER_TEST
    agent_type = AgentType.BROWSER_TEST

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        # Mock Browser Test
        return StepResult(success=True, step=self.step, agent=self.agent_type, data={"test_report": "All Passed"}, next_step=WorkflowStep.PERMISSION_CHECK)

class PermissionStep(BaseStepExecutor):
    step = WorkflowStep.PERMISSION_CHECK
    agent_type = AgentType.SECURITY

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        from backend.core.llm.service import llm_client
        from backend.core.utils.rule_loader import RuleLoader
        
        sec_rules = RuleLoader.get_security_rules()
        feature_name = context.get('feature_name', input_data.get('feature_name'))

        system_prompt = f"""
        You are the Security Specialist. Review and update the Permission Matrix.
        SECURITY RULES: {sec_rules}
        """
        try:
            matrix = await llm_client.generate_response(f"Update matrix for {feature_name}", system_prompt=system_prompt)
            return StepResult(success=True, step=self.step, agent=self.agent_type, data={"permissions": matrix}, next_step=WorkflowStep.DOCUMENTATION)
        except Exception as e:
             return StepResult(success=False, step=self.step, agent=self.agent_type, error=str(e))

class DocumentationStep(BaseStepExecutor):
    step = WorkflowStep.DOCUMENTATION
    agent_type = AgentType.QA

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        return StepResult(success=True, step=self.step, agent=self.agent_type, data={"docs": "Updated"}, next_step=WorkflowStep.FINAL_VERIFICATION)

class FinalVerificationStep(BaseStepExecutor):
    step = WorkflowStep.FINAL_VERIFICATION
    agent_type = AgentType.ORCHESTRATOR

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        return StepResult(success=True, step=self.step, agent=self.agent_type, data={"status": "Released"}, next_step=None)

class RoadmapUpdateStep(BaseStepExecutor):
    step = WorkflowStep.ROADMAP_UPDATE
    agent_type = AgentType.ORCHESTRATOR

    async def execute(self, context: Dict[str, Any], input_data: Dict[str, Any]) -> StepResult:
        return StepResult(success=True, step=self.step, agent=self.agent_type, data={"roadmap": "Updated"}, next_step=None)

class StepExecutorFactory:
    @classmethod
    def get_executor(cls, step: WorkflowStep) -> BaseStepExecutor:
        executors = {
            WorkflowStep.ROADMAP_ALIGNMENT: RoadmapAlignmentStep(),
            WorkflowStep.ANALYSIS: AnalysisStep(),
            WorkflowStep.DATABASE: DatabaseStep(),
            WorkflowStep.BACKEND: BackendStep(),
            WorkflowStep.FRONTEND: FrontendStep(),
            WorkflowStep.BROWSER_TEST: BrowserTestStep(),
            WorkflowStep.PERMISSION_CHECK: PermissionStep(),
            WorkflowStep.DOCUMENTATION: DocumentationStep(),
            WorkflowStep.FINAL_VERIFICATION: FinalVerificationStep(),
            WorkflowStep.ROADMAP_UPDATE: RoadmapUpdateStep(),
        }
        
        executor = executors.get(step)
        if not executor:
            raise ValueError(f"No executor found for step {step}")
        return executor
