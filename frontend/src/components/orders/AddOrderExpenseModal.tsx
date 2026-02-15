'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

interface AddOrderExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderCode: string;
    onSuccess?: () => void;
}

const EXPENSE_CATEGORIES = [
    { value: 'NGUYENLIEU', label: '🥩 Nguyên liệu', description: 'Thực phẩm, đồ uống' },
    { value: 'NHANCONG', label: '👷 Nhân công', description: 'Thuê phục vụ, bếp' },
    { value: 'THUEMUON', label: '🪑 Thuê mướn', description: 'Bàn ghế, dụng cụ' },
    { value: 'VANHANH', label: '🚗 Vận hành', description: 'Xăng xe, vận chuyển' },
    { value: 'KHAC', label: '📦 Khác', description: 'Chi phí phát sinh' },
];

export function AddOrderExpenseModal({
    isOpen,
    onClose,
    orderId,
    orderCode,
    onSuccess,
}: AddOrderExpenseModalProps) {
    const queryClient = useQueryClient();
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    const mutation = useMutation({
        mutationFn: (data: { category: string; amount: number; description?: string }) =>
            api.post(`/orders/${orderId}/expenses`, data),
        onSuccess: () => {
            toast.success('Đã thêm chi phí thành công!');
            queryClient.invalidateQueries({ queryKey: ['order', orderId] });
            queryClient.invalidateQueries({ queryKey: ['order-expenses', orderId] });
            resetForm();
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.detail || 'Lỗi khi thêm chi phí');
        },
    });

    const resetForm = () => {
        setCategory('');
        setAmount('');
        setDescription('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!category) {
            toast.error('Vui lòng chọn hạng mục');
            return;
        }

        const numAmount = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        mutation.mutate({
            category,
            amount: numAmount,
            description: description || undefined,
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Format number with thousand separators
    const formatAmount = (value: string) => {
        const num = value.replace(/[^0-9]/g, '');
        return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        💸 Thêm Chi Phí Trực Tiếp
                    </DialogTitle>
                    <DialogDescription>
                        Ghi nhận chi phí cho đơn hàng <strong>{orderCode}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Category */}
                    <div className="space-y-2">
                        <Label htmlFor="category">Hạng mục <span className="text-red-500">*</span></Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Chọn hạng mục chi phí" />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <div className="flex flex-col">
                                            <span>{cat.label}</span>
                                            <span className="text-xs text-gray-500">{cat.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Số tiền <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <Input
                                id="amount"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(formatAmount(e.target.value))}
                                className="pr-12 text-right font-medium"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                đ
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả (tùy chọn)</Label>
                        <Textarea
                            id="description"
                            placeholder="VD: Mua 20kg thịt bò Úc tại chợ Bến Thành"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={mutation.isPending}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        >
                            {mutation.isPending ? (
                                <>
                                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu chi phí'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
