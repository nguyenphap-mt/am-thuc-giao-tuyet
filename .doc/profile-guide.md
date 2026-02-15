# Hướng Dẫn Sử Dụng: Trang Cá Nhân & Đổi Mật Khẩu

> **Module:** Profile  
> **Cập nhật:** 26/01/2026  
> **Phiên bản:** 1.0

---

## 1. Tổng Quan

Module **Trang cá nhân** cho phép người dùng:
- Xem thông tin tài khoản của mình
- Cập nhật họ tên và số điện thoại
- Đổi mật khẩu đăng nhập

---

## 2. Truy Cập

### Cách 1: Từ Sidebar
1. Click vào **Avatar/Tên người dùng** ở góc phải header
2. Chọn **"Trang của tôi"**

### Cách 2: URL Trực Tiếp
- Profile: `http://localhost:4500/profile`
- Đổi mật khẩu: `http://localhost:4500/profile/change-password`

---

## 3. Xem Thông Tin Cá Nhân

### Các thông tin hiển thị:

| Trường | Mô tả |
|:-------|:------|
| **Họ tên** | Tên đầy đủ của bạn |
| **Email** | Email đăng nhập (không đổi được) |
| **Số điện thoại** | Số liên lạc |
| **Vai trò** | Quyền hạn trong hệ thống |
| **Trạng thái** | Hoạt động / Không hoạt động |
| **Ngày tạo** | Ngày tài khoản được tạo |

---

## 4. Cập Nhật Thông Tin

### Bước thực hiện:

1. **Vào trang Profile** (`/profile`)
2. Click nút **"Chỉnh sửa"** (icon 📝) ở góc phải
3. **Cập nhật** các thông tin:
   - Họ tên (bắt buộc)
   - Số điện thoại (tùy chọn)
4. Click **"Lưu thay đổi"**
5. Thông báo **"Cập nhật thành công"** xuất hiện

### Lưu ý:
- Email **không thể thay đổi** sau khi tạo tài khoản
- Vai trò chỉ Admin mới có quyền thay đổi

---

## 5. Đổi Mật Khẩu

### Bước thực hiện:

1. **Vào trang Profile** (`/profile`)
2. Trong phần **Bảo mật**, click **"Đổi mật khẩu"**
3. Điền các trường:
   - **Mật khẩu hiện tại**: Mật khẩu đang dùng
   - **Mật khẩu mới**: Ít nhất 8 ký tự
   - **Xác nhận mật khẩu**: Nhập lại mật khẩu mới
4. Click **"Đổi mật khẩu"**
5. Hệ thống sẽ tự động chuyển về trang Profile

### Yêu cầu mật khẩu:
- ✅ Ít nhất **8 ký tự**
- ✅ Khác mật khẩu hiện tại
- ✅ Xác nhận khớp với mật khẩu mới

### Thanh độ mạnh mật khẩu:
| Độ dài | Mức độ | Màu |
|:-------|:-------|:----|
| < 8 ký tự | Yếu | 🔴 Đỏ |
| 8-11 ký tự | Trung bình | 🟡 Vàng |
| ≥ 12 ký tự | Mạnh | 🟢 Xanh |

---

## 6. Xử Lý Lỗi Thường Gặp

### "Mật khẩu hiện tại không đúng"
- **Nguyên nhân**: Nhập sai mật khẩu hiện tại
- **Giải pháp**: Kiểm tra lại mật khẩu hoặc liên hệ Admin để reset

### "Mật khẩu xác nhận không khớp"
- **Nguyên nhân**: Hai ô mật khẩu mới không giống nhau
- **Giải pháp**: Nhập lại cẩn thận, có thể click icon 👁️ để xem

### "Mật khẩu mới phải khác mật khẩu hiện tại"
- **Nguyên nhân**: Đặt mật khẩu mới trùng với cũ
- **Giải pháp**: Chọn mật khẩu khác

---

## 7. FAQ

### Q: Tôi quên mật khẩu, làm sao?
**A:** Liên hệ Admin để được reset mật khẩu. Chức năng quên mật khẩu qua email sẽ có trong phiên bản tiếp theo.

### Q: Email có thể đổi được không?
**A:** Không. Email là định danh duy nhất của tài khoản.

### Q: Ai có quyền thay đổi vai trò?
**A:** Chỉ **Super Admin** và **Admin** có quyền thay đổi vai trò người dùng trong phần **Quản lý người dùng**.

### Q: Đổi mật khẩu có cần đăng nhập lại?
**A:** Không. Phiên đăng nhập hiện tại vẫn được giữ nguyên.

---

## 8. Liên Hệ Hỗ Trợ

Nếu gặp vấn đề, vui lòng liên hệ:
- **Admin hệ thống**
- **Email**: support@amthucgiatuyet.vn
