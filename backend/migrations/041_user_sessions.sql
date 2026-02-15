-- Migration: 041_user_sessions.sql
-- Purpose: Track user sessions for security and login history
-- Created: 2026-01-26

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token info (store hash, not actual token)
    token_hash VARCHAR(64) NOT NULL,
    
    -- Client info
    ip_address INET,
    device_info TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);

-- Comment
COMMENT ON TABLE user_sessions IS 'Phiên đăng nhập người dùng';
