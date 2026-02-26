# Hướng Dẫn: Cải Tiến Tích Hợp Lương - Chấm Công

> Ngày cập nhật: 21/02/2026

## Giới thiệu

Bản cập nhật này cải tiến tích hợp giữa module **Bảng lương** và **Chấm công**, sửa các vấn đề về tính giờ đêm, giờ tăng ca, và bổ sung thông tin ngày công.

## Các cải tiến

### 1. Tính giờ đêm chính xác (GAP-P1)
- **Trước**: Giờ đêm = OT × 10% (ước lượng)
- **Sau**: Tính từ giờ check-in/check-out thực tế, so sánh với khung 22h-6h
- **Ảnh hưởng**: 30% phụ cấp đêm giờ chính xác hơn

### 2. Số ngày công (GAP-P2)
- Hiển thị số ngày công (ví dụ "22d") bên dưới số giờ trong bảng lương
- Tính từ số ngày chấm công đã duyệt (distinct work_date)
- Hover để xem tooltip chi tiết

### 3. Chỉ báo nguồn dữ liệu (GAP-P3)
- Cột "Giờ" đổi thành "Giờ 📋"
- Tooltip: "Giờ thường — tính từ chấm công đã duyệt"
- Giúp phân biệt giờ từ chấm công vs nhập tay

### 4. Giờ OT chính xác (GAP-P4)
- **Trước**: OT = tổng giờ − 8h (tính lại)
- **Sau**: Dùng trực tiếp giờ OT từ chấm công (quản lý đã phê duyệt)
- **Ảnh hưởng**: Không bị mất OT khi quản lý đã chỉnh sửa

### 5. Badge cuối tuần trên Chấm công (GAP-P5)
- Ngày thứ 7: Badge **T7** (màu vàng)
- Ngày Chủ nhật: Badge **CN** (màu đỏ)
- Hiển thị khi xem chấm công nhiều ngày

### 6. Sửa lỗi phiếu lương nhân viên (GAP-P6)
- Fix trường dữ liệu sai trong màn hình "Phiếu lương của tôi"
- Hiển thị đúng giờ thường, OT, cuối tuần, ngày lễ

## FAQ

**Q: Giờ đêm được tính như thế nào?**
A: Hệ thống tính giờ thực tế nằm trong khung 22:00 - 06:00 dựa trên giờ check-in/check-out.

**Q: Số ngày công lấy từ đâu?**
A: Đếm số ngày chấm công được duyệt (status = APPROVED) trong kỳ lương.

**Q: OT có thay đổi khi tính lại lương không?**
A: OT giờ lấy trực tiếp từ bản ghi chấm công đã duyệt, không tính lại.

## Liên quan
- [Hướng dẫn Bảng lương](./../.doc/hr-payroll-complete-guide.md)
- [PRD Audit](file:///C:/Users/nguye/.gemini/antigravity/brain/aa76bea9-a2f9-4231-96bb-7e09c04ba3d7/PRD-payroll-timesheet-audit.md)
