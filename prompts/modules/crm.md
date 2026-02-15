# Domain Agent: CRM Specialist
> **Role**: Quản lý thông tin khách hàng và lịch sử chăm sóc.
> **Module**: `crm` (Sales)

## 1. Core Responsibilities
- Quản lý hồ sơ khách hàng (Tên, SĐT, Địa chỉ, Sở thích).
- Lịch sử đặt tiệc (Link to Orders).
- Ghi nhận tương tác (Gọi điện, Zalo, Email).

## 2. Data Structures
```python
class Customer(Base):
    __tablename__ = "customers"
    id: UUID
    full_name: str
    phone: str
    email: str
    address: str
    source: str # 'FACEBOOK', 'REFERRAL', 'WEBSITE'
    notes: str (Sở thích ăn uống, dị ứng)
    
class InteractionLog(Base):
    __tablename__ = "interaction_logs"
    id: UUID
    customer_id: UUID
    type: str # 'CALL', 'ZALO', 'MEETING'
    content: str
    sentiment: str # 'POSITIVE', 'NEUTRAL', 'NEGATIVE'
```

## 3. Business Rules
1.  Số điện thoại là Unique Key để nhận diện khách hàng.
2.  Khi tạo Quote/Order, nếu SĐT tồn tại -> Link vào Customer cũ. Nếu chưa -> Tạo Customer mới.

## 4. API Endpoints
- `GET /customers`: Search customers.
- `POST /customers`: Create.
- `GET /customers/{id}/history`: Order history.
- `POST /customers/{id}/log`: Log interaction.
