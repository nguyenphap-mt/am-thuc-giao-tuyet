// CRM Customer Detail — contact info, interactions, stats
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
    Alert,
    Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import {
    useCustomerDetail,
    useCustomerInteractions,
    useCreateInteraction,
    type InteractionLog,
} from '../../lib/hooks/useCRM';

const INTERACTION_ICONS: Record<string, string> = {
    CALL: '📞', EMAIL: '📧', MEETING: '🤝', NOTE: '📝',
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

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [refreshing, setRefreshing] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [noteType, setNoteType] = useState('NOTE');

    const { data: customer, refetch: refetchCustomer } = useCustomerDetail(id);
    const { data: interactions = [], refetch: refetchInteractions } = useCustomerInteractions(id);
    const createInteraction = useCreateInteraction(id || '');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchCustomer(), refetchInteractions()]);
        setRefreshing(false);
    }, [refetchCustomer, refetchInteractions]);

    const handleAddInteraction = () => {
        if (!newNote.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập nội dung');
            return;
        }
        createInteraction.mutate(
            { type: noteType, content: newNote },
            {
                onSuccess: () => { setNewNote(''); Alert.alert('Thành công', 'Đã thêm ghi chú'); },
            }
        );
    };

    if (!customer) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Đang tải...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
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
                        <Text style={styles.customerType}>
                            {customer.customer_type === 'CORPORATE' ? '🏢 Doanh nghiệp' : '👤 Cá nhân'}
                        </Text>
                    </View>
                </View>

                {customer.phone && (
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
                        <Text style={styles.contactIcon}>📞</Text>
                        <Text style={styles.contactText}>{customer.phone}</Text>
                    </TouchableOpacity>
                )}
                {customer.email && (
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
                        <Text style={styles.contactIcon}>📧</Text>
                        <Text style={styles.contactText}>{customer.email}</Text>
                    </TouchableOpacity>
                )}
                {customer.address && (
                    <View style={styles.contactRow}>
                        <Text style={styles.contactIcon}>📍</Text>
                        <Text style={styles.contactText}>{customer.address}</Text>
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.statNumber, { color: Colors.info }]}>{customer.total_orders ?? 0}</Text>
                    <Text style={styles.statLabel}>Đơn hàng</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.statNumber, { color: Colors.success }]}>
                        {customer.total_revenue ? (customer.total_revenue / 1_000_000).toFixed(1) + 'tr' : '0'}
                    </Text>
                    <Text style={styles.statLabel}>Doanh thu</Text>
                </View>
            </View>

            {/* Add Interaction */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Thêm ghi chú</Text>
                <View style={styles.typeRow}>
                    {Object.entries(INTERACTION_ICONS).map(([key, icon]) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.typeChip, noteType === key && styles.typeChipActive]}
                            onPress={() => setNoteType(key)}
                        >
                            <Text>{icon} {key}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.noteInputRow}>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="Nội dung..."
                        placeholderTextColor={Colors.textTertiary}
                        value={newNote}
                        onChangeText={setNewNote}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleAddInteraction}>
                        <Text style={styles.sendBtnText}>Gửi</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Interaction History */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📜 Lịch sử tương tác ({interactions.length})</Text>
                {interactions.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có tương tác</Text>
                ) : (
                    interactions.map((log: InteractionLog) => (
                        <View key={log.id} style={styles.interactionRow}>
                            <Text style={styles.interactionIcon}>
                                {INTERACTION_ICONS[log.type] || '📝'}
                            </Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.interactionContent}>{log.content}</Text>
                                <Text style={styles.interactionDate}>{formatDate(log.created_at)}</Text>
                            </View>
                        </View>
                    ))
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    content: { padding: Spacing.lg, gap: Spacing.md },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: FontSize.md, color: Colors.textSecondary },
    section: {
        backgroundColor: Colors.bgPrimary, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, gap: Spacing.sm,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
    customerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
    avatarCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary },
    customerName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
    customerType: { fontSize: FontSize.sm, color: Colors.textSecondary },
    contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
    contactIcon: { fontSize: 16 },
    contactText: { fontSize: FontSize.md, color: Colors.info },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statCard: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center' },
    statNumber: { fontSize: FontSize.xxl, fontWeight: '800', fontVariant: ['tabular-nums'] },
    statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
    typeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
    typeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm, backgroundColor: Colors.bgTertiary },
    typeChipActive: { backgroundColor: Colors.primary + '18', borderWidth: 1, borderColor: Colors.primary },
    noteInputRow: { flexDirection: 'row', gap: Spacing.sm },
    noteInput: {
        flex: 1, backgroundColor: Colors.bgTertiary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        fontSize: FontSize.md, color: Colors.textPrimary,
    },
    sendBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md, justifyContent: 'center' },
    sendBtnText: { color: Colors.textInverse, fontWeight: '600', fontSize: FontSize.sm },
    emptyText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
    interactionRow: {
        flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    interactionIcon: { fontSize: 18, marginTop: 2 },
    interactionContent: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
    interactionDate: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});
