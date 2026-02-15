-- Migration: 028_hr_payroll.sql
-- HR Module Phase 4: Payroll System
-- Date: 24/01/2026

-- ============ PAYROLL PERIODS ============
-- Kỳ lương (tháng)
CREATE TABLE IF NOT EXISTS payroll_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period_name VARCHAR(50) NOT NULL,           -- "01/2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',         -- DRAFT, CALCULATED, APPROVED, PAID
    calculated_at TIMESTAMPTZ,
    calculated_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    total_employees INT DEFAULT 0,
    total_gross DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, period_name)
);

-- ============ PAYROLL ITEMS ============
-- Chi tiết lương từng nhân viên
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    
    -- Giờ làm (từ timesheets)
    regular_hours DECIMAL(6,2) DEFAULT 0,       -- Giờ thường (<=8h/ngày)
    overtime_hours DECIMAL(6,2) DEFAULT 0,      -- OT ngày thường (>8h)
    weekend_hours DECIMAL(6,2) DEFAULT 0,       -- Thứ 7, CN
    holiday_hours DECIMAL(6,2) DEFAULT 0,       -- Ngày lễ
    night_hours DECIMAL(6,2) DEFAULT 0,         -- Ca đêm (22h-6h)
    total_hours DECIMAL(6,2) GENERATED ALWAYS AS (
        regular_hours + overtime_hours + weekend_hours + holiday_hours
    ) STORED,
    
    -- Lương cơ bản
    base_salary DECIMAL(12,2) DEFAULT 0,        -- Lương tháng (fulltime)
    hourly_rate DECIMAL(10,2) DEFAULT 0,        -- Lương giờ
    
    -- Tính lương theo giờ
    regular_pay DECIMAL(12,2) DEFAULT 0,        -- Lương giờ thường
    overtime_pay DECIMAL(12,2) DEFAULT 0,       -- OT x 1.5
    weekend_pay DECIMAL(12,2) DEFAULT 0,        -- Weekend x 2.0
    holiday_pay DECIMAL(12,2) DEFAULT 0,        -- Holiday x 3.0
    night_pay DECIMAL(12,2) DEFAULT 0,          -- Night +30%
    
    -- Phụ cấp và thưởng
    allowance_meal DECIMAL(12,2) DEFAULT 0,     -- Phụ cấp ăn
    allowance_transport DECIMAL(12,2) DEFAULT 0,-- Phụ cấp đi lại
    allowance_phone DECIMAL(12,2) DEFAULT 0,    -- Phụ cấp điện thoại
    allowance_other DECIMAL(12,2) DEFAULT 0,    -- Phụ cấp khác
    bonus DECIMAL(12,2) DEFAULT 0,              -- Thưởng
    
    -- Khấu trừ
    deduction_social_ins DECIMAL(12,2) DEFAULT 0,   -- BHXH 8%
    deduction_health_ins DECIMAL(12,2) DEFAULT 0,   -- BHYT 1.5%
    deduction_unemployment DECIMAL(12,2) DEFAULT 0, -- BHTN 1%
    deduction_tax DECIMAL(12,2) DEFAULT 0,          -- Thuế TNCN
    deduction_advance DECIMAL(12,2) DEFAULT 0,      -- Trừ ứng lương
    deduction_other DECIMAL(12,2) DEFAULT 0,        -- Khấu trừ khác
    
    -- Tổng kết
    gross_salary DECIMAL(12,2) GENERATED ALWAYS AS (
        regular_pay + overtime_pay + weekend_pay + holiday_pay + night_pay +
        allowance_meal + allowance_transport + allowance_phone + allowance_other + bonus
    ) STORED,
    total_deductions DECIMAL(12,2) GENERATED ALWAYS AS (
        deduction_social_ins + deduction_health_ins + deduction_unemployment +
        deduction_tax + deduction_advance + deduction_other
    ) STORED,
    net_salary DECIMAL(12,2) DEFAULT 0,         -- Sẽ calculate trong code
    
    status VARCHAR(20) DEFAULT 'PENDING',       -- PENDING, ADJUSTED, FINALIZED
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period_id, employee_id)
);

-- ============ SALARY ADVANCES ============
-- Ứng lương
CREATE TABLE IF NOT EXISTS salary_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    amount DECIMAL(12,2) NOT NULL,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',       -- PENDING, APPROVED, REJECTED, PAID, DEDUCTED
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    deducted_in_period UUID REFERENCES payroll_periods(id),
    deducted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ VIETNAM HOLIDAYS ============
-- Ngày lễ Việt Nam (cho tính lương x3)
CREATE TABLE IF NOT EXISTS vietnam_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    year INT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    is_lunar BOOLEAN DEFAULT FALSE,             -- Âm lịch hay không
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, holiday_date)
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant ON payroll_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);
CREATE INDEX IF NOT EXISTS idx_payroll_items_period ON payroll_items(period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee ON salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_status ON salary_advances(status);
CREATE INDEX IF NOT EXISTS idx_vietnam_holidays_date ON vietnam_holidays(holiday_date);

-- ============ RLS ============
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE vietnam_holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY payroll_periods_tenant_isolation ON payroll_periods
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY payroll_items_tenant_isolation ON payroll_items
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY salary_advances_tenant_isolation ON salary_advances
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY vietnam_holidays_tenant_isolation ON vietnam_holidays
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============ SEED DEFAULT HOLIDAYS 2026 ============
-- Seed sẽ được thực hiện riêng cho từng tenant

COMMENT ON TABLE payroll_periods IS 'Kỳ lương theo tháng';
COMMENT ON TABLE payroll_items IS 'Chi tiết lương từng nhân viên trong kỳ';
COMMENT ON TABLE salary_advances IS 'Ứng lương nhân viên';
COMMENT ON TABLE vietnam_holidays IS 'Ngày lễ Việt Nam cho tính lương x3';
