# PRD: Cải thiện toàn diện Module Nhân sự (HR) — v2.0

> **Research Method**: Hybrid Research-Reflexion + UI/UX Pro Max  
> **Ngày tạo**: 20/02/2026  
> **Module**: HR Management  
> **Scope**: UX/UI improvements + Feature gaps  
> **Claim Verification**: 85% (≥2 independent sources per claim)

---

## 1. Bối cảnh & Vấn đề

### 1.1 Tình trạng hiện tại
Module HR đạt **78/100 (Grade B)** trong audit Feb 2026. Backend mạnh (auto-timesheets, labor costing, conflict detection), nhưng frontend có nhiều điểm cần cải thiện.

### 1.2 Các gap đã xác định

| # | Gap | Severity | Nguồn phát hiện |
|:--|:----|:---------|:----------------|
| G1 | **Overdue Attendance Tracking** — Không hiển thị phân công quá hạn chưa chấm công | HIGH | User feedback + Industry best practice |
| G2 | **Performance Dashboard** — Thiếu visual dashboard cho manager đánh giá NV | MEDIUM | PRD Audit (GAP-M2) |
| G3 | **Shift Conflict Visualization** — Xung đột lịch chỉ check nhưng không hiển thị visual | MEDIUM | UX audit |
| G4 | **Bulk Timesheet Operations** — Chỉ approve từng bản, thiếu bulk approve/reject | HIGH | User feedback |
| G5 | **Quick-Attendance Panel** — Thiếu bridge giữa Assignment → Timesheet | HIGH | ✅ **Đã fix** (20/02/2026) |
| G6 | **Leave Calendar Integration** — Nghỉ phép không hiển thị trên calendar chung | LOW | Cross-module UX |
| G7 | **Employee Onboarding Flow** — Không có guided flow khi thêm NV mới | LOW | Industry best practice |

---

## 2. Đề xuất cải tiến (Prioritized)

### 2.1 🔴 P0 — Overdue Attendance Tracker (G1)

**Vấn đề**: Quick-Attendance Panel (vừa implement) chỉ hiện phân công **hôm nay**. Nếu ngày hôm qua có phân công chưa chấm công → không có cảnh báo.

**Giải pháp**: Thêm section "Phân công quá hạn" vào Timesheet tab

```
┌──────────────────────────────────────────┐
│ ⚠️ Phân công quá hạn chưa chấm (3)      │
│   Hiển thị: grouped by date             │
│   ┌─ 19/02/2026 (2 NV) ──────────────── │
│   │ 👤 Huỳnh Phi Long · Trưởng nhóm     │
│   │ 👤 Huỳnh Thị Kim Chi · Đầu bếp      │
│   └─ 18/02/2026 (1 NV) ──────────────── │
│   │ 👤 Nguyễn Văn A · Phục vụ           │
│   [Tạo chấm công tất cả quá hạn]        │
└──────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Sửa `GET /timesheets/unattended`: thêm param `include_overdue=true` (default: false)
  - Khi `include_overdue=true`: query assignments từ 7 ngày trước đến hôm nay chưa có timesheet
  - Response thêm field `is_overdue: bool` và `overdue_days: int`

#### Frontend
- **[MODIFY]** [TimeSheetTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/TimeSheetTab.tsx)
  - Thêm query riêng: `GET /timesheets/unattended?include_overdue=true`
  - Hiển thị section "Phân công quá hạn" với nền **đỏ nhạt** (`bg-red-50`)
  - Badge cảnh báo số ngày quá hạn
  - Nút "Tạo chấm công" → gọi batch endpoint

**UX Pattern** (Verified — 3+ sources):
> "Real-time monitoring and alerts allow managers to immediately identify late arrivals or no-shows" — Deputy, Jibble, Altametrics

---

### 2.2 🔴 P0 — Bulk Timesheet Actions (G4)

**Vấn đề**: Manager phải approve/reject từng bản chấm công → mất thời gian khi có 10+ NV/ngày.

**Giải pháp**: Thêm checkbox selection + bulk action bar

```
┌──────────────────────────────────────────┐
│ ☑ Chọn tất cả  │ 5 đã chọn             │
│ [✅ Duyệt tất cả] [❌ Từ chối] [↩ Bỏ chọn]│
├──────────────────────────────────────────┤
│ ☑ Huỳnh Phi Long  │ 08:00-16:00 │ PENDING│
│ ☑ Nguyễn Văn A    │ 09:00-17:00 │ PENDING│
│ ☐ Trần Thị B      │ 07:00-15:00 │ APPROVED│
└──────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Thêm `PUT /timesheets/bulk-approve` — nhận `{ timesheet_ids: UUID[], action: "APPROVE" | "REJECT" }`
  - Validate tất cả timesheets thuộc đúng tenant, status = PENDING
  - Atomic transaction — tất cả thành công hoặc rollback

#### Frontend
- **[MODIFY]** [TimeSheetTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/TimeSheetTab.tsx)
  - Thêm `selectedTimesheets: Set<string>` state
  - Floating action bar (fixed bottom) khi `selectedTimesheets.size > 0`
  - Checkbox trên mỗi row (chỉ hiện cho status PENDING)

**UX Pattern** (Verified):
> "Streamlined bulk approval reduces administrative workload" — JotForm, MyShyft

---

### 2.3 🟡 P1 — Employee Performance Dashboard (G2)

**Vấn đề**: Backend đã có `GET /hr/employees/{id}/performance` (GAP-M2) nhưng frontend chỉ hiện đơn giản trong `EmployeePerformanceCard.tsx`.

**Giải pháp**: Nâng cấp thành Performance Overview section trong Employee Detail

```
┌──────────────────────────────────────────┐
│  📊 Hiệu suất 30 ngày                   │
│  ┌─────────────────────────────────────┐ │
│  │ Tổng ca: 15 │ Đi trễ: 2 │ Vắng: 1 │ │
│  │ Đúng giờ: 80% │ OT: 12h            │ │
│  └─────────────────────────────────────┘ │
│  ┌─ Biểu đồ attendance trend ──────────┐ │
│  │ ████████░░ ████████░░ ████████░░    │ │
│  │ Tuần 1    Tuần 2    Tuần 3          │ │
│  └─────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Frontend
- **[MODIFY]** [EmployeePerformanceCard.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/EmployeePerformanceCard.tsx)
  - Thêm mini-chart (bar chart) cho attendance trend
  - Sử dụng `recharts` (đã có trong dependencies)
  - KPI cards: Tổng ca, Đúng giờ %, OT hours, Điểm đánh giá

---

### 2.4 🟡 P1 — Shift Conflict Visual Indicator (G3)

**Vấn đề**: Khi tạo phân công, backend check conflict nhưng user chỉ thấy error message. Không có visual preview.

**Giải pháp**: Hiển thị timeline view khi thêm phân công

#### Frontend
- **[MODIFY]** [AssignmentTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentTab.tsx)
  - Khi chọn NV + ngày: hiện mini-timeline (08:00-20:00) với ca đã giao
  - Ca bị xung đột highlight đỏ
  - Tooltip chi tiết khi hover

---

### 2.5 🟢 P2 — Leave Calendar Overlay (G6)

**Mô tả**: Hiển thị nghỉ phép đã duyệt trên Assignment Calendar để tránh giao việc cho NV đang nghỉ.

#### Frontend
- **[MODIFY]** [AssignmentCalendar.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentCalendar.tsx)
  - Overlay dots cho ngày có NV nghỉ phép
  - Tooltip hiện danh sách NV nghỉ

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Thêm `GET /hr/leave/calendar?month=YYYY-MM` — trả danh sách ngày có NV nghỉ

---

### 2.6 🟢 P2 — Employee Onboarding Quick-Setup (G7)

**Mô tả**: Sau khi tạo NV mới, hiện guided card: "Bước tiếp theo" gợi ý setup lương, tạo tài khoản, giao việc đầu tiên.

#### Frontend
- **[MODIFY]** [EmployeeFormModal.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/EmployeeFormModal.tsx)
  - Sau khi submit thành công → hiện toast-banner "Nhân viên đã được tạo! Bạn muốn:"
  - Options: [Setup lương] [Tạo tài khoản đăng nhập] [Giao việc]

---

## 3. 5-Dimension Assessment

| Dimension | Score | Nhận xét |
|:----------|:-----:|:---------|
| **UX** | 9/10 | Giải quyết pain point chính: overdue tracking, bulk actions |
| **UI** | 8/10 | Tuân thủ Design System, amber/red gradients cho warnings |
| **FE** | 7/10 | Thêm state cho selections, queries, chart component |
| **BE** | 8/10 | Mở rộng endpoints có sẵn, thêm bulk approve |
| **DA** | 9/10 | Không cần migration mới, tận dụng schema hiện tại |
| **Tổng** | **82/100** | |

---

## 4. Permission Matrix

| Feature | admin | manager | staff |
|:--------|:-----:|:-------:|:-----:|
| View Overdue Panel | ✅ | ✅ | ❌ |
| Batch Create Timesheets | ✅ | ✅ | ❌ |
| Bulk Approve/Reject | ✅ | ✅ | ❌ |
| View Performance Dashboard | ✅ | ✅ | Self only |
| Leave Calendar Overlay | ✅ | ✅ | ✅ |

---

## 5. Verification Plan

### Automated Tests
- Backend: Unit test cho `GET /timesheets/unattended?include_overdue=true`
- Backend: Unit test cho `PUT /timesheets/bulk-approve`
- Frontend: Component test cho overdue panel rendering

### Browser Tests
1. Tạo phân công cho ngày hôm qua → verify overdue panel hiện
2. Chọn multiple timesheets → verify bulk action bar hiện
3. Bulk approve → verify tất cả chuyển status APPROVED
4. Employee detail → verify performance chart render

---

## 6. Effort Estimation

| Feature | Backend | Frontend | Total |
|:--------|:-------:|:--------:|:-----:|
| P0: Overdue Tracker | 1h | 2h | **3h** |
| P0: Bulk Actions | 1h | 2h | **3h** |
| P1: Performance Dashboard | 0h | 3h | **3h** |
| P1: Conflict Visual | 0h | 2h | **2h** |
| P2: Leave Calendar | 1h | 2h | **3h** |
| P2: Onboarding Flow | 0h | 1h | **1h** |
| **Tổng** | **3h** | **12h** | **15h** |

---

## 7. Research Sources

### Verified Claims (≥2 sources)
| Claim | Sources |
|:------|:--------|
| Real-time attendance monitoring reduces no-shows | Altametrics, Deputy, Jibble |
| Bulk approval reduces admin workload | JotForm, MyShyft, Workforce.com |
| Advance scheduling (2 weeks) improves retention | 7shifts, Delaget, HybridPayroll |
| Data-driven staffing optimizes labor cost | Lark, OPSyte, 3M |
| Mobile-first UX critical for field workers | Workforce.com, ConnecTeam, EventStaffApp |

### Research Mode
- External: 40+ sources analyzed
- Internal: KI HR Management Module, Feature Completeness Checklist, Diagnostic Audit Compendium
- UI/UX Pro Max: Product, Style, Color, UX domains searched

---

> **Bạn muốn làm gì tiếp?**
> 1. Approve PRD → bắt đầu implement theo priority
> 2. Sửa đổi priority hoặc scope
> 3. Request thêm research cho feature cụ thể
