# Schema Auto-Validator

> **Purpose**: Automatically validate SQL migrations without human review.
> **Gap Closed**: Remove human checkpoint at Step 2 (Database)

---

## Validation Rules

### 1. Core RLS Checks (MANDATORY)

```yaml
rls_validation:
  # Must have tenant_id
  check_tenant_id:
    pattern: "tenant_id\\s+UUID\\s+NOT\\s+NULL"
    error: "E200: Missing tenant_id UUID NOT NULL column"
    severity: CRITICAL
    
  # Must reference tenants table
  check_tenant_fk:
    pattern: "REFERENCES\\s+tenants\\s*\\(\\s*id\\s*\\)"
    error: "E200: Missing REFERENCES tenants(id)"
    severity: CRITICAL
    
  # Must enable RLS
  check_rls_enable:
    pattern: "ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY"
    error: "E200: Missing ENABLE ROW LEVEL SECURITY"
    severity: CRITICAL
    
  # Must have tenant isolation policy
  check_policy:
    pattern: "CREATE\\s+POLICY\\s+tenant_isolation"
    error: "E200: Missing tenant_isolation policy"
    severity: CRITICAL
    
  # Must have tenant index
  check_index:
    pattern: "CREATE\\s+INDEX.*\\(\\s*tenant_id\\s*\\)"
    error: "E201: Missing index on tenant_id"
    severity: HIGH
```

### 2. Schema Quality Checks

```yaml
schema_quality:
  # Primary key must be UUID
  check_pk_uuid:
    pattern: "id\\s+UUID\\s+PRIMARY\\s+KEY"
    error: "E301: Primary key should be UUID"
    severity: MEDIUM
    
  # Must have timestamps
  check_created_at:
    pattern: "created_at\\s+TIMESTAMP"
    error: "E301: Missing created_at column"
    severity: MEDIUM
    
  check_updated_at:
    pattern: "updated_at\\s+TIMESTAMP"
    error: "E301: Missing updated_at column"
    severity: MEDIUM
    
  # Check naming convention
  check_snake_case:
    pattern: "^[a-z][a-z0-9_]*$"
    apply_to: table_names, column_names
    error: "E302: Use snake_case for naming"
    severity: LOW
```

### 3. Foreign Key Validation

```yaml
fk_validation:
  # FK must reference existing tables
  check_fk_exists:
    action: query_information_schema
    query: |
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    error: "E200: Referenced table does not exist"
    severity: CRITICAL
    
  # FK should have index
  check_fk_index:
    pattern: "CREATE\\s+INDEX.*{fk_column}"
    error: "E301: Consider adding index on FK column"
    severity: MEDIUM
```

---

## Validation Engine

### Algorithm
```yaml
validation_flow:
  1_parse_sql:
    action: extract CREATE TABLE, ALTER TABLE, CREATE INDEX statements
    
  2_run_critical_checks:
    checks: [check_tenant_id, check_tenant_fk, check_rls_enable, check_policy]
    on_fail: HALT, return errors
    
  3_run_high_checks:
    checks: [check_index, check_fk_exists]
    on_fail: WARN, continue
    
  4_run_medium_checks:
    checks: [check_pk_uuid, check_created_at, check_updated_at, check_fk_index]
    on_fail: INFO, continue
    
  5_decision:
    if: all_critical_pass AND all_high_pass
    then: AUTO_APPROVE
    else: HALT_FOR_REVIEW
```

### Decision Matrix
| Critical | High | Medium | Action |
| :---: | :---: | :---: | :--- |
| ✅ All Pass | ✅ All Pass | Any | **AUTO-APPROVE** |
| ✅ All Pass | ❌ Some Fail | Any | WARN + AUTO-APPROVE |
| ❌ Any Fail | Any | Any | **HALT FOR REVIEW** |

---

## Integration

### With create-feature.md Step 2
```yaml
step_2_database:
  # Replace turbo-pause with auto-validation
  before:
    annotation: "// turbo-pause"
    human_required: true
    
  after:
    annotation: "// turbo-validate"
    auto_validate: true
    human_required: only_on_critical_fail
```

### Validation Command
```yaml
commands:
  /validate-schema:
    input: migration_file_path
    output: validation_report
    
  /auto-approve-schema:
    condition: all_critical_pass
    action: mark_checkpoint_complete
```

---

## Example Validation

### Input SQL
```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    supplier_id UUID NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL,
    total_amount DECIMAL(15,2),
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON purchase_orders
    USING (tenant_id = current_setting('app.current_tenant')::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE INDEX idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
```

### Validation Output
```yaml
validation_result:
  file: migrations/20260112_create_purchase_orders.up.sql
  status: AUTO_APPROVED ✅
  
  checks:
    critical:
      - check_tenant_id: PASS ✅
      - check_tenant_fk: PASS ✅
      - check_rls_enable: PASS ✅
      - check_policy: PASS ✅
      
    high:
      - check_index: PASS ✅
      - check_fk_exists: PASS ✅ (customers table exists)
      
    medium:
      - check_pk_uuid: PASS ✅
      - check_created_at: PASS ✅
      - check_updated_at: PASS ✅
      - check_fk_index: PASS ✅ (idx_purchase_orders_supplier)
      
  decision: AUTO_APPROVE
  human_review: NOT_REQUIRED
```

---

## Exception Tables

```yaml
# Tables that skip validation
exceptions:
  - table: tenants
    reason: "Parent table, no tenant_id"
    
  - table: system_config
    reason: "Global configuration"
    
  - table: migrations
    reason: "Schema versioning"
    
  - pattern: "*_audit"
    reason: "Audit tables may use different patterns"
```
