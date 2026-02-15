-- Migration: 012_mobile_module.sql
-- Module: Mobile & Notifications

-- 1. Mobile Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE, -- User/Employee
    
    title VARCHAR(255) NOT NULL,
    body TEXT,
    type VARCHAR(50) DEFAULT 'INFO', -- INFO, WARNING, TASK_ASSIGNED
    is_read BOOLEAN DEFAULT FALSE,
    action_link VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: Staff Tasks are managed in 'staff_assignments' table (Module 2.3).
-- This migration mainly adds support for Notifications.

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY tenant_isolation_notifications ON notifications USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 4. Indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
