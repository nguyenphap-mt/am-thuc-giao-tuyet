-- Migration: 042_user_status.sql
-- Purpose: Add status column to users table for user lifecycle management
-- Created: 2026-01-26

-- Add status column (ACTIVE, INACTIVE, DELETED)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';

-- Add deleted_at for soft delete
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Migrate existing data: is_active true -> ACTIVE, false -> INACTIVE
UPDATE users SET status = CASE 
    WHEN is_active = true THEN 'ACTIVE'
    WHEN is_active = false THEN 'INACTIVE'
    ELSE 'ACTIVE'
END WHERE status IS NULL;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Comment
COMMENT ON COLUMN users.status IS 'User status: ACTIVE, INACTIVE, DELETED';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp';
