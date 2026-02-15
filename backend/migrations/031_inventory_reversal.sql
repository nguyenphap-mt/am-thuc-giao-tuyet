-- Migration: Add transaction reversal tracking columns
-- Date: 2026-01-24
-- Sprint 2.1: Inventory Transaction Reversal

-- Add reversal tracking columns to inventory_transactions
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15, 2) DEFAULT NULL;

ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS is_reversed BOOLEAN DEFAULT FALSE;

ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS reversed_by_txn_id UUID DEFAULT NULL;

ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS reverses_txn_id UUID DEFAULT NULL;

-- Add index for faster reversal lookups
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_is_reversed 
ON inventory_transactions(is_reversed) WHERE is_reversed = TRUE;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reverses 
ON inventory_transactions(reverses_txn_id) WHERE reverses_txn_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN inventory_transactions.is_reversed IS 'True if this transaction has been reversed';
COMMENT ON COLUMN inventory_transactions.reversed_by_txn_id IS 'ID of the transaction that reversed this one';
COMMENT ON COLUMN inventory_transactions.reverses_txn_id IS 'If this is a reversal, ID of the original transaction';
