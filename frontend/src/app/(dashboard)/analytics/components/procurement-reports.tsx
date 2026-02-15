'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useProcurementReport } from '@/hooks/use-analytics';
import { IconTruck, IconCash, IconReceipt, IconChartBar } from '@tabler/icons-react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
    DRAFT: '#94a3b8',
    SUBMITTED: '#3b82f6',
    APPROVED: '#22c55e',
    RECEIVED: '#14b8a6',
    PAID: '#c2185b',
    CANCELLED: '#ef4444',
    UNKNOWN: '#d1d5db',
};

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    SUBMITTED: 'Đã gửi',
    APPROVED: 'Đã duyệt',
    RECEIVED: 'Đã nhận',
    PAID: 'Đã trả',
    CANCELLED: 'Hủy',
    UNKNOWN: 'Khác',
};

export function ProcurementReports() {
    const { data: report, isLoading } = useProcurementReport();

    const summaryCards = [
        { title: 'Tổng chi mua hàng', value: report?.total_spend || 0, icon: IconCash, color: 'text-green-600', bg: 'bg-green-50', format: 'currency' },
        { title: 'Tổng PO', value: report?.total_pos || 0, icon: IconReceipt, color: 'text-blue-600', bg: 'bg-blue-50', format: 'number' },
        { title: 'Giá trị TB/PO', value: report?.avg_po_value || 0, icon: IconChartBar, color: 'text-purple-600', bg: 'bg-purple-50', format: 'currency' },
        { title: 'Nhà cung cấp', value: report?.top_suppliers?.length || 0, icon: IconTruck, color: 'text-teal-600', bg: 'bg-teal-50', format: 'number' },
    ];

    const spendData = report?.spend_trend?.map(p => ({
        name: p.period,
        'Chi tiêu': p.revenue,
        'Số PO': p.orders_count,
    })) || [];

    const statusData = report?.po_status_breakdown?.map(s => ({
        name: STATUS_LABELS[s.status] || s.status,
        value: s.count,
        fill: STATUS_COLORS[s.status] || STATUS_COLORS.UNKNOWN,
    })) || [];

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {summaryCards.map((card, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            {isLoading ? <Skeleton className="h-12 w-full" /> : (
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${card.bg}`}>
                                        <card.icon className={`h-4 w-4 ${card.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{card.title}</p>
                                        <p className="text-sm font-bold tabular-nums">
                                            {card.format === 'currency' ? formatCurrency(card.value) : formatNumber(card.value)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Spend Trend + PO Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Spend Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Chi tiêu mua hàng theo tháng</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[280px] w-full" />
                        ) : spendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={spendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                                    <Tooltip formatter={(value, name) =>
                                        name === 'Chi tiêu' ? formatCurrency(value as number) : formatNumber(value as number)
                                    } />
                                    <Legend />
                                    <Bar dataKey="Chi tiêu" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                                Chưa có dữ liệu mua hàng
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* PO Status Pie */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Trạng thái PO</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[280px] w-full" />
                        ) : statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {statusData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                                Chưa có dữ liệu
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Suppliers */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Top nhà cung cấp theo chi tiêu</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                        <div className="space-y-2">
                            {report?.top_suppliers?.map((s, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{i + 1}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{s.supplier_name}</p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">{s.po_count} đơn mua hàng</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold tabular-nums text-teal-600 shrink-0">
                                        {formatCurrency(s.total_spend)}
                                    </span>
                                </div>
                            ))}
                            {(!report?.top_suppliers || report.top_suppliers.length === 0) && (
                                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Chưa có dữ liệu</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
