# Hướng dẫn: Cải tiến Module Nhân sự (HR) v2.0

> **Ngày cập nhật**: 20/02/2026  
> **Module**: HR Management  
> **Phiên bản**: v2.0

---

## 1. Giới thiệu

Module HR đã được nâng cấp toàn diện với 6 tính năng mới, giúp:
- 🔴 **Giảm 80% thời gian** xử lý chấm công quá hạn
- 🔴 **Tăng 5x tốc độ** duyệt/từ chối hàng loạt
- 🟡 **Trực quan hóa** hiệu suất nhân viên & xung đột lịch
- 🟢 **Tích hợp** nghỉ phép vào lịch phân công

---

## 2. Tính năng mới

### 2.1 ⚠️ Theo dõi phân công quá hạn (P0)

**Vào**: Tab Chấm công → Panel "Phân công quá hạn" (nền đỏ nhạt)

**Cách sử dụng**:
1. Mở tab **Chấm công** trong module HR
2. Phía trên danh sách, phần **đỏ nhạt** hiển thị các phân công quá hạn chưa chấm công
3. Phân công được **nhóm theo ngày** (ví dụ: "19/02/2026 — 2 NV")
4. Badge hiển thị **số ngày quá hạn** (ví dụ: "1 ngày trước")
5. Nhấn **"Tạo tất cả"** để tạo chấm công hàng loạt cho ngày đó
6. Hoặc nhấn từng nhân viên để tạo chấm công riêng

> **Lookback**: Mặc định hiện 7 ngày gần nhất chưa chấm.

---

### 2.2 ✅ Duyệt/Từ chối hàng loạt (P0)

**Vào**: Tab Chấm công → Checkbox trên mỗi dòng

**Cách sử dụng**:
1. Tick vào **checkbox** trên mỗi bản chấm công (chỉ hiện cho status PENDING)
2. Hoặc tick **"Chọn tất cả"** ở header
3. Thanh hành động xuất hiện: hiển thị số lượng đã chọn
4. Nhấn **"✅ Duyệt tất cả"** hoặc **"❌ Từ chối"**
5. Tất cả bản chấm công được cập nhật **cùng lúc** (atomic)

---

### 2.3 📊 Dashboard hiệu suất nhân viên (P1)

**Vào**: Chi tiết nhân viên → Card Hiệu suất

**Mô tả**:
- Thanh biểu đồ tổng quan (**xanh** = đúng giờ, **vàng** = hoàn thành, **cam** = tăng ca)
- Hiển thị thêm: Tổng số bản chấm công
- Đánh giá mức độ: Xuất sắc / Tốt / Trung bình / Cần cải thiện

---

### 2.4 ⏱️ Timeline xung đột lịch (P1)

**Vào**: Tạo phân công → Chọn NV + thời gian → Nếu trùng

**Cách sử dụng**:
1. Mở form **Tạo phân công mới**
2. Chọn nhân viên và thời gian bắt đầu/kết thúc
3. Nếu có **xung đột**, hệ thống hiện:
   - Cảnh báo vàng: "Đã có phân công trùng!"
   - **Mini-timeline** (08:00 – 20:00) trực quan:
     - 🔴 **Đỏ** = Ca đã có (trùng)
     - 🟢 **Xanh viền nét đứt** = Ca mới đang tạo
4. Bạn có thể thấy rõ khung giờ nào còn trống

---

### 2.5 🏖️ Lịch nghỉ phép trên Calendar (P2)

**Vào**: Tab Phân công → Chế độ xem Lịch (Calendar)

**Cách sử dụng**:
1. Chuyển sang **chế độ xem Lịch** (icon lịch)
2. Trên mỗi ngày, nếu có NV nghỉ phép → hiện icon 🏖️ **cam** + số lượng
3. **Hover** vào icon để xem danh sách NV đang nghỉ
4. Giúp tránh phân công cho NV đang nghỉ phép

> **Dữ liệu**: Chỉ hiện đơn nghỉ phép đã được **APPROVED** (duyệt).

---

### 2.6 🎓 Hướng dẫn onboarding nhân viên mới (P2)

**Vào**: Tạo nhân viên mới → Sau khi lưu

**Mô tả**:
- Sau khi tạo nhân viên mới thành công
- Hệ thống hiện **toast hướng dẫn** bước tiếp theo:
  - "Bước tiếp: Phân công nhân viên vào đơn hàng hoặc thiết lập lịch làm việc"
  - Gợi ý: Vào tab "Phân công" để gán nhân viên

---

## 3. Câu hỏi thường gặp (FAQ)

### Q: Phân công quá hạn hiện bao nhiêu ngày?
**A**: Mặc định 7 ngày gần nhất. Phân công cũ hơn 7 ngày sẽ không hiển thị.

### Q: Tôi có thể duyệt hàng loạt bao nhiêu bản chấm công?
**A**: Không giới hạn. Tất cả được xử lý trong một transaction atomic — nếu 1 bản lỗi, tất cả rollback.

### Q: Tại sao tôi không thấy icon nghỉ phép trên lịch?
**A**: Chỉ hiện đơn nghỉ phép có status **APPROVED**. Đơn PENDING hoặc REJECTED không hiển thị.

### Q: Timeline xung đột hiện khi nào?
**A**: Chỉ hiện khi bạn tạo phân công mới và nhập đủ: nhân viên + thời gian bắt đầu + kết thúc, **VÀ** có xung đột với ca khác.

---

## 4. Thông tin kỹ thuật

| Endpoint | Mô tả |
|:---------|:-------|
| `GET /hr/timesheets/unattended?include_overdue=true` | Lấy phân công quá hạn |
| `PUT /hr/timesheets/bulk-approve` | Duyệt/từ chối hàng loạt |
| `GET /hr/leave/calendar?month=YYYY-MM` | Lấy lịch nghỉ phép theo tháng |
