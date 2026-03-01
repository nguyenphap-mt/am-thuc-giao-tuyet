// PR Detail Screen — View + Approve/Reject actions
// UX Audit fixes: Custom Modal, A11y, Haptics, Skeleton, SafeArea, Offline
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
    Animated,
    Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useApprovePR,
    useRejectPR,
    useDeletePR,
    type PurchaseRequisition,
} from '../../lib/hooks/usePurchase';
import { useAuthStore } from '../../lib/auth-store';
import { OfflineBanner, useNetworkStatus } from '../../components/OfflineBanner';
import { hapticLight, hapticMedium, hapticWarning } from '../../lib/haptics';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: 'check-circle' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: 'cancel' },
    CONVERTED: { bg: '#eff6ff', text: Colors.info, label: 'Đã chuyển PO', icon: 'sync' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Thấp', color: Colors.textTertiary },
    NORMAL: { label: 'Bình thường', color: Colors.info },
    HIGH: { label: 'Cao', color: Colors.warning },
    URGENT: { label: 'Khẩn cấp', color: Colors.error },
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// --- Skeleton ---
function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ]),
        ).start();
    }, [shimmer]);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
    return (
        <Animated.View
            style={[{ width: width as any, height, backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.sm, opacity }, style]}
        />
    );
}

const DetailSkeleton = React.memo(function DetailSkeleton() {
    return (
        <View style={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.headerRow}>
                    <SkeletonBox width={120} height={20} />
                    <SkeletonBox width={80} height={24} style={{ borderRadius: BorderRadius.sm }} />
                </View>
                <SkeletonBox width="80%" height={24} style={{ marginTop: Spacing.sm }} />
                <SkeletonBox width="50%" height={16} style={{ marginTop: Spacing.sm }} />
            </View>
            <SkeletonBox width={150} height={18} style={{ marginTop: Spacing.md }} />
            {[0, 1, 2].map(i => (
                <View key={i} style={[styles.lineCard, { gap: Spacing.sm }]}>
                    <SkeletonBox width="70%" height={16} />
                    <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                        <SkeletonBox width={60} height={14} />
                        <SkeletonBox width={80} height={14} />
                        <SkeletonBox width={80} height={14} />
                    </View>
                </View>
            ))}
        </View>
    );
});

// --- Confirm Modal ---
function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel,
    confirmColor,
    isDestructive,
    loading,
    onConfirm,
    onCancel,
}: {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    isDestructive?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <MaterialIcons
                        name={isDestructive ? 'warning' : 'help-outline'}
                        size={40}
                        color={confirmColor}
                        style={styles.modalIcon}
                    />
                    <Text style={styles.modalTitle}>{title}</Text>
                    <Text style={styles.modalMessage}>{message}</Text>
                    <View style={styles.modalActions}>
                        <Pressable
                            style={styles.modalCancelBtn}
                            onPress={() => { hapticLight(); onCancel(); }}
                            accessibilityLabel="Hủy"
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <Text style={styles.modalCancelText}>Hủy</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.modalConfirmBtn, { backgroundColor: confirmColor }]}
                            onPress={() => { hapticMedium(); onConfirm(); }}
                            disabled={loading}
                            accessibilityLabel={confirmLabel}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                            <Text style={styles.modalConfirmText}>
                                {loading ? 'Đang xử lý…' : confirmLabel}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// --- Result Toast ---
function ResultToast({
    visible,
    success,
    message,
}: {
    visible: boolean;
    success: boolean;
    message: string;
}) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.delay(2000),
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, fadeAnim]);

    if (!visible) return null;
    return (
        <Animated.View style={[styles.toast, { opacity: fadeAnim, backgroundColor: success ? Colors.success : Colors.error }]}>
            <MaterialIcons name={success ? 'check-circle' : 'error'} size={18} color="#fff" />
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
}

// --- Main Screen ---
export default function PRDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { isConnected } = useNetworkStatus();

    const approvePR = useApprovePR();
    const rejectPR = useRejectPR();
    const deletePR = useDeletePR();

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        type: 'approve' | 'reject' | 'delete';
    }>({ visible: false, type: 'approve' });

    const [toast, setToast] = useState<{ visible: boolean; success: boolean; message: string }>({
        visible: false, success: true, message: '',
    });

    const showToast = useCallback((success: boolean, message: string) => {
        setToast({ visible: true, success, message });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
    }, []);

    const { data: allPRs = [], isLoading, refetch } = useQuery<PurchaseRequisition[]>({
        queryKey: ['purchase-requisitions'],
        queryFn: () => api.get('/procurement/requisitions'),
    });

    const pr = allPRs.find((p) => p.id === id);

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';
    const isPending = pr?.status === 'PENDING';

    const handleConfirmAction = useCallback(async () => {
        if (!isConnected) {
            hapticWarning();
            showToast(false, 'Cần kết nối mạng để thực hiện');
            setConfirmModal({ visible: false, type: 'approve' });
            return;
        }

        try {
            switch (confirmModal.type) {
                case 'approve':
                    await approvePR.mutateAsync(id!);
                    showToast(true, 'Đã duyệt phiếu yêu cầu');
                    break;
                case 'reject':
                    await rejectPR.mutateAsync(id!);
                    showToast(true, 'Đã từ chối phiếu yêu cầu');
                    break;
                case 'delete':
                    await deletePR.mutateAsync(id!);
                    showToast(true, 'Đã xóa phiếu');
                    router.back();
                    return;
            }
            refetch();
        } catch (e: any) {
            hapticWarning();
            showToast(false, e?.message || 'Không thể thực hiện');
        }
        setConfirmModal({ visible: false, type: 'approve' });
    }, [confirmModal.type, id, isConnected, approvePR, rejectPR, deletePR, refetch, router, showToast]);

    if (isLoading) {
        return (
            <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
                <DetailSkeleton />
            </ScrollView>
        );
    }

    if (!pr) {
        return (
            <View style={[styles.loading, { paddingTop: insets.top }]}>
                <MaterialIcons name="search-off" size={56} color={Colors.textTertiary} />
                <Text style={styles.errorText}>Không tìm thấy phiếu yêu cầu</Text>
            </View>
        );
    }

    const status = STATUS_CONFIG[pr.status] || STATUS_CONFIG.PENDING;
    const priority = PRIORITY_CONFIG[pr.priority] || PRIORITY_CONFIG.NORMAL;

    const confirmConfig = {
        approve: { title: 'Xác nhận duyệt', message: `Duyệt phiếu ${pr.code}?`, label: 'Duyệt', color: Colors.success, destructive: false },
        reject: { title: 'Xác nhận từ chối', message: `Từ chối phiếu ${pr.code}?`, label: 'Từ chối', color: Colors.error, destructive: true },
        delete: { title: 'Xóa phiếu', message: `Bạn chắc chắn muốn xóa ${pr.code}? Hành động này không thể hoàn tác.`, label: 'Xóa', color: Colors.error, destructive: true },
    };

    const currentConfirm = confirmConfig[confirmModal.type];

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <OfflineBanner />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.headerRow}>
                        <Text style={styles.prCode}>{pr.code}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <MaterialIcons name={status.icon} size={14} color={status.text} />
                            <Text style={[styles.statusText, { color: status.text }]}>
                                {status.label}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.prTitle}>{pr.title}</Text>

                    <View style={styles.metaRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '18' }]}>
                            <Text style={[styles.priorityText, { color: priority.color }]}>
                                ● {priority.label}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                            <Text style={styles.dateText}>{formatDate(pr.created_at)}</Text>
                        </View>
                    </View>

                    {pr.notes && (
                        <View style={styles.notesBox}>
                            <View style={styles.infoRow}>
                                <MaterialIcons name="notes" size={14} color={Colors.textSecondary} />
                                <Text style={styles.notesLabel}>Ghi chú</Text>
                            </View>
                            <Text style={styles.notesText}>{pr.notes}</Text>
                        </View>
                    )}
                </View>

                {/* Items */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="inventory-2" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Mặt hàng ({pr.lines?.length ?? 0})</Text>
                    </View>
                </View>

                {pr.lines?.map((line, i) => (
                    <View key={line.id || i} style={styles.lineCard}>
                        <View style={styles.lineHeader}>
                            <Text style={styles.lineName} numberOfLines={2}>
                                {line.item_name}
                            </Text>
                            {line.item_sku && (
                                <Text style={styles.lineSku}>SKU: {line.item_sku}</Text>
                            )}
                        </View>
                        <View style={styles.lineDetails}>
                            <View style={styles.lineDetail}>
                                <Text style={styles.lineDetailLabel}>Số lượng</Text>
                                <Text style={styles.lineDetailValue}>
                                    {line.quantity} {line.uom || ''}
                                </Text>
                            </View>
                            <View style={styles.lineDetail}>
                                <Text style={styles.lineDetailLabel}>Đơn giá</Text>
                                <Text style={styles.lineDetailValue}>
                                    {formatCurrency(line.estimated_unit_price)}
                                </Text>
                            </View>
                            <View style={styles.lineDetail}>
                                <Text style={styles.lineDetailLabel}>Thành tiền</Text>
                                <Text style={[styles.lineDetailValue, styles.lineTotal]}>
                                    {formatCurrency(line.estimated_total || line.quantity * line.estimated_unit_price)}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Total */}
                <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Tổng cộng</Text>
                    <Text style={styles.totalAmount}>{formatCurrency(pr.total_amount)}</Text>
                </View>

                {/* Actions */}
                {isPending && (
                    <View style={styles.actionsSection}>
                        {isManager && (
                            <View style={styles.actionsRow}>
                                <Pressable
                                    style={({ pressed }) => [styles.rejectBtn, pressed && styles.pressed]}
                                    onPress={() => { hapticLight(); setConfirmModal({ visible: true, type: 'reject' }); }}
                                    disabled={rejectPR.isPending}
                                    accessibilityLabel="Từ chối phiếu yêu cầu"
                                    accessibilityRole="button"
                                    accessibilityHint="Mở hộp thoại xác nhận từ chối"
                                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                                >
                                    <MaterialIcons name="close" size={18} color={Colors.textPrimary} />
                                    <Text style={styles.rejectBtnText}>Từ chối</Text>
                                </Pressable>

                                <Pressable
                                    style={({ pressed }) => [styles.approveBtnWrap, pressed && styles.pressed]}
                                    onPress={() => { hapticLight(); setConfirmModal({ visible: true, type: 'approve' }); }}
                                    disabled={approvePR.isPending}
                                    accessibilityLabel="Duyệt phiếu yêu cầu"
                                    accessibilityRole="button"
                                    accessibilityHint="Mở hộp thoại xác nhận duyệt"
                                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                                >
                                    <LinearGradient
                                        colors={[Colors.success, '#16a34a']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.approveBtn}
                                    >
                                        <MaterialIcons name="check" size={18} color={Colors.textInverse} />
                                        <Text style={styles.approveBtnText}>Duyệt</Text>
                                    </LinearGradient>
                                </Pressable>
                            </View>
                        )}

                        <Pressable
                            style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                            onPress={() => { hapticWarning(); setConfirmModal({ visible: true, type: 'delete' }); }}
                            disabled={deletePR.isPending}
                            accessibilityLabel="Xóa phiếu yêu cầu"
                            accessibilityRole="button"
                            accessibilityHint="Mở hộp thoại xác nhận xóa"
                            android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
                        >
                            <MaterialIcons name="delete-outline" size={16} color={Colors.error} />
                            <Text style={styles.deleteBtnText}>Xóa phiếu</Text>
                        </Pressable>
                    </View>
                )}

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Confirm Modal */}
            <ConfirmModal
                visible={confirmModal.visible}
                title={currentConfirm.title}
                message={currentConfirm.message}
                confirmLabel={currentConfirm.label}
                confirmColor={currentConfirm.color}
                isDestructive={currentConfirm.destructive}
                loading={approvePR.isPending || rejectPR.isPending || deletePR.isPending}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmModal({ visible: false, type: 'approve' })}
            />

            {/* Result Toast */}
            <ResultToast visible={toast.visible} success={toast.success} message={toast.message} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.bgSecondary,
        gap: Spacing.md,
    },
    errorText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    // Header
    headerCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    prCode: {
        fontSize: FontSize.lg,
        fontWeight: '800',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    statusText: {
        fontSize: FontSize.sm,
        fontWeight: '700',
    },
    prTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        lineHeight: 28,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    priorityBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    priorityText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    dateText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    notesBox: {
        backgroundColor: Colors.bgTertiary,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        gap: 4,
    },
    notesLabel: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    notesText: {
        fontSize: FontSize.sm,
        color: Colors.textPrimary,
        lineHeight: 20,
    },
    // Section
    sectionHeader: {
        marginTop: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    // Line Items
    lineCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    lineHeader: {
        gap: 2,
    },
    lineName: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    lineSku: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
    },
    lineDetails: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    lineDetail: {
        flex: 1,
        gap: 2,
    },
    lineDetailLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
    },
    lineDetailValue: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    lineTotal: {
        color: Colors.primary,
        fontWeight: '700',
    },
    // Total
    totalCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        borderWidth: 1.5,
        borderColor: Colors.primary + '30',
    },
    totalLabel: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    totalAmount: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    // Actions
    actionsSection: {
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    approveBtnWrap: {
        flex: 1,
    },
    approveBtn: {
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    approveBtnText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.bgTertiary,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rejectBtnText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    deleteBtn: {
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.error + '10',
    },
    deleteBtnText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.error,
    },
    bottomSpacer: { height: 40 },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        width: '100%',
        maxWidth: 360,
        alignItems: 'center',
        gap: Spacing.md,
    },
    modalIcon: {
        marginBottom: Spacing.xs,
    },
    modalTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.sm,
        width: '100%',
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        backgroundColor: Colors.bgTertiary,
    },
    modalCancelText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    modalConfirmBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    modalConfirmText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    // Toast
    toast: {
        position: 'absolute',
        bottom: 100,
        left: Spacing.xl,
        right: Spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md,
    },
    toastText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
});
