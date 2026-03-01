// Quote List — Material Design 3
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useQuoteList, type Quote } from '../../lib/hooks/useQuotes';
import { hapticLight, hapticMedium } from '../../lib/haptics';
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

    const renderItem = useCallback(({ item }: { item: Quote }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT;

        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => { hapticLight(); router.push(`/quotes/${item.id}`); }}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                accessibilityRole="button"
                accessibilityLabel={`Báo giá ${item.code}, khách hàng ${item.customer_name}, ${status.label}, ${formatCurrency(item.final_amount ?? item.total_amount ?? 0)}`}
                accessibilityHint="Nhấn để xem chi tiết báo giá"
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.quoteCode}>{item.code}</Text>
                    <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                        <MaterialIcons name={status.icon} size={12} color={status.text} />
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.metaRow}>
                        <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                        <Text style={styles.customerName}>{item.customer_name}</Text>
                    </View>
                    <View style={styles.cardMeta}>
                        <View style={styles.metaRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>
                                {item.event_date ? formatDate(item.event_date) : 'Chưa có ngày'}
                                {item.guest_count ? ` · ${item.guest_count} khách` : ''}
                            </Text>
                        </View>
                        <Text style={styles.metaAmount}>{formatCurrency(item.final_amount ?? item.total_amount ?? 0)}</Text>
                    </View>
                </View>
            </Pressable>
        );
    }, [router]);

    const keyExtractor = useCallback((item: Quote) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />
            <View style={styles.container}>
                <FlatList
                    data={quotes}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
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
                                <MaterialIcons name="request-quote" size={56} color={Colors.textTertiary} />
                                <Text style={styles.emptyTitle}>Chưa có báo giá</Text>
                                <Text style={styles.emptySubtitle}>Nhấn nút + để tạo báo giá mới</Text>
                            </View>
                        ) : null
                    }
                />

                {/* FAB — Create Quote */}
                <Pressable
                    style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
                    onPress={() => { hapticMedium(); router.push('/quotes/create'); }}
                    accessibilityLabel="Tạo báo giá mới"
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary, padding: Spacing.lg },
    list: { paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        overflow: 'hidden', shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.bgTertiary,
    },
    quoteCode: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.sm,
    },
    statusText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardContent: { padding: Spacing.lg, gap: Spacing.xs },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    customerName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
    metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    metaAmount: { fontSize: FontSize.md, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptySubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
    fab: {
        position: 'absolute', bottom: 100, right: Spacing.xl,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    fabGradient: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
    },
});
