-- Migration: 025_hr_extended.sql
-- Module: HR Extended (Employee + Timesheet)
-- Date: 2026-01-24

-- 1. Extend employees table with additional fields
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS joined_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create timesheets table for check-in/check-out
CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES staff_assignments(id) ON DELETE SET NULL,
    
    work_date DATE NOT NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS on timesheets
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy for timesheets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_timesheets'
    ) THEN
        CREATE POLICY tenant_isolation_timesheets ON timesheets 
        USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
    END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON timesheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON timesheets(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_assignment ON timesheets(assignment_id);

-- 6. Add index on employees for search
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(full_name);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
