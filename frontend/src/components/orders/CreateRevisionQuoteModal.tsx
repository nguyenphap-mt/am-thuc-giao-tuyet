'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconFileDescription, IconCurrencyDong, IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CreateRevisionQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
}

interface RevisionQuoteResponse {
    quote_id: string;
    quote_code: string;
    message: string;
    deposit_amount: number;
}

export function CreateRevisionQuoteModal({ isOpen, onClose, order }: CreateRevisionQuoteModalProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);

    const createRevisionMutation = useMutation({
        mutationFn: async () => {
            // api.post returns the data directly from axios response
            const data = await api.post<RevisionQuoteResponse>(`/orders/${order.id}/create-revision-quote`);
            return data;
        },
        onSuccess: (data) => {
            // Navigate to quote edit page
            if (data && data.quote_id) {
                router.push(`/quote/${data.quote_id}/edit`);
                onClose();
            } else {
                console.error('Invalid response from create-revision-quote', data);
                alert('Tạo báo giá thành công nhưng không thể chuyển hướng. Vui lòng kiểm tra danh sách báo giá.');
                onClose();
            }
        },
        onError: (error: any) => {
            console.error('Failed to create revision quote:', error);
            alert(error.response?.data?.detail || 'Không thể tạo báo giá mới');
        },
    });


    const handleConfirm = async () => {
        setIsCreating(true);
        try {
            await createRevisionMutation.mutateAsync();
        } finally {
            setIsCreating(false);
        }
    };

    const hasDeposit = order.paid_amount > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <IconFileDescription className="h-5 w-5 text-orange-500" />
                        Tạo Báo Giá Mới Từ Đơn Hàng
                    </DialogTitle>
                    <DialogDescription>
                        Tạo báo giá chỉnh sửa từ đơn hàng <strong>{order.code}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Order Info Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-gray-500">Khách hàng</p>
                                <p className="font-medium">{order.customer_name}</p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {order.status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-500">Ngày sự kiện</p>
                                <p className="font-medium">{formatDate(order.event_date)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Tổng tiền</p>
                                <p className="font-medium">{formatCurrency(order.final_amount)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Deposit Info */}
                    {hasDeposit && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <IconCurrencyDong className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                    <p className="font-medium text-blue-900">Tiền cọc đã nhận</p>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">
                                        {formatCurrency(order.paid_amount)}
                                    </p>
                                    <p className="text-sm text-blue-700 mt-2 flex items-center gap-1">
                                        <IconCheck className="h-4 w-4" />
                                        Số tiền này sẽ tự động chuyển sang đơn hàng mới
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <IconAlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium">Lưu ý quan trọng:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                    <li>Báo giá mới sẽ được tạo ở trạng thái <strong>Nháp</strong></li>
                                    <li>Đơn hàng cũ sẽ bị <strong>hủy</strong> khi báo giá mới được chuyển thành đơn hàng</li>
                                    {hasDeposit && (
                                        <li>Tiền cọc {formatCurrency(order.paid_amount)} sẽ được chuyển sang đơn mới</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isCreating}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isCreating}
                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                        {isCreating ? (
                            <>
                                <span className="animate-spin mr-2">⏳</span>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <IconFileDescription className="h-4 w-4 mr-2" />
                                Tạo Báo Giá Mới
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
