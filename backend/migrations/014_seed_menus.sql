-- Migration: 014_seed_menus.sql
-- Purpose: Seed menu data from CSV file
-- Source: ẨM THỰC GIÁO TUYẾT - Database - Menus.csv
-- Date: 2026-01-17

-- =====================================================
-- SEED DATA - RUN AFTER TABLES ARE CREATED
-- =====================================================

-- Note: This migration requires a tenant_id to exist.
-- For development, we'll use a placeholder tenant UUID.
-- In production, replace with actual tenant_id.

DO $$
DECLARE
    v_tenant_id UUID;
    v_cat_ban_ghe UUID;
    v_cat_nhan_vien UUID;
    v_cat_khai_vi UUID;
    v_cat_mon_chinh UUID;
    v_cat_trang_mieng UUID;
BEGIN
    -- Get first tenant (for development)
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    -- If no tenant exists, create a default one
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (id, name, code, is_active)
        VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            'Ẩm Thực Giáo Tuyết',
            'ATGT',
            TRUE
        )
        RETURNING id INTO v_tenant_id;
    END IF;

    -- Set tenant context for RLS
    PERFORM set_config('app.current_tenant', v_tenant_id::text, false);

    -- =====================================================
    -- 1. CREATE CATEGORIES
    -- =====================================================
    
    INSERT INTO categories (id, tenant_id, name, code, description)
    VALUES 
        (uuid_generate_v4(), v_tenant_id, 'Bàn ghế', 'BAN', 'Dụng cụ bàn ghế tiệc')
    RETURNING id INTO v_cat_ban_ghe;

    INSERT INTO categories (id, tenant_id, name, code, description)
    VALUES 
        (uuid_generate_v4(), v_tenant_id, 'Nhân viên', 'NV', 'Nhân viên phục vụ')
    RETURNING id INTO v_cat_nhan_vien;

    INSERT INTO categories (id, tenant_id, name, code, description)
    VALUES 
        (uuid_generate_v4(), v_tenant_id, 'Khai Vị', 'KV', 'Món khai vị')
    RETURNING id INTO v_cat_khai_vi;

    INSERT INTO categories (id, tenant_id, name, code, description)
    VALUES 
        (uuid_generate_v4(), v_tenant_id, 'Món chính', 'MC', 'Món chính')
    RETURNING id INTO v_cat_mon_chinh;

    INSERT INTO categories (id, tenant_id, name, code, description)
    VALUES 
        (uuid_generate_v4(), v_tenant_id, 'Tráng miệng', 'TM', 'Món tráng miệng')
    RETURNING id INTO v_cat_trang_mieng;

    -- =====================================================
    -- 2. SEED MENU ITEMS
    -- =====================================================

    -- Category: Bàn ghế (BAN)
    INSERT INTO menu_items (tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
    VALUES
        (v_tenant_id, v_cat_ban_ghe, 'Bàn, ghế inox', '', 'Bộ', 250000, 250000, TRUE),
        (v_tenant_id, v_cat_ban_ghe, 'Bàn, ghế sự kiện', '', 'Bộ', 500000, 500000, TRUE),
        (v_tenant_id, v_cat_ban_ghe, 'Khung rạp', 'Khung cho 2 bàn', 'Bộ', 400000, 450000, TRUE);

    -- Category: Nhân viên (NV)
    INSERT INTO menu_items (tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
    VALUES
        (v_tenant_id, v_cat_nhan_vien, 'Nhân viên phục vụ', '', 'Người', 300000, 350000, TRUE);

    -- Category: Khai Vị (KV)
    INSERT INTO menu_items (tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
    VALUES
        (v_tenant_id, v_cat_khai_vi, 'Nem chua + chả Huế', 'Gỏi cuốn tươi ngon với tôm và thịt', 'Món', 90000, 150000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Tôm chiên rế', 'Bún chả đặc sản Hà Nội', 'Món', 150000, 250000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Nem nướng + Chả giò', '', 'Món', 280000, 350000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Nem nướng + Bò cuộn kim châm', '', 'Món', 280000, 350000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Gỏi ngó sen tôm thịt', '', 'Món', 280000, 300000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Gỏi bò bắp ngũ sắc', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_khai_vi, 'Bánh chưng + Chả lụa + củ kiệu', '', 'Món', 280000, 250000, TRUE);

    -- Category: Món chính (MC)
    INSERT INTO menu_items (tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
    VALUES
        -- Súp
        (v_tenant_id, v_cat_mon_chinh, 'Súp nấm tuyết nhỉ', '', 'Món', 280000, 270000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Súp hải sản', '', 'Món', 280000, 300000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Soup hoành thánh', '', 'Món', 280000, 300000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cháo tiều', '', 'Món', 280000, 350000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cháo bồ câu **', '', 'Món', 280000, 500000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Súp bào ngư hải sản **', '', 'Món', 280000, 700000, TRUE),
        
        -- Gà
        (v_tenant_id, v_cat_mon_chinh, 'Gà ta hấp đồng quê + xôi/bánh bao', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Gà xối mắm + cơm nêu', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Gà ta bó xôi', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Gà lên mâm', '', 'Món', 280000, 700000, TRUE),
        
        -- Thịt
        (v_tenant_id, v_cat_mon_chinh, 'Heo rừng áp chảo', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Bò né thiên lý', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Nai né thiên lý **', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Bò (Lagu/hầm rượu vang)', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Dê hấp tía tô **', '', 'Món', 280000, 500000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Giò heo giả cầy', '', 'Món', 280000, 550000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Bồ câu rôti', '', 'Món', 280000, 1300000, TRUE),
        
        -- Hải sản
        (v_tenant_id, v_cat_mon_chinh, 'Cá điêu hồng chưng tương', '', 'Món', 280000, 350000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Mực ống (hấp/sate)', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cá tai tượng sốt cam', '', 'Món', 280000, 400000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cá chẽm hấp HongKong **', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Tôm sú (hấp/tiềm) ***', '', 'Món', 280000, 500000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Tôm sú Size lớn(hấp/tiềm) ***', '', 'Món', 280000, 700000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cá mú hấp HongKong **', '', 'Món', 280000, 800000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Tôm càng xanh (sốt/hấp) ***', '', 'Món', 280000, 1000000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Cua lột rang bơ tỏi ***', '', 'Món', 280000, 1200000, TRUE),
        
        -- Lẩu
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu riêu cua bắp bò', '', 'Món', 280000, 450000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu thái (hải sản/nấm)', '', 'Món', 280000, 500000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu cá tầm **', '', 'Món', 280000, 650000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu cá bớp **', '', 'Món', 280000, 650000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu cá lăng **', '', 'Món', 280000, 650000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu cá chình **', '', 'Món', 280000, 900000, TRUE),
        (v_tenant_id, v_cat_mon_chinh, 'Lẩu cua biển **', '', 'Món', 280000, 1000000, TRUE);

    -- Category: Tráng miệng (TM)
    INSERT INTO menu_items (tenant_id, category_id, name, description, uom, cost_price, selling_price, is_active)
    VALUES
        (v_tenant_id, v_cat_trang_mieng, 'Trái cây bốn mùa', '', 'Món', 280000, 100000, TRUE),
        (v_tenant_id, v_cat_trang_mieng, 'Rau câu', '', 'Món', 280000, 100000, TRUE),
        (v_tenant_id, v_cat_trang_mieng, 'Sữa chua (nha đam/nếp cẩm)', '', 'Món', 280000, 100000, TRUE),
        (v_tenant_id, v_cat_trang_mieng, 'Tàu hũ Singapo', '', 'Món', 280000, 150000, TRUE),
        (v_tenant_id, v_cat_trang_mieng, 'Nho Mỹ (đen/xanh)', '', 'Món', 280000, 200000, TRUE),
        (v_tenant_id, v_cat_trang_mieng, 'Cherry Newzealand', '', 'Món', 280000, 300000, TRUE);

    RAISE NOTICE 'Seed data inserted successfully! Tenant: %, Categories: 5, Menu Items: 50', v_tenant_id;
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify seed data:
-- SELECT c.name as category, COUNT(m.id) as item_count 
-- FROM categories c 
-- LEFT JOIN menu_items m ON m.category_id = c.id 
-- GROUP BY c.name ORDER BY c.name;
