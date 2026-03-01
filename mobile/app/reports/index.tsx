// Reports — Material Design 3
// UX Audit fixes: SafeArea, Skeleton, Offline, Accessibility, Dynamic insets
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useRevenueReport, useAnalyticsDashboard } from '../../lib/hooks/useReports';
import { hapticLight } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

function formatShort(amount: number): string {
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'tỷ';
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
    return String(amount);
}

const PERIODS = [
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: '30 ngày' },
    { key: '90d', label: '3 tháng' },
];

// Skeleton loader — animated shimmer
function ReportSkeleton() {
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
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
            {/* Period chips skeleton */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {[1, 2, 3].map(i => <Block key={i} w="30%" h={44} s={{ borderRadius: BorderRadius.lg }} />)}
            </View>
            {/* KPI grid skeleton */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[styles.kpiCard, { borderLeftColor: Colors.bgTertiary, width: '48%' }]}>
                        <Block w={80} h={12} />
                        <Block w={60} h={24} s={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>
            {/* Summary skeleton */}
            <Block w={120} h={20} s={{ marginTop: Spacing.sm }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[styles.summaryItem, { width: '48%' }]}>
                        <Block w={90} h={12} />
                        <Block w={60} h={22} s={{ marginTop: 6 }} />
                        <Block w={70} h={10} s={{ marginTop: 4 }} />
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function ReportsScreen() {
    const insets = useSafeAreaInsets();
    const [period, setPeriod] = useState('30d');
    const [refreshing, setRefreshing] = useState(false);

    const { data: revenue, isLoading: revenueLoading, refetch: refetchRevenue } = useRevenueReport(period);
    const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalyticsDashboard();

    const isLoading = revenueLoading || analyticsLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchRevenue(), refetchAnalytics()]);
        setRefreshing(false);
    }, [refetchRevenue, refetchAnalytics]);

    const periodLabel = PERIODS.find(p => p.key === period)?.label ?? period;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ title: 'Báo cáo', headerShown: true }} />
            <OfflineBanner />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                        tintColor={Colors.primary} colors={[Colors.primary, Colors.primaryDark]} />
                }
            >
                {/* Header */}
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.header}
                >
                    <View style={styles.headerRow}>
                        <MaterialIcons name="bar-chart" size={28} color={Colors.textInverse} />
                        <View>
                            <Text style={styles.headerTitle}>Báo cáo</Text>
                            <Text style={styles.headerSubtitle}>Phân tích kinh doanh</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Period Selector — M3 Filter Chips */}
                <View style={styles.periodRow}>
                    {PERIODS.map(p => (
                        <Pressable
                            key={p.key}
                            style={({ pressed }) => [
                                styles.periodChip,
                                period === p.key && styles.periodChipActive,
                                pressed && { opacity: 0.7 },
                            ]}
                            onPress={() => { hapticLight(); setPeriod(p.key); }}
                            accessibilityLabel={`Kỳ báo cáo ${p.label}`}
                            accessibilityRole="button"
                            accessibilityHint="Nhấn để chuyển kỳ báo cáo"
                            accessibilityState={{ selected: period === p.key }}
                            android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                        >
                            {period === p.key && (
                                <MaterialIcons name="check" size={16} color={Colors.primary} />
                            )}
                            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                                {p.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {isLoading && !refreshing ? (
                    <ReportSkeleton />
                ) : (
                    <>
                        {/* Revenue KPIs */}
                        <View style={styles.kpiGrid}>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}
                                accessibilityLabel={`Doanh thu: ${formatShort(revenue?.total_revenue ?? 0)} đồng, kỳ ${periodLabel}`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="trending-up" size={16} color={Colors.success} />
                                    <Text style={styles.kpiLabel}>Doanh thu</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.success }]}>
                                    {formatShort(revenue?.total_revenue ?? 0)}₫
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}
                                accessibilityLabel={`Đơn hàng: ${revenue?.total_orders ?? 0}, kỳ ${periodLabel}`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="receipt-long" size={16} color={Colors.info} />
                                    <Text style={styles.kpiLabel}>Đơn hàng</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.info }]}>
                                    {revenue?.total_orders ?? 0}
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}
                                accessibilityLabel={`Giá trị trung bình: ${formatShort(revenue?.avg_order_value ?? 0)} đồng`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="bar-chart" size={16} color={Colors.warning} />
                                    <Text style={styles.kpiLabel}>Giá trị TB</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.warning }]}>
                                    {formatShort(revenue?.avg_order_value ?? 0)}₫
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}
                                accessibilityLabel={`Kỳ: ${periodLabel}`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="date-range" size={16} color={Colors.primary} />
                                    <Text style={styles.kpiLabel}>Kỳ</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.primary }]}>
                                    {periodLabel}
                                </Text>
                            </View>
                        </View>

                        {/* Analytics Summary — ternary instead of falsy && */}
                        {analytics != null ? (
                            <View style={styles.section}>
                                <View style={styles.sectionTitleRow}>
                                    <MaterialIcons name="analytics" size={20} color={Colors.textPrimary} />
                                    <Text style={styles.sectionTitle}>Tổng kết</Text>
                                </View>
                                <View style={styles.summaryGrid}>
                                    <View style={styles.summaryItem}
                                        accessibilityLabel={`Lợi nhuận tháng: ${formatShort(analytics.profit_month ?? 0)} đồng, biên lợi nhuận ${(analytics.profit_margin ?? 0).toFixed(1)} phần trăm`}
                                        accessibilityRole="text">
                                        <View style={styles.summaryHeaderRow}>
                                            <MaterialIcons name="savings" size={14} color={Colors.success} />
                                            <Text style={styles.summaryLabel}>Lợi nhuận tháng</Text>
                                        </View>
                                        <Text style={[styles.summaryValue, { color: Colors.success }]}>
                                            {formatShort(analytics.profit_month ?? 0)}₫
                                        </Text>
                                        <Text style={styles.summaryMeta}>
                                            Biên LN: {(analytics.profit_margin ?? 0).toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}
                                        accessibilityLabel={`Chi phí tháng: ${formatShort(analytics.expenses_month ?? 0)} đồng, xu hướng ${(analytics.expenses_trend ?? 0) >= 0 ? 'tăng' : 'giảm'} ${Math.abs(analytics.expenses_trend ?? 0).toFixed(1)} phần trăm`}
                                        accessibilityRole="text">
                                        <View style={styles.summaryHeaderRow}>
                                            <MaterialIcons name="trending-down" size={14} color={Colors.error} />
                                            <Text style={styles.summaryLabel}>Chi phí tháng</Text>
                                        </View>
                                        <Text style={[styles.summaryValue, { color: Colors.error }]}>
                                            {formatShort(analytics.expenses_month ?? 0)}₫
                                        </Text>
                                        <Text style={styles.summaryMeta}>
                                            {(analytics.expenses_trend ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(analytics.expenses_trend ?? 0).toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}
                                        accessibilityLabel={`Tồn kho: ${formatShort(analytics.inventory_value ?? 0)} đồng, ${analytics.inventory_warning ?? 0} sản phẩm cần nhập`}
                                        accessibilityRole="text">
                                        <View style={styles.summaryHeaderRow}>
                                            <MaterialIcons name="inventory-2" size={14} color={Colors.info} />
                                            <Text style={styles.summaryLabel}>Tồn kho</Text>
                                        </View>
                                        <Text style={[styles.summaryValue, { color: Colors.info }]}>
                                            {formatShort(analytics.inventory_value ?? 0)}₫
                                        </Text>
                                        <View style={styles.warningRow}>
                                            <MaterialIcons name="warning" size={12} color={Colors.warning} />
                                            <Text style={styles.summaryMeta}>
                                                {analytics.inventory_warning ?? 0} SP cần nhập
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.summaryItem}
                                        accessibilityLabel={`Nhân viên: ${analytics.employees_active ?? 0}, khách hàng: ${analytics.customers_total ?? 0}, ${analytics.new_customers ?? 0} mới`}
                                        accessibilityRole="text">
                                        <View style={styles.summaryHeaderRow}>
                                            <MaterialIcons name="people" size={14} color={Colors.primary} />
                                            <Text style={styles.summaryLabel}>Nhân viên</Text>
                                        </View>
                                        <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                                            {analytics.employees_active ?? 0}
                                        </Text>
                                        <Text style={styles.summaryMeta}>
                                            KH: {analytics.customers_total ?? 0} ({analytics.new_customers ?? 0} mới)
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ) : !isLoading ? (
                            <View style={styles.emptyState}>
                                <MaterialIcons name="analytics" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>Chưa có dữ liệu</Text>
                                <Text style={styles.emptyText}>Kéo xuống để tải lại báo cáo</Text>
                            </View>
                        ) : null}
                    </>
                )}

                {/* Dynamic bottom spacer */}
                <View style={{ height: Math.max(insets.bottom, 40) }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { gap: Spacing.md },
    header: {
        padding: Spacing.xxl, paddingTop: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textInverse },
    headerSubtitle: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    periodRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    periodChip: {
        flex: 1, paddingVertical: Spacing.md, flexDirection: 'row',
        borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', gap: 4,
        backgroundColor: Colors.bgPrimary, borderWidth: 1, borderColor: Colors.border,
    },
    periodChipActive: {
        backgroundColor: Colors.primary + '18', borderColor: Colors.primary,
    },
    periodText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    periodTextActive: { color: Colors.primary },
    kpiGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg, gap: Spacing.sm,
    },
    kpiCard: {
        width: '48%' as any, flexGrow: 1,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    kpiValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
    section: { paddingHorizontal: Spacing.lg },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    summaryGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    },
    summaryItem: {
        width: '48%' as any, flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    summaryHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    summaryValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
    summaryMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
    warningRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    emptyState: {
        alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
    },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
});
