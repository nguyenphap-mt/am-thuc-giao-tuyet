# ⚡ QUICKSTART - AI Workflow (5 phút)

> **Mục tiêu**: Bắt đầu sử dụng AI Workflow trong 5 phút
> **Đối tượng**: Developer mới bắt đầu

---

## 🎯 TL;DR (30 giây)

```bash
# 1. Tạo tính năng mới
/create-feature Quản lý Đơn hàng trong module Sales

# 2. Xem trạng thái
/status

# 3. Nếu lỗi
/retry 3

# Done! ✅
```

---

## 📖 HƯỚNG DẪN CHI TIẾT (5 phút)

### Bước 1: Hiểu Cấu Trúc (1 phút)

```
.agent/
├── prompts/           # Não bộ của AI
│   ├── orchestrator.md    # Điều phối viên
│   └── specialists/       # Chuyên gia (DB, BE, FE...)
├── workflows/         # Quy trình tự động
│   └── create-feature.md  # Workflow chính
├── templates/         # Code templates
└── ROADMAP.md         # Kế hoạch phát triển
```

### Bước 2: Chọn Command (30 giây)

| Muốn làm gì? | Command |
| :--- | :--- |
| Tạo tính năng mới | `/create-feature [tên]` |
| Tạo module mới | `/create-module [tên]` |
| **Tạo Domain Agent** | `/create-domain-agent [module]` |
| Sửa bug | `/fix-bug [mô tả]` |
| Refactor | `/refactor [scope]` |

### Bước 3: Chạy Command (30 giây)

```
/create-feature Quản lý Nhân viên trong module HR
```

AI sẽ tự động:
1. ✅ Kiểm tra Roadmap
2. ✅ Phân tích yêu cầu
3. ✅ Tạo Database tables
4. ✅ Tạo Backend API (Go)
5. ✅ Tạo Frontend UI (React)
6. ✅ Test trên browser
7. ✅ Tạo documentation

### Bước 4: Theo Dõi (1 phút)

```
/status
```

Output:
```
✅ [1] Analysis complete
✅ [2] Database complete
🔄 [3] Backend in progress...
⬜ [4] Frontend pending
⬜ [5] Testing pending
```

### Bước 5: Xử Lý Lỗi (30 giây)

```
# Thử lại step hiện tại
/retry 3

# Quay lại step trước
/rollback 2

# Tiếp tục từ checkpoint
/resume

# Hủy và bắt đầu lại
/abort
```

---

## 🔥 TIPS PRO

### Tip 1: Mô Tả Rõ Ràng
```
❌ Sai: /create-feature Quản lý đơn hàng

✅ Đúng: /create-feature Quản lý Đơn đặt hàng (Purchase Order) 
         trong module Inventory với CRUD, phê duyệt workflow, 
         và export PDF
```

### Tip 2: Kiểm Tra Roadmap Trước
```
1. Mở .agent/ROADMAP.md
2. Xác định Sprint hiện tại
3. Kiểm tra tính năng đã có trong Sprint chưa
```

### Tip 3: Sử Dụng Recovery
```
# Context bị đầy? 
/summarize

# Agent bị treo?
/status → /resume → /abort nếu cần

# Muốn thay đổi?
"Dừng lại. Tôi muốn thay đổi: [mô tả]"
```

### Tip 4: Tạo Domain Agent (Module Mới)
```bash
# Nếu cần làm module hoàn toàn mới chưa có trong hệ thống:
/create-domain-agent PurchaseOrder

# AI sẽ hỏi bạn:
# - Tên tiếng Việt của module?
# - Thuộc về module nào? (Inventory/Sales/...)
# - Các entity và fields?
# - Các màn hình cần có?
# - Quyền truy cập?

# Sau đó tự động tạo:
# ✅ prompts/modules/purchase_order.md (Backend)
# ✅ prompts/modules/purchase_order-ui.md (Frontend)
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

| ⚠️ Lưu ý | Giải pháp |
| :--- | :--- |
| Dev server chưa chạy | AI sẽ tự start nếu cần |
| PostgreSQL chưa chạy | Phải start thủ công |
| Tính năng không có trong Roadmap | AI sẽ hỏi có thêm không |
| Context quá dài | Dùng `/summarize` hoặc start conversation mới |

---

## 📚 ĐỌC THÊM

| Tài liệu | Mô tả |
| :--- | :--- |
| `GUIDE_AI_WORKFLOW.md` | Hướng dẫn đầy đủ |
| `ROADMAP.md` | Kế hoạch phát triển |
| `prompts/orchestrator.md` | 7-Step Process chi tiết |
| `workflows/create-feature.md` | Workflow chi tiết |

---

## 🆘 CẦN GIÚP ĐỠ?

```
# Xem tất cả commands
/help

# Xem hướng dẫn cụ thể
/help create-feature
/help recovery
/help testing

# Interactive tutorial
/tutorial
```

---

**🎉 Bạn đã sẵn sàng! Bắt đầu với `/create-feature [tên tính năng]`**
