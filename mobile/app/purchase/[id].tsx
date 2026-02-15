// PR Detail Screen — View + Approve/Reject actions
import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: '⏳' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: '✅' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: '❌' },
    CONVERTED: { bg: '#eff6ff', text: Colors.info, label: 'Đã chuyển PO', icon: '🔄' },
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

export default function PRDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const approvePR = useApprovePR();
    const rejectPR = useRejectPR();
    const deletePR = useDeletePR();

    // Fetch all PRs and find the one we need (simpler than individual endpoint)
    const { data: allPRs = [], isLoading, refetch } = useQuery<PurchaseRequisition[]>({
        queryKey: ['purchase-requisitions'],
        queryFn: () => api.get('/procurement/requisitions'),
    });

    const pr = allPRs.find((p) => p.id === id);

    const isManager = user?.role?.code === 'SUPER_ADMIN' || user?.role?.code === 'ADMIN' || user?.role?.code === 'MANAGER';
    const isPending = pr?.status === 'PENDING';

    const handleApprove = () => {
        Alert.alert('Xác nhận', `Duyệt phiếu ${pr?.code}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Duyệt',
                style: 'default',
                onPress: async () => {
                    try {
                        await approvePR.mutateAsync(id!);
                        Alert.alert('Thành công', 'Đã duyệt phiếu yêu cầu');
                        refetch();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.message || 'Không thể duyệt');
                    }
                },
            },
        ]);
    };

    const handleReject = () => {
        Alert.alert('Xác nhận', `Từ chối phiếu ${pr?.code}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Từ chối',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await rejectPR.mutateAsync(id!);
                        Alert.alert('Đã từ chối', `Phiếu ${pr?.code} đã bị từ chối`);
                        refetch();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.message || 'Không thể từ chối');
                    }
                },
            },
        ]);
    };

    const handleDelete = () => {
        Alert.alert('Xóa phiếu', `Bạn chắc chắn muốn xóa ${pr?.code}?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deletePR.mutateAsync(id!);
                        router.back();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e?.message || 'Không thể xóa');
                    }
                },
            },
        ]);
    };

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!pr) {
        return (
            <View style={styles.loading}>
                <Text style={styles.errorText}>Không tìm thấy phiếu yêu cầu</Text>
            </View>
        );
    }

    const status = STATUS_CONFIG[pr.status] || STATUS_CONFIG.PENDING;
    const priority = PRIORITY_CONFIG[pr.priority] || PRIORITY_CONFIG.NORMAL;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header Card */}
            <View style={styles.headerCard}>
                <View style={styles.headerRow}>
                    <Text style={styles.prCode}>{pr.code}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={styles.statusIcon}>{status.icon}</Text>
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
                    <Text style={styles.dateText}>📅 {formatDate(pr.created_at)}</Text>
                </View>

                {pr.notes && (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>📝 Ghi chú</Text>
                        <Text style={styles.notesText}>{pr.notes}</Text>
                    </View>
                )}
            </View>

            {/* Items */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📦 Mặt hàng ({pr.lines?.length ?? 0})</Text>
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
                            <Text style={[styles.lineDetailValue, { color: Colors.primary, fontWeight: '700' }]}>
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
                            <TouchableOpacity
                                style={styles.rejectBtn}
                                onPress={handleReject}
                                disabled={rejectPR.isPending}
                            >
                                <Text style={styles.rejectBtnText}>
                                    {rejectPR.isPending ? 'Đang xử lý...' : '❌ Từ chối'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ flex: 1 }}
                                activeOpacity={0.8}
                                onPress={handleApprove}
                                disabled={approvePR.isPending}
                            >
                                <LinearGradient
                                    colors={[Colors.success, '#16a34a']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.approveBtn}
                                >
                                    <Text style={styles.approveBtnText}>
                                        {approvePR.isPending ? 'Đang duyệt...' : '✅ Duyệt'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={handleDelete}
                        disabled={deletePR.isPending}
                    >
                        <Text style={styles.deleteBtnText}>
                            {deletePR.isPending ? 'Đang xóa...' : '🗑️ Xóa phiếu'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
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
    },
    errorText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
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
    statusIcon: {
        fontSize: 14,
    },
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
    approveBtn: {
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    approveBtnText: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    rejectBtn: {
        flex: 1,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
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
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: Colors.error + '10',
    },
    deleteBtnText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.error,
    },
});
