// Order List — Material Design 3
import { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useOrderList, type Order } from '../../lib/hooks/useOrders';
import { hapticLight } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: 'edit' },
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ xác nhận', icon: 'schedule' },
    CONFIRMED: { bg: '#eff6ff', text: Colors.info, label: 'Đã xác nhận', icon: 'check-circle' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Đang thực hiện', icon: 'play-circle-filled' },
    COMPLETED: { bg: '#f0fdf4', text: Colors.success, label: 'Hoàn thành', icon: 'verified' },
    CANCELLED: { bg: '#fef2f2', text: Colors.error, label: 'Đã hủy', icon: 'cancel' },
};

// Stat card color tokens
const STAT_COLORS = {
    today: { bg: '#eff6ff', accent: Colors.info },
    active: { bg: '#fff7ed', accent: Colors.warning },
    total: { bg: '#f0fdf4', accent: Colors.success },
} as const;

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function OrderListScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { data: orders = [], isLoading, refetch } = useOrderList();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    // Memoize computed stats
    const { activeCount, todayCount } = useMemo(() => {
        const today = new Date();
        const todayStr = today.toDateString();
        let active = 0;
        let todayN = 0;
        for (const o of orders) {
            if (['CONFIRMED', 'IN_PROGRESS'].includes(o.status)) active++;
            if (o.event_date && new Date(o.event_date).toDateString() === todayStr) todayN++;
        }
        return { activeCount: active, todayCount: todayN };
    }, [orders]);

    const renderItem = useCallback(({ item }: { item: Order }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => { hapticLight(); router.push(`/orders/${item.id}`); }}
                accessibilityLabel={`Đơn hàng ${item.code}, khách ${item.customer_name}, trạng thái ${status.label}, ${formatCurrency(item.final_amount)}`}
                accessibilityRole="button"
                accessibilityHint="Nhấn để xem chi tiết đơn hàng"
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.orderCode}>{item.code}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        <MaterialIcons name={status.icon} size={12} color={status.text} />
                        <Text style={[styles.statusText, { color: status.text }]}>
                            {status.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.metaRow}>
                        <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                        <Text style={styles.customerName} numberOfLines={1}>
                            {item.customer_name}
                        </Text>
                    </View>
                    {item.event_location && (
                        <View style={styles.metaRow}>
                            <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText} numberOfLines={1}>{item.event_location}</Text>
                        </View>
                    )}
                    <View style={styles.cardMeta}>
                        <View style={styles.metaRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>
                                {item.event_date ? formatDate(item.event_date) : 'Chưa có ngày'}
                                {item.guest_count ? ` · ${item.guest_count} khách` : ''}
                            </Text>
                        </View>
                        <Text style={styles.metaAmount}>
                            {formatCurrency(item.final_amount)}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    }, [router]);

    const keyExtractor = useCallback((item: Order) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />
            <View style={styles.container}>
                {/* Stats */}
                <View style={styles.statsRow}>
                    <View
                        style={[styles.statCard, { backgroundColor: STAT_COLORS.today.bg }]}
                        accessibilityLabel={`Hôm nay: ${todayCount} đơn hàng`}
                        accessibilityRole="text"
                    >
                        <MaterialIcons name="today" size={18} color={STAT_COLORS.today.accent} />
                        <Text style={[styles.statNumber, { color: STAT_COLORS.today.accent }]}>{todayCount}</Text>
                        <Text style={styles.statLabel}>Hôm nay</Text>
                    </View>
                    <View
                        style={[styles.statCard, { backgroundColor: STAT_COLORS.active.bg }]}
                        accessibilityLabel={`Đang xử lý: ${activeCount} đơn hàng`}
                        accessibilityRole="text"
                    >
                        <MaterialIcons name="pending-actions" size={18} color={STAT_COLORS.active.accent} />
                        <Text style={[styles.statNumber, { color: STAT_COLORS.active.accent }]}>{activeCount}</Text>
                        <Text style={styles.statLabel}>Đang xử lý</Text>
                    </View>
                    <View
                        style={[styles.statCard, { backgroundColor: STAT_COLORS.total.bg }]}
                        accessibilityLabel={`Tổng: ${orders.length} đơn hàng`}
                        accessibilityRole="text"
                    >
                        <MaterialIcons name="receipt-long" size={18} color={STAT_COLORS.total.accent} />
                        <Text style={[styles.statNumber, { color: STAT_COLORS.total.accent }]}>{orders.length}</Text>
                        <Text style={styles.statLabel}>Tổng đơn</Text>
                    </View>
                </View>

                <FlatList
                    data={orders}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primary}
                            colors={[Colors.primary, Colors.primaryDark]}
                        />
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.empty}>
                                <MaterialIcons name="receipt-long" size={56} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
                                <Text style={styles.emptyText}>
                                    Đơn hàng được phân công sẽ hiển thị tại đây.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
        padding: Spacing.lg,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
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
    list: {
        paddingBottom: 100,
        gap: Spacing.md,
    },
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
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.bgTertiary,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    orderCode: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    cardContent: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    customerName: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        flex: 1,
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    metaText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    metaAmount: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: Spacing.xxxl,
        gap: Spacing.sm,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
