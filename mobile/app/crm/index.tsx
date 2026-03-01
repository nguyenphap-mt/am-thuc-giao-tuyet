// CRM Customer List — Material Design 3
// UX Audit fixes: SafeArea, Skeleton, Debounce, useCallback, Offline, Accessibility, Haptics
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    Pressable,
    StyleSheet,
    RefreshControl,
    Linking,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useCustomerList, useCustomerStats, type Customer } from '../../lib/hooks/useCRM';
import { hapticLight, hapticMedium } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(amount);
}

// Skeleton loader
function CRMSkeleton() {
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
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
            {/* Stats skeleton */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map(i => (
                    <View key={i} style={[styles.statCard, { backgroundColor: Colors.bgTertiary + '40' }]}>
                        <B w={24} h={24} />
                        <B w={32} h={22} s={{ marginTop: 4 }} />
                        <B w={48} h={12} s={{ marginTop: 2 }} />
                    </View>
                ))}
            </View>
            {/* Card skeletons */}
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.card, { gap: Spacing.sm }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                        <B w={44} h={44} s={{ borderRadius: 22 }} />
                        <View style={{ flex: 1, gap: 6 }}>
                            <B w="60%" h={16} />
                            <B w="30%" h={12} />
                        </View>
                        <B w={50} h={14} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginLeft: 56 }}>
                        <B w={52} h={28} s={{ borderRadius: BorderRadius.sm }} />
                        <B w={60} h={28} s={{ borderRadius: BorderRadius.sm }} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function CRMScreen() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: customers = [], isLoading, refetch } = useCustomerList(debouncedSearch || undefined);
    const { data: stats, refetch: refetchStats } = useCustomerStats();

    // Search debounce 300ms — H3
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
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    // useCallback renderItem — H1
    const renderItem = useCallback(({ item }: { item: Customer }) => {
        const typeLabel = item.customer_type === 'CORPORATE' ? 'Doanh nghiệp' : 'Cá nhân';
        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => { hapticLight(); router.push(`/crm/${item.id}`); }}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${typeLabel}${item.total_revenue ? `, doanh thu ${formatCurrency(item.total_revenue)}` : ''}`}
                accessibilityHint="Nhấn để xem chi tiết khách hàng"
            >
                <View style={styles.cardHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {(item.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={styles.customerName}>{item.name}</Text>
                        <View style={styles.typeRow}>
                            <MaterialIcons
                                name={item.customer_type === 'CORPORATE' ? 'business' : 'person'}
                                size={14}
                                color={Colors.textSecondary}
                            />
                            <Text style={styles.customerType}>{typeLabel}</Text>
                        </View>
                    </View>
                    {item.total_revenue ? (
                        <Text style={styles.revenueText}>{formatCurrency(item.total_revenue)}₫</Text>
                    ) : null}
                </View>
                <View style={styles.cardActions}>
                    {item.phone && (
                        <Pressable
                            onPress={() => { hapticLight(); Linking.openURL(`tel:${item.phone}`); }}
                            style={styles.actionChip}
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            accessibilityLabel={`Gọi ${item.name}: ${item.phone}`}
                            accessibilityRole="button"
                        >
                            <MaterialIcons name="phone" size={14} color={Colors.textSecondary} />
                            <Text style={styles.actionChipText}>Gọi</Text>
                        </Pressable>
                    )}
                    {item.email && (
                        <Pressable
                            onPress={() => { hapticLight(); Linking.openURL(`mailto:${item.email}`); }}
                            style={styles.actionChip}
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            accessibilityLabel={`Email ${item.name}: ${item.email}`}
                            accessibilityRole="button"
                        >
                            <MaterialIcons name="email" size={14} color={Colors.textSecondary} />
                            <Text style={styles.actionChipText}>Email</Text>
                        </Pressable>
                    )}
                    {item.total_orders != null && (
                        <View style={styles.orderChip}
                            accessibilityLabel={`${item.total_orders} đơn hàng`}>
                            <MaterialIcons name="receipt-long" size={12} color={Colors.textTertiary} />
                            <Text style={styles.orderCount}>{item.total_orders} đơn</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    }, [router]);

    // useCallback keyExtractor — H2
    const keyExtractor = useCallback((item: Customer) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ title: 'Khách hàng', headerShown: true }} />
            <OfflineBanner />

            {/* Search */}
            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={Colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm khách hàng…"
                    placeholderTextColor={Colors.textTertiary}
                    value={search}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                    accessibilityLabel="Tìm kiếm khách hàng"
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

            {isLoading && !refreshing ? <CRMSkeleton /> : (
                <>
                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                            accessibilityLabel={`Tổng: ${stats?.total_customers ?? customers.length} khách hàng`}
                            accessibilityRole="text">
                            <MaterialIcons name="people" size={18} color={Colors.info} />
                            <Text style={[styles.statNumber, { color: Colors.info }]}>
                                {stats?.total_customers ?? customers.length}
                            </Text>
                            <Text style={styles.statLabel}>Khách hàng</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                            accessibilityLabel={`${stats?.active_customers ?? 0} khách hàng hoạt động`}
                            accessibilityRole="text">
                            <MaterialIcons name="verified" size={18} color={Colors.success} />
                            <Text style={[styles.statNumber, { color: Colors.success }]}>
                                {stats?.active_customers ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Hoạt động</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}
                            accessibilityLabel={`${stats?.corporate_customers ?? 0} doanh nghiệp`}
                            accessibilityRole="text">
                            <MaterialIcons name="business" size={18} color={Colors.warning} />
                            <Text style={[styles.statNumber, { color: Colors.warning }]}>
                                {stats?.corporate_customers ?? 0}
                            </Text>
                            <Text style={styles.statLabel}>Doanh nghiệp</Text>
                        </View>
                    </View>

                    <FlatList
                        data={customers}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary}
                                colors={[Colors.primary, Colors.primaryDark]} />
                        }
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialIcons name={search ? 'search-off' : 'people'} size={56} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>
                                    {search ? 'Không tìm thấy' : 'Chưa có khách hàng'}
                                </Text>
                                <Text style={styles.emptyText}>
                                    {search ? 'Thử từ khóa khác' : 'Khách hàng sẽ xuất hiện khi có đơn hàng'}
                                </Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md,
    },
    searchIcon: { marginRight: Spacing.sm },
    searchInput: {
        flex: 1, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
    statCard: { flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 2 },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    list: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    cardInfo: { flex: 1 },
    avatarCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
    customerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    customerType: { fontSize: FontSize.xs, color: Colors.textSecondary },
    revenueText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.success, fontVariant: ['tabular-nums'] },
    cardActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: 56, alignItems: 'center' },
    actionChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.bgTertiary,
    },
    actionChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    orderChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    orderCount: { fontSize: FontSize.xs, color: Colors.textTertiary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
