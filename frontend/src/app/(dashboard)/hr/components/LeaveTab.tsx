'use client';

import { useState } from 'react';
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
} from '@tabler/icons-react';
import CreateLeaveRequestModal from './CreateLeaveRequestModal';
import ApprovalHistoryModal from './ApprovalHistoryModal';

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
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeView, setActiveView] = useState<'my' | 'all'>('all');

    // History modal state
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');

    // Check if user is HR/Admin (can view all and approve/reject)
    // Handle role as both string and object (backend may return Role object with code property)
    const userRole = typeof user?.role === 'object' && user?.role !== null
        ? (user.role as { code?: string }).code
        : user?.role;
    const isHrAdmin = userRole === 'super_admin' || userRole === 'admin' || userRole === 'hr_manager';

    // Query: Leave types
    const { data: leaveTypes } = useQuery({
        queryKey: ['hr', 'leave', 'types'],
        queryFn: async () => {
            return await api.get<LeaveTypeResponse[]>('/hr/leave/types');
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
        queryKey: ['hr', 'leave', 'my-requests'],
        queryFn: async () => {
            return await api.get<LeaveRequestResponse[]>('/hr/leave/my-requests');
        },
    });

    // Query: My Leave balances
    const { data: myBalances } = useQuery({
        queryKey: ['hr', 'leave', 'my-balances'],
        queryFn: async () => {
            return await api.get<LeaveBalanceResponse[]>('/hr/leave/my-balances');
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

    // Query: Leave stats (Dashboard metrics)
    const { data: stats } = useQuery({
        queryKey: ['hr', 'leave', 'stats'],
        queryFn: async () => {
            return await api.get<LeaveStatsResponse>('/hr/leave/stats');
        },
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

    // Mutation: Reject leave request
    const rejectMutation = useMutation({
        mutationFn: async (requestId: string) => {
            return await api.put(`/hr/leave/requests/${requestId}/reject?reason=Không phù hợp`, {});
        },
        onSuccess: () => {
            toast.success('Đã từ chối đơn nghỉ phép');
            queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
        },
        onError: () => {
            toast.error('Từ chối thất bại');
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

    const getLeaveIcon = (code: string) => {
        switch (code) {
            case 'ANNUAL':
                return <IconBeach className="h-4 w-4 text-blue-600" />;
            case 'SICK':
                return <IconMoodSick className="h-4 w-4 text-red-600" />;
            default:
                return <IconUser className="h-4 w-4 text-purple-600" />;
        }
    };

    const openHistoryModal = (requestId: string, employeeName: string) => {
        setSelectedRequestId(requestId);
        setSelectedEmployeeName(employeeName);
        setHistoryModalOpen(true);
    };

    // Determine which data to show
    const requests = activeView === 'my' ? myRequests : allRequests;
    const requestsLoading = activeView === 'my' ? myRequestsLoading : allRequestsLoading;
    const balances = activeView === 'my' ? myBalances : allBalances;

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
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
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
                                <p className="text-lg font-bold text-purple-600">{req.total_days}</p>
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
                                        onClick={() => rejectMutation.mutate(req.id)}
                                        disabled={rejectMutation.isPending}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <IconX className="h-4 w-4" />
                                    </Button>
                                </div>
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
                {/* Pending Requests */}
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

                {/* On Leave Today */}
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

                {/* Upcoming Leaves */}
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

                {/* Leave Types Count (Static Info) */}
                <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-purple-50">
                                <IconCheck className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Loại nghỉ phép</p>
                                <p className="text-lg font-bold">{leaveTypes?.length || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
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
                                    className="bg-gradient-to-r from-pink-500 to-purple-500"
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

                {/* Leave Balances */}
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IconClock className="h-5 w-5" />
                            {activeView === 'my' ? 'Số ngày còn lại của tôi' : 'Số ngày còn lại'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                        {!balances || balances.length === 0 ? (
                            <div className="text-center py-12">
                                <IconClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có dữ liệu</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {balances.map((bal) => (
                                    <div key={bal.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900">
                                        <div className="flex items-center justify-between">
                                            <p className="font-medium text-sm">{bal.employee_name}</p>
                                            <span className="text-lg font-bold text-green-600">{bal.remaining_days}d</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            <span>{bal.leave_type_name}</span>
                                            <span>•</span>
                                            <span>Đã dùng: {bal.used_days}/{bal.total_days}</span>
                                            {(bal.pending_days || 0) > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-amber-600">Đang chờ: {bal.pending_days}</span>
                                                </>
                                            )}
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                                            <div
                                                className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full"
                                                style={{ width: `${Math.min(100, (bal.used_days / bal.total_days) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Create Leave Request Modal */}
            <CreateLeaveRequestModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
            />

            {/* Approval History Modal */}
            <ApprovalHistoryModal
                open={historyModalOpen}
                onOpenChange={setHistoryModalOpen}
                requestId={selectedRequestId}
                employeeName={selectedEmployeeName}
            />
        </div>
    );
}
