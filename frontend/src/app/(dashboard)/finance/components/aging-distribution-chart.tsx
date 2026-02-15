'use client';

import { useMemo } from 'react';
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
import { differenceInDays, parseISO } from 'date-fns';

interface Receivable {
    order_id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    balance_amount: number | string;
}

interface AgingBucket {
    name: string;
    value: number;
    count: number;
    color: string;
    percentage: number;
}

// Colors matching the aging badges
const AGING_COLORS = {
    'Sắp tới': '#3b82f6',       // Blue
    '0-7 ngày': '#eab308',      // Yellow
    '8-15 ngày': '#f97316',     // Orange
    '>15 ngày': '#ef4444',      // Red
};

const getAgingBucketName = (eventDate: string): keyof typeof AGING_COLORS => {
    const daysOverdue = differenceInDays(new Date(), parseISO(eventDate));
    if (daysOverdue <= 0) return 'Sắp tới';
    if (daysOverdue <= 7) return '0-7 ngày';
    if (daysOverdue <= 15) return '8-15 ngày';
    return '>15 ngày';
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        if (!data) return null;

        return (
            <div className="bg-white p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 mb-1">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.color }}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {data.count} đơn hàng
                </p>
            </div>
        );
    }
    return null;
};

interface AgingDistributionChartProps {
    onBucketClick?: (bucketName: string) => void;
}

export function AgingDistributionChart({ onBucketClick }: AgingDistributionChartProps) {
    const { data: receivables, isLoading, error } = useQuery({
        queryKey: ['finance-receivables'],
        queryFn: async () => {
            const response = await api.get<Receivable[]>('/finance/receivables');
            return response;
        },
    });

    const chartData = useMemo(() => {
        if (!receivables || receivables.length === 0) return [];

        const buckets: Record<string, { value: number; count: number }> = {
            'Sắp tới': { value: 0, count: 0 },
            '0-7 ngày': { value: 0, count: 0 },
            '8-15 ngày': { value: 0, count: 0 },
            '>15 ngày': { value: 0, count: 0 },
        };

        receivables.forEach((item) => {
            const bucket = getAgingBucketName(item.event_date);
            buckets[bucket].value += Number(item.balance_amount || 0);
            buckets[bucket].count += 1;
        });

        const total = Object.values(buckets).reduce((sum, b) => sum + b.value, 0);

        return Object.entries(buckets)
            .filter(([, data]) => data.value > 0)
            .map(([name, data]) => ({
                name,
                value: data.value,
                count: data.count,
                color: AGING_COLORS[name as keyof typeof AGING_COLORS],
                percentage: total > 0 ? (data.value / total) * 100 : 0,
            }));
    }, [receivables]);

    const totalAmount = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Phân bổ tuổi nợ</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full animate-pulse" />
                </CardContent>
            </Card>
        );
    }

    if (error || chartData.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Phân bổ tuổi nợ</CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-gray-400 dark:text-gray-500">
                    Không có dữ liệu
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Phân bổ tuổi nợ</CardTitle>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Tổng: {formatCurrency(totalAmount)}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div style={{ width: '100%', height: 200, contain: 'size layout' }}>
                    <ResponsiveContainer width="100%" height="100%" debounce={0}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                onClick={(data) => onBucketClick?.(data.name)}
                                style={{ cursor: 'pointer' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        className="hover:opacity-80 transition-opacity"
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="horizontal"
                                align="center"
                                verticalAlign="bottom"
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
