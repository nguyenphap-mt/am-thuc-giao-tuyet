-- Migration: 034_audit_trail.sql
-- Date: 2026-01-24
-- Purpose: Add audit trail columns to main tables

-- Sprint 4.5: Audit Trail

-- Add created_by and updated_by to quotes table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'created_by') THEN
        ALTER TABLE quotes ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'updated_by') THEN
        ALTER TABLE quotes ADD COLUMN updated_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add to orders table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_by') THEN
        ALTER TABLE orders ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_by') THEN
        ALTER TABLE orders ADD COLUMN updated_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add to customers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_by') THEN
        ALTER TABLE customers ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'updated_by') THEN
        ALTER TABLE customers ADD COLUMN updated_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Add to inventory_items table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'created_by') THEN
        ALTER TABLE inventory_items ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'updated_by') THEN
        ALTER TABLE inventory_items ADD COLUMN updated_by UUID REFERENCES users(id);
    END IF;
END $$;

-- Create audit_log table for detailed history
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit_log
DROP POLICY IF EXISTS audit_log_tenant_policy ON audit_log;
CREATE POLICY audit_log_tenant_policy ON audit_log
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id);

COMMENT ON TABLE audit_log IS 'Sprint 4.5: Detailed audit trail for all changes';
