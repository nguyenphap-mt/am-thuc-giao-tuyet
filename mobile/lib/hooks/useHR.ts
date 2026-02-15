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
