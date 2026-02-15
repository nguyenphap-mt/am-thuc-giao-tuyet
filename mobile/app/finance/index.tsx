// Finance Summary — KPI + transactions + quick expense
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useFinanceDashboard, useRecentTransactions, type FinanceTransaction } from '../../lib/hooks/useFinance';

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

export default function FinanceScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const { data: dashboard, refetch: refetchDash } = useFinanceDashboard();
    const { data: transactions = [], refetch: refetchTx } = useRecentTransactions();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchDash(), refetchTx()]);
        setRefreshing(false);
    }, [refetchDash, refetchTx]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
        >
            {/* Header */}
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>💰 Tài chính</Text>
                <Text style={styles.headerSubtitle}>Tổng quan doanh thu & chi phí</Text>
            </LinearGradient>

            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
                    <Text style={styles.kpiLabel}>Doanh thu</Text>
                    <Text style={[styles.kpiValue, { color: Colors.success }]}>
                        {formatShort(dashboard?.total_revenue ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.warning }]}>
                    <Text style={styles.kpiLabel}>Chi phí</Text>
                    <Text style={[styles.kpiValue, { color: Colors.warning }]}>
                        {formatShort(dashboard?.total_expenses ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.info }]}>
                    <Text style={styles.kpiLabel}>Lợi nhuận</Text>
                    <Text style={[styles.kpiValue, { color: Colors.info }]}>
                        {formatShort(dashboard?.net_profit ?? 0)}₫
                    </Text>
                </View>
                <View style={[styles.kpiCard, { borderLeftColor: Colors.error }]}>
                    <Text style={styles.kpiLabel}>Công nợ</Text>
                    <Text style={[styles.kpiValue, { color: Colors.error }]}>
                        {formatShort(dashboard?.total_receivables ?? 0)}₫
                    </Text>
                </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📜 Giao dịch gần đây</Text>
                {transactions.length === 0 ? (
                    <View style={styles.emptyTx}>
                        <Text style={styles.emptyText}>Chưa có giao dịch</Text>
                    </View>
                ) : (
                    transactions.slice(0, 15).map((tx: FinanceTransaction) => (
                        <View key={tx.id} style={styles.txRow}>
                            <View style={styles.txLeft}>
                                <Text style={styles.txIcon}>
                                    {tx.type === 'RECEIPT' ? '📥' : '📤'}
                                </Text>
                                <View>
                                    <Text style={styles.txDesc} numberOfLines={1}>
                                        {tx.description}
                                    </Text>
                                    <Text style={styles.txDate}>
                                        {formatDate(tx.created_at)} {tx.category ? `· ${tx.category}` : ''}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[
                                styles.txAmount,
                                { color: tx.type === 'RECEIPT' ? Colors.success : Colors.error }
                            ]}>
                                {tx.type === 'RECEIPT' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

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
    kpiGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg, gap: Spacing.sm,
    },
    kpiCard: {
        width: '48%', flexGrow: 1,
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderLeftWidth: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    kpiValue: { fontSize: FontSize.xl, fontWeight: '800', marginTop: Spacing.xs, fontVariant: ['tabular-nums'] },
    section: { paddingHorizontal: Spacing.lg },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md },
    emptyTx: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.xxl, alignItems: 'center',
    },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
    txRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
    },
    txLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    txIcon: { fontSize: 18 },
    txDesc: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
    txDate: { fontSize: FontSize.xs, color: Colors.textTertiary },
    txAmount: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
