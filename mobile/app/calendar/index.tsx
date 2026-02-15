// Calendar — month view with event dots + event list
import { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCalendarEvents, type CalendarEvent } from '../../lib/hooks/useCalendar';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function formatMonthYear(month: number, year: number): string {
    return `Tháng ${month + 1}/${year}`;
}

export default function CalendarScreen() {
    const router = useRouter();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const { data: events = [], refetch } = useCalendarEvents(
        String(currentMonth + 1),
        String(currentYear)
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Map events by date
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        for (const event of events) {
            const dateKey = event.date?.split('T')[0];
            if (dateKey) {
                if (!map[dateKey]) map[dateKey] = [];
                map[dateKey].push(event);
            }
        }
        return map;
    }, [events]);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const goNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(y => y + 1);
        } else {
            setCurrentMonth(m => m + 1);
        }
        setSelectedDate(null);
    };

    const goPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(y => y - 1);
        } else {
            setCurrentMonth(m => m - 1);
        }
        setSelectedDate(null);
    };

    const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
    const todayStr = today.toISOString().split('T')[0];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <TouchableOpacity onPress={goPrevMonth} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{formatMonthYear(currentMonth, currentYear)}</Text>
                <TouchableOpacity onPress={goNextMonth} style={styles.navBtn}>
                    <Text style={styles.navBtnText}>›</Text>
                </TouchableOpacity>
            </View>

            {/* Weekday Header */}
            <View style={styles.weekdayRow}>
                {WEEKDAYS.map(d => (
                    <Text key={d} style={styles.weekdayText}>{d}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {/* Empty cells before 1st */}
                {Array.from({ length: firstDay }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCell} />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasEvents = eventsByDate[dateStr]?.length > 0;
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDate;

                    return (
                        <TouchableOpacity
                            key={day}
                            style={[
                                styles.dayCell,
                                isToday && styles.todayCell,
                                isSelected && styles.selectedCell,
                            ]}
                            onPress={() => setSelectedDate(dateStr)}
                        >
                            <Text style={[
                                styles.dayText,
                                isToday && styles.todayText,
                                isSelected && styles.selectedText,
                            ]}>
                                {day}
                            </Text>
                            {hasEvents && (
                                <View style={[
                                    styles.eventDot,
                                    isSelected && { backgroundColor: Colors.textInverse }
                                ]} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Event List for Selected Date */}
            {selectedDate && (
                <View style={styles.eventSection}>
                    <Text style={styles.eventSectionTitle}>
                        📅 {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                        {' '}({selectedEvents.length} sự kiện)
                    </Text>
                    {selectedEvents.length === 0 ? (
                        <Text style={styles.noEvents}>Không có sự kiện</Text>
                    ) : (
                        selectedEvents.map(event => (
                            <TouchableOpacity
                                key={event.id}
                                style={styles.eventCard}
                                onPress={() => event.order_id && router.push(`/orders/${event.order_id}`)}
                            >
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                {event.customer_name && (
                                    <Text style={styles.eventMeta}>👤 {event.customer_name}</Text>
                                )}
                                {event.location && (
                                    <Text style={styles.eventMeta}>📍 {event.location}</Text>
                                )}
                                {event.start_time && (
                                    <Text style={styles.eventMeta}>🕐 {event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</Text>
                                )}
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    monthNav: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    navBtn: { padding: Spacing.md },
    navBtnText: { fontSize: 28, color: Colors.primary, fontWeight: '300' },
    monthTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
    weekdayRow: { flexDirection: 'row' },
    weekdayText: {
        flex: 1, textAlign: 'center', fontSize: FontSize.xs,
        fontWeight: '600', color: Colors.textSecondary, paddingVertical: Spacing.sm,
    },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
        width: `${100 / 7}%`, aspectRatio: 1,
        alignItems: 'center', justifyContent: 'center',
        borderRadius: BorderRadius.md,
    },
    todayCell: { backgroundColor: Colors.primary + '18' },
    selectedCell: { backgroundColor: Colors.primary },
    dayText: { fontSize: FontSize.md, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    todayText: { fontWeight: '700', color: Colors.primary },
    selectedText: { color: Colors.textInverse, fontWeight: '700' },
    eventDot: {
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: Colors.primary, marginTop: 2,
    },
    eventSection: { gap: Spacing.sm },
    eventSectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    noEvents: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
    eventCard: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.xs,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    eventTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    eventMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
