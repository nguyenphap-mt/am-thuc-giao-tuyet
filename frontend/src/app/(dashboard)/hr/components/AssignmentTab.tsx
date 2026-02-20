'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    IconUserPlus,
    IconRefresh,
    IconCalendarEvent,
    IconClock,
    IconUsers,
    IconAlertTriangle,
    IconTrash,
    IconEdit,
    IconCheck,
    IconX,
    IconLoader2,
    IconList,
    IconCalendar,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import AssignmentCalendar from './AssignmentCalendar';
import { OrderSearchCombobox } from './OrderSearchCombobox';

// Types
interface Assignment {
    id: string;
    tenant_id: string;
    event_id: string | null;
    employee_id: string | null;
    employee_name: string | null;
    employee_phone: string | null;
    employee_role_type: string | null;
    role: string | null;
    start_time: string | null;
    end_time: string | null;
    status: 'ASSIGNED' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
    check_in_time: string | null;
    check_out_time: string | null;
    notes: string | null;
    order_code: string | null;           // Order code (e.g., DH-202602-001)
    order_customer_name: string | null;  // Customer name from order
    created_at: string;
    updated_at: string;
}

interface Employee {
    id: string;
    full_name: string;
    role_type: string;
    phone: string | null;
    is_fulltime: boolean;
}

interface Order {
    id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    event_time?: string;
    event_location?: string;  // Location of the event
    guest_count?: number;     // Number of guests
    status: string;
}

interface ConflictCheck {
    has_conflict: boolean;
    conflicts: Array<{
        assignment_id: string;
        event_id: string | null;
        start_time: string | null;
        end_time: string | null;
        status: string;
    }>;
}

export default function AssignmentTab() {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [conflictWarning, setConflictWarning] = useState<ConflictCheck | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Form state for new assignment
    const [formData, setFormData] = useState({
        event_id: '',
        employee_id: '',
        role: '',
        start_time: '',
        end_time: '',
        notes: '',
    });

    // Fetch assignments
    const { data: assignments, isLoading, refetch } = useQuery({
        queryKey: ['hr-assignments', selectedStatus],
        queryFn: async () => {
            const params = selectedStatus !== 'all' ? `?status=${selectedStatus}` : '';
            return api.get<Assignment[]>(`/hr/assignments${params}`);
        },
    });

    // Fetch employees for dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees-active'],
        queryFn: async () => {
            const result = await api.get<Employee[]>('/hr/employees?is_active=true');
            return result;
        },
    });

    // Fetch orders for dropdown (CONFIRMED or higher)
    const { data: orders } = useQuery({
        queryKey: ['orders-for-assignment'],
        queryFn: async () => {
            try {
                // BUGFIX: BUG-20260204-001
                // Root Cause: Incorrect API path - was /order/orders, should be /orders
                // (api.ts already includes /api/v1 prefix)
                const result = await api.get<{ items: Order[] } | Order[]>('/orders?status=CONFIRMED&limit=50');
                // Handle both array and object response formats
                return Array.isArray(result) ? result : result.items || [];
            } catch {
                return [];
            }
        },
    });

    // G6: Fetch leave calendar data for current month
    const { data: leaveDays } = useQuery({
        queryKey: ['hr-leave-calendar', format(currentMonth, 'yyyy-MM')],
        queryFn: async () => {
            try {
                return await api.get<Array<{ date: string; employees: Array<{ employee_id: string; employee_name: string; leave_type: string; total_days: number }> }>>(
                    `/hr/leave/calendar?month=${format(currentMonth, 'yyyy-MM')}`
                );
            } catch {
                return [];
            }
        },
        enabled: viewMode === 'calendar',
    });

    // Create assignment mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            return api.post('/hr/assignments', {
                event_id: data.event_id,
                employee_id: data.employee_id,
                role: data.role || null,
                start_time: data.start_time ? new Date(data.start_time).toISOString() : null,
                end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
                notes: data.notes || null,
            });
        },
        onSuccess: () => {
            toast.success('Phân công thành công');
            queryClient.invalidateQueries({ queryKey: ['hr-assignments'] });
            resetForm();
            setModalOpen(false);
        },
        onError: (error: any) => {
            if (error?.response?.status === 409) {
                toast.error('Nhân viên đã có phân công khác trong thời gian này!');
            } else {
                toast.error('Lỗi khi tạo phân công');
            }
        },
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return api.put(`/hr/assignments/${id}/status?status=${status}`);
        },
        onSuccess: () => {
            toast.success('Cập nhật trạng thái thành công');
            queryClient.invalidateQueries({ queryKey: ['hr-assignments'] });
        },
        onError: () => {
            toast.error('Lỗi khi cập nhật trạng thái');
        },
    });

    // Delete/cancel mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/hr/assignments/${id}`);
        },
        onSuccess: () => {
            toast.success('Đã hủy phân công');
            queryClient.invalidateQueries({ queryKey: ['hr-assignments'] });
            setDeleteModalOpen(false);
            setSelectedAssignment(null);
        },
        onError: () => {
            toast.error('Lỗi khi hủy phân công');
        },
    });

    // Check conflict when employee and time range selected
    const checkConflict = async () => {
        if (!formData.employee_id || !formData.start_time || !formData.end_time) {
            setConflictWarning(null);
            return;
        }
        try {
            const result = await api.post<ConflictCheck>(
                `/hr/assignments/check-conflict?employee_id=${formData.employee_id}&start_time=${new Date(formData.start_time).toISOString()}&end_time=${new Date(formData.end_time).toISOString()}`
            );
            setConflictWarning(result);
        } catch {
            setConflictWarning(null);
        }
    };

    const resetForm = () => {
        setFormData({
            event_id: '',
            employee_id: '',
            role: '',
            start_time: '',
            end_time: '',
            notes: '',
        });
        setConflictWarning(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setModalOpen(true);
    };

    const handleDelete = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
        setDeleteModalOpen(true);
    };

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return '--';
        try {
            return format(parseISO(isoString), 'dd/MM HH:mm', { locale: vi });
        } catch {
            return '--';
        }
    };

    // Helper to format order date/time for display
    const formatOrderDateTime = (order: Order) => {
        try {
            const date = format(parseISO(order.event_date), 'dd/MM', { locale: vi });
            const time = order.event_time ? order.event_time.slice(0, 5) : '';
            return time ? `${date} ${time}` : date;
        } catch {
            return '--';
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'ASSIGNED': 'bg-blue-100 text-blue-700',
            'CONFIRMED': 'bg-green-100 text-green-700',
            'CHECKED_IN': 'bg-purple-100 text-purple-700',
            'COMPLETED': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
            'CANCELLED': 'bg-red-100 text-red-700',
        };
        const labels: Record<string, string> = {
            'ASSIGNED': 'Đã phân công',
            'CONFIRMED': 'Đã xác nhận',
            'CHECKED_IN': 'Đã check-in',
            'COMPLETED': 'Hoàn thành',
            'CANCELLED': 'Đã hủy',
        };
        return <Badge className={styles[status] || 'bg-gray-100 dark:bg-gray-800'}>{labels[status] || status}</Badge>;
    };

    const getRoleLabel = (role: string | null) => {
        const roles: Record<string, string> = {
            'WAITER': 'Phục vụ',
            'CHEF': 'Đầu bếp',
            'KITCHEN': 'Nhân viên bếp',
            'DRIVER': 'Tài xế',
            'LEAD': 'Trưởng nhóm',
            'MANAGER': 'Quản lý',
        };
        return roles[role || ''] || role || '--';
    };

    // Sort orders by event_date ascending
    const sortedOrders = orders
        ?.slice()
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    // Stats
    const stats = {
        total: assignments?.length || 0,
        assigned: assignments?.filter(a => a.status === 'ASSIGNED').length || 0,
        confirmed: assignments?.filter(a => a.status === 'CONFIRMED').length || 0,
        completed: assignments?.filter(a => a.status === 'COMPLETED').length || 0,
    };

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Tổng', value: stats.total, icon: IconUsers, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Chờ xác nhận', value: stats.assigned, icon: IconClock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { label: 'Đã xác nhận', value: stats.confirmed, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Hoàn thành', value: stats.completed, icon: IconCalendarEvent, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
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

            {/* Actions & Filters */}
            <Card>
                <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <IconCalendarEvent className="h-5 w-5" />
                        Phân công nhân viên
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-[140px] h-8 text-sm">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="ASSIGNED">Đã phân công</SelectItem>
                                <SelectItem value="CONFIRMED">Đã xác nhận</SelectItem>
                                <SelectItem value="CHECKED_IN">Đã check-in</SelectItem>
                                <SelectItem value="COMPLETED">Hoàn thành</SelectItem>
                                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* View Toggle */}
                        <div className="flex border rounded-md">
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'ghost'}
                                size="icon"
                                className={`h-8 w-8 rounded-r-none ${viewMode === 'list' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <IconList className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                                size="icon"
                                className={`h-8 w-8 rounded-l-none ${viewMode === 'calendar' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                                onClick={() => setViewMode('calendar')}
                            >
                                <IconCalendar className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Month Navigation (only in calendar view) */}
                        {viewMode === 'calendar' && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                >
                                    <IconChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium w-24 text-center">
                                    {format(currentMonth, 'MM/yyyy')}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                >
                                    <IconChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                            <IconRefresh className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90"
                            onClick={handleOpenCreate}
                        >
                            <IconUserPlus className="mr-2 h-4 w-4" />
                            Thêm phân công
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : viewMode === 'calendar' ? (
                        /* Calendar View */
                        <div className="p-4">
                            <AssignmentCalendar
                                assignments={(assignments || []).map(a => ({
                                    ...a,
                                    event_code: '',
                                    event_name: a.notes || 'Sự kiện',
                                    event_location: '',
                                    event_date: a.start_time || '',
                                }))}
                                currentMonth={currentMonth}
                                leaveDays={leaveDays || []}
                            />
                        </div>
                    ) : !assignments || assignments.length === 0 ? (
                        <div className="text-center py-16">
                            <IconUsers className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có phân công nào</p>
                            <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                                <IconUserPlus className="mr-2 h-4 w-4" />
                                Tạo phân công đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {assignments.map((assignment) => {
                                const isSelected = selectedAssignment?.id === assignment.id;
                                return (
                                    <div
                                        key={assignment.id}
                                        className={`relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors group ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'}`}
                                    >
                                        {/* Employee Avatar */}
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                            {assignment.employee_name?.charAt(0) || 'N'}
                                        </div>

                                        {/* Employee Info */}
                                        <div className="w-48 shrink-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {assignment.employee_name || 'N/A'}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-xs mt-0.5">
                                                {getRoleLabel(assignment.role || assignment.employee_role_type)}
                                            </Badge>
                                        </div>

                                        {/* Order Column - NEW */}
                                        <div className="w-48 shrink-0 hidden md:block">
                                            {assignment.order_code ? (
                                                <div>
                                                    <span className="font-medium text-purple-700 text-sm">
                                                        {assignment.order_code}
                                                    </span>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {assignment.order_customer_name || '--'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-sm">--</span>
                                            )}
                                        </div>

                                        {/* Time Range */}
                                        <div className="hidden lg:flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 w-40 shrink-0">
                                            <IconClock className="h-3.5 w-3.5" />
                                            <span>{formatDateTime(assignment.start_time)} - {formatDateTime(assignment.end_time)}</span>
                                        </div>

                                        {/* Status - fills remaining space */}
                                        <div className="flex-1 flex justify-end">
                                            {getStatusBadge(assignment.status)}
                                        </div>

                                        {/* Gmail-style Overlay Actions */}
                                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-6 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex bg-gradient-to-l ${isSelected ? 'from-blue-50 via-blue-50' : 'from-gray-50 via-gray-50'} to-transparent`}>
                                            {assignment.status === 'ASSIGNED' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 bg-white/80 hover:bg-white text-green-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateStatusMutation.mutate({ id: assignment.id, status: 'CONFIRMED' });
                                                    }}
                                                    title="Xác nhận"
                                                >
                                                    <IconCheck className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {assignment.status !== 'CANCELLED' && assignment.status !== 'COMPLETED' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 bg-white/80 hover:bg-white text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(assignment);
                                                    }}
                                                    title="Hủy phân công"
                                                >
                                                    <IconTrash className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Assignment Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Tạo phân công mới</DialogTitle>
                        <DialogDescription>
                            Chọn nhân viên và đơn hàng để phân công
                        </DialogDescription>
                    </DialogHeader>

                    {/* Conflict Warning */}
                    {conflictWarning?.has_conflict && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                            <IconAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="text-sm font-medium text-amber-800">Đã có phân công trùng!</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Nhân viên đã được phân công {conflictWarning.conflicts.length} ca khác trong thời gian này.
                                </p>
                                {/* G3: Shift Conflict Visual Timeline */}
                                <div className="mt-3 bg-white rounded-md p-2 border border-amber-100">
                                    <p className="text-[10px] text-gray-500 mb-1.5 font-medium">Timeline ca làm việc (08:00 – 20:00)</p>
                                    <div className="relative h-6 bg-gray-50 rounded-full overflow-hidden border">
                                        {/* Hour markers */}
                                        {[8, 10, 12, 14, 16, 18, 20].map(h => (
                                            <div key={h} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${((h - 8) / 12) * 100}%` }}>
                                                <span className="absolute -top-0.5 -translate-x-1/2 text-[8px] text-gray-400">{h}:00</span>
                                            </div>
                                        ))}
                                        {/* Existing shifts (red for conflicts) */}
                                        {conflictWarning.conflicts.map((c, i) => {
                                            const cStart = c.start_time ? new Date(c.start_time).getHours() + new Date(c.start_time).getMinutes() / 60 : 8;
                                            const cEnd = c.end_time ? new Date(c.end_time).getHours() + new Date(c.end_time).getMinutes() / 60 : 20;
                                            const left = Math.max(0, ((cStart - 8) / 12) * 100);
                                            const width = Math.min(100 - left, ((cEnd - cStart) / 12) * 100);
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute top-1 h-4 bg-red-400 rounded-sm opacity-80"
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                    title={`Ca: ${c.start_time ? format(parseISO(c.start_time), 'HH:mm') : '--'} - ${c.end_time ? format(parseISO(c.end_time), 'HH:mm') : '--'}`}
                                                />
                                            );
                                        })}
                                        {/* New shift (green) */}
                                        {formData.start_time && formData.end_time && (() => {
                                            const newStart = new Date(formData.start_time).getHours() + new Date(formData.start_time).getMinutes() / 60;
                                            const newEnd = new Date(formData.end_time).getHours() + new Date(formData.end_time).getMinutes() / 60;
                                            const left = Math.max(0, ((newStart - 8) / 12) * 100);
                                            const width = Math.min(100 - left, ((newEnd - newStart) / 12) * 100);
                                            return (
                                                <div
                                                    className="absolute top-1 h-4 bg-green-400 rounded-sm opacity-60 border-2 border-green-600 border-dashed"
                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                    title="Ca mới (đang tạo)"
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                                            <span className="text-[9px] text-gray-500">Ca trùng</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2.5 h-2.5 rounded-sm bg-green-400 border border-green-600 border-dashed" />
                                            <span className="text-[9px] text-gray-500">Ca mới</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 py-4">
                        {/* Order Select - Phase 3: Searchable Combobox */}
                        <div className="grid gap-2">
                            <Label>Đơn hàng / Sự kiện *</Label>
                            <OrderSearchCombobox
                                orders={sortedOrders || []}
                                value={formData.event_id}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, event_id: v }))}
                                placeholder="Tìm đơn hàng..."
                            />
                        </div>

                        {/* Employee Select */}
                        <div className="grid gap-2">
                            <Label>Nhân viên *</Label>
                            <Select
                                value={formData.employee_id}
                                onValueChange={(v) => {
                                    setFormData(prev => ({ ...prev, employee_id: v }));
                                    // Will trigger conflict check when all fields are filled
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn nhân viên..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.full_name} ({getRoleLabel(emp.role_type)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Role Override */}
                        <div className="grid gap-2">
                            <Label>Vai trò (tùy chọn)</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Giữ nguyên vai trò mặc định" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WAITER">Phục vụ</SelectItem>
                                    <SelectItem value="CHEF">Đầu bếp</SelectItem>
                                    <SelectItem value="KITCHEN">Nhân viên bếp</SelectItem>
                                    <SelectItem value="DRIVER">Tài xế</SelectItem>
                                    <SelectItem value="LEAD">Trưởng nhóm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label>Bắt đầu</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.start_time}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, start_time: e.target.value }));
                                    }}
                                    onBlur={checkConflict}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Kết thúc</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.end_time}
                                    onChange={(e) => {
                                        setFormData(prev => ({ ...prev, end_time: e.target.value }));
                                    }}
                                    onBlur={checkConflict}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="grid gap-2">
                            <Label>Ghi chú</Label>
                            <Textarea
                                placeholder="Ghi chú thêm..."
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={() => createMutation.mutate(formData)}
                            disabled={!formData.event_id || !formData.employee_id || createMutation.isPending}
                            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        >
                            {createMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tạo phân công
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Xác nhận hủy phân công</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc muốn hủy phân công của{' '}
                            <strong>{selectedAssignment?.employee_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
                            Không
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedAssignment && deleteMutation.mutate(selectedAssignment.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Hủy phân công
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
