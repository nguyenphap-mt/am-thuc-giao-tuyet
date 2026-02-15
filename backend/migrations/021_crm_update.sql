-- Migration: 021_crm_update.sql
-- Description: Add customer_type and preferences to customers table

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'REGULAR';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index for customer_type
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(tenant_id, customer_type);
