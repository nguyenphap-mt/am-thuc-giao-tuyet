// HR Leave Management — request list + create/approve
// UX Audit fixes: SafeArea, Skeleton, Offline, ConfirmModal, SuccessOverlay, useCallback, a11y
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    TextInput,
    StyleSheet,
    RefreshControl,
    Modal,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useLeaveRequests,
    useCreateLeaveRequest,
    useApproveLeave,
    useRejectLeave,
    type LeaveRequest,
} from '../../lib/hooks/useHR';
import { useAuthStore } from '../../lib/auth-store';
import { OfflineBanner } from '../../components/OfflineBanner';
import ConfirmModal from '../../components/ConfirmModal';
import { hapticLight, hapticSuccess, hapticWarning } from '../../lib/haptics';
import { useNetworkStatus } from '../../lib/offline/network-monitor';

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: 'schedule' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: 'check-circle' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: 'cancel' },
};

const LEAVE_TYPES: Record<string, string> = {
    ANNUAL: 'Nghỉ phép năm',
    SICK: 'Nghỉ ốm',
    PERSONAL: 'Việc cá nhân',
    MATERNITY: 'Thai sản',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Inline SuccessOverlay — animated checkmark + message
function SuccessOverlay({ visible, message, onDone }: { visible: boolean; message: string; onDone: () => void }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
            const t = setTimeout(() => { scaleAnim.setValue(0); onDone(); }, 1500);
            return () => clearTimeout(t);
        }
        scaleAnim.setValue(0);
    }, [visible, scaleAnim, onDone]);

    if (!visible) return null;
    return (
        <View style={successStyles.overlay}>
            <Animated.View style={[successStyles.circle, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check" size={40} color="#fff" />
            </Animated.View>
            <Animated.Text style={[successStyles.text, { opacity: scaleAnim }]}>{message}</Animated.Text>
        </View>
    );
}

const successStyles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    circle: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center',
    },
    text: {
        marginTop: Spacing.lg, fontSize: FontSize.lg,
        fontWeight: '700', color: '#fff',
    },
});

// Skeleton loader
function LeaveSkeleton() {
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
        <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.card, { padding: Spacing.lg }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, gap: 6 }}>
                            <B w="50%" h={16} />
                            <B w="40%" h={12} />
                        </View>
                        <B w={70} h={22} s={{ borderRadius: BorderRadius.sm }} />
                    </View>
                    <View style={{ gap: 6, paddingTop: Spacing.sm }}>
                        <B w="70%" h={12} />
                        <B w="90%" h={14} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function LeaveScreen() {
    const { user } = useAuthStore();
    const { isOnline } = useNetworkStatus();
    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newLeave, setNewLeave] = useState({ type: 'ANNUAL', start_date: '', end_date: '', reason: '' });

    // Confirm modals — replace Alert.alert
    const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject' | 'error'; id?: string; message: string } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const { data: leaves = [], isLoading, refetch } = useLeaveRequests();
    const createLeave = useCreateLeaveRequest();
    const approveLeave = useApproveLeave();
    const rejectLeave = useRejectLeave();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleApprove = useCallback((id: string) => {
        hapticLight();
        setConfirmAction({ type: 'approve', id, message: 'Duyệt đơn nghỉ phép này?' });
    }, []);

    const handleReject = useCallback((id: string) => {
        hapticWarning();
        setConfirmAction({ type: 'reject', id, message: 'Từ chối đơn nghỉ phép này?' });
    }, []);

    const handleConfirmAction = useCallback(() => {
        if (!confirmAction?.id) return;
        if (confirmAction.type === 'approve') {
            approveLeave.mutate(confirmAction.id, {
                onSuccess: () => {
                    hapticSuccess();
                    setSuccessMessage('Đã duyệt đơn nghỉ phép');
                    setShowSuccess(true);
                },
            });
        } else if (confirmAction.type === 'reject') {
            rejectLeave.mutate(confirmAction.id, {
                onSuccess: () => {
                    setSuccessMessage('Đã từ chối đơn nghỉ phép');
                    setShowSuccess(true);
                },
            });
        }
        setConfirmAction(null);
    }, [confirmAction, approveLeave, rejectLeave]);

    const handleCreateLeave = useCallback(() => {
        if (!newLeave.start_date || !newLeave.end_date || !newLeave.reason) {
            hapticWarning();
            setConfirmAction({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin' });
            return;
        }
        if (!isOnline) {
            hapticWarning();
            setConfirmAction({ type: 'error', message: 'Không có kết nối mạng. Vui lòng thử lại sau.' });
            return;
        }
        createLeave.mutate(newLeave, {
            onSuccess: () => {
                setShowModal(false);
                setNewLeave({ type: 'ANNUAL', start_date: '', end_date: '', reason: '' });
                hapticSuccess();
                setSuccessMessage('Đã gửi đơn nghỉ phép');
                setShowSuccess(true);
            },
        });
    }, [newLeave, createLeave, isOnline]);

    const renderItem = useCallback(({ item }: { item: LeaveRequest }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        const leaveType = LEAVE_TYPES[item.type] || item.type;

        return (
            <View style={styles.card}
                accessibilityLabel={`${leaveType}${item.employee_name ? `, ${item.employee_name}` : ''}, ${formatDate(item.start_date)} đến ${formatDate(item.end_date)}, ${item.days} ngày, ${status.label}`}
                accessibilityRole="text">
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.leaveType}>{leaveType}</Text>
                        {item.employee_name ? (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                                <Text style={styles.employeeName}>{item.employee_name}</Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <MaterialIcons name={status.icon} size={12} color={status.text} />
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <MaterialIcons name="event" size={14} color={Colors.textSecondary} />
                        <Text style={styles.dateRange}>
                            {formatDate(item.start_date)} → {formatDate(item.end_date)} ({item.days} ngày)
                        </Text>
                    </View>
                    <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
                </View>
                {isManager && item.status === 'PENDING' ? (
                    <View style={styles.actionRow}>
                        <Pressable
                            style={[styles.actionBtn, { borderColor: Colors.success }]}
                            onPress={() => handleApprove(item.id)}
                            accessibilityLabel={`Duyệt đơn nghỉ phép của ${item.employee_name || 'nhân viên'}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(34,197,94,0.1)' }}
                        >
                            <MaterialIcons name="check" size={16} color={Colors.success} />
                            <Text style={[styles.actionBtnText, { color: Colors.success }]}>Duyệt</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.actionBtn, { borderColor: Colors.error }]}
                            onPress={() => handleReject(item.id)}
                            accessibilityLabel={`Từ chối đơn nghỉ phép của ${item.employee_name || 'nhân viên'}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
                        >
                            <MaterialIcons name="close" size={16} color={Colors.error} />
                            <Text style={[styles.actionBtnText, { color: Colors.error }]}>Từ chối</Text>
                        </Pressable>
                    </View>
                ) : null}
            </View>
        );
    }, [isManager, handleApprove, handleReject]);

    const keyExtractor = useCallback((item: LeaveRequest) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            {isLoading && !refreshing ? (
                <LeaveSkeleton />
            ) : (
                <FlatList
                    data={leaves}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="beach-access" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Chưa có đơn nghỉ phép</Text>
                            <Text style={styles.emptyText}>Nhấn nút + để tạo đơn nghỉ phép mới</Text>
                        </View>
                    }
                />
            )}

            {/* FAB — Create Leave */}
            <Pressable
                style={styles.fab}
                onPress={() => { hapticLight(); setShowModal(true); }}
                accessibilityLabel="Tạo đơn nghỉ phép"
                accessibilityRole="button"
                accessibilityHint="Mở form xin nghỉ phép mới"
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

            {/* Create Leave Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialIcons name="edit-note" size={20} color={Colors.textPrimary} />
                            <Text style={styles.modalTitle}>Xin nghỉ phép</Text>
                        </View>

                        <Text style={styles.label}>Loại nghỉ phép</Text>
                        <View style={styles.typeRow}>
                            {Object.entries(LEAVE_TYPES).map(([key, label]) => (
                                <Pressable
                                    key={key}
                                    style={[styles.typeChip, newLeave.type === key && styles.typeChipActive]}
                                    onPress={() => { hapticLight(); setNewLeave(s => ({ ...s, type: key })); }}
                                    accessibilityLabel={`Loại: ${label}`}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: newLeave.type === key }}
                                >
                                    <Text style={[
                                        styles.typeChipText,
                                        newLeave.type === key && styles.typeChipTextActive
                                    ]}>{label}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.label}>Từ ngày (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-20"
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.start_date}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, start_date: v }))}
                            accessibilityLabel="Ngày bắt đầu"
                        />

                        <Text style={styles.label}>Đến ngày (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-21"
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.end_date}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, end_date: v }))}
                            accessibilityLabel="Ngày kết thúc"
                        />

                        <Text style={styles.label}>Lý do *</Text>
                        <TextInput
                            style={[styles.input, styles.inputMultiline]}
                            placeholder="Nhập lý do..."
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.reason}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, reason: v }))}
                            multiline
                            accessibilityLabel="Lý do nghỉ phép"
                        />

                        <View style={styles.modalActions}>
                            <Pressable
                                style={styles.cancelBtn}
                                onPress={() => setShowModal(false)}
                                accessibilityLabel="Hủy"
                                accessibilityRole="button"
                            >
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </Pressable>
                            <Pressable
                                style={styles.submitBtn}
                                onPress={handleCreateLeave}
                                disabled={createLeave.isPending}
                                accessibilityLabel="Gửi đơn nghỉ phép"
                                accessibilityRole="button"
                            >
                                <LinearGradient
                                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.submitGradient}
                                >
                                    <Text style={styles.submitText}>
                                        {createLeave.isPending ? '...' : 'Gửi đơn'}
                                    </Text>
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Confirm Modal — replaces Alert.alert */}
            <ConfirmModal
                visible={!!confirmAction}
                title={confirmAction?.type === 'error' ? 'Lỗi' : 'Xác nhận'}
                message={confirmAction?.message || ''}
                confirmText={confirmAction?.type === 'approve' ? 'Duyệt' : confirmAction?.type === 'reject' ? 'Từ chối' : 'Đã hiểu'}
                cancelText={confirmAction?.type === 'error' ? undefined : 'Hủy'}
                onConfirm={() => {
                    if (confirmAction?.type === 'error') {
                        setConfirmAction(null);
                    } else {
                        handleConfirmAction();
                    }
                }}
                onCancel={() => setConfirmAction(null)}
                variant={confirmAction?.type === 'reject' ? 'danger' : confirmAction?.type === 'error' ? 'danger' : 'default'}
            />

            {/* Success Overlay */}
            <SuccessOverlay
                visible={showSuccess}
                message={successMessage}
                onDone={() => setShowSuccess(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    list: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
    card: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        overflow: 'hidden', shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.lg, paddingBottom: Spacing.sm,
    },
    cardHeaderLeft: { flex: 1, gap: 4 },
    leaveType: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    employeeName: { fontSize: FontSize.sm, color: Colors.textSecondary },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'center' },
    statusText: { fontSize: FontSize.xs, fontWeight: '600' },
    cardBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.xs },
    dateRange: { fontSize: FontSize.sm, color: Colors.textSecondary },
    reasonText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
    actionRow: {
        flexDirection: 'row', gap: Spacing.sm,
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    },
    actionBtn: {
        flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md,
        borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4,
    },
    actionBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
    fab: {
        position: 'absolute', bottom: 100, right: Spacing.xl,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.bgPrimary, borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl, gap: Spacing.sm,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.xs },
    input: {
        backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
    typeChip: {
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md, backgroundColor: Colors.bgTertiary,
    },
    typeChipActive: { backgroundColor: Colors.primary + '18', borderWidth: 1, borderColor: Colors.primary },
    typeChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    typeChipTextActive: { color: Colors.primary, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
    cancelBtn: {
        flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    cancelBtnText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: '600' },
    submitBtn: { flex: 1 },
    submitGradient: { paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
    submitText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textInverse },
});
