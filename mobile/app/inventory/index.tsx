// Inventory List — Material Design 3
// UX Audit fixes: SafeArea, Skeleton, Debounce, useCallback, Offline, Accessibility
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useInventoryItems, useInventoryStats, type InventoryItem } from '../../lib/hooks/useInventory';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

// Extracted outside component — pure function, no re-creation
function getStockStatus(item: InventoryItem) {
    if (item.current_stock <= 0)
        return { color: Colors.error, label: 'Hết hàng', bg: '#fef2f2', icon: 'error' as keyof typeof MaterialIcons.glyphMap };
    if (item.current_stock <= item.min_stock)
        return { color: Colors.warning, label: 'Sắp hết', bg: '#fff7ed', icon: 'warning' as keyof typeof MaterialIcons.glyphMap };
    return { color: Colors.success, label: 'Đủ hàng', bg: '#f0fdf4', icon: 'check-circle' as keyof typeof MaterialIcons.glyphMap };
}

// Skeleton loader — animated shimmer
function SkeletonList() {
    const fadeAnim = useRef(new Animated.Value(0.3)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        ])).start();
    }, [fadeAnim]);

    const Block = ({ w, h, s }: { w: number | string; h: number; s?: any }) => (
        <Animated.View style={[{ width: w as any, height: h, borderRadius: 4, backgroundColor: Colors.bgTertiary, opacity: fadeAnim }, s]} />
    );

    return (
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            {/* Stats skeleton */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.statCard, { backgroundColor: Colors.bgTertiary + '40' }]}>
                        <Block w={24} h={24} />
                        <Block w={32} h={22} s={{ marginTop: 4 }} />
                        <Block w={48} h={12} s={{ marginTop: 2 }} />
                    </View>
                ))}
            </View>
            {/* Cards skeleton */}
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.card, { padding: Spacing.lg, gap: Spacing.sm }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Block w="55%" h={18} />
                        <Block w={60} h={20} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: 4 }}>
                        <Block w={60} h={14} />
                        <Block w={60} h={14} />
                        <Block w={60} h={14} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function InventoryScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: items = [], isLoading, refetch } = useInventoryItems(debouncedSearch || undefined);
    const { data: stats, refetch: refetchStats } = useInventoryStats();

    // Search debounce (300ms) — M1
    const handleSearchChange = useCallback((text: string) => {
        setSearch(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
    }, []);

    // Cleanup debounce timer
    useEffect(() => {
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    // useCallback for renderItem — H1
    const renderItem = useCallback(({ item }: { item: InventoryItem }) => {
        const stockStatus = getStockStatus(item);

        return (
            <View
                style={styles.card}
                accessibilityLabel={`${item.name}, tồn kho ${item.current_stock} ${item.uom}, ${stockStatus.label}`}
                accessibilityRole="text"
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        {item.sku && (
                            <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                        )}
                    </View>
                    <View style={[styles.stockBadge, { backgroundColor: stockStatus.bg }]}>
                        <MaterialIcons name={stockStatus.icon} size={12} color={stockStatus.color} />
                        <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                            {stockStatus.label}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.stockInfo}>
                        <MaterialIcons name="inventory" size={14} color={Colors.textTertiary} />
                        <Text style={styles.stockLabel}>Tồn kho</Text>
                        <Text style={[styles.stockValue, { color: stockStatus.color }]}>
                            {item.current_stock} {item.uom}
                        </Text>
                    </View>
                    <View style={styles.stockInfo}>
                        <MaterialIcons name="low-priority" size={14} color={Colors.textTertiary} />
                        <Text style={styles.stockLabel}>Tối thiểu</Text>
                        <Text style={styles.stockValueSecondary}>
                            {item.min_stock} {item.uom}
                        </Text>
                    </View>
                    {item.category && (
                        <View style={styles.stockInfo}>
                            <MaterialIcons name="category" size={14} color={Colors.textTertiary} />
                            <Text style={styles.stockLabel}>Nhóm</Text>
                            <Text style={styles.stockValueSecondary}>{item.category}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }, []);

    // useCallback for keyExtractor — H2
    const keyExtractor = useCallback((item: InventoryItem) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ title: 'Kho hàng', headerShown: true }} />
            <OfflineBanner />

            {isLoading && !refreshing ? <SkeletonList /> : (
                <>
                    {/* Search */}
                    <View style={styles.searchContainer}>
                        <MaterialIcons name="search" size={20} color={Colors.textTertiary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm nguyên liệu…"
                            placeholderTextColor={Colors.textTertiary}
                            value={search}
                            onChangeText={handleSearchChange}
                            returnKeyType="search"
                            accessibilityLabel="Tìm kiếm nguyên liệu"
                            accessibilityHint="Nhập tên để lọc danh sách"
                        />
                        {search.length > 0 && (
                            <Pressable
                                onPress={() => { setSearch(''); setDebouncedSearch(''); }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Xóa tìm kiếm"
                            >
                                <MaterialIcons name="close" size={18} color={Colors.textTertiary} />
                            </Pressable>
                        )}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                            accessibilityLabel={`Tổng: ${stats?.total_items ?? 0} nguyên liệu`}
                            accessibilityRole="text">
                            <MaterialIcons name="inventory-2" size={18} color={Colors.info} />
                            <Text style={[styles.statNumber, { color: Colors.info }]}>
                                {stats?.total_items ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Tổng items</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}
                            accessibilityLabel={`Sắp hết: ${stats?.low_stock_count ?? 0} nguyên liệu`}
                            accessibilityRole="text">
                            <MaterialIcons name="warning" size={18} color={Colors.warning} />
                            <Text style={[styles.statNumber, { color: Colors.warning }]}>
                                {stats?.low_stock_count ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Sắp hết</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}
                            accessibilityLabel={`Hết hàng: ${stats?.out_of_stock_count ?? 0} nguyên liệu`}
                            accessibilityRole="text">
                            <MaterialIcons name="error" size={18} color={Colors.error} />
                            <Text style={[styles.statNumber, { color: Colors.error }]}>
                                {stats?.out_of_stock_count ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Hết hàng</Text>
                        </View>
                    </View>

                    <FlatList
                        data={items}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={Colors.primary}
                                colors={[Colors.primary, Colors.primaryDark]}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialIcons name={search ? 'search-off' : 'inventory-2'} size={56} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>
                                    {search ? 'Không tìm thấy' : 'Chưa có nguyên liệu'}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {search ? 'Thử từ khóa khác' : 'Nhấn + để tạo phiếu nhập kho'}
                                </Text>
                            </View>
                        }
                    />
                </>
            )}

            {/* FAB → Transaction screen */}
            <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                onPress={() => { hapticMedium(); router.push('/inventory/transaction'); }}
                accessibilityLabel="Tạo phiếu nhập xuất kho"
                accessibilityRole="button"
                accessibilityHint="Nhấn để tạo phiếu nhập hoặc xuất kho nhanh"
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
            >
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fabGradient}
                >
                    <MaterialIcons name="add" size={28} color={Colors.textInverse} />
                </LinearGradient>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: Spacing.md,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    statCard: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        gap: 2,
    },
    statNumber: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    cardHeaderLeft: {
        flex: 1,
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
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
    stockInfo: {
        gap: 2,
        alignItems: 'center',
    },
    stockLabel: { fontSize: FontSize.xs, color: Colors.textTertiary },
    stockValue: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
    stockValueSecondary: { fontSize: FontSize.sm, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: Spacing.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
