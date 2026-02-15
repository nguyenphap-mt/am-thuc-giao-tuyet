# IMPROVEMENT PRD: Module Quote (Báo giá)

> **PRD ID:** `IMPROVEMENT-PRD-quote-20260126`  
> **Module:** Quote  
> **Audit Score:** 80/100 (Grade B)  
> **Processing Mode:** Standard  
> **Created:** 26/01/2026 10:07  
> **Status:** DRAFT

---

## 1. Problem Statement

### 1.1 Audit Summary
Module Quote đạt **80/100 điểm** với các vấn đề chính:
- 1 issue CRITICAL: Status `CANCELLED` chưa implement
- 4 issues HIGH: Component quá lớn, thiếu model file, status mismatch
- 5 issues MEDIUM: Thiếu service layer, business rules validation

### 1.2 Business Impact
| Impact Area | Severity | Description |
|:------------|:--------:|:------------|
| **Data Integrity** | HIGH | Status mismatch FE/BE có thể gây sync issues |
| **Maintainability** | HIGH | Component 2500+ lines khó maintain |
| **Functionality** | MEDIUM | Không có option cancel quote |
| **UX** | LOW | User không thể cancel báo giá đã tạo |

---

## 2. Proposed Solution

### 2.1 Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPROVEMENT ROADMAP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sprint 1: Critical Fixes (Priority 0)                          │
│  ├── [C1] Implement CANCELLED status                            │
│  └── [H4] Sync status enum FE ↔ BE                              │
│                                                                  │
│  Sprint 2: Structure Improvements (Priority 1)                  │
│  ├── [H1] Refactor QuoteCreateComponent                         │
│  ├── [H2] Create quote.model.ts                                 │
│  └── [M3] Create QuoteService layer in BE                       │
│                                                                  │
│  Sprint 3: Business Rules (Priority 2)                          │
│  ├── [M4] Fix BR001: APPROVED-only conversion                   │
│  └── [M5] Add BR002: Minimum 1 item validation                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. User Stories

### US-01: Cancel Quote (CRITICAL)
**As a** Sales Staff  
**I want to** cancel a quote that is no longer needed  
**So that** I can keep my quote list clean and accurate

**Acceptance Criteria:**
- [ ] AC-01.1: Button "Hủy báo giá" visible on DRAFT and PENDING quotes
- [ ] AC-01.2: Confirmation modal before cancel
- [ ] AC-01.3: Status changes to CANCELLED in both FE and BE
- [ ] AC-01.4: CANCELLED quotes cannot be edited or converted
- [ ] AC-01.5: Audit log records who cancelled and when

### US-02: Consistent Status Display
**As a** User  
**I want to** see consistent status labels across the app  
**So that** I understand the current state of my quotes

**Acceptance Criteria:**
- [ ] AC-02.1: Status enum defined once and shared FE/BE
- [ ] AC-02.2: Includes: DRAFT, PENDING, APPROVED, REJECTED, CONVERTED, CANCELLED
- [ ] AC-02.3: Status badge colors consistent with design system

### US-03: Maintainable Code Structure
**As a** Developer  
**I want to** have smaller, focused components  
**So that** I can maintain and test the code easily

**Acceptance Criteria:**
- [ ] AC-03.1: QuoteCreateComponent split into 5+ smaller components
- [ ] AC-03.2: Each component < 500 lines
- [ ] AC-03.3: Shared logic extracted to services
- [ ] AC-03.4: quote.model.ts contains all interfaces and enums

---

## 4. Technical Specifications

### 4.1 [C1] Implement CANCELLED Status

#### Backend Changes

**File:** `backend/modules/quote/domain/models.py`
```python
# Add CANCELLED to status options (line 59)
# Status: DRAFT, PENDING, APPROVED, REJECTED, CONVERTED, CANCELLED
status = Column(String(20), default='DRAFT')
```

**File:** `backend/modules/quote/infrastructure/http_router.py`
```python
# Add new endpoint
@router.post("/{quote_id}/cancel")
async def cancel_quote(
    quote_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Cancel a quote"""
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Only DRAFT and PENDING can be cancelled
    if quote.status not in ['DRAFT', 'PENDING']:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel quote with status: {quote.status}"
        )
    
    quote.status = 'CANCELLED'
    quote.updated_at = datetime.now()
    # quote.cancelled_by = current_user.id  # When auth implemented
    
    await db.commit()
    return {"success": True, "message": "Quote cancelled"}
```

#### Frontend Changes

**File:** `frontend/src/app/quote/models/quote.model.ts` (NEW)
```typescript
export type QuoteStatus = 
  | 'draft' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'converted' 
  | 'cancelled';

export interface Quote {
  id: string;
  code: string;
  customerName: string;
  // ... other fields
  status: QuoteStatus;
}

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  draft: { label: 'Nháp', color: '#64748B', icon: 'edit' },
  pending: { label: 'Chờ duyệt', color: '#F59E0B', icon: 'hourglass_empty' },
  approved: { label: 'Đã duyệt', color: '#10B981', icon: 'check_circle' },
  rejected: { label: 'Từ chối', color: '#EF4444', icon: 'cancel' },
  converted: { label: 'Đã chuyển ĐH', color: '#6366F1', icon: 'swap_horiz' },
  cancelled: { label: 'Đã hủy', color: '#9CA3AF', icon: 'block' },
};
```

**File:** `frontend/src/app/quote/quote.service.ts`
```typescript
// Add method
cancelQuote(id: string): Observable<{ success: boolean; message: string }> {
  return this.http.post<any>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
    tap(() => {
      const current = this.quotesSubject.value;
      const index = current.findIndex(q => q.id === id);
      if (index !== -1) {
        const updated = { ...current[index], status: 'cancelled' as QuoteStatus };
        const newQuotes = [...current];
        newQuotes[index] = updated;
        this.quotesSubject.next(newQuotes);
      }
    })
  );
}
```

---

### 4.2 [H1] Refactor QuoteCreateComponent

#### Proposed Component Structure

```
quote-create/
├── quote-create.component.ts           (Main orchestrator - ~300 lines)
├── components/
│   ├── customer-info/                  (Step 1: Customer & Event info)
│   │   └── customer-info.component.ts  (~200 lines)
│   ├── menu-selection/                 (Step 2: Select menu items)
│   │   └── menu-selection.component.ts (~400 lines)
│   ├── services-selection/             (Step 3: Furniture/Staff services)
│   │   └── services-selection.component.ts (~300 lines)
│   ├── pricing-summary/                (Step 4: Discounts, VAT, Total)
│   │   └── pricing-summary.component.ts (~200 lines)
│   └── quote-preview/                  (Step 5: Final review)
│       └── quote-preview.component.ts  (~300 lines)
└── models/
    └── quote-form.model.ts             (Interfaces for form data)
```

**Benefit:** Each component is focused, testable, and < 500 lines

---

### 4.3 [M3] Create Backend Service Layer

**File:** `backend/modules/quote/services/quote_service.py` (NEW)
```python
class QuoteService:
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def create(self, data: QuoteCreate) -> QuoteModel:
        """Create a new quote with validation"""
        # Validate business rules
        if not data.items:
            raise BusinessRuleError("BR002", "Quote must have at least 1 item")
        
        # CRM integration
        customer_id = await self._sync_customer(data)
        
        # Create quote
        quote = QuoteModel(...)
        self.db.add(quote)
        await self.db.flush()
        
        # Create items & services
        await self._create_items(quote.id, data.items)
        await self._create_services(quote.id, data.services)
        
        await self.db.commit()
        return quote
    
    async def convert_to_order(self, quote_id: UUID) -> OrderModel:
        """Convert quote to order (BR001: APPROVED only)"""
        quote = await self.get(quote_id)
        
        # BR001 enforcement
        if quote.status != 'APPROVED':
            raise BusinessRuleError(
                "BR001", 
                "Only APPROVED quotes can be converted"
            )
        
        # ... conversion logic
```

---

## 5. Non-Functional Requirements

| NFR | Requirement | Metric |
|:----|:------------|:-------|
| **Performance** | Cancel operation < 500ms | P95 latency |
| **Accessibility** | All new buttons have aria-labels | WCAG 2.1 AA |
| **Code Quality** | Each new component < 500 LOC | Code review |
| **Test Coverage** | New code has > 70% coverage | Jest + pytest |

---

## 6. Verification Plan

### 6.1 Automated Tests

```bash
# Backend
pytest backend/modules/quote/tests/ -v

# Frontend
ng test quote --code-coverage
```

### 6.2 Manual Verification

| Test Case | Steps | Expected |
|:----------|:------|:---------|
| Cancel DRAFT quote | 1. Create quote<br>2. Click Cancel | Status = CANCELLED |
| Cancel PENDING quote | 1. Submit quote<br>2. Click Cancel | Status = CANCELLED |
| Cannot cancel APPROVED | 1. Approve quote<br>2. Try Cancel | Button disabled |
| Convert only APPROVED | 1. Try convert PENDING | Error message |

### 6.3 Browser Test

```
/prd-audit quote --verify
```

---

## 7. Effort Estimation

| Task | Complexity | Effort (hours) |
|:-----|:-----------|:--------------:|
| [C1] CANCELLED status | Low | 2 |
| [H2] quote.model.ts | Low | 1 |
| [H4] Status sync FE/BE | Low | 1 |
| [H1] Refactor component | High | 8 |
| [M3] Service layer | Medium | 4 |
| [M4] BR001 fix | Low | 1 |
| [M5] BR002 validation | Low | 1 |
| Testing & QA | Medium | 4 |
| **Total** | | **22 hours** |

**Estimated Timeline:** 3-4 days

---

## 8. Acceptance Criteria Summary

- [ ] All 12 issues from audit resolved
- [ ] Status enum synced FE ↔ BE
- [ ] CANCELLED status fully functional
- [ ] QuoteCreateComponent < 500 lines
- [ ] QuoteService layer created
- [ ] Business rules BR001, BR002 enforced
- [ ] All tests pass
- [ ] Code review approved

---

**Next Steps:**
1. `/implement C1` - Start with CANCELLED status
2. `/implement H2` - Create quote.model.ts
3. `/implement H1` - Refactor component (parallel)
