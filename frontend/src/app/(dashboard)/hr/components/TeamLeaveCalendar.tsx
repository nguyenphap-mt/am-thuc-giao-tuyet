'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconChevronLeft,
    IconChevronRight,
    IconCalendar,
} from '@tabler/icons-react';

interface TeamLeaveEntry {
    employee_name: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    total_days: number;
}

const MONTH_NAMES = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function TeamLeaveCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fetch all leave requests for this month
    const { data: teamLeaves, isLoading } = useQuery({
        queryKey: ['hr', 'leave', 'team-calendar', year, month],
        queryFn: async () => {
            const allRequests = await api.get<TeamLeaveEntry[]>('/hr/leave/requests');
            // Filter to requests that overlap with current month
            const monthStart = new Date(year, month, 1);
            const monthEnd = new Date(year, month + 1, 0);
            return (allRequests || []).filter(req => {
                if (req.status === 'REJECTED') return false;
                const start = new Date(req.start_date);
                const end = new Date(req.end_date);
                return start <= monthEnd && end >= monthStart;
            });
        },
    });

    // Calendar grid generation
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isToday = (day: number) =>
        today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

    // Get leaves for a specific day
    const getLeavesForDay = (day: number) => {
        if (!teamLeaves) return [];
        const date = new Date(year, month, day);
        return teamLeaves.filter(req => {
            const start = new Date(req.start_date);
            const end = new Date(req.end_date);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        });
    };

    const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Generate calendar cells
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/50 rounded" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dayLeaves = getLeavesForDay(day);
        const isTodayCell = isToday(day);
        const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;

        cells.push(
            <div
                key={day}
                className={`min-h-[80px] p-1 rounded border transition-colors ${isTodayCell
                        ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                        : isWeekend
                            ? 'bg-gray-50 border-gray-100'
                            : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
            >
                <div className={`text-xs font-medium px-1 ${isTodayCell ? 'text-blue-700' : isWeekend ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    {day}
                </div>
                <div className="space-y-0.5 mt-0.5">
                    {dayLeaves.slice(0, 3).map((leave, i) => (
                        <div
                            key={i}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${leave.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                            title={`${leave.employee_name} — ${leave.leave_type_name}`}
                        >
                            {leave.employee_name.split(' ').pop()}
                        </div>
                    ))}
                    {dayLeaves.length > 3 && (
                        <div className="text-[10px] text-gray-400 px-1">
                            +{dayLeaves.length - 3} người
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <IconCalendar className="h-5 w-5 text-blue-600" />
                        Lịch nghỉ phép team
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            Hôm nay
                        </Button>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={goToPrevMonth}>
                                <IconChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[120px] text-center">
                                {MONTH_NAMES[month]} {year}
                            </span>
                            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                                <IconChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 text-[10px] px-1.5">Đã duyệt</Badge>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 text-[10px] px-1.5">Chờ duyệt</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 35 }, (_, i) => (
                            <Skeleton key={i} className="h-[80px] rounded" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {DAY_NAMES.map((d) => (
                                <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {cells}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
