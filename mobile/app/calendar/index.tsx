// Calendar — month view with event dots + event list
// UX Audit fixes: Accessibility, Haptics, Skeleton, SafeArea, Animations, Offline
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCalendarEvents, type CalendarEvent } from '../../lib/hooks/useCalendar';
import { OfflineBanner } from '../../components/OfflineBanner';
import { hapticLight } from '../../lib/haptics';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const ANIMATION_DURATION = 250;

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function formatMonthYear(month: number, year: number): string {
    return `Tháng ${month + 1}/${year}`;
}

// --- Skeleton ---
function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ]),
        ).start();
    }, [shimmer]);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
    return (
        <Animated.View
            style={[{ width: width as any, height, backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.sm, opacity }, style]}
        />
    );
}

const CalendarSkeleton = React.memo(function CalendarSkeleton() {
    return (
        <View style={styles.skeletonGrid}>
            {Array.from({ length: 35 }).map((_, i) => (
                <View key={i} style={styles.skeletonDayCell}>
                    <SkeletonBox width={24} height={24} style={{ borderRadius: 12 }} />
                </View>
            ))}
        </View>
    );
});

// --- Fade-in animation ---
function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(12)).current;
    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }),
            ]).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, [fadeAnim, slideAnim, delay]);
    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {children}
        </Animated.View>
    );
}

// --- Event Card ---
const EventCard = React.memo(function EventCard({
    event,
    onPress,
}: {
    event: CalendarEvent;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
            onPress={() => { hapticLight(); onPress(); }}
            accessibilityLabel={`Sự kiện: ${event.title}${event.customer_name ? `, khách hàng ${event.customer_name}` : ''}`}
            accessibilityRole="button"
            accessibilityHint="Nhấn để xem chi tiết đơn hàng"
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        >
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
            {event.customer_name && (
                <View style={styles.eventMetaRow}>
                    <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                    <Text style={styles.eventMeta} numberOfLines={1}>{event.customer_name}</Text>
                </View>
            )}
            {event.location && (
                <View style={styles.eventMetaRow}>
                    <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                    <Text style={styles.eventMeta} numberOfLines={1}>{event.location}</Text>
                </View>
            )}
            {event.start_time && (
                <View style={styles.eventMetaRow}>
                    <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                    <Text style={styles.eventMeta}>{event.start_time}{event.end_time ? ` — ${event.end_time}` : ''}</Text>
                </View>
            )}
        </Pressable>
    );
});

// --- Main Screen ---
export default function CalendarScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Month transition animation
    const gridOpacity = useRef(new Animated.Value(1)).current;

    const { data: events = [], isLoading, refetch } = useCalendarEvents(
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

    const animateMonthChange = useCallback((changeFn: () => void) => {
        hapticLight();
        Animated.timing(gridOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            changeFn();
            setSelectedDate(null);
            Animated.timing(gridOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
        });
    }, [gridOpacity]);

    const goNextMonth = useCallback(() => {
        animateMonthChange(() => {
            if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(y => y + 1);
            } else {
                setCurrentMonth(m => m + 1);
            }
        });
    }, [currentMonth, animateMonthChange]);

    const goPrevMonth = useCallback(() => {
        animateMonthChange(() => {
            if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(y => y - 1);
            } else {
                setCurrentMonth(m => m - 1);
            }
        });
    }, [currentMonth, animateMonthChange]);

    const handleDateSelect = useCallback((dateStr: string) => {
        hapticLight();
        setSelectedDate(dateStr);
    }, []);

    const handleEventPress = useCallback((orderId: any) => {
        if (orderId) router.push(`/orders/${orderId}`);
    }, [router]);

    const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
    const todayStr = today.toISOString().split('T')[0];

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.primary}
                    colors={[Colors.primary, Colors.primaryDark]}
                    progressViewOffset={insets.top}
                />
            }
        >
            {/* Offline Banner */}
            <OfflineBanner />

            {/* Month Navigation */}
            <View style={styles.monthNav}>
                <Pressable
                    onPress={goPrevMonth}
                    style={styles.navBtn}
                    accessibilityLabel="Tháng trước"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
                >
                    <MaterialIcons name="chevron-left" size={28} color={Colors.primary} />
                </Pressable>
                <Text style={styles.monthTitle}>{formatMonthYear(currentMonth, currentYear)}</Text>
                <Pressable
                    onPress={goNextMonth}
                    style={styles.navBtn}
                    accessibilityLabel="Tháng sau"
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
                >
                    <MaterialIcons name="chevron-right" size={28} color={Colors.primary} />
                </Pressable>
            </View>

            {/* Weekday Header */}
            <View style={styles.weekdayRow}>
                {WEEKDAYS.map(d => (
                    <Text key={d} style={styles.weekdayText}>{d}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            {isLoading && !refreshing ? (
                <CalendarSkeleton />
            ) : (
                <Animated.View style={[styles.calendarGrid, { opacity: gridOpacity }]}>
                    {/* Empty cells before 1st */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <View key={`empty-${i}`} style={styles.dayCell} />
                    ))}
                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasEvents = (eventsByDate[dateStr]?.length ?? 0) > 0;
                        const isToday = dateStr === todayStr;
                        const isSelected = dateStr === selectedDate;

                        return (
                            <Pressable
                                key={day}
                                style={[
                                    styles.dayCell,
                                    isToday && styles.todayCell,
                                    isSelected && styles.selectedCell,
                                ]}
                                onPress={() => handleDateSelect(dateStr)}
                                accessibilityLabel={`Ngày ${day} tháng ${currentMonth + 1}${hasEvents ? ', có sự kiện' : ''}${isToday ? ', hôm nay' : ''}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
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
                            </Pressable>
                        );
                    })}
                </Animated.View>
            )}

            {/* Event List for Selected Date */}
            {selectedDate && (
                <FadeInView>
                    <View style={styles.eventSection}>
                        <View style={styles.eventSectionTitleRow}>
                            <MaterialIcons name="event" size={18} color={Colors.textPrimary} />
                            <Text style={styles.eventSectionTitle}>
                                {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                {' '}({selectedEvents.length} sự kiện)
                            </Text>
                        </View>
                        {selectedEvents.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <MaterialIcons name="event-busy" size={36} color={Colors.textTertiary} />
                                <Text style={styles.noEvents}>Không có sự kiện</Text>
                            </View>
                        ) : (
                            selectedEvents.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onPress={() => handleEventPress(event.order_id)}
                                />
                            ))
                        )}
                    </View>
                </FadeInView>
            )}

            <View style={styles.bottomSpacer} />
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
    navBtn: {
        width: 48, height: 48, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
    },
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
    eventSectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    eventSectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    noEvents: { fontSize: FontSize.md, color: Colors.textSecondary },
    emptyCard: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm,
    },
    eventCard: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.xs,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    eventTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    eventMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
    skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
    skeletonDayCell: {
        width: `${100 / 7}%`, aspectRatio: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    bottomSpacer: { height: 40 },
});
