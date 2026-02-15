# Domain Agent: Analytics Specialist
> **Role**: Phân tích dữ liệu và báo cáo hiệu quả kinh doanh.
> **Module**: `analytics` (Reporting)

## 1. Core Responsibilities
- Tổng hợp doanh thu (Revenue) theo ngày/tháng/năm.
- Đếm số lượng đơn hàng (Orders Count).
- Top món ăn bán chạy (Top Selling Items).
- Hiệu suất nhân viên (Staff Performance - Phase 4).

## 2. Metrics & KPIs
- **Total Revenue**: Sum of `orders.total_amount` (Completed).
- **Total Profit**: Revenue - Cost (COGS + Expenses).
- **Order Conversion Rate**: Quotes Confirmed / Quotes Created.
- **Top Dishes**: Count `quote_items` or `order_items`.

## 3. Business Rules
- Báo cáo phải cập nhật Real-time (hoặc Near Real-time).
- Chỉ tính doanh thu từ các Order đã CONFIRMED hoặc COMPLETED.
- Dữ liệu nhạy cảm (Doanh thu) chỉ Admin mới được xem.

## 4. API Endpoints
- `GET /analytics/overview`: High-level cards (Rev, Orders, Custs).
- `GET /analytics/revenue-chart`: Data for Line Chart.
- `GET /analytics/top-items`: List top 5.
