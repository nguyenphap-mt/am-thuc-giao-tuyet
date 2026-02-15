'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    IconCalendar,
    IconPlus,
    IconBeach,
    IconMoodSick,
    IconUser,
    IconClock,
    IconProgress,
} from '@tabler/icons-react';
import CreateLeaveRequestModal from './CreateLeaveRequestModal';

interface MyLeaveBalance {
    leave_type_code: string;
    leave_type_name: string;
    entitled_days: number;
    used_days: number;
    pending_days: number;
    remaining_days: number;
}

interface MyLeaveRequest {
    id: string;
    employee_id: string;
    employee_name: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    total_days: number;
    reason: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approved_at: string | null;
    created_at: string;
}

export default function EmployeeLeaveView() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('');

    // Query: My leave balances
    const { data: myBalances, isLoading: balancesLoading } = useQuery({
        queryKey: ['leave', 'my-balances'],
        queryFn: async () => {
            const year = new Date().getFullYear();
            return await api.get<MyLeaveBalance[]>(`/hr/leave/my-balances?year=${year}`);
        },
    });

    // Query: My leave requests
    const { data: myRequests, isLoading: requestsLoading } = useQuery({
        queryKey: ['leave', 'my-requests', statusFilter],
        queryFn: async () => {
            const url = statusFilter
                ? `/hr/leave/my-requests?status=${statusFilter}`
                : '/hr/leave/my-requests';
            return await api.get<MyLeaveRequest[]>(url);
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
                return <IconBeach className="h-5 w-5 text-blue-600" />;
            case 'SICK':
                return <IconMoodSick className="h-5 w-5 text-red-600" />;
            default:
                return <IconUser className="h-5 w-5 text-purple-600" />;
        }
    };

    const getBalanceColor = (remaining: number, total: number) => {
        const ratio = remaining / total;
        if (ratio > 0.5) return 'text-green-600';
        if (ratio > 0.2) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-4">
            {/* Header with User Info */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nghỉ phép của tôi</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Xin chào, {user?.full_name || 'Nhân viên'}</p>
                </div>
                <Button
                    className="bg-gradient-to-r from-pink-500 to-purple-500"
                    onClick={() => setShowCreateModal(true)}
                >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Tạo đơn nghỉ phép
                </Button>
            </div>

            {/* My Leave Balances */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {balancesLoading ? (
                    [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)
                ) : !myBalances || myBalances.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="py-8 text-center text-gray-500 dark:text-gray-400">
                            <IconClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                            Chưa có thông tin ngày phép
                        </CardContent>
                    </Card>
                ) : (
                    myBalances.map((balance) => (
                        <Card key={balance.leave_type_code} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-blue-50">
                                        {getLeaveIcon(balance.leave_type_code)}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{balance.leave_type_name}</p>
                                        <p className={`text-2xl font-bold ${getBalanceColor(balance.remaining_days, balance.entitled_days)}`}>
                                            {balance.remaining_days}
                                            <span className="text-sm font-normal text-gray-400 dark:text-gray-500"> / {balance.entitled_days} ngày</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (balance.used_days / balance.entitled_days) * 100)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <span>Đã dùng: {balance.used_days}d</span>
                                    {balance.pending_days > 0 && (
                                        <span className="text-amber-600">Chờ duyệt: {balance.pending_days}d</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* My Leave Requests */}
            <Card>
                <CardHeader className="py-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IconCalendar className="h-5 w-5" />
                            Đơn nghỉ phép của tôi
                        </CardTitle>
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
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {requestsLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : !myRequests || myRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <IconCalendar className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Bạn chưa có đơn nghỉ phép nào</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <IconPlus className="h-4 w-4 mr-1" />
                                Tạo đơn đầu tiên
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {myRequests.map((req) => (
                                <div key={req.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900">
                                    {/* Leave Type Icon */}
                                    <div className="p-2 rounded-lg bg-purple-50 shrink-0">
                                        <IconBeach className="h-5 w-5 text-purple-600" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{req.leave_type_name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{req.reason || 'Không có lý do'}</p>
                                    </div>

                                    {/* Dates */}
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Từ ngày</p>
                                        <p className="text-sm font-medium">{formatDate(req.start_date)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Đến ngày</p>
                                        <p className="text-sm font-medium">{formatDate(req.end_date)}</p>
                                    </div>

                                    {/* Days */}
                                    <div className="text-center w-12">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Ngày</p>
                                        <p className="text-lg font-bold text-purple-600">{req.total_days}</p>
                                    </div>

                                    {/* Status */}
                                    <div className="w-24">
                                        {getStatusBadge(req.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Leave Request Modal - Self-Service Mode */}
            <CreateLeaveRequestModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                isEmployeeSelfService={true}
            />
        </div>
    );
}
