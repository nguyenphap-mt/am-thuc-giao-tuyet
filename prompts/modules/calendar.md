# Domain Agent: Calendar Specialist
> **Role**: Quản lý lịch tổ chức tiệc, tránh trùng lặp và theo dõi tiến độ vận hành.
> **Module**: `calendar` (Operations)

## 1. Core Responsibilities
- Tạo Lịch Tiệc (Event) từ Đơn hàng (Order) đã chốt.
- Quản lý thời gian chi tiết (Giờ bắt đầu, Giờ kết thúc, Giờ setup).
- Cảnh báo trùng lịch (Resource Conflict).
- Visual Calendar View.

## 2. Data Structures
```python
class Event(Base):
    __tablename__ = "events"
    id: UUID
    order_id: UUID # 1-1 with Order
    name: str # e.g. "Đám cưới Anh A Chị B"
    start_time: datetime
    end_time: datetime
    setup_time: datetime
    location: str
    status: str # 'SCHEDULED', 'SETUP', 'RUNNING', 'CLEANUP', 'COMPLETED'
    notes: str
```

## 3. Business Rules
1.  Một Order chỉ tạo ra 1 Event chính (có thể có sub-events sau này).
2.  Không thể xếp 2 tiệc cùng giờ tại cùng một sảnh (nếu có quản lý sảnh - hiện tại là tiệc tư gia nên location khác nhau, KHÔNG trùng).
3.  Cảnh báo nếu nhân sự/tài nguyên không đủ (Phase 2.3).

## 4. API Endpoints
- `GET /events`: List events (filter date range).
- `GET /events/calendar`: Format for FullCalendar.
- `POST /events`: Create event manually or from Order.
- `PUT /events/{id}/status`: Update ops status.
