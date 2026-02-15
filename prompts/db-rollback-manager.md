# Database Rollback Manager

> **Purpose**: Manage database migrations with rollback support
> **Trigger**: `/rollback-db [version]` or on migration failure

---

## 1. Migration File Requirements

### 1.1 File Naming
```
migrations/
├── 20260112_001_create_purchase_orders.up.sql
├── 20260112_001_create_purchase_orders.down.sql  # REQUIRED
├── 20260112_002_add_po_items.up.sql
└── 20260112_002_add_po_items.down.sql            # REQUIRED
```

### 1.2 Up Migration Template
```sql
-- migrations/{timestamp}_{name}.up.sql
-- Description: {description}
-- Author: AI Workflow
-- Created: {timestamp}

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    -- columns here
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation ON {table_name}
    USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Create indexes
CREATE INDEX idx_{table_name}_tenant ON {table_name}(tenant_id);

COMMIT;
```

### 1.3 Down Migration Template (MANDATORY)
```sql
-- migrations/{timestamp}_{name}.down.sql
-- Description: Rollback {description}
-- Author: AI Workflow
-- Created: {timestamp}

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_{table_name}_tenant;

-- Drop policies
DROP POLICY IF EXISTS tenant_isolation ON {table_name};

-- Disable RLS (optional, table will be dropped anyway)
ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY;

-- Drop table
DROP TABLE IF EXISTS {table_name} CASCADE;

COMMIT;
```

---

## 2. Migration Tracking

### 2.1 Schema Migrations Table
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL,
    execution_time_ms INTEGER
);
```

### 2.2 Track Applied Migrations
```sql
-- Record migration
INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
VALUES ('20260112_001', 'create_purchase_orders', 'sha256_hash', 150);

-- Check if applied
SELECT 1 FROM schema_migrations WHERE version = '20260112_001';

-- Get applied migrations
SELECT version, name, applied_at 
FROM schema_migrations 
ORDER BY version DESC;
```

---

## 3. Rollback Operations

### 3.1 Rollback Single Migration
```bash
# Usage: /rollback-db 20260112_001

# Steps:
1. Check if migration was applied
2. Find corresponding .down.sql file
3. Execute down migration
4. Remove from schema_migrations table
```

### 3.2 Rollback to Version
```bash
# Usage: /rollback-db --to 20260111_005

# Steps:
1. Get all migrations after target version
2. Rollback in reverse order (newest first)
3. Stop at target version
```

### 3.3 Rollback All
```bash
# Usage: /rollback-db --all

# Steps:
1. Get all applied migrations
2. Rollback in reverse order
3. Clear schema_migrations table
```

---

## 4. Auto-Generate Down Migration

### 4.1 Patterns for Auto-Generation

| Up Statement | Down Statement |
| :--- | :--- |
| `CREATE TABLE x` | `DROP TABLE x CASCADE` |
| `ALTER TABLE x ADD COLUMN y` | `ALTER TABLE x DROP COLUMN y` |
| `CREATE INDEX x ON y` | `DROP INDEX x` |
| `CREATE POLICY x ON y` | `DROP POLICY x ON y` |
| `ALTER TABLE x ENABLE RLS` | `ALTER TABLE x DISABLE RLS` |

### 4.2 Generation Script
```powershell
# .agent/scripts/generate-down-migration.ps1

param(
    [string]$UpFile
)

$upContent = Get-Content $UpFile -Raw

# Parse CREATE TABLE
if ($upContent -match 'CREATE TABLE (\w+)') {
    $table = $Matches[1]
    $downStatements += "DROP TABLE IF EXISTS $table CASCADE;"
}

# Parse CREATE INDEX
$upContent | Select-String 'CREATE INDEX (\w+)' -AllMatches | ForEach-Object {
    $index = $_.Matches.Groups[1].Value
    $downStatements += "DROP INDEX IF EXISTS $index;"
}

# Generate down file
$downFile = $UpFile -replace '\.up\.sql$', '.down.sql'
$downContent = @"
-- Auto-generated rollback migration
BEGIN;

$($downStatements -join "`n")

COMMIT;
"@

$downContent | Set-Content $downFile
Write-Host "Generated: $downFile"
```

---

## 5. Commands

### `/rollback-db [version]`
```
Rollback specific migration.

Usage:
  /rollback-db 20260112_001
  /rollback-db --to 20260111_005
  /rollback-db --all
  /rollback-db --last 3  # Last 3 migrations
```

### `/migration-status`
```
Show all migrations and their status.

Output:
  ✅ 20260112_001 create_purchase_orders (applied 2 hours ago)
  ✅ 20260112_002 add_po_items (applied 1 hour ago)
  ⬜ 20260112_003 create_po_attachments (pending)
```

### `/generate-down [up_file]`
```
Generate down migration from up file.

Usage:
  /generate-down migrations/20260112_001_create_po.up.sql
```

---

## 6. Safety Checks

### 6.1 Pre-Rollback Checks
```yaml
safety_checks:
  - check_backup_exists:
      warn_if_missing: true
      block_rollback: false
      
  - check_connected_tables:
      action: list foreign keys
      warn: "Rolling back will affect: {tables}"
      
  - check_data_loss:
      action: count rows
      warn_if_data: "Table has {count} rows. This is DESTRUCTIVE."
      require_confirm: true
```

### 6.2 Confirmation Prompt
```
⚠️ WARNING: Rollback Migration

You are about to rollback: 20260112_001_create_purchase_orders

This will:
- DROP TABLE purchase_orders (containing 150 rows)
- DROP related indexes and policies
- Affect foreign keys in: po_items, po_attachments

This action is DESTRUCTIVE and cannot be undone without backup.

Type 'ROLLBACK' to confirm: _
```

---

## 7. Integration with Workflow

### 7.1 On Migration Failure
```yaml
on_migration_failure:
  1_capture_error:
    - Log error message
    - Save partial state
    
  2_auto_rollback:
    - If within transaction: auto-rollback
    - If committed: manual rollback required
    
  3_notify:
    - Show error to user
    - Suggest: /rollback-db {version}
```

### 7.2 In create-feature.md
```yaml
step_2_database:
  actions:
    - generate_up_migration
    - generate_down_migration  # NEW - Always generate both
    - validate_both_files
    - apply_up_migration
    - record_in_schema_migrations
    
  on_failure:
    - execute_down_migration
    - retry_or_escalate
```
