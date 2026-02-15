// Reports — summary analytics with period selector
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useRevenueReport, useAnalyticsDashboard } from '../../lib/hooks/useReports';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

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

export default function ReportsScreen() {
    const [period, setPeriod] = useState('30d');
    const [refreshing, setRefreshing] = useState(false);

    const { data: revenue, refetch: refetchRevenue } = useRevenueReport(period);
    const { data: analytics, refetch: refetchAnalytics } = useAnalyticsDashboard();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchRevenue(), refetchAnalytics()]);
        setRefreshing(false);
    }, [refetchRevenue, refetchAnalytics]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
            {/* Header */}
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>📈 Báo cáo</Text>
                <Text style={styles.headerSubtitle}>Phân tích kinh doanh</Text>
            </LinearGradient>

            {/* Period Selector */}
            <View style={styles.periodRow}>
                {PERIODS.map(p => (
                    <TouchableOpacity
                        key={p.key}
                        style={[styles.periodChip, period === p.key && styles.periodChipActive]}
                        onPress={() => setPeriod(p.key)}
                    >
                        <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Revenue KPIs */}
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
                    <Text style={styles.kpiLabel}>💰 Doanh thu</Text>
                    <Text style={[styles.kpiValue, { color: Colors.success }]}>
                        {formatShort(revenue?.total_revenue ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}>
                    <Text style={styles.kpiLabel}>📋 Đơn hàng</Text>
                    <Text style={[styles.kpiValue, { color: Colors.info }]}>
                        {revenue?.total_orders ?? 0}
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
                    <Text style={styles.kpiLabel}>📊 Giá trị TB</Text>
                    <Text style={[styles.kpiValue, { color: Colors.warning }]}>
                        {formatShort(revenue?.avg_order_value ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
                    <Text style={styles.kpiLabel}>📆 Kỳ</Text>
                    <Text style={[styles.kpiValue, { color: Colors.primary }]}>
                        {PERIODS.find(p => p.key === period)?.label}
                    </Text>
                </View>
            </View>

            {/* Analytics Summary */}
            {analytics && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Tổng kết</Text>
                    <View style={styles.summaryGrid}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Lợi nhuận tháng</Text>
                            <Text style={[styles.summaryValue, { color: Colors.success }]}>
                                {formatShort(analytics.profit_month ?? 0)}₫
                            </Text>
                            <Text style={styles.summaryMeta}>
                                Biên LN: {(analytics.profit_margin ?? 0).toFixed(1)}%
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Chi phí tháng</Text>
                            <Text style={[styles.summaryValue, { color: Colors.error }]}>
                                {formatShort(analytics.expenses_month ?? 0)}₫
                            </Text>
                            <Text style={styles.summaryMeta}>
                                {(analytics.expenses_trend ?? 0) >= 0 ? '↑' : '↓'} {Math.abs(analytics.expenses_trend ?? 0).toFixed(1)}%
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Tồn kho</Text>
                            <Text style={[styles.summaryValue, { color: Colors.info }]}>
                                {formatShort(analytics.inventory_value ?? 0)}₫
                            </Text>
                            <Text style={styles.summaryMeta}>
                                ⚠️ {analytics.inventory_warning ?? 0} SP cần nhập
                            </Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Nhân viên</Text>
                            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                                {analytics.employees_active ?? 0}
                            </Text>
                            <Text style={styles.summaryMeta}>
                                KH: {analytics.customers_total ?? 0} ({analytics.new_customers ?? 0} mới)
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { gap: Spacing.md },
    header: {
        padding: Spacing.xxl, paddingTop: Spacing.xxxl,
        borderBottomLeftRadius: BorderRadius.xl, borderBottomRightRadius: BorderRadius.xl,
    },
    headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textInverse },
    headerSubtitle: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs },
    periodRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    periodChip: {
        flex: 1, paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg, alignItems: 'center',
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
        width: '48%', flexGrow: 1,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    kpiValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
    section: { paddingHorizontal: Spacing.lg },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
    summaryGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm,
    },
    summaryItem: {
        width: '48%', flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    summaryValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] as any },
    summaryMeta: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.xxl },
});
