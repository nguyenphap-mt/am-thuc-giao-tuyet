// HR Leave Management — request list + create/approve
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
    Alert,
    Modal,
} from 'react-native';
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

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ duyệt', icon: '⏳' },
    APPROVED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã duyệt', icon: '✅' },
    REJECTED: { bg: '#fef2f2', text: Colors.error, label: 'Từ chối', icon: '❌' },
};

const LEAVE_TYPES: Record<string, string> = {
    ANNUAL: '🏖️ Nghỉ phép năm',
    SICK: '🤒 Nghỉ ốm',
    PERSONAL: '🏠 Việc cá nhân',
    MATERNITY: '👶 Thai sản',
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LeaveScreen() {
    const { user } = useAuthStore();
    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [newLeave, setNewLeave] = useState({ type: 'ANNUAL', start_date: '', end_date: '', reason: '' });

    const { data: leaves = [], isLoading, refetch } = useLeaveRequests();
    const createLeave = useCreateLeaveRequest();
    const approveLeave = useApproveLeave();
    const rejectLeave = useRejectLeave();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleApprove = (id: string) => {
        Alert.alert('Xác nhận', 'Duyệt đơn nghỉ phép này?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Duyệt', onPress: () => approveLeave.mutate(id) },
        ]);
    };

    const handleReject = (id: string) => {
        Alert.alert('Xác nhận', 'Từ chối đơn nghỉ phép này?', [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Từ chối', style: 'destructive', onPress: () => rejectLeave.mutate(id) },
        ]);
    };

    const handleCreateLeave = () => {
        if (!newLeave.start_date || !newLeave.end_date || !newLeave.reason) {
            Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
            return;
        }
        createLeave.mutate(newLeave, {
            onSuccess: () => {
                setShowModal(false);
                setNewLeave({ type: 'ANNUAL', start_date: '', end_date: '', reason: '' });
                Alert.alert('Thành công', 'Đã gửi đơn nghỉ phép');
            },
        });
    };

    const renderItem = ({ item }: { item: LeaveRequest }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        const leaveType = LEAVE_TYPES[item.type] || item.type;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.leaveType}>{leaveType}</Text>
                        {item.employee_name && (
                            <Text style={styles.employeeName}>👤 {item.employee_name}</Text>
                        )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={styles.statusIcon}>{status.icon}</Text>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                    </View>
                </View>
                <View style={styles.cardBody}>
                    <Text style={styles.dateRange}>
                        📅 {formatDate(item.start_date)} → {formatDate(item.end_date)} ({item.days} ngày)
                    </Text>
                    <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
                </View>
                {isManager && item.status === 'PENDING' && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: Colors.success }]}
                            onPress={() => handleApprove(item.id)}
                        >
                            <Text style={[styles.actionBtnText, { color: Colors.success }]}>✅ Duyệt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderColor: Colors.error }]}
                            onPress={() => handleReject(item.id)}
                        >
                            <Text style={[styles.actionBtnText, { color: Colors.error }]}>❌ Từ chối</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={leaves}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🏖️</Text>
                            <Text style={styles.emptyTitle}>Chưa có đơn nghỉ phép</Text>
                        </View>
                    ) : null
                }
            />

            {/* FAB — Create Leave */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.8}
                onPress={() => setShowModal(true)}
            >
                <LinearGradient
                    colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fabGradient}
                >
                    <Text style={styles.fabIcon}>＋</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Create Leave Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>📝 Xin nghỉ phép</Text>

                        <Text style={styles.label}>Loại nghỉ phép</Text>
                        <View style={styles.typeRow}>
                            {Object.entries(LEAVE_TYPES).map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.typeChip, newLeave.type === key && styles.typeChipActive]}
                                    onPress={() => setNewLeave(s => ({ ...s, type: key }))}
                                >
                                    <Text style={[
                                        styles.typeChipText,
                                        newLeave.type === key && styles.typeChipTextActive
                                    ]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Từ ngày (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-20"
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.start_date}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, start_date: v }))}
                        />

                        <Text style={styles.label}>Đến ngày (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-02-21"
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.end_date}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, end_date: v }))}
                        />

                        <Text style={styles.label}>Lý do *</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                            placeholder="Nhập lý do..."
                            placeholderTextColor={Colors.textTertiary}
                            value={newLeave.reason}
                            onChangeText={(v) => setNewLeave(s => ({ ...s, reason: v }))}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => setShowModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.submitBtn}
                                onPress={handleCreateLeave}
                                disabled={createLeave.isPending}
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
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
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
    leaveType: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    employeeName: { fontSize: FontSize.sm, color: Colors.textSecondary },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm,
    },
    statusIcon: { fontSize: 12 },
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
        borderWidth: 1, alignItems: 'center',
    },
    actionBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    fab: {
        position: 'absolute', bottom: 100, right: Spacing.xl,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    fabIcon: { fontSize: 28, color: Colors.textInverse, fontWeight: '300' },
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
