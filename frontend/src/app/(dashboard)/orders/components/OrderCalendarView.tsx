'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface OrderCalendarViewProps {
    orders: Order[];
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-400',
    CONFIRMED: 'bg-blue-500',
    IN_PROGRESS: 'bg-purple-500',
    ON_HOLD: 'bg-orange-400',
    COMPLETED: 'bg-green-500',
    PAID: 'bg-emerald-500',
    CANCELLED: 'bg-red-400',
};

const statusLabels: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang làm',
    ON_HOLD: 'Tạm hoãn',
    COMPLETED: 'Hoàn thành',
    PAID: 'Đã TT',
    CANCELLED: 'Đã hủy',
};

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function OrderCalendarView({ orders }: OrderCalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Get month info
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Get day of week for first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;  // Sunday wrap

    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

    // Group orders by date
    const ordersByDate = useMemo(() => {
        const map = new Map<string, Order[]>();
        orders.forEach(order => {
            const dateKey = order.event_date?.split('T')[0];
            if (dateKey) {
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(order);
            }
        });
        return map;
    }, [orders]);

    // Navigation
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Get month name in Vietnamese
    const monthName = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

    // Generate calendar grid
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
        calendarDays.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    // Get orders for a specific day
    const getOrdersForDay = (day: number) => {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return ordersByDate.get(dateKey) || [];
    };

    // Calculate day stats
    const getDayStats = (day: number) => {
        const dayOrders = getOrdersForDay(day);
        return {
            count: dayOrders.length,
            revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
            orders: dayOrders,
        };
    };

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-lg font-semibold capitalize min-w-[160px] text-center">
                        {monthName}
                    </h2>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button variant="outline" size="sm" onClick={goToToday}>
                    Hôm nay
                </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 px-4 py-2 border-b bg-gray-50 dark:bg-gray-900 text-xs">
                {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                        <span className="text-gray-600 dark:text-gray-400">{label}</span>
                    </div>
                ))}
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b">
                {WEEKDAYS.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="min-h-[100px] bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50 border-r border-b" />;
                    }

                    const stats = getDayStats(day);
                    const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

                    return (
                        <div
                            key={day}
                            className={`min-h-[100px] p-1 border-r border-b transition-colors
                                ${isToday(day) ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}
                                ${isPast && !isToday(day) ? 'bg-gray-50 dark:bg-gray-900/50 dark:bg-gray-800/50' : ''}
                                ${stats.count > 0 ? 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800' : ''}
                            `}
                        >
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-sm font-medium px-1.5 py-0.5 rounded
                                    ${isToday(day) ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'}
                                `}>
                                    {day}
                                </span>
                                {stats.count > 0 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                                        {stats.count} đơn
                                    </Badge>
                                )}
                            </div>

                            {/* Orders */}
                            <div className="space-y-0.5 overflow-y-auto max-h-[60px]">
                                <TooltipProvider>
                                    {stats.orders.slice(0, 3).map(order => (
                                        <Tooltip key={order.id}>
                                            <TooltipTrigger asChild>
                                                <Link href={`/orders/${order.id}`}>
                                                    <div className={`px-1.5 py-0.5 rounded text-[10px] text-white truncate cursor-pointer
                                                        ${statusColors[order.status]} hover:opacity-90`}
                                                    >
                                                        {order.event_time && <span className="font-medium">{order.event_time} </span>}
                                                        {order.code}
                                                    </div>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-[200px]">
                                                <div className="text-xs space-y-1">
                                                    <p className="font-medium">{order.code}</p>
                                                    <p className="text-gray-300 dark:text-gray-600">{order.customer_name}</p>
                                                    <p>{formatCurrency(order.total_amount)}</p>
                                                    <Badge className={`${statusColors[order.status]} text-[10px]`}>
                                                        {statusLabels[order.status]}
                                                    </Badge>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </TooltipProvider>
                                {stats.orders.length > 3 && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                                        +{stats.orders.length - 3} khác
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Month summary */}
            <div className="flex items-center justify-between p-3 border-t bg-gradient-to-r from-purple-50 to-pink-50 text-sm">
                <div className="flex gap-4">
                    <span className="text-gray-600 dark:text-gray-400">
                        Tổng: <strong>{orders.length}</strong> đơn
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                        Doanh thu: <strong className="text-green-600">
                            {formatCurrency(orders.reduce((sum, o) => sum + (o.total_amount || 0), 0))}
                        </strong>
                    </span>
                </div>
            </div>
        </Card>
    );
}
