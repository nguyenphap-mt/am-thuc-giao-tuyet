# Hướng Dẫn: Tích Hợp Lương HR ↔ Tài Chính

> **Ngày cập nhật:** 21/02/2026  
> **Module:** HR Payroll + Finance  
> **Đối tượng:** Kế toán, Quản lý nhân sự

---

## 1. Giới Thiệu

Hệ thống tự động tạo bút toán kế toán kép khi thanh toán lương, đảm bảo dữ liệu lương luôn đồng bộ giữa module HR và Tài Chính.

### Luồng tổng quan

```
Chấm công → Tạo kỳ lương → Tính lương → Duyệt lương → Thanh toán (→ Finance)
                                                             ↓
                                                   Giao dịch tài chính
                                                   + Bút toán kế toán
                                                   (Nợ 642 / Có 112)
```

---

## 2. Hướng Dẫn Sử Dụng

### 2.1 Thanh Toán Lương (Tạo giao dịch tài chính)

1. Vào **HR → Tab Lương**
2. Chọn kỳ lương đã được **Duyệt** (APPROVED)
3. Bấm nút **"Thanh toán lương"**
4. Hệ thống tự động:
   - Tạo giao dịch tài chính (category: SALARY)
   - Tạo bút toán kế toán kép:
     - **Nợ TK 642** — Chi phí tiền lương
     - **Có TK 112** — Tiền gửi ngân hàng
   - Liên kết giao dịch ngược về kỳ lương
   - Cập nhật trạng thái kỳ lương → **PAID**

### 2.2 Cấu Hình Tỷ Lệ Chi Phí Lao Động

1. Vào **HR → Tab Cấu Hình Lương**
2. Tìm mục **"Tỷ lệ chi phí lao động mặc định"** (`default_labor_cost_ratio`)
3. Giá trị mặc định: **0.15** (15% doanh thu)
4. Sử dụng khi: Đơn hàng không có dữ liệu chấm công → hệ thống dùng tỷ lệ này để ước tính chi phí lao động trong báo cáo Lãi/Lỗ

### 2.3 Xem Báo Cáo Lãi/Lỗ Đơn Hàng

1. Vào **Tài Chính → P&L theo đơn hàng**
2. Mỗi đơn hàng hiển thị:
   - **Doanh thu** (từ hợp đồng)
   - **Giá vốn** (từ mua hàng)
   - **Chi phí lao động** (từ chấm công hoặc tỷ lệ mặc định)
   - **Chi phí chung**
   - **Lãi/Lỗ ròng**

---

## 3. FAQ

### Q: Endpoint `POST /auto-entries/from-timesheets` còn hoạt động không?
**A:** Endpoint này đã được đánh dấu **DEPRECATED** (ngừng sử dụng). Hãy sử dụng `POST /auto-entries/from-payroll/{period_id}` thay thế. Endpoint cũ tạo giao dịch per-timesheet có thể dẫn đến ghi nhận trùng chi phí.

### Q: Kỳ lương PAID có thể xem giao dịch tài chính tương ứng không?
**A:** Có. Sau khi thanh toán, kỳ lương lưu `payment_transaction_id` — mã giao dịch tài chính đã tạo.

### Q: Nếu chưa có dữ liệu chấm công cho đơn hàng, chi phí lao động tính thế nào?
**A:** Hệ thống sử dụng hệ thống ưu tiên 4 cấp:
1. Timesheet × hourly_rate (nếu có)
2. Staff Assignment → Timesheet (fallback)
3. Assignment hours × rate
4. **Tỷ lệ mặc định** (cấu hình trong Payroll Settings, mặc định 15%)

### Q: Bút toán kế toán tạo tự động có thể chỉnh sửa không?
**A:** Bút toán tạo tự động có reference_type = "PAYROLL". Có thể xem trong module Tài Chính → Sổ nhật ký. Không nên chỉnh sửa trực tiếp — nếu cần điều chỉnh, hãy tạo bút toán điều chỉnh mới.
