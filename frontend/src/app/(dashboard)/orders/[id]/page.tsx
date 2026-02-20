'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useOrder, useOrderAction, useDeletePayment, useReopenOrder } from '@/hooks/use-orders';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { printMenuA5 } from '@/lib/menu-print-engine';
import { printContract } from '@/lib/contract-print-engine';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { OrderStatusStepper } from '@/components/orders/OrderStatusStepper';
import { AddPaymentModal } from '@/components/orders/AddPaymentModal';
import { EditPaymentModal } from '@/components/orders/EditPaymentModal';
import { AddOrderExpenseModal } from '@/components/orders/AddOrderExpenseModal';
import { CreateRevisionQuoteModal } from '@/components/orders/CreateRevisionQuoteModal';
import { CancelOrderWithRefundModal } from '@/components/orders/CancelOrderWithRefundModal';
import { StaffSuggestionModal } from '../components/StaffSuggestionModal';
import { AssignedStaffCard } from '../components/AssignedStaffCard';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { OrderNotesSection } from '../components/OrderNotesSection';
import { StatusConfirmationModal } from '../components/StatusConfirmationModal';
import {
    IconArrowLeft,
    IconPrinter,
    IconX,
    IconUser,
    IconCalendar,
    IconMapPin,
    IconUsers,
    IconClock,
    IconPhone,
    IconMail,
    IconCreditCard,
    IconPlus,
    IconCheck,
    IconPlayerPause,
    IconPlayerPlay,
    IconReceipt,
    IconReceipt2,
    IconFileDescription,
    IconUserCircle,
    IconChevronDown,
    IconToolsKitchen2,
    IconEdit,
    IconTrash,
    IconRotate,
} from '@tabler/icons-react';

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    ON_HOLD: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang thực hiện',
    ON_HOLD: 'Tạm hoãn',
    COMPLETED: 'Hoàn thành',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
};

const paymentMethodLabels: Record<string, string> = {
    CASH: 'Tiền mặt',
    TRANSFER: 'Chuyển khoản',
    CARD: 'Thẻ',
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
    const router = useRouter();
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showStaffSuggestionModal, setShowStaffSuggestionModal] = useState(false);
    // Status confirmation modals
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showResumeModal, setShowResumeModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    // Payment management
    const [editingPayment, setEditingPayment] = useState<any>(null);
    const [deletingPayment, setDeletingPayment] = useState<any>(null);

    // Accessibility: Honor user's motion preferences
    const prefersReducedMotion = useReducedMotion();

    // Unwrap params using React.use()
    const { id: orderId } = use(params);

    const { data: order, isLoading, error, refetch } = useOrder(orderId);
    const orderAction = useOrderAction();
    const reopenOrder = useReopenOrder();
    const deletePaymentMutation = useDeletePayment();

    // Fetch order expenses
    const { data: expenses = [], refetch: refetchExpenses } = useQuery({
        queryKey: ['order-expenses', orderId],
        queryFn: () => api.get<Array<{
            id: string;
            category: string;
            amount: number;
            description: string | null;
            created_at: string;
        }>>(`/orders/${orderId}/expenses`),
        enabled: !!orderId,
    });

    // Fetch staff costs (P3: Order Staff Cost Tracking)
    interface StaffCostItem {
        assignment_id: string;
        employee_id: string;
        employee_name: string;
        role: string;
        is_fulltime: boolean;
        hourly_rate: number;
        planned_hours: number;
        actual_hours: number;
        cost: number;
        status: string;
        phone?: string;
        start_time?: string;
        end_time?: string;
    }

    interface StaffCostsResponse {
        order_id: string;
        order_code: string;
        total_staff_cost: number;
        total_planned_hours: number;
        total_actual_hours: number;
        staff_count: number;
        assignments: StaffCostItem[];
    }

    const { data: staffCosts, refetch: refetchStaffCosts } = useQuery({
        queryKey: ['order-staff-costs', orderId],
        queryFn: () => api.get<StaffCostsResponse>(`/orders/${orderId}/staff-costs`),
        enabled: !!orderId,
    });

    const handleAction = async (action: 'confirm' | 'complete' | 'cancel' | 'hold' | 'resume' | 'mark-paid') => {
        if (!orderId) return;
        await orderAction.mutateAsync({ id: orderId, action });
        refetch();
    };

    const paymentPercentage = order
        ? Math.min(100, Math.round((order.paid_amount / order.final_amount) * 100))
        : 0;

    const CATEGORY_LABELS: Record<string, string> = {
        NGUYENLIEU: '🥩 Nguyên liệu',
        NHANCONG: '👷 Nhân công',
        THUEMUON: '🪑 Thuê mướn',
        VANHANH: '🚗 Vận hành',
        KHAC: '📦 Khác',
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
                <Skeleton className="h-20" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-16">
                <p className="text-red-500">Không thể tải thông tin đơn hàng</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <IconArrowLeft className="h-4 w-4 mr-2" />
                    Quay lại
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Sticky Header */}
            <motion.div
                className="sticky top-0 z-40 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white border-b border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Quay lại">
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Đơn Hàng #{order.code}
                        </h1>
                        <Badge className={`${statusColors[order.status]} mt-1`}>
                            {statusLabels[order.status]}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" aria-label="In">
                                <IconPrinter className="h-4 w-4 mr-1" />
                                In
                                <IconChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => printMenuA5({
                                    orderId: order.id,
                                    orderCode: order.code,
                                })}
                            >
                                <IconToolsKitchen2 className="h-4 w-4 mr-2" />
                                In Thực Đơn (A5)
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => printContract({
                                    orderId: order.id,
                                    orderCode: order.code,
                                })}
                            >
                                <IconReceipt className="h-4 w-4 mr-2" />
                                In Hợp Đồng
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Revision Quote Button (CONFIRMED/IN_PROGRESS orders only) */}
                    {(order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS') && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            onClick={() => setShowRevisionModal(true)}
                            aria-label="Sửa đơn"
                        >
                            <IconFileDescription className="h-4 w-4 mr-1" />
                            Sửa Đơn
                        </Button>
                    )}

                    {/* Divider for status actions */}
                    {(order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS' || order.status === 'ON_HOLD') && (
                        <div className="hidden sm:block h-6 w-px bg-gray-300 mx-1" />
                    )}

                    {/* Hold Button - CONFIRMED/IN_PROGRESS orders */}
                    {(order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS') && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-400 text-amber-600 hover:bg-amber-50"
                            onClick={() => setShowHoldModal(true)}
                            disabled={orderAction.isPending}
                            aria-label="Tạm hoãn"
                        >
                            <IconPlayerPause className="h-4 w-4 mr-1" />
                            Tạm hoãn
                        </Button>
                    )}

                    {/* Resume Button - ON_HOLD orders */}
                    {order.status === 'ON_HOLD' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-400 text-blue-600 hover:bg-blue-50"
                            onClick={() => setShowResumeModal(true)}
                            disabled={orderAction.isPending}
                            aria-label="Tiếp tục"
                        >
                            <IconPlayerPlay className="h-4 w-4 mr-1" />
                            Tiếp tục
                        </Button>
                    )}

                    {/* Complete Button - CONFIRMED/IN_PROGRESS orders */}
                    {(order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS') && (
                        <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => setShowCompleteModal(true)}
                            disabled={orderAction.isPending}
                            aria-label="Hoàn thành đơn"
                        >
                            <IconCheck className="h-4 w-4 mr-1" />
                            Hoàn thành
                        </Button>
                    )}

                    {/* Cancel Button */}
                    {order.status !== 'CANCELLED' && order.status !== 'PAID' && order.status !== 'COMPLETED' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowCancelModal(true)}
                            disabled={orderAction.isPending}
                            aria-label="Hủy đơn"
                        >
                            <IconX className="h-4 w-4 mr-1" />
                            Hủy
                        </Button>
                    )}

                    {/* Reopen Button - COMPLETED orders only */}
                    {order.status === 'COMPLETED' && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-400 text-orange-600 hover:bg-orange-50"
                            onClick={() => setShowReopenModal(true)}
                            disabled={orderAction.isPending || reopenOrder.isPending}
                            aria-label="Mở lại đơn hàng"
                        >
                            <IconRotate className="h-4 w-4 mr-1" />
                            Mở lại
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* Info Cards */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {/* Customer Card */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <IconUser className="h-4 w-4" />
                            KHÁCH HÀNG
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{order.customer_name}</p>
                        {order.customer_phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <IconPhone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                {order.customer_phone}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Event Card */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <IconCalendar className="h-4 w-4" />
                            THÔNG TIN TIỆC
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <IconCalendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            Ngày: <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(order.event_date)}</span>
                        </p>
                        {order.event_time && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <IconClock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                Giờ: <span className="font-medium text-gray-900 dark:text-gray-100">{order.event_time}</span>
                            </p>
                        )}
                        {order.event_address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <IconMapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{order.event_address}</span>
                            </p>
                        )}
                        {order.guest_count && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                <IconUsers className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                Số khách: <span className="font-medium text-gray-900 dark:text-gray-100">{order.guest_count} người</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Progress Stepper */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <IconReceipt className="h-4 w-4" />
                            TIẾN TRÌNH XỬ LÝ
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderStatusStepper currentStatus={order.status} />
                    </CardContent>
                </Card>
            </motion.div>

            {/* Order Items */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            📦 CHI TIẾT ĐƠN HÀNG
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                        <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">#</th>
                                        <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Món ăn</th>
                                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">SL</th>
                                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Đơn giá</th>
                                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Giá gốc</th>
                                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Lợi nhuận</th>
                                        <th className="text-right py-3 px-2 font-medium text-gray-600 dark:text-gray-400">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items && order.items.length > 0 ? (
                                        order.items.map((item, index) => {
                                            const profit = (item.unit_price || 0) - (item.cost_price || 0);
                                            const profitPercent = (item.cost_price || 0) > 0 ? (profit / (item.cost_price || 1) * 100) : 0;
                                            return (
                                                <tr key={item.id} className="border-b hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                                    <td className="py-3 px-2 text-gray-500 dark:text-gray-400">{index + 1}</td>
                                                    <td className="py-3 px-2">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{item.item_name}</span>
                                                        {item.category && (
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({item.category})</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                                                    <td className="py-3 px-2 text-right text-gray-700 dark:text-gray-300 tabular-nums">{formatCurrency(item.unit_price)}</td>
                                                    <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400">{formatCurrency(item.cost_price || 0)}</td>
                                                    <td className="py-3 px-2 text-right">
                                                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {formatCurrency(profit)}
                                                        </span>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                                                            ({profitPercent.toFixed(0)}%)
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 text-right font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                Chưa có món ăn nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                    {/* Profit Summary Row */}
                                    {order.items && order.items.length > 0 && (
                                        <tr className="border-t">
                                            <td colSpan={5} className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">Tổng lợi nhuận dự kiến</td>
                                            <td className="py-2 px-2 text-right font-medium text-green-600">
                                                {formatCurrency(
                                                    order.items.reduce((sum, item) =>
                                                        sum + ((item.unit_price || 0) - (item.cost_price || 0)) * item.quantity, 0
                                                    )
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                    {/* Discount Row */}
                                    {(order.discount_amount ?? 0) > 0 && (
                                        <tr>
                                            <td colSpan={6} className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">Giảm giá</td>
                                            <td className="py-2 px-2 text-right font-medium text-orange-600">-{formatCurrency(order.discount_amount)}</td>
                                        </tr>
                                    )}
                                    <tr className="border-t">
                                        <td colSpan={6} className="py-3 px-2 text-right font-medium text-gray-600 dark:text-gray-400">Tổng cộng</td>
                                        <td className="py-3 px-2 text-right font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(order.final_amount)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={6} className="py-2 px-2 text-right text-gray-600 dark:text-gray-400">Đã thanh toán</td>
                                        <td className="py-2 px-2 text-right font-medium text-green-600">{formatCurrency(order.paid_amount)}</td>
                                    </tr>
                                    <tr className="border-t">
                                        <td colSpan={6} className="py-3 px-2 text-right font-medium text-gray-600 dark:text-gray-400">Còn lại</td>
                                        <td className="py-3 px-2 text-right font-bold text-red-600 tabular-nums">{formatCurrency(order.balance_amount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Order Notes Section */}
                        {order.note && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                                    📝 Ghi chú đơn hàng
                                </p>
                                <p className="text-sm text-yellow-700 mt-1 whitespace-pre-wrap">{order.note}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Payment Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
            >
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <IconCreditCard className="h-4 w-4" />
                                THANH TOÁN
                            </CardTitle>
                            {order.status !== 'CANCELLED' && order.status !== 'PAID' && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowPaymentModal(true)}
                                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                                >
                                    <IconPlus className="h-4 w-4 mr-1" />
                                    Thêm thanh toán
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Payment Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Đã thu: {formatCurrency(order.paid_amount)}</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{paymentPercentage}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                                    style={{ width: `${paymentPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Payment History */}
                        {order.payments && order.payments.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Lịch sử thanh toán</p>
                                <div className="divide-y rounded-lg border">
                                    {order.payments.map((payment) => (
                                        <div key={payment.id} className="group relative flex items-center justify-between p-3 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(payment.amount)}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {paymentMethodLabels[payment.payment_method]} • {formatDate(payment.payment_date)}
                                                </p>
                                                {payment.note && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{payment.note}</p>
                                                )}
                                                {payment.reference_no && (
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">Ref: {payment.reference_no}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    Đã thu
                                                </Badge>
                                                {/* Hover action buttons */}
                                                {order.status !== 'CANCELLED' && (
                                                    <div className="hidden group-hover:flex items-center gap-1 absolute right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 shadow-sm border rounded-md px-1 py-0.5">
                                                        <button
                                                            onClick={() => setEditingPayment(payment)}
                                                            className="p-1.5 rounded hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors"
                                                            title="Sửa thanh toán"
                                                        >
                                                            <IconEdit className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingPayment(payment)}
                                                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                                                            title="Xóa thanh toán"
                                                        >
                                                            <IconTrash className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* R1/R3: P&L Section - Order Profit & Loss */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 }}
            >
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            📊 LÃI/LỖ ĐƠN HÀNG
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Revenue */}
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Doanh thu</p>
                                <p className="text-lg font-bold text-blue-600">
                                    {formatCurrency(order.paid_amount)}
                                </p>
                            </div>
                            {/* Expenses */}
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Chi phí</p>
                                <p className="text-lg font-bold text-red-600">
                                    {formatCurrency(order.expenses_amount || 0)}
                                </p>
                            </div>
                            {/* Profit */}
                            <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lợi nhuận</p>
                                <p className={`text-lg font-bold ${(order.paid_amount - (order.expenses_amount || 0)) >= 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                    }`}>
                                    {formatCurrency(order.paid_amount - (order.expenses_amount || 0))}
                                </p>
                            </div>
                            {/* Margin */}
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Biên lợi nhuận</p>
                                <p className="text-lg font-bold text-purple-600">
                                    {order.paid_amount > 0
                                        ? Math.round(((order.paid_amount - (order.expenses_amount || 0)) / order.paid_amount) * 100)
                                        : 0}%
                                </p>
                            </div>
                        </div>
                        {(order.expenses_amount || 0) === 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3 italic">
                                💡 Chi phí sẽ tự động cập nhật khi có chi tiêu được link với đơn hàng này
                            </p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Direct Order Expenses Section (PRD 4.3) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32 }}
            >
                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <IconReceipt2 className="h-4 w-4" />
                                CHI PHÍ TRỰC TIẾP
                            </CardTitle>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowExpenseModal(true)}
                                className="h-7 text-xs"
                            >
                                <IconPlus className="h-3 w-3 mr-1" />
                                Thêm
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {expenses.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4 italic">
                                Chưa có chi phí nào được ghi nhận
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {expenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm">
                                                {CATEGORY_LABELS[expense.category] || expense.category}
                                            </span>
                                            {expense.description && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {expense.description}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-red-600">
                                            -{formatCurrency(expense.amount)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-2 border-t mt-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng chi phí:</span>
                                    <span className="text-sm font-bold text-red-600">
                                        {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* P0: Assigned Staff Section (Improved from PRD) */}
            <AssignedStaffCard
                orderId={orderId}
                assignments={staffCosts?.assignments || []}
                totalCost={staffCosts?.total_staff_cost || 0}
                totalPlannedHours={staffCosts?.total_planned_hours || 0}
                totalActualHours={staffCosts?.total_actual_hours || 0}
                onSuggestClick={() => setShowStaffSuggestionModal(true)}
                canSuggestStaff={order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'IN_PROGRESS'}
                onAssignmentChanged={() => { refetchStaffCosts(); refetch(); }}
            />

            {/* P2: Activity Timeline */}
            <ActivityTimeline
                orderCode={order.code}
                orderCreatedAt={order.created_at}
                orderStatus={order.status}
                orderCreatedBy="Hệ thống"
                staffAssignments={staffCosts?.assignments?.map(a => ({
                    employee_name: a.employee_name,
                    assigned_at: order.created_at
                })) || []}
                payments={[]}
            />

            {/* P3: Internal Notes */}
            <OrderNotesSection
                orderId={orderId}
                orderCode={order.code}
                canAddNote={order.status !== 'CANCELLED' && order.status !== 'PAID'}
            />

            {/* Action Buttons - Only for PENDING confirm and COMPLETED mark-paid */}
            <motion.div
                className="flex flex-wrap items-center justify-end gap-2 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
            >
                {/* Confirm button for PENDING orders */}
                {order.status === 'PENDING' && (
                    <Button
                        onClick={() => handleAction('confirm')}
                        disabled={orderAction.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <IconCheck className="h-4 w-4 mr-1" />
                        Xác nhận đơn
                    </Button>
                )}
                {/* Mark as paid button for COMPLETED orders with zero balance */}
                {order.status === 'COMPLETED' && order.balance_amount <= 0 && (
                    <Button
                        onClick={() => handleAction('mark-paid')}
                        disabled={orderAction.isPending}
                        className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                    >
                        <IconCreditCard className="h-4 w-4 mr-1" />
                        Đánh dấu đã thanh toán
                    </Button>
                )}
            </motion.div>

            {/* Payment Modal */}
            <AddPaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                orderId={orderId}
                orderCode={order.code}
                balanceAmount={order.balance_amount}
                onSuccess={() => {
                    setShowPaymentModal(false);
                    refetch();
                }}
            />

            {/* Edit Payment Modal */}
            <EditPaymentModal
                isOpen={!!editingPayment}
                onClose={() => setEditingPayment(null)}
                orderId={orderId}
                orderCode={order.code}
                payment={editingPayment}
                onSuccess={() => {
                    setEditingPayment(null);
                    refetch();
                }}
            />

            {/* Delete Payment Confirmation */}
            {deletingPayment && (
                <Dialog open={!!deletingPayment} onOpenChange={() => setDeletingPayment(null)}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <IconTrash className="h-5 w-5" />
                                Xóa thanh toán
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-gray-600">
                            Bạn có chắc muốn xóa khoản thanh toán <span className="font-bold">{formatCurrency(deletingPayment.amount)}</span> không?
                            Số tiền sẽ được cộng lại vào dư nợ đơn hàng.
                        </p>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setDeletingPayment(null)}>
                                Hủy
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={deletePaymentMutation.isPending}
                                onClick={async () => {
                                    await deletePaymentMutation.mutateAsync({
                                        orderId,
                                        paymentId: deletingPayment.id,
                                    });
                                    setDeletingPayment(null);
                                    refetch();
                                }}
                            >
                                {deletePaymentMutation.isPending ? 'Đang xóa...' : 'Xóa'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Order Expense Modal (PRD 4.3) */}
            <AddOrderExpenseModal
                isOpen={showExpenseModal}
                onClose={() => setShowExpenseModal(false)}
                orderId={orderId}
                orderCode={order.code}
                onSuccess={() => {
                    setShowExpenseModal(false);
                    refetch();
                    refetchExpenses();
                }}
            />

            {/* Revision Quote Modal (Order Amendment Feature) */}
            <CreateRevisionQuoteModal
                isOpen={showRevisionModal}
                onClose={() => setShowRevisionModal(false)}
                order={order}
            />

            {/* Cancel Order With Refund Modal */}
            <CancelOrderWithRefundModal
                orderId={orderId}
                orderCode={order.code}
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onSuccess={() => {
                    setShowCancelModal(false);
                    refetch();
                }}
            />

            {/* Staff Suggestion Modal (GAP-M3) */}
            <StaffSuggestionModal
                orderId={orderId}
                orderCode={order.code}
                open={showStaffSuggestionModal}
                onOpenChange={setShowStaffSuggestionModal}
                onAssigned={refetch}
            />

            {/* Status Confirmation Modals */}
            <StatusConfirmationModal
                open={showHoldModal}
                onClose={() => setShowHoldModal(false)}
                onConfirm={async () => {
                    await handleAction('hold');
                    setShowHoldModal(false);
                }}
                isLoading={orderAction.isPending}
                action="hold"
            />
            <StatusConfirmationModal
                open={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                onConfirm={async () => {
                    await handleAction('complete');
                    setShowCompleteModal(false);
                }}
                isLoading={orderAction.isPending}
                action="complete"
            />
            <StatusConfirmationModal
                open={showResumeModal}
                onClose={() => setShowResumeModal(false)}
                onConfirm={async () => {
                    await handleAction('resume');
                    setShowResumeModal(false);
                }}
                isLoading={orderAction.isPending}
                action="resume"
            />
            <StatusConfirmationModal
                open={showReopenModal}
                onClose={() => setShowReopenModal(false)}
                onConfirm={async (reason?: string) => {
                    if (reason) {
                        await reopenOrder.mutateAsync({ orderId, reason });
                        setShowReopenModal(false);
                        refetch();
                    }
                }}
                isLoading={reopenOrder.isPending}
                action="reopen"
            />
        </div >
    );
}
