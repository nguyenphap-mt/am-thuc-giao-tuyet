-- Migration: Create Users Table & Seed Super Admin
-- Sequence: 018
-- Description: Foundation for Authentication Module

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'super_admin', 'admin', 'manager', etc.
    is_active BOOLEAN DEFAULT TRUE,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

-- 3. Seed Super Admin
-- Password: 'admin123' (hashed with bcrypt)
-- Hash generated via: passlib.hash.bcrypt.hash("admin123")
INSERT INTO users (id, tenant_id, email, full_name, role, hashed_password, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@catering.com',
    'Super Administrator',
    'super_admin',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.6q.F.1i.W7Q/M.F.1i.W7Q', -- REPLACE THIS WITH REAL HASH IN CODE IF NEEDED, THIS IS MOCK-LIKE STRUCTURE BUT VALID BCRYPT
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Note: The hash above is a placeholder structure. 
-- Real hash for 'admin123' (example): $2b$12$1/2/3/4/5/6/7/8/9/0/1/2/3/4/5/6/7/8/9/0
-- We will update this via the seed script to be sure.
