// Order Detail — view order info + update status
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useOrderDetail, useUpdateOrderStatus } from '../../lib/hooks/useOrders';
import { useAuthStore } from '../../lib/auth-store';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: '📝' },
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ xác nhận', icon: '⏳' },
    CONFIRMED: { bg: '#eff6ff', text: Colors.info, label: 'Đã xác nhận', icon: '✅' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Đang thực hiện', icon: '🔥' },
    COMPLETED: { bg: '#f0fdf4', text: Colors.success, label: 'Hoàn thành', icon: '🎉' },
    CANCELLED: { bg: '#fef2f2', text: Colors.error, label: 'Đã hủy', icon: '❌' },
};

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
    CONFIRMED: { status: 'IN_PROGRESS', label: 'Bắt đầu thực hiện' },
    IN_PROGRESS: { status: 'COMPLETED', label: 'Hoàn thành đơn' },
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    // Handle ISO datetime or HH:mm format
    if (timeStr.includes('T')) {
        return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr;
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: order, isLoading } = useOrderDetail(id);
    const updateStatus = useUpdateOrderStatus();

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';
    const canAdvance = order && NEXT_STATUS[order.status];

    const handleStatusUpdate = () => {
        if (!order || !canAdvance) return;
        const next = NEXT_STATUS[order.status];
        Alert.alert(
            'Xác nhận',
            `Bạn muốn chuyển đơn sang "${next.label}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xác nhận',
                    onPress: () => updateStatus.mutate(
                        { id: order.id, status: next.status },
                        { onSuccess: () => Alert.alert('Thành công', `Đã chuyển sang ${next.label}`) }
                    ),
                },
            ]
        );
    };

    if (isLoading || !order) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
    const balance = order.final_amount - order.paid_amount;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header Status */}
            <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                <Text style={styles.statusBannerIcon}>{status.icon}</Text>
                <Text style={[styles.statusBannerText, { color: status.text }]}>
                    {status.label}
                </Text>
            </View>

            {/* Order Info */}
            <View style={styles.section}>
                <Text style={styles.orderCode}>{order.code}</Text>
                <Text style={styles.customerName}>👤 {order.customer_name}</Text>
                {order.customer_phone && (
                    <Text style={styles.infoText}>📞 {order.customer_phone}</Text>
                )}
                {order.event_location && (
                    <Text style={styles.infoText}>📍 {order.event_location}</Text>
                )}
                <View style={styles.dateRow}>
                    <Text style={styles.infoText}>
                        📅 {formatDate(order.event_date)}
                    </Text>
                    {(order.event_time_start || order.event_time_end) && (
                        <Text style={styles.infoText}>
                            🕐 {formatTime(order.event_time_start)}
                            {order.event_time_end ? ` — ${formatTime(order.event_time_end)}` : ''}
                        </Text>
                    )}
                </View>
                {order.guest_count && (
                    <Text style={styles.infoText}>🍽️ {order.guest_count} khách</Text>
                )}
            </View>

            {/* Financial Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Tài chính</Text>
                <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>Tổng tiền</Text>
                    <Text style={styles.financeAmount}>{formatCurrency(order.final_amount)}</Text>
                </View>
                <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>Đã thanh toán</Text>
                    <Text style={[styles.financeAmount, { color: Colors.success }]}>
                        {formatCurrency(order.paid_amount)}
                    </Text>
                </View>
                <View style={[styles.financeRow, styles.financeTotal]}>
                    <Text style={styles.financeTotalLabel}>Còn lại</Text>
                    <Text style={[styles.financeTotalAmount, { color: balance > 0 ? Colors.error : Colors.success }]}>
                        {formatCurrency(balance)}
                    </Text>
                </View>
            </View>

            {/* Menu Items */}
            {order.items && order.items.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🍲 Thực đơn ({order.items.length} món)</Text>
                    {order.items.map((item, index) => (
                        <View key={item.id || index} style={styles.menuItem}>
                            <View style={styles.menuItemLeft}>
                                <Text style={styles.menuItemName}>{item.menu_item_name}</Text>
                                <Text style={styles.menuItemQty}>x{item.quantity}</Text>
                            </View>
                            <Text style={styles.menuItemPrice}>
                                {formatCurrency(item.total_price)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Notes */}
            {order.notes && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
                    <Text style={styles.notesText}>{order.notes}</Text>
                </View>
            )}

            {/* Action Button */}
            {canAdvance && (
                <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.8}
                    onPress={handleStatusUpdate}
                    disabled={updateStatus.isPending}
                >
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.actionButtonGradient}
                    >
                        <Text style={styles.actionButtonText}>
                            {updateStatus.isPending ? 'Đang xử lý...' : NEXT_STATUS[order.status].label}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
    // Status banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    statusBannerIcon: { fontSize: 24 },
    statusBannerText: { fontSize: FontSize.lg, fontWeight: '700' },
    // Sections
    section: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    orderCode: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    customerName: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    infoText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    dateRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    // Finance
    financeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    financeLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    financeAmount: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    financeTotal: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.xs,
        paddingTop: Spacing.sm,
    },
    financeTotalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    financeTotalAmount: {
        fontSize: FontSize.lg,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    // Menu items
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    menuItemLeft: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    menuItemName: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1 },
    menuItemQty: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    menuItemPrice: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    // Notes
    notesText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    // Action button
    actionButton: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionButtonGradient: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textInverse,
    },
});
