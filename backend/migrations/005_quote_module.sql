-- Migration: 005_quote_module.sql
-- Module: Quote Management (Sales)

-- 1. Quotes Table
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL, -- Format: QT-YYYYMM-XXXX
    customer_id UUID, -- Link to customers table (future) or just store name for now
    customer_name VARCHAR(255), 
    customer_phone VARCHAR(50),
    event_date TIMESTAMP,
    event_address TEXT,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SENT, APPROVED, REJECTED, CONVERTED
    valid_until TIMESTAMP,
    created_by UUID, -- User ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Quote Items Table
CREATE TABLE quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id), -- Link to Inventory
    item_name VARCHAR(255) NOT NULL, -- Snapshot name
    description TEXT,
    uom VARCHAR(50),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(15, 2) DEFAULT 0, -- Snapshot price
    total_price DECIMAL(15, 2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY tenant_isolation_quotes ON quotes USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_quote_items ON quote_items USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Indexes
CREATE INDEX idx_quotes_tenant_status ON quotes(tenant_id, status);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
