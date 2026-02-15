-- Migration: Inventory Lot Tracking
-- Date: 2026-01-24
-- Sprint 3.3: Add lot tracking for inventory management

-- Create inventory_lots table
CREATE TABLE IF NOT EXISTS inventory_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Lot identification
    lot_number VARCHAR(50) NOT NULL,
    batch_code VARCHAR(50),
    
    -- Dates
    manufacture_date DATE,
    expiry_date DATE,
    received_date DATE DEFAULT CURRENT_DATE,
    
    -- Quantity
    initial_quantity DECIMAL(15, 2) NOT NULL,
    remaining_quantity DECIMAL(15, 2) NOT NULL,
    
    -- Cost
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',  -- ACTIVE, DEPLETED, EXPIRED, DAMAGED
    
    -- Reference
    reference_doc VARCHAR(100),  -- PO number or import reference
    supplier_id UUID,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(tenant_id, item_id, lot_number)
);

-- Add lot_id to inventory_transactions (if not exists)
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES inventory_lots(id);

-- Create index for FIFO queries (oldest first by received_date)
CREATE INDEX IF NOT EXISTS idx_inventory_lots_fifo 
ON inventory_lots(item_id, warehouse_id, received_date, remaining_quantity)
WHERE status = 'ACTIVE' AND remaining_quantity > 0;

-- Create index for expiry tracking
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiry 
ON inventory_lots(expiry_date)
WHERE status = 'ACTIVE' AND expiry_date IS NOT NULL;

-- Comments
COMMENT ON TABLE inventory_lots IS 'Tracks individual lots/batches of inventory items for FIFO and expiry management';
COMMENT ON COLUMN inventory_lots.lot_number IS 'Unique lot identifier within tenant+item';
COMMENT ON COLUMN inventory_lots.remaining_quantity IS 'Current available quantity (decreases with exports)';
