# Database Rules (Load for DA Dimension)

> **Load when**: Working on database schema, migrations, SQL queries.
> Size: ~8KB

---

## 1. RLS Enforcement (MANDATORY)

> ⚠️ **CRITICAL**: Any code violating RLS rules MUST be REJECTED.

### 1.1 Database Layer (SQL/Migrations)
**EVERY new table MUST include:**

```sql
-- Step 1: Add tenant_id column
CREATE TABLE {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- other columns
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Step 3: Create isolation policy
CREATE POLICY tenant_isolation ON {table_name}
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- Step 4: Index on tenant_id
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);
```

### 1.2 RLS Code Review Checklist
| Check Item | Required | Rejection |
| :--- | :---: | :---: |
| Table has `tenant_id` column | ✅ | ❌ REJECT |
| `ENABLE ROW LEVEL SECURITY` executed | ✅ | ❌ REJECT |
| `CREATE POLICY tenant_isolation` exists | ✅ | ❌ REJECT |
| Index on `tenant_id` created | ✅ | ❌ REJECT |
| Python code sets `app.current_tenant` before queries | ✅ | ❌ REJECT |

### 1.3 Exception Tables (No RLS Required)
| Table | Reason |
| :--- | :--- |
| `tenants` | Parent table for tenant_id |
| `system_config` | Global configuration |
| `migrations` | Schema versioning |

---

## 2. Database Design Patterns

### 2.1 ltree for Hierarchies (WBS, Categories)
```sql
CREATE EXTENSION IF NOT EXISTS ltree;

CREATE TABLE work_packages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    wbs_path ltree NOT NULL  -- e.g., 'Project1.Phase1.Task1'
);

CREATE INDEX idx_wbs_path ON work_packages USING GIST (wbs_path);

-- Get all children
SELECT * FROM work_packages WHERE wbs_path <@ 'Project1.Phase1';
```

### 2.2 JSONB for Dynamic Attributes
```sql
CREATE TABLE items (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    specs JSONB DEFAULT '{}'
);

-- Validate with pg_jsonschema
ALTER TABLE items ADD CONSTRAINT valid_specs
    CHECK (jsonb_matches_schema('{ "type": "object" }', specs));

-- Index for queries
CREATE INDEX idx_items_specs ON items USING GIN (specs);
```

### 2.3 Closure Table for Account Hierarchies
```sql
CREATE TABLE account_closure (
    ancestor_id UUID NOT NULL,
    descendant_id UUID NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id)
);
```

### 2.4 Optimistic Locking
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    version INTEGER DEFAULT 1
);

-- Update with version check
UPDATE orders 
SET version = version + 1, status = 'approved'
WHERE id = $1 AND version = $2
RETURNING *;
-- If 0 rows → 409 Conflict
```

---

## 3. Migration Strategy

### 3.1 Migration Workflow
```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Additive Change (Compatible)                           │
│  ALTER TABLE orders ADD COLUMN new_status TEXT;                 │
│  → Deploy new code that writes BOTH old and new                 │
├─────────────────────────────────────────────────────────────────┤
│ Phase 2: Data Migration                                         │
│  UPDATE orders SET new_status = old_status WHERE new_status IS NULL;│
│  → Run in batches to avoid locking                              │
├─────────────────────────────────────────────────────────────────┤
│ Phase 3: Code Switch                                            │
│  → All code now reads/writes new_status only                    │
├─────────────────────────────────────────────────────────────────┤
│ Phase 4: Remove Old (Cleanup)                                   │
│  ALTER TABLE orders DROP COLUMN old_status;                     │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Migration File Template
```sql
-- migrations/20260112_create_{table}.up.sql
BEGIN;

CREATE TABLE {table_name} (...);
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table_name} ...;
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);

COMMIT;

-- migrations/20260112_create_{table}.down.sql
BEGIN;
DROP TABLE IF EXISTS {table_name} CASCADE;
COMMIT;
```

---

## 4. Naming Conventions

| Element | Convention | Example |
| :--- | :--- | :--- |
| Table | `snake_case`, plural | `purchase_orders` |
| Column | `snake_case` | `created_at` |
| Primary Key | `id` | `id UUID` |
| Foreign Key | `{table}_id` | `order_id` |
| Index | `idx_{table}_{columns}` | `idx_orders_tenant` |
| Policy | `{purpose}` | `tenant_isolation` |
