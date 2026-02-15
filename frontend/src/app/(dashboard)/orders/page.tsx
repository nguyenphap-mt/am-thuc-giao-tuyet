'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReportExport, type ExportFormat, type ExportConfig } from '@/hooks/use-report-export';
import { ExportDialog } from '@/components/analytics/export-dialog';
import type { ReportSheet, KpiCard, ColumnDef } from '@/lib/excel-report-engine';
import { useOrders } from '@/hooks/use-orders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order } from '@/types';
import OrderCalendarView from './components/OrderCalendarView';
import {
    IconSearch,
    IconEye,
    IconShoppingCart,
    IconClock,
    IconCheck,
    IconTruck,
    IconRefresh,
    IconList,
    IconCalendar,
    IconDownload,
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

export default function OrderListPage() {
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [exportOpen, setExportOpen] = useState(false);

    const { data, isLoading, error, refetch } = useOrders({ search });
    const orders = data?.items || [];
    const { isExporting, exportData } = useReportExport();

    const router = useRouter();

    // H3: Memoize computed stats to prevent recalculation
    const stats = useMemo(() => ({
        total: data?.total || 0,
        pending: orders.filter((o: Order) => o.status === 'PENDING').length,
        inProgress: orders.filter((o: Order) => o.status === 'IN_PROGRESS').length,
        completed: orders.filter((o: Order) => o.status === 'COMPLETED').length,
    }), [data?.total, orders]);

    // Helper function to calculate profit
    const calculateProfit = useCallback((order: Order) => {
        const selling = order.total_amount || 0;
        const cost = order.cost_amount || 0;
        return selling - cost;
    }, []);

    // Helper function to calculate actual profit (after expenses)
    const calculateActualProfit = useCallback((order: Order) => {
        const profit = calculateProfit(order);
        const expenses = order.expenses_amount || 0;
        return profit - expenses;
    }, [calculateProfit]);

    // Format event datetime
    const formatEventDateTime = useCallback((order: Order) => {
        const date = formatDate(order.event_date);
        const time = order.event_time || '';
        return time ? `${date} ${time}` : date;
    }, []);

    // H3: Memoize totalRevenue
    const totalRevenue = useMemo(() => orders.reduce((sum: number, o: Order) => sum + (o.total_amount || 0), 0), [orders]);

    // ========== PROFESSIONAL EXPORT CONFIG ==========
    const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const exportConfig = useMemo((): ExportConfig => {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        const kpiCards: KpiCard[] = [
            { label: 'TỔNG ĐƠN', value: stats.total, format: 'number', trend: 0, trendLabel: '', bgColor: 'E3F2FD', valueColor: '1565C0', icon: '🛒' },
            { label: 'ĐANG THỰC HIỆN', value: stats.inProgress, format: 'number', trend: 0, trendLabel: '', bgColor: 'F3E5F5', valueColor: '7B1FA2', icon: '🚚' },
            { label: 'HOÀN THÀNH', value: stats.completed, format: 'number', trend: 0, trendLabel: '', bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '✅' },
            { label: 'TỔNG DOANH THU', value: totalRevenue, format: 'currency', trend: 0, trendLabel: '', bgColor: 'FFF3E0', valueColor: 'E65100', icon: '💰' },
        ];

        const dataRows = orders.map((o: Order) => {
            const profit = calculateProfit(o);
            const actualProfit = calculateActualProfit(o);
            return {
                code: o.code,
                customer_name: o.customer_name || 'Khách hàng',
                event_datetime: formatEventDateTime(o),
                total_amount: o.total_amount || 0,
                cost_amount: o.cost_amount || 0,
                profit,
                paid_amount: o.paid_amount || 0,
                actual_profit: actualProfit,
                status: statusLabels[o.status] || o.status,
            };
        });

        const sheets: ReportSheet[] = [{
            name: 'Đơn hàng',
            title: 'Báo cáo Danh sách Đơn hàng',
            subtitle: `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`,
            kpiCards,
            columns: [
                col('code', 'Mã ĐH', { width: 14 }),
                col('customer_name', 'Khách hàng', { width: 22 }),
                col('event_datetime', 'Ngày tiệc', { width: 18 }),
                col('total_amount', 'Giá bán', { format: 'currency', width: 18, summaryFn: 'sum' }),
                col('cost_amount', 'Giá gốc', { format: 'currency', width: 18, summaryFn: 'sum' }),
                col('profit', 'Lợi nhuận', { format: 'currency', width: 18, summaryFn: 'sum' }),
                col('paid_amount', 'Đã TT', { format: 'currency', width: 16, summaryFn: 'sum' }),
                col('actual_profit', 'LN thực tế', { format: 'currency', width: 18, summaryFn: 'sum' }),
                col('status', 'Trạng thái', { format: 'status', width: 16 }),
            ],
            data: dataRows,
            summaryRow: true,
        }];

        return {
            title: 'Báo cáo Đơn hàng',
            columns: [
                { key: 'code', header: 'Mã ĐH' },
                { key: 'customer_name', header: 'Khách hàng' },
                { key: 'event_datetime', header: 'Ngày tiệc' },
                { key: 'total_amount', header: 'Giá bán', format: (v) => formatCurrency(v as number) },
                { key: 'cost_amount', header: 'Giá gốc', format: (v) => formatCurrency(v as number) },
                { key: 'profit', header: 'Lợi nhuận', format: (v) => formatCurrency(v as number) },
                { key: 'paid_amount', header: 'Đã TT', format: (v) => formatCurrency(v as number) },
                { key: 'actual_profit', header: 'LN thực tế', format: (v) => formatCurrency(v as number) },
                { key: 'status', header: 'Trạng thái' },
            ],
            data: dataRows,
            filename: `bao-cao-don-hang_${today}`,
            sheets,
        };
    }, [orders, stats, totalRevenue]);

    const handleExport = async (format: ExportFormat, filename: string) => {
        const config = { ...exportConfig, filename };
        await exportData(format, config);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Đơn hàng</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý danh sách đơn hàng</p>
                </div>
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={viewMode === 'list' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                    >
                        <IconList className="h-4 w-4 mr-1" />
                        Danh sách
                    </Button>
                    <Button
                        variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('calendar')}
                        className={viewMode === 'calendar' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : ''}
                    >
                        <IconCalendar className="h-4 w-4 mr-1" />
                        Lịch tiệc
                    </Button>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {[
                    { label: 'Tổng đơn', value: stats.total, icon: IconShoppingCart, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Chờ xử lý', value: stats.pending, icon: IconClock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { label: 'Đang làm', value: stats.inProgress, icon: IconTruck, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                    { label: 'Hoàn thành', value: stats.completed, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Calendar View */}
            {viewMode === 'calendar' ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <OrderCalendarView orders={orders} />
                </motion.div>
            ) : (
                /* Data Table */
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="overflow-hidden">
                        {/* Toolbar */}
                        <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} aria-label="Làm mới">
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                            <div className="flex-1" />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExportOpen(true)}
                                className="gap-1.5 h-8 border-gray-300 hover:border-[#c2185b] hover:text-[#c2185b] transition-colors"
                            >
                                <IconDownload className="h-4 w-4" />
                                <span className="hidden sm:inline">Xuất báo cáo</span>
                            </Button>
                            <div className="relative w-full max-w-xs">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                <Input
                                    placeholder="Tìm kiếm…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 h-8 text-sm"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 border-b">
                                    <tr>
                                        <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 w-12">STT</th>
                                        <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">Mã đơn hàng</th>
                                        <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[150px]">Tên khách hàng</th>
                                        <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">Số điện thoại</th>
                                        <th className="px-3 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 min-w-[140px]">Ngày giờ tiệc</th>
                                        <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">Giá bán</th>
                                        <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">Giá gốc</th>
                                        <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">Lợi nhuận</th>
                                        <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">Đã TT</th>
                                        <th className="px-3 py-3 text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[110px]">LN thực tế</th>
                                        <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">Trạng thái</th>
                                        <th className="px-3 py-3 text-center font-semibold text-gray-600 dark:text-gray-400 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {isLoading ? (
                                        <>
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <tr key={i}>
                                                    <td colSpan={12} className="px-3 py-3">
                                                        <Skeleton className="h-8 w-full" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={12} className="text-red-500 text-center py-8">
                                                Không thể tải danh sách
                                            </td>
                                        </tr>
                                    ) : orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="text-center py-16">
                                                <IconShoppingCart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                                                <p className="mt-4 text-gray-500 dark:text-gray-400">Chưa có đơn hàng nào</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order: Order, index: number) => {
                                            const profit = calculateProfit(order);
                                            const actualProfit = calculateActualProfit(order);

                                            return (
                                                <tr
                                                    key={order.id}
                                                    className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                                    onClick={() => router.push(`/orders/${order.id}`)}
                                                >
                                                    {/* STT */}
                                                    <td className="px-3 py-3 text-gray-500 dark:text-gray-400 font-medium">
                                                        {index + 1}
                                                    </td>

                                                    {/* Mã đơn hàng */}
                                                    <td className="px-3 py-3">
                                                        <Link
                                                            href={`/orders/${order.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                                        >
                                                            {order.code}
                                                        </Link>
                                                    </td>

                                                    {/* Tên khách hàng */}
                                                    <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                                                        {order.customer_name || 'Khách hàng'}
                                                    </td>

                                                    {/* Số điện thoại */}
                                                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400">
                                                        {order.customer_phone || '-'}
                                                    </td>

                                                    {/* Ngày giờ tiệc */}
                                                    <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                        {formatEventDateTime(order)}
                                                    </td>

                                                    {/* Giá bán */}
                                                    <td className="px-3 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                                                        {formatCurrency(order.total_amount)}
                                                    </td>

                                                    {/* Giá gốc */}
                                                    <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(order.cost_amount || 0)}
                                                    </td>

                                                    {/* Lợi nhuận */}
                                                    <td className={`px-3 py-3 text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(profit)}
                                                    </td>

                                                    {/* Số tiền đã TT */}
                                                    <td className="px-3 py-3 text-right text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(order.paid_amount)}
                                                    </td>

                                                    {/* LN thực tế */}
                                                    <td className={`px-3 py-3 text-right font-medium ${actualProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatCurrency(actualProfit)}
                                                    </td>

                                                    {/* Trạng thái */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge className={`${statusColors[order.status]} text-xs px-2 py-0.5`}>
                                                            {statusLabels[order.status]}
                                                        </Badge>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-3 py-3 text-center">
                                                        <Link href={`/orders/${order.id}`} onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Xem chi tiết">
                                                                <IconEye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        {orders.length > 0 && (
                            <div className="flex items-center justify-between p-3 border-t bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400">
                                <span>{orders.length} đơn hàng</span>
                                <span>Trang 1 / 1</span>
                            </div>
                        )}
                    </Card>
                </motion.div>
            )}

            {/* Professional Export Dialog */}
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                onExport={handleExport}
                defaultFilename={exportConfig.filename}
                title="Xuất báo cáo Đơn hàng"
                isExporting={isExporting}
            />
        </div>
    );
}
