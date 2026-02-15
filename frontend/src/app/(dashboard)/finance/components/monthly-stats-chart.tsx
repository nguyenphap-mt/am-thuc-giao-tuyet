'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TransactionDrillDownDrawer, DrillDownFilter } from './transaction-drill-down-drawer';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useChartExport, ChartExportButton } from './chart-export';
import type { DateRange } from './period-selector';
import { format } from 'date-fns';

interface MonthlyStats {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    previous_year?: {
        revenue: number;
        expenses: number;
        profit: number;
    };
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]?.payload as MonthlyStats | undefined;
        if (!data) return null;

        const revenue = data.revenue ?? 0;
        const expenses = data.expenses ?? 0;
        const profit = data.profit ?? 0;
        const margin = revenue > 0 ? (profit / revenue * 100) : 0;

        // Calculate YoY changes (only if previous_year data exists)
        const yoyRevenue = data.previous_year?.revenue
            ? ((revenue - data.previous_year.revenue) / data.previous_year.revenue * 100)
            : null;
        const yoyProfit = data.previous_year?.profit
            ? ((profit - data.previous_year.profit) / data.previous_year.profit * 100)
            : null;

        return (
            <div className="bg-white p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[200px]">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 border-b pb-2">{label}</p>

                {/* Revenue */}
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-green-600">Doanh thu:</span>
                    <span className="text-sm font-medium">{formatCurrency(revenue)}</span>
                </div>
                {yoyRevenue !== null && (
                    <div className={`text-xs flex justify-end items-center gap-1 mb-2 ${yoyRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {yoyRevenue >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                        {yoyRevenue >= 0 ? '+' : ''}{yoyRevenue.toFixed(1)}% YoY
                    </div>
                )}

                {/* Expenses */}
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-red-600">Chi phí:</span>
                    <span className="text-sm font-medium">{formatCurrency(expenses)}</span>
                </div>

                {/* Profit */}
                <div className="flex justify-between items-center mb-1 pt-1 border-t">
                    <span className="text-sm text-blue-600">Lợi nhuận:</span>
                    <span className="text-sm font-medium">{formatCurrency(profit)}</span>
                </div>
                {yoyProfit !== null && (
                    <div className={`text-xs flex justify-end items-center gap-1 ${yoyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {yoyProfit >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />}
                        {yoyProfit >= 0 ? '+' : ''}{yoyProfit.toFixed(1)}% YoY
                    </div>
                )}

                {/* Margin */}
                <div className="flex justify-between items-center mt-2 pt-2 border-t bg-gray-50 dark:bg-gray-900 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Biên lợi nhuận:</span>
                    <span className={`text-xs font-semibold ${margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                    </span>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click để xem chi tiết</p>
            </div>
        );
    }
    return null;
};


interface MonthlyStatsChartProps {
    dateRange?: DateRange;
}

export function MonthlyStatsChart({ dateRange }: MonthlyStatsChartProps) {
    const [drillDownFilter, setDrillDownFilter] = useState<DrillDownFilter | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { chartRef, exportToPng, exportToCsv, copyToClipboard } = useChartExport();

    // Build query params from dateRange
    const queryParams = dateRange
        ? `?start_date=${format(dateRange.from, 'yyyy-MM-dd')}&end_date=${format(dateRange.to, 'yyyy-MM-dd')}`
        : '';

    const { data: rawData, isLoading, error } = useQuery({
        queryKey: ['finance-monthly-stats', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
        queryFn: async () => {
            const response = await api.get<any[]>(`/finance/stats/monthly${queryParams}`);
            return response;
        },
    });

    // Transform API fields: thu→revenue, chi→expenses, compute profit
    const data: MonthlyStats[] | undefined = rawData?.map((item: any) => ({
        month: item.month,
        revenue: item.revenue ?? item.thu ?? 0,
        expenses: item.expenses ?? item.expense ?? item.chi ?? 0,
        profit: item.profit ?? ((item.revenue ?? item.thu ?? 0) - (item.expenses ?? item.expense ?? item.chi ?? 0)),
        previous_year: item.previous_year,
    }));

    const handlePointClick = (data: any) => {
        if (data && data.activePayload && data.activePayload[0]) {
            const payload = data.activePayload[0].payload as MonthlyStats;
            setDrillDownFilter({
                type: 'month',
                month: payload.month,
                title: `Giao dịch tháng ${payload.month}`,
            });
            setDrawerOpen(true);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Biểu đồ doanh thu & chi phí</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data || data.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Biểu đồ doanh thu & chi phí</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed rounded-lg">
                        Chưa có dữ liệu thống kê
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Biểu đồ doanh thu & chi phí (12 tháng)</CardTitle>
                    <ChartExportButton
                        onExportPng={() => exportToPng('doanh-thu-chi-phi')}
                        onExportCsv={() => exportToCsv((data || []) as unknown as Record<string, unknown>[], 'doanh-thu-chi-phi')}
                        onCopy={() => copyToClipboard((data || []) as unknown as Record<string, unknown>[])}
                    />
                </CardHeader>
                <CardContent>
                    <div ref={chartRef} className="h-64 md:h-80 min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                            <LineChart
                                data={data}
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                onClick={handlePointClick}
                                className="cursor-pointer"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '10px' }}
                                    iconType="circle"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    name="Doanh thu"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, className: 'cursor-pointer' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="expenses"
                                    name="Chi phí"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, className: 'cursor-pointer' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="profit"
                                    name="Lợi nhuận"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                                    activeDot={{ r: 5, className: 'cursor-pointer' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <TransactionDrillDownDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                filter={drillDownFilter}
            />
        </>
    );
}
