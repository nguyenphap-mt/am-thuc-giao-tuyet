-- Migration: 043_roles_table.sql
-- Purpose: Create roles table for permission persistence
-- Created: 2026-01-26

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Role info
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permissions stored as JSON array
    permissions TEXT[] DEFAULT '{}',
    
    -- System flag (cannot delete system roles)
    is_system BOOLEAN DEFAULT FALSE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per tenant
    UNIQUE(tenant_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);

-- RLS Policy
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_tenant_isolation ON roles
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Insert default roles (will use first tenant)
INSERT INTO roles (tenant_id, code, name, description, is_system, permissions)
SELECT 
    t.id,
    r.code,
    r.name,
    r.description,
    TRUE,
    r.permissions
FROM tenants t
CROSS JOIN (VALUES
    ('super_admin', 'Super Admin', 'Toàn quyền hệ thống', ARRAY['ALL']),
    ('admin', 'Admin', 'Quản trị viên', ARRAY['ALL']),
    ('manager', 'Manager', 'Quản lý', ARRAY['dashboard:view', 'quote:*', 'order:*', 'crm:*', 'inventory:view', 'hr:view', 'finance:view']),
    ('chef', 'Chef', 'Đầu bếp', ARRAY['dashboard:view', 'menu:*', 'order:view', 'inventory:*']),
    ('sales', 'Sales', 'Kinh doanh', ARRAY['dashboard:view', 'quote:*', 'order:view', 'crm:*', 'calendar:view']),
    ('staff', 'Staff', 'Nhân viên', ARRAY['dashboard:view', 'order:view', 'calendar:view']),
    ('accountant', 'Accountant', 'Kế toán', ARRAY['dashboard:view', 'finance:*', 'order:view', 'procurement:view', 'invoice:*']),
    ('viewer', 'Viewer', 'Chỉ xem', ARRAY['dashboard:view'])
) AS r(code, name, description, permissions)
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE roles.tenant_id = t.id AND roles.code = r.code
);

-- Comments
COMMENT ON TABLE roles IS 'Vai trò và phân quyền';
COMMENT ON COLUMN roles.permissions IS 'Danh sách quyền: module:action (e.g., order:create, finance:*)';
