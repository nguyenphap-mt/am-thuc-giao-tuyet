-- Migration: Order Staff Assignments
-- Date: 2026-01-23
-- Purpose: Enable staff assignment to orders for event management

-- Order Staff Assignments Table
CREATE TABLE IF NOT EXISTS order_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'SERVER',  -- LEAD, SERVER, KITCHEN, DRIVER
    confirmed BOOLEAN DEFAULT false,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate assignments
    UNIQUE(order_id, staff_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_staff_order ON order_staff_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_staff_staff ON order_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_order_staff_tenant ON order_staff_assignments(tenant_id);

-- RLS Policy
ALTER TABLE order_staff_assignments ENABLE ROW LEVEL SECURITY;

-- INSERT sample staff roles for reference
COMMENT ON COLUMN order_staff_assignments.role IS 'Staff roles: LEAD (Trưởng ca), SERVER (Phục vụ), KITCHEN (Bếp), DRIVER (Lái xe)';
