-- Workflow Execution State (persists agent workflow progress)
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    feature_name TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('feature', 'bug', 'refactor', 'module')),
    current_step TEXT NOT NULL DEFAULT 'roadmap_alignment',
    checkpoints JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed', 'cancelled'))
);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_executions
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE INDEX idx_workflow_tenant_status ON workflow_executions(tenant_id, status);

-- Agent Memory (context persistence between steps)
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL, -- 'orchestrator', 'backend', 'frontend', 'database', 'security', 'qa'
    step_name TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, agent_type, step_name, memory_key)
);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agent_memory
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE INDEX idx_agent_memory_workflow ON agent_memory(workflow_id);

-- Workflow Logs (audit trail for agent actions)
CREATE TABLE workflow_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    workflow_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    agent_type TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    level TEXT DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_logs
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE INDEX idx_workflow_logs_workflow ON workflow_logs(workflow_id, created_at DESC);
