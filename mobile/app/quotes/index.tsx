// Quote List — view quotes with status badges
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
import { useQuoteList, type Quote } from '../../lib/hooks/useQuotes';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: '📝' },
    SENT: { bg: '#eff6ff', text: Colors.info, label: 'Đã gửi', icon: '📧' },
    ACCEPTED: { bg: '#f0fdf4', text: Colors.success, label: 'Chấp nhận', icon: '✅' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: '❌' },
    CONVERTED: { bg: '#f5f3ff', text: '#7c3aed', label: 'Đã chuyển đơn', icon: '🔄' },
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function QuoteListScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const { data: quotes = [], isLoading, refetch } = useQuoteList();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const renderItem = ({ item }: { item: Quote }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/quotes/${item.id}`)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.quoteCode}>{item.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={styles.statusIcon}>{status.icon}</Text>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.customerName}>👤 {item.customer_name}</Text>
                    <View style={styles.cardMeta}>
                        <Text style={styles.metaText}>
                            {item.event_date ? formatDate(item.event_date) : 'Chưa có ngày'}
                            {item.guest_count ? ` · ${item.guest_count} khách` : ''}
                        </Text>
                        <Text style={styles.metaAmount}>{formatCurrency(item.final_amount ?? item.total_amount ?? 0)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={quotes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>📄</Text>
                            <Text style={styles.emptyTitle}>Chưa có báo giá</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
    list: { paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        overflow: 'hidden', shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.bgTertiary,
    },
    quoteCode: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    },
    statusIcon: { fontSize: 12 },
    statusText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardContent: { padding: Spacing.lg, gap: Spacing.xs },
    customerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
    metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    metaAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
});
