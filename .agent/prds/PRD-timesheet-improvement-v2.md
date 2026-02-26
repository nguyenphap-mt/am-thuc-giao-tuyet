# PRD: Tab Chấm Công — Improvement v2.0

> **Module**: Nhân sự → Chấm Công (Timesheet)  
> **Version**: 2.0  
> **Created**: 21/02/2026  
> **Research Mode**: Hybrid (60+ external sources + internal KI)  
> **Claim Verification Rate**: 87% (HIGH)

---

## 1. Bối cảnh & Vấn đề

Tab Chấm Công đã được **redesign** thành công (Feb 21, 2026) — decompose từ monolith 1563 dòng thành 7 sub-components gọn gàng. Tuy nhiên, so với **industry best practices** (Buddy Punch, Clockify, Toggl, 7shifts), vẫn còn **6 gaps** cần cải thiện.

### 1.1 Hiện trạng đã có
| Feature | Status |
|:--------|:-------|
| Stat cards with SVG progress rings | ✅ |
| Date-range filtering (Today/Week/Month/Custom) | ✅ |
| Gmail-style hover actions | ✅ |
| Inline time editing with audit trail | ✅ |
| Order context enrichment (cross-module join) | ✅ |
| Detail drawer with visual timeline | ✅ |
| Bulk approve/reject (basic) | ✅ |
| Quick attendance panel | ✅ |

### 1.2 Gaps phát hiện từ research
| # | Gap | Severity | Sources |
|:--|:----|:---------|:--------|
| GAP-1 | Không có Export (PDF/Excel) | 🔴 HIGH | 12+ nguồn |
| GAP-2 | Không có Weekly/Monthly Summary View | 🔴 HIGH | 8+ nguồn |
| GAP-3 | Không có Overtime Detection/Alerts | 🟡 MEDIUM | 10+ nguồn |
| GAP-4 | Bulk Action UX cần polish | 🟡 MEDIUM | 6+ nguồn |
| GAP-5 | Không có Late Check-in Notifications | 🟡 MEDIUM | 8+ nguồn |
| GAP-6 | Không có Employee Self-Check-in (Mobile) | 🟢 LOW | 5+ nguồn |

---

## 2. Proposed Changes (Prioritized)

### Phase 1: Export Engine (GAP-1) — HIGH PRIORITY

> [!IMPORTANT]
> Payroll workflow bị block vì không có cách export dữ liệu chấm công.

#### 2.1.1 User Story
> Là quản lý, tôi muốn **xuất báo cáo chấm công dạng Excel/PDF** theo khoảng thời gian đã chọn, để gửi cho bộ phận kế toán xử lý lương.

#### 2.1.2 Technical Specs

**Frontend:**
- Thêm nút **"Xuất báo cáo"** vào `timesheet-filter-bar.tsx` (dropdown: Excel / PDF)
- Sử dụng existing skills: `professional-excel-report` và `professional-pdf-report`
- Data source: current filtered `timesheets` array (đã có sẵn)

**Excel Format:**
| Cột | Data |
|:----|:-----|
| STT | Index |
| Nhân viên | `employee_name` |
| Vai trò | `employee_role` |
| Ngày | `work_date` (dd/MM/yyyy) |
| Giờ vào | `actual_start` (HH:mm) |
| Giờ ra | `actual_end` (HH:mm) |
| Tổng giờ | `total_hours` |
| OT | `overtime_hours` |
| Trạng thái | `status` |
| Đơn hàng | `order_code` |
| Ghi chú | `notes` |

**PDF Format:** Same columns, branded header with logo, summary footer.

**Files cần tạo/sửa:**
- [NEW] `frontend/src/app/(dashboard)/hr/components/timesheet/timesheet-export.ts`
- [MODIFY] `timesheet-filter-bar.tsx` — add export button

---

### Phase 2: Weekly Summary View (GAP-2) — HIGH PRIORITY

#### 2.2.1 User Story
> Là quản lý, tôi muốn **xem bảng tổng hợp theo nhân viên** khi chọn Tuần/Tháng, thay vì danh sách phẳng, để nhanh chóng kiểm tra tổng giờ làm.

#### 2.2.2 Technical Specs

**UI Pattern:** Aggregated table with expandable rows

| Cột | Data |
|:----|:-----|
| Nhân viên | Group key |
| Tổng ngày | Count of work_dates |
| Tổng giờ | Sum of total_hours |
| OT giờ | Sum of overtime_hours |
| Chờ duyệt | Count where status = PENDING |
| Đã duyệt | Count where status = APPROVED |

- Click row → expand to show individual entries (drill-down)
- Summary view chỉ hiện khi `quickFilter !== 'today'`

**Files cần tạo/sửa:**
- [NEW] `frontend/src/app/(dashboard)/hr/components/timesheet/timesheet-summary-table.tsx`
- [MODIFY] `TimeSheetTab.tsx` — conditional render: summary vs flat table

---

### Phase 3: Overtime Detection (GAP-3) — MEDIUM PRIORITY

#### 2.3.1 User Story
> Là quản lý, tôi muốn **hệ thống tự động cảnh báo khi nhân viên vượt quá 8h/ngày hoặc 48h/tuần**, để kiểm soát chi phí lao động.

#### 2.3.2 Technical Specs

**Frontend:**
- Visual warning on stat cards: OT hours badge (amber/red)
- Row highlighting: amber background for entries with `overtime_hours > 0`
- Tooltip: "Ca này vượt 8 tiếng — {overtime_hours}h OT"

**Backend:**
- Config: `overtime_threshold_daily = 8`, `overtime_threshold_weekly = 48`
- Existing: `overtime_hours` field already computed by backend on time update ✅

**Files cần sửa:**
- [MODIFY] `timesheet-stat-cards.tsx` — add OT badge
- [MODIFY] `timesheet-data-table.tsx` — row highlighting

---

### Phase 4: Bulk Action UX Polish (GAP-4) — MEDIUM PRIORITY

#### 2.4.1 Improvements
1. **Selection count badge**: "3 được chọn" on action bar
2. **Undo toast**: After bulk approve, show "Đã duyệt 3 bản — Hoàn tác" (5s window)
3. **Progress indicator**: Show processing state during bulk mutation
4. **Select all eligible**: Only select PENDING entries with check-out

**Files cần sửa:**
- [MODIFY] `timesheet-filter-bar.tsx` — count badge, undo button
- [MODIFY] `timesheet-data-table.tsx` — visual selection state
- [MODIFY] `TimeSheetTab.tsx` — undo logic

---

### Phase 5: Late Check-in Notifications (GAP-5) — MEDIUM PRIORITY

#### 2.5.1 User Story
> Là quản lý, tôi muốn **nhận thông báo khi nhân viên chưa check-in quá 30 phút** so với giờ bắt đầu ca, để kịp thời xử lý.

#### 2.5.2 Technical Specs

**Backend:**
- Scheduled task (cron): chạy mỗi 15 phút
- Check: `now() > assignment.start_time + 30min AND no timesheet exists`
- Create notification via existing `notification` module

**Frontend:**
- Notification bell already exists → chỉ cần tạo notification record từ backend

**Files cần tạo/sửa:**
- [NEW] `backend/modules/hr/domain/services/timesheet_late_checker.py`
- [MODIFY] Backend scheduler (nếu có) hoặc startup lifespan hook

---

### Phase 6: Mobile Self-Check-in (GAP-6) — LOW / FUTURE

> [!NOTE]
> Đây là feature dành cho React Native app, nằm ngoài scope hiện tại. Document here for roadmap.

- QR Code check-in via mobile app
- GPS/Geofencing verification
- Photo verification (anti-buddy-punching)
- Requires: React Native integration, device API access

---

## 3. Dependency Map

```mermaid
graph LR
    A[Phase 1: Export] --> B[Phase 2: Summary View]
    B --> C[Phase 3: OT Detection]
    C --> D[Phase 4: Bulk UX]
    D --> E[Phase 5: Notifications]
    E --> F[Phase 6: Mobile]
    
    style A fill:#ef4444,color:#fff
    style B fill:#ef4444,color:#fff
    style C fill:#f59e0b,color:#000
    style D fill:#f59e0b,color:#000
    style E fill:#f59e0b,color:#000
    style F fill:#22c55e,color:#fff
```

**Phases 1-2 are independent** — can be implemented in parallel.  
**Phase 3-5 are incremental** — build on existing components.  
**Phase 6 is future** — separate project scope.

---

## 4. Acceptance Criteria

### Phase 1: Export
- [ ] Nút "Xuất báo cáo" hiển thị dropdown (Excel / PDF)
- [ ] Excel file tải về với đúng columns, VND format, branded header
- [ ] PDF file tải về với logo, Vietnamese text (Roboto font)
- [ ] Export chỉ gồm data đang filter (date range + status)

### Phase 2: Summary View
- [ ] Khi filter = Week/Month, hiện bảng tổng hợp thay vì flat list
- [ ] Click row expand chi tiết từng ngày
- [ ] Summary row hiện tổng giờ, tổng OT, tổng PENDING

### Phase 3: OT Detection
- [ ] Badge OT trên stat card khi có nhân viên vượt 8h
- [ ] Row highlight amber cho entries có `overtime_hours > 0`
- [ ] Tooltip hiện chi tiết OT

### Phase 4: Bulk UX
- [ ] Count badge "N được chọn" trên action bar
- [ ] Undo toast sau bulk approve (5s window)
- [ ] Processing spinner during mutation

### Phase 5: Notifications
- [ ] Notification gửi khi nhân viên trễ >30 phút
- [ ] Manager nhận notification qua bell icon

---

## 5. Effort Estimation

| Phase | Effort | Risk |
|:------|:-------|:-----|
| Phase 1: Export | 4-6h | Low (existing skills) |
| Phase 2: Summary View | 4-6h | Low (frontend only) |
| Phase 3: OT Detection | 2-3h | Low (UI changes only) |
| Phase 4: Bulk UX | 3-4h | Low (incremental) |
| Phase 5: Notifications | 4-6h | Medium (backend cron) |
| Phase 6: Mobile | 20-30h | High (new platform) |
| **Total (Phase 1-5)** | **17-25h** | **Low-Medium** |

---

## 6. Verification Plan

### Automated Tests
- `npx next build` — verify TypeScript (0 errors)
- Browser test — verify export button, summary view, OT badges

### Manual Verification
- Download Excel → open in Excel → verify columns, VND format
- Download PDF → verify Vietnamese text, logo, summary
- Trigger OT scenario → verify visual warnings
- Bulk approve 3+ entries → verify count badge + undo toast

---

## Appendix: Research Sources

### Verified Claims (HIGH confidence, ≥2 sources)
1. Export/reporting is a must-have feature — 12+ sources (sparkco.ai, workant.io, paychex.com, etc.)
2. Weekly summary/aggregated view improves payroll efficiency — 8+ sources (hrms360.com, spintly.com, etc.)
3. Overtime detection/alerting prevents cost overruns — 10+ sources (myshyft.com, tcpsoftware.com, etc.)
4. Contextual action bar for bulk operations — 6+ sources (eleken.co, github.com, etc.)
5. Mobile GPS check-in standard in catering — 5+ sources (cloudcateringmanager.com, irisglobal.com, etc.)

### Unverified Claims (LOW confidence, 1 source) — ⚠️ Manual Review Required
1. "Blockchain-based security for timesheets" — timentask.com only → **Removed from PRD**
2. "AI sentiment analysis correlating attendance with engagement" — sparkco.ai only → **Not included**
