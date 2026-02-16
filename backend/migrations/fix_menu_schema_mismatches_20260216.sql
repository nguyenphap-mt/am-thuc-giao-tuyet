-- Migration: Fix Menu Module Schema Mismatches
-- Date: 2026-02-16
-- Bug: BUG-20260216-001
-- Root Cause: ORM models reference columns not present in Supabase tables
-- Affected tables: menu_items, categories, set_menus, set_menu_items, recipes

-- ============================================
-- 1. menu_items - Add sort_order
-- ============================================
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================
-- 2. categories - Add sort_order
-- ============================================
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================
-- 3. set_menus - Add sort_order, image_url, rename price→selling_price
-- ============================================
ALTER TABLE public.set_menus 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

ALTER TABLE public.set_menus 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Rename price to selling_price (ORM expects selling_price)
ALTER TABLE public.set_menus 
RENAME COLUMN price TO selling_price;

-- ============================================
-- 4. set_menu_items - Add missing columns (id, tenant_id, notes, created_at)
-- ============================================
ALTER TABLE public.set_menu_items 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

ALTER TABLE public.set_menu_items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.set_menu_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.set_menu_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 5. recipes - Add columns that ORM expects but DB doesn't have
-- ============================================
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS menu_item_name VARCHAR(255);

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ingredient_id UUID;

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ingredient_name VARCHAR(255);

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS quantity_per_unit NUMERIC(15,4) DEFAULT 1;

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS uom VARCHAR(50) DEFAULT 'kg';

ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS notes TEXT;
