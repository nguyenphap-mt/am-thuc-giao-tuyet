'use client';

import { useMemo } from 'react';
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconChartBar } from '@tabler/icons-react';

interface PayrollPeriod {
 id: string;
 period_name: string;
 status: string;
 total_gross: number;
 total_deductions: number;
 total_net: number;
 total_employer_cost?: number;
 total_employees: number;
}

interface PayrollComparisonChartProps {
 periods: PayrollPeriod[];
}

const formatVND = (value: number) => {
 if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
 if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
 return value.toString();
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
 if (!active || !payload) return null;
 const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
 return (
 <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
 <p className="font-semibold text-gray-800 mb-2">{label}</p>
 {payload.map((entry, idx) => (
 <div key={idx} className="flex items-center justify-between gap-4">
 <span className="flex items-center gap-1.5">
 <span className="w-2.5 h-2.5 rounded-sm" style={{ background: entry.color }} />
 {entry.name}
 </span>
 <span className="font-medium tabular-nums">{fmt.format(entry.value)}</span>
 </div>
 ))}
 </div>
 );
};

export default function PayrollComparisonChart({ periods }: PayrollComparisonChartProps) {
 const chartData = useMemo(() => {
 // Show last 6 calculated/approved/paid periods, oldest first
 const relevantPeriods = periods
 .filter(p => ['CALCULATED', 'APPROVED', 'PAID'].includes(p.status))
 .sort((a, b) => a.period_name.localeCompare(b.period_name))
 .slice(-6);

 return relevantPeriods.map(p => ({
 name: p.period_name,
 'Thu nhập': p.total_gross,
 'Khấu trừ NLĐ': p.total_deductions,
 'Thực nhận': p.total_net,
 'Chi phí NSDLĐ': p.total_employer_cost ?? 0,
 employees: p.total_employees,
 }));
 }, [periods]);

 if (chartData.length < 2) return null;

 return (
 <Card className="border-accent-subtle">
 <CardHeader className="py-3 px-4">
 <CardTitle className="text-sm font-medium text-accent-strong flex items-center gap-2">
 <IconChartBar className="h-4 w-4" />
 So sánh lương theo kỳ ({chartData.length} kỳ gần nhất)
 </CardTitle>
 </CardHeader>
 <CardContent className="px-2 pb-3 pt-0">
 <ResponsiveContainer width="100%" height={280}>
 <BarChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
 <XAxis
 dataKey="name"
 tick={{ fontSize: 12, fill: '#64748b' }}
 />
 <YAxis
 tick={{ fontSize: 11, fill: '#64748b' }}
 tickFormatter={formatVND}
 width={55}
 />
 <Tooltip content={<CustomTooltip />} />
 <Legend
 wrapperStyle={{ fontSize: '12px' }}
 iconType="square"
 iconSize={10}
 />
 <Bar dataKey="Thu nhập" fill="#22c55e" radius={[2, 2, 0, 0]} maxBarSize={40} />
 <Bar dataKey="Khấu trừ NLĐ" fill="#ef4444" radius={[2, 2, 0, 0]} maxBarSize={40} />
 <Bar dataKey="Thực nhận" fill="#8b5cf6" radius={[2, 2, 0, 0]} maxBarSize={40} />
 <Bar dataKey="Chi phí NSDLĐ" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={40} />
 </BarChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 );
}
