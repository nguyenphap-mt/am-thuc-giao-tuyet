-- Migration: 072_update_code_format.sql
-- Description: Update quote and order code generation triggers to use new format
-- New Format: BG-ddmmyy*** and ĐH-ddmmyy***
-- Where *** is sequential 001-999 per day

-- ============================================
-- 1. Update Quote Code Generator
-- ============================================
CREATE OR REPLACE FUNCTION generate_quote_code()
RETURNS TRIGGER AS $$
DECLARE
    date_str VARCHAR(6);
    next_seq INTEGER;
    new_code VARCHAR(20);
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        -- Format: ddmmyy (no slashes)
        date_str := TO_CHAR(CURRENT_DATE, 'DDMMYY');
        
        -- Find next sequence for today
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(code FROM LENGTH('BG-') + 7) AS INTEGER)
        ), 0) + 1
        INTO next_seq
        FROM quotes
        WHERE code LIKE 'BG-' || date_str || '%';
        
        -- Build code: BG-220226001
        new_code := 'BG-' || date_str || LPAD(next_seq::VARCHAR, 3, '0');
        NEW.code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger
DROP TRIGGER IF EXISTS trigger_quote_code ON quotes;
CREATE TRIGGER trigger_quote_code
    BEFORE INSERT ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION generate_quote_code();

-- ============================================
-- 2. Update Order Code Generator
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
DECLARE
    date_str VARCHAR(6);
    next_seq INTEGER;
    new_code VARCHAR(20);
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        -- Format: ddmmyy (no slashes)
        date_str := TO_CHAR(CURRENT_DATE, 'DDMMYY');
        
        -- Find next sequence for today
        SELECT COALESCE(MAX(
            CAST(SUBSTRING(code FROM LENGTH('ĐH-') + 7) AS INTEGER)
        ), 0) + 1
        INTO next_seq
        FROM orders
        WHERE code LIKE 'ĐH-' || date_str || '%';
        
        -- Build code: ĐH-220226001
        new_code := 'ĐH-' || date_str || LPAD(next_seq::VARCHAR, 3, '0');
        NEW.code := new_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger
DROP TRIGGER IF EXISTS trg_generate_order_code ON orders;
CREATE TRIGGER trg_generate_order_code
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_code();

-- Done!
SELECT 'Migration 072: Code format updated to BG-ddmmyy*** and ĐH-ddmmyy***' as result;
