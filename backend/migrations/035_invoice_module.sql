-- ============================================================
-- Migration 035: Invoice Module
-- Purpose: VAT Invoice entity for legal compliance
-- Date: 2026-01-24
-- ============================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Invoice Code (auto: HD-2026XXXX)
    code VARCHAR(50) NOT NULL,
    
    -- Source Order
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Customer Info (denormalized for invoice)
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_tax_code VARCHAR(50),
    customer_phone VARCHAR(50),
    
    -- Invoice Details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Amounts
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 10,
    vat_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    
    -- Payment Info
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'UNPAID', -- UNPAID, PARTIAL, PAID
    
    -- Status: DRAFT, ISSUED, CANCELLED
    status VARCHAR(20) DEFAULT 'DRAFT',
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INVOICE ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Item Info
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    uom VARCHAR(50) DEFAULT 'Món',
    
    -- Pricing
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2) DEFAULT 10,
    total_price DECIMAL(15, 2) DEFAULT 0,
    
    -- Sort
    sort_order INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(code);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
DROP POLICY IF EXISTS invoice_items_tenant_isolation ON invoice_items;

-- Create tenant isolation policies
CREATE POLICY invoices_tenant_isolation ON invoices
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY invoice_items_tenant_isolation ON invoice_items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================================
-- ADD invoice_id TO ORDERS (optional FK)
-- ============================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- SEQUENCE FOR INVOICE CODE
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_code_seq START 1;

-- ============================================================
-- FUNCTION: Generate Invoice Code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_code()
RETURNS TRIGGER AS $$
DECLARE
    year_str TEXT;
    seq_num INTEGER;
BEGIN
    year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
    seq_num := NEXTVAL('invoice_code_seq');
    NEW.code := 'HD-' || year_str || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating invoice code
DROP TRIGGER IF EXISTS trigger_invoice_code ON invoices;
CREATE TRIGGER trigger_invoice_code
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.code IS NULL OR NEW.code = '')
    EXECUTE FUNCTION generate_invoice_code();

-- ============================================================
-- DONE
-- ============================================================
