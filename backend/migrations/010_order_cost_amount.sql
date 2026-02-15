-- Migration: 010_order_cost_amount.sql
-- Add cost_amount column to orders table for profit calculation
-- Date: 2026-02-03

-- Add cost_amount column (total cost based on menu item cost prices)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(15, 2) DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN orders.cost_amount IS 'Total cost amount calculated from menu item cost prices';
