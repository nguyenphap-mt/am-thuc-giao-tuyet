// Inventory List — search + stock view
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useInventoryItems, useInventoryStats, type InventoryItem } from '../../lib/hooks/useInventory';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function InventoryScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const { data: items = [], isLoading, refetch } = useInventoryItems(search || undefined);
    const { data: stats, refetch: refetchStats } = useInventoryStats();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    const getStockStatus = (item: InventoryItem) => {
        if (item.current_stock <= 0) return { color: Colors.error, label: 'Hết hàng', bg: '#fef2f2' };
        if (item.current_stock <= item.min_stock) return { color: Colors.warning, label: 'Sắp hết', bg: '#fff7ed' };
        return { color: Colors.success, label: 'Đủ hàng', bg: '#f0fdf4' };
    };

    const renderItem = ({ item }: { item: InventoryItem }) => {
        const stockStatus = getStockStatus(item);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        {item.sku && (
                            <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                        )}
                    </View>
                    <View style={[styles.stockBadge, { backgroundColor: stockStatus.bg }]}>
                        <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                            {stockStatus.label}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockLabel}>Tồn kho</Text>
                        <Text style={[styles.stockValue, { color: stockStatus.color }]}>
                            {item.current_stock} {item.uom}
                        </Text>
                    </View>
                    <View style={styles.stockInfo}>
                        <Text style={styles.stockLabel}>Tối thiểu</Text>
                        <Text style={styles.stockValueSecondary}>
                            {item.min_stock} {item.uom}
                        </Text>
                    </View>
                    {item.category && (
                        <View style={styles.stockInfo}>
                            <Text style={styles.stockLabel}>Nhóm</Text>
                            <Text style={styles.stockValueSecondary}>{item.category}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Search */}
            <TextInput
                style={styles.searchInput}
                placeholder="🔍 Tìm nguyên liệu..."
                placeholderTextColor={Colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
            />

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.statNumber, { color: Colors.info }]}>
                        {stats?.total_items ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Tổng items</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.statNumber, { color: Colors.warning }]}>
                        {stats?.low_stock_count ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Sắp hết</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
                    <Text style={[styles.statNumber, { color: Colors.error }]}>
                        {stats?.out_of_stock_count ?? 0}
                    </Text>
                    <Text style={styles.statLabel}>Hết hàng</Text>
                </View>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
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
                            <Text style={styles.emptyIcon}>📦</Text>
                            <Text style={styles.emptyTitle}>
                                {search ? 'Không tìm thấy' : 'Chưa có nguyên liệu'}
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* FAB → Transaction screen */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => router.push('/inventory/transaction')}
            >
                <View style={[styles.fabInner, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.fabIcon}>＋</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
    searchInput: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    statCard: {
        flex: 1,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 2,
        fontWeight: '500',
    },
    list: { paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    itemName: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    itemSku: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        fontVariant: ['tabular-nums'],
    },
    stockBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    stockBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    cardBody: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        gap: Spacing.lg,
    },
    stockInfo: { gap: 2 },
    stockLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },
    stockValue: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
    stockValueSecondary: { fontSize: FontSize.sm, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: Spacing.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabIcon: {
        fontSize: 28,
        color: Colors.textInverse,
        fontWeight: '300',
    },
});
