'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    CalendarEvent,
    OrderDetail,
    HOURS,
    getDateKey,
    parseEventHour,
    getEventShortTitle,
    ORDER_STATUS_MAP,
} from './calendar-types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    IconCalendar,
    IconMapPin,
    IconUser,
    IconClock,
    IconAlertTriangle,
} from '@tabler/icons-react';

interface DayViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    isLoading: boolean;
    onEventClick: (event: CalendarEvent) => void;
}

export function DayView({ currentDate, events, isLoading, onEventClick }: DayViewProps) {
    const today = new Date();
    const currentHour = today.getHours();
    const isToday = currentDate.toDateString() === today.toDateString();
    const dateKey = getDateKey(currentDate);

    // Separate events
    const dayEvents = useMemo(() => events.filter(e => e.start_date === dateKey), [events, dateKey]);
    const allDayEvents = useMemo(() => dayEvents.filter(e => e.all_day), [dayEvents]);
    const timedEvents = useMemo(() => dayEvents.filter(e => !e.all_day), [dayEvents]);
    const orderCount = useMemo(() => dayEvents.filter(e => e.type === 'ORDER').length, [dayEvents]);

    const getEventsAtHour = (hour: number) => timedEvents.filter(e => parseEventHour(e) === hour);

    return (
        <div className="space-y-3">
            {/* Day header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`text-center p-3 rounded-xl min-w-[60px] ${isToday ? 'bg-purple-100' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <p className={`text-2xl font-bold tabular-nums ${isToday ? 'text-purple-600' : 'text-gray-900 dark:text-gray-100'}`}>
                            {currentDate.getDate()}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">
                            {format(currentDate, 'EEEE', { locale: vi })}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {format(currentDate, 'dd MMMM yyyy', { locale: vi })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dayEvents.length} sự kiện
                            {orderCount >= 2 && (
                                <Badge variant="secondary" className="ml-2 text-[9px] bg-orange-100 text-orange-600 px-1.5">
                                    <IconAlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                    {orderCount} đơn hàng trùng ngày
                                </Badge>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* All-day events */}
            {allDayEvents.length > 0 && (
                <Card>
                    <CardContent className="p-2">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mb-1.5 px-1">Cả ngày</p>
                        <div className="space-y-1">
                            {allDayEvents.map(event => (
                                <button
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="w-full text-left"
                                >
                                    <div
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:shadow-sm cursor-pointer"
                                        style={{
                                            backgroundColor: `${event.color}15`,
                                            color: event.color,
                                            borderLeft: `3px solid ${event.color}`
                                        }}
                                    >
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                        <span className="truncate">{event.title}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Time grid */}
            <Card>
                <CardContent className="p-0">
                    <div className="relative overflow-y-auto max-h-[600px]">
                        {isLoading ? (
                            <div className="p-4 space-y-3">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded" />
                                ))}
                            </div>
                        ) : (
                            HOURS.map(hour => {
                                const hourEvents = getEventsAtHour(hour);
                                const isCurrentHour = isToday && hour === currentHour;

                                return (
                                    <div
                                        key={hour}
                                        className={`flex border-b border-gray-100 dark:border-gray-800 min-h-[52px] relative
                                            ${isCurrentHour ? 'bg-red-50/30' : ''}
                                        `}
                                    >
                                        {/* Time label */}
                                        <div className="w-16 flex-shrink-0 p-2 border-r border-gray-200 dark:border-gray-700 flex items-start justify-center">
                                            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums font-medium">
                                                {String(hour).padStart(2, '0')}:00
                                            </span>
                                        </div>

                                        {/* Events area */}
                                        <div className="flex-1 p-1 space-y-1 relative">
                                            {hourEvents.map(event => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => onEventClick(event)}
                                                    className="w-full text-left"
                                                >
                                                    <div
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:shadow-md cursor-pointer"
                                                        style={{
                                                            backgroundColor: `${event.color}15`,
                                                            borderLeft: `4px solid ${event.color}`
                                                        }}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                                                            <div className="flex items-center gap-3 mt-0.5 text-gray-500 dark:text-gray-400">
                                                                {event.start_time && (
                                                                    <span className="flex items-center gap-0.5">
                                                                        <IconClock className="h-3 w-3" />
                                                                        {event.start_time}
                                                                    </span>
                                                                )}
                                                                {event.type === 'ORDER' && (event.details as OrderDetail).event_address && (
                                                                    <span className="flex items-center gap-0.5 truncate">
                                                                        <IconMapPin className="h-3 w-3" />
                                                                        {(event.details as OrderDetail).event_address}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {ORDER_STATUS_MAP[event.status] && (
                                                            <Badge
                                                                variant="secondary"
                                                                className={`text-[9px] flex-shrink-0 ${ORDER_STATUS_MAP[event.status].className}`}
                                                            >
                                                                {ORDER_STATUS_MAP[event.status].label}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}

                                            {/* Current time indicator */}
                                            {isCurrentHour && (
                                                <div
                                                    className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-10"
                                                    style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                                                >
                                                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full -mt-[5px] -ml-[5px]" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
