// Order List — "Đơn hàng của tôi"
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
import { useOrderList, type Order } from '../../lib/hooks/useOrders';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: '📝' },
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ xác nhận', icon: '⏳' },
    CONFIRMED: { bg: '#eff6ff', text: Colors.info, label: 'Đã xác nhận', icon: '✅' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Đang thực hiện', icon: '🔥' },
    COMPLETED: { bg: '#f0fdf4', text: Colors.success, label: 'Hoàn thành', icon: '🎉' },
    CANCELLED: { bg: '#fef2f2', text: Colors.error, label: 'Đã hủy', icon: '❌' },
};

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

function groupOrdersByDate(orders: Order[]): { title: string; data: Order[] }[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const groups: Record<string, Order[]> = {};

    for (const order of orders) {
        const eventDate = order.event_date ? new Date(order.event_date) : null;
        let key = 'Khác';

        if (eventDate) {
            eventDate.setHours(0, 0, 0, 0);
            if (eventDate.getTime() === today.getTime()) {
                key = '📅 Hôm nay';
            } else if (eventDate.getTime() === tomorrow.getTime()) {
                key = '📅 Ngày mai';
            } else if (eventDate > today) {
                key = '📅 Sắp tới';
            } else {
                key = '📅 Đã qua';
            }
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
    }

    // Sort: Hôm nay first, Ngày mai second, Sắp tới third, rest last
    const priority = ['📅 Hôm nay', '📅 Ngày mai', '📅 Sắp tới', '📅 Đã qua', 'Khác'];
    return priority
        .filter(k => groups[k]?.length)
        .map(title => ({ title, data: groups[title] }));
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

    const grouped = groupOrdersByDate(orders);

    // Stats
    const activeCount = orders.filter(o => ['CONFIRMED', 'IN_PROGRESS'].includes(o.status)).length;
    const todayCount = orders.filter(o => {
        if (!o.event_date) return false;
        const d = new Date(o.event_date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }).length;

    const renderItem = ({ item }: { item: Order }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/orders/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.orderCode}>{item.code}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={styles.statusIcon}>{status.icon}</Text>
                        <Text style={[styles.statusText, { color: status.text }]}>
                            {status.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <Text style={styles.customerName} numberOfLines={1}>
                        👤 {item.customer_name}
                    </Text>
                    {item.event_location && (
                        <Text style={styles.metaText} numberOfLines={1}>
                            📍 {item.event_location}
                        </Text>
                    )}
                    <View style={styles.cardMeta}>
                        <Text style={styles.metaText}>
                            {item.event_date ? formatDate(item.event_date) : 'Chưa có ngày'}
                            {item.guest_count ? ` · ${item.guest_count} khách` : ''}
                        </Text>
                        <Text style={styles.metaAmount}>
                            {formatCurrency(item.final_amount)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.statNumber, { color: Colors.info }]}>{todayCount}</Text>
                    <Text style={styles.statLabel}>Hôm nay</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                    <Text style={[styles.statNumber, { color: Colors.warning }]}>{activeCount}</Text>
                    <Text style={styles.statLabel}>Đang xử lý</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.statNumber, { color: Colors.success }]}>{orders.length}</Text>
                    <Text style={styles.statLabel}>Tổng đơn</Text>
                </View>
            </View>

            <FlatList
                data={orders}
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
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
                            <Text style={styles.emptyText}>
                                Đơn hàng được phân công sẽ hiển thị tại đây.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
    list: {
        paddingBottom: 100,
        gap: Spacing.md,
    },
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
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    statusIcon: { fontSize: 12 },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    cardContent: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    customerName: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
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
    },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
