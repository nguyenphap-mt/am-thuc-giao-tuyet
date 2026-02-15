'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useSalesReport } from '@/hooks/use-analytics';
import {
    IconCash, IconTrendingUp, IconShoppingCart, IconChartBar,
    IconArrowRight, IconPercentage,
} from '@tabler/icons-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const COLORS = ['#c2185b', '#7b1fa2', '#512da8', '#1976d2', '#0097a7', '#388e3c', '#f57c00', '#455a64', '#d32f2f', '#00838f'];

export function SalesReports() {
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');
    const { data: report, isLoading } = useSalesReport({ group_by: groupBy });

    const summaryCards = [
        { title: 'Giá trị ĐH trung bình', value: report?.avg_order_value || 0, icon: IconCash, format: 'currency' },
        { title: 'Tỷ lệ chuyển đổi', value: report?.conversion_rate || 0, icon: IconPercentage, format: 'percent' },
        { title: 'Tổng báo giá', value: report?.total_quotes || 0, icon: IconChartBar, format: 'number' },
        { title: 'Tổng đơn hàng', value: report?.total_orders || 0, icon: IconShoppingCart, format: 'number' },
    ];

    const revenueData = report?.revenue_by_period?.map(p => ({
        name: p.period,
        'Doanh thu': p.revenue,
        'Số ĐH': p.orders_count,
    })) || [];

    return (
        <div className="space-y-4">
            {/* Group By Controls */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Nhóm theo:</span>
                {(['day', 'week', 'month'] as const).map(g => (
                    <button
                        key={g}
                        onClick={() => setGroupBy(g)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${groupBy === g
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'
                            }`}
                    >
                        {g === 'day' ? 'Ngày' : g === 'week' ? 'Tuần' : 'Tháng'}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {summaryCards.map((card, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            {isLoading ? <Skeleton className="h-12 w-full" /> : (
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-pink-50">
                                        <card.icon className="h-4 w-4 text-pink-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.title}</p>
                                        <p className="text-sm font-bold tabular-nums">
                                            {card.format === 'currency' ? formatCurrency(card.value)
                                                : card.format === 'percent' ? `${card.value.toFixed(1)}%`
                                                    : formatNumber(card.value)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Revenue Chart */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Doanh thu theo thời gian</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-[300px] w-full" />
                    ) : revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                <Tooltip formatter={(value, name) =>
                                    name === 'Doanh thu' ? formatCurrency(value as number) : formatNumber(value as number)
                                } />
                                <Legend />
                                <Bar dataKey="Doanh thu" fill="#c2185b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                            Chưa có dữ liệu doanh thu trong khoảng thời gian này
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Two columns: Top Customers + Top Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Customers */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top 10 khách hàng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
                            <div className="space-y-2">
                                {report?.top_customers?.slice(0, 10).map((c, i) => (
                                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                                            <span className="text-sm truncate">{c.customer_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="secondary" className="text-[10px]">{c.orders_count} ĐH</Badge>
                                            <span className="text-sm font-semibold tabular-nums text-green-600">
                                                {formatCurrency(c.total_revenue)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {(!report?.top_customers || report.top_customers.length === 0) && (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Chưa có dữ liệu</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top Items */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Top 10 món bán chạy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-[260px] w-full" /> : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={report?.top_items?.slice(0, 10).map(item => ({
                                    name: item.item_name?.slice(0, 20),
                                    'Doanh thu': item.revenue,
                                })) || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                                    <Bar dataKey="Doanh thu" fill="#7b1fa2" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
