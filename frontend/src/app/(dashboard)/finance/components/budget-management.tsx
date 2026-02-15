'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import {
    IconCalendarDollar,
    IconPlus,
    IconChevronRight,
    IconTrendingUp,
    IconTrendingDown
} from '@tabler/icons-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface Budget {
    id: string;
    code: string;
    name: string;
    fiscal_year: string;
    status: string;
    total_amount: number;
    start_date: string;
    end_date: string;
}

interface BudgetVsActualData {
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Nháp', className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
    ACTIVE: { label: 'Hoạt động', className: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'Đóng', className: 'bg-blue-100 text-blue-700' },
    ARCHIVED: { label: 'Lưu trữ', className: 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
};

// Mock data for Budget vs Actual chart (will be replaced with API)
const MOCK_BUDGET_VS_ACTUAL: BudgetVsActualData[] = [
    { category: 'Nguyên liệu', budgeted: 50000000, actual: 45000000, variance: 5000000 },
    { category: 'Nhân công', budgeted: 30000000, actual: 32000000, variance: -2000000 },
    { category: 'Vận hành', budgeted: 15000000, actual: 12000000, variance: 3000000 },
    { category: 'Marketing', budgeted: 10000000, actual: 8000000, variance: 2000000 },
    { category: 'Tiện ích', budgeted: 5000000, actual: 6000000, variance: -1000000 },
];

export function BudgetManagement() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

    // Query budgets (will show empty state until migration is run)
    const { data: budgets, isLoading: budgetsLoading } = useQuery({
        queryKey: ['finance-budgets', selectedYear],
        queryFn: async () => {
            try {
                const response = await api.get<Budget[]>(`/finance/budgets?fiscal_year=${selectedYear}`);
                return response;
            } catch {
                // Return empty array if endpoint not yet available
                return [];
            }
        },
    });

    const chartData = MOCK_BUDGET_VS_ACTUAL;
    const totalBudgeted = chartData.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = chartData.reduce((sum, item) => sum + item.actual, 0);
    const totalVariance = totalBudgeted - totalActual;

    if (budgetsLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Year Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <IconCalendarDollar className="h-6 w-6 text-purple-600" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Quản lý ngân sách</h2>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white text-sm focus:ring-2 focus:ring-purple-500"
                    >
                        {[2024, 2025, 2026, 2027].map((year) => (
                            <option key={year} value={year}>
                                Năm {year}
                            </option>
                        ))}
                    </select>
                    <Button className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Tạo ngân sách
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng ngân sách</div>
                        <div className="text-2xl font-bold text-purple-700">{formatCurrency(totalBudgeted)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Chi thực tế</div>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(totalActual)}</div>
                    </CardContent>
                </Card>
                <Card className={`bg-gradient-to-br ${totalVariance >= 0 ? 'from-green-50 to-emerald-50' : 'from-red-50 to-orange-50'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            {totalVariance >= 0 ? (
                                <IconTrendingDown className="h-4 w-4 text-green-600" />
                            ) : (
                                <IconTrendingUp className="h-4 w-4 text-red-600" />
                            )}
                            Chênh lệch
                        </div>
                        <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Budget vs Actual Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Ngân sách vs Thực tế</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                                <YAxis type="category" dataKey="category" width={80} />
                                <Tooltip
                                    formatter={(value, name) => [
                                        formatCurrency(value as number),
                                        name === 'budgeted' ? 'Ngân sách' : 'Thực tế'
                                    ]}
                                    labelStyle={{ color: '#374151' }}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend
                                    formatter={(value) => value === 'budgeted' ? 'Ngân sách' : 'Thực tế'}
                                />
                                <Bar dataKey="budgeted" fill="#a855f7" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="actual" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.variance >= 0 ? '#22c55e' : '#ef4444'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Budget List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Danh sách ngân sách năm {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                    {(!budgets || budgets.length === 0) ? (
                        <div className="py-12 text-center">
                            <IconCalendarDollar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Chưa có ngân sách nào cho năm {selectedYear}</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                                Nhấn &quot;Tạo ngân sách&quot; để bắt đầu lập kế hoạch tài chính
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {budgets.map((budget) => (
                                <div
                                    key={budget.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{budget.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{budget.code}</div>
                                        </div>
                                        <Badge className={STATUS_BADGES[budget.status]?.className || 'bg-gray-100 dark:bg-gray-800'}>
                                            {STATUS_BADGES[budget.status]?.label || budget.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(budget.total_amount)}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {budget.start_date} - {budget.end_date}
                                            </div>
                                        </div>
                                        <IconChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
