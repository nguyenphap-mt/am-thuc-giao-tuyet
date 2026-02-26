-- Migration 073: Equipment / CCDC Management
-- Adds item_type to inventory_items and creates equipment_checkouts table

-- 1. Add item_type to inventory_items (default MATERIAL for backward compatibility)
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'MATERIAL' NOT NULL;

-- 2. Add equipment-specific fields
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS condition_status VARCHAR(20) DEFAULT 'GOOD',
ADD COLUMN IF NOT EXISTS purchase_date DATE NULL,
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reusable BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN inventory_items.item_type IS 'MATERIAL=Nguyên liệu, EQUIPMENT=CCDC/Dụng cụ';
COMMENT ON COLUMN inventory_items.condition_status IS 'GOOD, FAIR, POOR, DAMAGED';

-- 3. Create equipment_checkouts table
CREATE TABLE IF NOT EXISTS equipment_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- References
    item_id UUID NOT NULL REFERENCES inventory_items(id),
    order_id UUID NULL,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    
    -- Quantities
    checkout_qty INTEGER NOT NULL,
    checkin_qty INTEGER DEFAULT 0,
    damaged_qty INTEGER DEFAULT 0,
    
    -- Dates
    checkout_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expected_return_date TIMESTAMP WITH TIME ZONE NULL,
    actual_return_date TIMESTAMP WITH TIME ZONE NULL,
    
    -- Status: CHECKED_OUT, PARTIALLY_RETURNED, RETURNED, OVERDUE
    status VARCHAR(20) NOT NULL DEFAULT 'CHECKED_OUT',
    
    damage_notes TEXT NULL,
    notes TEXT NULL,
    performed_by UUID NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS
ALTER TABLE equipment_checkouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_equipment_checkouts ON equipment_checkouts
    USING (tenant_id = (SELECT current_setting('app.current_tenant')::UUID));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_equip_checkout_order ON equipment_checkouts(order_id);
CREATE INDEX IF NOT EXISTS idx_equip_checkout_item ON equipment_checkouts(item_id);
CREATE INDEX IF NOT EXISTS idx_equip_checkout_status ON equipment_checkouts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(tenant_id, item_type);
