'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    IconClock,
    IconCheck,
    IconX,
    IconCalendar,
    IconRefresh,
    IconLogin,
    IconLogout,
    IconClockHour4,
    IconHourglass,
    IconPlus,
    IconLoader2,
    IconChecks,
    IconMapPin,
    IconClipboard,
    IconPencil,
    IconTrash,
    IconEye,
    IconExternalLink,
    IconAlertTriangle,
    IconBolt,
    IconUsers,
    IconPlayerPlay,
    IconNotes,
} from '@tabler/icons-react';
import { Employee } from '@/types';

interface TimesheetResponse {
    id: string;
    tenant_id: string;
    employee_id: string;
    employee_name: string | null;
    employee_role: string | null;
    assignment_id: string | null;
    work_date: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    total_hours: number;
    overtime_hours: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_by: string | null;
    approved_at: string | null;
    source: 'MANUAL' | 'AUTO_ORDER' | 'IMPORT' | null;
    order_id: string | null;
    order_code: string | null;
    customer_name: string | null;
    event_location: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Time editing audit fields
    original_start: string | null;
    original_end: string | null;
    time_edited_by: string | null;
    time_edited_at: string | null;
    edit_reason: string | null;
}

interface UnattendedAssignment {
    assignment_id: string;
    employee_id: string;
    employee_name: string | null;
    employee_role: string | null;
    employee_phone: string | null;
    order_id: string | null;
    order_code: string | null;
    customer_name: string | null;
    event_location: string | null;
    start_time: string | null;
    end_time: string | null;
    assignment_status: string;
}

interface TimesheetSummary {
    employee_id: string;
    employee_name: string;
    total_days: number;
    total_hours: number;
    overtime_hours: number;
    pending_count: number;
    approved_count: number;
}

export default function TimeSheetTab() {
    const queryClient = useQueryClient();

    // Date range state
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
        const today = new Date().toISOString().split('T')[0];
        return { start: today, end: today };
    });
    const [quickFilter, setQuickFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [datePickerOpen, setDatePickerOpen] = useState(false);

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [newTimesheetDate, setNewTimesheetDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    // Time editing state
    const [editingTimesheet, setEditingTimesheet] = useState<string | null>(null);
    const [editField, setEditField] = useState<'start' | 'end' | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isEditingSaving, setIsEditingSaving] = useState(false);

    // Detail drawer state
    const [selectedTimesheet, setSelectedTimesheet] = useState<TimesheetResponse | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editNotes, setEditNotes] = useState('');
    const [editWorkDate, setEditWorkDate] = useState('');

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetResponse | null>(null);

    // Helper: Format date to YYYY-MM-DD
    const formatDateISO = (date: Date) => date.toISOString().split('T')[0];

    // Helper: Get this week range (Monday to Sunday)
    const getThisWeekRange = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: formatDateISO(monday), end: formatDateISO(sunday) };
    };

    // Helper: Get this month range
    const getThisMonthRange = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: formatDateISO(firstDay), end: formatDateISO(lastDay) };
    };

    // Handle quick filter buttons
    const handleQuickFilter = (filter: 'today' | 'week' | 'month') => {
        setQuickFilter(filter);
        if (filter === 'today') {
            const today = formatDateISO(new Date());
            setDateRange({ start: today, end: today });
        } else if (filter === 'week') {
            setDateRange(getThisWeekRange());
        } else if (filter === 'month') {
            setDateRange(getThisMonthRange());
        }
    };

    // Handle custom date range apply
    const handleApplyCustomRange = () => {
        if (customStartDate && customEndDate) {
            setDateRange({ start: customStartDate, end: customEndDate });
            setQuickFilter('custom');
            setDatePickerOpen(false);
        }
    };

    // Format date for display (dd/MM)
    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    // Time editing handlers
    const startTimeEdit = (timesheetId: string, field: 'start' | 'end', currentValue: string | null) => {
        setEditingTimesheet(timesheetId);
        setEditField(field);
        // Extract HH:mm from datetime string
        if (currentValue) {
            const date = new Date(currentValue);
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setEditValue(`${hours}:${minutes}`);
        } else {
            setEditValue('');
        }
    };

    const cancelTimeEdit = () => {
        setEditingTimesheet(null);
        setEditField(null);
        setEditValue('');
    };

    const saveTimeEdit = async (timesheet: TimesheetResponse) => {
        if (!editValue || !editField) return;

        setIsEditingSaving(true);
        try {
            // Build datetime from work_date + edited time
            const [hours, minutes] = editValue.split(':');
            const dateObj = new Date(timesheet.work_date);
            dateObj.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const payload: Record<string, string> = {};
            if (editField === 'start') {
                payload.actual_start = dateObj.toISOString();
            } else {
                payload.actual_end = dateObj.toISOString();
            }

            await api.patch(`/hr/timesheets/${timesheet.id}/time`, payload);
            // Invalidate all timesheet-related queries to refresh UI immediately
            await queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
            cancelTimeEdit();
        } catch (error) {
            console.error('Failed to update time:', error);
            alert('Không thể cập nhật giờ. Vui lòng thử lại.');
        } finally {
            setIsEditingSaving(false);
        }
    };

    // Format time for display with edit indicator
    const formatTimeDisplay = (timesheet: TimesheetResponse, field: 'start' | 'end') => {
        const value = field === 'start' ? timesheet.actual_start : timesheet.actual_end;
        const original = field === 'start' ? timesheet.original_start : timesheet.original_end;

        if (!value) return '--:--';

        const date = new Date(value);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const displayTime = `${hours}:${minutes}`;

        // Check if edited (has original and different from current)
        const isEdited = original && value !== original;

        return { displayTime, isEdited, original };
    };

    // Query: Get employees for select dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            return await api.get<Employee[]>('/hr/employees?is_active=true');
        },
    });

    // Query: Get timesheets for selected date range and status
    const { data: timesheets, isLoading } = useQuery({
        queryKey: ['hr', 'timesheets', dateRange.start, dateRange.end, statusFilter],
        queryFn: async () => {
            const statusParam = statusFilter && statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
            return await api.get<TimesheetResponse[]>(`/hr/timesheets?start_date=${dateRange.start}&end_date=${dateRange.end}${statusParam}`);
        },
    });

    // Query: Get today's timesheets for quick stats
    const { data: todayData } = useQuery({
        queryKey: ['hr', 'timesheets', 'today'],
        queryFn: async () => {
            return await api.get<{
                date: string;
                total_employees: number;
                checked_in: number;
                not_checked_in: number;
                checked_out: number;
                timesheets: TimesheetResponse[];
            }>('/hr/timesheets/today');
        },
    });

    // Query: Get unattended assignments (assigned today but no timesheet yet)
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: unattendedAssignments, isLoading: unattendedLoading } = useQuery({
        queryKey: ['hr', 'timesheets', 'unattended', todayStr],
        queryFn: async () => {
            return await api.get<UnattendedAssignment[]>(`/hr/timesheets/unattended?date=${todayStr}`);
        },
    });

    // Mutation: Batch create timesheets from assignments
    const batchCreateMutation = useMutation({
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

    // Mutation: Single check-in from assignment
    const checkInFromAssignment = useMutation({
        mutationFn: async (assignment: UnattendedAssignment) => {
            const ts = await api.post('/hr/timesheets', {
                employee_id: assignment.employee_id,
                assignment_id: assignment.assignment_id,
                work_date: todayStr,
                notes: `Tạo từ phân công`,
            });
            // Auto check-in
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

    // Mutation: Create timesheet
    const createMutation = useMutation({
        mutationFn: async (data: { employee_id: string; work_date: string }) => {
            return await api.post('/hr/timesheets', data);
        },
        onSuccess: () => {
            toast.success('Tạo chấm công thành công!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
            setCreateModalOpen(false);
            setSelectedEmployeeId('');
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể tạo chấm công');
        },
    });

    // Mutation: Check-in
    const checkInMutation = useMutation({
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

    // Mutation: Check-out
    const checkOutMutation = useMutation({
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

    // Mutation: Approve
    const approveMutation = useMutation({
        mutationFn: async (timesheetId: string) => {
            // BUGFIX: BUG-20260204-003 - Use PUT to match backend @router.put
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

    // Mutation: Reject (BUGFIX: BUG-20260205-001)
    const rejectMutation = useMutation({
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

    // Mutation: Update timesheet (full edit)
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: { work_date?: string; notes?: string } }) => {
            return await api.put<TimesheetResponse>(`/hr/timesheets/${id}`, data);
        },
        onSuccess: (updated) => {
            toast.success('Cập nhật chấm công thành công!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
            setSelectedTimesheet(updated);
            setIsEditing(false);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể cập nhật chấm công');
        },
    });

    // Mutation: Delete timesheet
    const deleteMutation = useMutation({
        mutationFn: async (timesheetId: string) => {
            return await api.delete(`/hr/timesheets/${timesheetId}`);
        },
        onSuccess: () => {
            toast.success('Đã xóa bản chấm công!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
            setDrawerOpen(false);
            setSelectedTimesheet(null);
            setDeleteConfirmOpen(false);
            setTimesheetToDelete(null);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể xóa chấm công');
        },
    });

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        const date = new Date(isoString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-700">Đã duyệt</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-700">Từ chối</Badge>;
            default:
                return <Badge className="bg-amber-100 text-amber-700">Chờ duyệt</Badge>;
        }
    };

    const stats = todayData || {
        total_employees: 0,
        checked_in: 0,
        not_checked_in: 0,
        checked_out: 0,
    };

    const handleCreateTimesheet = () => {
        if (!selectedEmployeeId) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }
        createMutation.mutate({
            employee_id: selectedEmployeeId,
            work_date: newTimesheetDate,
        });
    };

    // Filter out employees who already have timesheet for selected date
    const existingEmployeeIds = new Set(timesheets?.map(ts => ts.employee_id) || []);
    const availableEmployees = employees?.filter(emp => !existingEmployeeIds.has(String(emp.id)));

    // Pending timesheets for bulk selection
    const pendingTimesheets = timesheets?.filter(ts => ts.status === 'PENDING' && ts.actual_end) || [];

    // Bulk approve mutation
    const bulkApproveMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            // Approve each timesheet sequentially
            for (const id of ids) {
                await api.put(`/hr/timesheets/${id}/approve?approved=true`, {});
            }
        },
        onSuccess: () => {
            toast.success(`Đã duyệt ${selectedIds.size} bản chấm công`);
            queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] });
            setSelectedIds(new Set());
        },
        onError: () => {
            toast.error('Duyệt hàng loạt thất bại');
        },
    });

    // Selection handlers
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === pendingTimesheets.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingTimesheets.map(ts => ts.id)));
        }
    };

    const handleBulkApprove = () => {
        if (selectedIds.size === 0) return;
        bulkApproveMutation.mutate(Array.from(selectedIds));
    };

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Tổng NV', value: stats.total_employees, icon: IconClock, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Đã vào', value: stats.checked_in, icon: IconLogin, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Chưa vào', value: stats.not_checked_in, icon: IconHourglass, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { label: 'Đã ra', value: stats.checked_out, icon: IconLogout, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick-Attendance Panel */}
            {unattendedAssignments && unattendedAssignments.length > 0 && (
                <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-100">
                                    <IconBolt className="h-4 w-4 text-amber-600" />
                                </div>
                                Chấm công nhanh
                                <Badge className="bg-amber-100 text-amber-700">
                                    {unattendedAssignments.length} chưa chấm
                                </Badge>
                            </CardTitle>
                            <Button
                                size="sm"
                                onClick={() => batchCreateMutation.mutate({ date: todayStr })}
                                disabled={batchCreateMutation.isPending}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                            >
                                {batchCreateMutation.isPending ? (
                                    <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <IconUsers className="h-4 w-4 mr-1" />
                                )}
                                Tạo tất cả
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-100">
                            {unattendedAssignments.map((assignment) => (
                                <div
                                    key={assignment.assignment_id}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50/50 transition-colors"
                                >
                                    {/* Avatar */}
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium shrink-0 text-sm">
                                        {assignment.employee_name?.charAt(0) || 'N'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{assignment.employee_name || 'Unknown'}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>{assignment.employee_role || '--'}</span>
                                            {assignment.order_code && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-purple-600 font-medium flex items-center gap-0.5">
                                                        <IconClipboard className="h-3 w-3" />
                                                        {assignment.order_code}
                                                    </span>
                                                </>
                                            )}
                                            {assignment.event_location && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-0.5 truncate max-w-[120px]" title={assignment.event_location}>
                                                        <IconMapPin className="h-3 w-3" />
                                                        {assignment.event_location}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    {assignment.start_time && (
                                        <div className="text-xs text-gray-500 text-right">
                                            <p>{new Date(assignment.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                            {assignment.end_time && (
                                                <p className="text-gray-400">
                                                    → {new Date(assignment.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Action */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => checkInFromAssignment.mutate(assignment)}
                                        disabled={checkInFromAssignment.isPending}
                                        className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 shrink-0"
                                    >
                                        <IconPlayerPlay className="h-3.5 w-3.5 mr-1" />
                                        Chấm vào
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Date Filter */}
            <Card>
                <CardHeader className="py-3">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IconCalendar className="h-5 w-5" />
                            Chấm công
                            {dateRange.start !== dateRange.end && (
                                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                    ({formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)})
                                </span>
                            )}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Quick Filter Buttons */}
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <Button
                                    variant={quickFilter === 'today' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleQuickFilter('today')}
                                    className={quickFilter === 'today' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                                >
                                    Hôm nay
                                </Button>
                                <Button
                                    variant={quickFilter === 'week' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleQuickFilter('week')}
                                    className={quickFilter === 'week' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                                >
                                    Tuần này
                                </Button>
                                <Button
                                    variant={quickFilter === 'month' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleQuickFilter('month')}
                                    className={quickFilter === 'month' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                                >
                                    Tháng này
                                </Button>
                            </div>

                            {/* Custom Date Range Picker */}
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={quickFilter === 'custom' ? 'default' : 'outline'}
                                        size="sm"
                                        className={quickFilter === 'custom' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                                    >
                                        <IconCalendar className="h-4 w-4 mr-1" />
                                        {quickFilter === 'custom'
                                            ? `${formatDisplayDate(dateRange.start)} - ${formatDisplayDate(dateRange.end)}`
                                            : 'Tùy chọn'
                                        }
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-4" align="end">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-sm">Chọn khoảng thời gian</h4>
                                        </div>
                                        <div className="grid gap-3">
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs text-gray-500 dark:text-gray-400">Từ ngày</Label>
                                                <Input
                                                    type="date"
                                                    value={customStartDate}
                                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs text-gray-500 dark:text-gray-400">Đến ngày</Label>
                                                <Input
                                                    type="date"
                                                    value={customEndDate}
                                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleApplyCustomRange}
                                            disabled={!customStartDate || !customEndDate}
                                            className="bg-gradient-to-r from-pink-500 to-purple-500"
                                        >
                                            Áp dụng
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-28">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    <SelectItem value="PENDING">Chờ duyệt</SelectItem>
                                    <SelectItem value="APPROVED">Đã duyệt</SelectItem>
                                    <SelectItem value="REJECTED">Từ chối</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['hr', 'timesheets'] })}
                                title="Làm mới"
                            >
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                            {selectedIds.size > 0 && (
                                <Button
                                    onClick={handleBulkApprove}
                                    disabled={bulkApproveMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <IconChecks className="h-4 w-4 mr-1" />
                                    Duyệt {selectedIds.size}
                                </Button>
                            )}
                            <Button
                                onClick={() => setCreateModalOpen(true)}
                                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                            >
                                <IconPlus className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Tạo chấm công</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                {/* Summary Row for multi-day view */}
                {dateRange.start !== dateRange.end && timesheets && timesheets.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-y">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Số bản ghi</p>
                            <p className="font-bold text-lg">{timesheets.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng giờ</p>
                            <p className="font-bold text-lg">{timesheets.reduce((sum, ts) => sum + ts.total_hours, 0).toFixed(1)}h</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Giờ OT</p>
                            <p className="font-bold text-lg text-purple-600">{timesheets.reduce((sum, ts) => sum + ts.overtime_hours, 0).toFixed(1)}h</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chờ duyệt</p>
                            <p className="font-bold text-lg text-amber-600">{timesheets.filter(ts => ts.status === 'PENDING').length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Đã duyệt</p>
                            <p className="font-bold text-lg text-green-600">{timesheets.filter(ts => ts.status === 'APPROVED').length}</p>
                        </div>
                    </div>
                )}
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : !timesheets || timesheets.length === 0 ? (
                        <div className="text-center py-12">
                            <IconClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Không có dữ liệu chấm công</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Chọn ngày khác hoặc tạo chấm công mới</p>
                            <Button variant="outline" onClick={() => setCreateModalOpen(true)}>
                                <IconPlus className="mr-2 h-4 w-4" />
                                Tạo chấm công
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {timesheets.map((ts) => (
                                <div
                                    key={ts.id}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedTimesheet(ts);
                                        setEditNotes(ts.notes || '');
                                        setEditWorkDate(ts.work_date);
                                        setIsEditing(false);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    {/* Checkbox for bulk selection (only pending with actual_end) */}
                                    {ts.status === 'PENDING' && ts.actual_end ? (
                                        <Checkbox
                                            checked={selectedIds.has(ts.id)}
                                            onCheckedChange={() => toggleSelect(ts.id)}
                                            className="h-5 w-5"
                                        />
                                    ) : (
                                        <div className="w-5" />
                                    )}
                                    {/* Avatar */}
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                        {ts.employee_name?.charAt(0) || 'N'}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{ts.employee_name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{ts.employee_role || '--'}</p>
                                        {/* Order context - inline display */}
                                        {ts.order_id && ts.order_code && (
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                    <IconClipboard className="h-3 w-3" />
                                                    {ts.order_code}
                                                </span>
                                                {ts.event_location && (
                                                    <span className="flex items-center gap-1 truncate max-w-[150px]" title={ts.event_location}>
                                                        <IconMapPin className="h-3 w-3" />
                                                        {ts.event_location}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Times - Check-in */}
                                    <div className="text-center min-w-[70px]">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Vào</p>
                                        {editingTimesheet === ts.id && editField === 'start' ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="time"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-20 px-1 py-0.5 text-sm border rounded focus:ring-2 focus:ring-primary"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveTimeEdit(ts)}
                                                    disabled={isEditingSaving}
                                                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <IconCheck className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={cancelTimeEdit}
                                                    className="p-0.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded"
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1 group">
                                                {(() => {
                                                    const timeInfo = formatTimeDisplay(ts, 'start');
                                                    if (typeof timeInfo === 'string') {
                                                        return <span className="text-sm text-gray-400 dark:text-gray-500">{timeInfo}</span>;
                                                    }
                                                    return (
                                                        <>
                                                            <span className={`text-sm font-medium ${ts.actual_start ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                {timeInfo.displayTime}
                                                            </span>
                                                            {timeInfo.isEdited && (
                                                                <span
                                                                    className="text-xs text-blue-500 cursor-help"
                                                                    title={`Gốc: ${formatTime(timeInfo.original as string)}`}
                                                                >
                                                                    🔄
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                {ts.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => startTimeEdit(ts.id, 'start', ts.actual_start)}
                                                        className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-primary transition-opacity"
                                                        title="Chỉnh sửa giờ vào"
                                                    >
                                                        <IconPencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Times - Check-out */}
                                    <div className="text-center min-w-[70px]">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Ra</p>
                                        {editingTimesheet === ts.id && editField === 'end' ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="time"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-20 px-1 py-0.5 text-sm border rounded focus:ring-2 focus:ring-primary"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => saveTimeEdit(ts)}
                                                    disabled={isEditingSaving}
                                                    className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <IconCheck className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={cancelTimeEdit}
                                                    className="p-0.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded"
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1 group">
                                                {(() => {
                                                    const timeInfo = formatTimeDisplay(ts, 'end');
                                                    if (typeof timeInfo === 'string') {
                                                        return <span className="text-sm text-gray-400 dark:text-gray-500">{timeInfo}</span>;
                                                    }
                                                    return (
                                                        <>
                                                            <span className={`text-sm font-medium ${ts.actual_end ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
                                                                {timeInfo.displayTime}
                                                            </span>
                                                            {timeInfo.isEdited && (
                                                                <span
                                                                    className="text-xs text-blue-500 cursor-help"
                                                                    title={`Gốc: ${formatTime(timeInfo.original as string)}`}
                                                                >
                                                                    🔄
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                {ts.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => startTimeEdit(ts.id, 'end', ts.actual_end)}
                                                        className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-primary transition-opacity"
                                                        title="Chỉnh sửa giờ ra"
                                                    >
                                                        <IconPencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hours */}
                                    <div className="text-center w-16">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Giờ</p>
                                        <p className="text-sm font-bold">{ts.total_hours.toFixed(1)}h</p>
                                        {ts.overtime_hours > 0 && (
                                            <p className="text-xs text-purple-600">+{ts.overtime_hours.toFixed(1)} OT</p>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="w-20">
                                        {getStatusBadge(ts.status)}
                                    </div>

                                    {/* Source (BUGFIX: BUG-20260205-001) */}
                                    <div className="w-24">
                                        <Badge variant="outline" className={ts.source === 'AUTO_ORDER' ? 'border-blue-300 text-blue-600 bg-blue-50' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'}>
                                            {ts.source === 'AUTO_ORDER' ? 'Từ đơn hàng' : 'Thủ công'}
                                        </Badge>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {!ts.actual_start && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => checkInMutation.mutate(ts.id)}
                                                disabled={checkInMutation.isPending}
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                            >
                                                <IconLogin className="h-4 w-4 mr-1" />
                                                Vào
                                            </Button>
                                        )}
                                        {ts.actual_start && !ts.actual_end && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => checkOutMutation.mutate(ts.id)}
                                                disabled={checkOutMutation.isPending}
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                            >
                                                <IconLogout className="h-4 w-4 mr-1" />
                                                Ra
                                            </Button>
                                        )}
                                        {ts.status === 'PENDING' && ts.actual_end && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => approveMutation.mutate(ts.id)}
                                                    disabled={approveMutation.isPending}
                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                                >
                                                    <IconCheck className="h-4 w-4 mr-1" />
                                                    Duyệt
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => rejectMutation.mutate(ts.id)}
                                                    disabled={rejectMutation.isPending}
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                >
                                                    <IconX className="h-4 w-4 mr-1" />
                                                    Từ chối
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Timesheet Modal */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconClock className="h-5 w-5" />
                            Tạo chấm công mới
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Ngày làm việc</Label>
                            <Input
                                type="date"
                                value={newTimesheetDate}
                                onChange={(e) => setNewTimesheetDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Nhân viên</Label>
                            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nhân viên" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableEmployees?.length === 0 ? (
                                        <div className="p-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                                            Tất cả nhân viên đã có chấm công
                                        </div>
                                    ) : (
                                        availableEmployees?.map((emp) => (
                                            <SelectItem key={emp.id} value={String(emp.id)}>
                                                {emp.full_name} ({emp.role_type || 'N/A'})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleCreateTimesheet}
                            disabled={createMutation.isPending || !selectedEmployeeId}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                'Tạo chấm công'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Drawer */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <IconEye className="h-5 w-5" />
                            Chi tiết chấm công
                        </SheetTitle>
                    </SheetHeader>

                    {selectedTimesheet && (
                        <div className="mt-6 space-y-6">
                            {/* Employee Info */}
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-lg">
                                    {selectedTimesheet.employee_name?.charAt(0) || 'N'}
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">{selectedTimesheet.employee_name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{selectedTimesheet.employee_role || '--'}</p>
                                </div>
                                <div className="ml-auto">
                                    {getStatusBadge(selectedTimesheet.status)}
                                </div>
                            </div>

                            {/* Order Context */}
                            {selectedTimesheet.order_id && selectedTimesheet.order_code && (
                                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 space-y-2">
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-1">
                                        <IconClipboard className="h-4 w-4" />
                                        Đơn hàng
                                    </p>
                                    <div className="text-sm space-y-1">
                                        <p className="font-medium text-blue-700 dark:text-blue-300">{selectedTimesheet.order_code}</p>
                                        {selectedTimesheet.customer_name && (
                                            <p className="text-blue-600 dark:text-blue-400">KH: {selectedTimesheet.customer_name}</p>
                                        )}
                                        {selectedTimesheet.event_location && (
                                            <p className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                                <IconMapPin className="h-3 w-3" />
                                                {selectedTimesheet.event_location}
                                            </p>
                                        )}
                                    </div>
                                    <a
                                        href={`/orders/${selectedTimesheet.order_id}`}
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <IconExternalLink className="h-3 w-3" />
                                        Xem đơn hàng
                                    </a>
                                </div>
                            )}

                            {/* Time Details */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <IconClock className="h-4 w-4" />
                                    Thời gian
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Ngày làm việc</p>
                                        {isEditing && selectedTimesheet.status === 'PENDING' ? (
                                            <Input
                                                type="date"
                                                value={editWorkDate}
                                                onChange={(e) => setEditWorkDate(e.target.value)}
                                                className="mt-1 h-8 text-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{formatDate(selectedTimesheet.work_date)}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Nguồn</p>
                                        <Badge variant="outline" className={selectedTimesheet.source === 'AUTO_ORDER' ? 'border-blue-300 text-blue-600 bg-blue-50 mt-1' : 'border-gray-300 text-gray-600 mt-1'}>
                                            {selectedTimesheet.source === 'AUTO_ORDER' ? 'Từ đơn hàng' : 'Thủ công'}
                                        </Badge>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Giờ vào</p>
                                        <p className="font-medium text-green-600">{formatTime(selectedTimesheet.actual_start)}</p>
                                        {selectedTimesheet.original_start && selectedTimesheet.actual_start !== selectedTimesheet.original_start && (
                                            <p className="text-xs text-blue-500">Gốc: {formatTime(selectedTimesheet.original_start)}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Giờ ra</p>
                                        <p className="font-medium text-orange-600">{formatTime(selectedTimesheet.actual_end)}</p>
                                        {selectedTimesheet.original_end && selectedTimesheet.actual_end !== selectedTimesheet.original_end && (
                                            <p className="text-xs text-blue-500">Gốc: {formatTime(selectedTimesheet.original_end)}</p>
                                        )}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Tổng giờ</p>
                                        <p className="font-bold text-lg">{selectedTimesheet.total_hours.toFixed(1)}h</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        <p className="text-xs text-gray-500">Giờ OT</p>
                                        <p className="font-bold text-lg text-purple-600">{selectedTimesheet.overtime_hours.toFixed(1)}h</p>
                                    </div>
                                </div>

                                {/* Edit audit trail */}
                                {selectedTimesheet.time_edited_at && (
                                    <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                                        <span>✏️ Sửa lúc: {new Date(selectedTimesheet.time_edited_at).toLocaleString('vi-VN')}</span>
                                        {selectedTimesheet.edit_reason && (
                                            <span className="block">Lý do: {selectedTimesheet.edit_reason}</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                    <IconNotes className="h-4 w-4" />
                                    Ghi chú
                                </p>
                                {isEditing && selectedTimesheet.status === 'PENDING' ? (
                                    <Textarea
                                        value={editNotes}
                                        onChange={(e) => setEditNotes(e.target.value)}
                                        placeholder="Nhập ghi chú..."
                                        rows={3}
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                        {selectedTimesheet.notes || 'Không có ghi chú'}
                                    </p>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="text-xs text-gray-400 space-y-1 border-t pt-3">
                                <p>Tạo lúc: {new Date(selectedTimesheet.created_at).toLocaleString('vi-VN')}</p>
                                <p>Cập nhật: {new Date(selectedTimesheet.updated_at).toLocaleString('vi-VN')}</p>
                                <p>ID: {selectedTimesheet.id}</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 border-t pt-4">
                                {isEditing ? (
                                    <>
                                        <Button
                                            onClick={() => {
                                                updateMutation.mutate({
                                                    id: selectedTimesheet.id,
                                                    data: {
                                                        work_date: editWorkDate !== selectedTimesheet.work_date ? editWorkDate : undefined,
                                                        notes: editNotes !== (selectedTimesheet.notes || '') ? editNotes : undefined,
                                                    },
                                                });
                                            }}
                                            disabled={updateMutation.isPending}
                                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                                        >
                                            {updateMutation.isPending ? (
                                                <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                                            ) : (
                                                <><IconCheck className="mr-2 h-4 w-4" /> Lưu</>
                                            )}
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                                            Hủy
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {selectedTimesheet.status === 'PENDING' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditNotes(selectedTimesheet.notes || '');
                                                        setEditWorkDate(selectedTimesheet.work_date);
                                                        setIsEditing(true);
                                                    }}
                                                >
                                                    <IconPencil className="h-4 w-4 mr-1" />
                                                    Sửa
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => {
                                                        setTimesheetToDelete(selectedTimesheet);
                                                        setDeleteConfirmOpen(true);
                                                    }}
                                                >
                                                    <IconTrash className="h-4 w-4 mr-1" />
                                                    Xóa
                                                </Button>
                                            </>
                                        )}
                                        {selectedTimesheet.order_id && (
                                            <a
                                                href={`/orders/${selectedTimesheet.order_id}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <IconExternalLink className="h-4 w-4" />
                                                Tới đơn hàng
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <IconAlertTriangle className="h-5 w-5" />
                            Xóa bản chấm công
                        </DialogTitle>
                        <DialogDescription>
                            Bạn có chắc muốn xóa bản chấm công này? Hành động này không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    {timesheetToDelete && (
                        <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-sm space-y-1">
                            <p><strong>Nhân viên:</strong> {timesheetToDelete.employee_name}</p>
                            <p><strong>Ngày:</strong> {formatDate(timesheetToDelete.work_date)}</p>
                            {timesheetToDelete.order_code && (
                                <p><strong>Đơn hàng:</strong> {timesheetToDelete.order_code}</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setTimesheetToDelete(null); }}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => timesheetToDelete && deleteMutation.mutate(timesheetToDelete.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...</>
                            ) : (
                                <><IconTrash className="mr-2 h-4 w-4" /> Xóa</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
