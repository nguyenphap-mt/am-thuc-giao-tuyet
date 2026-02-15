# Domain Agent Generator

> **Purpose**: Auto-generate domain module agents from user input
> **Trigger**: `/create-domain-agent [module_name]`

---

## 1. Overview

Thay vì tự viết 2 files `{module}.md` và `{module}-ui.md`, command này sẽ:
1. Hỏi các câu hỏi về module
2. Tự động generate cả 2 files
3. Đảm bảo tuân theo chuẩn

---

## 2. Interactive Wizard

### 2.1 Wizard Flow
```
/create-domain-agent PurchaseOrder

Step 1/5: Basic Info
───────────────────────────────
Module Name: Purchase Order
Tiếng Việt: Đơn mua hàng
Thuộc về: [1] Inventory [2] Sales [3] Finance [4] Other
> 1

Step 2/5: Entities
───────────────────────────────
Các entity trong module (comma separated):
> PurchaseOrder, PurchaseOrderItem, Supplier

Các quan hệ:
- PurchaseOrder has many PurchaseOrderItem
- PurchaseOrder belongs to Supplier
Đúng không? [Y/n] > Y

Step 3/5: Fields (PurchaseOrder)
───────────────────────────────
| Field | Type | Required |
| po_number | string | yes |
| supplier_id | uuid | yes |
| order_date | date | yes |
| total_amount | decimal | yes |
| status | enum | yes |

Thêm field khác? [y/N] > n

Step 4/5: Screens
───────────────────────────────
Các màn hình cần có:
[x] List (Grid)
[x] Create Form
[x] Edit Form
[x] Detail View
[ ] Dashboard Widget
[ ] Report

Step 5/5: Permissions
───────────────────────────────
Các role có quyền truy cập:
[x] Admin (full access)
[x] Manager (CRUD)
[x] Staff (Read + Create)
[ ] Viewer (Read only)

Generating...
✅ Created: prompts/modules/purchase_order.md
✅ Created: prompts/modules/purchase_order-ui.md
```

---

## 3. Generated Backend Agent Template

### 3.1 Template Structure
```markdown
# {ModuleName} Module - Backend Specification

**Context**: {Description}
**Parent Module**: {ParentModule}
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## 1. Domain Model

### 1.1 Entities
{foreach entity}
#### {EntityName}
| Field | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
{foreach field}
| {field.name} | {field.type} | {field.constraints} | {field.description} |
{/foreach}
{/foreach}

### 1.2 Relationships
```mermaid
erDiagram
{relationships}
```

---

## 2. Business Rules

### 2.1 Validation Rules
{validation_rules}

### 2.2 State Machine
{if has_status}
```mermaid
stateDiagram-v2
{state_diagram}
```
{/if}

---

## 3. API Endpoints

| Method | Endpoint | Description | Permission |
| :--- | :--- | :--- | :--- |
| GET | /api/v1/{resource} | List all | {module}.read |
| GET | /api/v1/{resource}/:id | Get by ID | {module}.read |
| POST | /api/v1/{resource} | Create | {module}.create |
| PUT | /api/v1/{resource}/:id | Update | {module}.update |
| DELETE | /api/v1/{resource}/:id | Delete | {module}.delete |

---

## 4. Database Schema

```sql
CREATE TABLE {table_name} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
{foreach field}
    {field.column_name} {field.sql_type} {field.constraints},
{/foreach}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON {table_name}
    USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

---

## 5. Permission Matrix

| Action | Admin | Manager | Staff | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| List | ✅ | ✅ | ✅ | ✅ |
| View | ✅ | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ✅ | ❌ |
| Update | ✅ | ✅ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
```

---

## 4. Generated UI Agent Template

### 4.1 Template Structure
```markdown
# {ModuleName} Module - UI/Frontend Specification

**Context**: Frontend for {Description}
**Language**: **Vietnamese (Tiếng Việt)** for explanations.

---

## 1. Screen List

| # | Screen Name | Route | Purpose |
| :--- | :--- | :--- | :--- |
{foreach screen}
| {index} | {screen.name} | {screen.route} | {screen.purpose} |
{/foreach}

---

## 2. Translation Keys

```json
{
  "{module}": {
    "title": "{ModuleNameVN}",
    "create": "Tạo mới",
    "edit": "Chỉnh sửa",
    "delete": "Xóa",
{foreach field}
    "{field.name}": "{field.labelVN}",
{/foreach}
    "message": {
      "created": "Đã tạo thành công",
      "updated": "Đã cập nhật thành công",
      "deleted": "Đã xóa thành công"
    }
  }
}
```

---

## 3. List Screen

### 3.1 Grid Columns
```typescript
const columnDefs: ColDef[] = [
{foreach field}
  { field: '{field.name}', headerName: t('{module}.{field.name}'), {field.gridOptions} },
{/foreach}
  { field: 'actions', cellRenderer: ActionsCellRenderer, pinned: 'right', width: 100 },
];
```

### 3.2 Wireframe
```
┌─────────────────────────────────────────────────────────────────┐
│  {ModuleNameVN}                          [+ Tạo mới] [Xuất Excel]│
├─────────────────────────────────────────────────────────────────┤
│  [🔍 Tìm kiếm...              ] [Lọc ▼]                         │
├───────────────────────────────────────────────────────────────┤
│  {Column Headers}                                               │
│  {Data Rows}                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Form Screen

### 4.1 Form Fields
{foreach field}
```tsx
<FormField
  label={t('{module}.{field.name}')}
  name="{field.name}"
  type="{field.inputType}"
  required={field.required}
  {field.extraProps}
/>
```
{/foreach}

---

## 5. Linear Design Compliance

> **Reference**: See `.agent/prompts/linear-design-system.md` for details.

### Must-Have Features
| Feature | Status | Notes |
| :--- | :--- | :--- |
| Dark Mode | ⬜ Required | Default theme |
| Keyboard Navigation | ⬜ Required | Full support |
| Loading States | ⬜ Required | Skeleton loaders |
| i18n | ⬜ Required | VN + EN |
```

---

## 5. Generator Script

### 5.1 Usage
```bash
# Interactive mode
/create-domain-agent

# With name
/create-domain-agent PurchaseOrder

# From JSON definition
/create-domain-agent --from module-definition.json
```

### 5.2 JSON Definition Format
```json
{
  "name": "PurchaseOrder",
  "nameVN": "Đơn mua hàng",
  "parent": "inventory",
  "entities": [
    {
      "name": "PurchaseOrder",
      "table": "purchase_orders",
      "fields": [
        { "name": "po_number", "type": "string", "required": true, "unique": true },
        { "name": "supplier_id", "type": "uuid", "ref": "suppliers" },
        { "name": "order_date", "type": "date", "required": true },
        { "name": "status", "type": "enum", "values": ["draft", "pending", "approved", "received"] }
      ]
    }
  ],
  "screens": ["list", "create", "edit", "detail"],
  "permissions": {
    "admin": ["*"],
    "manager": ["read", "create", "update"],
    "staff": ["read", "create"]
  }
}
```

---

## 6. Integration

### 6.1 After Generation
```yaml
post_generation:
  1_validate:
    - Check generated files exist
    - Validate markdown syntax
    
  2_register:
    - Add to prompts/specialists/index.md
    - Update router.md if cross-module
    
  3_notify:
    - Show generated files to user
    - Ask for review before proceeding
```

### 6.2 Usage in Workflow
```yaml
# In create-module.md
step_1_generate_agents:
  command: /create-domain-agent {module_name}
  output:
    - prompts/modules/{module}.md
    - prompts/modules/{module}-ui.md
    
step_2_proceed:
  - Load generated agents
  - Continue with database step
```
