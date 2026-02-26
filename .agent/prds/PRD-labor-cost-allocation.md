# PRD: Chi Phí Nhân Công — Phân Bổ Đúng Theo Loại Nhân Viên

## 1. Bối Cảnh & Vấn Đề

Hiện tại, endpoint `/orders/{id}/staff-costs` tính chi phí nhân công cho **TẤT CẢ** nhân viên được phân công vào đơn hàng, bao gồm cả nhân viên **lương tháng (fulltime)** và **lương giờ (parttime)**.

User đặt câu hỏi:
> *"Nếu một nhân viên có mức lương theo tháng thì không nên tính chi phí nhân công vào một đơn hàng cụ thể đúng không? Chỉ tính vào chi phí nhân sự cho công ty?"*

---

## 2. Kết Quả Nghiên Cứu

### 2.1 Kế Toán Quốc Tế (Job Costing vs. Overhead)

| Loại chi phí | Phân loại | Ví dụ | Xử lý |
|:---|:---|:---|:---|
| **Direct Labor** (Biến phí) | Variable Cost | NV thời vụ, thuê ngoài | ✅ Tính vào đơn hàng cụ thể |
| **Fixed Labor** (Định phí) | Fixed Overhead | NV lương tháng, quản lý | ❌ Tính vào chi phí chung công ty |

> **Verified (3+ sources):** Salaried employees = **Fixed Overhead**, không phân bổ vào job/order cụ thể trong standard accounting.

### 2.2 Kế Toán Việt Nam (Thông Tư 200/2014)

| Tài khoản | Nội dung | Áp dụng |
|:---|:---|:---|
| **TK622** | Chi phí nhân công trực tiếp | NV thời vụ chế biến cho đơn hàng cụ thể |
| **TK627** | Chi phí sản xuất chung | NV fulltime bếp (gián tiếp) |
| **TK642** | Chi phí quản lý doanh nghiệp | Quản lý, kế toán, HR |

### 2.3 Ngành Catering — Best Practices

Hầu hết doanh nghiệp catering sử dụng **Hybrid Approach**:

```
Chi phí đơn hàng = Chi phí nguyên liệu + Chi phí nhân công THỜI VỤ
                                          (chỉ nhân viên thuê cho event đó)

Chi phí chung    = Lương NV fulltime + Quản lý + Overhead
                   (phân bổ đều hoặc theo % doanh thu)
```

---

## 3. Phân Tích 3 Phương Án

### Option A: Chỉ Tính Part-time/Hourly vào Đơn Hàng ⭐ **Đề xuất**

```
Order P&L = Doanh thu - (Nguyên liệu + Chi phí NV thời vụ + Chi phí khác)
```

| Ưu điểm | Nhược điểm |
|:---|:---|
| ✅ Phản ánh đúng chi phí **biến đổi** của đơn hàng | ⚠️ Không thấy "full picture" chi phí thực |
| ✅ Đúng kế toán chuẩn (TK622 vs TK627) | |
| ✅ Giúp báo giá chính xác (biết rõ chi phí tăng thêm) | |
| ✅ Không double-count (payroll đã trả lương tháng rồi) | |

### Option B: Tính Tất Cả vào Đơn Hàng (Hiện tại)

```
Order P&L = Doanh thu - (Nguyên liệu + Chi phí TẤT CẢ NV + Chi phí khác)
```

| Ưu điểm | Nhược điểm |
|:---|:---|
| ✅ Thấy "full cost" per event | ❌ **Double-counting**: lương tháng đã trả rồi |
| ✅ Job costing chi tiết | ❌ Order P&L bị lệch (lỗ giả) |
| | ❌ NV fulltime đi 3 đơn/tháng → lương bị tính 3 lần? |

### Option C: Hybrid — Hiển thị cả hai, tách biệt

```
Order P&L:
  Doanh thu:          550.000đ
  (-) NL + Biến phí:  -100.000đ  ← chỉ part-time
  = Biên LN gộp:      450.000đ  (81.8%)
  
  Tham khảo:
  Chi phí NV fulltime: 220.385đ  (tính hourly pro-rata, KHÔNG trừ vào P&L)
```

| Ưu điểm | Nhược điểm |
|:---|:---|
| ✅ Rõ ràng, không double-count | ⚠️ UI phức tạp hơn |
| ✅ Vẫn biết chi phí nhân sự tham khảo | |

---

## 4. Đề Xuất: **Option A** (Chỉ Part-time vào Order P&L)

### Logic thay đổi

```python
# TRƯỚC (hiện tại) — tính TẤT CẢ nhân viên
for assignment, employee in rows:
    hourly_rate = derive_rate(employee)  # Cả fulltime lẫn parttime
    cost = hourly_rate * billable_hours  # Tất cả tính vào order

# SAU (đề xuất) — chỉ tính nhân viên THỜI VỤ
for assignment, employee in rows:
    if employee.is_fulltime:
        # Hiển thị tham khảo, KHÔNG cộng vào total_staff_cost
        cost_reference = derive_rate(employee) * billable_hours
    else:
        # Tính vào P&L đơn hàng
        cost = derive_rate(employee) * billable_hours
        total_cost += cost
```

### Thay đổi cần thiết

| Component | Thay đổi |
|:---|:---|
| **Backend** `get_order_staff_costs` | Tách `total_staff_cost` (parttime only) vs `fulltime_cost_reference` |
| **Frontend** P&L Card | `Chi phí` = only parttime; hiển thị label nhỏ "NV fulltime: xxx (tham khảo)" |
| **Response schema** | Thêm `fulltime_reference_cost` field |

---

## 5. Câu Hỏi Cho User

> [!IMPORTANT]
> **Cần xác nhận trước khi implement:**

1. **Option nào bạn muốn?**
   - **A**: Chỉ tính part-time vào chi phí đơn hàng (đề xuất)
   - **B**: Giữ nguyên tính tất cả (hiện tại)
   - **C**: Hybrid — hiển thị cả hai nhưng tách biệt

2. **Trường hợp đặc biệt**: Nếu một nhân viên fulltime làm thêm giờ (OT) cho đơn hàng — OT đó có tính vào chi phí đơn hàng không?

3. **Nhân viên Pham Thi Hoa** hiện tại `is_fulltime = true` nhưng `hourly_rate = 0`, `base_salary = 0`. Đây có đúng là nhân viên fulltime lương tháng, hay thực tế là nhân viên thời vụ bị set sai?

---

## 6. Sources (Verified Claims)

| # | Source | Claim | Confidence |
|:--|:---|:---|:---|
| 1 | restaurant365.com | Salaried staff = fixed overhead, not allocated per job | ✅ HIGH |
| 2 | certifiedcateringconsultants.com | Catering uses hybrid: direct labor per event + overhead | ✅ HIGH |
| 3 | posapp.vn, misa.vn | VN: TK622 (direct) vs TK627 (indirect) | ✅ HIGH |
| 4 | pricinglink.com | Job costing: only hourly wages × hours per event | ✅ HIGH |
| 5 | baocaotaichinh.vn | Nhân công trực tiếp = tham gia trực tiếp sản xuất | ✅ HIGH |
