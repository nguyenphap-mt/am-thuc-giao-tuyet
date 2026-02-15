# Auto DoD Runner

> **Purpose**: Automatically verify Definition of Done without human checkpoint.
> **Gap Closed**: Remove human checkpoint at Step 8 (Final Verification)

---

## DoD Checklist (Automated)

### 1. Code Quality Checks

```yaml
code_quality:
  python_tests:
    command: "pytest backend/tests/{module}/ -v --cov=modules.{module}"
    success_criteria:
      - exit_code: 0
      - coverage: ">= 70%"
    error_code: E300
    
  python_lint:
    command: "ruff check backend/modules/{module}/"
    success_criteria:
      - exit_code: 0
      - errors: 0
    error_code: E400
    
  ts_compile:
    command: "ng build --configuration=production"
    success_criteria:
      - exit_code: 0
    error_code: E301
    
  ts_lint:
    command: "ng lint"
    success_criteria:
      - exit_code: 0
    error_code: E400
```

### 2. RLS Security Checks

```yaml
rls_verification:
  rls_enabled:
    query: |
      SELECT tablename FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND NOT c.relrowsecurity
      AND t.tablename NOT IN ('tenants', 'system_config', 'migrations')
    success_criteria:
      - rows_returned: 0
    error_message: "Tables without RLS: {tables}"
    error_code: E100
    
  tenant_isolation_test:
    command: "pytest backend/tests/{module}/ -v -m rls"
    success_criteria:
      - exit_code: 0
    error_code: E100
```

### 3. Documentation Checks

```yaml
documentation:
  user_guide_exists:
    check: file_exists
    path: ".doc/{feature_name}.md"
    error_code: E301
    
  user_guide_content:
    check: file_contains
    path: ".doc/{feature_name}.md"
    patterns:
      - "## 1. Mục Đích"
      - "## 3. Các Bước Thực Hiện"
      - "![" # Has screenshots
    error_code: E301
    
  api_docs_updated:
    check: file_modified_after
    path: ".agent/api-contracts.md"
    after: workflow_start_time
    error_code: E401
```

### 4. Permission Checks

```yaml
permission_verification:
  matrix_defined:
    check: file_contains
    path: ".agent/permission-matrix.md"
    pattern: "### {Feature Name}"
    error_code: E301
    
  frontend_enforced:
    check: file_contains
    paths: "frontend/src/app/{module}/**/*.ts"
    pattern: "appHasPermission|canAccess"
    error_code: E301
    
  backend_enforced:
    check: file_contains
    paths: "backend/modules/{module}/**/*.py"
    pattern: "require_permission|Depends\\(.*permission"
    error_code: E301
```

### 5. i18n Checks

```yaml
i18n_verification:
  vi_translations:
    check: file_contains
    path: "frontend/src/assets/i18n/vi.json"
    pattern: "{feature}"
    error_code: E401
    
  en_translations:
    check: file_contains
    path: "frontend/src/assets/i18n/en.json"
    pattern: "{feature}"
    error_code: E401
    
  no_hardcoded_strings:
    check: file_not_contains
    paths: "frontend/src/app/{module}/**/*.ts"
    patterns:
      - "'Thêm mới'"
      - "'Cập nhật'"
      - "'Xóa'"
    error_code: E401
```

### 6. Browser Test Results

```yaml
browser_verification:
  test_passed:
    check: checkpoint_status
    checkpoint: "browser_test_passed"
    expected: "passed"
    error_code: E300
    
  no_console_errors:
    check: test_report
    field: "console_errors"
    expected: 0
    error_code: E300
    
  no_network_errors:
    check: test_report
    field: "network_errors"
    expected: 0
    error_code: E300
    
  screenshots_captured:
    check: files_exist
    pattern: ".doc/{feature_name}/*.png"
    min_count: 1
    error_code: E401
```

---

## Execution Engine

### Run Sequence
```yaml
execution_order:
  1_critical: # Must all pass
    - rls_enabled
    - tenant_isolation_test
    - python_tests
    - ts_compile
    
  2_high: # Should pass
    - python_lint
    - ts_lint
    - browser_verification
    
  3_medium: # Nice to have
    - user_guide_exists
    - user_guide_content
    - permission_verification
    - i18n_verification
    
  4_low: # Informational
    - api_docs_updated
    - screenshots_captured
```

### Decision Logic
```yaml
decision_matrix:
  all_critical_pass:
    action: continue
  any_critical_fail:
    action: HALT
    escalate: true
    
  all_high_pass:
    action: AUTO_APPROVE
  any_high_fail:
    action: WARN
    continue: true
    
  medium_or_low_fail:
    action: LOG
    continue: true
    
final_decision:
  if: critical_pass AND high_pass
  then: AUTO_APPROVE ✅
  else: HALT_FOR_REVIEW ⚠️
```

---

## Output Report

### Template
```markdown
# DoD Verification Report

**Feature**: {feature_name}
**Module**: {module}
**Timestamp**: {timestamp}

## Summary
| Category | Passed | Failed | Status |
| :--- | :---: | :---: | :---: |
| Critical | {n}/{total} | {f} | ✅/❌ |
| High | {n}/{total} | {f} | ✅/❌ |
| Medium | {n}/{total} | {f} | ✅/⚠️ |
| Low | {n}/{total} | {f} | ✅/ℹ️ |

## Detailed Results

### Critical Checks
- [x] RLS enabled on all tables
- [x] Tenant isolation test passed
- [x] Python tests passed (coverage: 78%)
- [x] TypeScript compiles (ng build)

### High Checks
- [x] Python lint clean (ruff)
- [x] Angular lint clean (ng lint)
- [x] Browser test passed

### Medium Checks
- [x] User guide exists
- [x] User guide has required sections
- [x] Permission matrix defined
- [x] i18n translations added

### Low Checks
- [x] API docs updated
- [x] Screenshots captured

## Decision
**STATUS**: ✅ AUTO-APPROVED

Feature "{feature_name}" passes all DoD criteria.
Ready for merge to main branch.
```

---

## Integration

### With create-feature.md Step 8
```yaml
step_8_verification:
  before:
    annotation: "// turbo-pause"
    human_required: true
    
  after:
    annotation: "// turbo-auto-dod"
    auto_verify: true
    human_required: only_on_critical_fail
```

### Commands
```yaml
commands:
  /run-dod:
    input: feature_name, module
    output: dod_report
    auto_approve_if: all_critical_pass
    
  /dod-status:
    output: current verification state
    
  /force-approve:
    condition: admin_only
    action: bypass remaining checks
```

---

## Continuous Improvement

```yaml
learning:
  track_failures:
    log: which checks fail most often
    adjust: add more specific checks
    
  track_false_positives:
    log: checks that pass but bugs found later
    adjust: add stricter criteria
    
  optimize_speed:
    log: check execution times
    adjust: parallelize slow checks
```
