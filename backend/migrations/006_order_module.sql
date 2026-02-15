-- Migration: 006_order_module.sql
-- Module: Order Management (Sales)

-- 1. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id), -- Optional link to source quote
    code VARCHAR(50) NOT NULL, -- Format: ORD-YYYYMM-XXXX
    customer_id UUID, -- Link to customers
    customer_name VARCHAR(255),
    event_date TIMESTAMP,
    event_address TEXT,
    
    total_amount DECIMAL(15, 2) DEFAULT 0,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance_amount DECIMAL(15, 2) DEFAULT 0,
    
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, CONFIRMED, PREPARING, DELIVERED, COMPLETED, CANCELLED
    note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Order Payments Table
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'CASH', -- CASH, TRANSFER
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY tenant_isolation_orders ON orders USING (tenant_id = current_setting('app.current_tenant')::UUID);
CREATE POLICY tenant_isolation_order_payments ON order_payments USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- 5. Indexes
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_order_payments_order ON order_payments(order_id);
