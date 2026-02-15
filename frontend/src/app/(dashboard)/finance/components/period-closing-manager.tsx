'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconCalendarMonth,
    IconCheck,
    IconLock,
    IconLockOpen,
    IconLoader2,
    IconChevronDown,
    IconChevronUp,
    IconTrash,
    IconAlertCircle,
    IconAlertTriangle,
    IconInfoCircle,
    IconX,
    IconChecklist,
    IconClipboardCheck,
    IconBuildingBank,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { BankReconciliationPanel } from './bank-reconciliation-panel';

interface AccountingPeriod {
    id: string;
    name: string;
    period_type: string;
    start_date: string;
    end_date: string;
    status: 'OPEN' | 'CLOSING' | 'CLOSED';
    closed_at?: string;
    closing_total_debit?: number;
    closing_total_credit?: number;
    closing_retained_earnings?: number;
    notes?: string;
    created_at: string;
}

interface ValidationCheck {
    id: string;
    name: string;
    status: 'PASS' | 'WARN' | 'FAIL';
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    details?: string;
    action_url?: string;
}

interface PreCloseValidation {
    passed: boolean;
    checks: ValidationCheck[];
}

interface ChecklistItem {
    id: string;
    key: string;
    name: string;
    order: number;
    is_automated: boolean;
    is_completed: boolean;
    completed_by?: string;
    completed_at?: string;
    notes?: string;
}

interface ChecklistResponse {
    period_id: string;
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
    items: ChecklistItem[];
}

export function PeriodClosingManager() {
    const [showAll, setShowAll] = useState(false);
    const [closingId, setClosingId] = useState<string | null>(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showBankReconModal, setShowBankReconModal] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
    const [reopenReason, setReopenReason] = useState('');
    const queryClient = useQueryClient();

    const { data: periods, isLoading, error } = useQuery({
        queryKey: ['accounting-periods'],
        queryFn: () => api.get<AccountingPeriod[]>('/finance/periods'),
    });

    const { data: currentPeriod } = useQuery({
        queryKey: ['current-period'],
        queryFn: () => api.get<AccountingPeriod>('/finance/periods/current'),
    });

    // Pre-close validation query
    const { data: validation, isLoading: validationLoading, refetch: refetchValidation } = useQuery({
        queryKey: ['pre-close-validation', selectedPeriodId],
        queryFn: () => api.get<PreCloseValidation>(`/finance/periods/${selectedPeriodId}/pre-close-validation`),
        enabled: !!selectedPeriodId && showValidationModal,
    });

    // Checklist query
    const { data: checklist, isLoading: checklistLoading, refetch: refetchChecklist } = useQuery({
        queryKey: ['period-checklist', selectedPeriodId],
        queryFn: () => api.get<ChecklistResponse>(`/finance/periods/${selectedPeriodId}/checklist`),
        enabled: !!selectedPeriodId && showChecklistModal,
    });

    const closePeriodMutation = useMutation({
        mutationFn: (periodId: string) =>
            api.post(`/finance/periods/${periodId}/close`, {}),
        onSuccess: () => {
            toast.success('Đóng kỳ kế toán thành công');
            queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
            queryClient.invalidateQueries({ queryKey: ['current-period'] });
            setClosingId(null);
            setShowValidationModal(false);
            setSelectedPeriodId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể đóng kỳ');
            setClosingId(null);
        },
    });

    const reopenPeriodMutation = useMutation({
        mutationFn: ({ periodId, reason }: { periodId: string; reason: string }) =>
            api.post(`/finance/periods/${periodId}/reopen`, { reason }),
        onSuccess: () => {
            toast.success('Mở lại kỳ kế toán thành công');
            queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
            setShowReopenModal(false);
            setReopenReason('');
            setSelectedPeriodId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể mở lại kỳ');
        },
    });

    // Cleanup duplicate periods
    const cleanupDuplicatesMutation = useMutation({
        mutationFn: () =>
            api.post('/finance/periods/cleanup-duplicates', {}),
        onSuccess: (data: any) => {
            toast.success(data?.message || 'Đã dọn dẹp kỳ trùng lặp');
            queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
            queryClient.invalidateQueries({ queryKey: ['current-period'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể dọn dẹp kỳ trùng lặp');
        },
    });

    // Update checklist item
    const updateChecklistMutation = useMutation({
        mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
            api.patch(`/finance/periods/${selectedPeriodId}/checklist/${itemId}`, { is_completed: isCompleted }),
        onSuccess: () => {
            refetchChecklist();
        },
    });

    // Delete individual period
    const deletePeriodMutation = useMutation({
        mutationFn: (periodId: string) =>
            api.delete(`/finance/periods/${periodId}`),
        onSuccess: () => {
            toast.success('Đã xóa kỳ kế toán');
            queryClient.invalidateQueries({ queryKey: ['accounting-periods'] });
            queryClient.invalidateQueries({ queryKey: ['current-period'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể xóa kỳ');
        },
    });

    const handleOpenValidation = (periodId: string) => {
        setSelectedPeriodId(periodId);
        setShowValidationModal(true);
    };

    const handleClosePeriod = () => {
        if (selectedPeriodId) {
            setClosingId(selectedPeriodId);
            closePeriodMutation.mutate(selectedPeriodId);
        }
    };

    const handleOpenChecklist = (periodId: string) => {
        setSelectedPeriodId(periodId);
        setShowChecklistModal(true);
    };

    const handleOpenReopenModal = (periodId: string) => {
        setSelectedPeriodId(periodId);
        setReopenReason('');
        setShowReopenModal(true);
    };

    const handleReopenPeriod = () => {
        if (selectedPeriodId && reopenReason.trim()) {
            reopenPeriodMutation.mutate({ periodId: selectedPeriodId, reason: reopenReason });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'OPEN':
                return (
                    <Badge className="bg-green-100 text-green-700">
                        <IconLockOpen className="h-3 w-3 mr-1" />
                        Đang mở
                    </Badge>
                );
            case 'CLOSING':
                return (
                    <Badge className="bg-yellow-100 text-yellow-700">
                        <IconLoader2 className="h-3 w-3 mr-1 animate-spin" />
                        Đang đóng
                    </Badge>
                );
            case 'CLOSED':
                return (
                    <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        <IconLock className="h-3 w-3 mr-1" />
                        Đã đóng
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getValidationIcon = (status: string, severity: string) => {
        if (status === 'PASS') return <IconCheck className="h-4 w-4 text-green-600" />;
        if (status === 'FAIL' && severity === 'CRITICAL') return <IconAlertCircle className="h-4 w-4 text-red-600" />;
        if (status === 'WARN') return <IconAlertTriangle className="h-4 w-4 text-amber-500" />;
        return <IconInfoCircle className="h-4 w-4 text-blue-500" />;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <IconCalendarMonth className="h-5 w-5" />
                        Kỳ kế toán
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    Không thể tải danh sách kỳ. API có thể chưa được triển khai.
                </CardContent>
            </Card>
        );
    }

    const displayedPeriods = showAll ? periods : periods?.slice(0, 5);
    const openPeriods = periods?.filter(p => p.status === 'OPEN') || [];
    const closedPeriods = periods?.filter(p => p.status === 'CLOSED') || [];

    return (
        <>
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <IconCalendarMonth className="h-5 w-5 text-purple-600" />
                            Quản lý kỳ kế toán
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {openPeriods.length > 1 && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-orange-600 hover:text-orange-700 text-xs"
                                    onClick={() => cleanupDuplicatesMutation.mutate()}
                                    disabled={cleanupDuplicatesMutation.isPending}
                                >
                                    {cleanupDuplicatesMutation.isPending ? (
                                        <IconLoader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <IconTrash className="h-3 w-3 mr-1" />
                                    )}
                                    Xóa trùng lặp
                                </Button>
                            )}
                            <span>{openPeriods.length} đang mở</span>
                            <span>•</span>
                            <span>{closedPeriods.length} đã đóng</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Current Period Highlight */}
                    {currentPeriod && (
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <IconCheck className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-purple-700">Kỳ hiện tại</span>
                                </div>
                                {getStatusBadge(currentPeriod.status)}
                            </div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {currentPeriod.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {format(new Date(currentPeriod.start_date), 'dd/MM/yyyy', { locale: vi })} -{' '}
                                {format(new Date(currentPeriod.end_date), 'dd/MM/yyyy', { locale: vi })}
                            </div>
                            {currentPeriod.status === 'OPEN' && (
                                <div className="flex gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenChecklist(currentPeriod.id)}
                                    >
                                        <IconChecklist className="h-4 w-4 mr-1" />
                                        Tiến độ
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenValidation(currentPeriod.id)}
                                    >
                                        <IconLock className="h-4 w-4 mr-1" />
                                        Đóng kỳ
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Periods List */}
                    <div className="space-y-2">
                        {displayedPeriods?.map((period) => (
                            <div
                                key={period.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{period.name}</span>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{period.id.slice(0, 6)}</span>
                                        {getStatusBadge(period.status)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {format(new Date(period.start_date), 'dd/MM/yyyy')} -{' '}
                                        {format(new Date(period.end_date), 'dd/MM/yyyy')}
                                    </div>
                                </div>

                                {/* Closing Balances for closed periods */}
                                {period.status === 'CLOSED' && period.closing_total_debit !== undefined && (
                                    <div className="text-right text-xs mr-4">
                                        <div className="text-gray-500 dark:text-gray-400">
                                            Nợ: {formatCurrency(period.closing_total_debit)}
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400">
                                            Có: {formatCurrency(period.closing_total_credit || 0)}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    {period.status === 'OPEN' && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                title="Xem tiến độ"
                                                aria-label="Xem tiến độ"
                                                onClick={() => handleOpenChecklist(period.id)}
                                            >
                                                <IconChecklist className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                title="Đối soát ngân hàng"
                                                aria-label="Đối soát ngân hàng"
                                                onClick={() => {
                                                    setSelectedPeriodId(period.id);
                                                    setShowBankReconModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                <IconBuildingBank className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                title="Đóng kỳ"
                                                aria-label="Đóng kỳ"
                                                onClick={() => handleOpenValidation(period.id)}
                                            >
                                                <IconLock className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {period.status === 'CLOSED' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            title="Mở lại kỳ"
                                            aria-label="Mở lại kỳ"
                                            onClick={() => handleOpenReopenModal(period.id)}
                                            disabled={reopenPeriodMutation.isPending}
                                        >
                                            <IconLockOpen className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show more/less */}
                    {periods && periods.length > 5 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? (
                                <>
                                    <IconChevronUp className="h-4 w-4 mr-1" />
                                    Thu gọn
                                </>
                            ) : (
                                <>
                                    <IconChevronDown className="h-4 w-4 mr-1" />
                                    Xem tất cả ({periods.length} kỳ)
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Pre-Close Validation Modal */}
            {showValidationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <IconClipboardCheck className="h-5 w-5" />
                                    Kiểm tra trước khi đóng kỳ
                                </h3>
                                <button onClick={() => setShowValidationModal(false)} className="hover:bg-white/20 rounded p-1">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {validationLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : validation ? (
                                <div className="space-y-3">
                                    {validation.checks.map((check) => (
                                        <div
                                            key={check.id}
                                            className={`p-3 rounded-lg border ${check.status === 'PASS' ? 'bg-green-50 border-green-200' :
                                                check.status === 'FAIL' ? 'bg-red-50 border-red-200' :
                                                    'bg-amber-50 border-amber-200'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {getValidationIcon(check.status, check.severity)}
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{check.name}</div>
                                                    {check.details && (
                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{check.details}</div>
                                                    )}
                                                </div>
                                                <Badge variant={check.status === 'PASS' ? 'default' : check.status === 'FAIL' ? 'destructive' : 'secondary'}>
                                                    {check.status === 'PASS' ? 'OK' : check.status === 'FAIL' ? 'Lỗi' : 'Cảnh báo'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                                Hủy
                            </Button>
                            <Button
                                onClick={handleClosePeriod}
                                disabled={!validation?.passed || closePeriodMutation.isPending}
                                className="bg-gradient-to-r from-purple-600 to-blue-600"
                            >
                                {closePeriodMutation.isPending ? (
                                    <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <IconLock className="h-4 w-4 mr-1" />
                                )}
                                Đóng kỳ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Progress/Checklist Modal */}
            {showChecklistModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <IconChecklist className="h-5 w-5" />
                                    Tiến độ đóng kỳ
                                </h3>
                                <button onClick={() => setShowChecklistModal(false)} className="hover:bg-white/20 rounded p-1">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            {checklistLoading ? (
                                <div className="space-y-3">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : checklist ? (
                                <>
                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">Hoàn thành</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {checklist.progress.completed}/{checklist.progress.total} ({checklist.progress.percentage}%)
                                            </span>
                                        </div>
                                        <Progress value={checklist.progress.percentage} className="h-2" />
                                    </div>
                                    {/* Checklist Items */}
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {checklist.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${item.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900'
                                                    }`}
                                                onClick={() => updateChecklistMutation.mutate({ itemId: item.id, isCompleted: !item.is_completed })}
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${item.is_completed ? 'bg-green-600 border-green-600' : 'border-gray-300 dark:border-gray-600'
                                                    }`}>
                                                    {item.is_completed && <IconCheck className="h-3 w-3 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm ${item.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'font-medium'}`}>
                                                        {item.name}
                                                    </div>
                                                    {item.is_automated && (
                                                        <div className="text-xs text-blue-600">Tự động kiểm tra</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end">
                            <Button variant="outline" onClick={() => setShowChecklistModal(false)}>
                                Đóng
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reopen Period Modal with Reason */}
            {showReopenModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 text-white">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <IconLockOpen className="h-5 w-5" />
                                    Mở lại kỳ kế toán
                                </h3>
                                <button onClick={() => setShowReopenModal(false)} className="hover:bg-white/20 rounded p-1">
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Vui lòng nhập lý do mở lại kỳ để lưu vào lịch sử kiểm toán.
                            </p>
                            <Textarea
                                placeholder="Lý do mở lại kỳ kế toán..."
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowReopenModal(false)}>
                                Hủy
                            </Button>
                            <Button
                                onClick={handleReopenPeriod}
                                disabled={!reopenReason.trim() || reopenPeriodMutation.isPending}
                                className="bg-gradient-to-r from-amber-600 to-orange-600"
                            >
                                {reopenPeriodMutation.isPending ? (
                                    <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                    <IconLockOpen className="h-4 w-4 mr-1" />
                                )}
                                Mở lại kỳ
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Reconciliation Panel */}
            {selectedPeriodId && (
                <BankReconciliationPanel
                    periodId={selectedPeriodId}
                    periodName={periods?.find(p => p.id === selectedPeriodId)?.name || ''}
                    isOpen={showBankReconModal}
                    onClose={() => setShowBankReconModal(false)}
                    onComplete={() => {
                        queryClient.invalidateQueries({ queryKey: ['pre-close-validation', selectedPeriodId] });
                        queryClient.invalidateQueries({ queryKey: ['period-checklist', selectedPeriodId] });
                    }}
                />
            )}
        </>
    );
}
