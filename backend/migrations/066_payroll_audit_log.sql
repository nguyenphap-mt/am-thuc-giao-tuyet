-- Migration: Add payroll audit log table
-- Tracks all payroll actions: calculate, approve, pay, reopen, delete, edit

CREATE TABLE IF NOT EXISTS payroll_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    period_id UUID REFERENCES payroll_periods(id) ON DELETE SET NULL,
    item_id UUID REFERENCES payroll_items(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(30) NOT NULL,  -- CALCULATE, APPROVE, PAY, REOPEN, DELETE, EDIT_ITEM
    action_by UUID,               -- User who performed the action
    action_by_name VARCHAR(255),  -- Denormalized for audit
    action_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Context
    period_name VARCHAR(50),      -- Denormalized for when period is deleted
    employee_name VARCHAR(100),   -- Denormalized for item actions
    details TEXT,                 -- JSON string with action details
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_audit_tenant ON payroll_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_period ON payroll_audit_logs(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_action ON payroll_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_at ON payroll_audit_logs(action_at);

-- RLS
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_audit_logs_tenant_isolation ON payroll_audit_logs;
CREATE POLICY payroll_audit_logs_tenant_isolation ON payroll_audit_logs
    USING (tenant_id = (SELECT current_setting('app.current_tenant')::UUID));

COMMENT ON TABLE payroll_audit_logs IS 'Nhật ký hành động lương - audit trail';
