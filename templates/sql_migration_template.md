# SQL Migration Template (Database)

Sử dụng template này khi tạo bảng mới trong PostgreSQL.

## Quy Tắc Bắt Buộc

1. **Mọi bảng PHẢI có `tenant_id`** (trừ bảng config global).
2. **Mọi bảng PHẢI có RLS Policy**.
3. **Sử dụng `UUID` cho Primary Key**.
4. **Sử dụng `JSONB` cho Dynamic Attributes**.

---

## Template Migration

```sql
-- Migration: Create {table_name} table
-- Author: AI Agent
-- Date: YYYY-MM-DD

-- ============================================
-- STEP 1: Create Table
-- ============================================
CREATE TABLE IF NOT EXISTS {table_name} (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- MANDATORY: Multi-tenancy
    tenant_id UUID NOT NULL,
    
    -- Core Fields
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dynamic Attributes (Flexible fields)
    attributes JSONB DEFAULT '{}',
    
    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    
    -- Foreign Keys (if any)
    -- parent_id UUID REFERENCES {parent_table}(id),
    
    -- Constraints
    CONSTRAINT {table_name}_tenant_fk FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================
-- STEP 2: Create Indexes
-- ============================================
-- Standard indexes
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);
CREATE INDEX idx_{table_name}_created ON {table_name}(created_at);

-- GIN Index for JSONB (if using attributes)
CREATE INDEX idx_{table_name}_attrs ON {table_name} USING GIN (attributes);

-- ============================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (security best practice)
ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Create RLS Policy
-- ============================================
-- Policy: Users can only see/modify rows belonging to their tenant
CREATE POLICY tenant_isolation_policy ON {table_name}
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================
-- STEP 5: Create Updated_at Trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_{table_name}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_{table_name}_updated_at
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW
    EXECUTE FUNCTION update_{table_name}_updated_at();
```

---

## Checklist Migration

- [ ] Có `tenant_id` column
- [ ] Có `RLS Policy` (tenant_isolation_policy)
- [ ] Có Index trên `tenant_id`
- [ ] Có GIN Index nếu dùng `JSONB`
- [ ] Có Trigger `updated_at`
- [ ] Test: Thử truy vấn không set `app.current_tenant` -> phải trả về 0 rows

---

## Ví Dụ: Bảng Items (Inventory)

```sql
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dual-UOM
    primary_uom VARCHAR(20) NOT NULL,        -- e.g., 'kg'
    secondary_uom VARCHAR(20),               -- e.g., 'm'
    conversion_rate DECIMAL(15,6),           -- e.g., 0.25 (1kg = 0.25m)
    
    -- Dynamic Technical Specs
    specs JSONB DEFAULT '{}',                -- {"voltage": "220V", "amperage": "16A"}
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'active',     -- active, classic, limited, obsolete
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, sku)
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON items USING (tenant_id = current_setting('app.current_tenant')::uuid);
```
