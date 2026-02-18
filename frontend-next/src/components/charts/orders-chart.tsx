'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface OrdersData {
    status: string;
    count: number;
    color: string;
}

interface OrdersChartProps {
    data?: OrdersData[];
}

export function OrdersChart({ data = [] }: OrdersChartProps) {
    // BUGFIX: BUG-20260218-005 — Show empty state instead of mock data
    const hasData = data.some(d => d.count > 0);
    if (data.length === 0 || !hasData) {
        return (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>Chưa có dữ liệu đơn hàng</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value) => [value ?? 0, 'Đơn hàng']}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    animationDuration={800}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
