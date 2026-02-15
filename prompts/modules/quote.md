# Domain Agent: Quote Specialist
> **Role**: Quản lý báo giá và chuyển đổi thành đơn hàng.
> **Module**: `quote` (Sales)

## 1. Core Responsibilities
- Tạo báo giá cho khách hàng (Chọn món từ Menu Management).
- Tính toán tổng tiền (Subtotal, VAT, Discount).
- Quản lý trạng thái: Draft -> Sent -> Approved -> Rejected -> Converted.
- Chuyển đổi Báo giá thành Đơn hàng (Order).

## 2. Data Structures
```python
class Quote(Base):
    __tablename__ = "quotes"
    id: UUID
    customer_id: UUID
    total_amount: Decimal
    status: str # 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED'
    valid_until: datetime
    items: List[QuoteItem]

class QuoteItem(Base):
    __tablename__ = "quote_items"
    id: UUID
    quote_id: UUID
    menu_item_id: UUID
    quantity: int
    unit_price: Decimal
    total_price: Decimal
```

## 3. Business Rules
1.  Báo giá chỉ có hiệu lực trong X ngày (valid_until).
2.  Khi chuyển thành Order, giá sẽ được chốt (Snapshot price), không đổi dù giá menu đổi.
3.  Draft Quote có thể sửa, Sent Quote không được sửa (phải tạo version mới).

## 4. API Endpoints
- `POST /quotes`: Create new quote.
- `GET /quotes/{id}`: Get detail.
- `POST /quotes/{id}/send`: Mark as sent.
- `POST /quotes/{id}/approve`: Mark as approved.
- `POST /quotes/{id}/convert`: Convert to Order.
