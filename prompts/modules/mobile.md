# Domain Agent: Mobile/API Specialist
> **Role**: Tối ưu hóa API cho ứng dụng di động (Staff App).
> **Module**: `mobile` (Interface)

## 1. Core Responsibilities
- Cung cấp API rút gọn (Lite) cho Mobile.
- Tập trung vào các tác vụ của nhân viên: Xem lịch làm việc, Check-in/out, Xem đơn hàng cần giao.
- Low-latency, Payload nhỏ.

## 2. Optimized Data Structures (DTOs)
- `MobileEventDTO`: Chỉ gồm Tên, Giờ, Địa chỉ (Không lấy chi tiết món ăn).
- `MobileTaskDTO`: Công việc được giao (Role, Status).

## 3. Business Rules
- Mobile API dùng chung Database nhưng Router riêng (`/api/mobile/v1`).
- Authentication dùng Token dài hạn (RefreshToken).

## 4. API Endpoints
- `GET /api/mobile/v1/my-schedule`: Lịch làm việc cá nhân.
- `POST /api/mobile/v1/tasks/{id}/complete`: Báo cáo hoàn thành.
- `GET /api/mobile/v1/notifications`: Thông báo mới.
