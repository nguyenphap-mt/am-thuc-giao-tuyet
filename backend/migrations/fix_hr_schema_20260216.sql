-- BUG-20260216-003: Fix HR Module Schema Mismatches
-- Root Cause: staff_assignments missing 'notes' column + 4 leave tables entirely missing
-- Applied: 2026-02-16

-- 1. Add missing column to staff_assignments
ALTER TABLE public.staff_assignments ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create leave_types table
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  days_per_year NUMERIC(5,1) DEFAULT 0,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create leave_balances table
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  leave_type_id UUID NOT NULL,
  year NUMERIC(4,0) NOT NULL,
  entitled_days NUMERIC(5,1) DEFAULT 0,
  used_days NUMERIC(5,1) DEFAULT 0,
  pending_days NUMERIC(5,1) DEFAULT 0,
  carry_over_days NUMERIC(5,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  leave_type_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create leave_approval_history table
CREATE TABLE IF NOT EXISTS public.leave_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  leave_request_id UUID NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  action_by UUID,
  action_by_name VARCHAR(255),
  action_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT,
  approval_level INTEGER DEFAULT 1,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS on all new tables
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_approval_history ENABLE ROW LEVEL SECURITY;

-- 7. Create tenant isolation policies
CREATE POLICY leave_types_tenant ON public.leave_types FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY leave_balances_tenant ON public.leave_balances FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY leave_requests_tenant ON public.leave_requests FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
CREATE POLICY leave_approval_history_tenant ON public.leave_approval_history FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);
