-- Migration: Add Leave Approval History Table
-- Purpose: Track all approval/rejection actions for audit trail

-- Create approval history table
CREATE TABLE IF NOT EXISTS leave_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(20) NOT NULL CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    action_by UUID REFERENCES users(id),  -- NULL for system actions
    action_by_name VARCHAR(255),  -- Denormalized for audit purposes
    action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Comments/reason for action
    comment TEXT,
    
    -- Approval chain info
    approval_level INT DEFAULT 1,  -- 1=Team Lead, 2=HR, 3=Final
    
    -- Status before and after
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leave_approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation ON leave_approval_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Indexes
CREATE INDEX idx_leave_approval_history_tenant ON leave_approval_history(tenant_id);
CREATE INDEX idx_leave_approval_history_request ON leave_approval_history(leave_request_id);
CREATE INDEX idx_leave_approval_history_action_by ON leave_approval_history(action_by);
CREATE INDEX idx_leave_approval_history_action_at ON leave_approval_history(action_at DESC);

-- Add approval_comment column to leave_requests if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' AND column_name = 'approval_comment'
    ) THEN
        ALTER TABLE leave_requests ADD COLUMN approval_comment TEXT;
    END IF;
END $$;

-- Add approved_by column to leave_requests if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE leave_requests ADD COLUMN approved_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add approved_by_name column (denormalized for audit)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_requests' AND column_name = 'approved_by_name'
    ) THEN
        ALTER TABLE leave_requests ADD COLUMN approved_by_name VARCHAR(255);
    END IF;
END $$;

COMMENT ON TABLE leave_approval_history IS 'Audit trail for leave request approvals/rejections';
COMMENT ON COLUMN leave_approval_history.approval_level IS '1=Team Lead, 2=HR Manager, 3=Director (Final)';
