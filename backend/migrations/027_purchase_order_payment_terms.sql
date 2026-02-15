-- Migration: 027_purchase_order_payment_terms.sql
-- Date: 2026-01-24
-- Purpose: Add payment terms and due date to purchase orders

-- Add payment terms columns
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(20) DEFAULT 'NET30';

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0;

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Create index for due date queries
CREATE INDEX IF NOT EXISTS idx_po_due_date ON purchase_orders(tenant_id, due_date);

-- Add comment
COMMENT ON COLUMN purchase_orders.payment_terms IS 'Payment terms: IMMEDIATE, NET15, NET30, NET60, NET90';
COMMENT ON COLUMN purchase_orders.due_date IS 'Calculated due date based on payment terms';
