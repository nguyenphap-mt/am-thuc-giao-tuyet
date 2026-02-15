-- Migration: 026_hr_complete.sql
-- Module: HR (Complete - Creates all HR tables from scratch)
-- Date: 2026-01-24
-- Note: Uses soft references to events/orders (UUID without FK) for flexibility

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic info
    full_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(50) DEFAULT 'WAITER', -- CHEF, WAITER, DRIVER
    phone VARCHAR(50),
    email VARCHAR(100),
    
    -- Employment status
    is_fulltime BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Extended info
    id_number VARCHAR(20),        -- CCCD/CMND
    date_of_birth DATE,
    address TEXT,
    bank_account VARCHAR(50),
    bank_name VARCHAR(100),
    avatar_url TEXT,
    emergency_contact VARCHAR(100),
    joined_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Assignments Table (Rostering)
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID,  -- Soft reference to orders/events
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    
    role VARCHAR(50), -- Role in this specific event (e.g. Head Chef)
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    
    status VARCHAR(50) DEFAULT 'ASSIGNED', -- ASSIGNED, CONFIRMED, CHECKED_IN, COMPLETED
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Timesheets Table
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

-- 4. Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_employees') THEN
        CREATE POLICY tenant_isolation_employees ON employees 
        USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_staff_assignments') THEN
        CREATE POLICY tenant_isolation_staff_assignments ON staff_assignments 
        USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_timesheets') THEN
        CREATE POLICY tenant_isolation_timesheets ON timesheets 
        USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
    END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_role ON employees(tenant_id, role_type);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(full_name);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_event ON staff_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_employee ON staff_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_tenant ON timesheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_date ON timesheets(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_assignment ON timesheets(assignment_id);
