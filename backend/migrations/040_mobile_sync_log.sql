-- ============================================================================
-- Migration 040: Mobile Offline Sync Log
-- Mobile Platform Phase 1 (Sprint S1.4)
-- ============================================================================

-- Offline Sync Log
CREATE TABLE IF NOT EXISTS mobile_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    payload JSONB NOT NULL,
    client_timestamp TIMESTAMPTZ NOT NULL,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    conflict_resolved BOOLEAN DEFAULT false,
    resolution_strategy VARCHAR(20) DEFAULT 'last_write_wins'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_log_tenant ON mobile_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user ON mobile_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_entity ON mobile_sync_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE mobile_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_mobile_sync_log ON mobile_sync_log
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
