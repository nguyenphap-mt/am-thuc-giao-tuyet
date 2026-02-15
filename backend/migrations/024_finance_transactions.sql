-- Migration: 024_finance_transactions.sql
-- Date: 2026-01-23
-- Purpose: Add finance_transactions table and seed Chart of Accounts

-- 1. Finance Transactions Table (Thu/Chi tiền)
CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Transaction Info
    code VARCHAR(50) NOT NULL,  -- THU-202601-001, CHI-202601-001
    type VARCHAR(20) NOT NULL,  -- RECEIPT, PAYMENT
    category VARCHAR(50),       -- ORDER, PROCUREMENT, SALARY, OPERATING
    
    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(20), -- CASH, BANK_TRANSFER, CARD
    
    -- Reference
    reference_id UUID,          -- Order ID, PO ID, etc.
    reference_type VARCHAR(20), -- ORDER, PURCHASE_ORDER, SALARY
    
    -- Details
    description TEXT,
    transaction_date DATE NOT NULL,
    
    -- Accounting link
    journal_id UUID REFERENCES journals(id),
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_finance_trans_tenant ON finance_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finance_trans_type ON finance_transactions(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_trans_date ON finance_transactions(tenant_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_finance_trans_ref ON finance_transactions(reference_id, reference_type);

-- 3. Enable RLS
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Seed Chart of Accounts (for default tenant)
INSERT INTO accounts (tenant_id, code, name, type, is_active) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '111', 'Tiền mặt', 'ASSET', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '112', 'Tiền gửi ngân hàng', 'ASSET', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '131', 'Phải thu khách hàng', 'ASSET', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '152', 'Nguyên liệu, vật liệu', 'ASSET', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '331', 'Phải trả người bán', 'LIABILITY', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '334', 'Phải trả người lao động', 'LIABILITY', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '411', 'Vốn đầu tư chủ sở hữu', 'EQUITY', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '511', 'Doanh thu bán hàng', 'REVENUE', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '632', 'Giá vốn hàng bán', 'EXPENSE', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '641', 'Chi phí bán hàng', 'EXPENSE', true),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '642', 'Chi phí quản lý doanh nghiệp', 'EXPENSE', true)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMENT ON TABLE finance_transactions IS 'Bảng ghi nhận thu/chi tiền tích hợp với Order và Procurement';
