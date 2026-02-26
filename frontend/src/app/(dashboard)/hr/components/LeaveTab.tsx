'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
    IconCalendar,
    IconCheck,
    IconX,
    IconPlus,
    IconBeach,
    IconMoodSick,
    IconUser,
    IconClock,
    IconHistory,
    IconUserCircle,
    IconUsers,
    IconSearch,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';
import CreateLeaveRequestModal from './CreateLeaveRequestModal';
import ApprovalHistoryModal from './ApprovalHistoryModal';
import RejectReasonDialog from './RejectReasonDialog';
import TeamLeaveCalendar from './TeamLeaveCalendar';
import LeavePolicyCard from './LeavePolicyCard';

interface LeaveTypeResponse {
    id: string;
    code: string;
    name: string;
    days_per_year: number;
    is_paid: boolean;
    requires_approval: boolean;
    is_active: boolean;
}

interface LeaveBalanceResponse {
    id: string;
    employee_id: string;
    employee_name: string;
    leave_type_code: string;
    leave_type_name: string;
    year: number;
    total_days: number;
    used_days: number;
    pending_days: number;
    remaining_days: number;
}

interface LeaveRequestResponse {
    id: string;
    employee_id: string;
    employee_name: string;
    leave_type_code: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
}

interface LeaveStatsResponse {
    pending_requests: number;
    on_leave_today: number;
    upcoming_leaves: number;
}

export default function LeaveTab() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Check if user is HR/Admin (can view all and approve/reject)
    // Handle role as both string and object (backend may return Role object with code property)
    const userRole = typeof user?.role === 'object' && user?.role !== null
        ? (user.role as { code?: string }).code
        : user?.role;
    const isHrAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'hr_manager';

    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [showCreateModal, setShowCreateModal] = useState(false);
    // Non-HR users default to 'my' view (self-service)
    const [activeView, setActiveView] = useState<'my' | 'all'>(isHrAdmin ? 'all' : 'my');

    // History modal state
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

    // Reject dialog state
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
    const [rejectTargetName, setRejectTargetName] = useState<string>('');

    // Balance panel state
    const [balanceSearch, setBalanceSearch] = useState('');
    const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

    // Query: Leave types — use self-service endpoint for non-HR users
    const { data: leaveTypes } = useQuery({
        queryKey: ['hr', 'leave', 'types', isHrAdmin],
        queryFn: async () => {
            const endpoint = isHrAdmin ? '/hr/leave/types' : '/hr/leave/self/types';
            return await api.get<LeaveTypeResponse[]>(endpoint);
        },
    });

    // Query: All Leave requests (HR view)
    const { data: allRequests, isLoading: allRequestsLoading } = useQuery({
        queryKey: ['hr', 'leave', 'requests', statusFilter],
        queryFn: async () => {
            return await api.get<LeaveRequestResponse[]>(`/hr/leave/requests${statusFilter ? `?status=${statusFilter}` : ''}`);
        },
        enabled: isHrAdmin,
    });

    // Query: My Leave requests (Employee self-service)
    const { data: myRequests, isLoading: myRequestsLoading } = useQuery({
        queryKey: ['hr', 'leave', 'my-requests', isHrAdmin],
        queryFn: async () => {
            const endpoint = isHrAdmin ? '/hr/leave/my-requests' : '/hr/leave/self/my-requests';
            return await api.get<LeaveRequestResponse[]>(endpoint);
        },
    });

    // Query: My Leave balances — use self-service endpoint for non-HR
    const { data: myBalances } = useQuery({
        queryKey: ['hr', 'leave', 'my-balances', isHrAdmin],
        queryFn: async () => {
            const endpoint = isHrAdmin ? '/hr/leave/my-balances' : '/hr/leave/self/my-balances';
            return await api.get<LeaveBalanceResponse[]>(endpoint);
        },
    });

    // Query: All Leave balances (current year) - HR only
    const { data: allBalances } = useQuery({
        queryKey: ['hr', 'leave', 'balances'],
        queryFn: async () => {
            const year = new Date().getFullYear();
            return await api.get<LeaveBalanceResponse[]>(`/hr/leave/balances?year=${year}`);
        },
        enabled: isHrAdmin,
    });

    // Query: Leave stats (Dashboard metrics) — HR admin only
    const { data: stats } = useQuery({
        queryKey: ['hr', 'leave', 'stats'],
        queryFn: async () => {
            return await api.get<LeaveStatsResponse>('/hr/leave/stats');
        },
        enabled: isHrAdmin,
    });

    // Mutation: Approve leave request
    const approveMutation = useMutation({
        mutationFn: async (requestId: string) => {
            return await api.put(`/hr/leave/requests/${requestId}/approve`, {});
        },
        onSuccess: () => {
            toast.success('Đã duyệt đơn nghỉ phép');
            queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
        onError: () => {
            toast.error('Duyệt thất bại');
        },
    });

    // Mutation: Reject leave request (with custom reason)
    const rejectMutation = useMutation({
        mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
            return await api.put(`/hr/leave/requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`, {});
        },
        onSuccess: () => {
            toast.success('Đã từ chối đơn nghỉ phép');
            setRejectDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
        onError: () => {
            toast.error('Từ chối thất bại');
        },
    });

    // Mutation: Cancel leave request (self-service)
    const cancelMutation = useMutation({
        mutationFn: async (requestId: string) => {
            const endpoint = isHrAdmin ? `/hr/leave/requests/${requestId}/cancel` : `/hr/leave/self/my-requests/${requestId}/cancel`;
            return await api.put(endpoint, {});
        },
        onSuccess: () => {
            toast.success('Đã hủy đơn nghỉ phép');
            queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
        },
        onError: () => {
            toast.error('Hủy đơn thất bại');
        },
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

    const getLeaveIcon = (code: string, size: string = 'h-4 w-4') => {
        switch (code) {
            case 'ANNUAL':
                return <IconBeach className={`${size} text-blue-600`} />;
            case 'SICK':
                return <IconMoodSick className={`${size} text-red-600`} />;
            default:
                return <IconUser className={`${size} text-accent-primary`} />;
        }
    };

    // Color-coding for remaining days (synced from EmployeeLeaveView)
    const getBalanceColor = (remaining: number, total: number) => {
        if (total === 0) return 'text-gray-400';
        const ratio = remaining / total;
        if (ratio > 0.5) return 'text-green-600';
        if (ratio > 0.2) return 'text-amber-600';
        return 'text-red-600';
    };

    const openHistoryModal = (requestId: string, employeeName: string) => {
        setSelectedRequestId(requestId);
        setSelectedEmployeeName(employeeName);
        setHistoryModalOpen(true);
    };

    const openRejectDialog = (requestId: string, employeeName: string) => {
        setRejectTargetId(requestId);
        setRejectTargetName(employeeName);
        setRejectDialogOpen(true);
    };

    // Determine which data to show
    const requests = activeView === 'my' ? myRequests : allRequests;
    const requestsLoading = activeView === 'my' ? myRequestsLoading : allRequestsLoading;
    const balances = activeView === 'my' ? myBalances : allBalances;

    // Group balances by employee for Admin view
    const groupedBalances = useMemo(() => {
        if (!balances || balances.length === 0) return [];

        const groups = new Map<string, { name: string; id: string; items: LeaveBalanceResponse[] }>();
        for (const bal of balances) {
            const key = bal.employee_id;
            if (!groups.has(key)) {
                groups.set(key, { name: bal.employee_name, id: bal.employee_id, items: [] });
            }
            groups.get(key)!.items.push(bal);
        }

        let result = Array.from(groups.values());

        // Filter by search
        if (balanceSearch.trim()) {
            const q = balanceSearch.trim().toLowerCase();
            result = result.filter(g => g.name.toLowerCase().includes(q));
        }

        return result;
    }, [balances, balanceSearch]);

    // Toggle employee expanded state
    const toggleEmployee = (employeeId: string) => {
        setExpandedEmployees(prev => {
            const next = new Set(prev);
            if (next.has(employeeId)) {
                next.delete(employeeId);
            } else {
                next.add(employeeId);
            }
            return next;
        });
    };

    // Stats
    const pendingCount = requests?.filter((r) => r.status === 'PENDING').length || 0;

    // Request list component
    const renderRequestList = (requestList: LeaveRequestResponse[] | undefined, loading: boolean, showActions: boolean) => (
        <CardContent className="p-0">
            {loading ? (
                <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
            ) : !requestList || requestList.length === 0 ? (
                <div className="text-center py-12">
                    <IconCalendar className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Không có đơn nghỉ phép</p>
                </div>
            ) : (
                <div className="divide-y">
                    {requestList.map((req) => (
                        <div key={req.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 group">
                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-full bg-accent-gradient-br to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                {req.employee_name?.charAt(0) || 'N'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{req.employee_name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    {getLeaveIcon(req.leave_type_code)}
                                    <span>{req.leave_type_name}</span>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="text-center hidden sm:block">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Từ ngày</p>
                                <p className="text-sm font-medium">{formatDate(req.start_date)}</p>
                            </div>
                            <div className="text-center hidden sm:block">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Đến ngày</p>
                                <p className="text-sm font-medium">{formatDate(req.end_date)}</p>
                            </div>

                            {/* Days */}
                            <div className="text-center w-12">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ngày</p>
                                <p className="text-lg font-bold text-accent-primary">{req.total_days}</p>
                            </div>

                            {/* Status */}
                            <div className="w-20">
                                {getStatusBadge(req.status)}
                            </div>

                            {/* History button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => openHistoryModal(req.id, req.employee_name)}
                                title="Xem lịch sử"
                            >
                                <IconHistory className="h-4 w-4" />
                            </Button>

                            {/* Actions - Only for HR and pending requests */}
                            {showActions && req.status === 'PENDING' && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => approveMutation.mutate(req.id)}
                                        disabled={approveMutation.isPending}
                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                        <IconCheck className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openRejectDialog(req.id, req.employee_name)}
                                        disabled={rejectMutation.isPending}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <IconX className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            {/* Cancel - Self-service for PENDING requests */}
                            {!showActions && req.status === 'PENDING' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => cancelMutation.mutate(req.id)}
                                    disabled={cancelMutation.isPending}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs"
                                >
                                    Hủy
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    );

    return (
        <div className="space-y-4">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {isHrAdmin ? (
                    /* HR Admin: Company-wide stats */
                    <>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-orange-50">
                                        <IconClock className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Chờ duyệt</p>
                                        <p className="text-lg font-bold">{stats?.pending_requests || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-50">
                                        <IconBeach className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Nghỉ hôm nay</p>
                                        <p className="text-lg font-bold">{stats?.on_leave_today || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-pink-50">
                                        <IconCalendar className="h-5 w-5 text-pink-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Sắp tới (7 ngày)</p>
                                        <p className="text-lg font-bold">{stats?.upcoming_leaves || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-accent-50">
                                        <IconCheck className="h-5 w-5 text-accent-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Loại nghỉ phép</p>
                                        <p className="text-lg font-bold">{leaveTypes?.length || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    /* Employee: Personal stats */
                    <>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-orange-50">
                                        <IconClock className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Đơn chờ duyệt</p>
                                        <p className="text-lg font-bold">{myRequests?.filter(r => r.status === 'PENDING').length || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-green-50">
                                        <IconBeach className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Ngày phép còn</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {myBalances?.reduce((sum, b) => sum + b.remaining_days, 0) || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-50">
                                        <IconCalendar className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Đã nghỉ năm nay</p>
                                        <p className="text-lg font-bold">
                                            {myBalances?.reduce((sum, b) => sum + b.used_days, 0) || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-accent-50">
                                        <IconCheck className="h-5 w-5 text-accent-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Loại nghỉ phép</p>
                                        <p className="text-lg font-bold">{leaveTypes?.length || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Role-based view selector */}
            {isHrAdmin && (
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'my' | 'all')}>
                    <TabsList className="grid w-full max-w-xs grid-cols-2">
                        <TabsTrigger value="my" className="text-xs">
                            <IconUserCircle className="h-4 w-4 mr-1" />
                            Đơn của tôi
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-xs">
                            <IconUsers className="h-4 w-4 mr-1" />
                            Tất cả đơn
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            )}

            <div className="grid lg:grid-cols-3 gap-4">
                {/* Leave Requests */}
                <Card className="lg:col-span-2">
                    <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <IconCalendar className="h-5 w-5" />
                                {activeView === 'my' ? 'Đơn nghỉ phép của tôi' : 'Tất cả đơn nghỉ phép'}
                                {pendingCount > 0 && (
                                    <Badge className="bg-amber-100 text-amber-700 ml-2">
                                        {pendingCount} chờ duyệt
                                    </Badge>
                                )}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {activeView === 'all' && isHrAdmin && (
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="text-sm border rounded-md px-2 py-1"
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="PENDING">Chờ duyệt</option>
                                        <option value="APPROVED">Đã duyệt</option>
                                        <option value="REJECTED">Từ chối</option>
                                    </select>
                                )}
                                <Button
                                    size="sm"
                                    className="bg-accent-gradient to-purple-500"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <IconPlus className="h-4 w-4 mr-1" />
                                    Tạo đơn
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    {renderRequestList(requests, requestsLoading, isHrAdmin && activeView === 'all')}
                </Card>

                {/* Leave Balances — Grouped by Employee */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IconClock className="h-5 w-5" />
                            {activeView === 'my' ? 'Số ngày còn lại của tôi' : 'Số ngày còn lại'}
                        </CardTitle>
                        {/* Search filter (Admin mode with > 3 employees) */}
                        {activeView === 'all' && groupedBalances.length > 3 && (
                            <div className="relative mt-2">
                                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm nhân viên..."
                                    value={balanceSearch}
                                    onChange={(e) => setBalanceSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-colors"
                                />
                            </div>
                        )}
                    </CardHeader>
                    <div className="relative">
                        <CardContent className="p-0 max-h-[450px] overflow-y-auto">
                            {/* Skeleton loading */}
                            {!balances ? (
                                <div className="p-3 space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-8 w-8 rounded-full" />
                                                <Skeleton className="h-4 w-32" />
                                            </div>
                                            <Skeleton className="h-10 w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : balances.length === 0 ? (
                                <div className="text-center py-12">
                                    <IconClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có dữ liệu</p>
                                </div>
                            ) : groupedBalances.length === 0 ? (
                                <div className="text-center py-8">
                                    <IconSearch className="mx-auto h-8 w-8 text-gray-300" />
                                    <p className="mt-2 text-sm text-gray-500">Không tìm thấy nhân viên</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {groupedBalances.map((group) => {
                                        const isExpanded = expandedEmployees.has(group.id) || activeView === 'my';
                                        const totalRemaining = group.items.reduce((sum, b) => sum + b.remaining_days, 0);
                                        const totalEntitled = group.items.reduce((sum, b) => sum + b.total_days, 0);

                                        return (
                                            <div key={group.id}>
                                                {/* Employee Header */}
                                                <button
                                                    onClick={() => activeView === 'all' && toggleEmployee(group.id)}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeView === 'all' ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : ''
                                                        }`}
                                                >
                                                    {/* Avatar */}
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#c2185b] to-[#512da8] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                                                        {group.name?.charAt(0)?.toUpperCase() || 'N'}
                                                    </div>

                                                    {/* Name + summary */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{group.name}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {group.items.length} loại phép
                                                        </p>
                                                    </div>

                                                    {/* Total remaining */}
                                                    <span className={`text-lg font-bold tabular-nums ${getBalanceColor(totalRemaining, totalEntitled)}`}>
                                                        {totalRemaining}
                                                        <span className="text-xs font-normal text-gray-400 ml-0.5">ngày</span>
                                                    </span>

                                                    {/* Expand icon (Admin only) */}
                                                    {activeView === 'all' && (
                                                        isExpanded
                                                            ? <IconChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                                                            : <IconChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                                                    )}
                                                </button>

                                                {/* Expanded balance details */}
                                                {isExpanded && (
                                                    <div className="px-3 pb-3 pl-14 space-y-2">
                                                        {group.items.map((bal) => {
                                                            const usedPct = bal.total_days > 0 ? Math.min(100, (bal.used_days / bal.total_days) * 100) : 0;
                                                            return (
                                                                <div
                                                                    key={`${bal.employee_id}-${bal.leave_type_code}-${bal.year}`}
                                                                    className="flex items-center gap-2 group/item"
                                                                >
                                                                    {/* Leave type icon */}
                                                                    <div className="shrink-0">
                                                                        {getLeaveIcon(bal.leave_type_code, 'h-3.5 w-3.5')}
                                                                    </div>

                                                                    {/* Leave type name + progress */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between mb-0.5">
                                                                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                                                                {bal.leave_type_name}
                                                                            </span>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                {/* Pending badge */}
                                                                                {(bal.pending_days || 0) > 0 && (
                                                                                    <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] px-1.5 py-0 h-4">
                                                                                        {bal.pending_days} chờ
                                                                                    </Badge>
                                                                                )}
                                                                                <span className={`text-sm font-semibold tabular-nums ${getBalanceColor(bal.remaining_days, bal.total_days)}`}>
                                                                                    {bal.remaining_days}
                                                                                    <span className="text-[10px] font-normal text-gray-400">/{bal.total_days}</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Progress bar */}
                                                                        <div
                                                                            className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2"
                                                                            role="progressbar"
                                                                            aria-valuenow={bal.used_days}
                                                                            aria-valuemin={0}
                                                                            aria-valuemax={bal.total_days}
                                                                            aria-label={`${bal.leave_type_name}: đã dùng ${bal.used_days}/${bal.total_days} ngày`}
                                                                        >
                                                                            <div
                                                                                className="bg-gradient-to-r from-[#c2185b] to-[#512da8] h-2 rounded-full transition-all duration-300"
                                                                                style={{ width: `${usedPct}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                        {/* Scroll fade gradient */}
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-900 to-transparent rounded-b-lg" />
                    </div>
                </Card>
            </div>

            {/* Leave Policy Card (for all users) */}
            {leaveTypes && leaveTypes.length > 0 && (
                <LeavePolicyCard leaveTypes={leaveTypes} />
            )}

            {/* Team Leave Calendar (HR admin only) */}
            {isHrAdmin && (
                <TeamLeaveCalendar />
            )}

            {/* Create Leave Request Modal */}
            <CreateLeaveRequestModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                isEmployeeSelfService={!isHrAdmin}
            />

            {/* Approval History Modal */}
            <ApprovalHistoryModal
                open={historyModalOpen}
                onOpenChange={setHistoryModalOpen}
                requestId={selectedRequestId}
                employeeName={selectedEmployeeName}
            />

            {/* Reject Reason Dialog */}
            <RejectReasonDialog
                open={rejectDialogOpen}
                onOpenChange={setRejectDialogOpen}
                employeeName={rejectTargetName}
                onConfirm={(reason) => {
                    if (rejectTargetId) {
                        rejectMutation.mutate({ requestId: rejectTargetId, reason });
                    }
                }}
                isPending={rejectMutation.isPending}
            />
        </div>
    );
}
