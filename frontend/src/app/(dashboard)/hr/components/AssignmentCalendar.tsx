'use client';

import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, getDay, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconCalendar, IconUser, IconMapPin } from '@tabler/icons-react';

interface Assignment {
    id: string;
    event_id?: string | null;
    event_code?: string;
    event_name?: string;
    event_location?: string;
    event_date?: string;
    employee_id?: string | null;
    employee_name?: string | null;
    role?: string | null;
    status: string;
    start_time?: string | null;
    end_time?: string | null;
}

interface AssignmentCalendarProps {
    assignments: Assignment[];
    currentMonth: Date;
    onDateClick?: (date: Date, assignments: Assignment[]) => void;
}

const STATUS_COLORS: Record<string, string> = {
    'ASSIGNED': 'bg-blue-100 text-blue-700 border-blue-200',
    'CONFIRMED': 'bg-green-100 text-green-700 border-green-200',
    'CHECKED_IN': 'bg-purple-100 text-purple-700 border-purple-200',
    'COMPLETED': 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    'CANCELLED': 'bg-red-100 text-red-700 border-red-200',
};

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function AssignmentCalendar({
    assignments,
    currentMonth,
    onDateClick
}: AssignmentCalendarProps) {
    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Add padding days for first week
        const firstDayOfWeek = getDay(monthStart);
        const paddingBefore = Array.from({ length: firstDayOfWeek }, (_, i) =>
            addDays(monthStart, -(firstDayOfWeek - i))
        );

        // Add padding days for last week
        const lastDayOfWeek = getDay(monthEnd);
        const paddingAfter = Array.from({ length: 6 - lastDayOfWeek }, (_, i) =>
            addDays(monthEnd, i + 1)
        );

        return [...paddingBefore, ...days, ...paddingAfter];
    }, [currentMonth]);

    // Group assignments by date
    const assignmentsByDate = useMemo(() => {
        const map = new Map<string, Assignment[]>();
        assignments.forEach(assignment => {
            if (assignment.event_date) {
                const dateKey = format(parseISO(assignment.event_date), 'yyyy-MM-dd');
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(assignment);
            }
        });
        return map;
    }, [assignments]);

    const isCurrentMonth = (date: Date) => {
        return format(date, 'MM') === format(currentMonth, 'MM');
    };

    return (
        <Card>
            <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <IconCalendar className="h-5 w-5" />
                    Lịch phân công - {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_NAMES.map((day, i) => (
                        <div
                            key={day}
                            className={`text-center text-xs font-medium py-2 ${i === 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayAssignments = assignmentsByDate.get(dateKey) || [];
                        const isInCurrentMonth = isCurrentMonth(day);
                        const isTodayDate = isToday(day);
                        const isSunday = getDay(day) === 0;

                        return (
                            <div
                                key={index}
                                onClick={() => onDateClick?.(day, dayAssignments)}
                                className={`
                                    min-h-[80px] p-1 border rounded-lg cursor-pointer
                                    transition-all hover:shadow-md
                                    ${!isInCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 opacity-50' : 'bg-white'}
                                    ${isTodayDate ? 'ring-2 ring-purple-500 ring-offset-1' : 'border-gray-200 dark:border-gray-700'}
                                `}
                            >
                                {/* Date number */}
                                <div className={`
                                    text-right text-sm font-medium mb-1
                                    ${isTodayDate ? 'text-purple-600' : isSunday ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}
                                `}>
                                    {format(day, 'd')}
                                </div>

                                {/* Assignments for this day */}
                                <div className="space-y-1 overflow-hidden">
                                    {dayAssignments.slice(0, 2).map((assignment) => (
                                        <div
                                            key={assignment.id}
                                            className={`
                                                text-xs p-1 rounded border truncate
                                                ${STATUS_COLORS[assignment.status] || 'bg-gray-100 dark:bg-gray-800'}
                                            `}
                                            title={`${assignment.employee_name} - ${assignment.event_name}`}
                                        >
                                            <div className="flex items-center gap-1">
                                                <IconUser className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{assignment.employee_name}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {dayAssignments.length > 2 && (
                                        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                                            +{dayAssignments.length - 2} khác
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
                    {Object.entries(STATUS_COLORS).slice(0, 4).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {status === 'ASSIGNED' && 'Đã phân công'}
                                {status === 'CONFIRMED' && 'Đã xác nhận'}
                                {status === 'CHECKED_IN' && 'Đã check-in'}
                                {status === 'COMPLETED' && 'Hoàn thành'}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
