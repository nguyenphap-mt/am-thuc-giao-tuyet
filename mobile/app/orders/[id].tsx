// Order Detail — view order info + update status + photo documentation
import { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, Pressable, StyleSheet, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticMedium, hapticError } from '../../lib/haptics';
import { useOrderDetail, useUpdateOrderStatus } from '../../lib/hooks/useOrders';
import { useAuthStore } from '../../lib/auth-store';
import ConfirmModal from '../../components/ConfirmModal';
import PhotoGrid from '../../components/PhotoGrid';
import SignaturePad from '../../components/SignaturePad';
import VoiceNotePlayer from '../../components/VoiceNotePlayer';
import { usePhotoCapture } from '../../lib/hooks/usePhotoCapture';
import { useNetworkStatus, OfflineBanner } from '../../components/OfflineBanner';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    DRAFT: { bg: '#f1f5f9', text: Colors.textSecondary, label: 'Nháp', icon: 'edit' },
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ xác nhận', icon: 'schedule' },
    CONFIRMED: { bg: '#eff6ff', text: Colors.info, label: 'Đã xác nhận', icon: 'check-circle' },
    IN_PROGRESS: { bg: '#fef3c7', text: '#d97706', label: 'Đang thực hiện', icon: 'play-circle-filled' },
    COMPLETED: { bg: '#f0fdf4', text: Colors.success, label: 'Hoàn thành', icon: 'verified' },
    CANCELLED: { bg: '#fef2f2', text: Colors.error, label: 'Đã hủy', icon: 'cancel' },
};

const NEXT_STATUS: Record<string, { status: string; label: string }> = {
    CONFIRMED: { status: 'IN_PROGRESS', label: 'Bắt đầu thực hiện' },
    IN_PROGRESS: { status: 'COMPLETED', label: 'Hoàn thành đơn' },
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
        return new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return timeStr;
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
                <SkeletonBlock width={140} height={28} />
                <SkeletonBlock width="80%" height={18} style={{ marginTop: Spacing.sm }} />
                <SkeletonBlock width="60%" height={16} style={{ marginTop: Spacing.xs }} />
                <SkeletonBlock width="50%" height={16} style={{ marginTop: Spacing.xs }} />
                <SkeletonBlock width="40%" height={16} style={{ marginTop: Spacing.xs }} />
            </View>

            {/* Finance section skeleton */}
            <View style={styles.section}>
                <SkeletonBlock width={100} height={20} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.financeRow]}>
                        <SkeletonBlock width={80} height={16} />
                        <SkeletonBlock width={100} height={18} />
                    </View>
                ))}
            </View>

            {/* Items section skeleton */}
            <View style={styles.section}>
                <SkeletonBlock width={160} height={20} />
                {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <SkeletonBlock width="70%" height={16} />
                            <SkeletonBlock width={40} height={14} />
                        </View>
                        <SkeletonBlock width={80} height={16} />
                    </View>
                ))}
            </View>

            {/* Action button skeleton */}
            <SkeletonBlock width="100%" height={52} style={{ borderRadius: BorderRadius.lg }} />
        </View>
    );
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: order, isLoading, refetch } = useOrderDetail(id);
    const updateStatus = useUpdateOrderStatus();
    const { isConnected } = useNetworkStatus();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showOfflineError, setShowOfflineError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const { photos, loading: photoLoading, takePhoto, pickFromGallery, removePhoto } = usePhotoCapture();

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';
    const canAdvance = order && NEXT_STATUS[order.status];

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleStatusUpdate = useCallback(() => {
        if (!order || !canAdvance) return;
        // Offline guard
        if (!isConnected) {
            hapticError();
            setShowOfflineError(true);
            return;
        }
        hapticMedium();
        setShowConfirmModal(true);
    }, [order, canAdvance, isConnected]);

    const confirmStatusUpdate = useCallback(() => {
        if (!order || !canAdvance) return;
        const next = NEXT_STATUS[order.status];
        updateStatus.mutate(
            { id: order.id, status: next.status },
            {
                onSuccess: () => setShowConfirmModal(false),
                onError: () => {
                    hapticError();
                    setShowConfirmModal(false);
                },
            }
        );
    }, [order, canAdvance, updateStatus]);

    if (isLoading || !order) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <OfflineBanner />
                <ScrollView style={styles.container}>
                    <DetailSkeleton />
                </ScrollView>
            </SafeAreaView>
        );
    }

    const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
    const balance = order.final_amount - order.paid_amount;

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
                {/* Header Status */}
                <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={24} color={status.text} />
                    <Text style={[styles.statusBannerText, { color: status.text }]}>
                        {status.label}
                    </Text>
                </View>

                {/* Order Info */}
                <View style={styles.section}>
                    <Text style={styles.orderCode}>{order.code}</Text>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="person" size={16} color={Colors.textSecondary} />
                        <Text style={styles.customerName}>{order.customer_name}</Text>
                    </View>
                    {order.customer_phone && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="phone" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{order.customer_phone}</Text>
                        </View>
                    )}
                    {order.event_location && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{order.event_location}</Text>
                        </View>
                    )}
                    <View style={styles.dateRow}>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{formatDate(order.event_date)}</Text>
                        </View>
                        {(order.event_time_start || order.event_time_end) && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                                <Text style={styles.infoText}>
                                    {formatTime(order.event_time_start)}
                                    {order.event_time_end ? ` — ${formatTime(order.event_time_end)}` : ''}
                                </Text>
                            </View>
                        )}
                    </View>
                    {order.guest_count && (
                        <View style={styles.infoRow}>
                            <MaterialIcons name="restaurant" size={14} color={Colors.textSecondary} />
                            <Text style={styles.infoText}>{order.guest_count} khách</Text>
                        </View>
                    )}
                </View>

                {/* Financial Summary */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="account-balance" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Tài chính</Text>
                    </View>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Tổng tiền</Text>
                        <Text style={styles.financeAmount}>{formatCurrency(order.final_amount)}</Text>
                    </View>
                    <View style={styles.financeRow}>
                        <Text style={styles.financeLabel}>Đã thanh toán</Text>
                        <Text style={[styles.financeAmount, { color: Colors.success }]}>
                            {formatCurrency(order.paid_amount)}
                        </Text>
                    </View>
                    <View style={[styles.financeRow, styles.financeTotal]}>
                        <Text style={styles.financeTotalLabel}>Còn lại</Text>
                        <Text style={[styles.financeTotalAmount, { color: balance > 0 ? Colors.error : Colors.success }]}>
                            {formatCurrency(balance)}
                        </Text>
                    </View>
                </View>

                {/* Menu Items */}
                {order.items && order.items.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="restaurant-menu" size={18} color={Colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Thực đơn ({order.items.length} món)</Text>
                        </View>
                        {order.items.map((item, index) => (
                            <View key={item.id || index} style={styles.menuItem}>
                                <View style={styles.menuItemLeft}>
                                    <Text style={styles.menuItemName}>{item.menu_item_name}</Text>
                                    <Text style={styles.menuItemQty}>x{item.quantity}</Text>
                                </View>
                                <Text style={styles.menuItemPrice}>
                                    {formatCurrency(item.total_price)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Notes */}
                {order.notes && (
                    <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="notes" size={18} color={Colors.textPrimary} />
                            <Text style={styles.sectionTitle}>Ghi chú</Text>
                        </View>
                        <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                )}

                {/* F6: Photo Documentation */}
                <View style={styles.section}>
                    <PhotoGrid
                        photos={photos}
                        loading={photoLoading}
                        onTakePhoto={takePhoto}
                        onPickGallery={pickFromGallery}
                        onRemovePhoto={removePhoto}
                        maxPhotos={10}
                    />
                </View>

                {/* F11: Signature Capture (for delivery/completion) */}
                {order.status === 'IN_PROGRESS' && (
                    <View style={styles.section}>
                        <SignaturePad
                            onSave={(_sig) => {
                                // Store signature data for delivery confirmation
                            }}
                        />
                    </View>
                )}

                {/* Action Button */}
                {canAdvance && (
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.85 }]}
                        onPress={handleStatusUpdate}
                        disabled={updateStatus.isPending}
                        accessibilityLabel={NEXT_STATUS[order.status].label}
                        accessibilityRole="button"
                        accessibilityHint="Nhấn để chuyển trạng thái đơn hàng"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <LinearGradient
                            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.actionButtonGradient}
                        >
                            <Text style={styles.actionButtonText}>
                                {updateStatus.isPending ? 'Đang xử lý…' : NEXT_STATUS[order.status].label}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Confirm Status Update Modal */}
            {canAdvance && order && (
                <ConfirmModal
                    visible={showConfirmModal}
                    title="Xác nhận cập nhật"
                    message={`Bạn muốn chuyển đơn sang "${NEXT_STATUS[order.status].label}"?`}
                    confirmText="Xác nhận"
                    cancelText="Hủy"
                    onConfirm={confirmStatusUpdate}
                    onCancel={() => setShowConfirmModal(false)}
                    isLoading={updateStatus.isPending}
                />
            )}

            {/* Offline Error Modal */}
            <ConfirmModal
                visible={showOfflineError}
                title="Không có kết nối"
                message="Cần kết nối mạng để cập nhật trạng thái đơn hàng. Vui lòng kiểm tra kết nối và thử lại."
                confirmText="Đã hiểu"
                cancelText="Đóng"
                onConfirm={() => setShowOfflineError(false)}
                onCancel={() => setShowOfflineError(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    // Status banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    statusBannerText: { fontSize: FontSize.lg, fontWeight: '700' },
    // Sections
    section: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    orderCode: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    customerName: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    infoText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    dateRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    // Finance
    financeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    financeLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    financeAmount: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    financeTotal: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.xs,
        paddingTop: Spacing.sm,
    },
    financeTotalLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    financeTotalAmount: {
        fontSize: FontSize.lg,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    // Menu items
    menuItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    menuItemLeft: { flex: 1, flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    menuItemName: { fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1 },
    menuItemQty: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    menuItemPrice: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    // Notes
    notesText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
    // Action button
    actionButton: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionButtonGradient: {
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    bottomSpacer: { height: 40 },
});
