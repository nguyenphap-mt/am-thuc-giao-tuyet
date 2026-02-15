-- Migration: Enhance Quote Table & Add Note Presets
-- Description: Add discount columns, VAT toggle to quotes. Create table for saved notes.

-- 1. Add columns to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS discount_furniture_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_staff_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_total_percent NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_vat_inclusive BOOLEAN DEFAULT FALSE; -- "Kèm thuế" (True = VAT Applied)

-- 2. Create quote_note_presets table
CREATE TABLE IF NOT EXISTS quote_note_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seed some default notes
INSERT INTO quote_note_presets (content) VALUES
('Giá chưa bao gồm VAT 10%'),
('Vui lòng đặt cọc 50% ngay sau khi ký hợp đồng'),
('Số lượng khách chốt trước 3 ngày diễn ra tiệc'),
('Miễn phí vận chuyển trong bán kính 10km')
ON CONFLICT (content) DO NOTHING;
