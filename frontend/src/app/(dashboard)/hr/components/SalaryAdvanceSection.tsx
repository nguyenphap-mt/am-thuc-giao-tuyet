'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    IconCash,
    IconCheck,
    IconX,
    IconCreditCard,
    IconPlus,
    IconLoader2,
    IconEye,
    IconUser,
    IconCalendar,
    IconFileText,
} from '@tabler/icons-react';
import CreateAdvanceModal from './CreateAdvanceModal';

// --- Types ---

interface SalaryAdvanceResponse {
    id: string;
    employee_id: string;
    employee_name: string | null;
    amount: number;
    request_date: string;
    reason: string | null;
    status: string;
    approved_at: string | null;
    created_at: string;
}

// --- Component ---

export default function SalaryAdvanceSection() {
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvanceResponse | null>(null);
    const [showRejectConfirm, setShowRejectConfirm] = useState<string | null>(null);

    // Query: List advances
    const { data: advances, isLoading } = useQuery({
        queryKey: ['hr', 'payroll', 'advances', statusFilter],
        queryFn: async () => {
            const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
            return await api.get<SalaryAdvanceResponse[]>(`/hr/payroll/advances${params}`);
        },
    });

    // Mutation: Approve
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.put(`/hr/payroll/advances/${id}/approve`, {});
        },
        onSuccess: () => {
            toast.success('Đã duyệt yêu cầu ứng lương');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
            setSelectedAdvance(null);
        },
        onError: () => {
            toast.error('Duyệt thất bại');
        },
    });

    // Mutation: Reject
    const rejectMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.put(`/hr/payroll/advances/${id}/reject`, {});
        },
        onSuccess: () => {
            toast.success('Đã từ chối yêu cầu ứng lương');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
            setShowRejectConfirm(null);
            setSelectedAdvance(null);
        },
        onError: () => {
            toast.error('Từ chối thất bại');
        },
    });

    // Mutation: Pay
    const payMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.put(`/hr/payroll/advances/${id}/pay`, {});
        },
        onSuccess: () => {
            toast.success('Đã xác nhận chi ứng lương');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
            setSelectedAdvance(null);
        },
        onError: () => {
            toast.error('Xác nhận chi thất bại');
        },
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-100 text-green-700">Đã chi</Badge>;
            case 'APPROVED':
                return <Badge className="bg-blue-100 text-blue-700">Đã duyệt</Badge>;
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-700">Từ chối</Badge>;
            case 'DEDUCTED':
                return <Badge className="bg-accent-100 text-accent-strong">Đã trừ lương</Badge>;
            default:
                return <Badge className="bg-amber-100 text-amber-700">Chờ duyệt</Badge>;
        }
    };

    const statusFilters = [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'PENDING', label: 'Chờ duyệt' },
        { key: 'APPROVED', label: 'Đã duyệt' },
        { key: 'PAID', label: 'Đã chi' },
    ];

    const totalPending = advances?.filter(a => a.status === 'PENDING').reduce((s, a) => s + a.amount, 0) ?? 0;

    return (
        <>
            <Card>
                <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <IconCash className="h-5 w-5" />
                            Ứng lương
                            {totalPending > 0 && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                    {formatCurrency(totalPending)} chờ duyệt
                                </Badge>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {/* Status filter pills */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                                {statusFilters.map((f) => (
                                    <button
                                        key={f.key}
                                        onClick={() => setStatusFilter(f.key)}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${statusFilter === f.key
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <Button
                                size="sm"
                                className="bg-accent-gradient-2stop"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <IconPlus className="h-4 w-4 mr-1" />
                                Tạo ứng lương
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                        </div>
                    ) : !advances || advances.length === 0 ? (
                        <div className="text-center py-10">
                            <IconCash className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-3 text-gray-500 text-sm">Không có yêu cầu ứng lương</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium">Nhân viên</th>
                                        <th className="text-right px-3 py-2 font-medium">Số tiền</th>
                                        <th className="text-left px-3 py-2 font-medium">Ngày yêu cầu</th>
                                        <th className="text-left px-3 py-2 font-medium">Lý do</th>
                                        <th className="text-center px-3 py-2 font-medium">Trạng thái</th>
                                        <th className="text-center px-3 py-2 font-medium w-32">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {advances.map((adv) => (
                                        <tr
                                            key={adv.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedAdvance(adv)}
                                        >
                                            <td className="px-3 py-2.5 font-medium">
                                                {adv.employee_name || '—'}
                                            </td>
                                            <td className="text-right px-3 py-2.5 font-bold text-amber-600 tabular-nums">
                                                {formatCurrency(adv.amount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-600">
                                                {formatDate(adv.request_date)}
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate">
                                                {adv.reason || '—'}
                                            </td>
                                            <td className="text-center px-3 py-2.5">
                                                {getStatusBadge(adv.status)}
                                            </td>
                                            <td className="text-center px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* View detail button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedAdvance(adv)}
                                                        className="h-7 px-2 text-gray-500 hover:bg-gray-100 text-xs"
                                                        title="Xem chi tiết"
                                                    >
                                                        <IconEye className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {adv.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => approveMutation.mutate(adv.id)}
                                                                disabled={approveMutation.isPending}
                                                                className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-xs"
                                                                title="Duyệt"
                                                            >
                                                                {approveMutation.isPending ? (
                                                                    <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <IconCheck className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 px-2 text-red-600 hover:bg-red-50 text-xs"
                                                                title="Từ chối"
                                                                onClick={() => setShowRejectConfirm(adv.id)}
                                                            >
                                                                <IconX className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {adv.status === 'APPROVED' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => payMutation.mutate(adv.id)}
                                                            disabled={payMutation.isPending}
                                                            className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs"
                                                            title="Xác nhận đã chi"
                                                        >
                                                            {payMutation.isPending ? (
                                                                <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <IconCreditCard className="h-3.5 w-3.5 mr-1" />
                                                                    Chi
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            {selectedAdvance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedAdvance(null)}>
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                            <h3 className="text-base font-semibold text-gray-900">Chi tiết ứng lương</h3>
                            <button
                                onClick={() => setSelectedAdvance(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <IconUser className="h-5 w-5 text-amber-700" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{selectedAdvance.employee_name || '—'}</p>
                                    <p className="text-xs text-gray-500">Nhân viên</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Số tiền</p>
                                    <p className="text-lg font-bold text-amber-600 tabular-nums">
                                        {formatCurrency(selectedAdvance.amount)}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                                    <div className="mt-1">{getStatusBadge(selectedAdvance.status)}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <IconCalendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Ngày yêu cầu</p>
                                        <p className="text-sm font-medium">{formatDate(selectedAdvance.request_date)}</p>
                                    </div>
                                </div>

                                {selectedAdvance.approved_at && (
                                    <div className="flex items-start gap-3">
                                        <IconCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs text-gray-500">Ngày duyệt</p>
                                            <p className="text-sm font-medium">{formatDate(selectedAdvance.approved_at)}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <IconFileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Lý do</p>
                                        <p className="text-sm">{selectedAdvance.reason || 'Không có lý do'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer actions */}
                        {selectedAdvance.status === 'PENDING' && (
                            <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => setShowRejectConfirm(selectedAdvance.id)}
                                >
                                    <IconX className="h-4 w-4 mr-1" />
                                    Từ chối
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => approveMutation.mutate(selectedAdvance.id)}
                                    disabled={approveMutation.isPending}
                                >
                                    {approveMutation.isPending ? (
                                        <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <IconCheck className="h-4 w-4 mr-1" />
                                    )}
                                    Duyệt
                                </Button>
                            </div>
                        )}
                        {selectedAdvance.status === 'APPROVED' && (
                            <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end">
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => payMutation.mutate(selectedAdvance.id)}
                                    disabled={payMutation.isPending}
                                >
                                    {payMutation.isPending ? (
                                        <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                    ) : (
                                        <IconCreditCard className="h-4 w-4 mr-1" />
                                    )}
                                    Xác nhận đã chi
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reject Confirm Modal */}
            {showRejectConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowRejectConfirm(null)}>
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 text-center">
                            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                                <IconX className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Từ chối ứng lương?</h3>
                            <p className="text-sm text-gray-500">
                                Bạn có chắc muốn từ chối yêu cầu ứng lương này? Hành động này không thể hoàn tác.
                            </p>
                        </div>
                        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRejectConfirm(null)}
                            >
                                Hủy
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => rejectMutation.mutate(showRejectConfirm)}
                                disabled={rejectMutation.isPending}
                            >
                                {rejectMutation.isPending ? (
                                    <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <IconX className="h-4 w-4 mr-1" />
                                )}
                                Từ chối
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <CreateAdvanceModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
            />
        </>
    );
}
