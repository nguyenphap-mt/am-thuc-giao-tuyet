// Quote Detail — view items, totals, share
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useQuoteDetail } from '../../lib/hooks/useQuotes';

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
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function QuoteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: quote, isLoading } = useQuoteDetail(id);

    const handleShare = async () => {
        if (!quote) return;
        try {
            await Share.share({
                message: `Báo giá ${quote.code}\nKhách: ${quote.customer_name}\nTổng: ${formatCurrency(quote.final_amount)}\nNgày: ${formatDate(quote.event_date)}`,
                title: `Báo giá ${quote.code}`,
            });
        } catch { }
    };

    if (isLoading || !quote) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.DRAFT;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Status */}
            <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                <Text style={styles.statusIcon}>{status.icon}</Text>
                <Text style={[styles.statusLabel, { color: status.text }]}>{status.label}</Text>
            </View>

            {/* Info */}
            <View style={styles.section}>
                <Text style={styles.quoteCode}>{quote.code}</Text>
                <Text style={styles.customerName}>👤 {quote.customer_name}</Text>
                {quote.event_date && <Text style={styles.infoText}>📅 {formatDate(quote.event_date)}</Text>}
                {quote.guest_count && <Text style={styles.infoText}>🍽️ {quote.guest_count} khách</Text>}
                {quote.event_type && <Text style={styles.infoText}>🎉 {quote.event_type}</Text>}
            </View>

            {/* Items */}
            {quote.items && quote.items.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🍲 Thực đơn ({quote.items.length} món)</Text>
                    {quote.items.map((item, index) => (
                        <View key={item.id || index} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.menu_item_name}</Text>
                                <Text style={styles.itemQty}>x{item.quantity} • {formatCurrency(item.unit_price)}/món</Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Totals */}
            <View style={styles.section}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tổng tiền</Text>
                    <Text style={styles.totalValue}>{formatCurrency(quote.total_amount)}</Text>
                </View>
                {quote.discount_amount > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Giảm giá</Text>
                        <Text style={[styles.totalValue, { color: Colors.error }]}>-{formatCurrency(quote.discount_amount)}</Text>
                    </View>
                )}
                <View style={[styles.totalRow, styles.grandTotal]}>
                    <Text style={styles.grandTotalLabel}>Thành tiền</Text>
                    <Text style={styles.grandTotalValue}>{formatCurrency(quote.final_amount)}</Text>
                </View>
            </View>

            {/* Notes */}
            {quote.notes && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
                    <Text style={styles.notesText}>{quote.notes}</Text>
                </View>
            )}

            {/* Share Button */}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.shareBtnGradient}
                >
                    <Text style={styles.shareBtnText}>📤 Chia sẻ báo giá</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg,
    },
    statusIcon: { fontSize: 24 },
    statusLabel: { fontSize: FontSize.lg, fontWeight: '700' },
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
    quoteCode: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, fontVariant: ['tabular-nums'] },
    customerName: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary },
    infoText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    itemRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    itemName: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
    itemQty: { fontSize: FontSize.xs, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    itemTotal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
    totalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    totalValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    grandTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
    grandTotalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    grandTotalValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary, fontVariant: ['tabular-nums'] },
    notesText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
    shareBtn: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    shareBtnGradient: { paddingVertical: Spacing.lg, borderRadius: BorderRadius.lg, alignItems: 'center' },
    shareBtnText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textInverse },
});
