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
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconReceipt,
    IconArrowUpRight,
    IconArrowDownRight,
    IconCreditCard,
    IconCalendar,
    IconTag,
    IconFileDescription,
    IconLink,
    IconClock,
    IconChevronRight,
    IconUser,
    IconMapPin,
    IconUsers,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

// Minimal order shape for reference display
interface ReferencedOrder {
    id: string;
    code: string;
    status: string;
    customer_name: string;
    customer_phone?: string;
    event_date: string;
    event_address?: string;
    guest_count?: number;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
}

interface Transaction {
    id: string;
    code: string;
    type: 'RECEIPT' | 'PAYMENT';
    category: string;
    amount: number;
    payment_method: string;
    description: string;
    reference_type: string | null;
    reference_id: string | null;
    transaction_date: string;
    created_at: string;
}

interface TransactionDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    REVENUE: 'Doanh thu',
    DEPOSIT: 'Đặt cọc',
    OTHER_INCOME: 'Thu khác',
    NGUYENLIEU: 'Nguyên liệu',
    NHANCONG: 'Nhân công',
    THUEMUON: 'Thuê mướn',
    VANHANH: 'Vận hành',
    MARKETING: 'Marketing',
    UTILITIES: 'Tiện ích',
    SALARY: 'Lương',
    OTHER: 'Khác',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    CASH: 'Tiền mặt',
    BANK: 'Chuyển khoản',
    TRANSFER: 'Chuyển khoản',
    CARD: 'Thẻ',
    EWALLET: 'Ví điện tử',
};

const ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Đã xác nhận', className: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-purple-100 text-purple-700' },
    ON_HOLD: { label: 'Tạm hoãn', className: 'bg-orange-100 text-orange-700' },
    COMPLETED: { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

// Extract order code (DH-XXXXXXXXX) from description text
function extractOrderCode(description: string | null): string | null {
    if (!description) return null;
    const match = description.match(/DH-\d+/);
    return match ? match[0] : null;
}

interface PaginatedOrders {
    items: ReferencedOrder[];
    total: number;
}

export function TransactionDetailDrawer({
    open,
    onOpenChange,
    transaction,
}: TransactionDetailDrawerProps) {
    const router = useRouter();

    // Extract order code from description (backend doesn't store reference_id)
    const orderCode = transaction ? extractOrderCode(transaction.description) : null;
    const hasOrderRef = !!orderCode;

    // Search for the referenced order by code
    const { data: refOrder, isLoading: isLoadingOrder } = useQuery({
        queryKey: ['transaction-ref-order', orderCode],
        queryFn: async () => {
            const result = await api.get<PaginatedOrders>(`/orders?search=${orderCode}&page_size=1`);
            // Find exact match from search results
            const match = result.items?.find((o: ReferencedOrder) => o.code === orderCode);
            return match || null;
        },
        enabled: open && hasOrderRef,
    });

    if (!transaction) return null;

    const isReceipt = transaction.type === 'RECEIPT';
    const statusInfo = refOrder ? ORDER_STATUS_MAP[refOrder.status] : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <IconReceipt className="h-5 w-5 text-blue-600" />
                        Chi tiết giao dịch
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2 pt-1">
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{transaction.code}</span>
                        {isReceipt ? (
                            <Badge className="bg-green-100 text-green-700">
                                <IconArrowUpRight className="h-3 w-3 mr-1" />
                                Thu
                            </Badge>
                        ) : (
                            <Badge className="bg-red-100 text-red-700">
                                <IconArrowDownRight className="h-3 w-3 mr-1" />
                                Chi
                            </Badge>
                        )}
                    </SheetDescription>
                </SheetHeader>

                <div className="py-5 space-y-5">
                    {/* Amount - Large Display */}
                    <div className={`text-center p-6 rounded-xl ${isReceipt ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Số tiền</p>
                        <p className={`text-3xl font-bold tabular-nums ${isReceipt ? 'text-green-600' : 'text-red-600'}`}>
                            {isReceipt ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                    </div>

                    {/* Detail Grid */}
                    <div className="space-y-1">
                        {/* Date */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                <IconCalendar className="h-4 w-4" />
                                Ngày giao dịch
                            </div>
                            <span className="font-medium text-sm tabular-nums">
                                {format(parseISO(transaction.transaction_date), 'dd/MM/yyyy', { locale: vi })}
                            </span>
                        </div>

                        {/* Category */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                <IconTag className="h-4 w-4" />
                                Danh mục
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {CATEGORY_LABELS[transaction.category] || transaction.category}
                            </Badge>
                        </div>

                        {/* Payment Method */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                <IconCreditCard className="h-4 w-4" />
                                Phương thức
                            </div>
                            <span className="font-medium text-sm">
                                {PAYMENT_METHOD_LABELS[transaction.payment_method] || transaction.payment_method}
                            </span>
                        </div>

                        {/* Created At */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                <IconClock className="h-4 w-4" />
                                Ngày tạo
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                                {format(parseISO(transaction.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                            </span>
                        </div>
                    </div>

                    {/* Referenced Order Card */}
                    {hasOrderRef && (
                        <>
                            <div className="border-t border-gray-200 dark:border-gray-700" />
                            <div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    <IconLink className="h-4 w-4" />
                                    Đơn hàng liên quan
                                </div>

                                {isLoadingOrder ? (
                                    <div className="border rounded-lg p-4 space-y-2">
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-48" />
                                    </div>
                                ) : refOrder ? (
                                    <div
                                        className="border rounded-lg p-4 hover:bg-blue-50/50 hover:border-blue-200 transition-colors cursor-pointer group"
                                        onClick={() => {
                                            onOpenChange(false);
                                            router.push(`/orders/${refOrder.id}`);
                                        }}
                                    >
                                        {/* Order header: code + status */}
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-mono text-sm font-bold text-blue-600 group-hover:text-blue-700">
                                                {refOrder.code}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {statusInfo && (
                                                    <Badge className={`${statusInfo.className} text-xs`}>
                                                        {statusInfo.label}
                                                    </Badge>
                                                )}
                                                <IconChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                        </div>

                                        {/* Customer name */}
                                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-1.5">
                                            <IconUser className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                            <span className="font-medium">{refOrder.customer_name}</span>
                                        </div>

                                        {/* Event date + address */}
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                            <IconCalendar className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                            {format(parseISO(refOrder.event_date), 'dd/MM/yyyy', { locale: vi })}
                                            {refOrder.event_address && (
                                                <>
                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                    <IconMapPin className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                                    <span className="truncate max-w-[160px]">{refOrder.event_address}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Guest count */}
                                        {refOrder.guest_count && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                <IconUsers className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                                {refOrder.guest_count} khách
                                            </div>
                                        )}

                                        {/* Financial summary */}
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Tổng tiền</p>
                                                <p className="text-xs font-semibold tabular-nums">{formatCurrency(refOrder.final_amount)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Đã thu</p>
                                                <p className="text-xs font-semibold text-green-600 tabular-nums">{formatCurrency(refOrder.paid_amount)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-400 dark:text-gray-500">Còn nợ</p>
                                                <p className={`text-xs font-semibold tabular-nums ${refOrder.balance_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(refOrder.balance_amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
                                        Không tìm thấy đơn hàng
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Non-order reference type */}
                    {transaction.reference_type && !hasOrderRef && (
                        <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                                <IconLink className="h-4 w-4" />
                                Tham chiếu
                            </div>
                            <Badge variant="outline" className="text-xs">
                                {transaction.reference_type}
                            </Badge>
                        </div>
                    )}

                    {/* Description */}
                    {transaction.description && (
                        <>
                            <div className="border-t border-gray-200 dark:border-gray-700" />
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    <IconFileDescription className="h-4 w-4" />
                                    Mô tả
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {transaction.description}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
