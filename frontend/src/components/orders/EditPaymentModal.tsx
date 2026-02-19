'use client';

import { useState, useEffect } from 'react';
import { useUpdatePayment } from '@/hooks/use-orders';
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

interface PaymentData {
    id: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    note?: string;
    payment_date?: string;
}

interface EditPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    orderCode: string;
    payment: PaymentData | null;
    onSuccess: () => void;
}

const paymentMethods = [
    { value: 'CASH', label: 'Tiền mặt', icon: IconCash },
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: IconBuildingBank },
    { value: 'CARD', label: 'Thẻ', icon: IconCreditCard },
];

export function EditPaymentModal({
    isOpen,
    onClose,
    orderId,
    orderCode,
    payment,
    onSuccess,
}: EditPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [referenceNo, setReferenceNo] = useState('');
    const [note, setNote] = useState('');

    const updatePayment = useUpdatePayment();

    // Pre-fill form when payment data changes
    useEffect(() => {
        if (payment) {
            const formatted = Math.round(payment.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            setAmount(formatted);
            setPaymentMethod(payment.payment_method || 'CASH');
            setReferenceNo(payment.reference_no || '');
            setNote(payment.note || '');
        }
    }, [payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!payment) return;

        const amountValue = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(amountValue) || amountValue <= 0) {
            return;
        }

        await updatePayment.mutateAsync({
            orderId,
            paymentId: payment.id,
            data: {
                amount: amountValue,
                payment_method: paymentMethod,
                reference_no: referenceNo || undefined,
                note: note || undefined,
            },
        });

        onSuccess();
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        setAmount(formatted);
    };

    if (!payment) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconCreditCard className="h-5 w-5 text-purple-600" />
                        Sửa Thanh Toán
                    </DialogTitle>
                    <DialogDescription>
                        Đơn hàng: <span className="font-medium">{orderCode}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-amount">Số tiền *</Label>
                        <div className="relative">
                            <Input
                                id="edit-amount"
                                type="text"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0"
                                className="pr-16 text-right text-lg font-medium"
                                required
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">đ</span>
                        </div>
                    </div>

                    {/* Payment Method */}
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

                    {/* Reference No */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-reference">Số tham chiếu</Label>
                        <Input
                            id="edit-reference"
                            type="text"
                            value={referenceNo}
                            onChange={(e) => setReferenceNo(e.target.value)}
                            placeholder="VD: Mã giao dịch ngân hàng"
                        />
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-note">Ghi chú</Label>
                        <Textarea
                            id="edit-note"
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
                            disabled={updatePayment.isPending || !amount}
                            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        >
                            {updatePayment.isPending ? 'Đang xử lý...' : 'Cập nhật'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
