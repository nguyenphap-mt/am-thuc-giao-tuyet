-- Seed data for Quotes
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
    ('BG-2026001', 'Anh Minh', '0901234567', 'wedding', '2026-01-20 11:00:00+07'::timestamptz, 150, 15, 41800000, 'PENDING', 'Tiệc cưới tại nhà hàng'),
    ('BG-2026002', 'Công ty ABC', '0281234567', 'corporate', '2026-01-25 18:00:00+07'::timestamptz, 300, 30, 109000000, 'APPROVED', 'Tiệc tất niên'),
    ('BG-2026003', 'Chị Hoa', '0912345678', 'birthday', '2026-01-18 17:00:00+07'::timestamptz, 50, 5, 14300000, 'APPROVED', 'Sinh nhật 50 tuổi'),
    ('BG-2026004', 'Resort Paradise', '0283456789', 'gala', '2026-01-30 19:00:00+07'::timestamptz, 500, 50, 227000000, 'PENDING', 'Gala Dinner năm mới'),
    ('BG-2026005', 'Anh Tùng', '0934567890', 'party', '2026-01-22 10:00:00+07'::timestamptz, 80, 8, 21800000, 'DRAFT', 'Tiệc thôi nôi bé Bảo'),
    ('BG-2026006', 'Công ty XYZ', '0287654321', 'other', '2026-01-15 12:00:00+07'::timestamptz, 100, 10, 32300000, 'REJECTED', 'Họp mặt đầu năm')
) AS data(code, customer_name, customer_phone, event_type, event_date, guest_count, table_count, subtotal, status, notes)
ON CONFLICT (code) DO NOTHING;
