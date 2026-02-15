---
description: Tự động tạo tài liệu hướng dẫn với screenshots sau khi test/verify
---

# Auto-Documentation Workflow

// turbo-all

## Mục đích
Workflow này tự động tạo tài liệu hướng dẫn người dùng (Vietnamese) kèm screenshots sau khi Browser Test PASS.

---

## Khi nào kích hoạt
- Sau Step 5 (Permission Matrix Check) PASS
- Trước Step 6 (Final Delivery)
- Khi User yêu cầu "viết tài liệu", "tạo guide", "document"

---

## Pre-requisites
✅ Browser Test đã PASS (có screenshots trong artifacts)
✅ Feature/module đang chạy trên localhost

---

## Steps

### Step 1: Xác định thông tin module
Thu thập thông tin cần thiết:
```
- Module Name: {tên module, ví dụ: "Quote", "Inventory"}
- Module Path: {URL path, ví dụ: "/quote", "/inventory"}
- Main Features: {danh sách chức năng chính}
- Target Users: {ai sử dụng module này}
```

---

### Step 2: Capture Screenshots (// turbo)
Nếu chưa có screenshots, chụp màn hình:

1. **Màn hình chính của module**
2. **Các form/dialog quan trọng**
3. **Kết quả sau khi thực hiện action**

Lưu screenshots vào: `.doc/screenshots/{module-name}/`

```powershell
# Tạo folder screenshots nếu chưa có
New-Item -ItemType Directory -Path ".doc\screenshots\{module-name}" -Force
```

---

### Step 3: Tạo file tài liệu (// turbo)
Copy template và điền thông tin:

```powershell
# Copy template
Copy-Item ".agent\templates\user_guide_template.md" ".doc\{module-name}-guide.md"
```

---

### Step 4: Điền nội dung
Thay thế các placeholders trong template:

| Placeholder | Thay bằng |
| :--- | :--- |
| `{MODULE_NAME}` | Tên module (Vietnamese) |
| `{DATE}` | Ngày hiện tại (dd/MM/yyyy) |
| `{Menu Item}` | Tên menu trong sidebar |
| `{Chức năng X}` | Tên các chức năng |
| `{Mô tả bước X}` | Hướng dẫn chi tiết |
| Screenshots paths | Đường dẫn tương đối đến hình |

---

### Step 5: Embed Screenshots
Thêm screenshots vào tài liệu:

```markdown
![Màn hình chính](./screenshots/{module-name}/main.png)
![Form tạo mới](./screenshots/{module-name}/create-form.png)
```

**Yêu cầu tối thiểu**: 2 screenshots

---

### Step 6: Verify Documentation (// turbo)
Kiểm tra tài liệu đã hoàn chỉnh:

| Check | Required |
| :--- | :---: |
| File tồn tại trong `.doc/` | ✅ |
| Viết bằng tiếng Việt | ✅ |
| Có ít nhất 2 screenshots | ✅ |
| Có hướng dẫn từng bước | ✅ |
| Có phần FAQ | ✅ |

---

### Step 7: Report Completion
Thông báo hoàn thành:
```
✅ Tài liệu đã được tạo: .doc/{module-name}-guide.md
📷 Screenshots: .doc/screenshots/{module-name}/
```

---

## Output Files

| Type | Path |
| :--- | :--- |
| User Guide | `.doc/{module-name}-guide.md` |
| Screenshots | `.doc/screenshots/{module-name}/*.png` |

---

## Template Reference
📄 `.agent/templates/user_guide_template.md`

---

## Example Output
```
.doc/
├── quote-guide.md          # Hướng dẫn module Quote
├── inventory-guide.md      # Hướng dẫn module Inventory
└── screenshots/
    ├── quote/
    │   ├── main.png
    │   └── create-form.png
    └── inventory/
        ├── main.png
        └── item-detail.png
```
