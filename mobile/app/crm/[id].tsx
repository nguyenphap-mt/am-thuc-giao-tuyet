// CRM Customer Detail — contact info, interactions, stats
// UX Audit fixes: SafeArea, ConfirmModal, SuccessOverlay, Skeleton, Offline, useCallback, a11y
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    StyleSheet,
    RefreshControl,
    Linking,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useCustomerDetail,
    useCustomerInteractions,
    useCreateInteraction,
    type InteractionLog,
} from '../../lib/hooks/useCRM';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../../lib/haptics';
import ConfirmModal from '../../components/ConfirmModal';
import { useNetworkStatus, OfflineBanner } from '../../components/OfflineBanner';

const INTERACTION_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    CALL: 'phone', EMAIL: 'email', MEETING: 'handshake', NOTE: 'edit-note',
};
const INTERACTION_LABELS: Record<string, string> = {
    CALL: 'Gọi điện', EMAIL: 'Email', MEETING: 'Gặp mặt', NOTE: 'Ghi chú',
};

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency', currency: 'VND', maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Skeleton loader for detail screen
function DetailSkeleton() {
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
            {/* Customer card skeleton */}
            <View style={[styles.section, { gap: Spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                    <B w={56} h={56} s={{ borderRadius: 28 }} />
                    <View style={{ gap: 6 }}>
                        <B w={140} h={20} />
                        <B w={80} h={14} />
                    </View>
                </View>
                <B w="70%" h={16} />
                <B w="60%" h={16} />
            </View>
            {/* Stats skeleton */}
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={[styles.statCard, { backgroundColor: Colors.bgTertiary + '40', flex: 1 }]}>
                    <B w={40} h={24} />
                    <B w={50} h={12} s={{ marginTop: 4 }} />
                </View>
                <View style={[styles.statCard, { backgroundColor: Colors.bgTertiary + '40', flex: 1 }]}>
                    <B w={50} h={24} />
                    <B w={50} h={12} s={{ marginTop: 4 }} />
                </View>
            </View>
            {/* Interactions skeleton */}
            <View style={[styles.section, { gap: Spacing.sm }]}>
                <B w={140} h={18} />
                {[1, 2, 3].map(i => (
                    <View key={i} style={{ flexDirection: 'row', gap: Spacing.sm, paddingVertical: 8 }}>
                        <B w={18} h={18} />
                        <View style={{ flex: 1, gap: 4 }}>
                            <B w="80%" h={14} />
                            <B w={100} h={10} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

// Success overlay
function SuccessOverlay({ visible, message, onDone }: { visible: boolean; message: string; onDone: () => void }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0);
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })
                .start(() => setTimeout(onDone, 1200));
        }
    }, [visible, scaleAnim, onDone]);
    if (!visible) return null;
    return (
        <View style={overlayStyles.bg}>
            <Animated.View style={[overlayStyles.circle, { transform: [{ scale: scaleAnim }] }]}>
                <MaterialIcons name="check" size={40} color="#fff" />
            </Animated.View>
            <Animated.Text style={[overlayStyles.text, { opacity: scaleAnim }]}>{message}</Animated.Text>
        </View>
    );
}
const overlayStyles = StyleSheet.create({
    bg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    circle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
    text: { marginTop: Spacing.lg, fontSize: FontSize.lg, fontWeight: '700', color: Colors.success, textAlign: 'center', paddingHorizontal: Spacing.xl },
});

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { isConnected } = useNetworkStatus();
    const [refreshing, setRefreshing] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('NOTE');

    // Error + success modals
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const { data: customer, isLoading, refetch: refetchCustomer } = useCustomerDetail(id);
    const { data: interactions = [], refetch: refetchInteractions } = useCustomerInteractions(id);
    const createInteraction = useCreateInteraction(id || '');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchCustomer(), refetchInteractions()]);
        setRefreshing(false);
    }, [refetchCustomer, refetchInteractions]);

    // useCallback — H7
    const handleAddInteraction = useCallback(() => {
        if (!isConnected) {
            hapticError();
            setErrorMessage('Cần kết nối mạng để thêm ghi chú');
            setShowError(true);
            return;
        }
        if (!newNote.trim()) {
            hapticError();
            setErrorMessage('Vui lòng nhập nội dung');
            setShowError(true);
            return;
        }
        hapticMedium();
        createInteraction.mutate(
            { type: noteType, content: newNote },
            {
                onSuccess: () => {
                    hapticSuccess();
                    setNewNote('');
                    setShowSuccess(true);
                },
                onError: (err: any) => {
                    hapticError();
                    setErrorMessage(err.message || 'Không thể thêm ghi chú');
                    setShowError(true);
                },
            }
        );
    }, [isConnected, newNote, noteType, createInteraction]);

    // Skeleton while loading
    if (isLoading && !customer) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <Stack.Screen options={{ title: 'Khách hàng' }} />
                <OfflineBanner />
                <DetailSkeleton />
            </SafeAreaView>
        );
    }

    if (!customer) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <Stack.Screen options={{ title: 'Khách hàng' }} />
                <View style={styles.emptyCenter}>
                    <MaterialIcons name="person-off" size={56} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Không tìm thấy khách hàng</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: customer.name }} />
            <OfflineBanner />
            <SuccessOverlay visible={showSuccess} message="Đã thêm ghi chú" onDone={() => setShowSuccess(false)} />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Customer Card */}
                <View style={styles.section}>
                    <View style={styles.customerHeader}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                                {customer.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.customerName}>{customer.name}</Text>
                            <View style={styles.customerTypeRow}>
                                <MaterialIcons name={customer.customer_type === 'CORPORATE' ? 'business' : 'person'} size={14} color={Colors.textSecondary} />
                                <Text style={styles.customerType}>
                                    {customer.customer_type === 'CORPORATE' ? 'Doanh nghiệp' : 'Cá nhân'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {customer.phone && (
                        <Pressable
                            style={styles.contactRow}
                            onPress={() => { hapticLight(); Linking.openURL(`tel:${customer.phone}`); }}
                            accessibilityLabel={`Gọi ${customer.phone}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <MaterialIcons name="phone" size={16} color={Colors.info} />
                            <Text style={styles.contactText}>{customer.phone}</Text>
                        </Pressable>
                    )}
                    {customer.email && (
                        <Pressable
                            style={styles.contactRow}
                            onPress={() => { hapticLight(); Linking.openURL(`mailto:${customer.email}`); }}
                            accessibilityLabel={`Email ${customer.email}`}
                            accessibilityRole="button"
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <MaterialIcons name="email" size={16} color={Colors.info} />
                            <Text style={styles.contactText}>{customer.email}</Text>
                        </Pressable>
                    )}
                    {customer.address && (
                        <View style={styles.contactRow}
                            accessibilityLabel={`Địa chỉ: ${customer.address}`}>
                            <MaterialIcons name="place" size={16} color={Colors.info} />
                            <Text style={styles.contactText}>{customer.address}</Text>
                        </View>
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}
                        accessibilityLabel={`${customer.total_orders ?? 0} đơn hàng`}
                        accessibilityRole="text">
                        <Text style={[styles.statNumber, { color: Colors.info }]}>{customer.total_orders ?? 0}</Text>
                        <Text style={styles.statLabel}>Đơn hàng</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}
                        accessibilityLabel={`Doanh thu: ${customer.total_revenue ? (customer.total_revenue / 1_000_000).toFixed(1) + ' triệu' : '0'}`}
                        accessibilityRole="text">
                        <Text style={[styles.statNumber, { color: Colors.success }]}>
                            {customer.total_revenue ? (customer.total_revenue / 1_000_000).toFixed(1) + 'tr' : '0'}
                        </Text>
                        <Text style={styles.statLabel}>Doanh thu</Text>
                    </View>
                </View>

                {/* Add Interaction */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="edit-note" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Thêm ghi chú</Text>
                    </View>
                    <View style={styles.typeRow}>
                        {Object.entries(INTERACTION_ICONS).map(([key, icon]) => (
                            <Pressable
                                key={key}
                                style={[styles.typeChip, noteType === key && styles.typeChipActive]}
                                onPress={() => { hapticLight(); setNoteType(key); }}
                                accessibilityLabel={`Loại: ${INTERACTION_LABELS[key] || key}`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: noteType === key }}
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            >
                                <MaterialIcons name={icon} size={14} color={noteType === key ? Colors.primary : Colors.textSecondary} />
                                <Text style={[styles.typeChipText, noteType === key && { color: Colors.primary }]}>
                                    {INTERACTION_LABELS[key] || key}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={styles.noteInputRow}>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Nội dung…"
                            placeholderTextColor={Colors.textTertiary}
                            value={newNote}
                            onChangeText={setNewNote}
                            accessibilityLabel="Nội dung ghi chú"
                            accessibilityHint="Nhập nội dung tương tác với khách hàng"
                        />
                        <Pressable
                            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.85 }]}
                            onPress={handleAddInteraction}
                            disabled={createInteraction.isPending}
                            accessibilityLabel="Gửi ghi chú"
                            accessibilityRole="button"
                            accessibilityHint="Nhấn để lưu ghi chú"
                            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                            <Text style={styles.sendBtnText}>
                                {createInteraction.isPending ? '…' : 'Gửi'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Interaction History */}
                <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                        <MaterialIcons name="history" size={18} color={Colors.textPrimary} />
                        <Text style={styles.sectionTitle}>Lịch sử tương tác ({interactions.length})</Text>
                    </View>
                    {interactions.length === 0 ? (
                        <View style={styles.emptyInteractions}>
                            <MaterialIcons name="chat-bubble-outline" size={32} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>Chưa có tương tác</Text>
                        </View>
                    ) : (
                        interactions.map((log: InteractionLog) => (
                            <View key={log.id} style={styles.interactionRow}
                                accessibilityLabel={`${INTERACTION_LABELS[log.type] || log.type}: ${log.content}, ${formatDate(log.created_at)}`}>
                                <MaterialIcons name={INTERACTION_ICONS[log.type] || 'edit-note'} size={18} color={Colors.textSecondary} />
                                <View style={styles.interactionContent}>
                                    <Text style={styles.interactionText}>{log.content}</Text>
                                    <Text style={styles.interactionDate}>{formatDate(log.created_at)}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Error Modal */}
            <ConfirmModal
                visible={showError}
                title="Lỗi"
                message={errorMessage}
                confirmText="Đã hiểu"
                cancelText="Đóng"
                onConfirm={() => setShowError(false)}
                onCancel={() => setShowError(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: Colors.bgSecondary },
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    emptyCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    customerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    avatarCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
    customerName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
    customerType: { fontSize: FontSize.sm, color: Colors.textSecondary },
    customerTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
    contactText: { fontSize: FontSize.md, color: Colors.info },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    typeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.bgTertiary,
    },
    typeChipActive: { backgroundColor: Colors.primary + '18', borderWidth: 1, borderColor: Colors.primary },
    typeChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
    noteInputRow: { flexDirection: 'row', gap: Spacing.sm },
    noteInput: {
        flex: 1, backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    sendBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, justifyContent: 'center' },
    sendBtnText: { color: Colors.textInverse, fontWeight: '600', fontSize: FontSize.sm },
    emptyInteractions: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs },
    interactionRow: {
        flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    interactionContent: { flex: 1 },
    interactionText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
    interactionDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
