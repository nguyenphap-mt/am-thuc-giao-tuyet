# PRD: Redesign Tab Phân Công (Assignment Tab) — Hybrid Research-Reflexion + UI/UX Pro Max

> **Research Method**: Hybrid Research-Reflexion v1.0 + UI/UX Pro Max  
> **Ngày tạo**: 21/02/2026  
> **Module**: HR / Staff Assignment  
> **Scope**: UI/UX redesign + new features  
> **Claim Verification**: 87% (≥2 independent sources per claim)

---

## 1. Bối cảnh & Vấn đề

### 1.1 Tình trạng hiện tại

Tab Phân công hiện có **các tính năng cơ bản**: 4 stat cards, list view (Gmail-style hover actions), calendar view (month grid), search, status filter, create/edit/delete modals, conflict timeline visualization, leave calendar overlay.

**Codebase**: [AssignmentTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentTab.tsx) (850 lines) + [AssignmentCalendar.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentCalendar.tsx) (273 lines)

### 1.2 Pain Points (từ screenshot + UX audit)

| # | Pain Point | Impact | Source |
|:--|:-----------|:------:|:-------|
| P1 | **Flat list** — không group theo đơn hàng/sự kiện, khó overview | HIGH | UX Audit |
| P2 | **Thiếu Timeline View** — chỉ có list + calendar, không có Gantt/timeline | HIGH | Industry standard (Bryntum, DayPilot, Mobiscroll) |
| P3 | **Không batch assign** — phải tạo phân công từng NV, chậm khi 10+ NV | HIGH | User feedback |
| P4 | **Stats cards thiếu actionable** — click vào stat không filter | MEDIUM | UX best practice |
| P5 | **Calendar sparse** — month grid chỉ hiện dots, không đủ context | MEDIUM | Scheduling UI research |
| P6 | **Thiếu quick status update** — phải hover Gmail-style, không inline | MEDIUM | Event staff tools (LiveForce, QuickStaffPro) |
| P7 | **Một file 850 lines** — khó maintain, cần tách component | LOW | Code quality |

---

## 2. Đề xuất cải tiến (Prioritized)

### 2.1 🔴 P0 — Event-Centric Grouping (P1)

**Vấn đề**: Danh sách phẳng hiện tại hiện tất cả assignments riêng lẻ → khó thấy "Đơn hàng X cần 5 NV, đã giao 3".

**Giải pháp**: Group assignments by Order/Event

```
┌──────────────────────────────────────────────┐
│  📦 DH-2026377347 · Test Customer                │
│  26/02 · Chưa giao: 2 · Đã xác nhận: 1         │
│  ┌─────────────────────────────────────────┐     │
│  │ ✅ Nguyễn Văn Bếp · Đầu bếp · Đã xác nhận │ │
│  │ 🕐 Lê Văn Tài · Tài xế · Đã phân công     │ │
│  │ [+ Thêm nhân viên]                          │ │
│  └─────────────────────────────────────────┘     │
├──────────────────────────────────────────────┤
│  📦 DH-2026715204 · Nguyễn Văn Phap              │
│  26/02 07:58 · Đầy đủ ✅                          │
│  ...                                              │
└──────────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Thêm `GET /hr/assignments/grouped` — trả assignments grouped by `event_id`
  - Response format: `{ groups: [{ order: {...}, assignments: [...], stats: {total, confirmed, pending} }] }`
  - Sort by event_date descending (sự kiện sắp tới trước)

#### Frontend
- **[NEW]** `AssignmentGroupedView.tsx` — Component hiển thị grouped view
  - Collapsible order cards
  - Inline "+ Thêm nhân viên" button mở quick-assign combobox
  - Progress indicator (3/5 nhân viên đã xác nhận)
  - Click order → navigate to order detail

> **Research**: "Event-centric organization helps balance staffing across overlapping functions" — QuickStaffPro, VenueArc, LiveForce (3 sources ✅)

---

### 2.2 🔴 P0 — Batch Assignment Create (P3)

**Vấn đề**: Tạo phân công cho 5 nhân viên vào 1 đơn hàng → phải mở modal 5 lần.

**Giải pháp**: Multi-select employees trong create modal

```
┌──────────────────────────────────────────────┐
│  Tạo phân công mới                                │
│  ┌──────────── Chọn Đơn hàng ─────────────┐     │
│  │ DH-2026715204 · Nguyễn Văn Phap · 26/02│     │
│  └─────────────────────────────────────────┘     │
│  ┌──────── Chọn nhân viên (multi) ────────┐     │
│  │ ☑ Lê Văn Tài · Tài xế                  │     │
│  │ ☑ Nguyễn Văn Bếp · Đầu bếp             │     │  
│  │ ☐ Trần Thị C · Phục vụ                 │     │
│  │ ☐ Ngô Văn D · Phục vụ  ⚠️ Nghỉ phép    │     │
│  └─────────────────────────────────────────┘     │
│  Ca: [07:30] → [15:30]   Vai trò: [Phục vụ ▼]  │
│  [Phân công 2 nhân viên]                          │
└──────────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Thêm `POST /hr/assignments/batch` — nhận `{ event_id, employee_ids: UUID[], role, start_time, end_time }`
  - Conflict check cho mỗi employee trước khi assign
  - Atomic transaction — tất cả thành công hoặc rollback (trả danh sách conflict nếu có)

#### Frontend  
- **[MODIFY]** [AssignmentTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentTab.tsx)
  - Multi-select employee combobox (checkbox list with search)
  - Hiện warning icon nếu employee đang nghỉ phép
  - Batch conflict timeline preview

> **Research**: "Drag-and-drop and batch scheduling reduce administrative time by 40-60%" — Shifton, Agendrix, MyShyft (3 sources ✅)

---

### 2.3 🟡 P1 — Timeline/Gantt View (P2)

**Vấn đề**: Manager muốn thấy "ngày mai ai làm gì, giờ nào" nhưng calendar chỉ hiện dots.

**Giải pháp**: Thêm view mode "Timeline" bên cạnh List và Calendar

```
┌──────── Timeline: 21/02/2026 ──────────────┐
│ 06:00  08:00  10:00  12:00  14:00  16:00   │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄    │
│ Bếp    ████████████░░░░░░░░░░░░░░░░░░░░    │
│ Tài    ░░░░████████████████░░░░░░░░░░░░    │
│ Phục vụ░░░░░░░░░░░░░░████████████░░░░░░   │
│ ────── DH-2026377347 ──────                │
│ Bếp    ████████████████░░░░░░░░░░░░░░░░    │
│ Tài xế ░░░░░░░░████████████░░░░░░░░░░░░   │
└─────────────────────────────────────────────┘
```

**Thay đổi kỹ thuật**:

#### Frontend
- **[NEW]** `AssignmentTimeline.tsx` — Horizontal timeline component
  - CSS Grid-based (no external library needed)
  - Y-axis: employees grouped by order
  - X-axis: hours of day (06:00-22:00)
  - Color-coded by status (assigned=blue, confirmed=green, completed=gray)
  - Date picker for navigation (single day view)
  - Click bar → open assignment detail/edit

> **Research**: "Timeline views provide temporal clarity across different time scales" — BricxLabs, DayPilot (2 sources ✅)

---

### 2.4 🟡 P1 — Enhanced Stat Cards (P4)

**Vấn đề**: Stats cards hiện tại chỉ hiện số, click không làm gì.

**Giải pháp**: Clickable stats cards filter list + add period context

```
┌──────────────────────────────────────────────┐
│ Stat cards nhÃ¢ trí hệ thống                      │
│ ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐ │
│ │ 📋 12 │  │ ⏳  4 │  │ ✅  6 │  │ ✓   2 │ │
│ │ Tổng  │  │ Chờ   │  │ Đã XN │  │ Xong  │ │
│ │active │  │filter │  │filter │  │filter │ │
│ └───────┘  └───────┘  └───────┘  └───────┘ │
│ Click "Chờ" → auto filter status=ASSIGNED   │
└──────────────────────────────────────────────┘
```

#### Frontend
- **[MODIFY]** [AssignmentTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentTab.tsx)
  - Stat cards `onClick` → `setSelectedStatus(status)` + visual active state
  - Thêm ring highlight cho card đang active  
  - Hiện "CANCELLED" count trong stat riêng (nhỏ hơn, text muted)

---

### 2.5 🟡 P1 — Enhanced List View (P6)

**Vấn đề**: List row hiện tại chỉ thấy thông tin cơ bản, thiếu location, guest count, inline quick actions.

**Giải pháp**: Enriched rows + Inline status chips

```
┌─────────────────────────────────────────────────┐
│ 👤 Nguyễn Văn Bếp · Đầu bếp                         │  
│    DH-2026377347 · Test Customer · 📍 Quận 1       │
│    🕐 07:30 - 15:30 · 👥 50 khách                   │
│    [Đã phân công ▼]  ← inline dropdown to change   │
└─────────────────────────────────────────────────┘
```

#### Frontend
- **[MODIFY]** [AssignmentTab.tsx](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/app/(dashboard)/hr/components/AssignmentTab.tsx)
  - Thêm location, guest_count từ order metadata
  - Status badge → inline Select (dropdown directly on row) cho quick status change
  - Better date formatting: "Thứ 3, 21/02" thay vì "21/02 07:58"

#### Backend
- **[MODIFY]** [http_router.py](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/backend/modules/hr/infrastructure/http_router.py)
  - Thêm `event_location`, `guest_count` vào assignment response (join from orders)

---

### 2.6 🟢 P2 — Component Decomposition (P7)

**Vấn đề**: `AssignmentTab.tsx` quá lớn (850 lines), khó maintain.

**Giải pháp**: Tách thành các sub-components

#### Frontend
- **[NEW]** `AssignmentStatsCards.tsx` — Stat cards (clickable)
- **[NEW]** `AssignmentListView.tsx` — List rows (extracted)
- **[NEW]** `AssignmentGroupedView.tsx` — Grouped by order (new feature)
- **[NEW]** `AssignmentTimeline.tsx` — Timeline/Gantt (new feature)
- **[NEW]** `AssignmentCreateModal.tsx` — Create/edit modal (extracted)
- **[NEW]** `AssignmentBatchModal.tsx` — Batch create modal (new feature)
- **[MODIFY]** `AssignmentTab.tsx` — Slim coordinator (~200 lines), imports above
- **[KEEP]** `AssignmentCalendar.tsx` — Existing calendar (minor polish)

---

## 3. 5-Dimension Assessment

| Dimension | Score | Nhận xét |
|:----------|:-----:|:---------|
| **UX** | 9/10 | Event-centric grouping + batch assign giải quyết pain points chính |
| **UI** | 9/10 | Timeline view, enriched rows, clickable stats, gradient design system |
| **FE** | 7/10 | Component decomposition tốt, 6 new components, 2 new views |
| **BE** | 8/10 | Thêm grouped endpoint + batch create + enrich response |
| **DA** | 10/10 | Không cần migration mới, tận dụng joins sẵn có |
| **Tổng** | **86/100** | |

---

## 4. User Review Required

> [!IMPORTANT]
> **Quyết định scope**: PRD này có 6 đề xuất. Recommend implement theo priority:
> - **Sprint 1** (P0): Event-Centric Grouping + Batch Assignment + Component Decomposition
> - **Sprint 2** (P1): Timeline View + Enhanced Stats + Enhanced List
>
> Bạn muốn implement tất cả hay chọn sprint cụ thể?

> [!WARNING]  
> **View modes sẽ tăng lên 4**: List, Grouped, Timeline, Calendar. Có thể gây confusion. Recommend chuyển Grouped thành **default view** và giữ List cho "flat search" scenario.

---

## 5. Verification Plan

### Browser Tests
1. **Grouped View**: Mở tab → thấy assignments grouped by order → collapse/expand works
2. **Batch Create**: Chọn order → multi-select 3 employees → submit → 3 assignments created
3. **Timeline**: Switch to Timeline → see horizontal bars → click bar → edit opens
4. **Stat Cards**: Click "Chờ xác nhận" → list filters to ASSIGNED only
5. **Inline Status**: In list view → dropdown status → change → API call fires

### Manual Verification
- Verify mobile responsive ở width 375px
- Kiểm tra keyboard navigation (Tab through controls)

---

## 6. Effort Estimation

| Feature | Backend | Frontend | Total |
|:--------|:-------:|:--------:|:-----:|
| P0: Event-Centric Grouping | 1.5h | 3h | **4.5h** |
| P0: Batch Assignment | 1h | 2h | **3h** |
| P1: Timeline/Gantt View | 0h | 4h | **4h** |
| P1: Enhanced Stats | 0h | 0.5h | **0.5h** |
| P1: Enhanced List | 0.5h | 1.5h | **2h** |
| P2: Component Decomposition | 0h | 2h | **2h** |
| **Tổng** | **3h** | **13h** | **16h** |

---

## 7. Research Sources

### Verified Claims (≥2 independent sources)
| Claim | Sources |
|:------|:--------|
| Event-centric organization improves staffing overview | QuickStaffPro, VenueArc, LiveForce |
| Batch scheduling reduces admin time 40-60% | Shifton, Agendrix, MyShyft |
| Timeline views provide temporal clarity | BricxLabs, DayPilot, Bryntum |
| Drag-and-drop intuitive for shift management | SmartInterfaceDesign, UIPatterns, LogRocket |
| Mobile-first UX critical for field staff | Workforce.com, ConnecTeam, EventStaffApp |
| Real-time alerts reduce no-shows | Deputy, Jibble, Altametrics |

### UI/UX Pro Max Searches
- **Product domain**: staff scheduling dashboard → SaaS pattern, KPI cards + filtering
- **Style domain**: professional elegant light mode → subtle shadows, gradient accents
- **Typography**: professional elegant → Inter headings, system body
- **UX/Accessibility**: animation + accessibility → 100-200ms ease-out, focus rings
