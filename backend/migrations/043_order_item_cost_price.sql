-- Migration: 043_order_item_cost_price.sql
-- Description: Add cost_price column to order_items for profit tracking
-- Date: 2026-02-03

-- Add cost_price column to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN order_items.cost_price IS 'Unit cost price from menu item, used for profit calculation';

-- For existing orders, we can optionally update cost_price from menu_items if menu_item_id exists
-- UPDATE order_items oi
-- SET cost_price = mi.cost_price
-- FROM menu_items mi
-- WHERE oi.menu_item_id = mi.id AND oi.cost_price = 0;
