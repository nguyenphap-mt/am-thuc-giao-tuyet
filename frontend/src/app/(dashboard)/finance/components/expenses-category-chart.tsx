'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TransactionDrillDownDrawer, DrillDownFilter } from './transaction-drill-down-drawer';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useChartExport, ChartExportButton } from './chart-export';
import type { DateRange } from './period-selector';
import { format } from 'date-fns';

interface ExpenseCategory {
    category: string;
    amount: number;
    percentage: number;
    previous_amount?: number;
}

// Color palette for categories
const COLORS = [
    '#c2185b', // Pink (primary)
    '#7b1fa2', // Purple
    '#512da8', // Deep Purple
    '#1976d2', // Blue
    '#0097a7', // Cyan
    '#388e3c', // Green
    '#ffa000', // Amber
    '#e64a19', // Deep Orange
];

// Vietnamese category labels
const CATEGORY_LABELS: Record<string, string> = {
    NGUYENLIEU: 'Nguyên liệu',
    NHANCONG: 'Nhân công',
    THUEMUON: 'Thuê mướn',
    VANHANH: 'Vận hành',
    MARKETING: 'Marketing',
    UTILITIES: 'Tiện ích',
    OTHER: 'Khác',
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        if (!data) return null;

        const change = data.previous_amount
            ? ((data.amount - data.previous_amount) / data.previous_amount * 100)
            : null;

        return (
            <div className="bg-white p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {CATEGORY_LABELS[data.category] || data.category || 'Không xác định'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(data.amount || 0)} ({(data.percentage ?? 0).toFixed(1)}%)
                </p>
                {change !== null && (
                    <p className={`text-xs flex items-center gap-1 mt-1 ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {change >= 0 ? (
                            <IconTrendingUp className="h-3 w-3" />
                        ) : (
                            <IconTrendingDown className="h-3 w-3" />
                        )}
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}% so với kỳ trước
                    </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Click để xem chi tiết</p>
            </div>
        );
    }
    return null;
};


const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for < 5%
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight="bold"
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

interface ExpensesCategoryChartProps {
    dateRange?: DateRange;
}

export function ExpensesCategoryChart({ dateRange }: ExpensesCategoryChartProps) {
    const [drillDownFilter, setDrillDownFilter] = useState<DrillDownFilter | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { chartRef, exportToPng, exportToCsv, copyToClipboard } = useChartExport();

    // Build query params from dateRange
    const queryParams = dateRange
        ? `?start_date=${format(dateRange.from, 'yyyy-MM-dd')}&end_date=${format(dateRange.to, 'yyyy-MM-dd')}`
        : '';

    const { data, isLoading, error } = useQuery({
        queryKey: ['finance-expenses-by-category', dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
        queryFn: async () => {
            const response = await api.get<ExpenseCategory[]>(`/finance/stats/expenses-by-category${queryParams}`);
            return response;
        },
    });

    const handlePieClick = (data: any) => {
        if (data && data.category) {
            setDrillDownFilter({
                type: 'category',
                category: data.category,
                title: `Chi phí: ${CATEGORY_LABELS[data.category] || data.category}`,
            });
            setDrawerOpen(true);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Chi phí theo danh mục</CardTitle>
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
                    <CardTitle className="text-base">Chi phí theo danh mục</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed rounded-lg">
                        Chưa có dữ liệu chi phí
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Transform data for display
    const chartData = data.map((item) => ({
        ...item,
        name: CATEGORY_LABELS[item.category] || item.category,
    }));

    return (
        <>
            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Chi phí theo danh mục</CardTitle>
                    <ChartExportButton
                        onExportPng={() => exportToPng('chi-phi-danh-muc')}
                        onExportCsv={() => exportToCsv((data || []) as unknown as Record<string, unknown>[], 'chi-phi-danh-muc')}
                        onCopy={() => copyToClipboard((data || []) as unknown as Record<string, unknown>[])}
                    />
                </CardHeader>
                <CardContent>
                    <div ref={chartRef} className="h-64 md:h-80 min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomLabel}
                                    outerRadius={100}
                                    innerRadius={40}
                                    fill="#8884d8"
                                    dataKey="amount"
                                    paddingAngle={2}
                                    onClick={handlePieClick}
                                    className="cursor-pointer"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke="white"
                                            strokeWidth={2}
                                            className="hover:opacity-80 transition-opacity"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    layout="horizontal"
                                    align="center"
                                    verticalAlign="bottom"
                                    wrapperStyle={{ paddingTop: '10px' }}
                                    iconType="circle"
                                    iconSize={10}
                                    formatter={(value) => (
                                        <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{value}</span>
                                    )}
                                />
                            </PieChart>
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
