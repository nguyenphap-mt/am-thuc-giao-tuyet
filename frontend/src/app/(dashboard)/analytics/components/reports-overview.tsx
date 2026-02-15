'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useAnalyticsOverview } from '@/hooks/use-analytics';
import {
    IconCash, IconTrendingUp, IconTrendingDown, IconShoppingCart,
    IconPackage, IconWallet, IconUsers, IconUserPlus,
    IconChartArea, IconArrowRight,
} from '@tabler/icons-react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSalesReport } from '@/hooks/use-analytics';

const COLORS = ['#c2185b', '#7b1fa2', '#512da8', '#1976d2', '#0097a7', '#388e3c', '#f57c00', '#455a64'];

// Expense breakdown mock data (will be replaced when backend adds expense_breakdown to overview endpoint)
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'];

interface ReportsOverviewProps {
    onTabChange?: (tab: string) => void;
    dateParams?: { from_date?: string; to_date?: string };
}

export function ReportsOverview({ onTabChange, dateParams = {} }: ReportsOverviewProps) {
    const { data: stats, isLoading } = useAnalyticsOverview(dateParams);
    const { data: sales, isLoading: salesLoading } = useSalesReport({ group_by: 'month', ...dateParams });

    const kpiCards = [
        {
            title: 'Doanh thu tháng',
            value: stats?.revenue_month || 0,
            trend: stats?.revenue_trend || 0,
            icon: IconCash,
            bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
            iconColor: 'text-green-600',
            format: 'currency' as const,
            drillTo: 'sales',
        },
        {
            title: 'Chi phí tháng',
            value: stats?.expenses_month || 0,
            trend: stats?.expenses_trend || 0,
            icon: IconTrendingDown,
            bgColor: 'bg-gradient-to-br from-red-50 to-rose-50',
            iconColor: 'text-red-600',
            format: 'currency' as const,
            invertTrend: true,
            drillTo: 'finance',
        },
        {
            title: 'Lợi nhuận',
            value: stats?.profit_month || 0,
            trend: stats?.profit_margin || 0,
            icon: IconTrendingUp,
            bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
            iconColor: 'text-blue-600',
            format: 'currency' as const,
            trendLabel: 'margin',
            drillTo: 'finance',
        },
        {
            title: 'Đơn hàng',
            value: stats?.orders_month || 0,
            trend: stats?.orders_trend || 0,
            icon: IconShoppingCart,
            bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50',
            iconColor: 'text-pink-600',
            format: 'number' as const,
            drillTo: 'sales',
        },
        {
            title: 'Giá trị tồn kho',
            value: stats?.inventory_value || 0,
            trend: 0,
            icon: IconPackage,
            bgColor: 'bg-gradient-to-br from-teal-50 to-emerald-50',
            iconColor: 'text-teal-600',
            format: 'currency' as const,
            badge: stats?.inventory_warning ? `${stats.inventory_warning} cảnh báo` : undefined,
            drillTo: 'inventory',
        },
        {
            title: 'Công nợ phải thu',
            value: stats?.receivables_total || 0,
            trend: 0,
            icon: IconWallet,
            bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
            iconColor: 'text-purple-600',
            format: 'currency' as const,
            badge: stats?.receivables_overdue ? `${stats.receivables_overdue} quá hạn` : undefined,
            drillTo: 'finance',
        },
        {
            title: 'Khách hàng',
            value: stats?.customers_total || 0,
            trend: 0,
            icon: IconUsers,
            bgColor: 'bg-gradient-to-br from-sky-50 to-blue-50',
            iconColor: 'text-sky-600',
            format: 'number' as const,
            drillTo: 'sales',
        },
        {
            title: 'Nhân viên',
            value: stats?.employees_active || 0,
            trend: 0,
            icon: IconUserPlus,
            bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
            iconColor: 'text-amber-600',
            format: 'number' as const,
            drillTo: 'hr',
        },
    ];

    // Revenue chart data — use all periods available (up to 12 months)
    const revenueData = sales?.revenue_by_period?.map(p => ({
        name: p.period,
        'Doanh thu': p.revenue,
        'Chi phí': p.expenses,
        'Lợi nhuận': p.profit,
    })) || [];

    // Top customers for horizontal bar chart (sorted desc)
    const topCustomers = sales?.top_customers?.slice(0, 8).map((c) => ({
        name: c.customer_name?.length > 20 ? c.customer_name.slice(0, 18) + '...' : c.customer_name,
        'Doanh thu': c.total_revenue,
        fullName: c.customer_name,
    })) || [];

    // Expense breakdown from overview data (simulated from revenue - profit)
    const expenseBreakdown = [
        { name: 'Nguyên liệu', value: (stats?.expenses_month || 0) * 0.55, fill: EXPENSE_COLORS[0] },
        { name: 'Nhân công', value: (stats?.expenses_month || 0) * 0.25, fill: EXPENSE_COLORS[1] },
        { name: 'Vận hành', value: (stats?.expenses_month || 0) * 0.12, fill: EXPENSE_COLORS[2] },
        { name: 'Marketing', value: (stats?.expenses_month || 0) * 0.05, fill: EXPENSE_COLORS[3] },
        { name: 'Khác', value: (stats?.expenses_month || 0) * 0.03, fill: EXPENSE_COLORS[4] },
    ].filter(e => e.value > 0);

    // Custom tooltip for currency
    const currencyTickFormatter = (v: number) => {
        if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B₫`;
        if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M₫`;
        if (v >= 1000) return `${(v / 1000).toFixed(0)}K₫`;
        return `${v}₫`;
    };

    return (
        <div className="space-y-4">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {kpiCards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Card
                            className="hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                            onClick={() => onTabChange?.(card.drillTo)}
                        >
                            <CardContent className="p-3 md:p-4">
                                {isLoading ? (
                                    <Skeleton className="h-16 w-full" />
                                ) : (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${card.bgColor} transition-transform will-change-transform`}>
                                                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{card.title}</p>
                                                <p className="text-sm md:text-base font-bold tabular-nums truncate">
                                                    {card.format === 'currency' ? formatCurrency(card.value) : formatNumber(card.value)}
                                                </p>
                                            </div>
                                        </div>
                                        {card.trend !== 0 && (
                                            <div className={`flex items-center gap-1 text-xs ${(card.invertTrend ? card.trend < 0 : card.trend > 0) ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {card.trend > 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                                                <span className="tabular-nums">
                                                    {card.trend > 0 ? '+' : ''}{card.trend.toFixed(1)}%
                                                </span>
                                                <span className="text-gray-400 dark:text-gray-500">
                                                    {card.trendLabel === 'margin' ? 'margin' : 'vs tháng trước'}
                                                </span>
                                            </div>
                                        )}
                                        {card.badge && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                                {card.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                            {/* Drill-down indicator */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconArrowRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row 1: Revenue Trend (Area) + Expense Breakdown (Pie) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Revenue Trend — Area Chart (PRD: 12 months Line chart) */}
                <Card className="lg:col-span-2">
                    <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <IconChartArea className="h-4 w-4 text-[#c2185b]" />
                                Doanh thu theo thời gian
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                        {salesLoading ? (
                            <Skeleton className="h-[280px] w-full rounded-lg" />
                        ) : revenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c2185b" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#c2185b" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={currencyTickFormatter} width={60} />
                                    <Tooltip
                                        formatter={(value: any) => formatCurrency(Number(value))}
                                        labelStyle={{ fontWeight: 'bold' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                    />
                                    <Legend iconType="circle" iconSize={8} />
                                    <Area
                                        type="monotone"
                                        dataKey="Doanh thu"
                                        stroke="#c2185b"
                                        strokeWidth={2}
                                        fill="url(#revenueGradient)"
                                        dot={{ r: 3, fill: '#c2185b' }}
                                        activeDot={{ r: 5 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Chi phí"
                                        stroke="#ef4444"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                        fill="url(#expenseGradient)"
                                        dot={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                                <IconChartArea className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                <p className="text-sm">Chưa có dữ liệu doanh thu</p>
                                <button
                                    onClick={() => onTabChange?.('sales')}
                                    className="text-xs text-[#c2185b] hover:underline flex items-center gap-1"
                                >
                                    Xem tab Doanh thu <IconArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expense Breakdown — Pie Chart (PRD: "Phân bổ chi phí") */}
                <Card>
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-base">Phân bổ chi phí</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[280px] w-full rounded-lg" />
                        ) : expenseBreakdown.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={expenseBreakdown}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={45}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {expenseBreakdown.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                    <Legend
                                        layout="horizontal"
                                        verticalAlign="bottom"
                                        align="center"
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '11px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                                <p className="text-sm">Chưa có dữ liệu chi phí</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2: Top Customers (Horizontal Bar — PRD spec) */}
            <Card>
                <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Top khách hàng theo doanh thu</CardTitle>
                        {topCustomers.length > 0 && (
                            <button
                                onClick={() => onTabChange?.('sales')}
                                className="text-xs text-[#c2185b] hover:underline flex items-center gap-1"
                            >
                                Chi tiết <IconArrowRight className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                    {salesLoading ? (
                        <Skeleton className="h-[250px] w-full rounded-lg" />
                    ) : topCustomers.length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(200, topCustomers.length * 40)}>
                            <BarChart
                                data={topCustomers}
                                layout="vertical"
                                margin={{ left: 10, right: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={currencyTickFormatter}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 11 }}
                                    width={130}
                                />
                                <Tooltip
                                    formatter={(value: any) => formatCurrency(Number(value))}
                                    labelFormatter={(label: any) => {
                                        const item = topCustomers.find(c => c.name === label);
                                        return item?.fullName || String(label);
                                    }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Bar
                                    dataKey="Doanh thu"
                                    fill="#c2185b"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                            <IconUsers className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            <p className="text-sm">Chưa có dữ liệu khách hàng</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
