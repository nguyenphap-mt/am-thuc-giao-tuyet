'use client';

import { useState } from 'react';
import { useAddPayment } from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    IconCreditCard,
    IconCash,
    IconBuildingBank,
} from '@tabler/icons-react';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderCode: string;
    balanceAmount: number;
    onSuccess: () => void;
}

const paymentMethods = [
    { value: 'CASH', label: 'Tiền mặt', icon: IconCash },
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: IconBuildingBank },
    { value: 'CARD', label: 'Thẻ', icon: IconCreditCard },
];

export function AddPaymentModal({
    isOpen,
    onClose,
    orderId,
    orderCode,
    balanceAmount,
    onSuccess,
}: AddPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [note, setNote] = useState('');

    const addPayment = useAddPayment();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const amountValue = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(amountValue) || amountValue <= 0) {
            return;
        }

        await addPayment.mutateAsync({
            orderId,
            data: {
                amount: amountValue,
                payment_method: paymentMethod,
                note: note || undefined,
            },
        });

        // Reset form
        setAmount('');
        setPaymentMethod('CASH');
        setNote('');
        onSuccess();
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove non-numeric characters except comma
        const value = e.target.value.replace(/[^\d]/g, '');
        // Format with thousand separators
        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        setAmount(formatted);
    };

    const handlePayFull = () => {
        const formatted = balanceAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        setAmount(formatted);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconCreditCard className="h-5 w-5 text-purple-600" />
                        Thêm Thanh Toán
                    </DialogTitle>
                    <DialogDescription>
                        Đơn hàng: <span className="font-medium">{orderCode}</span>
                        <br />
                        Còn lại: <span className="font-medium text-red-600">{formatCurrency(balanceAmount)}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Số tiền *</Label>
                        <div className="relative">
                            <Input
                                id="amount"
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0"
                                className="pr-16 text-right text-lg font-medium"
                                required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">đ</span>
                        </div>
                        {balanceAmount > 0 && (
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-purple-600"
                                onClick={handlePayFull}
                            >
                                Thanh toán toàn bộ ({formatCurrency(balanceAmount)})
                            </Button>
                        )}
                    </div>

                    {/* Payment Method - Using button toggle instead of RadioGroup */}
                    <div className="space-y-2">
                        <Label>Phương thức thanh toán *</Label>
                        <div className="flex gap-2">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = paymentMethod === method.value;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.value)}
                                        className={cn(
                                            'flex-1 flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 transition-all',
                                            isSelected
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                        )}
                                    >
                                        <Icon className={cn(
                                            'h-5 w-5',
                                            isSelected ? 'text-purple-600' : 'text-gray-600'
                                        )} />
                                        <span className={cn(
                                            'text-xs font-medium',
                                            isSelected ? 'text-purple-700' : 'text-gray-700'
                                        )}>{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label htmlFor="note">Ghi chú</Label>
                        <Textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="VD: Đặt cọc 50%"
                            rows={2}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={addPayment.isPending || !amount}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        >
                            {addPayment.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
