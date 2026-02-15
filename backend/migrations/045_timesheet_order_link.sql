-- Migration: Add order_id to timesheets for HR-Order integration
-- Version: 045
-- Date: 2026-02-05
-- Purpose: Link timesheets directly to orders for auto-creation and labor cost calculation

BEGIN;

-- Add order_id column to timesheets
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_timesheets_order_id ON timesheets(order_id) WHERE order_id IS NOT NULL;

-- Add source column to track how timesheet was created
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'MANUAL';
-- Values: MANUAL, AUTO_ORDER, IMPORT

COMMENT ON COLUMN timesheets.order_id IS 'Link to order for auto-created timesheets';
COMMENT ON COLUMN timesheets.source IS 'How timesheet was created: MANUAL, AUTO_ORDER, IMPORT';

COMMIT;
