# Order Detail Improvement PRD V1.0

> **Module:** Orders | **Audit Date:** 2026-02-06 | **Workflow:** prd-audit + ui-ux-pro-max

---

## 1. Executive Summary

### Câu hỏi từ User
1. **Có nên hiển thị nhân viên đã phân công?** → **CÓ, KHUYẾN NGHỊ CAO**
2. **Cần cải tiến gì cho trang chi tiết đơn hàng?** → 8 cải tiến được đề xuất

### Current State (🔍 Audit)

| Section | Status | Issue |
|---------|--------|-------|
| Header & Quick Info | ✅ Good | - |
| Order Status Progress | ✅ Good | Minor visual polish |
| Chi tiết đơn hàng (Items) | ✅ Good | - |
| Thanh toán (Payment) | ✅ Good | - |
| Lãi/Lỗ (Profit/Loss) | ✅ Good | - |
| Chi phí trực tiếp | ✅ Good | - |
| Chi phí nhân công | ⚠️ Needs Work | **Chỉ hiện warning, không hiện danh sách nhân viên** |
| **Nhân viên được phân công** | ❌ Missing | **Không có section riêng** |

---

## 2. Problem Statement

### GAP-01: Không hiển thị nhân viên đã phân công
- **Impact:** Người dùng không biết ai được giao việc cho đơn hàng
- **Current behavior:** Section "Chi phí nhân công" chỉ hiện tip "Chưa có nhân viên được phân công"
- **Expected:** Hiển thị danh sách nhân viên với thông tin chi tiết (tên, vai trò, giờ làm việc)
- **API exists:** `/orders/{id}/staff-costs` trả về `assignments[]` nhưng **không hiển thị trên UI**

### GAP-02: Thiếu thông tin liên lạc nhanh
- Không có nút gọi/nhắn nhân viên trực tiếp từ order detail

### GAP-03: Thiếu timeline hoạt động
- Không có lịch sử các thay đổi trạng thái đơn hàng

### GAP-04: Thiếu notes/comments
- Không có nơi ghi chú nội bộ cho đơn hàng

---

## 3. 5-Dimension Analysis

### 📊 Score Matrix

| Dimension | Score | Max | Weight | Issues |
|:----------|:-----:|:---:|:------:|:-------|
| **UX** | 14 | 20 | 20% | Missing staff visibility, no quick actions |
| **UI** | 16 | 20 | 20% | Good layout, minor polish needed |
| **FE** | 15 | 20 | 20% | API exists but not fully utilized |
| **BE** | 18 | 20 | 20% | All endpoints ready |
| **DA** | 18 | 20 | 20% | Schema supports all features |
| **Total** | **81** | **100** | - | **Grade: B** |

---

## 4. Proposed Improvements

### 4.1 [CRITICAL] Hiển thị Nhân viên Đã Phân công

> **Answer to User's Question:** CÓ, nên hiển thị danh sách nhân viên đã phân công

#### Design Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ 👥 NHÂN VIÊN PHÂN CÔNG                        + Gợi ý nhân viên │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────┐  Nguyen Van Bep         Đầu bếp        8h / 10h       │
│ │  NV  │  📞 0912345678          ✅ Đã xác nhận                 │
│ └──────┘  💰 200,000đ/h          Chi phí: 1,600,000đ           │
│                                                                 │
│ ┌──────┐  Pham Thi Hoa           Phục vụ        4h / 8h        │
│ │  PH  │  📞 0987654321          ⏳ Đang chờ                    │
│ └──────┘  💰 80,000đ/h           Chi phí: 320,000đ             │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│ Tổng: 2 nhân viên  |  12h / 18h  |  💰 1,920,000đ              │
└─────────────────────────────────────────────────────────────────┘
```

#### Technical Spec

```typescript
// File: frontend/src/app/(dashboard)/orders/[id]/page.tsx

// API already returns assignments[] from /orders/{id}/staff-costs
// NEW: Render AssignedStaffSection component

interface AssignedStaff {
    employee_id: string;
    employee_name: string;
    role: string;
    phone?: string;
    hourly_rate: number;
    planned_hours: number;
    actual_hours: number;
    cost: number;
    status: 'CONFIRMED' | 'PENDING' | 'CANCELLED';
}

// Component to display assigned staff
<AssignedStaffCard 
    assignments={staffCosts?.assignments || []}
    totalCost={staffCosts?.total_staff_cost}
    onSuggestClick={() => setShowSuggestionModal(true)}
/>
```

---

### 4.2 [HIGH] Quick Actions cho Nhân viên

| Action | Icon | Behavior |
|--------|------|----------|
| Gọi điện | 📞 | `tel:{phone}` |
| Nhắn tin | 💬 | Open WhatsApp/Zalo |
| Xem profile | 👤 | Navigate to `/hr/employees/{id}` |
| Hủy phân công | ❌ | Confirm modal → API call |

---

### 4.3 [MEDIUM] Timeline Hoạt động

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 LỊCH SỬ HOẠT ĐỘNG                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ● 10:30 - 06/02/2026   Nguyen Phap                             │
│   Đã chuyển trạng thái: Đã xác nhận → Đang thực hiện           │
│                                                                 │
│ ● 09:00 - 06/02/2026   Hệ thống                                │
│   Phân công nhân viên: Nguyen Van Bep (Đầu bếp)                │
│                                                                 │
│ ● 08:30 - 05/02/2026   Nguyen Phap                             │
│   Tạo đơn hàng từ báo giá BG-2026000123                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Backend requirement:** New endpoint `/orders/{id}/activity-log`

---

### 4.4 [MEDIUM] Internal Notes/Comments

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 GHI CHÚ NỘI BỘ                                    + Thêm mới │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Nguyen Phap - 06/02/2026 10:45                                 │
│ Khách yêu cầu đặt 5 bàn VIP ở khu vực sân vườn                 │
│                                                                 │
│ Le Thi Mai - 05/02/2026 14:30                                  │
│ Đã xác nhận với khách về thời gian phục vụ                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Backend requirement:** New table `order_notes`, endpoint `/orders/{id}/notes`

---

### 4.5 [LOW] Visual Improvements

| Item | Current | Proposed |
|------|---------|----------|
| Progress bar | Circles | Filled gradient bar with icons |
| Status badge | Basic | Pulsing animation for IN_PROGRESS |
| Cards | Flat | Subtle hover effects |
| Loading | Generic | Skeleton for each section |

---

## 5. Implementation Priority

| Priority | Item | Effort | Impact |
|:--------:|------|:------:|:------:|
| **P0** | 4.1 - Assigned Staff Section | 4h | 🔴 High |
| **P1** | 4.2 - Quick Actions | 2h | 🟠 Medium |
| **P2** | 4.3 - Activity Timeline | 6h | 🟡 Medium |
| **P3** | 4.4 - Internal Notes | 4h | 🟡 Medium |
| **P4** | 4.5 - Visual Polish | 2h | 🟢 Low |

**Total Estimated Effort:** ~18 hours

---

## 6. Acceptance Criteria

### AC-01: Assigned Staff Section
- [ ] Hiển thị danh sách nhân viên đã phân công khi có data
- [ ] Hiển thị avatar/initials, tên, vai trò
- [ ] Hiển thị số điện thoại với nút gọi nhanh
- [ ] Hiển thị giờ làm và chi phí
- [ ] Có nút "Gợi ý nhân viên" khi chưa có ai được phân công

### AC-02: Staff Quick Actions
- [ ] Click phone → mở dialer
- [ ] Click profile → navigate to HR employee detail
- [ ] Hover effects trên mỗi card

### AC-03: Activity Timeline (nếu implement)
- [ ] Hiển thị tối đa 5 entries gần nhất
- [ ] Có link "Xem tất cả" để mở full history

---

## 7. Screenshots & References

### Current UI State (Audit 2026-02-06)

![Order Detail Audit Recording](file:///C:/Users/nguye/.gemini/antigravity/brain/4a3c2312-0ebb-4522-a4a2-a6d43180d35c/order_detail_audit_1770348640482.webp)

### Staff Suggestion Modal (Working)

![Staff Suggestion Modal](file:///C:/Users/nguye/.gemini/antigravity/brain/4a3c2312-0ebb-4522-a4a2-a6d43180d35c/staff_suggestion_modal_fixed_1770348305597.png)

---

## 8. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `/orders/{id}/staff-costs` API | ✅ Ready | Returns assignments[] |
| StaffSuggestionModal | ✅ Ready | Just fixed in GAP-M3 |
| HR Employee API | ✅ Ready | For linking profiles |
| Activity Log API | ❌ New | Needs implementation for 4.3 |
| Notes API | ❌ New | Needs implementation for 4.4 |

---

## 9. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API response structure change | Low | Medium | Use TypeScript interfaces |
| Performance with many staff | Low | Medium | Limit to 10, paginate |
| UI clutter | Medium | Low | Collapsible sections |

---

## Appendix A: User Decision Required

> [!IMPORTANT]
> **Cần xác nhận từ User trước khi implement:**
> 
> 1. **P0 (Assigned Staff)** - Có đồng ý design layout đề xuất?
> 2. **P2-P3 (Timeline/Notes)** - Có cần các tính năng này không?
> 3. **Priority** - Có muốn thay đổi thứ tự ưu tiên?

---

*Generated by AI Workforce | prd-audit V3.2.2 + ui-ux-pro-max*
