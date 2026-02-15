-- ============================================
-- Migration: 037_tenant_management.sql
-- Tenant Management Module - Phase 1 Foundation
-- ============================================

-- 1. Extend tenants table with management columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_details JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Add unique constraint on slug (safe: skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'tenants_slug_key'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- 4. Update existing tenants with default slug
UPDATE tenants
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '''', ''))
WHERE slug IS NULL;

-- 5. Tenant Usage Tracking Table
CREATE TABLE IF NOT EXISTS tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_key VARCHAR(100) NOT NULL,
    metric_value NUMERIC DEFAULT 0,
    period VARCHAR(20) DEFAULT 'total',
    period_start DATE,
    period_end DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, metric_key, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_lookup
    ON tenant_usage(tenant_id, metric_key, period);

-- 6. Set default plan_details for existing tenants
UPDATE tenants
SET plan_details = jsonb_build_object(
    'max_users', 50,
    'max_orders_per_month', 1000,
    'storage_mb', 10240
)
WHERE plan_details = '{}' OR plan_details IS NULL;

COMMENT ON TABLE tenant_usage IS 'Theo dõi mức sử dụng tài nguyên theo tenant';
COMMENT ON COLUMN tenants.status IS 'active | suspended | trial | cancelled';
COMMENT ON COLUMN tenants.plan_details IS 'JSON chứa limits: max_users, max_orders_per_month, storage_mb';
