-- Migration: 011_crm_module.sql
-- Module: CRM (Sales)

-- 1. Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    source VARCHAR(50), -- FACEBOOK, REFERRAL, WEBSITE
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, phone) -- Phone is unique per tenant
);

-- 2. Interaction Logs Table
CREATE TABLE interaction_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- CALL, ZALO, MEETING
    content TEXT,
    sentiment VARCHAR(50), -- POSITIVE, NEUTRAL, NEGATIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY tenant_isolation_customers ON customers USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_interaction_logs ON interaction_logs USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Indexes
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);
CREATE INDEX idx_interaction_logs_customer ON interaction_logs(customer_id);
