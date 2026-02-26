# Hướng dẫn sử dụng: Tab Lương (Payroll) — Phiên bản hoàn chỉnh

> **Cập nhật**: 21/02/2026  
> **Module**: HR → Tab Lương  
> **Đường dẫn**: `/hr` → Tab "Lương"

---

## 1. Giới thiệu

Tab Lương là trung tâm quản lý bảng lương cho toàn bộ nhân viên. Module hỗ trợ:

| Tính năng | Mô tả |
|:---|:---|
| **Kỳ lương** | Tạo, tính, duyệt, trả lương theo từng tháng |
| **Auto-generate** | Tự động tạo kỳ lương tháng tiếp theo (1 click) |
| **Cấu hình lương riêng** | Phụ cấp, BHXH/BHYT/BHTN riêng cho từng NV |
| **Tạm ứng lương** | Quản lý yêu cầu tạm ứng |
| **So sánh kỳ** | Biểu đồ so sánh lương qua các kỳ |
| **Audit log** | Nhật ký thao tác lương |
| **Phiếu lương cá nhân** | NV tự xem phiếu lương của mình |
| **Xóa / Mở lại kỳ** | Xóa kỳ DRAFT hoặc mở lại kỳ đã tính/duyệt |

---

## 2. Hướng dẫn sử dụng

### 2.1. Tạo kỳ lương

**Cách 1: Tạo thủ công**
1. Bấm nút **"+ Tạo"** (gradient hồng-tím) ở góc phải header "Kỳ lương"
2. Điền tên kỳ, ngày bắt đầu, ngày kết thúc
3. Bấm **Tạo** để hoàn tất

**Cách 2: Tự động tạo (Auto-generate)**
1. Bấm nút **🪄 (biểu tượng đũa phép)** bên cạnh nút Tạo
2. Hệ thống tự tạo kỳ lương **tháng tiếp theo** (VD: đang tháng 2 → tạo "Tháng 03/2026")
3. Nếu kỳ đã tồn tại → thông báo "Kỳ lương tháng tiếp đã tồn tại"

### 2.2. Quy trình xử lý kỳ lương

```
DRAFT → Tính lương → CALCULATED → Duyệt → APPROVED → Trả lương → PAID
```

| Bước | Thao tác | Nút |
|:---|:---|:---|
| 1 | Tính lương | 🧮 Tính lương |
| 2 | Duyệt | ✅ Duyệt |
| 3 | Trả lương | 💳 Trả lương |

### 2.3. Cấu hình lương riêng cho nhân viên (GAP-04)

1. Mở **Chỉnh sửa nhân viên** (bấm nút ✏️ trên danh sách NV)
2. Tick **"Nhân viên toàn thời gian"** → phần **"Cài đặt lương & phụ cấp riêng"** sẽ hiện ra
3. Điền các trường:
   - **Phụ cấp ăn / xăng / ĐT / khác** (VND)
   - **Lương đóng BHXH** (VND) — Để trống = dùng lương Gross
   - **% BHXH / % BHYT / % BHTN** — Để trống = dùng cài đặt công ty mặc định
4. Bấm **Lưu thay đổi**

> 💡 **Lưu ý**: Để trống = sử dụng cài đặt mặc định từ **Cài đặt lương** (icon ⚙️)

### 2.4. Phiếu lương cá nhân (Employee Portal)

- Nhân viên đã liên kết tài khoản sẽ thấy phần **"Phiếu lương của tôi"** ở cuối tab Lương
- Bấm vào từng kỳ để xem chi tiết:
  - **Thu nhập**: Lương cơ bản + Tăng ca + Phụ cấp = Tổng thu nhập
  - **Khấu trừ**: BHXH + BHYT + BHTN + Thuế TNCN + Tạm ứng = Tổng khấu trừ
  - **Thực nhận**: Tổng thu nhập − Tổng khấu trừ

### 2.5. Tạm ứng lương

1. Cuộn xuống phần **"Tạm ứng lương"**
2. Bấm **Tạo tạm ứng** → Chọn nhân viên, nhập số tiền, lý do
3. Quản lý duyệt/trả tạm ứng qua nút action

### 2.6. Xóa / Mở lại kỳ lương

- **Xóa**: Chỉ kỳ DRAFT. Bấm 🗑️ → Xác nhận
- **Mở lại**: Kỳ CALCULATED/APPROVED. Bấm ↩️ → Xác nhận
  - ⚠️ Mở lại sẽ **xóa toàn bộ dữ liệu lương đã tính**, cần tính lại

### 2.7. Xuất bảng lương

1. Bấm nút **Xuất** trên toolbar bảng lương chi tiết
2. Chọn định dạng: **Excel** hoặc **PDF**
3. Có thể chọn xuất tất cả hoặc chỉ NV đã chọn (tick checkbox)

---

## 3. FAQ

**Q: Phụ cấp riêng của NV có ưu tiên hơn cài đặt công ty không?**  
A: Có. Nếu NV có phụ cấp riêng → dùng giá trị đó. Nếu để trống → dùng mặc định công ty.

**Q: Tôi muốn tạo kỳ lương cho tháng cụ thể (không phải tháng tiếp)?**  
A: Dùng nút **"+ Tạo"** (tạo thủ công) để chọn tháng bất kỳ.

**Q: NV không thấy phần "Phiếu lương của tôi"?**  
A: NV cần có tài khoản đăng nhập liên kết với hồ sơ nhân viên. Kiểm tra trong phần "Tài khoản đăng nhập" khi sửa NV.

**Q: Mở lại kỳ lương có mất dữ liệu không?**  
A: Có. Khi mở lại, toàn bộ phiếu lương đã tính sẽ bị xóa. Cần chạy "Tính lương" lại.

---

## 4. Các tệp liên quan

| Tệp | Đường dẫn |
|:---|:---|
| PayrollTab | `frontend/src/app/(dashboard)/hr/components/PayrollTab.tsx` |
| MyPayslipsPanel | `frontend/src/app/(dashboard)/hr/components/MyPayslipsPanel.tsx` |
| EmployeeFormModal | `frontend/src/app/(dashboard)/hr/components/EmployeeFormModal.tsx` |
| Backend Router | `backend/modules/hr/infrastructure/http_router.py` |
