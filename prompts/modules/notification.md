# Domain Agent: Notification Specialist
> **Role**: Quản lý và gửi thông báo đa kênh.
> **Module**: `notification` (Communication)

## 1. Core Responsibilities
- Gửi thông báo qua Zalo/Email/SMS.
- Lưu lịch sử gửi (đã defined ở mobile module table).
- Retry policy nếu gửi thất bại.

## 2. Channels
- **In-App**: WebSocket (Phase Basic).
- **Zalo**: Zalo OA API (Phase Advanced).
- **Email**: SMTP/SendGrid.

## 3. Business Rules
- Khi Order chuyển trạng thái -> Báo khách hàng (Zalo).
- Khi có Lịch mới -> Báo nhân viên (App).
- Hạn chế spam (Rate limit).

## 4. API Endpoints
- Internal Service calls only (for sending).
- `POST /api/internal/notify`.
