-- Migration: 027_add_notification_preferences.sql
-- Purpose: Add notification preferences and settings tables
-- Date: 2026-02-10

-- ============================================
-- Table 1: notification_preferences
-- Per-user, per-type, per-channel preferences
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- What & Where
    notification_type VARCHAR(50) NOT NULL,  -- ORDER_CREATED, INVENTORY_LOW_STOCK, etc.
    channel VARCHAR(20) NOT NULL,            -- IN_APP, EMAIL, PUSH, SMS
    is_enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, notification_type, channel)
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_preferences_tenant_isolation 
    ON notification_preferences FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Performance indexes
CREATE INDEX idx_notif_pref_user ON notification_preferences(user_id);
CREATE INDEX idx_notif_pref_user_type ON notification_preferences(user_id, notification_type);

COMMENT ON TABLE notification_preferences IS 'Per-user notification preferences for each type and channel';

-- ============================================
-- Table 2: notification_settings
-- Per-user global notification settings
-- ============================================
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Global channels on/off
    channel_email_enabled BOOLEAN DEFAULT TRUE,
    channel_push_enabled BOOLEAN DEFAULT FALSE,
    channel_sms_enabled BOOLEAN DEFAULT FALSE,
    channel_inapp_enabled BOOLEAN DEFAULT TRUE,
    
    -- Email frequency
    email_frequency VARCHAR(20) DEFAULT 'IMMEDIATE',  -- IMMEDIATE, DAILY_DIGEST
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One settings row per user
    UNIQUE(user_id)
);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY notification_settings_tenant_isolation 
    ON notification_settings FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE INDEX idx_notif_settings_user ON notification_settings(user_id);

COMMENT ON TABLE notification_settings IS 'Per-user global notification settings (channels, quiet hours, frequency)';
