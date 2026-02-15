-- Migration: 029_hr_leave_management.sql
-- HR Module Phase 5: Leave Management
-- Date: 24/01/2026

-- ============ LEAVE TYPES ============
-- Loại nghỉ phép
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    code VARCHAR(20) NOT NULL,           -- ANNUAL, SICK, PERSONAL, MARRIAGE, BEREAVEMENT
    name VARCHAR(100) NOT NULL,          -- Nghỉ phép năm, Nghỉ ốm...
    days_per_year DECIMAL(5,1) DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- ============ LEAVE BALANCES ============
-- Số ngày phép còn lại của nhân viên theo năm
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INT NOT NULL,
    entitled_days DECIMAL(5,1) DEFAULT 0,    -- Số ngày được hưởng
    used_days DECIMAL(5,1) DEFAULT 0,        -- Đã sử dụng
    pending_days DECIMAL(5,1) DEFAULT 0,     -- Đang chờ duyệt
    carry_over_days DECIMAL(5,1) DEFAULT 0,  -- Chuyển từ năm trước
    remaining_days DECIMAL(5,1) GENERATED ALWAYS AS (
        entitled_days + carry_over_days - used_days - pending_days
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, leave_type_id, year)
);

-- ============ LEAVE REQUESTS ============
-- Yêu cầu nghỉ phép
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(5,1) NOT NULL,
    
    reason TEXT,
    
    status VARCHAR(20) DEFAULT 'PENDING',    -- PENDING, APPROVED, REJECTED, CANCELLED
    
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- ============ RLS ============
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY leave_types_tenant ON leave_types
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY leave_balances_tenant ON leave_balances
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY leave_requests_tenant ON leave_requests
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============ SEED DEFAULT LEAVE TYPES ============
INSERT INTO leave_types (tenant_id, code, name, days_per_year, is_paid, requires_approval) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ANNUAL', 'Nghỉ phép năm', 12, TRUE, TRUE),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'SICK', 'Nghỉ ốm', 30, TRUE, TRUE),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PERSONAL', 'Việc riêng', 3, FALSE, TRUE),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MARRIAGE', 'Kết hôn', 3, TRUE, FALSE),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'BEREAVEMENT', 'Tang chế', 3, TRUE, FALSE)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMENT ON TABLE leave_types IS 'Loại nghỉ phép';
COMMENT ON TABLE leave_balances IS 'Số ngày phép của nhân viên theo năm';
COMMENT ON TABLE leave_requests IS 'Yêu cầu nghỉ phép';
