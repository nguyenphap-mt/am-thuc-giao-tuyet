# Hướng Dẫn Hệ Thống Phân Quyền (RBAC)

## 1. Giới thiệu

Hệ thống phân quyền (Role-Based Access Control - RBAC) kiểm soát quyền truy cập của người dùng theo vai trò. Mỗi vai trò có quyền truy cập khác nhau vào các module và hành động (Xem, Tạo, Sửa, Xóa).

### Vai trò hệ thống

| Vai trò | Mô tả | Quyền |
|---------|--------|-------|
| **Super Admin** | Quản trị viên tối cao | Toàn quyền trên mọi module |
| **Admin** | Quản trị viên | Toàn quyền (tùy cấu hình) |
| **Manager** | Quản lý | Xem, Tạo, Sửa trên các module được gán |
| **Chef** | Bếp trưởng | Thực đơn, Kho hàng, Mua hàng |
| **Sales** | Nhân viên bán hàng | Báo giá, Đơn hàng, Khách hàng |
| **Accountant** | Kế toán | Tài chính, Hóa đơn |
| **Staff** | Nhân viên | Xem các module được gán |
| **Viewer** | Chỉ xem | Chỉ xem, không thao tác |

---

## 2. Hướng dẫn sử dụng

### 2.1 Ma trận phân quyền

Truy cập: **Cài đặt → Phân quyền**

Tại đây bạn có thể:
- Xem toàn bộ quyền của các vai trò trên từng module
- Bật/tắt quyền cho từng vai trò (checkbox)
- Tìm kiếm module cụ thể

![Ma trận phân quyền](.doc/screenshots/rbac/permission-matrix.png)

### 2.2 Quyền theo hành động

Mỗi module có các quyền sau:

| Quyền | Ý nghĩa | Ảnh hưởng |
|-------|---------|-----------|
| **Xem** | Xem danh sách và chi tiết | Hiển thị module trên sidebar |
| **Tạo** | Tạo mới bản ghi | Hiển thị nút "Thêm mới" |
| **Sửa** | Chỉnh sửa bản ghi | Hiển thị nút "Chỉnh sửa" |
| **Xóa** | Xóa bản ghi | Hiển thị nút "Xóa" |

### 2.3 Cách hoạt động

1. **Sidebar**: Chỉ hiển thị các module mà vai trò có quyền "Xem"
2. **Nút hành động**: Nút Tạo/Sửa/Xóa chỉ hiển thị nếu có quyền tương ứng
3. **API Backend**: Mọi request đều được kiểm tra quyền ở server

![Dashboard Admin — Tất cả module hiển thị](.doc/screenshots/rbac/dashboard-admin.png)

---

## 3. Ví dụ theo vai trò

### Super Admin
- Thấy tất cả 13 module trên sidebar
- Có đầy đủ nút Tạo, Sửa, Xóa trên mọi trang

### Chef (Bếp trưởng)
- Chỉ thấy: Dashboard, Thực đơn, Kho hàng, Mua hàng
- Không thấy: Tài chính, Nhân sự, Khách hàng
- API trả 403 nếu truy cập module không được phép

### Sales (Bán hàng)
- Chỉ thấy: Dashboard, Báo giá, Đơn hàng, Khách hàng
- Không thấy: Tài chính, Nhân sự, Kho hàng

---

## 4. FAQ

### Q: Tôi không thấy nút "Thêm mới" trên một trang?
**A:** Vai trò của bạn không có quyền "Tạo" trên module đó. Liên hệ quản trị viên để được cấp quyền.

### Q: Tôi bị lỗi 403 Forbidden khi gọi API?
**A:** Vai trò của bạn không có quyền truy cập module hoặc hành động này. Kiểm tra ma trận phân quyền trong Cài đặt.

### Q: Làm sao để thêm vai trò mới?
**A:** Vào **Cài đặt → Phân quyền → Thêm vai trò** và cấu hình quyền cho vai trò mới.

### Q: Super Admin có bị ảnh hưởng bởi phân quyền không?
**A:** Không. Super Admin luôn có toàn quyền trên mọi module và hành động.
