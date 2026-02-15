# Hướng Dẫn Sử Dụng Module CRM: Trung Tâm Giữ Chân (Retention Center)

Tài liệu này hướng dẫn cách sử dụng các tính năng mới trong module CRM để quản lý và giữ chân khách hàng (Phase 3 & Phase 4).

## 1. Phân Loại Khách Hàng Tự Động (Customer Classification)
Hệ thống hiện tại tự động phân loại khách hàng dựa trên dữ liệu mua hàng và tương tác:

| Loại | Ký hiệu | Tiêu chí |
| :--- | :--- | :--- |
| **VIP** | ⭐ VIP | Tổng chi tiêu > 100M VND HOẶC > 5 đơn hàng. |
| **Thân thiết** | 🥈 Thân thiết | > 2 đơn hàng VÀ đơn cuối < 6 tháng. |
| **Tiềm năng** | 🌱 Tiềm năng | Chưa có đơn hàng (chỉ mới có Báo giá/Quote). |
| **Nguy cơ rời bỏ** | 💤 Nguy cơ | > 1 đơn hàng NHƯNG đơn cuối > 1 năm. |
| **Đã mất** | 👻 Đã mất | 0 đơn hàng VÀ > 3 báo giá bị từ chối. |
| **Doanh nghiệp** | 🏢 Doanh nghiệp | Khách hàng tổ chức (được gán thủ công). |

**Trên giao diện:**
- Các huy hiệu (badge) phân loại sẽ hiển thị ngay bên cạnh tên và số điện thoại khách hàng trong danh sách.
- Bạn có thể lọc danh sách theo từng loại này bằng menu thả xuống ở thanh công cụ.

## 2. Trung Tâm Giữ Chân (Retention Dashboard)
Đây là khu vực chuyên biệt để xử lý các khách hàng có dấu hiệu rời bỏ.

### Truy cập
1. Vào module **CRM**.
2. Nhấn nút **"Trung Tâm Giữ Chân"** (Màu hồng) trên thanh công cụ (cạnh bộ lọc).

### Giao diện Dashboard
- **Thẻ thống kê**:
  - ⚠️ **Nguy Cơ Rời Bỏ**: Số lượng khách hàng lâu không mua lại.
  - 💔 **Khách Hàng Đã Mất**: Số lượng khách tiềm năng thất bại.
  - 💰 **Tổng Cần Xử Lý**: Tổng số lượng khách cần chăm sóc.

- **Danh sách khách hàng**:
  - Chọn tab **Nguy Cơ** hoặc **Đã Mất** để xem danh sách chi tiết.
  - Bảng hiển thị thông tin: Tên, SĐT, Ngày đơn cuối, Tổng chi tiêu.

## 3. Gửi Ưu Đãi (Win-Back Campaign)
Tính năng cho phép gửi tin nhắn/email chăm sóc tự động hoặc bán tự động.

**Cách thực hiện:**
1. Tại **Retention Dashboard**, tìm khách hàng cần chăm sóc.
2. Nhấn nút **"🎁 Gửi Ưu Đãi"** ở cột cuối cùng.
3. Trong cửa sổ hiện ra:
   - **Gửi tới**: Xác nhận số lượng khách hàng nhận tin.
   - **Chọn Mẫu (Template)**:
     - *We Miss You (-10%)*: Voucher giảm giá để kéo khách quay lại.
     - *Mời quay lại (Free Dessert)*: Tặng món tráng miệng.
     - *Giảm giá đặc biệt*: Mã giảm giá tùy chỉnh.
   - **Kênh Gửi**: Chọn Zalo hoặc Email.
   - **Xem trước**: Kiểm tra nội dung tin nhắn.
4. Nhấn **"Gửi Ngay"** để thực hiện.

> **Lưu ý**: Trong giai đoạn này, hệ thống sẽ ghi nhận lịch sử tương tác. Việc gửi tin nhắn thực tế qua Zalo OA/Email Server sẽ cần tích hợp thêm API của nhà cung cấp.

## 4. Kiểm Tra Kỹ Thuật (Dành cho Dev/Admin)
Nếu các tính năng trên không hiển thị sau khi cập nhật:
- **Xóa Cache trình duyệt**: Nhấn Ctrl+F5 để tải lại trang.
- **Khởi động lại Server**: Backend và Frontend cần được cập nhật bản mới nhất.
- **Kiểm tra URL**: Truy cập trực tiếp `http://localhost:4500/crm/retention` để vào dashboard.

---
*Tài liệu được cập nhật ngày 17/01/2026 bởi Đội ngũ Phát triển.*
