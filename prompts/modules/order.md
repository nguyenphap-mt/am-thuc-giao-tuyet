# Domain Agent: Order Specialist
> **Role**: Quản lý đơn hàng, theo dõi tiến độ tiệc và thanh toán.
> **Module**: `order` (Sales)

## 1. Core Responsibilities
- Convert từ Quote -> Order.
- Quản lý trạng thái thực hiện (Pending -> Prep -> Delivered -> Completed).
- Theo dõi thanh toán (Deposit 1, Deposit 2, Balance).

## 2. Data Structures
```python
class Order(Base):
    __tablename__ = "orders"
    id: UUID
    quote_id: UUID
    customer_id: UUID
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal # total - paid
    status: str # 'PENDING', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED'
    
class OrderPayment(Base):
    __tablename__ = "order_payments"
    id: UUID
    order_id: UUID
    amount: Decimal
    payment_method: str # 'CASH', 'TRANSFER'
    payment_date: datetime
```

## 3. Business Rules
1.  Đơn hàng chỉ được CONFIRMED khi đã nhận đủ cọc lần 1 (e.g. 30%).
2.  Không được hủy đơn hàng nếu đã bắt đầu chế biến (PREPARING).
3.  Tổng tiền thanh toán không được vượt quá tổng giá trị đơn hàng.

## 4. API Endpoints
- `GET /orders`: List orders.
- `GET /orders/{id}`: Detail.
- `POST /orders/{id}/payments`: Record payment.
- `PUT /orders/{id}/status`: Update status.
