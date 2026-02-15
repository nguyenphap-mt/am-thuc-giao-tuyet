# Hướng Dẫn Sử Dụng: Cảnh Báo Tồn Kho & Tự Động Đặt Hàng

> **Module:** Inventory - Low Stock Alert
> **Phiên bản:** 1.0
> **Cập nhật:** 27/01/2026
> **Đối tượng:** Nhân viên kho, Quản lý mua hàng

---

## 📋 Tổng Quan

Tính năng **Cảnh Báo Tồn Kho** giúp bạn:
- Theo dõi các sản phẩm có tồn kho thấp
- Nhận thông báo trực quan trên sidebar
- Tự động tạo Phiếu Yêu Cầu Mua Hàng (PR) khi thiếu hàng

---

## 🔔 Notification Badge

### Vị trí
Badge cảnh báo hiển thị **màu đỏ** trên menu **"Kho"** trong sidebar bên trái.

<!-- Screenshot placeholder: Sidebar với badge đỏ trên menu Kho -->
> 📷 *Chụp màn hình: Sidebar hiển thị badge số lượng items thiếu hàng*

### Ý nghĩa Badge
| Màu | Số hiển thị | Ý nghĩa |
|:----|:------------|:--------|
| 🔴 Đỏ | Số | Tổng số items **hết hàng** + **dưới mức tối thiểu** |

---

## 📊 Dashboard Widget

### Truy cập
1. Đăng nhập vào hệ thống
2. Vào trang **Dashboard** (Tổng quan)
3. Tìm widget **"Cảnh Báo Tồn Kho"**

<!-- Screenshot placeholder: Widget Cảnh Báo Tồn Kho -->
> 📷 *Chụp màn hình: Widget Cảnh Báo Tồn Kho trên Dashboard*

### Các mức cảnh báo

| Trạng thái | Màu | Điều kiện |
|:-----------|:----|:----------|
| **Hết hàng (CRITICAL)** | 🔴 Đỏ | Tồn kho = 0 |
| **Dưới tối thiểu (WARNING)** | 🟠 Cam | Tồn kho < Mức tối thiểu |
| **Sắp hết (LOW)** | 🔵 Xanh | Tồn kho ≤ Mức tối thiểu × 1.2 |

### Thao tác trên Widget
1. **Click vào thẻ màu** → Lọc theo trạng thái tương ứng
2. **Click "Xem thêm"** → Đi đến trang Kho với filter low-stock
3. **Click "Tự động đặt hàng"** → Tạo PR cho tất cả items thiếu

---

## 🛒 Tự Động Đặt Hàng (Auto-Reorder)

### Cách sử dụng
1. Trên widget **Cảnh Báo Tồn Kho**, click nút **"Tự động đặt hàng"**
2. Hệ thống sẽ:
   - Tính toán số lượng cần đặt = Thiếu × 1.5
   - Tạo **Phiếu Yêu Cầu Mua Hàng (PR)** tự động
   - Hiển thị thông báo thành công

<!-- Screenshot placeholder: Nút auto-reorder và kết quả -->
> 📷 *Chụp màn hình: Kết quả sau khi click Tự động đặt hàng*

### Kết quả
Sau khi tạo thành công, bạn sẽ thấy:
```
✅ PR-AUTO-20260127112345
Đã tạo Purchase Requisition với 5 items
```

### Xem PR đã tạo
1. Vào menu **"Mua hàng"** (Procurement)
2. Tìm mã PR bắt đầu bằng `PR-AUTO-`
3. Duyệt và chuyển thành Đơn đặt hàng (PO) nếu cần

---

## ⚙️ Cấu Hình Mức Tối Thiểu

### Cách thiết lập cho từng sản phẩm
1. Vào menu **"Kho"**
2. Click vào sản phẩm cần cấu hình
3. Điền trường **"Tồn kho tối thiểu"** (Min Stock)
4. Lưu thay đổi

> **Lưu ý:** Chỉ có sản phẩm đã cấu hình Min Stock mới hiển thị trong cảnh báo.

---

## ❓ FAQ - Câu Hỏi Thường Gặp

### Q: Badge đỏ không hiển thị?
**A:** Có thể:
- Không có sản phẩm nào dưới mức tối thiểu
- Chưa cấu hình Min Stock cho sản phẩm nào
- Chờ 5 phút để hệ thống refresh

### Q: Tự động đặt hàng không hoạt động?
**A:** Kiểm tra:
- Module Procurement đã được cài đặt
- Bạn có quyền tạo PR
- Kết nối server ổn định

### Q: Làm sao để tắt cảnh báo?
**A:** Cảnh báo tự động mất khi:
- Nhập thêm hàng vào kho
- Tăng tồn kho vượt mức tối thiểu

### Q: Tại sao số lượng đề xuất đặt = Thiếu × 1.5?
**A:** Hệ thống mặc định đặt thêm 50% để tránh hết hàng thường xuyên. Bạn có thể điều chỉnh số lượng thực tế trên PR.

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- **Email:** support@amthucgiaotuyệt.com
- **Hotline:** 0123-456-789

---

*Tài liệu được tạo tự động bởi AI Workforce System*
