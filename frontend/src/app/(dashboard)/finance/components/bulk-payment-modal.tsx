'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { IconCash, IconLoader } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';

interface SelectedOrder {
    order_id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
}

interface PaymentEntry {
    order_id: string;
    amount: number;
    pay_full: boolean;
}

interface BulkPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedOrders: SelectedOrder[];
    onSuccess: () => void;
}

export function BulkPaymentModal({
    open,
    onOpenChange,
    selectedOrders,
    onSuccess,
}: BulkPaymentModalProps) {
    const [payments, setPayments] = useState<Record<string, PaymentEntry>>(() => {
        const initial: Record<string, PaymentEntry> = {};
        selectedOrders.forEach((order) => {
            initial[order.order_id] = {
                order_id: order.order_id,
                amount: order.balance_amount,
                pay_full: true,
            };
        });
        return initial;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentDate, setPaymentDate] = useState(
        new Date().toISOString().split('T')[0]
    );

    const totalPayment = Object.values(payments).reduce(
        (sum, p) => sum + (p.amount || 0),
        0
    );

    const handleAmountChange = (orderId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        const order = selectedOrders.find((o) => o.order_id === orderId);
        const maxAmount = order?.balance_amount || 0;

        setPayments((prev) => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                amount: Math.min(numValue, maxAmount),
                pay_full: numValue >= maxAmount,
            },
        }));
    };

    const handlePayFullChange = (orderId: string, checked: boolean) => {
        const order = selectedOrders.find((o) => o.order_id === orderId);
        setPayments((prev) => ({
            ...prev,
            [orderId]: {
                ...prev[orderId],
                pay_full: checked,
                amount: checked ? order?.balance_amount || 0 : prev[orderId].amount,
            },
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const paymentsList = Object.values(payments)
                .filter((p) => p.amount > 0)
                .map((p) => ({
                    order_id: p.order_id,
                    amount: p.amount,
                    payment_method: paymentMethod,
                    payment_date: paymentDate,
                }));

            if (paymentsList.length === 0) {
                toast.error('Vui lòng nhập số tiền thanh toán');
                setIsSubmitting(false);
                return;
            }

            await api.post('/finance/payments/bulk', { payments: paymentsList });
            toast.success(`Đã ghi nhận ${paymentsList.length} thanh toán thành công`);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Bulk payment error:', error);
            toast.error('Không thể ghi nhận thanh toán. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconCash className="h-5 w-5 text-green-600" />
                        Ghi nhận thanh toán hàng loạt
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Payment settings */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="space-y-2">
                            <Label htmlFor="paymentMethod">Phương thức</Label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white text-sm focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="CASH">Tiền mặt</option>
                                <option value="BANK_TRANSFER">Chuyển khoản</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentDate">Ngày thanh toán</Label>
                            <Input
                                id="paymentDate"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Orders list */}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                                        Đơn hàng
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                                        Còn nợ
                                    </th>
                                    <th className="text-center py-3 px-3 font-medium text-gray-600 dark:text-gray-400 w-20">
                                        Trả hết
                                    </th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-600 dark:text-gray-400 w-40">
                                        Số tiền thanh toán
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrders.map((order) => (
                                    <tr
                                        key={order.order_id}
                                        className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900"
                                    >
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-blue-600">
                                                {order.order_code}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {order.customer_name} •{' '}
                                                {format(parseISO(order.event_date), 'dd/MM/yyyy', {
                                                    locale: vi,
                                                })}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-red-600 font-medium">
                                            {formatCurrency(order.balance_amount)}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <Checkbox
                                                checked={payments[order.order_id]?.pay_full ?? true}
                                                onCheckedChange={(checked) =>
                                                    handlePayFullChange(order.order_id, checked === true)
                                                }
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={order.balance_amount}
                                                value={payments[order.order_id]?.amount || 0}
                                                onChange={(e) =>
                                                    handleAmountChange(order.order_id, e.target.value)
                                                }
                                                className="text-right h-9"
                                                disabled={payments[order.order_id]?.pay_full}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tổng số đơn:</span>
                            <Badge variant="outline" className="bg-white">
                                {selectedOrders.length} đơn hàng
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Tổng thanh toán:</span>
                            <span className="text-lg font-bold text-green-600">
                                {formatCurrency(totalPayment)}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || totalPayment === 0}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                        {isSubmitting ? (
                            <>
                                <IconLoader className="h-4 w-4 mr-2 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <IconCash className="h-4 w-4 mr-2" />
                                Xác nhận thanh toán
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
