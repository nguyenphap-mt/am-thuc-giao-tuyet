// HR Timesheet — employee list + stats
// UX Audit fixes: SafeArea, Skeleton, Offline, useCallback, a11y, extracted styles
import { useState, useCallback, useRef, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useEmployeeList, useEmployeeStats, type Employee } from '../../lib/hooks/useHR';
import { useAuthStore } from '../../lib/auth-store';
import { OfflineBanner } from '../../components/OfflineBanner';
import { hapticLight } from '../../lib/haptics';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

// Stat card colors — extracted from inline
const STAT_COLORS = {
    total: { bg: '#eff6ff', text: Colors.info },
    active: { bg: '#f0fdf4', text: Colors.success },
    fulltime: { bg: '#fff7ed', text: Colors.warning },
};

// Skeleton loader
function TimesheetSkeleton() {
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
                        <B w={40} h={28} />
                        <B w={50} h={12} s={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>
            {/* Leave link skeleton */}
            <B w="100%" h={52} s={{ borderRadius: BorderRadius.lg }} />
            {/* Employee card skeletons */}
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.card, { gap: Spacing.sm }]}>
                    <View style={styles.cardHeader}>
                        <B w={40} h={40} s={{ borderRadius: 20 }} />
                        <View style={styles.cardFlex}>
                            <B w="60%" h={16} />
                            <B w="80%" h={12} s={{ marginTop: 4 }} />
                        </View>
                        <B w={10} h={10} s={{ borderRadius: 5 }} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function TimesheetScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);

    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const { data: employees = [], isLoading, refetch } = useEmployeeList();
    const { data: stats, refetch: refetchStats } = useEmployeeStats();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    const renderEmployee = useCallback(({ item }: { item: Employee }) => {
        const initials = item.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
        const statusLabel = item.is_active ? 'đang làm' : 'nghỉ việc';
        const timeLabel = item.is_fulltime ? 'Toàn thời gian' : 'Bán thời gian';

        return (
            <View style={styles.card}
                accessibilityLabel={`${item.full_name}, ${item.position || 'Nhân viên'}, ${timeLabel}, ${statusLabel}`}
                accessibilityRole="text">
                <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.cardFlex}>
                        <Text style={styles.employeeName}>{item.full_name}</Text>
                        <Text style={styles.employeePos}>
                            {item.position || 'Nhân viên'} · {timeLabel}
                        </Text>
                    </View>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: item.is_active ? Colors.success : Colors.textTertiary }
                    ]}
                        accessibilityLabel={statusLabel}
                    />
                </View>
                {item.phone ? (
                    <View style={styles.contactRow}>
                        <MaterialIcons name="phone" size={14} color={Colors.textSecondary} />
                        <Text style={styles.contactText}>{item.phone}</Text>
                    </View>
                ) : null}
            </View>
        );
    }, []);

    const keyExtractor = useCallback((item: Employee) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            {isLoading && !refreshing ? (
                <TimesheetSkeleton />
            ) : (
                <FlatList
                    data={employees}
                    keyExtractor={keyExtractor}
                    renderItem={renderEmployee}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primary}
                        />
                    }
                    ListHeaderComponent={
                        <>
                            {/* Stats */}
                            {isManager && stats ? (
                                <View style={styles.statsRow}>
                                    <View style={[styles.statCard, { backgroundColor: STAT_COLORS.total.bg }]}
                                        accessibilityLabel={`Tổng nhân viên: ${stats.total ?? employees.length}`}
                                        accessibilityRole="text">
                                        <Text style={[styles.statNumber, { color: STAT_COLORS.total.text }]}>
                                            {stats.total ?? employees.length}
                                        </Text>
                                        <Text style={styles.statLabel}>Tổng NV</Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: STAT_COLORS.active.bg }]}
                                        accessibilityLabel={`Đang làm: ${stats.active ?? employees.filter(e => e.is_active).length}`}
                                        accessibilityRole="text">
                                        <Text style={[styles.statNumber, { color: STAT_COLORS.active.text }]}>
                                            {stats.active ?? employees.filter(e => e.is_active).length}
                                        </Text>
                                        <Text style={styles.statLabel}>Đang làm</Text>
                                    </View>
                                    <View style={[styles.statCard, { backgroundColor: STAT_COLORS.fulltime.bg }]}
                                        accessibilityLabel={`Toàn thời gian: ${stats.fulltime ?? employees.filter(e => e.is_fulltime).length}`}
                                        accessibilityRole="text">
                                        <Text style={[styles.statNumber, { color: STAT_COLORS.fulltime.text }]}>
                                            {stats.fulltime ?? employees.filter(e => e.is_fulltime).length}
                                        </Text>
                                        <Text style={styles.statLabel}>Toàn TG</Text>
                                    </View>
                                </View>
                            ) : null}

                            {/* Navigation to Leave */}
                            <Pressable
                                style={styles.leaveLink}
                                onPress={() => { hapticLight(); router.push('/hr/leave'); }}
                                accessibilityLabel="Quản lý nghỉ phép"
                                accessibilityRole="button"
                                accessibilityHint="Mở danh sách đơn nghỉ phép"
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            >
                                <View style={styles.leaveLinkRow}>
                                    <MaterialIcons name="beach-access" size={18} color={Colors.primary} />
                                    <Text style={styles.leaveLinkText}>Quản lý nghỉ phép</Text>
                                </View>
                                <MaterialIcons name="chevron-right" size={22} color={Colors.textTertiary} />
                            </Pressable>
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="people" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Chưa có nhân viên</Text>
                            <Text style={styles.emptyText}>Nhân viên sẽ xuất hiện khi được thêm vào hệ thống</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    leaveLink: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    leaveLinkText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
    list: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    cardFlex: { flex: 1 },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.bgTertiary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
    employeeName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    employeePos: { fontSize: FontSize.xs, color: Colors.textSecondary },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 52 },
    contactText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    leaveLinkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
