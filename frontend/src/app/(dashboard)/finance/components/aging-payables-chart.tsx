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
import { differenceInDays, parseISO, addDays } from 'date-fns';

interface Payable {
    po_id: string;
    po_code: string;
    supplier_name: string;
    created_at: string;
    balance: number;
    payment_terms_days: number;
}

interface AgingBucket {
    name: string;
    value: number;
    count: number;
    color: string;
    percentage: number;
}

// Colors for payables aging - uses different palette from receivables
const AGING_COLORS = {
    'Đúng hạn': '#22c55e',       // Green
    'Sắp đến hạn': '#eab308',    // Yellow
    'Quá hạn': '#ef4444',        // Red
};

const getAgingBucketName = (payable: Payable): keyof typeof AGING_COLORS => {
    if (payable.balance <= 0) return 'Đúng hạn';
    const dueDate = addDays(parseISO(payable.created_at), payable.payment_terms_days || 30);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue < 0) return 'Quá hạn';
    if (daysUntilDue <= 7) return 'Sắp đến hạn';
    return 'Đúng hạn';
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
                    {data.count} đơn mua
                </p>
            </div>
        );
    }
    return null;
};

interface AgingPayablesChartProps {
    onBucketClick?: (bucketName: string) => void;
}

export function AgingPayablesChart({ onBucketClick }: AgingPayablesChartProps) {
    const { data: payables, isLoading, error } = useQuery({
        queryKey: ['finance-payables'],
        queryFn: async () => {
            const response = await api.get<Payable[]>('/finance/payables');
            return response;
        },
    });

    const chartData = useMemo(() => {
        if (!payables || payables.length === 0) return [];

        const buckets: Record<string, { value: number; count: number }> = {
            'Đúng hạn': { value: 0, count: 0 },
            'Sắp đến hạn': { value: 0, count: 0 },
            'Quá hạn': { value: 0, count: 0 },
        };

        payables.forEach((item) => {
            const bucket = getAgingBucketName(item);
            buckets[bucket].value += Number(item.balance || 0);
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
    }, [payables]);

    const totalAmount = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Phân bổ tuổi nợ phải trả</CardTitle>
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
                    <CardTitle className="text-base">Phân bổ tuổi nợ phải trả</CardTitle>
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
                    <CardTitle className="text-base">Phân bổ tuổi nợ phải trả</CardTitle>
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
