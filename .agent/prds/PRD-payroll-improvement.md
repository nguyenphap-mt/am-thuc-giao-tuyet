# PRD: Tab Lương — Improvement Plan

> **Module:** HR > Payroll (Tab Lương)
> **Audit Date:** 21/02/2026
> **Current Score:** 72/100 — Grade B-

---

## 1. Tổng quan hiện trạng

### Đã có (✅)

| Tính năng | Chi tiết |
|:----------|:---------|
| **Kỳ lương CRUD** | Tạo, danh sách, chọn xem — lifecycle DRAFT → CALCULATED → APPROVED → PAID |
| **Tính lương tự động** | Lấy giờ từ timesheets, áp dụng hệ số OT/weekend/holiday/night theo LLĐVN |
| **Bảng lương chi tiết** | Table với 8 cột, checkbox chọn NV, click xem modal detail |
| **Phiếu lương PDF** | In từng phiếu + batch print hàng loạt |
| **Xuất báo cáo** | Excel/CSV/PDF với KPI cards (engine chuyên nghiệp) |
| **Cài đặt tenant** | Phụ cấp mặc định, tỷ lệ BHXH/BHYT/BHTN, hệ số OT |
| **Per-employee override** | DB đã có cột allowance/insurance override trên `employees` |
| **Stat cards** | 4 thẻ: Kỳ lương, Đã trả (năm), Tạm ứng chờ, Kỳ hiện tại |
| **Vietnam Labor Law banner** | Thông tin hệ số: 100% / 150% / 200% / 300% / +30% |

### Backend Endpoints

```
POST   /payroll/periods                    — Tạo kỳ
GET    /payroll/periods                    — Danh sách
GET    /payroll/periods/{id}               — Chi tiết
POST   /payroll/periods/{id}/calculate     — Tính lương
POST   /payroll/periods/{id}/approve       — Duyệt
POST   /payroll/periods/{id}/pay           — Trả lương
GET    /payroll/periods/{id}/items          — Danh sách items
PATCH  /payroll-item/{item_id}             — Chỉnh item
POST   /payroll/advances                   — Tạo ứng lương
GET    /payroll/advances                   — Danh sách
PUT    /payroll/advances/{id}/approve      — Duyệt ứng
PUT    /payroll/advances/{id}/pay          — Trả ứng
GET    /payroll/stats                      — Thống kê
GET    /payroll/settings                   — Get cài đặt
PUT    /payroll/settings                   — Update cài đặt
```

---

## 2. Kết quả Audit 5-Dimension

| Dimension | Score | Max | Nhận xét |
|:----------|:-----:|:---:|:---------|
| **UX** | 13 | 20 | Thiếu advance management UI, không thể delete/reopen kỳ |
| **UI** | 15 | 20 | Layout tốt, thiếu inline edit + period comparison chart |
| **FE** | 16 | 20 | Code sạch, thiếu hooks cho advances + employee config |
| **BE** | 16 | 20 | Endpoints đủ, thiếu employer contribution logic |
| **DA** | 12 | 20 | Schema tốt, thiếu employer contribution tracking + audit log |
| **Total** | **72** | **100** | **Grade: B-** |

---

## 3. Gap Analysis — Thiếu sót phát hiện

### 🔴 CRITICAL (P0)

| ID | Gap | Impact |
|:---|:----|:-------|
| **GAP-01** | **Không có UI quản lý Tạm ứng lương** — Backend có 4 endpoints nhưng FE hoàn toàn thiếu | NV không thể yêu cầu/theo dõi tạm ứng |
| **GAP-02** | **Không hiển thị phần đóng BHXH của Người sử dụng lao động** — Chỉ tính phần NV (8% + 1.5% + 1%) nhưng không track phần NSDLĐ (17.5% + 3% + 1%) | Sai lệch chi phí lao động thực tế, vi phạm compliance |

### 🟠 HIGH (P1)

| ID | Gap | Impact |
|:---|:----|:-------|
| **GAP-03** | **Không thể Xóa / Mở lại kỳ lương** — DRAFT period tạo nhầm không xóa được, APPROVED không reopen | Phải tạo lại từ đầu |
| **GAP-04** | **Thiếu UI cấu hình lương per-employee** — DB đã có fields nhưng FE không có giao diện | Admin phải thao tác DB trực tiếp |
| **GAP-05** | **Không có inline edit payroll item** — Click row chỉ xem, không sửa bonus/khấu trừ trực tiếp | Phải dùng PATCH API ngoài UI |

### 🟡 MEDIUM (P2)

| ID | Gap | Impact |
|:---|:----|:-------|
| **GAP-06** | **Thiếu so sánh kỳ lương** — Không có biểu đồ trend chi phí lương qua các tháng | Khó phát hiện bất thường |
| **GAP-07** | **Thiếu bảng đóng BH tổng hợp** — Không tổng hợp BHXH/BHYT/BHTN cho báo cáo NSDLĐ | Admin phải tính tay |
| **GAP-08** | **Thiếu lịch sử thay đổi (audit log)** — Ai sửa gì, khi nào không được ghi | Rủi ro compliance |

---

## 4. Proposed Solutions — 3 Phases

### Phase 1: Core Gaps (P0 + P1) — ~4-5 ngày

#### 4.1 Salary Advance Management UI

> **Giải quyết GAP-01**

**FE Changes:**
- Thêm `SalaryAdvanceSection` component bên dưới bảng lương
- Table: NV | Số tiền | Ngày yêu cầu | Lý do | Trạng thái | Actions
- Actions: Duyệt / Từ chối / Đã trả (theo status lifecycle)
- Button "Tạo ứng lương" mở modal form
- Auto-deduct khi tính lương (đã có trong BE)

**Endpoints sử dụng:** `POST /advances`, `GET /advances`, `PUT /advances/{id}/approve`, `PUT /advances/{id}/pay`

#### 4.2 Delete / Reopen Period

> **Giải quyết GAP-03**

**BE Changes:**
- `DELETE /payroll/periods/{id}` — chỉ DRAFT status
- `POST /payroll/periods/{id}/reopen` — APPROVED/CALCULATED → DRAFT, xóa items

**FE Changes:**
- Thêm IconButton xóa trên period list (DRAFT only)
- Thêm button "Mở lại" trên period header (CALCULATED/APPROVED)
- Confirmation modal trước khi thực hiện

#### 4.3 Per-Employee Payroll Config UI

> **Giải quyết GAP-04**

**FE Changes:**
- Trong Employee Detail drawer → thêm tab/section "Cấu hình lương"
- Form fields: allowance_meal, allowance_transport, allowance_phone, allowance_other, insurance_salary_base, rate overrides
- Hiển thị "(mặc định tenant)" khi NULL, cho phép override

#### 4.4 Inline Payroll Item Edit

> **Giải quyết GAP-05**

**FE Changes:**
- Double-click cell hoặc edit icon → inline edit cho: bonus, deduction_advance, deduction_other, notes
- Sử dụng `PATCH /payroll-item/{item_id}`
- Chỉ cho phép edit khi period status ≠ PAID

---

### Phase 2: Compliance & Analytics (P2) — ~3 ngày

#### 4.5 Employer Contribution Tracking

> **Giải quyết GAP-02, GAP-07**

**DB Changes:**
- Thêm columns vào `payroll_items`:
  - `employer_social_ins` (17.5%), `employer_health_ins` (3%), `employer_unemployment` (1%)
  - `employer_total` (generated: sum of above)

**BE Changes:**
- Calculate endpoint tính thêm phần NSDLĐ
- Response include employer fields

**FE Changes:**
- Tab/toggle "Chi phí NSDLĐ" trong details
- Summary row hiển thị tổng chi phí employer
- Export bao gồm cột employer contribution

#### 4.6 Period Comparison Chart

> **Giải quyết GAP-06**

- Bar chart so sánh Gross/Net/Deductions qua 6-12 kỳ gần nhất
- Dùng recharts (đã có trong project)

---

### Phase 3: Nice-to-Have — ~2 ngày

- **GAP-08**: Audit log cho payroll actions
- Employee portal xem phiếu lương cá nhân
- Auto-generate kỳ lương hàng tháng

---

## 5. Vietnam Labor Law 2025 Compliance Check

| Quy định | Hiện tại | Cần bổ sung |
|:---------|:---------|:------------|
| BHXH NV 8% | ✅ | — |
| BHYT NV 1.5% | ✅ | — |
| BHTN NV 1% | ✅ | — |
| **BHXH NSDLĐ 17.5%** | ❌ | Phase 2 |
| **BHYT NSDLĐ 3%** | ❌ | Phase 2 |
| **BHTN NSDLĐ 1%** | ❌ | Phase 2 |
| **Phí Công đoàn 2%** | ❌ | Phase 2 |
| OT x1.5 / Weekend x2 / Holiday x3 / Night +30% | ✅ | — |
| Salary cap 20x basic salary | ❌ | Phase 2 settings |
| Ngày lễ VN | ✅ (table) | — |

---

## 6. Verification Plan

### Automated
- `npx next build` — type-safe check
- API test: `POST /payroll/periods/{id}/calculate` return employer fields

### Manual (Browser)
1. Tạo advance → duyệt → verify trừ vào lương
2. Delete DRAFT period → verify xóa thành công
3. Reopen APPROVED period → verify items bị xóa, status = DRAFT
4. Inline edit bonus → verify net_salary auto recalculate
5. Verify employer contribution hiện đúng tỷ lệ

---

## 7. Recommended Priority

> [!IMPORTANT]
> **Khuyến nghị bắt đầu từ Phase 1 — giải quyết 5 gaps ưu tiên cao nhất.**
> Phase 2 (compliance) nên làm trước khi đóng sổ BHXH quý.

Bạn muốn bắt đầu implement Phase nào?
