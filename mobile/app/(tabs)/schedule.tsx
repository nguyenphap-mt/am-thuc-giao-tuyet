// Schedule Screen — My assignments/events (Material Design 3)
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight } from '../../lib/haptics';

interface ScheduleItem {
    order_id: string;
    event_name: string;
    role: string | null;
    start_time: string | null;
    end_time: string | null;
    status: string;
    location: string | null;
    customer_name: string | null;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, icon: 'schedule', label: 'Chờ xác nhận' },
    CONFIRMED: { bg: '#f0fdf4', text: Colors.success, icon: 'check-circle', label: 'Đã xác nhận' },
    IN_PROGRESS: { bg: '#eff6ff', text: Colors.info, icon: 'play-circle-filled', label: 'Đang thực hiện' },
    COMPLETED: { bg: '#f0fdf4', text: '#15803d', icon: 'verified', label: 'Hoàn thành' },
    DEFAULT: { bg: Colors.bgTertiary, text: Colors.textSecondary, icon: 'circle', label: '' },
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Chưa xác định';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ScheduleScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const { data: schedule = [], isLoading, refetch } = useQuery<ScheduleItem[]>({
        queryKey: ['my-schedule'],
        queryFn: () => api.get('/mobile/my-schedule'),
    });

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const renderItem = ({ item }: { item: ScheduleItem }) => {
        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.DEFAULT;

        return (
            <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => { hapticLight(); router.push(`/event/${item.order_id}`); }}
                accessibilityLabel={`Sự kiện ${item.event_name}`}
                accessibilityRole="button"
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
                {/* Date bar */}
                <View style={styles.dateBar}>
                    <View style={styles.dateRow}>
                        <MaterialIcons name="event" size={16} color={Colors.textPrimary} />
                        <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
                    </View>
                    <View style={styles.timeRow}>
                        <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                        <Text style={styles.timeText}>
                            {formatTime(item.start_time)} — {formatTime(item.end_time)}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <Text style={styles.eventName} numberOfLines={1}>
                        {item.event_name}
                    </Text>

                    {item.customer_name && (
                        <View style={styles.metaRow}>
                            <MaterialIcons name="handshake" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText}>{item.customer_name}</Text>
                        </View>
                    )}

                    {item.location && (
                        <View style={styles.metaRow}>
                            <MaterialIcons name="place" size={14} color={Colors.textSecondary} />
                            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                        </View>
                    )}

                    <View style={styles.footer}>
                        {item.role && (
                            <View style={styles.roleBadge}>
                                <MaterialIcons name="badge" size={12} color={Colors.textPrimary} />
                                <Text style={styles.roleText}>{item.role}</Text>
                            </View>
                        )}
                        <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                            <MaterialIcons name={statusCfg.icon} size={12} color={statusCfg.text} />
                            <Text style={[styles.statusText, { color: statusCfg.text }]}>
                                {statusCfg.label || item.status}
                            </Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={schedule}
                keyExtractor={(item) => item.order_id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
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
                            <MaterialIcons name="event-available" size={56} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Chưa có lịch làm việc</Text>
                            <Text style={styles.emptyText}>
                                Bạn sẽ nhận được thông báo khi được phân công sự kiện mới.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    list: {
        padding: Spacing.lg,
        paddingBottom: 100,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    dateBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.bgTertiary,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    cardContent: {
        padding: Spacing.lg,
        gap: Spacing.xs,
    },
    eventName: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.bgTertiary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    roleText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: Spacing.xxxl,
        gap: Spacing.sm,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
