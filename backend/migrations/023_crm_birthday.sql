-- Migration: Add birthday column to customers table
-- Date: 2026-02-08

-- Add birthday column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;

-- Create index for birthday queries (month-day for upcoming birthdays)
CREATE INDEX IF NOT EXISTS idx_customers_birthday ON customers(birthday) WHERE birthday IS NOT NULL;

-- Comment
COMMENT ON COLUMN customers.birthday IS 'Customer birthday for birthday alerts and marketing campaigns';
