'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { formatCurrency } from '@/lib/utils';
import {
    IconChevronLeft,
    IconChevronRight,
    IconCalendar,
    IconMapPin,
    IconPhone,
    IconUser,
    IconClock,
    IconChevronRight as IconChevronNav,
    IconFilter,
    IconCalendarEvent,
    IconUserOff,
    IconBriefcase,
    IconLayoutGrid,
    IconLayoutList,
    IconCalendarTime,
    IconPrinter,
    IconAlertTriangle,
    IconPlus,
    IconUsers,
} from '@tabler/icons-react';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import './print-styles.css';

import {
    CalendarEvent,
    CalendarStats,
    OrderDetail,
    LeaveDetail,
    ShiftDetail,
    ViewMode,
    EventFilter,
    DAYS_OF_WEEK,
    MONTHS,
    FILTER_OPTIONS,
    ORDER_STATUS_MAP,
    getEventShortTitle,
    getDateKey,
    isSameDay,
    getWeekDates,
} from './calendar-types';

import { WeekView } from './week-view';
import { DayView } from './day-view';
import { StaffAvailability } from './staff-availability';

// ─────────────────────────────────────────────
// View Mode Config
// ─────────────────────────────────────────────
const VIEW_MODES: { value: ViewMode; label: string; icon: React.ReactNode }[] = [
    { value: 'month', label: 'Tháng', icon: <IconLayoutGrid className="h-3.5 w-3.5" /> },
    { value: 'week', label: 'Tuần', icon: <IconCalendarTime className="h-3.5 w-3.5" /> },
    { value: 'day', label: 'Ngày', icon: <IconLayoutList className="h-3.5 w-3.5" /> },
];

// ─────────────────────────────────────────────
// Main Calendar Page
// ─────────────────────────────────────────────
export default function CalendarPage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filter, setFilter] = useState<EventFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedDateForStaff, setSelectedDateForStaff] = useState<Date | null>(null);
    const [showStaffPanel, setShowStaffPanel] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate date range for API based on view mode
    const { fromDate, toDate } = useMemo(() => {
        if (viewMode === 'week') {
            const weekDates = getWeekDates(currentDate);
            const first = weekDates[0];
            const last = weekDates[6];
            return {
                fromDate: getDateKey(first),
                toDate: getDateKey(last),
            };
        }
        if (viewMode === 'day') {
            const key = getDateKey(currentDate);
            return { fromDate: key, toDate: key };
        }
        // Month view
        return {
            fromDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
            toDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
        };
    }, [viewMode, currentDate, year, month, daysInMonth]);

    // Fetch events
    const { data: eventsData, isLoading } = useQuery({
        queryKey: ['calendar-events', fromDate, toDate, filter],
        queryFn: () => api.get<{ events: CalendarEvent[]; total: number }>(
            `/calendar/events?from_date=${fromDate}&to_date=${toDate}&event_types=${filter}`
        ),
    });

    // Fetch stats (always monthly)
    const { data: stats } = useQuery({
        queryKey: ['calendar-stats', month + 1, year],
        queryFn: () => api.get<CalendarStats>(
            `/calendar/stats?month=${month + 1}&year=${year}`
        ),
    });

    const events = eventsData?.events || [];

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

    // Calendar grid (month view)
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    // Navigation
    const navigatePrev = () => {
        if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1));
        else if (viewMode === 'week') setCurrentDate(prev => subWeeks(prev, 1));
        else setCurrentDate(prev => subDays(prev, 1));
    };

    const navigateNext = () => {
        if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1));
        else if (viewMode === 'week') setCurrentDate(prev => addWeeks(prev, 1));
        else setCurrentDate(prev => addDays(prev, 1));
    };

    const goToToday = () => setCurrentDate(new Date());
    const today = new Date();
    const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const getDateKeyForDay = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const handleEventClick = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setDrawerOpen(true);
    }, []);

    const handleNavigateToOrder = useCallback((orderId: string) => {
        setDrawerOpen(false);
        router.push(`/orders/${orderId}`);
    }, [router]);

    const handleDateClick = useCallback((date: Date) => {
        setSelectedDateForStaff(date);
        setShowStaffPanel(true);
    }, []);

    const handleDayClickForView = useCallback((date: Date) => {
        setCurrentDate(date);
        setViewMode('day');
    }, []);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleQuickCreate = useCallback(() => {
        const dateStr = getDateKey(currentDate);
        router.push(`/orders/create?event_date=${dateStr}`);
    }, [currentDate, router]);

    // Title based on view mode
    const viewTitle = useMemo(() => {
        if (viewMode === 'month') return `${MONTHS[month]} ${year}`;
        if (viewMode === 'week') {
            const weekDates = getWeekDates(currentDate);
            const first = weekDates[0];
            const last = weekDates[6];
            return `${format(first, 'dd/MM', { locale: vi })} — ${format(last, 'dd/MM/yyyy', { locale: vi })}`;
        }
        return format(currentDate, 'EEEE, dd MMMM yyyy', { locale: vi });
    }, [viewMode, currentDate, month, year]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Lịch sự kiện</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý lịch tiệc, nghỉ phép và phân công nhân viên</p>
                </div>
                <div className="flex items-center gap-2" data-print="hide">
                    {/* Quick Create */}
                    <Button
                        size="sm"
                        onClick={handleQuickCreate}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:opacity-90 text-xs"
                    >
                        <IconPlus className="h-3.5 w-3.5 mr-1" />
                        Tạo đơn hàng
                    </Button>
                    {/* Staff Panel Toggle */}
                    <Button
                        variant={showStaffPanel ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowStaffPanel(!showStaffPanel)}
                        className={`text-xs ${showStaffPanel ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                    >
                        <IconUsers className="h-3.5 w-3.5 mr-1" />
                        Nhân sự
                    </Button>
                    {/* Print */}
                    <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs">
                        <IconPrinter className="h-3.5 w-3.5 mr-1" />
                        In
                    </Button>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 stats-grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <StatCard
                    label="Tổng đơn hàng"
                    value={stats?.total_orders ?? 0}
                    color="text-gray-900 dark:text-gray-100"
                    bg="bg-white"
                    loading={!stats}
                />
                <StatCard
                    label="Chờ xác nhận"
                    value={stats?.pending_count ?? 0}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    loading={!stats}
                />
                <StatCard
                    label="Đã xác nhận"
                    value={stats?.confirmed_count ?? 0}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    loading={!stats}
                />
                <StatCard
                    label="Doanh thu tháng"
                    value={formatCurrency(stats?.total_revenue ?? 0)}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    loading={!stats}
                    isText
                />
            </motion.div>

            {/* Toolbar: Filter + View Toggle */}
            <motion.div
                className="flex items-center justify-between gap-3 flex-wrap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                data-print="hide"
            >
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    <IconFilter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    {FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setFilter(opt.value)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === opt.value
                                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-700'
                                }`}
                        >
                            {opt.label}
                            {filter === opt.value && events.length > 0 && (
                                <span className="bg-white/20 rounded-full px-1.5 text-[10px]">{events.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                    {VIEW_MODES.map(mode => (
                        <button
                            key={mode.value}
                            onClick={() => setViewMode(mode.value)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === mode.value
                                ? 'bg-white text-gray-900 dark:text-gray-100 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-300 dark:text-gray-600'
                                }`}
                        >
                            {mode.icon}
                            {mode.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <div className={`${showStaffPanel ? 'grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4' : ''}`}>
                    {/* Calendar View */}
                    <div>
                        {/* Navigation Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={navigatePrev} className="h-8 w-8">
                                    <IconChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs text-purple-600 hover:text-purple-700">
                                    Hôm nay
                                </Button>
                            </div>
                            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">{viewTitle}</h2>
                            <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8">
                                <IconChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* View Modes */}
                        <AnimatePresence mode="wait">
                            {viewMode === 'month' && (
                                <motion.div
                                    key="month"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <MonthView
                                        days={days}
                                        eventsByDate={eventsByDate}
                                        isLoading={isLoading}
                                        isToday={isToday}
                                        getDateKey={getDateKeyForDay}
                                        onEventClick={handleEventClick}
                                        onDateClick={handleDateClick}
                                        onDayDoubleClick={handleDayClickForView}
                                    />
                                </motion.div>
                            )}
                            {viewMode === 'week' && (
                                <motion.div
                                    key="week"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <WeekView
                                        currentDate={currentDate}
                                        events={events}
                                        isLoading={isLoading}
                                        onEventClick={handleEventClick}
                                        onDateClick={handleDateClick}
                                    />
                                </motion.div>
                            )}
                            {viewMode === 'day' && (
                                <motion.div
                                    key="day"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <DayView
                                        currentDate={currentDate}
                                        events={events}
                                        isLoading={isLoading}
                                        onEventClick={handleEventClick}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Staff Availability Panel */}
                    {showStaffPanel && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="hidden lg:block"
                            data-print="hide"
                        >
                            <StaffAvailability selectedDate={selectedDateForStaff || currentDate} />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Event Type Legend */}
            <motion.div
                className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 calendar-event-dot" />
                    Đơn hàng
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 calendar-event-dot" />
                    Nghỉ phép
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 calendar-event-dot" />
                    Ca làm
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 calendar-event-dot" />
                    Chờ xác nhận
                </div>
            </motion.div>

            {/* Event Detail Drawer */}
            <EventDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                event={selectedEvent}
                onNavigateToOrder={handleNavigateToOrder}
            />
        </div>
    );
}


// ─────────────────────────────────────────────
// Month View (extracted)
// ─────────────────────────────────────────────
function MonthView({
    days,
    eventsByDate,
    isLoading,
    isToday,
    getDateKey,
    onEventClick,
    onDateClick,
    onDayDoubleClick,
}: {
    days: (number | null)[];
    eventsByDate: Record<string, CalendarEvent[]>;
    isLoading: boolean;
    isToday: (day: number) => boolean;
    getDateKey: (day: number) => string;
    onEventClick: (event: CalendarEvent) => void;
    onDateClick: (date: Date) => void;
    onDayDoubleClick: (date: Date) => void;
}) {
    return (
        <Card className="calendar-card">
            <CardContent className="p-2 md:p-4">
                {/* Days header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_OF_WEEK.map((day) => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1.5 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 calendar-grid">
                    {days.map((day, i) => {
                        const dateKey = day ? getDateKey(day) : '';
                        const dayEvents = day ? (eventsByDate[dateKey] || []) : [];
                        const hasEvents = dayEvents.length > 0;
                        const isTodayCell = day ? isToday(day) : false;
                        const orderCount = dayEvents.filter(e => e.type === 'ORDER').length;
                        const hasConflict = orderCount >= 2;

                        return (
                            <div
                                key={i}
                                className={`
                                    min-h-[60px] md:min-h-[90px] p-1 md:p-1.5 border rounded-lg transition-all relative
                                    ${day ? 'hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 hover:shadow-sm cursor-pointer' : 'bg-gray-50 dark:bg-gray-900/30'}
                                    ${isTodayCell ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200' : 'border-gray-200 dark:border-gray-700'}
                                    ${hasConflict ? 'border-orange-300 ring-1 ring-orange-100' : ''}
                                `}
                                onClick={() => day && onDateClick(new Date(parseInt(dateKey.split('-')[0]), parseInt(dateKey.split('-')[1]) - 1, day))}
                                onDoubleClick={() => day && onDayDoubleClick(new Date(parseInt(dateKey.split('-')[0]), parseInt(dateKey.split('-')[1]) - 1, day))}
                            >
                                {day && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-semibold tabular-nums ${isTodayCell ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {day}
                                            </span>
                                            {hasConflict && (
                                                <span className="text-[8px] text-orange-500 font-medium flex items-center gap-0.5">
                                                    <IconAlertTriangle className="h-2.5 w-2.5" />
                                                    {orderCount}
                                                </span>
                                            )}
                                        </div>
                                        {/* Event badges */}
                                        <div className="mt-0.5 space-y-0.5 overflow-hidden">
                                            {isLoading ? (
                                                <Skeleton className="h-3 w-full rounded" />
                                            ) : (
                                                <>
                                                    {dayEvents.slice(0, 3).map((event) => (
                                                        <button
                                                            key={event.id}
                                                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                                            className="w-full text-left"
                                                        >
                                                            <div
                                                                className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] md:text-[11px] font-medium truncate transition-all hover:opacity-80"
                                                                style={{ backgroundColor: `${event.color}18`, color: event.color }}
                                                                data-event-type={event.type}
                                                            >
                                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 calendar-event-dot" style={{ backgroundColor: event.color }} />
                                                                <span className="truncate">{getEventShortTitle(event)}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 pl-1 font-medium">
                                                            +{dayEvents.length - 3} khác
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}


// ─────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────
function StatCard({ label, value, color, bg, loading, isText }: {
    label: string;
    value: number | string;
    color: string;
    bg: string;
    loading: boolean;
    isText?: boolean;
}) {
    return (
        <Card className={`${bg} border-0 shadow-sm`}>
            <CardContent className="p-3 md:p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                {loading ? (
                    <Skeleton className="h-6 w-16" />
                ) : (
                    <p className={`text-lg md:text-xl font-bold ${color} tabular-nums`}>
                        {value}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}


// ─────────────────────────────────────────────
// Event Detail Drawer
// ─────────────────────────────────────────────
function EventDetailDrawer({
    open,
    onOpenChange,
    event,
    onNavigateToOrder,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event: CalendarEvent | null;
    onNavigateToOrder: (orderId: string) => void;
}) {
    if (!event) return null;

    const isOrder = event.type === 'ORDER';
    const isLeave = event.type === 'LEAVE';
    const isShift = event.type === 'SHIFT';

    const statusInfo = ORDER_STATUS_MAP[event.status];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color }}
                        />
                        <SheetTitle className="text-base">{event.title}</SheetTitle>
                    </div>
                    <SheetDescription className="sr-only">Chi tiết sự kiện</SheetDescription>
                </SheetHeader>

                <div className="space-y-4">
                    {/* Event Type Badge */}
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${event.color}18`, color: event.color }}
                        >
                            {event.type === 'ORDER' ? 'Đơn hàng' : event.type === 'LEAVE' ? 'Nghỉ phép' : 'Ca làm'}
                        </Badge>
                        {statusInfo && (
                            <Badge variant="secondary" className={`text-xs ${statusInfo.className}`}>
                                {statusInfo.label}
                            </Badge>
                        )}
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <IconCalendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>
                            {event.start_date ? format(parseISO(event.start_date), 'dd/MM/yyyy', { locale: vi }) : '—'}
                            {event.start_time && ` • ${event.start_time}`}
                        </span>
                    </div>

                    {/* ─── ORDER DETAILS ─── */}
                    {isOrder && (() => {
                        const d = event.details as OrderDetail;
                        return (
                            <div className="space-y-3">
                                <div className="border-t border-gray-200 dark:border-gray-700" />

                                {/* Customer */}
                                <div className="flex items-center gap-2 text-sm">
                                    <IconUser className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{d.customer_name || 'N/A'}</span>
                                </div>
                                {d.customer_phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <IconPhone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>{d.customer_phone}</span>
                                    </div>
                                )}
                                {d.event_address && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <IconMapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>{d.event_address}</span>
                                    </div>
                                )}
                                {d.event_type && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <IconCalendarEvent className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>{d.event_type}</span>
                                    </div>
                                )}

                                {/* Financial Summary */}
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Tổng tiền</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatCurrency(d.final_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Đã thu</p>
                                        <p className="text-sm font-bold text-emerald-600 tabular-nums">{formatCurrency(d.paid_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Còn nợ</p>
                                        <p className={`text-sm font-bold tabular-nums ${d.balance_amount > 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                            {formatCurrency(d.balance_amount)}
                                        </p>
                                    </div>
                                </div>

                                {/* Navigate to Order */}
                                <button
                                    onClick={() => onNavigateToOrder(d.order_id)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 hover:bg-blue-50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-200 transition-colors group"
                                >
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700">
                                        Xem chi tiết đơn hàng {d.order_code}
                                    </span>
                                    <IconChevronNav className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                                </button>
                            </div>
                        );
                    })()}

                    {/* ─── LEAVE DETAILS ─── */}
                    {isLeave && (() => {
                        const d = event.details as LeaveDetail;
                        return (
                            <div className="space-y-3">
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                <div className="flex items-center gap-2 text-sm">
                                    <IconUser className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{d.employee_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <IconUserOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <span>{d.leave_type} • {d.total_days} ngày</span>
                                </div>
                                {d.reason && (
                                    <div className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-400">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lý do:</p>
                                        {d.reason}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* ─── SHIFT DETAILS ─── */}
                    {isShift && (() => {
                        const d = event.details as ShiftDetail;
                        return (
                            <div className="space-y-3">
                                <div className="border-t border-gray-200 dark:border-gray-700" />
                                <div className="flex items-center gap-2 text-sm">
                                    <IconUser className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{d.employee_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <IconBriefcase className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <span>Vai trò: {d.role || 'Chưa phân công'}</span>
                                </div>
                                {d.event_address && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <IconMapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        <span>{d.event_address}</span>
                                    </div>
                                )}

                                {/* Navigate to Order */}
                                <button
                                    onClick={() => onNavigateToOrder(d.order_id)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 hover:bg-blue-50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-200 transition-colors group"
                                >
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700">
                                        Xem đơn hàng {d.order_code}
                                    </span>
                                    <IconChevronNav className="h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-500" />
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </SheetContent>
        </Sheet>
    );
}
