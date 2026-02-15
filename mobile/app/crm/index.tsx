// CRM Customer List — search + quick actions
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCustomerList, useCustomerStats, type Customer } from '../../lib/hooks/useCRM';

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(amount);
}

export default function CRMScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const { data: customers = [], isLoading, refetch } = useCustomerList(search || undefined);
    const { data: stats, refetch: refetchStats } = useCustomerStats();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    const renderItem = ({ item }: { item: Customer }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/crm/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                        {(item.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerType}>
                        {item.customer_type === 'CORPORATE' ? '🏢 Doanh nghiệp' : '👤 Cá nhân'}
                    </Text>
                </View>
                {item.total_revenue ? (
                    <Text style={styles.revenueText}>{formatCurrency(item.total_revenue)}₫</Text>
                ) : null}
            </View>
            <View style={styles.cardActions}>
                {item.phone && (
                    <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); Linking.openURL(`tel:${item.phone}`); }}
                        style={styles.actionChip}
                    >
                        <Text style={styles.actionChipText}>📞 Gọi</Text>
                    </TouchableOpacity>
                )}
                {item.email && (
                    <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); Linking.openURL(`mailto:${item.email}`); }}
                        style={styles.actionChip}
                    >
                        <Text style={styles.actionChipText}>📧 Email</Text>
                    </TouchableOpacity>
                )}
                {item.total_orders != null && (
                    <Text style={styles.orderCount}>{item.total_orders} đơn</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="🔍 Tìm khách hàng..."
                placeholderTextColor={Colors.textTertiary}
                value={search}
                onChangeText={setSearch}
            />

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.statNumber, { color: Colors.info }]}>
                        {stats?.total_customers ?? customers.length}
                    </Text>
                    <Text style={styles.statLabel}>Khách hàng</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.statNumber, { color: Colors.success }]}>
                        {stats?.active_customers ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Hoạt động</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.statNumber, { color: Colors.warning }]}>
                        {stats?.corporate_customers ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Doanh nghiệp</Text>
                </View>
            </View>

            <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🤝</Text>
                            <Text style={styles.emptyTitle}>
                                {search ? 'Không tìm thấy' : 'Chưa có khách hàng'}
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
    searchInput: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
        marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    list: { paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
    customerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    customerType: { fontSize: FontSize.xs, color: Colors.textSecondary },
    revenueText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.success, fontVariant: ['tabular-nums'] },
    cardActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: 56, alignItems: 'center' },
    actionChip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.bgTertiary,
    },
    actionChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    orderCount: { fontSize: FontSize.xs, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
});
