# Permission Rule Engine

> **Purpose**: Automatically generate permission matrix from patterns.
> **Gap Closed**: Remove human checkpoint at Step 6 (Permission)

---

## Pattern Library

### 1. Standard CRUD Pattern
```yaml
pattern_name: CRUD_Standard
description: "Standard create/read/update/delete permissions"
applies_when:
  - entity_type: "standard"
  - no_sensitive_data: true
  
permissions:
  view:
    roles: [super_admin, admin, manager, staff, viewer]
    description: "All authenticated users can view"
    
  create:
    roles: [super_admin, admin, manager, staff]
    description: "Staff and above can create"
    
  edit:
    roles: [super_admin, admin, manager]
    description: "Managers and above can edit"
    
  delete:
    roles: [super_admin, admin]
    description: "Only admins can delete"
```

### 2. Sensitive Data Pattern
```yaml
pattern_name: Sensitive_Data
description: "Restricted access for sensitive information"
applies_when:
  - entity_name_contains: [salary, payroll, cost, price, margin, hr, personal]
  - or_module: [finance, hr]
  
permissions:
  view:
    roles: [super_admin, admin, manager, accountant, hr_staff]
    description: "Limited roles only"
    
  create:
    roles: [super_admin, admin, accountant, hr_staff]
    description: "Department specialists only"
    
  edit:
    roles: [super_admin, admin]
    description: "Admins only"
    
  delete:
    roles: [super_admin]
    description: "Super admin only"
```

### 3. Owner-Based Pattern (ReBAC)
```yaml
pattern_name: Owner_Based
description: "Resource ownership determines access"
applies_when:
  - has_field: owner_id | created_by | assigned_to
  - or_entity_type: [project, task, quote, order]
  
permissions:
  view_all:
    roles: [super_admin, admin, manager]
    
  view_own:
    roles: [staff, viewer]
    condition: "resource.owner_id == user.id"
    
  edit_all:
    roles: [super_admin, admin, manager]
    
  edit_own:
    roles: [staff]
    condition: "resource.owner_id == user.id"
    
  delete:
    roles: [super_admin, admin]
    
relations:
  owner: [view, edit, delete, manage]
  manager: [view, edit, manage]
  member: [view, edit_own]
  viewer: [view]
```

### 4. Approval Workflow Pattern
```yaml
pattern_name: Approval_Workflow
description: "Multi-level approval permissions"
applies_when:
  - has_field: status | approval_status
  - entity_name_contains: [order, request, invoice, expense]
  
permissions:
  view:
    roles: [super_admin, admin, manager, staff, viewer]
    
  create:
    roles: [super_admin, admin, manager, staff]
    
  edit_draft:
    roles: [super_admin, admin, manager, staff]
    condition: "status == 'draft'"
    
  submit:
    roles: [staff]
    condition: "status == 'draft'"
    
  approve:
    roles: [manager, admin, super_admin]
    condition: "status == 'submitted'"
    
  reject:
    roles: [manager, admin, super_admin]
    condition: "status == 'submitted'"
```

### 5. Admin Only Pattern
```yaml
pattern_name: Admin_Only
description: "Restricted to administrators"
applies_when:
  - module: settings
  - or_entity_name_contains: [config, system, tenant, audit]
  
permissions:
  view:
    roles: [super_admin, admin]
    
  create:
    roles: [super_admin, admin]
    
  edit:
    roles: [super_admin, admin]
    
  delete:
    roles: [super_admin]
```

---

## Pattern Matching Engine

### Detection Algorithm
```yaml
pattern_detection:
  1_extract_metadata:
    - entity_name: from table/component name
    - fields: from schema columns
    - module: from file path
    
  2_check_patterns_in_order:
    priority:
      - Admin_Only        # Check first (most restrictive)
      - Sensitive_Data    # Check second
      - Approval_Workflow # Check third
      - Owner_Based       # Check fourth
      - CRUD_Standard     # Default fallback
      
  3_match_conditions:
    for_each_pattern:
      if: all_applies_when_conditions_true
      then: use_this_pattern
      else: continue_to_next
      
  4_generate_matrix:
    action: expand_pattern_to_full_matrix
```

### Matching Examples

| Entity | Module | Fields | Matched Pattern |
| :--- | :--- | :--- | :--- |
| `users` | settings | - | Admin_Only |
| `salary_records` | hr | salary, amount | Sensitive_Data |
| `purchase_orders` | inventory | status, owner_id | Approval_Workflow |
| `projects` | projects | owner_id, members | Owner_Based |
| `items` | inventory | - | CRUD_Standard |
| `categories` | inventory | - | CRUD_Standard |

---

## Auto-Generation Logic

### Input
```yaml
input:
  entity_name: "purchase_orders"
  module: "inventory"
  schema:
    columns: [id, tenant_id, supplier_id, status, amount, created_by, created_at]
```

### Processing
```yaml
processing:
  1_check_admin_only:
    module == "settings"? NO
    entity_contains ["config", "system"]? NO
    → SKIP
    
  2_check_sensitive:
    entity_contains ["salary", "payroll"]? NO
    module in ["finance", "hr"]? NO
    → SKIP
    
  3_check_approval_workflow:
    has_field "status"? YES ✓
    entity_contains ["order", "request"]? YES ✓
    → MATCH: Approval_Workflow
```

### Output
```markdown
### Purchase Orders Permissions

#### Module Access
| Role | Can Access |
| :--- | :---: |
| super_admin | ✅ |
| admin | ✅ |
| manager | ✅ |
| accountant | ✅ |
| staff | ✅ |
| viewer | ✅ |

#### Action Permissions
| Action | super_admin | admin | manager | staff | viewer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit (draft) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Submit | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reject | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ | ❌ |

#### Pattern Applied
- **Matched Pattern**: Approval_Workflow
- **Reason**: Entity contains "order" and has "status" field
- **Auto-Generated**: Yes
- **Human Review**: Not Required
```

---

## Integration

### With create-feature.md Step 6
```yaml
step_6_permission:
  before:
    annotation: "// turbo-pause"
    human_required: true
    
  after:
    annotation: "// turbo-auto-permission"
    auto_generate: true
    human_required: only_on_sensitive_data
    
  override_triggers:
    # Still require human for these
    - pattern_matched: Sensitive_Data
    - pattern_matched: Admin_Only
    - custom_rules_detected: true
```

### Commands
```yaml
commands:
  /generate-permissions:
    input: entity_name, module, schema
    output: permission_matrix_markdown
    
  /detect-pattern:
    input: entity_metadata
    output: matched_pattern_name
    
  /override-pattern:
    input: entity_name, pattern_name
    output: regenerated_matrix
```

---

## Confidence Scoring

```yaml
confidence_calculation:
  high_confidence: # Auto-approve
    - pattern: CRUD_Standard
    - conditions_matched: 100%
    - score: >= 90
    
  medium_confidence: # Auto-approve with log
    - pattern: Owner_Based | Approval_Workflow
    - conditions_matched: >= 80%
    - score: 70-89
    
  low_confidence: # Halt for review
    - pattern: Sensitive_Data | Admin_Only
    - conditions_matched: < 80%
    - score: < 70
    
  actions:
    high: AUTO_APPROVE
    medium: AUTO_APPROVE + LOG
    low: HALT_FOR_REVIEW
```
