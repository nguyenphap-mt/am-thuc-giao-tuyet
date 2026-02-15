# i18n Key Auto-Extraction

> **Purpose**: Automatically extract and generate translation keys from React components.
> **Trigger**: After `frontend_complete` checkpoint

---

## Extraction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ React Components → t() Scanner → New Keys → JSON Merge         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source Files

| Location | Pattern |
| :--- | :--- |
| `frontend/src/app/(dashboard)/{module}/**/*.tsx` | Page components |
| `frontend/src/components/{module}/**/*.tsx` | Module components |

---

## Target Files

| Language | Location |
| :--- | :--- |
| Vietnamese | `frontend/src/locales/vi/{module}.json` |
| English | `frontend/src/locales/en/{module}.json` |

---

## Extraction Rules

### 1. Patterns to Detect
```typescript
// Direct t() calls
t('module.feature.title')
t('module.feature.description')

// t() with variables
t('module.item.count', { count: items.length })

// useTranslation hook
const { t } = useTranslation('module');
t('feature.title')  // → module.feature.title

// Trans component
<Trans i18nKey="module.feature.welcome">
  Welcome to <strong>{{name}}</strong>
</Trans>
```

### 2. Key Naming Convention
```yaml
pattern: "{module}.{feature}.{element}"

examples:
  - inventory.item.title
  - inventory.item.create
  - inventory.item.form.sku
  - inventory.item.form.name
  - inventory.item.validation.required
  - inventory.item.message.created
  - inventory.item.message.deleted
```

### 3. Element Suffixes
| Suffix | Usage |
| :--- | :--- |
| `.title` | Page/Section titles |
| `.description` | Descriptions |
| `.create` | Create button |
| `.edit` | Edit button |
| `.delete` | Delete button |
| `.save` | Save button |
| `.cancel` | Cancel button |
| `.form.{field}` | Form labels |
| `.placeholder.{field}` | Placeholders |
| `.validation.{rule}` | Validation errors |
| `.message.{action}` | Toast messages |
| `.columns.{name}` | Table columns |

---

## Generation Template

### Vietnamese (vi.json)
```json
{
  "module_name": {
    "title": "Tiêu đề Module",
    "feature": {
      "title": "Tên tính năng",
      "create": "Tạo mới",
      "edit": "Chỉnh sửa",
      "delete": "Xóa",
      "form": {
        "field_name": "Tên trường"
      },
      "message": {
        "created": "Đã tạo thành công",
        "updated": "Đã cập nhật thành công",
        "deleted": "Đã xóa thành công"
      }
    }
  }
}
```

### English (en.json)
```json
{
  "module_name": {
    "title": "Module Title",
    "feature": {
      "title": "Feature Name",
      "create": "Create New",
      "edit": "Edit",
      "delete": "Delete",
      "form": {
        "field_name": "Field Name"
      },
      "message": {
        "created": "Created successfully",
        "updated": "Updated successfully",
        "deleted": "Deleted successfully"
      }
    }
  }
}
```

---

## Integration with Workflow

### Step 4.5: i18n Key Extraction (NEW)
```yaml
after: frontend_typescript_ready
before: browser_test

actions:
  1_scan_tsx_files:
    path: frontend/src/app/(dashboard)/{module}/**/*.tsx
    pattern: "t\\(['\"]([^'\"]+)['\"]"
    
  2_collect_new_keys:
    compare_with:
      - frontend/src/locales/vi/{module}.json
      - frontend/src/locales/en/{module}.json
    output: new_keys[]
    
  3_generate_vi_translations:
    for_each: new_keys
    action: translate_to_vietnamese
    # Use key naming to infer meaning
    
  4_merge_json:
    - merge_into: frontend/src/locales/vi/{module}.json
    - merge_into: frontend/src/locales/en/{module}.json
    strategy: preserve_existing
    
  5_validate:
    - check: all_keys_have_translations
    - check: no_duplicate_keys
    - check: valid_json_format
```

---

## Auto-Translation Hints

### Vietnamese Patterns
| Key Pattern | Vietnamese Template |
| :--- | :--- |
| `*.title` | `{Feature} Management` → `Quản lý {Feature}` |
| `*.create` | `Create` → `Tạo mới` |
| `*.edit` | `Edit` → `Chỉnh sửa` |
| `*.delete` | `Delete` → `Xóa` |
| `*.save` | `Save` → `Lưu` |
| `*.cancel` | `Cancel` → `Hủy` |
| `*.search` | `Search` → `Tìm kiếm` |
| `*.filter` | `Filter` → `Lọc` |
| `*.export` | `Export` → `Xuất` |
| `*.import` | `Import` → `Nhập` |
| `*.message.created` | → `Đã tạo thành công` |
| `*.message.updated` | → `Đã cập nhật thành công` |
| `*.message.deleted` | → `Đã xóa thành công` |
| `*.validation.required` | → `Trường này là bắt buộc` |

### Domain-Specific Terms
| English | Vietnamese |
| :--- | :--- |
| Item | Vật tư |
| Warehouse | Kho |
| Stock | Tồn kho |
| Invoice | Hóa đơn |
| Quote | Báo giá |
| Project | Dự án |
| Work Order | Lệnh sản xuất |
| Employee | Nhân viên |
| Payroll | Bảng lương |
| Account | Tài khoản |

---

## Usage Example

### Input (React Component)
```tsx
// frontend/src/app/(dashboard)/inventory/items/page.tsx

export default function ItemsPage() {
  const { t } = useTranslation('inventory');
  
  return (
    <PageContainer>
      <h1>{t('item.title')}</h1>
      <Button>{t('item.create')}</Button>
      
      <DataTable
        columns={[
          { header: t('item.columns.sku'), field: 'sku' },
          { header: t('item.columns.name'), field: 'name' },
          { header: t('item.columns.price'), field: 'price' },
        ]}
      />
    </PageContainer>
  );
}
```

### Output (Generated JSON)
```json
// frontend/src/locales/vi/inventory.json
{
  "item": {
    "title": "Quản lý Vật tư",
    "create": "Tạo vật tư mới",
    "columns": {
      "sku": "Mã SKU",
      "name": "Tên vật tư",
      "price": "Đơn giá"
    }
  }
}
```

```json
// frontend/src/locales/en/inventory.json
{
  "item": {
    "title": "Item Management",
    "create": "Create New Item",
    "columns": {
      "sku": "SKU",
      "name": "Name",
      "price": "Price"
    }
  }
}
```

---

## Conflict Resolution

| Scenario | Resolution |
| :--- | :--- |
| Key already exists | Keep existing translation |
| Nested key conflict | Merge recursively |
| Invalid key format | Log warning, skip |
| Missing namespace | Create new file |
