-- Migration: Enable RLS on users table
-- Sequence: 019
-- Description: Enforce Multi-Tenancy Security for User Management

-- 1. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy
-- Tenant Isolation: Users can only see records belonging to their tenant
-- Exception: Super Admin (who might need cross-tenant access, but typically handled via separate schema or bypassing RLS in specific admin tools. 
-- For now, we stick to standard RLS: current_setting('app.current_tenant') must match tenant_id)

CREATE POLICY tenant_isolation ON users
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- 3. Force RLS for all users (except table owner/superuser, but good practice to be explicit if using a shared app user)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
