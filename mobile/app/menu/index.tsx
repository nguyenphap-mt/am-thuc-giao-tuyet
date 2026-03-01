// Menu Item List — Material Design 3
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, Pressable, TextInput,
    StyleSheet, RefreshControl, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useMenuItems, useMenuCategories, useMenuStats,
    useToggleMenuItemActive, type MenuItem,
} from '../../lib/hooks/useMenuItems';
import { hapticLight, hapticMedium, hapticWarning } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';
import { useAuthStore } from '../../lib/auth-store';

function formatCurrency(amount: number | undefined): string {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

export default function MenuListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
    const [refreshing, setRefreshing] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: items = [], isLoading, refetch } = useMenuItems(debouncedSearch, selectedCategory);
    const { data: categories = [] } = useMenuCategories();
    const { data: stats } = useMenuStats();
    const toggleActive = useToggleMenuItemActive();

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';

    // Search debounce
    const handleSearchChange = useCallback((text: string) => {
        setSearch(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
    }, []);

    useEffect(() => {
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleToggleActive = useCallback((item: MenuItem) => {
        hapticWarning();
        toggleActive.mutate(item.id);
    }, [toggleActive]);

    const renderItem = useCallback(({ item }: { item: MenuItem }) => (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
            onPress={() => { hapticLight(); router.push(`/menu/${item.id}`); }}
            accessibilityLabel={`${item.name}, ${item.category_name || 'Chưa phân loại'}, giá ${formatCurrency(item.selling_price)}, ${item.is_active ? 'đang bán' : 'tạm ngưng'}`}
            accessibilityRole="button"
            accessibilityHint="Nhấn để xem chi tiết món ăn"
            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        >
            <View style={styles.cardLeft}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.activeBadge, { backgroundColor: item.is_active ? Colors.success + '18' : Colors.textTertiary + '18' }]}>
                        <View style={[styles.activeDot, { backgroundColor: item.is_active ? Colors.success : Colors.textTertiary }]} />
                        <Text style={[styles.activeText, { color: item.is_active ? Colors.success : Colors.textTertiary }]}>
                            {item.is_active ? 'Đang bán' : 'Tạm ngưng'}
                        </Text>
                    </View>
                </View>
                {item.category_name && (
                    <Text style={styles.cardCategory}>{item.category_name}</Text>
                )}
                <View style={styles.priceRow}>
                    <Text style={styles.cardPrice}>{formatCurrency(item.selling_price)}</Text>
                    {item.cost_price != null && item.cost_price > 0 && (
                        <Text style={styles.cardCost}>
                            Giá vốn: {formatCurrency(item.cost_price)}
                        </Text>
                    )}
                </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
        </Pressable>
    ), [router]);

    const keyExtractor = useCallback((item: MenuItem) => item.id, []);

    // Skeleton loader
    const SkeletonList = () => (
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[styles.card, { opacity: 0.5 }]}>
                    <View style={styles.cardLeft}>
                        <View style={{ width: '60%', height: 18, backgroundColor: Colors.bgTertiary, borderRadius: 4 }} />
                        <View style={{ width: '30%', height: 14, backgroundColor: Colors.bgTertiary, borderRadius: 4, marginTop: 6 }} />
                        <View style={{ width: '40%', height: 16, backgroundColor: Colors.bgTertiary, borderRadius: 4, marginTop: 6 }} />
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ title: 'Thực đơn', headerShown: true }} />
            <OfflineBanner />

            {/* Stats Row */}
            {stats && (
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                        accessibilityLabel={`Tổng: ${stats.total_items} món`} accessibilityRole="text">
                        <MaterialIcons name="restaurant-menu" size={18} color={Colors.info} />
                        <Text style={[styles.statNumber, { color: Colors.info }]}>{stats.total_items}</Text>
                        <Text style={styles.statLabel}>Tổng món</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                        accessibilityLabel={`Đang bán: ${stats.active_items} món`} accessibilityRole="text">
                        <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                        <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.active_items}</Text>
                        <Text style={styles.statLabel}>Đang bán</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}
                        accessibilityLabel={`${stats.total_categories} danh mục`} accessibilityRole="text">
                        <MaterialIcons name="category" size={18} color={Colors.warning} />
                        <Text style={[styles.statNumber, { color: Colors.warning }]}>{stats.total_categories}</Text>
                        <Text style={styles.statLabel}>Danh mục</Text>
                    </View>
                </View>
            )}

            {/* Search */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={Colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={handleSearchChange}
                    placeholder="Tìm món ăn…"
                    placeholderTextColor={Colors.textTertiary}
                    accessibilityLabel="Tìm kiếm món ăn"
                    accessibilityHint="Nhập tên món để lọc"
                />
                {search.length > 0 && (
                    <Pressable onPress={() => { setSearch(''); setDebouncedSearch(''); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Xóa tìm kiếm">
                        <MaterialIcons name="close" size={18} color={Colors.textTertiary} />
                    </Pressable>
                )}
            </View>

            {/* Category Chips */}
            {categories.length > 0 && (
                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipScroll}
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable
                        style={({ pressed }) => [styles.chip, !selectedCategory && styles.chipActive, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticLight(); setSelectedCategory(undefined); }}
                        accessibilityLabel="Tất cả danh mục"
                        accessibilityState={{ selected: !selectedCategory }}
                        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                    >
                        <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>Tất cả</Text>
                    </Pressable>
                    {categories.map((cat) => (
                        <Pressable
                            key={cat.id}
                            style={({ pressed }) => [styles.chip, selectedCategory === cat.id && styles.chipActive, pressed && { opacity: 0.7 }]}
                            onPress={() => { hapticLight(); setSelectedCategory(selectedCategory === cat.id ? undefined : cat.id); }}
                            accessibilityLabel={`Danh mục ${cat.name}`}
                            accessibilityState={{ selected: selectedCategory === cat.id }}
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>{cat.name}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            )}

            {/* List */}
            {isLoading && !refreshing ? <SkeletonList /> : (
                <FlatList
                    data={items}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing} onRefresh={onRefresh}
                            tintColor={Colors.primary} colors={[Colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name={search ? 'search-off' : 'restaurant-menu'} size={56} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>
                                {search ? 'Không tìm thấy món ăn' : 'Chưa có thực đơn'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {search ? 'Thử từ khóa khác hoặc bỏ lọc danh mục' : 'Nhấn + để thêm món ăn mới'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB — Add Menu Item (Manager only) */}
            {isManager && (
                <Pressable
                    style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
                    onPress={() => { hapticMedium(); router.push('/menu/create'); }}
                    accessibilityLabel="Thêm món ăn mới"
                    accessibilityRole="button"
                    accessibilityHint="Nhấn để tạo món ăn mới"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <MaterialIcons name="add" size={28} color={Colors.textInverse} />
                </Pressable>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    statsRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    },
    statCard: {
        flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md,
        alignItems: 'center', gap: 2,
    },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.lg, marginTop: Spacing.md,
        paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    },
    searchIcon: { marginRight: Spacing.xs },
    searchInput: {
        flex: 1, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    chipScroll: {
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm,
    },
    chip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md, backgroundColor: Colors.bgTertiary,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    chipActive: { backgroundColor: Colors.primary + '18', borderColor: Colors.primary },
    chipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: '700' },
    list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    cardLeft: { flex: 1, gap: 4 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
    activeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    },
    activeDot: { width: 6, height: 6, borderRadius: 3 },
    activeText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardCategory: { fontSize: FontSize.xs, color: Colors.textTertiary },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 2 },
    cardPrice: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
    cardCost: { fontSize: FontSize.xs, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 24, right: 20,
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
});
