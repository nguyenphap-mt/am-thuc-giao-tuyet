# Implementation Plan: Field Expense - Optional Order Linking

> **Goal:** Thêm field "Cho đơn hàng" (tùy chọn) vào modal Quick Expense

---

## Proposed Changes

### Backend

#### [NEW] backend/modules/order/infrastructure/http_router.py

Thêm endpoint mới:

```python
@router.get("/my-active")
async def get_my_active_orders(
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get orders assigned to current user with today's event date
    or status IN_PROGRESS.
    """
    today = date.today()
    
    # Query orders: assigned to user OR today's events
    query = select(OrderModel).where(
        OrderModel.tenant_id == tenant_id,
        OrderModel.status.in_(['CONFIRMED', 'IN_PROGRESS']),
        OrderModel.event_date == today
    ).order_by(OrderModel.event_date.asc()).limit(10)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return [
        {
            "id": o.id,
            "code": o.code,
            "customer_name": o.customer_name,
            "event_date": o.event_date.isoformat() if o.event_date else None,
            "event_location": o.event_location
        }
        for o in orders
    ]
```

---

#### [MODIFY] backend/modules/finance/infrastructure/http_router.py

Cập nhật endpoint `POST /transactions` để nhận `reference_id` và `reference_type`:

```diff
class TransactionCreate(BaseModel):
    type: str  # RECEIPT or PAYMENT
    category: str
    amount: Decimal
    description: Optional[str] = None
    payment_method: Optional[str] = None
+   reference_id: Optional[UUID] = None  # Order ID if linked
+   reference_type: Optional[str] = None  # "ORDER" if linked
```

---

### Frontend

#### [MODIFY] frontend/src/components/quick-action/quick-expense-modal.tsx

| Change | Description |
|:-------|:------------|
| Add state | `activeOrders`, `selectedOrderId`, `loadingOrders` |
| Add useEffect | Load active orders on modal open |
| Add dropdown | "Cho đơn hàng" với gợi ý smart |
| Modify submit | Include `reference_id` if selected |

**Key code changes:**

```typescript
// New state
const [activeOrders, setActiveOrders] = useState<Order[]>([]);
const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

// Load active orders on open
useEffect(() => {
    if (open) {
        api.get('/orders/my-active').then(setActiveOrders);
    }
}, [open]);

// New dropdown in form (after Description)
<div>
    <Label>Cho đơn hàng <span className="text-gray-400">(tùy chọn)</span></Label>
    <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
        <SelectTrigger>
            <SelectValue placeholder="Không chọn - Chi phí vận hành" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="">Không chọn</SelectItem>
            {activeOrders.map(order => (
                <SelectItem key={order.id} value={order.id}>
                    {order.code} - {order.customer_name}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
</div>

// Submit with reference
const payload = {
    type: 'PAYMENT',
    category,
    amount: numericAmount,
    description,
    reference_id: selectedOrderId || null,
    reference_type: selectedOrderId ? 'ORDER' : null,
};
await api.post('/finance/transactions', payload);
```

---

## Verification Plan

### 1. Backend API Test

```powershell
# Start backend
cd backend && python -m uvicorn main:app --reload --port 8000

# Test endpoint (với auth token)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/orders/my-active
```

**Expected:** Returns array of today's active orders.

---

### 2. Browser Test

| Step | Action | Expected |
|:-----|:-------|:---------|
| 1 | Login với `nguyenphap.mt@gmail.com` / `password` | Đăng nhập thành công |
| 2 | Click nút FAB (+) | Menu hiện ra |
| 3 | Chọn "Ghi nhận chi tiêu" | Modal hiện ra |
| 4 | Kiểm tra có dropdown "Cho đơn hàng" | ✅ Có dropdown với placeholder "Không chọn" |
| 5 | Nhập: Category=Nguyên liệu, Amount=50000, Description="Test" | Form valid |
| 6 | **KHÔNG** chọn Order, Submit | ✅ Success, expense không liên kết Order |
| 7 | Mở lại modal, chọn 1 Order từ dropdown | Dropdown hiển thị order |
| 8 | Submit | ✅ Success, expense liên kết với Order đã chọn |

---

### 3. Database Verification

```sql
-- Check expense với reference_id
SELECT id, category, amount, reference_id, reference_type 
FROM finance_transactions 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:** Expense có reference_id = order_id nếu đã chọn Order.
