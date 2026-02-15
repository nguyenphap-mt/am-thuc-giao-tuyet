-- =====================================================
-- Phase 14.1: Quote Templates
-- Allows saving and reusing quote configurations
-- =====================================================

-- Table: quote_templates
CREATE TABLE IF NOT EXISTS quote_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Template Data (JSON arrays)
    items JSONB DEFAULT '[]'::jsonb,     -- [{menu_item_id, name, category, quantity, unit_price}]
    services JSONB DEFAULT '[]'::jsonb,  -- [{name, description, quantity, unit_price}]
    
    -- Default values
    default_table_count INTEGER,
    default_guests_per_table INTEGER DEFAULT 10,
    default_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,
    
    -- RLS tenant isolation
    CONSTRAINT fk_template_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_quote_templates_tenant ON quote_templates(tenant_id);
CREATE INDEX idx_quote_templates_event_type ON quote_templates(event_type);

-- Unique template name per tenant
CREATE UNIQUE INDEX idx_quote_templates_name_unique 
    ON quote_templates(tenant_id, name) WHERE is_active = true;

-- RLS Policy
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_templates_tenant_isolation ON quote_templates
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Update trigger
CREATE TRIGGER quote_templates_updated_at
    BEFORE UPDATE ON quote_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample Template Data (optional)
-- =====================================================
-- INSERT INTO quote_templates (tenant_id, name, event_type, description, items, services)
-- VALUES (
--     '...',
--     'Tiệc Cưới Cơ Bản',
--     'wedding',
--     'Template cho tiệc cưới 20-30 bàn',
--     '[{"name":"Gà hấp muối", "category":"Món chính", "quantity":1, "unit_price":350000}]'::jsonb,
--     '[{"name":"Trang trí bàn tiệc", "quantity":1, "unit_price":2000000}]'::jsonb
-- );
