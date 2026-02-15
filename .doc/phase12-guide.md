# Hướng Dẫn Sử Dụng: Phase 12 - Order-Kitchen Integration

> **Module:** Order Management + Kitchen Operations
> **Phiên bản:** 1.0
> **Cập nhật:** 27/01/2026
> **Đối tượng:** Nhân viên bếp, Nhân viên kho, Quản lý

---

## 📋 Tổng Quan

Phase 12 kết nối quản lý đơn hàng với vận hành bếp, bao gồm:
1. **Kitchen Prep Sheet** - Bảng chuẩn bị nguyên liệu cho bếp
2. **Inventory Pull Sheet** - Phiếu xuất kho theo FIFO
3. **Low Stock Alerts** - Cảnh báo tồn kho thấp & Tự động đặt hàng

---

## 🍳 1. Kitchen Prep Sheet (Bảng Chuẩn Bị Bếp)

### Mục đích
Tạo danh sách nguyên liệu cần chuẩn bị cho một đơn hàng/tiệc.

### Cách sử dụng
1. Vào **"Đơn hàng"** từ menu bên trái
2. Chọn đơn hàng cần chuẩn bị
3. Click nút **"Prep Sheet"** (biểu tượng 🍳)
4. Modal hiển thị danh sách:
   - Món ăn + số lượng khách
   - Nguyên liệu theo nhóm (Thịt/Cá, Rau củ, Gia vị...)
   - Số lượng cần chuẩn bị

### In/Xuất PDF
- Click nút **"In"** để in trực tiếp
- Click nút **"Xuất PDF"** để lưu file

---

## 📦 2. Inventory Pull Sheet (Phiếu Xuất Kho)

### Mục đích
Hướng dẫn nhân viên kho xuất nguyên liệu đúng lô (FIFO).

### Cách sử dụng
1. Vào **"Đơn hàng"** → Chọn đơn hàng
2. Click nút **"Pull Sheet"** (biểu tượng 📦)
3. Modal hiển thị:
   - Nguyên liệu cần xuất
   - **Mã lô (Lot Number)** - theo thứ tự FIFO
   - Vị trí trong kho
   - Số lượng cần lấy

### Xử lý thiếu hàng
- Items **màu đỏ** = Không đủ tồn kho
- Click **"Đặt thêm"** để tạo Purchase Requisition

### Nguyên tắc FIFO
Hệ thống tự động chọn lô **cũ nhất** trước:
```
Lô A (nhập 01/01) → Chọn đầu tiên
Lô B (nhập 15/01) → Chọn thứ hai
Lô C (nhập 20/01) → Chọn cuối cùng
```

---

## 🔔 3. Low Stock Alerts (Cảnh Báo Tồn Kho)

### Vị trí hiển thị
1. **Dashboard** - Widget "Cảnh Báo Tồn Kho"
2. **Sidebar** - Badge đỏ trên menu "Kho"

### Các mức cảnh báo

| Trạng thái | Màu | Điều kiện |
|:-----------|:----|:----------|
| **Hết hàng** | 🔴 Đỏ | Tồn kho = 0 |
| **Sắp hết** | 🟠 Cam | Tồn kho < Tối thiểu |
| **Tồn thấp** | 🔵 Xanh | Tồn kho ≤ Tối thiểu × 1.2 |

### Xem chi tiết
1. Vào **Dashboard** (Tổng quan)
2. Tìm widget **"Cảnh Báo Tồn Kho"**
3. Click vào số để lọc theo trạng thái

---

## 🛒 4. Tự Động Đặt Hàng (Auto-Reorder)

### Mục đích
Tự động tạo Phiếu Yêu Cầu Mua Hàng (PR) cho items thiếu.

### Cách sử dụng
1. Tại widget **Cảnh Báo Tồn Kho**
2. Click nút **"Tự động đặt hàng"**
3. Hệ thống tạo PR với:
   - Tất cả items thiếu hàng
   - Số lượng = Thiếu × 1.5 (buffer 50%)
   - Status = **PENDING** (chờ duyệt)

### Quy trình duyệt
```
PENDING (Chờ duyệt) → APPROVED (Đã duyệt) → CONVERTED (Chuyển thành PO)
                   ↓
               REJECTED (Từ chối)
```

### Xem PR đã tạo
1. Vào menu **"Mua hàng"**
2. Tìm mã PR bắt đầu bằng `PR-AUTO-`

---

## ⚙️ Cấu Hình Tồn Kho Tối Thiểu

### Bước thực hiện
1. Vào menu **"Kho"**
2. Click vào item cần cấu hình
3. Điền trường **"Tồn tối thiểu"** (Min Stock)
4. Lưu

> **Lưu ý:** Chỉ items có Min Stock > 0 mới hiển thị trong cảnh báo.

---

## ❓ FAQ

### Q: Prep Sheet không hiển thị món ăn?
**A:** Đơn hàng chưa có items. Kiểm tra lại đơn hàng.

### Q: Pull Sheet thiếu nguyên liệu?
**A:** 
- Item chưa có công thức (Recipe)
- Công thức chưa định nghĩa nguyên liệu

### Q: Badge đỏ không hiển thị?
**A:**
- Không có item nào dưới mức tối thiểu
- Chưa cấu hình Min Stock cho sản phẩm nào

### Q: Auto-reorder không hoạt động?
**A:** 
- Cần đăng nhập với quyền phù hợp
- Kiểm tra kết nối mạng
- Xem thông báo lỗi trên widget

---

## 📞 Hỗ Trợ

- **Email:** support@amthucgiaotuyệt.com
- **Hotline:** 0123-456-789

---

*Tài liệu cập nhật: 27/01/2026*
