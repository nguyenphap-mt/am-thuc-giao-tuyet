'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    AvailabilityResponse,
    EmployeeAvailability,
} from './calendar-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconUser,
    IconCheck,
    IconBriefcase,
    IconUserOff,
    IconAlertTriangle,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface StaffAvailabilityProps {
    selectedDate: Date | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    AVAILABLE: {
        label: 'Sẵn sàng',
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200',
        icon: <IconCheck className="h-3.5 w-3.5 text-green-600" />,
    },
    ASSIGNED: {
        label: 'Đã phân công',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: <IconBriefcase className="h-3.5 w-3.5 text-blue-600" />,
    },
    ON_LEAVE: {
        label: 'Nghỉ phép',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: <IconUserOff className="h-3.5 w-3.5 text-red-600" />,
    },
};

export function StaffAvailability({ selectedDate }: StaffAvailabilityProps) {
    const dateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : null;

    const { data, isLoading } = useQuery({
        queryKey: ['staff-availability', dateStr],
        queryFn: () => api.get<AvailabilityResponse>(`/hr/calendar/employee-availability?date=${dateStr}`),
        enabled: !!dateStr,
    });

    if (!selectedDate) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                    <IconUser className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 dark:text-gray-500">Chọn một ngày để xem nhân viên</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Nhân sự</CardTitle>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {format(selectedDate, 'dd/MM/yyyy', { locale: vi })}
                    </span>
                </div>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-lg" />
                        ))}
                    </div>
                ) : data ? (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="bg-green-50 rounded-lg p-1.5">
                                <p className="text-base font-bold text-green-700 tabular-nums">{data.available}</p>
                                <p className="text-[10px] text-green-600">Sẵn sàng</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-1.5">
                                <p className="text-base font-bold text-blue-700 tabular-nums">{data.assigned}</p>
                                <p className="text-[10px] text-blue-600">Đã phân công</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-1.5">
                                <p className="text-base font-bold text-red-700 tabular-nums">{data.on_leave}</p>
                                <p className="text-[10px] text-red-600">Nghỉ phép</p>
                            </div>
                        </div>

                        {/* Employee list */}
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                            {data.employees.map((emp) => {
                                const config = STATUS_CONFIG[emp.status] || STATUS_CONFIG.AVAILABLE;
                                return (
                                    <div
                                        key={emp.employee_id}
                                        className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${config.bg}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700/80 flex items-center justify-center flex-shrink-0">
                                                <IconUser className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{emp.employee_name}</p>
                                                {emp.conflicts.length > 0 && (
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                        {emp.conflicts.map(c => c.description).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {config.icon}
                                            {emp.assignment_count > 1 && (
                                                <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-600 px-1">
                                                    <IconAlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                                    {emp.assignment_count}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Không có dữ liệu</p>
                )}
            </CardContent>
        </Card>
    );
}
