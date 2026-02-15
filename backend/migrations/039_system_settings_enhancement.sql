-- ============================================
-- Migration: 039_system_settings_enhancement.sql
-- System Settings Enhancement: 12 new configurable settings
-- Grouped: Order, CRM/Loyalty, Quote, Finance
-- ============================================

-- =============================================
-- Group 1: Order & Operations (4 settings)
-- =============================================

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'order.auto_deduct_inventory', 'true', 'BOOLEAN',
       'Tự động trừ kho khi đơn hàng hoàn thành'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'order.auto_deduct_inventory'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'order.auto_create_timesheet', 'true', 'BOOLEAN',
       'Tự động tạo timesheet khi đơn hàng hoàn thành'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'order.auto_create_timesheet'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'order.auto_earn_loyalty', 'true', 'BOOLEAN',
       'Tự động cộng điểm loyalty khi đơn hàng hoàn thành'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'order.auto_earn_loyalty'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'order.require_deposit', 'false', 'BOOLEAN',
       'Yêu cầu đặt cọc trước khi xác nhận đơn hàng'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'order.require_deposit'
) ON CONFLICT DO NOTHING;

-- =============================================
-- Group 2: CRM & Loyalty (2 settings)
-- =============================================

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'crm.loyalty_enabled', 'true', 'BOOLEAN',
       'Bật/tắt chương trình tích điểm khách hàng'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'crm.loyalty_enabled'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'crm.loyalty_points_ratio', '10000', 'NUMBER',
       'Số VND tương ứng 1 điểm loyalty'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'crm.loyalty_points_ratio'
) ON CONFLICT DO NOTHING;

-- =============================================
-- Group 3: Quote (2 settings)
-- =============================================

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'quote.default_validity_days', '30', 'NUMBER',
       'Số ngày hiệu lực mặc định cho báo giá mới'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'quote.default_validity_days'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'quote.expiring_soon_days', '7', 'NUMBER',
       'Ngưỡng cảnh báo báo giá sắp hết hạn (ngày)'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'quote.expiring_soon_days'
) ON CONFLICT DO NOTHING;

-- =============================================
-- Group 4: Finance (3 settings)
-- =============================================

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'finance.auto_journal_on_payment', 'true', 'BOOLEAN',
       'Tự động tạo bút toán khi ghi nhận thanh toán'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'finance.auto_journal_on_payment'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'finance.default_payment_terms', '30', 'NUMBER',
       'Số ngày thanh toán mặc định'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'finance.default_payment_terms'
) ON CONFLICT DO NOTHING;

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, setting_type, description)
SELECT t.id, 'finance.tax_rate', '10', 'NUMBER',
       'Thuế GTGT mặc định (%)'
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = 'finance.tax_rate'
) ON CONFLICT DO NOTHING;

-- Update existing hr.sync_order_assignments default to true (was seeded as true)
UPDATE tenant_settings
SET setting_value = 'true'
WHERE setting_key = 'hr.sync_order_assignments'
AND setting_value = 'false';
