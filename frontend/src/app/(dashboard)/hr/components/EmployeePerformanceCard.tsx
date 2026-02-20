'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    IconClock,
    IconCalendarEvent,
    IconTrendingUp,
    IconCheck,
    IconStarFilled,
    IconRefresh
} from '@tabler/icons-react';

interface PerformanceMetrics {
    total_hours: number;
    total_overtime: number;
    total_timesheets: number;
    total_assignments: number;
    completed_assignments: number;
    on_time_rate: number;
    completion_rate: number;
}

interface PerformanceData {
    employee_id: string;
    employee_name: string;
    period_days: number;
    metrics: PerformanceMetrics;
}

interface Props {
    employeeId: string;
    employeeName: string;
    periodDays?: number;
}

export function EmployeePerformanceCard({ employeeId, employeeName, periodDays = 30 }: Props) {
    const { data, isLoading, error, refetch } = useQuery<PerformanceData>({
        queryKey: ['employee-performance', employeeId, periodDays],
        queryFn: async () => {
            return await api.get(`/hr/employees/${employeeId}/performance?period_days=${periodDays}`);
        },
        enabled: !!employeeId,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <div className="animate-pulse space-y-4">
                    <div className="h-5 bg-purple-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-16 bg-purple-100 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <p className="text-red-600 text-sm">Không thể tải dữ liệu hiệu suất</p>
            </div>
        );
    }

    const metrics = data.metrics;

    // Calculate performance level
    const getPerformanceLevel = () => {
        const avgRate = (metrics.on_time_rate + metrics.completion_rate) / 2;
        if (avgRate >= 90) return { label: 'Xuất sắc', color: 'text-green-600', bg: 'bg-green-100' };
        if (avgRate >= 70) return { label: 'Tốt', color: 'text-blue-600', bg: 'bg-blue-100' };
        if (avgRate >= 50) return { label: 'Trung bình', color: 'text-yellow-600', bg: 'bg-yellow-100' };
        return { label: 'Cần cải thiện', color: 'text-red-600', bg: 'bg-red-100' };
    };

    const level = getPerformanceLevel();

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <IconTrendingUp className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Hiệu suất làm việc</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${level.bg} ${level.color}`}>
                        {level.label}
                    </span>
                    <button
                        onClick={() => refetch()}
                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Làm mới"
                    >
                        <IconRefresh className="w-4 h-4 text-purple-500" />
                    </button>
                </div>
            </div>

            {/* Period badge */}
            <div className="mb-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    Thống kê {periodDays} ngày gần nhất
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Total Hours */}
                <div className="bg-white/70 rounded-lg p-3.5 border border-purple-100/50">
                    <div className="flex items-center gap-2 mb-1.5">
                        <IconClock className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tổng giờ làm</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{metrics.total_hours}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">giờ</span>
                    </div>
                    {metrics.total_overtime > 0 && (
                        <span className="text-xs text-orange-500">+{metrics.total_overtime}h tăng ca</span>
                    )}
                </div>

                {/* Assignments */}
                <div className="bg-white/70 rounded-lg p-3.5 border border-purple-100/50">
                    <div className="flex items-center gap-2 mb-1.5">
                        <IconCalendarEvent className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Đơn hàng</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{metrics.total_assignments}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">đơn</span>
                    </div>
                    <span className="text-xs text-green-500">{metrics.completed_assignments} hoàn thành</span>
                </div>

                {/* On-Time Rate */}
                <div className="bg-white/70 rounded-lg p-3.5 border border-purple-100/50">
                    <div className="flex items-center gap-2 mb-1.5">
                        <IconCheck className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tỷ lệ đúng giờ</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{metrics.on_time_rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, metrics.on_time_rate)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Completion Rate */}
                <div className="bg-white/70 rounded-lg p-3.5 border border-purple-100/50">
                    <div className="flex items-center gap-2 mb-1.5">
                        <IconStarFilled className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tỷ lệ hoàn thành</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{metrics.completion_rate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                        <div
                            className="bg-yellow-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, metrics.completion_rate)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Visual Performance Summary Bar */}
            <div className="mt-4 bg-white/70 rounded-lg p-3.5 border border-purple-100/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Tổng quan hiệu suất</span>
                    <span className="text-xs text-gray-400">{metrics.total_timesheets} bản chấm công</span>
                </div>
                {/* Stacked bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5">
                    <div
                        className="bg-green-400 rounded-l-full transition-all duration-500"
                        style={{ width: `${Math.min(100, metrics.on_time_rate)}%` }}
                        title={`Đúng giờ: ${metrics.on_time_rate}%`}
                    />
                    <div
                        className="bg-yellow-400 transition-all duration-500"
                        style={{ width: `${Math.min(100 - metrics.on_time_rate, metrics.completion_rate - metrics.on_time_rate > 0 ? metrics.completion_rate - metrics.on_time_rate : 5)}%` }}
                        title={`Hoàn thành: ${metrics.completion_rate}%`}
                    />
                    {metrics.total_overtime > 0 && (
                        <div
                            className="bg-orange-400 rounded-r-full transition-all duration-500"
                            style={{ width: `${Math.min(15, (metrics.total_overtime / Math.max(1, metrics.total_hours)) * 100)}%` }}
                            title={`Tăng ca: ${metrics.total_overtime}h`}
                        />
                    )}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        <span className="text-[10px] text-gray-500">Đúng giờ</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <span className="text-[10px] text-gray-500">Hoàn thành</span>
                    </div>
                    {metrics.total_overtime > 0 && (
                        <div className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                            <span className="text-[10px] text-gray-500">Tăng ca</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EmployeePerformanceCard;
