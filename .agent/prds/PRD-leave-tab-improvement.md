# PRD: Leave Tab Improvement — Module Nhân Sự

> **Version:** 1.0 | **Date:** 26/02/2026  
> **Module:** HR → Nghỉ phép | **Priority:** HIGH  
> **Research:** Hybrid Research-Reflexion (web + codebase grounding)

---

## 1. Problem Statement

Tab "Nghỉ phép" trong module Nhân sự hiện tại thiếu nhiều tính năng quan trọng so với best practices của leave management system, đặc biệt trong ngành F&B/Catering:

### Current State (Screenshot Admin View)
- ✅ Stats cards: Chờ duyệt, Nghỉ hôm nay, Sắp tới, Loại nghỉ phép
- ✅ Đơn của tôi / Tất cả đơn toggle (HR only)
- ✅ Leave request list + Tạo đơn button
- ✅ Số ngày còn lại sidebar with progress bars
- ✅ Approval History modal
- ✅ In-app notifications on approve/reject

### Gaps Identified

| # | Gap | Severity | Source |
|:--|:----|:---------|:-------|
| G1 | **Rejection reason hardcoded** — "Không phù hợp" mặc định, manager không nhập được lý do | HIGH | Codebase audit |
| G2 | **No Team Calendar** — không có giao diện lịch team để xem ai nghỉ khi nào | HIGH | Web research |
| G3 | **Half-day leave UI missing** — DB đã có `is_half_day`, `half_day_period` (migration 040) nhưng FE chưa implement | MEDIUM | Codebase audit |
| G4 | **No overlap detection warning** — khi tạo đơn, không cảnh báo trùng lịch | MEDIUM | Web research |
| G5 | **No cancel from LeaveTab** — employee phải dùng API riêng, button cancel chưa có trên UI cho self-service | MEDIUM | Codebase audit |
| G6 | **Admin stats show for self-service** — Chef thấy "Chờ duyệt: 0" (toàn công ty) thay vì "Đơn chờ duyệt của tôi" | LOW | UX audit |
| G7 | **Leave policy reference** — không hiển thị quy định nghỉ phép cho nhân viên | LOW | Web research |

---

## 2. Proposed Solutions

### Phase 1: Critical Fixes (Sprint 1)

#### G1: Custom Rejection Reason Dialog
- **Problem**: Khi manager reject đơn, frontend gọi `PUT /leave/requests/{id}/reject?reason=Không phù hợp` cố định
- **Solution**: Thêm dialog "Lý do từ chối" với textarea khi bấm nút ❌

```diff
// LeaveTab.tsx — Current
- onClick={() => rejectMutation.mutate(req.id)}
+ onClick={() => openRejectDialog(req.id, req.employee_name)}

// New RejectDialog component
+ <RejectReasonDialog
+   open={rejectDialogOpen}
+   onConfirm={(reason) => rejectMutation.mutate({ id: selectedReqId, reason })}
+ />
```

**Backend**: Endpoint đã hỗ trợ `?reason=` query param ✅

#### G5: Cancel Button for Self-Service
- **Problem**: Employee không có nút hủy đơn PENDING trong LeaveTab
- **Solution**: Thêm nút "Hủy" cho đơn PENDING trong list requests (self-service view)

```diff
// renderRequestList — add cancel for 'my' view
+ {activeView === 'my' && req.status === 'PENDING' && (
+   <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(req.id)}>
+     Hủy
+   </Button>
+ )}
```

**Backend**: Self-service cancel endpoint đã có: `PUT /hr/leave/self/my-requests/{id}/cancel` ✅

---

### Phase 2: UX Enhancement (Sprint 2)

#### G3: Half-Day Leave UI

| Field | Type | Options |
|:------|:-----|:--------|
| `is_half_day` | Toggle/Checkbox | "Nghỉ nửa ngày" |
| `half_day_period` | Radio group (visible when half-day) | "Buổi sáng" / "Buổi chiều" |

- **DB**: Already has columns ✅ (migration 040)
- **Backend**: Needs update to handle `is_half_day` and `half_day_period` in create/response
- **Frontend**: Add toggle + radio in `CreateLeaveRequestModal`
- **Balance calculation**: 0.5 day instead of 1.0 when half-day

#### G4: Overlap Detection Warning
- **When**: Khi chọn ngày trong `CreateLeaveRequestModal`
- **How**: Query `GET /hr/leave/self/my-requests?status=APPROVED` rồi check trùng client-side
- **UI**: Yellow warning banner: "⚠️ Bạn đã có đơn nghỉ phép vào 25/02 - 26/02"

#### G6: Personalized Stats for Self-Service
- **Admin view**: Giữ nguyên (Chờ duyệt toàn công ty, Nghỉ hôm nay, etc.)
- **Employee view**: Đổi stats thành:
  - "Đơn chờ duyệt" (my pending)
  - "Ngày phép còn lại" (my total remaining)
  - "Đã nghỉ năm nay" (my total used)
  - "Loại nghỉ phép" (leave types count)

---

### Phase 3: Advanced Features (Sprint 3 — Optional)

#### G2: Team Leave Calendar
- **Value**: Manager/Admin xem lịch nghỉ phép của team trong tháng
- **UI**: Monthly calendar grid with employee rows
  - Color-coded: Approved (green), Pending (amber), Rejected (red strikethrough)
  - Holiday markers
- **Endpoint**: `GET /hr/leave/team-calendar?month=2026-02&department=all`
- **Component**: New `TeamLeaveCalendar.tsx` trong `hr/components/`
- **Access**: HR admin only (tabbed view: "Tất cả đơn" / "Lịch team")

#### G7: Leave Policy Display
- **Simple**: Info card ở top Leave tab hiển thị quy định nghỉ phép
- **Content**: Từ leave_types table (`days_per_year`, `requires_approval`)
- **UX**: Collapsible card "📋 Quy định nghỉ phép"

---

## 3. Technical Specs

### Files to Modify

| Phase | File | Change |
|:------|:-----|:-------|
| P1 | `LeaveTab.tsx` | Add RejectDialog, Cancel button |
| P1 | **[NEW]** `RejectReasonDialog.tsx` | Modal with textarea |
| P2 | `CreateLeaveRequestModal.tsx` | Half-day toggle, overlap warning |
| P2 | `leave_self_service_router.py` | Handle `is_half_day` in create |
| P2 | `http_router.py` | Handle `is_half_day` in admin create |
| P2 | `LeaveTab.tsx` | Personalized stats |
| P3 | **[NEW]** `TeamLeaveCalendar.tsx` | Calendar grid component |
| P3 | `http_router.py` | `GET /leave/team-calendar` endpoint |

### DB Changes
- **None for Phase 1-2** — existing schema sufficient
- **Phase 3**: Optional `leave_holidays` table for holiday markers

### Self-Service API Impact
Endpoints `leave_self_service_router.py` needs:
- Phase 1: Cancel already exists ✅
- Phase 2: Update `POST /leave/self/my-requests` to accept `is_half_day`, `half_day_period`
- Phase 2: Add overlap check endpoint or use existing requests query

---

## 4. Acceptance Criteria

### Phase 1
- [ ] Manager có thể nhập lý do khi từ chối đơn (dialog với textarea)
- [ ] Lý do hiển thị trong notification và approval history
- [ ] Employee thấy nút "Hủy" bên cạnh đơn PENDING
- [ ] Hủy thành công → balance restored, notification sent

### Phase 2
- [ ] Toggle "Nghỉ nửa ngày" hiển thị trong create modal
- [ ] Chọn Buổi sáng/chiều khi half-day
- [ ] Balance trừ 0.5 thay vì 1.0 cho half-day
- [ ] Warning hiện khi ngày nghỉ trùng với đơn đã approved
- [ ] Stats cards phù hợp với role (admin vs employee)

### Phase 3
- [ ] Calendar grid hiển thị lịch nghỉ theo tháng
- [ ] Filter theo department
- [ ] Info card "Quy định nghỉ phép" collapsible

---

## 5. Effort Estimation

| Phase | Effort | Complexity |
|:------|:-------|:-----------|
| Phase 1 (Reject + Cancel) | 2-3 hours | Low |
| Phase 2 (Half-day + Overlap + Stats) | 4-6 hours | Medium |
| Phase 3 (Calendar + Policy) | 6-8 hours | Medium-High |
| **Total** | **12-17 hours** | |

---

## 6. Research Sources (Verified)

| Claim | Sources | Confidence |
|:------|:--------|:-----------|
| Rejection reason is critical for transparency | hr.com, multirecruit.com, bizimply.com | HIGH ✅ |
| Team calendar prevents scheduling conflicts | myshyft.com, hr.com, pageflows.com | HIGH ✅ |
| Half-day leave common in F&B for flexibility | 7shifts.com, alohahp.com | HIGH ✅ |
| Overlap detection key to prevent staffing gaps | connectsimpli.com, apps365.com | HIGH ✅ |
| Mobile-first design for frontline workers | bizimply.com, tankhwapatra.com | MEDIUM |
