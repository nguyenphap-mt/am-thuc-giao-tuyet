// Calendar Module — Shared Types & Constants

export interface CalendarEvent {
    id: string;
    type: 'ORDER' | 'LEAVE' | 'SHIFT';
    title: string;
    start_date: string;
    end_date: string;
    start_time?: string;
    all_day: boolean;
    color: string;
    status: string;
    details: OrderDetail | LeaveDetail | ShiftDetail;
}

export interface OrderDetail {
    order_id: string;
    order_code: string;
    customer_name: string;
    customer_phone?: string;
    event_type?: string;
    event_address?: string;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
}

export interface LeaveDetail {
    employee_id: string;
    employee_name: string;
    leave_type: string;
    total_days: number;
    reason?: string;
}

export interface ShiftDetail {
    order_id: string;
    order_code: string;
    role: string;
    event_address?: string;
    customer_name: string;
    employee_id: string;
    employee_name: string;
}

export interface CalendarStats {
    total_orders: number;
    total_revenue: number;
    pending_count: number;
    confirmed_count: number;
    completed_count: number;
}

export interface EmployeeAvailability {
    employee_id: string;
    employee_name: string;
    role_type: string;
    status: 'AVAILABLE' | 'ASSIGNED' | 'ON_LEAVE';
    assignment_count: number;
    conflicts: { type: string; description: string }[];
}

export interface AvailabilityResponse {
    date: string;
    total_employees: number;
    available: number;
    assigned: number;
    on_leave: number;
    employees: EmployeeAvailability[];
}

export type ViewMode = 'month' | 'week' | 'day';
export type EventFilter = 'all' | 'orders' | 'leaves' | 'shifts';

// Constants
export const DAYS_OF_WEEK = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const DAYS_OF_WEEK_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

export const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 - 22:00

export const FILTER_OPTIONS: { value: EventFilter; label: string; }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'orders', label: 'Đơn hàng' },
    { value: 'leaves', label: 'Nghỉ phép' },
    { value: 'shifts', label: 'Ca làm' },
];

export const ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-purple-100 text-purple-700' },
    ON_HOLD: { label: 'Tạm hoãn', className: 'bg-orange-100 text-orange-700' },
    COMPLETED: { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

// Helpers
export function getEventShortTitle(event: CalendarEvent): string {
    if (event.type === 'ORDER') {
        const d = event.details as OrderDetail;
        return d.order_code || event.title;
    }
    if (event.type === 'LEAVE') {
        const d = event.details as LeaveDetail;
        return d.employee_name?.split(' ').pop() || 'Nghỉ phép';
    }
    if (event.type === 'SHIFT') {
        const d = event.details as ShiftDetail;
        return d.employee_name?.split(' ').pop() || 'Ca làm';
    }
    return event.title;
}

export function parseEventHour(event: CalendarEvent): number {
    if (event.start_time) {
        const parts = event.start_time.split(':');
        return parseInt(parts[0], 10);
    }
    return 8; // Default to 8:00 AM
}

export function getDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

export function getWeekDates(date: Date): Date[] {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Start from Sunday
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
        dates.push(new Date(d.getFullYear(), d.getMonth(), diff + i));
    }
    return dates;
}
