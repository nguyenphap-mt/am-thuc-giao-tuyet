// HR hooks — employee list, timesheet, leave requests
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

// Types
export interface Employee {
    id: string;
    code?: string;
    full_name: string;
    phone?: string;
    email?: string;
    position?: string;
    department?: string;
    is_active: boolean;
    is_fulltime: boolean;
    daily_rate?: number;
    hourly_rate?: number;
    joined_date?: string;
}

export interface LeaveRequest {
    id: string;
    employee_id: string;
    employee_name?: string;
    type: string; // ANNUAL | SICK | PERSONAL | MATERNITY
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: string; // PENDING | APPROVED | REJECTED
    created_at: string;
}

export interface CreateLeavePayload {
    type: string;
    start_date: string;
    end_date: string;
    reason: string;
}

// Hooks
export function useEmployeeList(search?: string) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('limit', '100');

    return useQuery<Employee[]>({
        queryKey: ['employees', search],
        queryFn: () => api.get(`/hr/employees?${params.toString()}`),
    });
}

// Typed response matching backend /hr/employees/stats
export interface EmployeeStats {
    total: number;
    active: number;
    inactive: number;
    fulltime: number;
    parttime: number;
    by_role: Record<string, number>;
}

export function useEmployeeStats() {
    return useQuery<EmployeeStats>({
        queryKey: ['employee-stats'],
        queryFn: () => api.get('/hr/employees/stats'),
    });
}

export function useLeaveRequests(status?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);

    return useQuery<LeaveRequest[]>({
        queryKey: ['leave-requests', status],
        queryFn: () => api.get(`/hr/leave/requests?${params.toString()}`),
        retry: 1,
    });
}

export function useCreateLeaveRequest() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLeavePayload) =>
            api.post('/hr/leave/requests', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });
}

export function useApproveLeave() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.put(`/hr/leave/requests/${id}/approve`, {}),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });
}

export function useRejectLeave() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.put(`/hr/leave/requests/${id}/reject`, {}),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['leave-requests'] });
        },
    });
}


// ============ Timesheet Types & Hooks ============

export interface TimesheetEntry {
    id: string;
    employee_id: string;
    employee_name?: string;
    employee_role?: string;
    work_date: string;
    actual_start?: string;
    actual_end?: string;
    total_hours: number;
    overtime_hours: number;
    status: string; // PENDING | APPROVED | REJECTED
    source?: string; // MANUAL | AUTO_ORDER
    order_id?: string;
    order_code?: string;
    customer_name?: string;
    event_location?: string;
    notes?: string;
    created_at: string;
}

export function useTimesheets(employeeId?: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (employeeId) params.set('employee_id', employeeId);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    return useQuery<TimesheetEntry[]>({
        queryKey: ['timesheets', employeeId, startDate, endDate],
        queryFn: () => api.get(`/hr/timesheets?${params.toString()}`),
        enabled: !!employeeId,
    });
}

// Self-service: uses /hr/my/timesheets — No HR permission required
export function useMyTimesheets(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    return useQuery<TimesheetEntry[]>({
        queryKey: ['my-timesheets', startDate, endDate],
        queryFn: () => api.get(`/hr/my/timesheets?${params.toString()}`),
    });
}

// Find employee record linked to current logged-in user
export interface EmployeeFull extends Employee {
    user_id?: string;
    role_type?: string;
    base_salary?: number;
}

export function useMyEmployee(userId?: string) {
    return useQuery<EmployeeFull | null>({
        queryKey: ['my-employee', userId],
        queryFn: async () => {
            const employees: EmployeeFull[] = await api.get('/hr/employees?limit=200');
            return employees.find(e => e.user_id === userId) || null;
        },
        enabled: !!userId,
    });
}


// ============ Payroll Types & Hooks ============

export interface PayrollPeriod {
    id: string;
    period_name: string;
    start_date: string;
    end_date: string;
    status: string; // DRAFT | CALCULATED | APPROVED | PAID
    total_gross?: number;
    total_net?: number;
    total_employees?: number;
    notes?: string;
    created_at: string;
}

export interface PayrollItem {
    id: string;
    employee_id: string;
    employee_name?: string;
    employee_role?: string;
    is_fulltime: boolean;
    regular_hours: number;
    overtime_hours: number;
    base_salary: number;
    hourly_rate: number;
    regular_pay: number;
    overtime_pay: number;
    allowance_meal: number;
    allowance_transport: number;
    bonus: number;
    gross_salary: number;
    deduction_social_ins: number;
    deduction_health_ins: number;
    deduction_unemployment: number;
    deduction_advance: number;
    deduction_other: number;
    total_deductions: number;
    net_salary: number;
    working_days: number;
    status: string;
    notes?: string;
}

// Admin: full payroll periods list (requires hr:view_payroll)
export function usePayrollPeriods() {
    return useQuery<PayrollPeriod[]>({
        queryKey: ['payroll-periods'],
        queryFn: () => api.get('/hr/payroll/periods?limit=24'),
    });
}

// Admin: all items for a period (requires hr:view_payroll)
export function usePayrollItems(periodId?: string) {
    return useQuery<PayrollItem[]>({
        queryKey: ['payroll-items', periodId],
        queryFn: () => api.get(`/hr/payroll/periods/${periodId}/items`),
        enabled: !!periodId,
    });
}

// Self-service: payroll periods visible to all (CALCULATED/APPROVED/PAID only)
export function useMyPayrollPeriods() {
    return useQuery<PayrollPeriod[]>({
        queryKey: ['my-payroll-periods'],
        queryFn: () => api.get('/hr/my/payroll/periods?limit=24'),
    });
}

// Self-service: my own payroll item for a period
export function useMyPayrollItem(periodId?: string) {
    return useQuery<PayrollItem | null>({
        queryKey: ['my-payroll-item', periodId],
        queryFn: () => api.get(`/hr/my/payroll/items/${periodId}`),
        enabled: !!periodId,
    });
}


