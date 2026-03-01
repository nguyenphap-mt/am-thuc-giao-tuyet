// Quote Detail — view items, totals, share
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Share, RefreshControl, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useQuoteDetail } from '../../lib/hooks/useQuotes';
import { hapticMedium } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: 'edit' },
    SENT: { bg: '#eff6ff', text: Colors.info, label: 'Đã gửi', icon: 'send' },
    ACCEPTED: { bg: '#f0fdf4', text: Colors.success, label: 'Chấp nhận', icon: 'check-circle' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: 'cancel' },
    CONVERTED: { bg: '#f5f3ff', text: '#7c3aed', label: 'Đã chuyển đơn', icon: 'sync' },
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

// Skeleton loader component
function SkeletonBlock({ width, height, style }: { width: number | string; height: number; style?: any }) {
    const [fadeAnim] = useState(new Animated.Value(0.3));

    useState(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0.3, duration: 750, useNativeDriver: true }),
            ])
        ).start();
    });

    return (
        <Animated.View
            style={[
                {
                    width, height, borderRadius: BorderRadius.sm,
                    backgroundColor: Colors.bgTertiary, opacity: fadeAnim,
                },
                style,
            ]}
        />
    );
}

function DetailSkeleton() {
    return (
        <View style={styles.content}>
            {/* Status banner skeleton */}
            <SkeletonBlock width="100%" height={52} style={{ borderRadius: BorderRadius.lg }} />

            {/* Info section skeleton */}
            <View style={styles.section}>
                <SkeletonBlock width={120} height={24} />
                <SkeletonBlock width="80%" height={18} style={{ marginTop: Spacing.sm }} />
                <SkeletonBlock width="60%" height={16} style={{ marginTop: Spacing.xs }} />
                <SkeletonBlock width="50%" height={16} style={{ marginTop: Spacing.xs }} />
            </View>

            {/* Items section skeleton */}
            <View style={styles.section}>
                <SkeletonBlock width={160} height={20} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.itemRow, { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <SkeletonBlock width="70%" height={16} />
                            <SkeletonBlock width="40%" height={14} />
                        </View>
                        <SkeletonBlock width={80} height={16} />
                    </View>
                ))}
            </View>

            {/* Totals skeleton */}
            <View style={styles.section}>
                <View style={styles.totalRow}>
                    <SkeletonBlock width={80} height={16} />
                    <SkeletonBlock width={100} height={18} />
                </View>
                <View style={styles.totalRow}>
                    <SkeletonBlock width={120} height={20} />
                    <SkeletonBlock width={120} height={24} />
                </View>
            </View>
        </View>
    );
}

export default function QuoteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data: quote, isLoading, refetch } = useQuoteDetail(id);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleShare = useCallback(async () => {
        if (!quote) return;
        try {
            await Share.share({
                message: `Báo giá ${quote.code}\nKhách: ${quote.customer_name}\nTổng: ${formatCurrency(quote.final_amount)}\nNgày: ${formatDate(quote.event_date)}`,
                title: `Báo giá ${quote.code}`,
            });
        } catch { }
    }, [quote]);

    if (isLoading || !quote) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <OfflineBanner />
                <ScrollView style={styles.container}>
                    <DetailSkeleton />
                </ScrollView>
            </SafeAreaView>
        );
    }

    const status = STATUS_CONFIG[quote.status] || STATUS_CONFIG.DRAFT;

    return (
        <SafeAreaView style={styles.safeArea}>
            <OfflineBanner />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary, Colors.primaryDark]}
                    />
                }
            >
                {/* Status */}
                <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={24} color={status.text} />
                    <Text style={[styles.statusLabel, { color: status.text }]}>{status.label}</Text>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={styles.quoteCode}>{quote.code}</Text>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="person" size={16} color={Colors.textSecondary} />
                        <Text style={styles.customerName}>{quote.customer_name}</Text>
                    </View>
                    {quote.event_date && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{formatDate(quote.event_date)}</Text>
                        </View>
                    )}
                    {quote.guest_count && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="restaurant" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{quote.guest_count} khách</Text>
                        </View>
                    )}
                    {quote.event_type && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="celebration" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{quote.event_type}</Text>
                        </View>
                    )}
                </View>

                {/* Items */}
                {quote.items && quote.items.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="restaurant-menu" size={18} color={Colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Thực đơn ({quote.items.length} món)</Text>
                        </View>
                        {quote.items.map((item, index) => (
                            <View key={item.id || index} style={styles.itemRow}>
                                <View style={styles.itemNameWrap}>
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
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="notes" size={18} color={Colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                        </View>
                        <Text style={styles.notesText}>{quote.notes}</Text>
                    </View>
                )}

                {/* Share Button */}
                <Pressable
                    style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
                    onPress={() => { hapticMedium(); handleShare(); }}
                    accessibilityLabel="Chia sẻ báo giá"
                    accessibilityRole="button"
                    accessibilityHint="Nhấn để chia sẻ thông tin báo giá qua ứng dụng khác"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.shareBtnGradient}
                    >
                        <View style={styles.shareRow}>
                            <MaterialIcons name="share" size={20} color={Colors.textInverse} />
                            <Text style={styles.shareBtnText}>Chia sẻ báo giá</Text>
                        </View>
                    </LinearGradient>
                </Pressable>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.lg,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
    shareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    itemNameWrap: { flex: 1 },
    bottomSpacer: { height: 40 },
});
