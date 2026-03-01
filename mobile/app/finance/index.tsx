// Finance Summary — Material Design 3
// UX Audit fixes: SafeArea, Skeleton, Offline, Accessibility, Dynamic insets
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
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
import { useFinanceDashboard, useRecentTransactions, type FinanceTransaction } from '../../lib/hooks/useFinance';
import { OfflineBanner } from '../../components/OfflineBanner';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatShort(amount: number): string {
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'tỷ';
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Transaction type colors — extracted from inline
const TX_COLORS = {
    RECEIPT_BG: '#e8f5e9',
    PAYMENT_BG: '#ffebee',
};

// Skeleton loader — animated shimmer
function FinanceSkeleton() {
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
        <View style={{ gap: Spacing.md }}>
            {/* KPI grid skeleton */}
            <View style={styles.kpiGrid}>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[styles.kpiCard, { borderLeftColor: Colors.bgTertiary }]}>
                        <View style={styles.kpiHeader}>
                            <B w={16} h={16} />
                            <B w={50} h={12} />
                        </View>
                        <B w={70} h={24} s={{ marginTop: 8 }} />
                    </View>
                ))}
            </View>
            {/* Transaction rows skeleton */}
            <View style={styles.section}>
                <B w={140} h={20} s={{ marginBottom: Spacing.md }} />
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[styles.txRow, { marginBottom: Spacing.sm }]}>
                        <B w={36} h={36} s={{ borderRadius: 18 }} />
                        <View style={{ flex: 1, gap: 4 }}>
                            <B w="70%" h={14} />
                            <B w="40%" h={10} />
                        </View>
                        <B w={60} h={16} />
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function FinanceScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useFinanceDashboard();
    const { data: transactions = [], isLoading: txLoading, refetch: refetchTx } = useRecentTransactions();

    const isLoading = dashLoading || txLoading;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchDash(), refetchTx()]);
        setRefreshing(false);
    }, [refetchDash, refetchTx]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ title: 'Tài chính', headerShown: true }} />
            <OfflineBanner />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary}
                        colors={[Colors.primary, Colors.primaryDark]} />
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
                        <MaterialIcons name="account-balance" size={28} color={Colors.textInverse} />
                        <View>
                            <Text style={styles.headerTitle}>Tài chính</Text>
                            <Text style={styles.headerSubtitle}>Tổng quan doanh thu & chi phí</Text>
                        </View>
                    </View>
                </LinearGradient>

                {isLoading && !refreshing ? (
                    <FinanceSkeleton />
                ) : (
                    <>
                        {/* KPI Grid */}
                        <View style={styles.kpiGrid}>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}
                                accessibilityLabel={`Doanh thu: ${formatShort(dashboard?.total_revenue ?? 0)} đồng`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="trending-up" size={16} color={Colors.success} />
                                    <Text style={styles.kpiLabel}>Doanh thu</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.success }]}>
                                    {formatShort(dashboard?.total_revenue ?? 0)}₫
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}
                                accessibilityLabel={`Chi phí: ${formatShort(dashboard?.total_expenses ?? 0)} đồng`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="trending-down" size={16} color={Colors.warning} />
                                    <Text style={styles.kpiLabel}>Chi phí</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.warning }]}>
                                    {formatShort(dashboard?.total_expenses ?? 0)}₫
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}
                                accessibilityLabel={`Lợi nhuận: ${formatShort(dashboard?.net_profit ?? 0)} đồng`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="savings" size={16} color={Colors.info} />
                                    <Text style={styles.kpiLabel}>Lợi nhuận</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.info }]}>
                                    {formatShort(dashboard?.net_profit ?? 0)}₫
                                </Text>
                            </View>
                            <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}
                                accessibilityLabel={`Công nợ: ${formatShort(dashboard?.total_receivables ?? 0)} đồng`}
                                accessibilityRole="text">
                                <View style={styles.kpiHeader}>
                                    <MaterialIcons name="account-balance-wallet" size={16} color={Colors.error} />
                                    <Text style={styles.kpiLabel}>Công nợ</Text>
                                </View>
                                <Text style={[styles.kpiValue, { color: Colors.error }]}>
                                    {formatShort(dashboard?.total_receivables ?? 0)}₫
                                </Text>
                            </View>
                        </View>

                        {/* Recent Transactions */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleRow}>
                                <MaterialIcons name="receipt-long" size={20} color={Colors.textPrimary} />
                                <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
                            </View>
                            {transactions.length === 0 ? (
                                <View style={styles.emptyTx}>
                                    <MaterialIcons name="receipt-long" size={40} color={Colors.textTertiary} />
                                    <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
                                    <Text style={styles.emptyText}>Giao dịch sẽ xuất hiện khi có thu/chi</Text>
                                </View>
                            ) : (
                                transactions.slice(0, 15).map((tx: FinanceTransaction) => {
                                    const isReceipt = tx.type === 'RECEIPT';
                                    const typeLabel = isReceipt ? 'Thu' : 'Chi';
                                    return (
                                        <View key={tx.id} style={styles.txRow}
                                            accessibilityLabel={`${typeLabel}: ${tx.description}, ${formatCurrency(tx.amount)}, ngày ${formatDate(tx.created_at)}${tx.category ? `, ${tx.category}` : ''}`}
                                            accessibilityRole="text">
                                            <View style={[
                                                styles.txIconCircle,
                                                { backgroundColor: isReceipt ? TX_COLORS.RECEIPT_BG : TX_COLORS.PAYMENT_BG },
                                            ]}>
                                                <MaterialIcons
                                                    name={isReceipt ? 'call-received' : 'call-made'}
                                                    size={16}
                                                    color={isReceipt ? Colors.success : Colors.error}
                                                />
                                            </View>
                                            <View style={styles.txContent}>
                                                <Text style={styles.txDesc} numberOfLines={1}>
                                                    {tx.description}
                                                </Text>
                                                <View style={styles.txMetaRow}>
                                                    <MaterialIcons name="event" size={12} color={Colors.textTertiary} />
                                                    <Text style={styles.txDate}>
                                                        {formatDate(tx.created_at)} {tx.category ? `· ${tx.category}` : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[
                                                styles.txAmount,
                                                { color: isReceipt ? Colors.success : Colors.error }
                                            ]}>
                                                {isReceipt ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
                        </View>
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
    headerRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    },
    headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textInverse },
    headerSubtitle: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    kpiGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg, gap: Spacing.sm,
    },
    kpiCard: {
        width: '48%' as any, flexGrow: 1,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    kpiHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    kpiValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
    section: { paddingHorizontal: Spacing.lg },
    sectionTitleRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md,
    },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyTx: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm,
    },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
    txRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.sm,
    },
    txIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    txContent: { flex: 1 },
    txDesc: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    txDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
    txAmount: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
