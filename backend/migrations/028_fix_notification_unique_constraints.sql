-- Migration 028: Fix UNIQUE constraints for multi-tenancy (P4)
-- Adds tenant_id to UNIQUE constraints on notification_preferences and notification_settings

-- Fix notification_settings: UNIQUE(user_id) -> UNIQUE(tenant_id, user_id)
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_settings_user_id_key') THEN
        ALTER TABLE notification_settings DROP CONSTRAINT notification_settings_user_id_key;
    END IF;
    
    -- Add multi-tenant-safe constraint (if not already present)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_settings_tenant_user_unique') THEN
        ALTER TABLE notification_settings 
            ADD CONSTRAINT notification_settings_tenant_user_unique UNIQUE(tenant_id, user_id);
    END IF;
END $$;

-- Fix notification_preferences: UNIQUE(user_id, notification_type, channel) -> UNIQUE(tenant_id, user_id, notification_type, channel)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_notification_type_channel_key') THEN
        ALTER TABLE notification_preferences DROP CONSTRAINT notification_preferences_user_id_notification_type_channel_key;
    END IF;
    
    -- Add multi-tenant-safe constraint (if not already present)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_tenant_user_type_channel_unique') THEN
        ALTER TABLE notification_preferences
            ADD CONSTRAINT notification_preferences_tenant_user_type_channel_unique
            UNIQUE(tenant_id, user_id, notification_type, channel);
    END IF;
END $$;
