-- Migration: 047_order_expenses_amount.sql
-- Purpose: R1 - Add expenses_amount to orders for Order Cost Tracking
-- Date: 2026-02-03

-- Add expenses_amount column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS expenses_amount NUMERIC(15, 2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN orders.expenses_amount IS 'Tổng chi phí được link với đơn hàng này (từ finance_transactions với reference_type=ORDER)';

-- Create index for P&L queries
CREATE INDEX IF NOT EXISTS idx_orders_expenses_amount ON orders(expenses_amount) WHERE expenses_amount > 0;

-- Update existing orders to calculate expenses from linked transactions
UPDATE orders o
SET expenses_amount = COALESCE(
    (SELECT SUM(ft.amount) 
     FROM finance_transactions ft 
     WHERE ft.reference_id = o.id 
     AND ft.reference_type = 'ORDER' 
     AND ft.type = 'PAYMENT'),
    0
);

-- Log migration
INSERT INTO migrations_log (name, executed_at) 
VALUES ('047_order_expenses_amount', NOW())
ON CONFLICT (name) DO NOTHING;
