-- Migration: Create period_close_checklist table for tracking close progress
-- Version: 20260206_period_close_checklist

CREATE TABLE IF NOT EXISTS period_close_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    check_name VARCHAR(100) NOT NULL,
    check_key VARCHAR(50) NOT NULL, -- 'journals_posted', 'ar_reconciled', etc.
    check_order INT NOT NULL DEFAULT 0,
    is_automated BOOLEAN DEFAULT FALSE, -- TRUE = system checks automatically
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, period_id, check_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_period_close_checklist_tenant ON period_close_checklist(tenant_id);
CREATE INDEX IF NOT EXISTS idx_period_close_checklist_period ON period_close_checklist(period_id);

-- Enable RLS
ALTER TABLE period_close_checklist ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS tenant_isolation ON period_close_checklist;
CREATE POLICY tenant_isolation ON period_close_checklist
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Comments
COMMENT ON TABLE period_close_checklist IS 'Checklist items for period closing workflow';
COMMENT ON COLUMN period_close_checklist.check_key IS 'Unique identifier: journals_posted, ar_reconciled, ap_reconciled, etc.';
COMMENT ON COLUMN period_close_checklist.is_automated IS 'TRUE means system will auto-validate this check';
