-- Migration: Create finance_transactions table
-- Bug: BUG-20260216-002
-- Date: 2026-02-16
-- Root Cause: Table finance_transactions referenced by ORM model but never created in Supabase

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  amount NUMERIC(15,2) NOT NULL,
  payment_method VARCHAR(20),
  reference_id UUID,
  reference_type VARCHAR(20),
  description TEXT,
  transaction_date DATE NOT NULL,
  journal_id UUID REFERENCES public.journals(id),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create tenant isolation policy
CREATE POLICY finance_transactions_tenant_isolation 
  ON public.finance_transactions 
  FOR ALL 
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
