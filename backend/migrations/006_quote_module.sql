-- ============================================
-- Quote Module Migration
-- Created: 2026-01-17
-- Database: catering_db
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: quotes
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Quote Code (auto-generated)
    code VARCHAR(50) NOT NULL,
    
    -- Customer Info
    customer_id UUID,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    
    -- Event Info
    event_type VARCHAR(100),
    event_date TIMESTAMP WITH TIME ZONE,
    event_time VARCHAR(20),
    event_address TEXT,
    guest_count INTEGER DEFAULT 0,
    table_count INTEGER DEFAULT 0,
    
    -- Pricing
    subtotal NUMERIC(15, 2) DEFAULT 0,
    vat_rate NUMERIC(5, 2) DEFAULT 10,
    vat_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    
    -- Status: DRAFT, PENDING, APPROVED, REJECTED, CONVERTED
    status VARCHAR(20) DEFAULT 'DRAFT',
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_quotes ON quotes
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_code ON quotes(code);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_event_date ON quotes(event_date);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_name);

-- ============================================
-- Table: quote_items
-- ============================================
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Menu Item Reference
    menu_item_id UUID REFERENCES menu_items(id),
    category_id UUID REFERENCES categories(id),
    
    -- Item Info
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    uom VARCHAR(50),
    
    -- Pricing
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    total_price NUMERIC(15, 2) DEFAULT 0,
    
    -- Notes
    note TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_quote_items ON quote_items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_items_tenant ON quote_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_menu ON quote_items(menu_item_id);

-- ============================================
-- Table: quote_services (Bàn ghế, nhân viên, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS quote_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    
    -- Service Info
    service_type VARCHAR(50) NOT NULL, -- 'FURNITURE', 'STAFF', 'DECORATION'
    service_name VARCHAR(255) NOT NULL,
    
    -- Pricing
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    total_price NUMERIC(15, 2) DEFAULT 0,
    
    -- Notes
    note TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE quote_services ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_quote_services ON quote_services
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_services_tenant ON quote_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quote_services_quote ON quote_services(quote_id);

-- ============================================
-- Sequence for Quote Code
-- ============================================
CREATE SEQUENCE IF NOT EXISTS quote_code_seq START 1;

-- Function to generate quote code
CREATE OR REPLACE FUNCTION generate_quote_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'BG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD(nextval('quote_code_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto code generation
DROP TRIGGER IF EXISTS trigger_quote_code ON quotes;
CREATE TRIGGER trigger_quote_code
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION generate_quote_code();

-- ============================================
-- Seed sample data for development
-- ============================================
INSERT INTO quotes (tenant_id, code, customer_name, customer_phone, event_type, event_date, guest_count, table_count, subtotal, vat_rate, vat_amount, total_amount, status, notes)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    code,
    customer_name,
    customer_phone,
    event_type,
    event_date,
    guest_count,
    table_count,
    subtotal,
    10,
    subtotal * 0.1,
    subtotal * 1.1,
    status,
    notes
FROM (VALUES
    ('BG-2026001', 'Anh Minh', '0901234567', 'Đám cưới', '2026-01-20 11:00:00+07'::timestamptz, 150, 15, 41800000, 'PENDING', 'Tiệc cưới tại nhà hàng'),
    ('BG-2026002', 'Công ty ABC', '0281234567', 'Tiệc công ty', '2026-01-25 18:00:00+07'::timestamptz, 300, 30, 109000000, 'APPROVED', 'Tiệc tất niên'),
    ('BG-2026003', 'Chị Hoa', '0912345678', 'Sinh nhật', '2026-01-18 17:00:00+07'::timestamptz, 50, 5, 14300000, 'APPROVED', 'Sinh nhật 50 tuổi'),
    ('BG-2026004', 'Resort Paradise', '0283456789', 'Gala', '2026-01-30 19:00:00+07'::timestamptz, 500, 50, 227000000, 'PENDING', 'Gala Dinner năm mới'),
    ('BG-2026005', 'Anh Tùng', '0934567890', 'Thôi nôi', '2026-01-22 10:00:00+07'::timestamptz, 80, 8, 21800000, 'DRAFT', 'Tiệc thôi nôi bé Bảo'),
    ('BG-2026006', 'Công ty XYZ', '0287654321', 'Họp mặt', '2026-01-15 12:00:00+07'::timestamptz, 100, 10, 32300000, 'REJECTED', 'Họp mặt đầu năm')
) AS data(code, customer_name, customer_phone, event_type, event_date, guest_count, table_count, subtotal, status, notes)
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Quotes table created with ' || COUNT(*) || ' records' as result FROM quotes;
