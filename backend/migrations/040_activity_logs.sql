-- Migration: 040_activity_logs.sql
-- Purpose: Track user activities for audit trail
-- Created: 2026-01-26

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action Info
    action VARCHAR(100) NOT NULL,  -- LOGIN, LOGOUT, CREATE_USER, UPDATE_ORDER, etc.
    entity_type VARCHAR(50),       -- User, Order, Quote, etc.
    entity_id UUID,
    
    -- Details
    metadata JSONB DEFAULT '{}',   -- Additional context
    ip_address INET,
    user_agent TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS Policy
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_logs_tenant_isolation ON activity_logs
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Comment
COMMENT ON TABLE activity_logs IS 'Nhật ký hoạt động người dùng';
COMMENT ON COLUMN activity_logs.action IS 'Loại hành động: LOGIN, LOGOUT, CREATE_*, UPDATE_*, DELETE_*';
