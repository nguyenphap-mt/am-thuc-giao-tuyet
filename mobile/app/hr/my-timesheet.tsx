// My Timesheet — personal attendance history
// Compliant: SafeAreaView, Skeleton, OfflineBanner, useCallback, a11y
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useTimesheets, useMyTimesheets, useMyEmployee, useEmployeeList, type TimesheetEntry, type Employee } from '../../lib/hooks/useHR';
import { useAuthStore } from '../../lib/auth-store';
import { OfflineBanner } from '../../components/OfflineBanner';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: 'check-circle' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: 'cancel' },
};

function formatTime(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function getMonthRange(offset: number) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + offset;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return {
        label: start.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
}

// Skeleton
function TimesheetListSkeleton() {
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        ])).start();
    }, [fadeAnim]);
    const B = ({ w, h, s }: { w: number | string; h: number; s?: any }) => (
        <Animated.View style={[{ width: w as any, height: h, borderRadius: 4, backgroundColor: Colors.bgTertiary, opacity: fadeAnim }, s]} />
    );
    return (
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            {/* Stats skeleton */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.statCard, { backgroundColor: Colors.bgTertiary }]}>
                        <B w={40} h={24} />
                        <B w={50} h={12} s={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>
            {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <B w="40%" h={14} />
                        <B w={60} h={20} s={{ borderRadius: BorderRadius.sm }} />
                    </View>
                    <B w="60%" h={12} s={{ marginTop: 8 }} />
                    <B w="80%" h={12} s={{ marginTop: 4 }} />
                </View>
            ))}
        </View>
    );
}

export default function MyTimesheetScreen() {
    const { user } = useAuthStore();
    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const [monthOffset, setMonthOffset] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [showEmployeePicker, setShowEmployeePicker] = useState(false);

    const { data: myEmployee } = useMyEmployee(user?.id);
    const { data: employees = [] } = useEmployeeList();

    const month = useMemo(() => getMonthRange(monthOffset), [monthOffset]);

    // Admin viewing another employee → admin endpoint; else → self-service
    const isViewingOther = isManager && !!selectedEmployeeId;

    const selectedEmployeeName = isViewingOther
        ? employees.find(e => e.id === selectedEmployeeId)?.full_name || 'Nhân viên'
        : myEmployee?.full_name || user?.full_name || 'Tôi';

    // Self-service (all roles): /hr/my/timesheets
    const selfQuery = useMyTimesheets(month.startDate, month.endDate);
    // Admin: /hr/timesheets?employee_id=X (requires hr:view)
    const adminQuery = useTimesheets(
        isViewingOther ? selectedEmployeeId! : undefined,
        month.startDate, month.endDate
    );

    const activeQuery = isViewingOther ? adminQuery : selfQuery;
    const timesheets = activeQuery.data || [];
    const isLoading = activeQuery.isLoading;
    const refetch = activeQuery.refetch;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Stats
    const stats = useMemo(() => {
        const totalDays = timesheets.length;
        const totalHours = timesheets.reduce((s, t) => s + t.total_hours, 0);
        const otHours = timesheets.reduce((s, t) => s + t.overtime_hours, 0);
        return { totalDays, totalHours: totalHours.toFixed(1), otHours: otHours.toFixed(1) };
    }, [timesheets]);

    const renderItem = useCallback(({ item }: { item: TimesheetEntry }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        return (
            <View style={styles.card}
                accessibilityLabel={`${formatDateShort(item.work_date)}, ${item.total_hours} giờ, ${status.label}${item.order_code ? `, đơn ${item.order_code}` : ''}`}
                accessibilityRole="text">
                <View style={styles.cardTop}>
                    <Text style={styles.cardDate}>{formatDateShort(item.work_date)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <MaterialIcons name={status.icon} size={12} color={status.text} />
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                <View style={styles.cardRow}>
                    <MaterialIcons name="login" size={14} color={Colors.textSecondary} />
                    <Text style={styles.cardLabel}>Vào: {formatTime(item.actual_start)}</Text>
                    <MaterialIcons name="logout" size={14} color={Colors.textSecondary} style={{ marginLeft: Spacing.lg }} />
                    <Text style={styles.cardLabel}>Ra: {formatTime(item.actual_end)}</Text>
                </View>
                <View style={styles.cardRow}>
                    <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                    <Text style={styles.cardHours}>{item.total_hours.toFixed(1)}h</Text>
                    {item.overtime_hours > 0 ? (
                        <Text style={styles.cardOT}>+{item.overtime_hours.toFixed(1)}h OT</Text>
                    ) : null}
                </View>
                {item.order_code ? (
                    <View style={styles.cardRow}>
                        <MaterialIcons name="receipt-long" size={14} color={Colors.primary} />
                        <Text style={styles.cardOrderCode}>{item.order_code}</Text>
                        {item.customer_name ? <Text style={styles.cardLabel}> · {item.customer_name}</Text> : null}
                    </View>
                ) : null}
            </View>
        );
    }, []);

    const keyExtractor = useCallback((item: TimesheetEntry) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            {/* Month Picker */}
            <View style={styles.monthPicker}>
                <Pressable onPress={() => setMonthOffset(m => m - 1)} style={styles.monthBtn}
                    accessibilityLabel="Tháng trước" accessibilityRole="button">
                    <MaterialIcons name="chevron-left" size={24} color={Colors.textPrimary} />
                </Pressable>
                <Text style={styles.monthLabel}>{month.label}</Text>
                <Pressable onPress={() => setMonthOffset(m => m + 1)} style={styles.monthBtn}
                    accessibilityLabel="Tháng sau" accessibilityRole="button"
                    disabled={monthOffset >= 0}>
                    <MaterialIcons name="chevron-right" size={24} color={monthOffset >= 0 ? Colors.textTertiary : Colors.textPrimary} />
                </Pressable>
            </View>

            {/* Admin: Employee selector */}
            {isManager ? (
                <Pressable style={styles.employeePicker}
                    onPress={() => setShowEmployeePicker(!showEmployeePicker)}
                    accessibilityLabel={`Đang xem: ${selectedEmployeeName}`}
                    accessibilityRole="button"
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                    <MaterialIcons name="person" size={18} color={Colors.primary} />
                    <Text style={styles.employeePickerText}>{selectedEmployeeName}</Text>
                    <MaterialIcons name={showEmployeePicker ? 'expand-less' : 'expand-more'} size={20} color={Colors.textSecondary} />
                </Pressable>
            ) : null}

            {showEmployeePicker && isManager ? (
                <View style={styles.employeeDropdown}>
                    <Pressable style={styles.employeeOption}
                        onPress={() => { setSelectedEmployeeId(null); setShowEmployeePicker(false); }}
                        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                        <Text style={[styles.employeeOptionText, !selectedEmployeeId && styles.employeeOptionActive]}>
                            📌 Tôi ({myEmployee?.full_name || user?.full_name})
                        </Text>
                    </Pressable>
                    {employees.filter(e => e.is_active).map(emp => (
                        <Pressable key={emp.id} style={styles.employeeOption}
                            onPress={() => { setSelectedEmployeeId(emp.id); setShowEmployeePicker(false); }}
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                            <Text style={[styles.employeeOptionText, selectedEmployeeId === emp.id && styles.employeeOptionActive]}>
                                {emp.full_name}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}

            {isLoading && !refreshing ? (
                <TimesheetListSkeleton />
            ) : (
                <FlatList
                    data={timesheets}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListHeaderComponent={
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                                accessibilityLabel={`Tổng ${stats.totalDays} ngày`} accessibilityRole="text">
                                <Text style={[styles.statNumber, { color: Colors.info }]}>{stats.totalDays}</Text>
                                <Text style={styles.statLabel}>Ngày</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                                accessibilityLabel={`Tổng ${stats.totalHours} giờ`} accessibilityRole="text">
                                <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.totalHours}</Text>
                                <Text style={styles.statLabel}>Giờ</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}
                                accessibilityLabel={`Tăng ca ${stats.otHours} giờ`} accessibilityRole="text">
                                <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.otHours}</Text>
                                <Text style={styles.statLabel}>OT</Text>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="event-busy" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Không có dữ liệu chấm công</Text>
                            <Text style={styles.emptyText}>Chưa có bản ghi nào trong tháng này</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    monthPicker: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        backgroundColor: Colors.bgPrimary, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    monthBtn: { padding: Spacing.sm },
    monthLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
    employeePicker: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    employeePickerText: { flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
    employeeDropdown: {
        marginHorizontal: Spacing.lg, backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
        maxHeight: 200, overflow: 'hidden',
    },
    employeeOption: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
    employeeOptionText: { fontSize: FontSize.md, color: Colors.textPrimary },
    employeeOptionActive: { color: Colors.primary, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    list: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.xs,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardDate: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, textTransform: 'capitalize' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    },
    statusText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    cardHours: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    cardOT: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.warning, marginLeft: Spacing.sm },
    cardOrderCode: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
