# Hướng Dẫn Sử Dụng Module Mua Hàng (Procurement)

Module Mua Hàng giúp quản lý quy trình nhập hàng từ nhà cung cấp, từ lúc tạo đơn hàng đến khi nhập kho hoàn tất.

## 1. Truy cập Module
Tại thanh menu bên trái, chọn **Mua Hàng** (Procurement).

## 2. Quản Lý Nhà Cung Cấp
Trước khi tạo đơn hàng, bạn cần có Nhà Cung Cấp trong hệ thống.
1. Nhấn nút **Báo cáo** > **Nhà cung cấp** (hoặc truy cập trực tiếp link `/suppliers`).
2. Nhấn **Thêm nhà cung cấp**.
3. Điền thông tin: Tên, Người liên hệ, SĐT, Địa chỉ.
4. Nhấn **Lưu**.

## 3. Quy Trình Mua Hàng

### Bước 1: Tạo Đơn Hàng (Purchase Order)
1. Tại màn hình chính Mua Hàng, nhấn nút **Tạo đơn mua**.
2. Chọn **Nhà cung cấp** từ danh sách.
3. Nhập **Ngày giao hàng dự kiến** (tùy chọn).
4. Thêm sản phẩm:
   - Nhấn **Thêm dòng**.
   - Nhập tên sản phẩm (VD: Thịt Heo, Gạo, Nước mắm).
   - Nhập Số lượng và Đơn giá.
   - Hệ thống tự động tính Thành tiền.
5. Nhấn **Lưu Đơn Hàng**.
   - Đơn hàng được tạo với trạng thái: `Chờ duyệt` (Draft).

### Bước 2: Gửi Đơn Hàng
1. Vào chi tiết đơn hàng (nhấn vào Mã ĐH).
2. Kiểm tra thông tin.
3. Nhấn **Gửi đơn hàng**.
   - Trạng thái chuyển sang: `Đang giao` (Sent).
   - Lúc này bạn đã gửi yêu cầu cho Nhà cung cấp.

### Bước 3: Nhập Kho / Hoàn Tất
1. Khi hàng về, vào lại chi tiết đơn hàng.
2. Nhấn **Xác nhận nhập kho**.
   - Trạng thái chuyển sang: `Hoàn thành` (Received).
   - (Tính năng tương lai: Tự động cộng tồn kho vào module Kho).

## 4. Theo Dõi Trạng Thái
Tại màn hình danh sách, bạn có thể theo dõi nhanh qua các thẻ KPI:
- **Tổng Đơn Hàng**: Tổng số đơn đã tạo.
- **Chờ Duyệt**: Đơn mới tạo, chưa gửi đi.
- **Đang Giao**: Đơn đã gửi, đang chờ hàng về.
- **Hoàn Thành**: Đơn đã nhập kho xong.

## 5. In Đơn Hàng
Tại chi tiết đơn hàng, nhấn nút **In đơn** để in phiếu mua hàng.
