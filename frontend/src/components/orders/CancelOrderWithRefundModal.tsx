'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    IconX,
    IconAlertTriangle,
    IconCash,
    IconCalendar,
    IconInfoCircle,
} from '@tabler/icons-react';

interface RefundPreview {
    order_id: string;
    order_code: string;
    event_date: string;
    days_before_event: number;
    paid_amount: number;
    refund_amount: number;
    retained_amount: number;
    refund_percentage: number;
    cancellation_type: string;
    policy_description: string;
    can_cancel: boolean;
}

interface CancelOrderModalProps {
    orderId: string;
    orderCode: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function CancelOrderWithRefundModal({
    orderId,
    orderCode,
    isOpen,
    onClose,
    onSuccess,
}: CancelOrderModalProps) {
    const queryClient = useQueryClient();
    const [cancelReason, setCancelReason] = useState('');
    const [forceMajeure, setForceMajeure] = useState(false);

    // Fetch refund preview
    const { data: preview, isLoading: previewLoading, refetch } = useQuery<RefundPreview>({
        queryKey: ['refund-preview', orderId, forceMajeure],
        queryFn: async () => {
            const response = await api.get<RefundPreview>(`/orders/${orderId}/refund-preview?force_majeure=${forceMajeure}`);
            return response;
        },
        enabled: isOpen && !!orderId,
    });

    // Refetch when forceMajeure changes
    useEffect(() => {
        if (isOpen) {
            refetch();
        }
    }, [forceMajeure, isOpen, refetch]);

    // Cancel mutation
    const cancelMutation = useMutation({
        mutationFn: async () => {
            return api.post<{ refund_amount: number }>(`/orders/${orderId}/cancel-with-refund`, {
                cancel_reason: cancelReason,
                force_majeure: forceMajeure,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });

            if (data.refund_amount > 0) {
                toast.success(`Đã hủy đơn hàng. Hoàn lại: ${formatCurrency(data.refund_amount)}`);
            } else {
                toast.success('Đã hủy đơn hàng');
            }

            onSuccess?.();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Không thể hủy đơn hàng');
        },
    });

    if (!isOpen) return null;

    const handleCancel = () => {
        if (!cancelReason.trim()) {
            toast.error('Vui lòng nhập lý do hủy');
            return;
        }
        cancelMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <IconAlertTriangle className="h-6 w-6" />
                        <h2 className="text-lg font-semibold">Hủy Đơn Hàng #{orderCode}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <IconX className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {previewLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : preview ? (
                        <>
                            {/* Event Info */}
                            <div className="flex items-center gap-2 text-gray-600">
                                <IconCalendar className="h-5 w-5" />
                                <span>Ngày tiệc: <strong>{formatDate(preview.event_date)}</strong></span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-sm">
                                    Còn {preview.days_before_event} ngày
                                </span>
                            </div>

                            {/* Refund Summary */}
                            {preview.paid_amount > 0 ? (
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-gray-700 font-medium">
                                        <IconCash className="h-5 w-5 text-green-600" />
                                        Thông tin thanh toán
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="text-gray-500">Đã thanh toán:</div>
                                        <div className="text-right font-medium">{formatCurrency(preview.paid_amount)}</div>

                                        <div className="text-gray-500">Hoàn lại ({preview.refund_percentage}%):</div>
                                        <div className="text-right font-medium text-green-600">
                                            {formatCurrency(preview.refund_amount)}
                                        </div>

                                        <div className="text-gray-500">Giữ lại:</div>
                                        <div className="text-right font-medium text-red-600">
                                            {formatCurrency(preview.retained_amount)}
                                        </div>
                                    </div>

                                    {/* Policy Description */}
                                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
                                        <IconInfoCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <span>{preview.policy_description}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                                    Đơn hàng chưa có thanh toán
                                </div>
                            )}

                            {/* Force Majeure Checkbox */}
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="forceMajeure"
                                    checked={forceMajeure}
                                    onCheckedChange={(checked) => setForceMajeure(checked === true)}
                                />
                                <Label htmlFor="forceMajeure" className="text-sm cursor-pointer">
                                    Bất khả kháng (Force Majeure) - Hoàn 100%
                                </Label>
                            </div>

                            {/* Cancel Reason */}
                            <div className="space-y-2">
                                <Label htmlFor="cancelReason" className="text-sm font-medium">
                                    Lý do hủy <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="cancelReason"
                                    placeholder="Nhập lý do hủy đơn hàng..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            {/* Cannot Cancel Warning */}
                            {!preview.can_cancel && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                    Không thể hủy đơn hàng này (đã hoàn thành hoặc đã hủy)
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Không thể tải thông tin đơn hàng
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50">
                    <Button variant="outline" onClick={onClose} disabled={cancelMutation.isPending}>
                        Đóng
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelMutation.isPending || !preview?.can_cancel || !cancelReason.trim()}
                    >
                        {cancelMutation.isPending ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
