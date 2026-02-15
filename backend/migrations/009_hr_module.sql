-- Migration: 009_hr_module.sql
-- Module: HR (Operations)

-- 1. Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    full_name VARCHAR(100) NOT NULL,
    role_type VARCHAR(50), -- CHEF, WAITER, DRIVER
    phone VARCHAR(50),
    is_fulltime BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(15, 2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staff Assignments Table (Rostering)
CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    
    role VARCHAR(50), -- Role in this specific event (e.g. Head Chef)
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    status VARCHAR(50) DEFAULT 'ASSIGNED', -- ASSIGNED, CONFIRMED, CHECKED_IN, COMPLETED
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY tenant_isolation_employees ON employees USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_staff_assignments ON staff_assignments USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Indexes
CREATE INDEX idx_employees_tenant_role ON employees(tenant_id, role_type);
CREATE INDEX idx_staff_assignments_event ON staff_assignments(event_id);
CREATE INDEX idx_staff_assignments_employee ON staff_assignments(employee_id);
