-- Migration: 027_push_tokens.sql
-- Push notification token storage for mobile app
-- Created: 2026-02-27 (PRD-mobile-platform-v3)

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_tenant_id ON push_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Row-Level Security (multi-tenant isolation)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_tokens_tenant_isolation ON push_tokens
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Comment
COMMENT ON TABLE push_tokens IS 'Stores FCM/APNs push notification tokens for mobile devices';
