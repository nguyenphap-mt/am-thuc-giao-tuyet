'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconReceipt,
    IconUser,
    IconCalendar,
    IconMapPin,
    IconUsers,
    IconClock,
    IconPhone,
    IconCreditCard,
    IconPackage,
    IconExternalLink,
} from '@tabler/icons-react';
import Link from 'next/link';

// Reuse Order type shape — only fields we need
interface OrderItem {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    category?: string;
}

interface OrderPayment {
    id: string;
    amount: number;
    payment_method: string;
    payment_date: string;
    note?: string;
}

interface OrderDetail {
    id: string;
    code: string;
    status: string;
    customer_name: string;
    customer_phone?: string;
    event_date: string;
    event_time?: string;
    event_address?: string;
    guest_count?: number;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
    discount_amount?: number;
    note?: string;
    items?: OrderItem[];
    payments?: OrderPayment[];
}

interface ReceivableDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string | null;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-purple-100 text-purple-700' },
    ON_HOLD: { label: 'Tạm hoãn', className: 'bg-orange-100 text-orange-700' },
    COMPLETED: { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    CARD: 'Thẻ',
};

export function ReceivableDetailDrawer({
    open,
    onOpenChange,
    orderId,
}: ReceivableDetailDrawerProps) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['order-detail-drawer', orderId],
        queryFn: async () => {
            const response = await api.get<OrderDetail>(`/orders/${orderId}`);
            return response;
        },
        enabled: open && !!orderId,
    });

    const balance = data ? Number(data.balance_amount || 0) : 0;
    const paidPercent = data && Number(data.final_amount) > 0
        ? Math.min(100, (Number(data.paid_amount || 0) / Number(data.final_amount)) * 100)
        : 0;
    const statusInfo = data ? STATUS_MAP[data.status] || { label: data.status, className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' } : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <IconReceipt className="h-5 w-5 text-blue-600" />
                        Chi tiết công nợ phải thu
                    </SheetTitle>
                    {data && (
                        <SheetDescription className="flex items-center gap-2 pt-1">
                            <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{data.code}</span>
                            {statusInfo && (
                                <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                            )}
                        </SheetDescription>
                    )}
                </SheetHeader>

                <div className="py-4 space-y-5">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            Không thể tải chi tiết đơn hàng
                        </div>
                    ) : data ? (
                        <>
                            {/* Customer Info */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <IconUser className="h-4 w-4" />
                                    Khách hàng
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{data.customer_name}</p>
                                {data.customer_phone && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <IconPhone className="h-3.5 w-3.5 inline mr-1" />
                                        {data.customer_phone}
                                    </p>
                                )}
                            </div>

                            {/* Event Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        <IconCalendar className="h-3.5 w-3.5" />
                                        Ngày sự kiện
                                    </div>
                                    <p className="font-medium text-sm tabular-nums">
                                        {format(parseISO(data.event_date), 'dd/MM/yyyy', { locale: vi })}
                                    </p>
                                </div>
                                {data.event_time && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            <IconClock className="h-3.5 w-3.5" />
                                            Giờ
                                        </div>
                                        <p className="font-medium text-sm">{data.event_time}</p>
                                    </div>
                                )}
                                {data.event_address && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 col-span-2">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            <IconMapPin className="h-3.5 w-3.5" />
                                            Địa điểm
                                        </div>
                                        <p className="font-medium text-sm truncate">{data.event_address}</p>
                                    </div>
                                )}
                                {data.guest_count && (
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                            <IconUsers className="h-3.5 w-3.5" />
                                            Số khách
                                        </div>
                                        <p className="font-medium text-sm">{data.guest_count} người</p>
                                    </div>
                                )}
                            </div>

                            {/* Payment Progress */}
                            <div className="bg-white border rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tình hình thanh toán</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Tổng tiền</span>
                                        <span className="font-semibold tabular-nums">{formatCurrency(data.final_amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Đã thu</span>
                                        <span className="font-semibold text-green-600 tabular-nums">{formatCurrency(data.paid_amount)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-[width] duration-300"
                                            style={{ width: `${paidPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Còn nợ</span>
                                        <span className={`font-bold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {formatCurrency(balance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700" />

                            {/* Items Table */}
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    <IconPackage className="h-4 w-4" />
                                    Chi tiết đơn hàng ({data.items?.length || 0} món)
                                </div>
                                {data.items && data.items.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 dark:bg-gray-900 border-b">
                                                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Món</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">SL</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Đơn giá</th>
                                                    <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.items.map((item) => (
                                                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900">
                                                        <td className="py-2 px-3">
                                                            <span className="font-medium text-gray-900 dark:text-gray-100">{item.item_name}</span>
                                                            {item.category && (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({item.category})</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-right tabular-nums">{item.quantity}</td>
                                                        <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
                                                        <td className="py-2 px-3 text-right font-medium tabular-nums">{formatCurrency(item.total_price)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 dark:bg-gray-900">
                                                {data.discount_amount && data.discount_amount > 0 && (
                                                    <tr className="border-t">
                                                        <td colSpan={3} className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">Giảm giá</td>
                                                        <td className="py-2 px-3 text-right font-medium text-orange-600 tabular-nums">-{formatCurrency(data.discount_amount)}</td>
                                                    </tr>
                                                )}
                                                <tr className="border-t">
                                                    <td colSpan={3} className="py-2 px-3 text-right font-medium text-gray-700 dark:text-gray-300">Tổng cộng</td>
                                                    <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(data.final_amount)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Chưa có món ăn nào</p>
                                )}
                            </div>

                            {/* Payment History */}
                            {data.payments && data.payments.length > 0 && (
                                <>
                                    <div className="border-t border-gray-200 dark:border-gray-700" />
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            <IconCreditCard className="h-4 w-4" />
                                            Lịch sử thanh toán ({data.payments.length})
                                        </div>
                                        <div className="border rounded-lg divide-y">
                                            {data.payments.map((payment) => (
                                                <div key={payment.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(payment.amount)}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {PAYMENT_METHOD_MAP[payment.payment_method] || payment.payment_method}
                                                            {' • '}
                                                            {format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: vi })}
                                                        </p>
                                                        {payment.note && (
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{payment.note}</p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
                                                        Đã thu
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Notes */}
                            {data.note && (
                                <>
                                    <div className="border-t border-gray-200 dark:border-gray-700" />
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                        <p className="text-sm font-medium text-yellow-800 mb-1">Ghi chú</p>
                                        <p className="text-sm text-yellow-700 whitespace-pre-wrap">{data.note}</p>
                                    </div>
                                </>
                            )}

                            {/* Link to full order detail */}
                            <div className="pt-2">
                                <Link href={`/orders/${data.id}`}>
                                    <Button variant="outline" className="w-full">
                                        <IconExternalLink className="h-4 w-4 mr-2" />
                                        Xem chi tiết đơn hàng đầy đủ
                                    </Button>
                                </Link>
                            </div>
                        </>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}
