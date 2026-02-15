-- Migration: 050_order_notes.sql
-- Feature: Order Internal Notes
-- Date: 2026-02-06

-- 1. Order Notes Table
CREATE TABLE IF NOT EXISTS order_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by VARCHAR(255) NOT NULL DEFAULT 'Nhân viên',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable RLS
ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy (drop if exists first)
DROP POLICY IF EXISTS tenant_isolation_order_notes ON order_notes;
CREATE POLICY tenant_isolation_order_notes ON order_notes 
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_order_notes_order ON order_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_tenant ON order_notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_notes_created ON order_notes(created_at DESC);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 050_order_notes.sql completed successfully';
END $$;
