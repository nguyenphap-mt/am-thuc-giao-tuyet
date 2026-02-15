// HR Timesheet — daily check-in/out + history
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useEmployeeList, useEmployeeStats, type Employee } from '../../lib/hooks/useHR';
import { useAuthStore } from '../../lib/auth-store';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

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

    const renderEmployee = ({ item }: { item: Employee }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                        {item.full_name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName}>{item.full_name}</Text>
                    <Text style={styles.employeePos}>
                        {item.position || 'Nhân viên'} · {item.is_fulltime ? 'Toàn thời gian' : 'Bán thời gian'}
                    </Text>
                </View>
                <View style={[
                    styles.statusDot,
                    { backgroundColor: item.is_active ? Colors.success : Colors.textTertiary }
                ]} />
            </View>
            {item.phone && (
                <Text style={styles.contactText}>📞 {item.phone}</Text>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Stats */}
            {isManager && stats && (
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                        <Text style={[styles.statNumber, { color: Colors.info }]}>
                            {stats.total ?? employees.length}
                        </Text>
                        <Text style={styles.statLabel}>Tổng NV</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                        <Text style={[styles.statNumber, { color: Colors.success }]}>
                            {stats.active ?? employees.filter(e => e.is_active).length}
                        </Text>
                        <Text style={styles.statLabel}>Đang làm</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                        <Text style={[styles.statNumber, { color: Colors.warning }]}>
                            {stats.fulltime ?? employees.filter(e => e.is_fulltime).length}
                        </Text>
                        <Text style={styles.statLabel}>Toàn TG</Text>
                    </View>
                </View>
            )}

            {/* Navigation to Leave */}
            <TouchableOpacity
                style={styles.leaveLink}
                onPress={() => router.push('/hr/leave')}
            >
                <Text style={styles.leaveLinkText}>🏖️ Quản lý nghỉ phép</Text>
                <Text style={styles.leaveLinkArrow}>›</Text>
            </TouchableOpacity>

            <FlatList
                data={employees}
                keyExtractor={(item) => item.id}
                renderItem={renderEmployee}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>👥</Text>
                            <Text style={styles.emptyTitle}>Chưa có nhân viên</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
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
    leaveLinkArrow: { fontSize: FontSize.xl, color: Colors.textTertiary },
    list: { paddingBottom: 100, gap: Spacing.md },
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
    contactText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginLeft: 52 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
});
