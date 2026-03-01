// Step 3: Review & Submit quote
import { useState, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, Pressable, StyleSheet, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../../constants/colors';
import { useQuoteDraftStore } from '../../../lib/stores/quote-draft';
import { useCreateQuote } from '../../../lib/hooks/useQuotes';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../../../lib/haptics';
import ConfirmModal from '../../../components/ConfirmModal';
import { useNetworkStatus, OfflineBanner } from '../../../components/OfflineBanner';

interface Props {
    onBack: () => void;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

// Success overlay with animated checkmark
function SuccessOverlay({ visible, onDone }: { visible: boolean; onDone: () => void }) {
    const [scaleAnim] = useState(new Animated.Value(0));

    if (visible) {
        Animated.spring(scaleAnim, {
            toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
        }).start(() => setTimeout(onDone, 800));
    }

    if (!visible) return null;

    return (
        <View style={successStyles.overlay}>
            <Animated.View style={[successStyles.circle, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check" size={48} color="#ffffff" />
            </Animated.View>
            <Animated.Text style={[successStyles.text, { opacity: scaleAnim }]}>
                Đã tạo báo giá thành công!
            </Animated.Text>
        </View>
    );
}

const successStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center', alignItems: 'center', zIndex: 100,
    },
    circle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.success, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    text: {
        marginTop: Spacing.lg, fontSize: FontSize.lg, fontWeight: '700',
        color: Colors.success,
    },
});

export default function ReviewStep({ onBack }: Props) {
    const store = useQuoteDraftStore();
    const router = useRouter();
    const createQuote = useCreateQuote();
    const { isConnected } = useNetworkStatus();

    // Modal states
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Memoize totals for performance
    const totalGuests = useMemo(() =>
        store.table_count * store.guests_per_table,
        [store.table_count, store.guests_per_table]
    );

    const handleSubmit = useCallback(async () => {
        // Offline guard
        if (!isConnected) {
            hapticError();
            setErrorMessage('Cần kết nối mạng để tạo báo giá. Vui lòng kiểm tra kết nối và thử lại.');
            return;
        }

        hapticMedium();
        try {
            await createQuote.mutateAsync({
                customer_name: store.customer_name,
                customer_phone: store.customer_phone,
                customer_email: store.customer_email,
                event_type: store.event_type,
                event_date: store.event_date || undefined,
                event_time: store.event_time || undefined,
                event_address: store.event_address || undefined,
                table_count: store.table_count,
                guest_count: store.table_count * store.guests_per_table,
                notes: store.notes || undefined,
                items: store.items.map((item) => ({
                    menu_item_id: item.menu_item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    note: item.note,
                })),
                discount_total_percent: store.discount_total_percent,
                is_vat_inclusive: store.is_vat_inclusive,
                vat_rate: store.vat_rate,
            });
            hapticSuccess();
            setShowSuccess(true);
        } catch (error: any) {
            hapticError();
            setErrorMessage(error?.message || 'Không thể tạo báo giá. Vui lòng thử lại.');
        }
    }, [isConnected, store, createQuote]);

    const handleSuccessDone = useCallback(() => {
        store.reset();
        router.back();
    }, [store, router]);

    return (
        <View style={{ flex: 1 }}>
            <OfflineBanner />
            <SuccessOverlay visible={showSuccess} onDone={handleSuccessDone} />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Customer Info */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="person" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
                    </View>
                    <Text style={styles.infoText}>{store.customer_name}</Text>
                    {store.customer_phone && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="phone" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>{store.customer_phone}</Text>
                        </View>
                    )}
                    {store.customer_email && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="email" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>{store.customer_email}</Text>
                        </View>
                    )}
                </View>

                {/* Event Info */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="celebration" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Thông tin tiệc</Text>
                    </View>
                    <Text style={styles.infoText}>{store.event_type}</Text>
                    {store.event_date && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>{store.event_date}</Text>
                        </View>
                    )}
                    {store.event_time && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>{store.event_time}</Text>
                        </View>
                    )}
                    {store.event_address && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>{store.event_address}</Text>
                        </View>
                    )}
                    {store.table_count > 0 && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="restaurant" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoTextSecondary}>
                                {store.table_count} bàn × {store.guests_per_table} khách = {totalGuests} khách
                            </Text>
                        </View>
                    )}
                </View>

                {/* Menu Items */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="restaurant-menu" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Thực đơn ({store.items.length} món)</Text>
                    </View>
                    {store.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.item_name}</Text>
                                <Text style={styles.itemMeta}>
                                    x{item.quantity} • {formatCurrency(item.unit_price)}/{item.uom || 'phần'}
                                </Text>
                            </View>
                            <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.section}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tạm tính</Text>
                        <Text style={styles.totalValue}>{formatCurrency(store.subtotal)}</Text>
                    </View>
                    {store.discount_amount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Giảm giá ({store.discount_total_percent}%)</Text>
                            <Text style={[styles.totalValue, { color: Colors.error }]}>
                                -{formatCurrency(store.discount_amount)}
                            </Text>
                        </View>
                    )}
                    {store.vat_amount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>VAT ({store.vat_rate}%)</Text>
                            <Text style={styles.totalValue}>{formatCurrency(store.vat_amount)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Thành tiền</Text>
                        <Text style={styles.grandTotalValue}>{formatCurrency(store.total_amount)}</Text>
                    </View>
                </View>

                {/* Notes */}
                {store.notes && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="notes" size={18} color={Colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                        </View>
                        <Text style={styles.notesText}>{store.notes}</Text>
                    </View>
                )}

                {/* Navigation */}
                <View style={styles.navRow}>
                    <Pressable
                        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticLight(); onBack(); }}
                        accessibilityLabel="Quay lại chọn món"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                    >
                        <Text style={styles.backBtnText}>← Quay lại</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.submitWrapper, pressed && { opacity: 0.85 }]}
                        onPress={handleSubmit}
                        disabled={createQuote.isPending}
                        accessibilityLabel="Tạo báo giá"
                        accessibilityRole="button"
                        accessibilityHint="Nhấn để gửi và tạo báo giá mới"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.submitGradient}
                        >
                            <Text style={styles.submitText}>
                                {createQuote.isPending ? 'Đang tạo…' : 'Tạo báo giá'}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Error Modal — replaces Alert.alert */}
            <ConfirmModal
                visible={!!errorMessage}
                title="Lỗi"
                message={errorMessage || ''}
                confirmText="Thử lại"
                cancelText="Đóng"
                onConfirm={() => { setErrorMessage(null); handleSubmit(); }}
                onCancel={() => setErrorMessage(null)}
                variant="danger"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
    infoTextSecondary: { fontSize: FontSize.sm, color: Colors.textSecondary },
    itemRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    itemInfo: { flex: 1, gap: 2 },
    itemName: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
    itemMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
    itemTotal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
    totalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    totalValue: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
    grandTotalRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
    grandTotalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    grandTotalValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary, fontVariant: ['tabular-nums'] },
    notesText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
    navRow: { flexDirection: 'row', gap: Spacing.md },
    backBtn: {
        flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        alignItems: 'center', backgroundColor: Colors.bgTertiary,
    },
    backBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary },
    submitWrapper: { flex: 2 },
    submitGradient: {
        paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center',
    },
    submitText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textInverse },
    bottomSpacer: { height: 40 },
});
