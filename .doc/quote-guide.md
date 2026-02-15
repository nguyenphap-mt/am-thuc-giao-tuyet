# Hướng Dẫn Sử Dụng Module Báo Giá

## Phiên bản: 1.0
## Ngày cập nhật: 26/01/2026

---

## 1. Giới Thiệu

Module **Báo Giá** (Quote) giúp bạn tạo và quản lý các báo giá cho dịch vụ tiệc. Bao gồm các chức năng:

- ✅ Tạo báo giá mới với wizard 5 bước
- ✅ Xem danh sách báo giá
- ✅ Lọc theo trạng thái, ngày tháng
- ✅ Xuất PDF báo giá
- ✅ Chuyển đổi báo giá thành đơn hàng

---

## 2. Truy Cập Module

1. Đăng nhập vào hệ thống
2. Nhấn vào menu **"Báo Giá"** ở thanh bên trái
3. Hoặc truy cập trực tiếp: `http://localhost:4500/quote`

---

## 3. Danh Sách Báo Giá

### 3.1 Màn hình chính

Màn hình danh sách hiển thị tất cả báo giá với thông tin:
- **Mã báo giá**: QT-XXXXXX
- **Khách hàng**: Tên khách hàng
- **Ngày tiệc**: Ngày tổ chức sự kiện
- **Số bàn**: Số lượng bàn đặt
- **Tổng tiền**: Giá trị báo giá
- **Trạng thái**: Nháp / Chờ duyệt / Đã duyệt / Đã từ chối

### 3.2 Bộ lọc

Sử dụng các bộ lọc để tìm kiếm nhanh:
- **Trạng thái**: Chọn 1 hoặc nhiều trạng thái
- **Từ ngày - Đến ngày**: Lọc theo khoảng thời gian
- **Tìm kiếm**: Nhập tên khách hàng hoặc mã báo giá

### 3.3 Empty State

Khi không có dữ liệu, hệ thống hiển thị thông báo:
- "Chưa có báo giá nào" - nếu danh sách trống
- "Xóa bộ lọc" - nếu bộ lọc không có kết quả

---

## 4. Tạo Báo Giá Mới

Quy trình tạo báo giá gồm **5 bước**:

### Bước 1: Thông Tin Khách Hàng

| Trường | Bắt buộc | Mô tả |
|:-------|:--------:|:------|
| Khách hàng | ✅ | Tên khách hàng hoặc công ty |
| Loại tiệc | ✅ | Đám cưới, Sinh nhật, Tiệc công ty... |
| Ngày tiệc | ✅ | Ngày tổ chức sự kiện |
| Giờ bắt đầu | ✅ | Thời gian bắt đầu tiệc |
| Số khách | | Số lượng khách dự kiến |
| Số bàn | ✅ | Số bàn cần đặt (tự động tính nếu nhập số khách) |
| Địa điểm | ✅ | Địa chỉ tổ chức |
| Ghi chú | | Yêu cầu đặc biệt (nội bộ) |

**Nhấn "Tiếp tục"** để sang bước 2.

### Bước 2: Chọn Món Ăn

1. **Tìm kiếm món**: Nhập tên món trong ô tìm kiếm
2. **Chọn danh mục**: Click vào tab danh mục (Khai vị, Món chính, Tráng miệng...)
3. **Chọn món**: Click vào thẻ món ăn để thêm vào danh sách
4. **Nhập nhanh**: Nhấn "⚡ Nhập nhanh" để paste danh sách món
5. **Thêm món mới**: Nhấn "+ Thêm món mới" nếu món chưa có trong hệ thống

> **Lưu ý**: Báo giá phải có ít nhất 1 món ăn để tiếp tục.

### Bước 3: Dịch Vụ Thêm

1. **Bàn ghế & Trang trí**: Chọn các dịch vụ cần thiết và nhập số lượng
2. **Nhân viên phục vụ**: Nhập số lượng nhân viên (350.000đ/người)

### Bước 4: Xem Lại & Định Giá

1. **Chi phí & Lợi nhuận**: Xem tổng hợp chi phí
2. **Giảm giá**: 
   - Giảm giá bàn ghế (%)
   - Giảm giá nhân viên (%)
   - Giảm giá tổng (%)
3. **VAT**: Bật/tắt VAT 10%
4. **Xem trước PDF**: Nhấn "📥 Xem PDF" để xem trước

### Bước 5: Hoàn Tất

1. **Xuất PDF**: Tải file PDF báo giá
2. **Lưu nháp**: Lưu để chỉnh sửa sau
3. **Xác nhận**: Gửi báo giá cho khách hàng

---

## 5. Các Thao Tác Khác

### 5.1 Xem chi tiết báo giá
Click vào dòng báo giá trong danh sách để xem chi tiết.

### 5.2 Chỉnh sửa báo giá
Nhấn nút **"Sửa"** trên dòng báo giá (chỉ với báo giá trạng thái Nháp).

### 5.3 Xóa báo giá
Nhấn nút **"Xóa"** → Xác nhận xóa trong dialog.

### 5.4 Chuyển thành đơn hàng
Với báo giá đã duyệt, nhấn **"Chuyển thành Đơn hàng"** để tạo Order.

---

## 6. FAQ - Câu Hỏi Thường Gặp

### Q: Tại sao không tạo được báo giá?
**A**: Kiểm tra các trường bắt buộc đã được điền đầy đủ. Đặc biệt bước 2 phải chọn ít nhất 1 món ăn.

### Q: Làm sao để sửa báo giá đã gửi?
**A**: Chỉ có thể sửa báo giá ở trạng thái "Nháp". Nếu báo giá đã gửi, cần tạo phiên bản mới.

### Q: Giá bán có tự động cập nhật không?
**A**: Không. Giá trong báo giá được "đóng băng" tại thời điểm tạo.

### Q: Làm sao để xuất nhiều báo giá cùng lúc?
**A**: Chức năng này đang được phát triển. Hiện tại chỉ xuất từng báo giá.

---

## 7. Liên Hệ Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- **Email**: support@amthucgiaouyet.com
- **Hotline**: 0123 456 789

---

*Tài liệu được tạo tự động bởi /auto-doc workflow*
