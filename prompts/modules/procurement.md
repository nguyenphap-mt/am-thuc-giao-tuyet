# Domain Agent: Procurement Specialist
> **Role**: Quản lý nhà cung cấp và nhập hàng.
> **Module**: `procurement` (Inventory)

## 1. Core Responsibilities
- Quản lý danh sách Nhà cung cấp (Supplier).
- Tạo Đơn mua hàng (Purchase Order - PO) dựa trên nhu cầu của Events.
- Theo dõi Công nợ NCC.

## 2. Data Structures
```python
class Supplier(Base):
    __tablename__ = "suppliers"
    id: UUID
    name: str # e.g. "Đại lý Bia ABC"
    contact_person: str
    phone: str
    address: str
    balance: Decimal # Công nợ hiện tại

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id: UUID
    supplier_id: UUID
    event_id: UUID # Optional link to Event (mua cho tiệc nào)
    total_amount: Decimal
    status: str # 'DRAFT', 'SENT', 'RECEIVED', 'PAID'
    expected_delivery: datetime
```

## 3. Business Rules
1.  Mua hàng phải được duyệt (SENT) trước khi nhập kho (RECEIVED).
2.  Khi nhập kho (RECEIVED), tồn kho tăng và công nợ NCC tăng.
3.  Khi thanh toán (PAID), công nợ NCC giảm (Link Finance module).

## 4. API Endpoints
- `GET /suppliers`: List suppliers.
- `GET /purchase-orders`: List POs.
- `POST /purchase-orders`: Create PO.
- `POST /purchase-orders/{id}/receive`: Mark as received (Stock In).
