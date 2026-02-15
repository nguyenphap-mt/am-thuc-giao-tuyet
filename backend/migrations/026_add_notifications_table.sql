-- Migration: 026_add_notifications_table.sql
-- Purpose: Create notifications table for in-app notification system
-- Date: 2026-02-05

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL,  -- LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_SUBMITTED, etc.
    
    -- Reference to related entity
    reference_type VARCHAR(50),  -- leave_request, timesheet, etc.
    reference_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY notifications_tenant_isolation ON notifications
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Indexes for performance
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Comment
COMMENT ON TABLE notifications IS 'In-app notifications for users';
