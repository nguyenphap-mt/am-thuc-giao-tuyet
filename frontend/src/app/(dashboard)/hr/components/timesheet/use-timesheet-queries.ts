'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type {
 TimesheetResponse,
 UnattendedAssignment,
 TimesheetTodayStats,
} from './timesheet-types';

// ─── Date helpers ──────────────────────────────────────────

export const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

export const getThisWeekRange = () => {
 const today = new Date();
 const dayOfWeek = today.getDay();
 const monday = new Date(today);
 monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
 const sunday = new Date(monday);
 sunday.setDate(monday.getDate() + 6);
 return { start: formatDateISO(monday), end: formatDateISO(sunday) };
};

export const getThisMonthRange = () => {
 const today = new Date();
 const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
 const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
 return { start: formatDateISO(firstDay), end: formatDateISO(lastDay) };
};

export const formatTime = (isoString: string | null) => {
 if (!isoString) return '--:--';
 const date = new Date(isoString);
 return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (dateStr: string) => {
 const date = new Date(dateStr);
 return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
};

export const formatDisplayDate = (dateStr: string) => {
 const date = new Date(dateStr);
 return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

// ─── Queries ──────────────────────────────────────────────

export function useTimesheets(dateRange: { start: string; end: string }, statusFilter: string) {
 return useQuery({
 queryKey: ['hr', 'timesheets', dateRange.start, dateRange.end, statusFilter],
 queryFn: async () => {
 const statusParam = statusFilter && statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
 return await api.get<TimesheetResponse[]>(
 `/hr/timesheets?start_date=${dateRange.start}&end_date=${dateRange.end}${statusParam}`
 );
 },
 });
}

export function useTodayStats() {
 return useQuery({
 queryKey: ['hr', 'timesheets', 'today'],
 queryFn: async () => {
 return await api.get<TimesheetTodayStats>('/hr/timesheets/today');
 },
 });
}

export function useUnattendedAssignments(date: string) {
 return useQuery({
 queryKey: ['hr', 'timesheets', 'unattended', date],
 queryFn: async () => {
 return await api.get<UnattendedAssignment[]>(`/hr/timesheets/unattended?date=${date}`);
 },
 });
}

export function useOverdueAssignments() {
 return useQuery({
 queryKey: ['hr', 'timesheets', 'overdue'],
 queryFn: async () => {
 return await api.get<UnattendedAssignment[]>(
 '/hr/timesheets/unattended?include_overdue=true&lookback_days=7'
 );
 },
 });
}


// ─── Mutations ────────────────────────────────────────────

export function useBatchCreateTimesheets() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (data: { date: string; assignment_ids?: string[] }) => {
 return await api.post('/hr/timesheets/batch-from-assignments', data);
 },
 onSuccess: (result: any) => {
 toast.success(`Đã tạo ${result.created_count} bản chấm công!`);
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Tạo chấm công hàng loạt thất bại');
 },
 });
}

export function useCheckInFromAssignment(todayStr: string) {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (assignment: UnattendedAssignment) => {
 const ts = await api.post('/hr/timesheets', {
 employee_id: assignment.employee_id,
 assignment_id: assignment.assignment_id,
 work_date: todayStr,
 notes: `Tạo từ phân công`,
 });
 await api.put(`/hr/timesheets/${(ts as any).id}/checkin`, {});
 return ts;
 },
 onSuccess: (_: any, assignment: UnattendedAssignment) => {
 toast.success(`Đã chấm vào cho ${assignment.employee_name}`);
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Chấm công thất bại');
 },
 });
}

export function useCreateTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (data: { employee_id: string; work_date: string }) => {
 return await api.post('/hr/timesheets', data);
 },
 onSuccess: () => {
 toast.success('Tạo chấm công thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Không thể tạo chấm công');
 },
 });
}

export function useCheckIn() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.post(`/hr/timesheets/${timesheetId}/check-in`, {});
 },
 onSuccess: () => {
 toast.success('Check-in thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Check-in thất bại');
 },
 });
}

export function useCheckOut() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.post(`/hr/timesheets/${timesheetId}/check-out`, {});
 },
 onSuccess: () => {
 toast.success('Check-out thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Check-out thất bại');
 },
 });
}

export function useApproveTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.put(`/hr/timesheets/${timesheetId}/approve?approved=true`, {});
 },
 onSuccess: () => {
 toast.success('Đã duyệt timesheet');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Duyệt thất bại');
 },
 });
}

export function useRejectTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.put(`/hr/timesheets/${timesheetId}/approve?approved=false`, {});
 },
 onSuccess: () => {
 toast.success('Đã từ chối timesheet');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Từ chối thất bại');
 },
 });
}

export function useBulkApprove() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (data: { timesheet_ids: string[]; action: 'APPROVE' | 'REJECT' }) => {
 return await api.put<{ message: string; updated_count: number; status: string }>(
 '/hr/timesheets/bulk-approve',
 data
 );
 },
 onSuccess: (result: any) => {
 toast.success(result.message || `Đã xử lý ${result.updated_count} bản chấm công`);
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Thao tác hàng loạt thất bại');
 },
 });
}

export function useUpdateTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async ({ id, data }: { id: string; data: { work_date?: string; notes?: string } }) => {
 return await api.put<TimesheetResponse>(`/hr/timesheets/${id}`, data);
 },
 onSuccess: () => {
 toast.success('Cập nhật chấm công thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Không thể cập nhật chấm công');
 },
 });
}

export function useDeleteTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.delete(`/hr/timesheets/${timesheetId}`);
 },
 onSuccess: () => {
 toast.success('Đã xóa bản chấm công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Không thể xóa chấm công');
 },
 });
}

export function useUpdateTimesheetTime() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async ({ id, payload }: { id: string; payload: Record<string, string> }) => {
 return await api.patch(`/hr/timesheets/${id}/time`, payload);
 },
 onSuccess: () => {
 toast.success('Cập nhật giờ chấm công thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Không thể cập nhật giờ. Vui lòng thử lại.');
 },
 });
}

export function useUnlockTimesheet() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: async (timesheetId: string) => {
 return await api.patch(`/hr/timesheets/${timesheetId}/unlock`);
 },
 onSuccess: () => {
 toast.success('Đã mở khóa bản chấm công. Bạn có thể chỉnh sửa giờ.');
 queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
 },
 onError: () => {
 toast.error('Không thể mở khóa. Vui lòng thử lại.');
 },
 });
}
