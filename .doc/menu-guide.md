# Hướng dẫn sử dụng: Module Thực đơn (Menu)

> **Module**: Quản lý Thực đơn, Combo & Công thức  
> **Phiên bản**: 2.0 (Feb 2026 — Sprint 1-2 Refactored)

---

## 1. Giới thiệu

Module Thực đơn giúp quản lý toàn bộ danh mục món ăn, combo và công thức nguyên liệu của nhà hàng/dịch vụ catering.

**Chức năng chính:**
- Quản lý danh sách món ăn (CRUD, bật/tắt, bulk actions)
- Quản lý Combo (bộ thực đơn kết hợp)
- Quản lý Danh mục (phân nhóm món ăn)
- Công thức nguyên liệu & tính Food Cost
- Phân tích Menu Engineering (4-Quadrant)
- Xuất báo cáo Excel/PDF

---

## 2. Truy cập Module

1. Đăng nhập hệ thống
2. Từ sidebar, chọn **Thực đơn** hoặc vào URL: `/menu`

---

## 3. Tab Thực đơn (Items)

### 3.1 Xem danh sách
- Danh sách hiển thị **tất cả món** với: Tên, Trạng thái, Danh mục, Food Cost %, Giá bán
- **Lọc nhanh**: Click chip danh mục phía trên để filter
- **Tìm kiếm**: Gõ vào ô tìm kiếm bên phải

### 3.2 Thao tác nhanh (hover)
Rê chuột lên một món để thấy:
- 🍳 **Công thức** — Mở recipe drawer
- ✏️ **Sửa** — Mở form chỉnh sửa  
- 🔘 **Bật/Tắt** — Toggle trạng thái bán
- 🗑️ **Xóa** — Xóa món (có xác nhận)

### 3.3 Thêm món mới
1. Click nút **"Thêm món"** (gradient tím)
2. Điền: Tên (bắt buộc), Danh mục, Giá vốn, Giá bán, ĐVT, Mô tả
3. Click **Lưu**

### 3.4 Bulk Actions
1. Tick checkbox bên trái các món
2. Click **"Hành động ({n})"**
3. Chọn: Bật bán / Ngừng bán / Xóa

---

## 4. Tab Combo (Set Menus)

### 4.1 Xem danh sách
- Hiển thị tất cả combo với: Tên, Số món, Mô tả, Giá bán, Trạng thái
- **Tìm kiếm**: Gõ vào ô "Tìm combo…" để filter theo tên/mô tả
- Click vào combo bất kỳ để mở form chỉnh sửa

### 4.2 Thêm combo
1. Click nút **"Thêm combo"** hoặc chuyển tab "Combo" rồi click "Tạo combo"
2. Điền: Tên combo, Mô tả, Giá bán
3. Tìm và thêm các món vào combo
4. Click **Lưu**

---

## 5. Tab Danh mục (Categories)

### 5.1 Xem danh sách
- Hiển thị danh mục với: Tên, Code, Mô tả, Số món
- **Tìm kiếm**: Gõ vào ô "Tìm danh mục…" để filter theo tên/code/mô tả
- Click vào danh mục để chỉnh sửa

### 5.2 Thêm danh mục
1. Click nút **"Thêm danh mục"**
2. Điền: Tên (bắt buộc), Code, Mô tả
3. Click **Lưu**

---

## 6. Tab Phân tích (Analytics)

### 6.1 Menu Engineering 4-Quadrant
Phân loại các món theo hai chiều: **Lợi nhuận** và **Mức phổ biến**

| Quadrant | Mô tả | Gợi ý |
|:---------|:-------|:------|
| ⭐ Ngôi sao | Lợi nhuận cao, phổ biến | Giữ vững, đẩy mạnh marketing |
| 🧩 Tiềm năng | Lợi nhuận cao, ít bán | Tăng quảng bá, thử giảm giá |
| 🐴 Bền bỉ | Lợi nhuận thấp, phổ biến | Tối ưu nguyên liệu, giảm chi phí |
| 🐕 Cân nhắc | Lợi nhuận thấp, ít bán | Xem xét loại bỏ hoặc đổi mới |

### 6.2 Top 10 Bán chạy
- Xếp hạng các món theo doanh thu
- Hiển thị Food Cost % cho mỗi món

### 6.3 Phân tích theo Danh mục
- Giá trung bình, Food Cost trung bình
- Thanh biểu đồ thể hiện tổng doanh thu tiềm năng

---

## 7. Công thức (Recipe Drawer)

### 7.1 Mở công thức
- Click icon 👨‍🍳 khi hover lên một món

### 7.2 Xem Food Cost
- Phần đầu drawer hiển thị: Food Cost %, Giá vốn, Giá bán, Lợi nhuận
- Màu: Xanh (≤30%), Vàng (30-40%), Đỏ (>40%)

### 7.3 Thêm nguyên liệu
1. Gõ tên nguyên liệu vào ô tìm kiếm
2. Chọn từ dropdown kết quả (lấy từ kho Inventory)
3. Nguyên liệu sẽ được thêm vào công thức

---

## 8. Xuất báo cáo

1. Click nút **"Xuất báo cáo"** (icon download)
2. Chọn định dạng: Excel hoặc CSV
3. File sẽ tự động tải về

---

## FAQ

**Q: Không thể xóa danh mục?**  
A: Danh mục đang có món ăn sẽ không thể xóa. Hãy chuyển hết món sang danh mục khác trước.

**Q: Food Cost hiển thị 0%?**  
A: Cần thêm nguyên liệu vào công thức (Recipe) của món đó. Mở Recipe Drawer và thêm nguyên liệu từ kho.

**Q: Tìm kiếm combo không ra kết quả?**  
A: Tìm kiếm filter theo tên và mô tả combo. Đảm bảo gõ đúng từ khóa.
