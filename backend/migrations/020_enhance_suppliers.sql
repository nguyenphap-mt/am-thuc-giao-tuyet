-- Migration: Add new fields to suppliers table
-- Date: 2026-02-09
-- Description: Enhance supplier model with additional business fields

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'OTHER';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(20) DEFAULT 'NET30';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
