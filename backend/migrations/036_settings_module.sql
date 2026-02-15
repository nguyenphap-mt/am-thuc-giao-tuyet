-- ============================================
-- Migration: 036_settings_module.sql
-- Sprint 19.1: Tenant Settings with Auto-Import Toggle
-- ============================================

-- Tenant Settings Table
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Setting key-value
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'STRING', -- STRING, BOOLEAN, NUMBER, JSON
    
    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per tenant
    UNIQUE(tenant_id, setting_key)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_key ON tenant_settings(tenant_id, setting_key);

-- RLS Policy
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_settings_isolation ON tenant_settings
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Insert default settings for existing tenants
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT 
    t.id,
    'inventory.auto_import_from_po',
    'false',
    'BOOLEAN',
    'Tự động nhập kho khi PO được duyệt'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts 
    WHERE ts.tenant_id = t.id 
    AND ts.setting_key = 'inventory.auto_import_from_po'
)
ON CONFLICT DO NOTHING;

-- Additional default settings
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT 
    t.id,
    'hr.sync_order_assignments',
    'true',
    'BOOLEAN',
    'Đồng bộ phân công nhân viên giữa Order và HR'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts 
    WHERE ts.tenant_id = t.id 
    AND ts.setting_key = 'hr.sync_order_assignments'
)
ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT 
    t.id,
    'invoice.auto_generate_code',
    'true',
    'BOOLEAN',
    'Tự động tạo mã hóa đơn'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts 
    WHERE ts.tenant_id = t.id 
    AND ts.setting_key = 'invoice.auto_generate_code'
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE tenant_settings IS 'Cài đặt theo tenant - key/value store';
