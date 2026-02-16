-- Migration: Fix ALL quotes module schema mismatches
-- BUG-20260216-003: quotes.customer_email does not exist (+ 8 more missing columns)
-- Date: 2026-02-16
-- Root Cause: ORM models expect columns/tables that don't exist in Supabase DB

-- ============================================================
-- FIX 1: quotes table - Add 9 missing columns
-- ============================================================
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS event_time VARCHAR(20);
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 10;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- FIX 2: quote_items table - Add 2 missing columns
-- ============================================================
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- FIX 3: Create missing quote_services table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    total_price NUMERIC(15,2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quote_services ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIX 4: Create missing quote_templates table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    items JSONB DEFAULT '[]',
    services JSONB DEFAULT '[]',
    default_table_count INTEGER,
    default_guests_per_table INTEGER DEFAULT 10,
    default_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
