-- Migration: 008_order_started_at.sql
-- Add started_at column for tracking when order transitions to IN_PROGRESS

-- Add column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN orders.started_at IS 'Timestamp when order status changed to IN_PROGRESS';
