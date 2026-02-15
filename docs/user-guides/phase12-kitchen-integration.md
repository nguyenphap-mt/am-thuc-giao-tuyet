# 📋 HƯỚNG DẪN SỬ DỤNG - Phase 12: Kitchen Integration

> **Version:** 1.0 | **Ngày cập nhật:** 27/01/2026
> **Module:** Order → Kitchen Integration

---

## 🎯 TỔNG QUAN

Phase 12 bổ sung 2 tính năng quan trọng giúp kết nối **Đơn hàng** với **Bếp** và **Kho**:

| Tính năng | Mục đích | 
|:----------|:---------|
| **Prep Sheet** | Bảng chuẩn bị bếp - giúp bếp trưởng biết cần nấu gì, khi nào |
| **Pull Sheet** | Phiếu xuất kho - giúp thủ kho biết cần lấy nguyên liệu gì |

---

## 🍳 PREP SHEET (Bảng Chuẩn Bị Bếp)

### Khi nào sử dụng?
- Khi đơn hàng đã được **XÁC NHẬN** (CONFIRMED)
- Trước ngày sự kiện 1-2 ngày để bếp chuẩn bị

### Cách sử dụng

**Bước 1:** Vào **Đơn hàng** → Click vào đơn có status "Đã xác nhận"

**Bước 2:** Click button **"Prep Sheet"** (màu hồng-tím) ở góc trên phải

**Bước 3:** Modal hiển thị với thông tin:
- 📅 Thông tin sự kiện (ngày, giờ, địa điểm)
- 👤 Khách hàng
- 📦 Danh sách món theo category
- ⏰ Prep Time gợi ý (T-3h, T-2h, T-1h...)

**Bước 4:** Nhấn **"In"** để in bảng chuẩn bị

### Giải thích Prep Time
| Badge | Ý nghĩa | Ví dụ |
|:------|:--------|:------|
| **T-3h** | Chuẩn bị trước 3 tiếng | Sơ chế, luộc, hấp |
| **T-2h** | Chuẩn bị trước 2 tiếng | Khai vị, salad |
| **T-1h** | Chuẩn bị trước 1 tiếng | Món chính |
| **T-30m** | Chuẩn bị trước 30 phút | Tráng miệng |
| **T-15m** | Chuẩn bị ngay trước | Đồ uống |

---

## 📦 PULL SHEET (Phiếu Xuất Kho)

### Khi nào sử dụng?
- Khi đơn hàng đã được **XÁC NHẬN** (CONFIRMED)
- Trước ngày sự kiện 1 ngày để chuẩn bị nguyên liệu

### Cách sử dụng

**Bước 1:** Vào **Đơn hàng** → Click vào đơn có status "Đã xác nhận"

**Bước 2:** Click button **"Pull Sheet"** (màu xanh lá) ở góc trên phải

**Bước 3:** Modal hiển thị với thông tin:
- 📋 Thống kê: Đủ hàng / Thiếu hàng / Chưa liên kết
- 📦 Danh sách nguyên liệu cần lấy
- 🏷️ Lot numbers (theo FIFO - hết hạn sớm lấy trước)
- ⚠️ Cảnh báo nếu thiếu hàng

**Bước 4:** Nhấn **"In"** để in phiếu xuất kho

### Giải thích Status
| Status | Màu | Ý nghĩa |
|:-------|:----|:--------|
| ✅ **Đủ** | Xanh lá | Đủ nguyên liệu trong kho |
| ⚠️ **Thiếu X** | Cam | Thiếu X đơn vị, cần mua thêm |
| 🔗 **N/A** | Xám | Món chưa liên kết với kho |

### Xử lý khi thiếu hàng
1. Xem số lượng thiếu trong cột **Shortfall**
2. Click **"Tạo đơn mua hàng"** để tạo PO tự động
3. Hoặc liên hệ bộ phận mua hàng

---

## ❓ CÂU HỎI THƯỜNG GẶP

### Q: Tại sao không thấy button Prep Sheet / Pull Sheet?
**A:** Buttons chỉ hiển thị khi đơn hàng có status:
- CONFIRMED (Đã xác nhận)
- IN_PROGRESS (Đang thực hiện)
- COMPLETED (chỉ Prep Sheet)

### Q: Tại sao Pull Sheet hiện "Chưa liên kết"?
**A:** Món ăn chưa được liên kết với nguyên liệu trong kho. Cần:
1. Vào **Menu** → Chọn món
2. Thêm **Recipe** (công thức nấu)
3. Liên kết với nguyên liệu trong **Kho**

### Q: FIFO là gì?
**A:** First In, First Out - Hàng nhập trước xuất trước. 
Hệ thống tự động chọn lot có hạn sử dụng sớm nhất để xuất trước.

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, vui lòng liên hệ:
- **Email:** support@amthucgiaouyet.vn
- **Hotline:** 1900-xxxx

---

*Tài liệu này thuộc về Ẩm Thực Giáo Tuyết - Phase 12 Kitchen Integration*
