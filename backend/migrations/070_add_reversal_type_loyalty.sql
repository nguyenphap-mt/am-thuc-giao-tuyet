-- Migration: 070_add_reversal_type_loyalty.sql
-- Purpose: Add 'REVERSAL' to loyalty_points_history type CHECK constraint
-- Required for Order Reopen feature (Full Rollback)
-- Created: 2026-02-20

-- Drop old CHECK constraint and recreate with REVERSAL type
ALTER TABLE loyalty_points_history
DROP CONSTRAINT IF EXISTS loyalty_points_history_type_check;

ALTER TABLE loyalty_points_history
ADD CONSTRAINT loyalty_points_history_type_check
CHECK (type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REVERSAL'));
