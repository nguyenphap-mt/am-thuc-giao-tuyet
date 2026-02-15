-- Migration: Create period_audit_log table for tracking period actions
-- Version: 20260206_period_audit_log

CREATE TABLE IF NOT EXISTS period_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CLOSE', 'REOPEN', 'CREATE', 'DELETE'
    performed_by UUID,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    extra_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_period_audit_log_tenant ON period_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_audit_log_period ON period_audit_log(period_id);
CREATE INDEX IF NOT EXISTS idx_period_audit_log_action ON period_audit_log(action);

-- Enable RLS
ALTER TABLE period_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS tenant_isolation ON period_audit_log;
CREATE POLICY tenant_isolation ON period_audit_log
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Comments
COMMENT ON TABLE period_audit_log IS 'Audit trail for accounting period actions (close/reopen/etc)';
COMMENT ON COLUMN period_audit_log.action IS 'Action type: CLOSE, REOPEN, CREATE, DELETE';
COMMENT ON COLUMN period_audit_log.reason IS 'Required reason for REOPEN action';
