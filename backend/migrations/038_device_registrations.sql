-- ============================================================================
-- Migration 038: Device Registrations for Push Notifications
-- Mobile Platform Phase 1 (Sprint S1.3)
-- ============================================================================

-- Device Registration (for push notifications)
CREATE TABLE IF NOT EXISTS device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    device_name VARCHAR(255),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, device_token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_device_reg_tenant ON device_registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_user ON device_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_device_reg_active ON device_registrations(tenant_id, user_id, is_active);

-- Enable RLS
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_device_registrations ON device_registrations
    USING (tenant_id = current_setting('app.current_tenant')::uuid);
