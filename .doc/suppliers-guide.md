# Hướng dẫn sử dụng Module Nhà Cung Cấp

> **Phiên bản**: 2.0 | **Ngày cập nhật**: 09/02/2026  
> **Module**: Nhà cung cấp (Supplier Management)  
> **Đường dẫn**: Sidebar → Nhà cung cấp → `/suppliers`

---

## 1. Giới thiệu

Module **Nhà Cung Cấp** giúp quản lý toàn bộ thông tin các nhà cung cấp trong hệ thống ERP. Module hỗ trợ:

- ✅ Quản lý thông tin NCC (tên, liên hệ, MST, ngân hàng, phân loại)
- ✅ Xem tổng quan thống kê (tổng NCC, đang hoạt động, ngừng, công nợ)
- ✅ Tìm kiếm theo tên/SĐT/email (server-side, debounce 300ms)
- ✅ Lọc theo phân loại (Thực phẩm, Đồ uống, Dụng cụ, Dịch vụ, Khác)
- ✅ Lọc theo trạng thái (Tất cả / Hoạt động / Ngừng HĐ)
- ✅ Xem chi tiết NCC kèm lịch sử PO (trạng thái hiển thị bằng Tiếng Việt)
- ✅ Thao tác nhanh trên hover: Gọi điện, Gửi email, Sửa, Xóa
- ✅ Xóa nhiều NCC cùng lúc (Bulk Delete)
- ✅ Phân trang tự động khi danh sách lớn

---

## 2. Màn hình chính

Khi vào trang Nhà Cung Cấp, giao diện hiển thị:

### 2.1 Thanh thống kê (Stats Cards)
4 thẻ thống kê nằm trên cùng (có skeleton loading khi đang tải):

| Thẻ | Mô tả |
|-----|-------|
| **Tổng NCC** | Tổng số nhà cung cấp trong hệ thống |
| **Hoạt động** | Số NCC đang hoạt động (is_active = true) |
| **Ngừng HĐ** | Số NCC ngừng hoạt động |
| **Tổng công nợ** | Tổng số tiền công nợ (VND) |

### 2.2 Thanh công cụ (Toolbar)
- **Checkbox chọn tất cả**: Tick để chọn toàn bộ NCC
- **Nút Refresh**: Làm mới dữ liệu
- **Bộ lọc Phân loại**: Dropdown chọn loại NCC
- **Bộ lọc Trạng thái**: Dropdown chọn Tất cả / Hoạt động / Ngừng HĐ
- **Ô tìm kiếm**: Tìm theo tên, SĐT, email, người liên hệ (tự động sau 300ms)

**Khi có mục được chọn**, toolbar chuyển sang hiển thị:
- Số lượng đã chọn
- Nút **Xóa** (xóa hàng loạt)
- Nút **Bỏ chọn**

### 2.3 Danh sách NCC (Gmail-style)
Mỗi dòng hiển thị:
- Checkbox chọn
- Nút đánh dấu sao (yêu thích)
- Tên NCC
- Badge phân loại (màu theo loại)
- Badge trạng thái (HĐ / Ngừng)
- Tên người liên hệ
- Số điện thoại

**Hover Actions** (hiện khi rê chuột vào dòng):
- 📞 Gọi điện (mở ứng dụng gọi)
- ✉️ Gửi email (mở ứng dụng email)
- ✏️ Sửa thông tin
- 🗑️ Xóa NCC

**Mobile**: Nút 3 chấm (⋮) mở menu dropdown với các action tương tự.

### 2.4 Phân trang
Khi danh sách lớn, hiển thị thanh phân trang ở cuối với:
- Tổng số NCC
- Nút Previous / Next
- Số trang hiện tại / tổng trang

### 2.5 Trạng thái rỗng
- **Không có NCC**: Hiện thông báo và nút "Thêm NCC đầu tiên"
- **Không tìm thấy kết quả**: Hiện thông báo và nút "Xóa bộ lọc"

---

## 3. Hướng dẫn thao tác

### 3.1 Thêm NCC mới

1. Click nút **"Thêm NCC"** (góc phải trên, nút gradient tím-hồng)
2. Dialog form mở ra với các trường:

| Trường | Bắt buộc | Validation |
|--------|:--------:|------------|
| Tên NCC | ✅ | Min 1, max 255 ký tự |
| Phân loại | ✅ | Chọn từ 5 loại |
| Người liên hệ | ❌ | Max 100 ký tự |
| Số điện thoại | ❌ | 8-15 chữ số |
| Email | ❌ | Định dạng email hợp lệ |
| Website | ❌ | URL hợp lệ |
| Mã số thuế | ❌ | Max 50 ký tự |
| Điều khoản TT | ❌ | Chọn từ 5 loại |
| STK ngân hàng | ❌ | Max 50 ký tự |
| Ngân hàng | ❌ | Max 100 ký tự |
| Địa chỉ | ❌ | — |
| Ghi chú | ❌ | — |
| Trạng thái HĐ | ❌ | Bật/tắt, mặc định bật |

3. Click **"Tạo mới"** để lưu

### 3.2 Chỉnh sửa NCC

**Cách 1**: Hover vào dòng NCC → Click icon ✏️ (Sửa)  
**Cách 2**: Click dòng NCC để mở Detail Drawer → Click **"Chỉnh sửa"**

> Khi chỉnh sửa từ Detail Drawer, drawer sẽ đóng mượt trước khi form mở ra.

### 3.3 Xem chi tiết NCC

1. Click vào dòng NCC bất kỳ trong danh sách
2. **Detail Drawer** mở ra bên phải với 2 tab:

**Tab "Thông tin"**:
- 4 thẻ thống kê: Tổng PO, Tổng giá trị, Đã thanh toán, Còn nợ
- Thông tin liên hệ: SĐT, email, website, địa chỉ
- Thông tin kinh doanh: Phân loại, MST, điều khoản TT, ngân hàng
- Ghi chú

**Tab "Đơn hàng"**:
- Hiển thị lịch sử các Purchase Order (PO) đã tạo với NCC
- Mỗi PO hiển thị: Mã PO, ngày tạo (dd/MM/yyyy), trạng thái (Tiếng Việt), giá trị

**Trạng thái PO bằng Tiếng Việt**:
| Mã gốc | Hiển thị |
|---------|----------|
| DRAFT | Nháp |
| SENT | Đã gửi |
| CONFIRMED | Xác nhận |
| RECEIVED | Đã nhận |
| PAID | Đã TT |
| CANCELLED | Đã hủy |

### 3.4 Xóa NCC

**Xóa đơn lẻ**:
1. Hover vào dòng NCC → Click icon 🗑️ (Xóa)
2. Dialog xác nhận hiện ra → Click **"Xóa"**

**Xóa hàng loạt**:
1. Tick checkbox các NCC cần xóa
2. Click nút **"Xóa"** trên toolbar
3. Dialog xác nhận hiện ra → Click **"Xóa"**

> ⚠️ **Lưu ý**: Không thể xóa NCC đang có đơn mua hàng (PO) liên kết

### 3.5 Tìm kiếm và Lọc

- **Tìm kiếm**: Gõ vào ô tìm kiếm → Kết quả lọc tự động sau 300ms (debounce)
- **Lọc phân loại**: Click dropdown → Chọn loại NCC
- **Lọc trạng thái**: Click dropdown → Chọn Tất cả / Hoạt động / Ngừng HĐ
- **Xóa bộ lọc**: Click nút "Xóa bộ lọc" khi không tìm thấy kết quả

---

## 4. Phân loại NCC

| Mã | Tên | Màu Badge |
|----|-----|-----------| 
| FOOD | Thực phẩm | 🟠 Cam |
| BEVERAGE | Đồ uống | 🔵 Xanh biển |
| EQUIPMENT | Dụng cụ | 🟣 Tím |
| SERVICE | Dịch vụ | 🟢 Xanh lá |
| OTHER | Khác | ⚪ Xám |

---

## 5. Điều khoản thanh toán

| Mã | Mô tả |
|----|-------|
| IMMEDIATE | Thanh toán ngay khi nhận hàng |
| NET15 | Thanh toán trong 15 ngày |
| NET30 | Thanh toán trong 30 ngày (mặc định) |
| NET60 | Thanh toán trong 60 ngày |
| NET90 | Thanh toán trong 90 ngày |

---

## 6. Liên kết Module

| Module | Liên kết |
|--------|----------|
| **Mua hàng (Procurement)** | NCC liên kết trực tiếp với Đơn mua hàng (PO) |
| **Kho hàng (Inventory)** | Hàng hóa nhập kho từ PO của NCC |
| **Tài chính (Finance)** | Công nợ phải trả NCC (Accounts Payable) |

---

## 7. FAQ

**Q: Tại sao không xóa được NCC?**  
A: NCC đang có đơn mua hàng (PO) liên kết. Cần xóa PO trước hoặc đổi trạng thái NCC sang "Ngừng HĐ".

**Q: Làm sao để thêm NCC nhiều loại sản phẩm?**  
A: Chọn phân loại chính (ví dụ: Thực phẩm). Ghi chú chi tiết trong trường "Ghi chú".

**Q: Dữ liệu "Tổng công nợ" tính từ đâu?**  
A: Từ trường `balance` của NCC, được cập nhật khi tạo Payment cho PO.

**Q: Có thể tìm NCC theo mã số thuế không?**  
A: Hiện tại tìm kiếm hỗ trợ theo: Tên, SĐT, Email, Người liên hệ. Tìm theo MST sẽ được bổ sung trong phiên bản sau.

**Q: Tìm kiếm có bị chậm không?**  
A: Không. Tìm kiếm có debounce 300ms — chỉ gửi request sau khi ngừng gõ 300ms, giảm tải cho hệ thống.

**Q: Phân trang hoạt động thế nào?**  
A: Mỗi trang hiển thị tối đa 50 NCC. Dùng nút ◀ ▶ để chuyển trang.

---

> 📝 *Tài liệu được tạo tự động bởi AI Workforce — Ẩm Thực Giao Tuyết Catering ERP*
