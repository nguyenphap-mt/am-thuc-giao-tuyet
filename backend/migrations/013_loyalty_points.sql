-- Migration: 013_loyalty_points.sql
-- Phase 13.1: Loyalty Points Module
-- Created: 2026-01-27

-- ============================================
-- 1. ADD LOYALTY COLUMNS TO CUSTOMERS TABLE
-- ============================================

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'BRONZE';

-- ============================================
-- 2. CREATE LOYALTY POINTS HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Points info
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST')),
    
    -- Reference to source (order, manual, promotion)
    reference_type VARCHAR(50),
    reference_id UUID,
    
    -- Details
    description TEXT,
    balance_after INTEGER NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loyalty_history_customer 
ON loyalty_points_history(customer_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_history_tenant 
ON loyalty_points_history(tenant_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_history_created 
ON loyalty_points_history(created_at DESC);

-- ============================================
-- 3. CREATE LOYALTY TIERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    min_points INTEGER NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    benefits JSONB DEFAULT '[]',
    color VARCHAR(20),
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_tenant 
ON loyalty_tiers(tenant_id, sort_order);

-- ============================================
-- 4. SEED DEFAULT TIERS
-- ============================================

INSERT INTO loyalty_tiers (tenant_id, name, min_points, discount_percent, color, icon, sort_order)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    tier.name,
    tier.min_points,
    tier.discount_percent,
    tier.color,
    tier.icon,
    tier.sort_order
FROM (VALUES
    ('Bronze', 0, 0, '#CD7F32', 'workspace_premium', 1),
    ('Silver', 500, 3, '#C0C0C0', 'workspace_premium', 2),
    ('Gold', 2000, 5, '#FFD700', 'workspace_premium', 3),
    ('Platinum', 5000, 10, '#E5E4E2', 'diamond', 4)
) AS tier(name, min_points, discount_percent, color, icon, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM loyalty_tiers LIMIT 1);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE loyalty_points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_points_history
DROP POLICY IF EXISTS loyalty_history_tenant_isolation ON loyalty_points_history;
CREATE POLICY loyalty_history_tenant_isolation ON loyalty_points_history
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- RLS Policies for loyalty_tiers
DROP POLICY IF EXISTS loyalty_tiers_tenant_isolation ON loyalty_tiers;
CREATE POLICY loyalty_tiers_tenant_isolation ON loyalty_tiers
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================
-- DONE
-- ============================================
