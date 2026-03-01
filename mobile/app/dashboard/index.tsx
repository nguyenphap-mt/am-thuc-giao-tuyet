// Mobile Dashboard — KPI summary + today's events
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useDashboardStats, useTodayOrders } from '../../lib/hooks/useDashboard';
import { hapticLight } from '../../lib/haptics';

function formatCurrency(amount: number): string {
    if (amount >= 1_000_000) {
        return (amount / 1_000_000).toFixed(1) + 'tr';
    }
    if (amount >= 1_000) {
        return (amount / 1_000).toFixed(0) + 'k';
    }
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatFullCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function DashboardScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { data: stats, refetch: refetchStats } = useDashboardStats();
    const { data: todayOrders = [], refetch: refetchOrders } = useTodayOrders();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchStats(), refetchOrders()]);
        setRefreshing(false);
    }, [refetchStats, refetchOrders]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.primary}
                />
            }
        >
            {/* Header */}
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <MaterialIcons name="dashboard" size={24} color={Colors.textInverse} />
                    <Text style={styles.headerTitle}>Dashboard</Text>
                </View>
                <Text style={styles.headerSubtitle}>Tổng quan hôm nay</Text>
            </LinearGradient>

            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
                    <View style={styles.kpiLabelRow}>
                        <MaterialIcons name="trending-up" size={14} color={Colors.textSecondary} />
                        <Text style={styles.kpiLabel}>Doanh thu tháng</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: Colors.success }]}>
                        {formatCurrency(stats?.revenue?.this_month ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}>
                    <View style={styles.kpiLabelRow}>
                        <MaterialIcons name="receipt-long" size={14} color={Colors.textSecondary} />
                        <Text style={styles.kpiLabel}>Đơn đang xử lý</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: Colors.info }]}>
                        {(stats?.orders?.confirmed ?? 0) + (stats?.orders?.in_progress ?? 0)}
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
                    <View style={styles.kpiLabelRow}>
                        <MaterialIcons name="payments" size={14} color={Colors.textSecondary} />
                        <Text style={styles.kpiLabel}>Chi phí tháng</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: Colors.warning }]}>
                        {formatCurrency(stats?.expenses?.this_month ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
                    <View style={styles.kpiLabelRow}>
                        <MaterialIcons name="warning" size={14} color={Colors.textSecondary} />
                        <Text style={styles.kpiLabel}>Công nợ quá hạn</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: Colors.error }]}>
                        {formatCurrency(stats?.receivables?.overdue ?? 0)}₫
                    </Text>
                </View>
            </View>

            {/* Today's Events */}
            <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                    <MaterialIcons name="event" size={20} color={Colors.textPrimary} />
                    <Text style={styles.sectionTitle}>
                        Sự kiện hôm nay ({todayOrders.length})
                    </Text>
                </View>
                {todayOrders.length === 0 ? (
                    <View style={styles.emptyEvents}>
                        <Text style={styles.emptyText}>Không có sự kiện hôm nay</Text>
                    </View>
                ) : (
                    todayOrders.map((order: any) => (
                        <Pressable
                            key={order.id}
                            style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.85 }]}
                            onPress={() => { hapticLight(); router.push(`/orders/${order.id}`); }}
                            accessibilityLabel={`Đơn hàng ${order.code} - ${order.customer_name}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <View style={styles.eventLeft}>
                                <Text style={styles.eventCode}>{order.code}</Text>
                                <Text style={styles.eventCustomer}>{order.customer_name}</Text>
                                {order.event_location && (
                                    <View style={styles.eventLocationRow}>
                                        <MaterialIcons name="place" size={12} color={Colors.textSecondary} />
                                        <Text style={styles.eventLocation}>{order.event_location}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.eventAmount}>
                                {formatFullCurrency(order.total_amount ?? order.final_amount ?? 0)}
                            </Text>
                        </Pressable>
                    ))
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                    <MaterialIcons name="flash-on" size={20} color={Colors.textPrimary} />
                    <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
                </View>
                <View style={styles.quickGrid}>
                    {[
                        { label: 'Đơn hàng', icon: 'receipt-long' as keyof typeof MaterialIcons.glyphMap, route: '/orders' },
                        { label: 'Kho', icon: 'inventory-2' as keyof typeof MaterialIcons.glyphMap, route: '/inventory' },
                        { label: 'Mua hàng', icon: 'shopping-cart' as keyof typeof MaterialIcons.glyphMap, route: '/(tabs)/purchase' },
                        { label: 'CRM', icon: 'people' as keyof typeof MaterialIcons.glyphMap, route: '/crm' },
                    ].map((item) => (
                        <Pressable
                            key={item.route}
                            style={({ pressed }) => [styles.quickBtn, pressed && { backgroundColor: Colors.bgTertiary }]}
                            onPress={() => { hapticLight(); router.push(item.route as any); }}
                            accessibilityLabel={item.label}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <MaterialIcons name={item.icon} size={24} color={Colors.primary} />
                            <Text style={styles.quickBtnText}>{item.label}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View style={styles.bottomSpacer} />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { gap: Spacing.md },
    // Header
    header: {
        padding: Spacing.xxl,
        paddingTop: Spacing.xxxl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    kpiLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerTitle: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.textInverse,
    },
    headerSubtitle: {
        fontSize: FontSize.md,
        color: 'rgba(255,255,255,0.85)',
        marginTop: Spacing.xs,
    },
    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
    },
    kpiCard: {
        width: '48%',
        flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    kpiLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    kpiValue: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        marginTop: Spacing.xs,
        fontVariant: ['tabular-nums'],
    },
    // Sections
    section: {
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.md,
    },
    emptyEvents: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xxl,
        alignItems: 'center',
    },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
    eventCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    eventLeft: { flex: 1, gap: 2 },
    eventCode: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    eventCustomer: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    eventLocation: { fontSize: FontSize.xs, color: Colors.textSecondary },
    eventAmount: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.success,
        fontVariant: ['tabular-nums'],
    },
    // Quick Actions
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    quickBtn: {
        width: '48%',
        flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    quickBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    bottomSpacer: { height: 40 },
});
