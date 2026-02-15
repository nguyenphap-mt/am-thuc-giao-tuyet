// Purchase Requisition List — "Mua hàng" tab
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
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { usePRList, useProcurementStats, type PurchaseRequisition } from '../../lib/hooks/usePurchase';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: '⏳' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: '✅' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: '❌' },
    CONVERTED: { bg: '#eff6ff', text: Colors.info, label: 'Đã chuyển PO', icon: '🔄' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Thấp', color: Colors.textTertiary },
    NORMAL: { label: 'Bình thường', color: Colors.info },
    HIGH: { label: 'Cao', color: Colors.warning },
    URGENT: { label: 'Khẩn cấp', color: Colors.error },
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function PurchaseScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { data: prs = [], isLoading, refetch } = usePRList();
    const { data: stats, refetch: refetchStats } = useProcurementStats();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetch(), refetchStats()]);
        setRefreshing(false);
    }, [refetch, refetchStats]);

    const renderStatsCards = () => (
        <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
                <Text style={[styles.statNumber, { color: Colors.warning }]}>
                    {stats?.pending_prs ?? 0}
                </Text>
                <Text style={styles.statLabel}>Chờ duyệt</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.statNumber, { color: Colors.success }]}>
                    {stats?.approved_prs ?? 0}
                </Text>
                <Text style={styles.statLabel}>Đã duyệt</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.statNumber, { color: Colors.info }]}>
                    {stats?.total_requisitions ?? 0}
                </Text>
                <Text style={styles.statLabel}>Tổng PR</Text>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: PurchaseRequisition }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.NORMAL;
        const lineCount = item.lines?.length ?? 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/purchase/${item.id}`)}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.prCode}>{item.code}</Text>
                        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '18' }]}>
                            <Text style={[styles.priorityText, { color: priority.color }]}>
                                {priority.label}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={styles.statusIcon}>{status.icon}</Text>
                        <Text style={[styles.statusText, { color: status.text }]}>
                            {status.label}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <Text style={styles.prTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.cardMeta}>
                        <Text style={styles.metaText}>
                            📦 {lineCount} mặt hàng
                        </Text>
                        <Text style={styles.metaAmount}>
                            {formatCurrency(item.total_amount)}
                        </Text>
                    </View>
                    {item.created_at && (
                        <Text style={styles.dateText}>
                            📅 {formatDate(item.created_at)}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={prs}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListHeaderComponent={renderStatsCards}
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
                            <Text style={styles.emptyIcon}>🛒</Text>
                            <Text style={styles.emptyTitle}>Chưa có yêu cầu mua hàng</Text>
                            <Text style={styles.emptyText}>
                                Nhấn nút (+) bên dưới để tạo phiếu yêu cầu mua hàng mới.
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => router.push('/purchase/create')}
            >
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fabGradient}
                >
                    <Text style={styles.fabIcon}>＋</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    list: {
        padding: Spacing.lg,
        paddingBottom: 100,
        gap: Spacing.md,
    },
    // Stats
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
    // Card
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
    prCode: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    priorityBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    priorityText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    statusIcon: {
        fontSize: 12,
    },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    cardContent: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    prTitle: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        lineHeight: 22,
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
    dateText: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
    },
    // Empty
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: Spacing.xxxl,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.lg,
    },
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
    // FAB
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
    fabGradient: {
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
