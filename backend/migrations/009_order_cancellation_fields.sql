-- Migration: 009_order_cancellation_fields.sql
-- Add fields for Order Cancellation with Deposit/Refund feature

-- Add cancellation tracking fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(30);
-- Values: FULL_REFUND, PARTIAL_REFUND, NO_REFUND, FORCE_MAJEURE

ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(15,2) DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- Add comments for documentation
COMMENT ON COLUMN orders.cancellation_type IS 'Type of cancellation: FULL_REFUND, PARTIAL_REFUND, NO_REFUND, FORCE_MAJEURE';
COMMENT ON COLUMN orders.refund_amount IS 'Amount refunded to customer when order is cancelled';
COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when order was cancelled';
COMMENT ON COLUMN orders.cancelled_by IS 'User ID who cancelled the order';
