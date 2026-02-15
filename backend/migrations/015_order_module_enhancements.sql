-- Migration: 015_order_module_enhancements.sql
-- Module: Order Management Enhancements
-- Description: Add order_items table and additional columns for complete order management

-- 1. Add missing columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_time VARCHAR(10); -- HH:mm format
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_type VARCHAR(100); -- Wedding, Birthday, etc.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2) DEFAULT 10;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS final_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add missing columns to order_payments table
ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS reference_no VARCHAR(100); -- For bank transfer reference

-- 3. Order Items Table (if not exists)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    menu_item_id UUID, -- Optional reference to menu_items
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- Khai vị, Món chính, Tráng miệng, etc.
    description TEXT,
    uom VARCHAR(50) DEFAULT 'bàn', -- Unit of measure: bàn, phần, kg, etc.
    
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    
    note TEXT,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enable RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy for order_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'tenant_isolation_order_items'
    ) THEN
        CREATE POLICY tenant_isolation_order_items ON order_items 
            USING (tenant_id = current_setting('app.current_tenant')::UUID);
    END IF;
END $$;

-- 6. Indexes for order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id);

-- 7. Additional indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_event_date ON orders(tenant_id, event_date);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);

-- 8. Function to auto-update order totals when payments are added
CREATE OR REPLACE FUNCTION update_order_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update paid_amount and balance_amount
    UPDATE orders 
    SET 
        paid_amount = COALESCE((
            SELECT SUM(amount) FROM order_payments WHERE order_id = NEW.order_id
        ), 0),
        balance_amount = final_amount - COALESCE((
            SELECT SUM(amount) FROM order_payments WHERE order_id = NEW.order_id
        ), 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger for payment auto-calculation
DROP TRIGGER IF EXISTS trg_update_order_payment_totals ON order_payments;
CREATE TRIGGER trg_update_order_payment_totals
    AFTER INSERT OR UPDATE OR DELETE ON order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_totals();

-- 10. Function to auto-generate order code
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    random_part INTEGER;
    new_code VARCHAR(20);
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
        random_part := FLOOR(RANDOM() * 900000 + 100000);
        new_code := 'DH-' || year_part || random_part::VARCHAR;
        NEW.code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger for order code generation
DROP TRIGGER IF EXISTS trg_generate_order_code ON orders;
CREATE TRIGGER trg_generate_order_code
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_code();

-- Done!
