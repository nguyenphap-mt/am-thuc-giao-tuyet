-- Migration 024: Inventory Constraints & Indexes
-- DA-01: Add unique constraint on inventory_stock(item_id, warehouse_id)

-- Add unique constraint to prevent duplicate stock entries per item-warehouse pair
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_inventory_stock_item_warehouse'
    ) THEN
        -- First, clean up any potential duplicates by keeping the one with highest quantity
        WITH duplicates AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY item_id, warehouse_id 
                ORDER BY quantity DESC, updated_at DESC
            ) as rn
            FROM inventory_stock
        )
        DELETE FROM inventory_stock WHERE id IN (
            SELECT id FROM duplicates WHERE rn > 1
        );
        
        ALTER TABLE inventory_stock 
        ADD CONSTRAINT uq_inventory_stock_item_warehouse 
        UNIQUE (item_id, warehouse_id);
    END IF;
END $$;

-- Add composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_category 
ON inventory_items(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_item 
ON inventory_transactions(tenant_id, item_id, created_at DESC);
