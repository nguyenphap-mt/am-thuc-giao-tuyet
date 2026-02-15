-- Migration: 010_finance_module.sql
-- Module: Finance (Core)

-- 1. Chart of Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, code)
);

-- 2. Journals Table (Header)
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    code VARCHAR(50) NOT NULL, -- JNL-YYYYMM-XXXX
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    reference_id UUID, -- Link to Order, PO, Employee Payment, etc.
    reference_type VARCHAR(50), -- ORDER, PO, SALARY
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Journal Lines Table (Detail)
CREATE TABLE journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY tenant_isolation_accounts ON accounts USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_journals ON journals USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_journal_lines ON journal_lines USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 6. Indexes
CREATE INDEX idx_accounts_type ON accounts(tenant_id, type);
CREATE INDEX idx_journals_date ON journals(tenant_id, date);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
