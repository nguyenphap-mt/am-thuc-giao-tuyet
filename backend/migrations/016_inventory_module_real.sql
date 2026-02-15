-- Migration: 016_inventory_module_real.sql
-- Module: Inventory Management
-- Description: Create tables for Items, Warehouses, Stock, and Transactions

-- 1. Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inventory Items Table (Raw Materials)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- Meat, Vegetable, Dry, Spice, etc.
    uom VARCHAR(50) NOT NULL, -- kg, g, l, box
    
    min_stock DECIMAL(15, 2) DEFAULT 0,
    cost_price DECIMAL(15, 2) DEFAULT 0, -- Moving average cost
    latest_purchase_price DECIMAL(15, 2) DEFAULT 0,
    
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Inventory Stock Table (Current Quantity per Warehouse)
CREATE TABLE IF NOT EXISTS inventory_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    quantity DECIMAL(15, 2) DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_stock_item_warehouse UNIQUE (item_id, warehouse_id)
);

-- 4. Inventory Transactions Table (History)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(50) NOT NULL, -- IMPORT, EXPORT, ADJUST, TRANSFER
    quantity DECIMAL(15, 2) NOT NULL, -- Negative for decrease, Positive for increase
    
    reference_doc VARCHAR(100), -- PO number, Order ID, etc.
    notes TEXT,
    performed_by UUID, -- User ID
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_stock_item ON inventory_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON inventory_transactions(created_at);

-- 6. Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DO $$
BEGIN
    -- Warehouses
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'warehouses' AND policyname = 'tenant_isolation_warehouses') THEN
        CREATE POLICY tenant_isolation_warehouses ON warehouses USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
    
    -- Items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'tenant_isolation_items') THEN
        CREATE POLICY tenant_isolation_items ON inventory_items USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
    
    -- Stock
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_stock' AND policyname = 'tenant_isolation_stock') THEN
        CREATE POLICY tenant_isolation_stock ON inventory_stock USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
    
    -- Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'tenant_isolation_transactions') THEN
        CREATE POLICY tenant_isolation_transactions ON inventory_transactions USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
END $$;
