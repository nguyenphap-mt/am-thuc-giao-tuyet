'use client';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface RevenueData {
    date: string;
    revenue: number;
}

interface RevenueChartProps {
    data?: RevenueData[];
}

export function RevenueChart({ data = [] }: RevenueChartProps) {
    // BUGFIX: BUG-20260218-005 — Show empty state instead of mock data
    if (data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>Chưa có dữ liệu doanh thu</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c2185b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c2185b" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Doanh thu']}
                    labelStyle={{ fontWeight: 600 }}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#c2185b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    animationDuration={1000}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
