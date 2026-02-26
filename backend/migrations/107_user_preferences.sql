-- Migration: Create user_preferences table for per-user appearance settings
-- Replaces per-tenant appearance settings in tenant_settings table

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, preference_key)
);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant_id ON user_preferences(tenant_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenant isolation
CREATE POLICY user_preferences_tenant_isolation ON user_preferences
    USING (tenant_id = (SELECT current_setting('app.current_tenant')::uuid));

-- Comment
COMMENT ON TABLE user_preferences IS 'Per-user preferences (appearance settings, etc.)';
COMMENT ON COLUMN user_preferences.preference_key IS 'Setting key, e.g. appearance.accent_color';
COMMENT ON COLUMN user_preferences.preference_value IS 'Setting value as string';
