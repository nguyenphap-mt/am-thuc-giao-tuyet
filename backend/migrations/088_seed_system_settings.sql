-- ============================================
-- Migration: Seed default system settings for all tenants
-- Module: Settings / System Tab
-- Date: 2026-02-26
-- Description: Ensures all tenants have default values for all system settings
-- Idempotent: Uses INSERT ... WHERE NOT EXISTS
-- ============================================

-- Order & Operations
INSERT INTO tenant_settings (id, tenant_id, setting_key, setting_value, setting_type, description)
SELECT gen_random_uuid(), t.id, s.key, s.default_value, s.type, s.description
FROM tenants t
CROSS JOIN (VALUES
    ('order.auto_deduct_inventory', 'true', 'BOOLEAN', 'Tự động trừ kho khi hoàn thành đơn'),
    ('order.auto_create_timesheet', 'true', 'BOOLEAN', 'Tự động tạo bảng chấm công'),
    ('order.auto_earn_loyalty', 'true', 'BOOLEAN', 'Tự động cộng điểm tích lũy'),
    ('order.require_deposit', 'false', 'BOOLEAN', 'Yêu cầu đặt cọc trước xác nhận'),
    ('order.min_order_amount', '0', 'NUMBER', 'Giá trị đơn hàng tối thiểu (VND)'),
    ('order.default_lead_time_days', '3', 'NUMBER', 'Thời gian chuẩn bị mặc định (ngày)'),
    -- CRM & Loyalty
    ('crm.loyalty_enabled', 'true', 'BOOLEAN', 'Bật/tắt chương trình loyalty'),
    ('crm.loyalty_points_ratio', '10000', 'NUMBER', 'Số VND cho 1 điểm'),
    -- Quote
    ('quote.default_validity_days', '30', 'NUMBER', 'Thời hạn hiệu lực mặc định'),
    ('quote.expiring_soon_days', '7', 'NUMBER', 'Ngưỡng cảnh báo sắp hết hạn'),
    -- Finance
    ('finance.auto_journal_on_payment', 'true', 'BOOLEAN', 'Tự động tạo bút toán khi thanh toán'),
    ('finance.default_payment_terms', '30', 'NUMBER', 'Hạn thanh toán mặc định (ngày)'),
    ('finance.tax_rate', '10', 'NUMBER', 'Thuế GTGT mặc định (%)'),
    ('finance.default_service_charge', '0', 'NUMBER', 'Phí dịch vụ mặc định (%)'),
    -- System Integration
    ('hr.sync_order_assignments', 'true', 'BOOLEAN', 'Đồng bộ phân công nhân viên'),
    ('inventory.auto_import_from_po', 'true', 'BOOLEAN', 'Tự động nhập kho từ PO')
) AS s(key, default_value, type, description)
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_settings ts
    WHERE ts.tenant_id = t.id AND ts.setting_key = s.key
);
