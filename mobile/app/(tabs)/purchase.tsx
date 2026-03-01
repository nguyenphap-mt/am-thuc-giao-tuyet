// Purchase Requisition List — Material Design 3
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { usePRList, useProcurementStats, type PurchaseRequisition } from '../../lib/hooks/usePurchase';
import { hapticLight, hapticMedium } from '../../lib/haptics';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: 'check-circle' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: 'cancel' },
    CONVERTED: { bg: '#eff6ff', text: Colors.info, label: 'Đã chuyển PO', icon: 'sync' },
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
                <MaterialIcons name="schedule" size={18} color={Colors.warning} />
                <Text style={[styles.statNumber, { color: Colors.warning }]}>
                    {stats?.pending_prs ?? 0}
                </Text>
                <Text style={styles.statLabel}>Chờ duyệt</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                <MaterialIcons name="check-circle" size={18} color={Colors.success} />
                <Text style={[styles.statNumber, { color: Colors.success }]}>
                    {stats?.approved_prs ?? 0}
                </Text>
                <Text style={styles.statLabel}>Đã duyệt</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                <MaterialIcons name="shopping-cart" size={18} color={Colors.info} />
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
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => { hapticLight(); router.push(`/purchase/${item.id}`); }}
                accessibilityLabel={`Yêu cầu mua hàng ${item.code}`}
                accessibilityRole="button"
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
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
                    <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        <MaterialIcons name={status.icon} size={12} color={status.text} />
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
                        <View style={styles.metaRow}>
                            <MaterialIcons name="inventory-2" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{lineCount} mặt hàng</Text>
                        </View>
                        <Text style={styles.metaAmount}>
                            {formatCurrency(item.total_amount)}
                        </Text>
                    </View>
                    {item.created_at && (
                        <View style={styles.metaRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textTertiary} />
                            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={prs}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderStatsCards}
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
                            <MaterialIcons name="shopping-cart" size={56} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Chưa có yêu cầu mua hàng</Text>
                            <Text style={styles.emptyText}>
                                Nhấn nút (+) bên dưới để tạo phiếu yêu cầu mua hàng mới.
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* FAB */}
            <Pressable
                style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
                onPress={() => { hapticMedium(); router.push('/purchase/create'); }}
                accessibilityLabel="Tạo yêu cầu mua hàng"
                accessibilityRole="button"
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
    // Card
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
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
});
