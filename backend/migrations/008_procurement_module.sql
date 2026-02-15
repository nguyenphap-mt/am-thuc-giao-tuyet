-- Migration: 008_procurement_module.sql
-- Module: Procurement (Inventory)

-- 1. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    balance DECIMAL(15, 2) DEFAULT 0, -- Amount we owe them
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Purchase Orders Table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id),
    event_id UUID REFERENCES events(id), -- Buying for specific event (Optional)
    
    code VARCHAR(50) NOT NULL,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SENT, RECEIVED, PAID
    expected_delivery TIMESTAMP,
    note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Purchase Order Items (Lines)
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    item_name VARCHAR(255) NOT NULL, -- Free text or link to Items (future)
    quantity DECIMAL(15, 2) DEFAULT 1,
    uom VARCHAR(50),
    unit_price DECIMAL(15, 2) DEFAULT 0,
    total_price DECIMAL(15, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY tenant_isolation_suppliers ON suppliers USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_purchase_order_items ON purchase_order_items USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 6. Indexes
CREATE INDEX idx_suppliers_tenant_name ON suppliers(tenant_id, name);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
