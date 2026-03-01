// Quick Approve Screen — aggregate pending items with one-tap actions
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight, hapticMedium, hapticSuccess } from '../../lib/haptics';

interface PendingApproval {
    id: string;
    type: 'leave' | 'purchase' | 'expense';
    title: string;
    requester_name: string;
    amount?: number;
    created_at: string | null;
    status: string;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string }> = {
    leave: { icon: 'beach-access', label: 'Nghỉ phép', color: Colors.info },
    purchase: { icon: 'shopping-cart', label: 'Mua hàng', color: Colors.warning },
    expense: { icon: 'payments', label: 'Chi phí', color: Colors.success },
};

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

export default function ApprovalsScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const { data: approvals = [], isLoading, refetch } = useQuery<PendingApproval[]>({
        queryKey: ['approvals'],
        queryFn: async () => {
            try {
                const data = await api.get('/approvals/pending');
                return Array.isArray(data) ? data : data.items || [];
            } catch {
                return [];
            }
        },
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const renderItem = ({ item }: { item: PendingApproval }) => {
        const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.leave;

        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                onPress={() => { hapticLight(); }}
                accessibilityLabel={`${typeConfig.label}: ${item.title} từ ${item.requester_name}`}
                accessibilityRole="button"
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
                <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
                    <MaterialIcons name={typeConfig.icon} size={20} color={typeConfig.color} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardMeta}>
                        {typeConfig.label} • {item.requester_name}
                    </Text>
                    <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
                </View>
                <View style={styles.actions}>
                    <Pressable
                        style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticSuccess(); }}
                        accessibilityLabel="Duyệt"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <Text style={styles.approveBtnText}>✓</Text>
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.7 }]}
                        onPress={() => { hapticMedium(); }}
                        accessibilityLabel="Từ chối"
                        accessibilityRole="button"
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                        <Text style={styles.rejectBtnText}>✕</Text>
                    </Pressable>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={approvals}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <MaterialIcons name="check-circle" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Không có yêu cầu chờ duyệt</Text>
                            <Text style={styles.emptyText}>
                                Các yêu cầu nghỉ phép, mua hàng sẽ xuất hiện tại đây.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bgSecondary },
    list: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.sm },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    typeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    typeIconText: { fontSize: 20 },
    cardContent: { flex: 1, gap: 2 },
    cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
    cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary },
    cardTime: { fontSize: FontSize.xs, color: Colors.textTertiary },
    actions: { flexDirection: 'row', gap: Spacing.sm },
    approveBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.success,
        justifyContent: 'center', alignItems: 'center',
    },
    approveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    rejectBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.error,
        justifyContent: 'center', alignItems: 'center',
    },
    rejectBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    empty: {
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: Spacing.xxxl,
    },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: {
        fontSize: FontSize.lg, fontWeight: '700',
        color: Colors.textPrimary, marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md, color: Colors.textSecondary,
        textAlign: 'center', lineHeight: 22,
    },
});
