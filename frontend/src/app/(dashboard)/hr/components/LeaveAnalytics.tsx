'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconChartBar,
    IconFlame,
    IconPercentage,
    IconBeach,
} from '@tabler/icons-react';

interface LeaveAnalyticsData {
    year: number;
    total_employees: number;
    avg_usage_rate: number;
    burnout_risk_count: number;
    top_leave_types: {
        name: string;
        code: string;
        request_count: number;
        total_days: number;
    }[];
    monthly_trend: {
        month: number;
        month_name: string;
        requests: number;
        days: number;
    }[];
}

export default function LeaveAnalytics() {
    const year = new Date().getFullYear();

    const { data: analytics, isLoading } = useQuery({
        queryKey: ['leave', 'analytics', year],
        queryFn: () => api.get<LeaveAnalyticsData>(`/hr/leave/analytics?year=${year}`),
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-48" />
            </div>
        );
    }

    if (!analytics) return null;

    // Find max days for chart scaling
    const maxDays = Math.max(1, ...analytics.monthly_trend.map(m => m.days));

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Avg Usage Rate */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50">
                                <IconPercentage className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Tỷ lệ sử dụng phép</p>
                                <p className="text-2xl font-bold text-blue-600">{analytics.avg_usage_rate}%</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Trung bình {analytics.total_employees} nhân viên — Năm {year}
                        </p>
                    </CardContent>
                </Card>

                {/* Burnout Risk */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${analytics.burnout_risk_count > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                <IconFlame className={`h-5 w-5 ${analytics.burnout_risk_count > 0 ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Nguy cơ burnout</p>
                                <p className={`text-2xl font-bold ${analytics.burnout_risk_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {analytics.burnout_risk_count}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                            Chưa nghỉ phép {'>'}90 ngày
                        </p>
                    </CardContent>
                </Card>

                {/* Top Leave Type */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-50">
                                <IconBeach className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Loại nghỉ phổ biến nhất</p>
                                <p className="text-lg font-bold text-purple-600">
                                    {analytics.top_leave_types[0]?.name || 'N/A'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {analytics.top_leave_types.map(t => (
                                <Badge key={t.code} variant="outline" className="text-[10px] px-1.5">
                                    {t.name}: {t.total_days}d
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend Chart (pure CSS bar chart) */}
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <IconChartBar className="h-5 w-5 text-accent-primary" />
                        Xu hướng nghỉ phép {year}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-1 h-32">
                        {analytics.monthly_trend.map((m) => {
                            const heightPercent = maxDays > 0 ? (m.days / maxDays) * 100 : 0;
                            const currentMonth = new Date().getMonth() + 1;
                            const isCurrentMonth = m.month === currentMonth;

                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.month_name}: ${m.days} ngày (${m.requests} đơn)`}>
                                    {/* Value label */}
                                    <span className="text-[10px] text-gray-400 tabular-nums">
                                        {m.days > 0 ? m.days : ''}
                                    </span>
                                    {/* Bar */}
                                    <div
                                        className={`w-full rounded-t transition-all ${isCurrentMonth
                                                ? 'bg-gradient-to-t from-pink-500 to-purple-500'
                                                : m.days > 0
                                                    ? 'bg-gradient-to-t from-blue-400 to-blue-300'
                                                    : 'bg-gray-100'
                                            }`}
                                        style={{
                                            height: `${Math.max(heightPercent, 4)}%`,
                                            minHeight: '4px',
                                        }}
                                    />
                                    {/* Month label */}
                                    <span className={`text-[10px] ${isCurrentMonth ? 'font-bold text-accent-primary' : 'text-gray-400'}`}>
                                        {m.month_name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-gradient-to-t from-blue-400 to-blue-300" />
                            Ngày nghỉ
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded bg-gradient-to-t from-pink-500 to-purple-500" />
                            Tháng hiện tại
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
