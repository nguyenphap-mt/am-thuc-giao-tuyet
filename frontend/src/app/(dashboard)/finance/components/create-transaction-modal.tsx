'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreateTransactionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TransactionFormData {
    type: 'RECEIPT' | 'PAYMENT';
    category: string;
    amount: number;
    payment_method: string;
    description: string;
    transaction_date: string;
}

const RECEIPT_CATEGORIES = [
    { value: 'REVENUE', label: 'Doanh thu' },
    { value: 'DEPOSIT', label: 'Đặt cọc' },
    { value: 'OTHER_INCOME', label: 'Thu khác' },
];

const PAYMENT_CATEGORIES = [
    { value: 'NGUYENLIEU', label: 'Nguyên liệu' },
    { value: 'NHANCONG', label: 'Nhân công' },
    { value: 'THUEMUON', label: 'Thuê mướn' },
    { value: 'VANHANH', label: 'Vận hành' },
    { value: 'OTHER', label: 'Khác' },
];

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Tiền mặt' },
    { value: 'BANK', label: 'Chuyển khoản' },
    { value: 'CARD', label: 'Thẻ' },
    { value: 'EWALLET', label: 'Ví điện tử' },
];

export function CreateTransactionModal({ open, onOpenChange }: CreateTransactionModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<TransactionFormData>({
        type: 'PAYMENT',
        category: '',
        amount: 0,
        payment_method: 'CASH',
        description: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
    });

    const createMutation = useMutation({
        mutationFn: async (data: TransactionFormData) => {
            return api.post('/finance/transactions', data);
        },
        onSuccess: () => {
            toast.success('Tạo giao dịch thành công');
            queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['finance-stats'] });
            onOpenChange(false);
            // Reset form
            setFormData({
                type: 'PAYMENT',
                category: '',
                amount: 0,
                payment_method: 'CASH',
                description: '',
                transaction_date: format(new Date(), 'yyyy-MM-dd'),
            });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Không thể tạo giao dịch');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.category) {
            toast.error('Vui lòng chọn danh mục');
            return;
        }
        if (formData.amount <= 0) {
            toast.error('Số tiền phải lớn hơn 0');
            return;
        }

        createMutation.mutate(formData);
    };

    const categories = formData.type === 'RECEIPT' ? RECEIPT_CATEGORIES : PAYMENT_CATEGORIES;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Tạo giao dịch mới</DialogTitle>
                    <DialogDescription>
                        Ghi nhận thu hoặc chi tiền
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4">
                        {/* Type */}
                        <div className="space-y-2">
                            <Label>Loại giao dịch</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: 'RECEIPT' | 'PAYMENT') =>
                                    setFormData({ ...formData, type: value, category: '' })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RECEIPT">Thu tiền</SelectItem>
                                    <SelectItem value="PAYMENT">Chi tiền</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Danh mục *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn danh mục" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label>Số tiền (VND) *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                placeholder="Nhập số tiền"
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label>Phương thức thanh toán</Label>
                            <Select
                                value={formData.payment_method}
                                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((method) => (
                                        <SelectItem key={method.value} value={method.value}>
                                            {method.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date */}
                        <div className="space-y-2">
                            <Label>Ngày giao dịch</Label>
                            <Input
                                type="date"
                                value={formData.transaction_date}
                                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Mô tả</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ghi chú về giao dịch..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending && (
                                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Tạo giao dịch
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
