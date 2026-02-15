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
    LeaveDetail,
    ShiftDetail,
    HOURS,
    DAYS_OF_WEEK_FULL,
    getDateKey,
    isSameDay,
    getWeekDates,
    parseEventHour,
    getEventShortTitle,
} from './calendar-types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface WeekViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    isLoading: boolean;
    onEventClick: (event: CalendarEvent) => void;
    onDateClick: (date: Date) => void;
}

export function WeekView({ currentDate, events, isLoading, onEventClick, onDateClick }: WeekViewProps) {
    const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

    const today = new Date();
    const currentHour = today.getHours();

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach(e => {
            const dateKey = e.start_date;
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(e);
        });
        return map;
    }, [events]);

    // Separate all-day events from timed events
    const getAllDayEvents = (date: Date) => {
        const key = getDateKey(date);
        return (eventsByDate[key] || []).filter(e => e.all_day);
    };

    const getTimedEvents = (date: Date) => {
        const key = getDateKey(date);
        return (eventsByDate[key] || []).filter(e => !e.all_day);
    };

    const getEventsAtHour = (date: Date, hour: number) => {
        return getTimedEvents(date).filter(e => parseEventHour(e) === hour);
    };

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                {/* Header with dates */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700">
                    <div className="p-2 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                    {weekDates.map((date, i) => {
                        const isToday = isSameDay(date, today);
                        const dateKey = getDateKey(date);
                        const dayEvents = eventsByDate[dateKey] || [];
                        const hasConflict = dayEvents.filter(e => e.type === 'ORDER').length >= 2;

                        return (
                            <button
                                key={i}
                                onClick={() => onDateClick(date)}
                                className={`p-2 border-r border-gray-200 dark:border-gray-700 text-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-900 cursor-pointer
                                    ${isToday ? 'bg-purple-50' : 'bg-gray-50 dark:bg-gray-900'}
                                `}
                            >
                                <p className="text-xs text-gray-500 dark:text-gray-400">{DAYS_OF_WEEK_FULL[date.getDay()]}</p>
                                <p className={`text-lg font-bold tabular-nums ${isToday ? 'text-purple-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {date.getDate()}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">{format(date, 'dd/MM', { locale: vi })}</p>
                                {hasConflict && (
                                    <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-600 px-1 mt-0.5">
                                        ⚠ {dayEvents.filter(e => e.type === 'ORDER').length} đơn
                                    </Badge>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* All-day events row */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 min-h-[36px]">
                    <div className="p-1 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">Cả ngày</span>
                    </div>
                    {weekDates.map((date, i) => {
                        const allDay = getAllDayEvents(date);
                        return (
                            <div key={i} className="p-0.5 border-r border-gray-200 dark:border-gray-700 space-y-0.5">
                                {allDay.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="w-full text-left"
                                    >
                                        <div
                                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium truncate transition-all hover:opacity-80"
                                            style={{ backgroundColor: `${event.color}18`, color: event.color }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                            <span className="truncate">{getEventShortTitle(event)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Time grid */}
                <div className="relative overflow-y-auto max-h-[600px]">
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full rounded" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {HOURS.map(hour => {
                                const isCurrentHour = isSameDay(weekDates[0], today) && hour === currentHour;
                                return (
                                    <div
                                        key={hour}
                                        className={`grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800 min-h-[48px] relative
                                            ${isCurrentHour ? 'bg-red-50/30' : ''}
                                        `}
                                    >
                                        {/* Time label */}
                                        <div className="p-1 border-r border-gray-200 dark:border-gray-700 flex items-start justify-center">
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums font-medium">
                                                {String(hour).padStart(2, '0')}:00
                                            </span>
                                        </div>

                                        {/* Day columns */}
                                        {weekDates.map((date, i) => {
                                            const hourEvents = getEventsAtHour(date, hour);
                                            const isToday = isSameDay(date, today);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`border-r border-gray-100 dark:border-gray-800 p-0.5 relative ${isToday ? 'bg-purple-50/20' : ''}`}
                                                >
                                                    {hourEvents.map(event => (
                                                        <TooltipProvider key={event.id}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={() => onEventClick(event)}
                                                                        className="w-full text-left mb-0.5"
                                                                    >
                                                                        <div
                                                                            className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium truncate transition-all hover:shadow-sm hover:opacity-90 cursor-pointer"
                                                                            style={{
                                                                                backgroundColor: `${event.color}20`,
                                                                                color: event.color,
                                                                                borderLeft: `3px solid ${event.color}`
                                                                            }}
                                                                        >
                                                                            <span className="truncate">
                                                                                {event.start_time && <span className="opacity-70">{event.start_time} </span>}
                                                                                {getEventShortTitle(event)}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="right" className="max-w-[200px]">
                                                                    <p className="text-xs font-semibold">{event.title}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{event.start_time || 'Cả ngày'}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ))}

                                                    {/* Current time indicator */}
                                                    {isToday && hour === currentHour && (
                                                        <div className="absolute left-0 right-0 border-t-2 border-red-500 pointer-events-none z-10"
                                                            style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                                                        >
                                                            <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
