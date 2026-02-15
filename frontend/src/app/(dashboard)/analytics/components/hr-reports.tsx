'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useHRReport } from '@/hooks/use-analytics';
import { IconUsers, IconClock, IconCash, IconBuildingSkyscraper } from '@tabler/icons-react';
import {
    BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';

const DEPT_COLORS = ['#c2185b', '#7b1fa2', '#512da8', '#1976d2', '#0097a7', '#388e3c', '#f57c00', '#455a64'];

export function HRReports() {
    const { data: report, isLoading } = useHRReport();

    const summaryCards = [
        { title: 'Tổng nhân viên', value: report?.total_employees || 0, icon: IconUsers, color: 'text-blue-600', bg: 'bg-blue-50', format: 'number', unit: 'người' },
        { title: 'Đang hoạt động', value: report?.active_employees || 0, icon: IconUsers, color: 'text-green-600', bg: 'bg-green-50', format: 'number', unit: 'người' },
        { title: 'Giờ làm tháng', value: report?.total_hours_month || 0, icon: IconClock, color: 'text-amber-600', bg: 'bg-amber-50', format: 'number', unit: 'giờ' },
        { title: 'Tổng lương tháng', value: report?.total_payroll_month || 0, icon: IconCash, color: 'text-pink-600', bg: 'bg-pink-50', format: 'currency', unit: '' },
    ];

    const deptData = report?.department_headcount?.map((d, i) => ({
        name: d.department,
        value: d.count,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
    })) || [];

    const deptBarData = report?.department_headcount?.map(d => ({
        name: d.department?.slice(0, 15) || 'N/A',
        'Nhân viên': d.count,
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
                                            {card.format === 'currency'
                                                ? formatCurrency(card.value)
                                                : `${formatNumber(card.value)} ${card.unit}`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Department Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Department Bar Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Nhân sự theo phòng ban</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[280px] w-full" />
                        ) : deptBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={deptBarData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="Nhân viên" fill="#7b1fa2" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-gray-400 dark:text-gray-500">
                                Chưa có dữ liệu phòng ban
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Department Pie */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Phân bổ nhân sự</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-[280px] w-full" />
                        ) : deptData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={deptData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {deptData.map((entry, i) => (
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

            {/* Department Detail Table */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">Chi tiết theo phòng ban</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Phòng ban</th>
                                        <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Số lượng</th>
                                        <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Tỷ lệ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report?.department_headcount?.map((d, i) => (
                                        <tr key={i} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 transition-colors">
                                            <td className="py-2 px-3 font-medium">{d.department || 'Không xác định'}</td>
                                            <td className="py-2 px-3 text-right tabular-nums">{d.count}</td>
                                            <td className="py-2 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                                                {report?.active_employees
                                                    ? `${((d.count / report.active_employees) * 100).toFixed(1)}%`
                                                    : '0%'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                                        <td className="py-2 px-3 font-bold">Tổng cộng</td>
                                        <td className="py-2 px-3 text-right font-bold tabular-nums">{report?.active_employees || 0}</td>
                                        <td className="py-2 px-3 text-right font-bold tabular-nums">100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
