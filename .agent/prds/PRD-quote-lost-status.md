# PRD: Quote Lost/Expired Status Enhancement

> **Document ID:** PRD-QUOTE-LOST-001  
> **Version:** 1.0  
> **Created:** 2026-02-02  
> **Status:** Draft - Pending Approval

---

## 1. Problem Statement

Hiện tại hệ thống Quản lý Báo giá không có cách xử lý phù hợp khi **khách hàng không chốt báo giá**. Cần bổ sung status và luồng nghiệp vụ để:
- Đánh dấu báo giá bị từ chối bởi khách hàng
- Phân biệt với từ chối nội bộ (REJECTED)
- Hỗ trợ analytics và follow-up

---

## 2. Research Summary

### Best Practices (từ CRM/ERP systems):
- Quote ≠ Order: Quote là sales proposal, Order là execution commitment
- **Quote chỉ convert sang Order khi ACCEPTED**
- Rejected/Lost quotes giữ ở Quote Management để phân tích

### Kết Luận:
> Báo giá không chốt **KHÔNG NÊN** chuyển sang Order Management.  
> Nên giữ ở Quote Management với status riêng: `LOST`

---

## 3. Proposed Solution

### 3.1 New Status Definitions

| Status | Label UI | Color | Use Case |
|:-------|:---------|:------|:---------|
| `LOST` | **Không chốt** | `bg-orange-100 text-orange-700` | Khách hàng từ chối/không phản hồi |
| `EXPIRED` | **Hết hạn** | `bg-gray-100 text-gray-600` | Báo giá quá validity period |

### 3.2 Updated Lifecycle

```
                                        ┌───────────┐
                                   ┌──► │ CONVERTED │ (Thành công)
┌──────────┐     ┌───────┐        │    └───────────┘
│  DRAFT   │ ──► │  NEW  │ ───────┤
└──────────┘     └───────┘        │    ┌──────────┐
     │                            └──► │   LOST   │ (Khách từ chối)
     │                                 └──────────┘
     ▼
┌──────────┐
│ REJECTED │  (Nội bộ từ chối)
└──────────┘
```

### 3.3 Transition Rules

| From Status | Allowed To |
|:------------|:-----------|
| `DRAFT` | NEW, REJECTED |
| `NEW` | APPROVED, CONVERTED, LOST, REJECTED |
| `APPROVED` | CONVERTED, LOST |
| `REJECTED` | DRAFT (revision) |
| `LOST` | DRAFT (reopen), CONVERTED (rare) |
| `EXPIRED` | DRAFT (clone/revise) |

---

## 4. Technical Implementation

### 4.1 Database (PostgreSQL)

```sql
-- Migration: Add LOST and EXPIRED to quote_status enum
ALTER TYPE quote_status ADD VALUE 'LOST' AFTER 'CONVERTED';
ALTER TYPE quote_status ADD VALUE 'EXPIRED' AFTER 'LOST';

-- Optional: Add lost_reason field
ALTER TABLE quotes ADD COLUMN lost_reason VARCHAR(255) NULL;
ALTER TABLE quotes ADD COLUMN lost_at TIMESTAMP WITH TIME ZONE NULL;
```

### 4.2 Backend API

#### [NEW] Endpoint: Mark Quote as Lost
```
POST /quotes/{id}/mark-lost

Request Body:
{
    "reason": "Giá cao hơn đối thủ"  // Optional
}

Response: Quote object with status = LOST
```

#### [MODIFY] Quote entity
```python
class QuoteStatus(str, Enum):
    DRAFT = "DRAFT"
    NEW = "NEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"       # NEW
    EXPIRED = "EXPIRED" # NEW
```

### 4.3 Frontend Changes

#### Quote List Page
- Thêm filter tab: **"Không chốt"** (`status=LOST`)
- Action button trên quote row: **"Đánh dấu không chốt"**

#### Status Badge Colors
```typescript
const statusColors: Record<string, string> = {
    // ... existing ...
    LOST: 'bg-orange-100 text-orange-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
};

const statusLabels: Record<string, string> = {
    // ... existing ...
    LOST: 'Không chốt',
    EXPIRED: 'Hết hạn',
};
```

---

## 5. Acceptance Criteria

- [ ] User có thể đánh dấu quote là "Không chốt" từ Quote List
- [ ] Quote với status LOST hiển thị badge màu cam
- [ ] Quote List có filter cho status LOST
- [ ] Lost quotes không xuất hiện trong Order Management
- [ ] Optional: Có thể nhập lý do không chốt

---

## 6. Out of Scope

- Auto-expiration (cron job đánh dấu EXPIRED)
- Win/Lost analytics dashboard
- Automated follow-up reminders

---

## 7. Estimated Effort

| Component | Effort |
|:----------|:-------|
| Database Migration | 0.5h |
| Backend API | 1h |
| Frontend UI | 2h |
| Testing | 1h |
| **Total** | **~4.5h** |

---

## 8. References

- [Research Document](file:///C:/Users/nguye/.gemini/antigravity/brain/06b7850c-9d0b-47bf-a3e3-f942f85d1d7d/research-quote-cancellation.md)
- Quote Management Module Knowledge Base
- IBM Quote Fulfillment Pipeline Documentation
- bepaid.ch - Rejected Quote Management Best Practices
