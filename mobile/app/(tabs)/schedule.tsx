// Schedule Screen — My assignments/events
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

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

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning },
    CONFIRMED: { bg: '#f0fdf4', text: Colors.success },
    IN_PROGRESS: { bg: '#eff6ff', text: Colors.info },
    COMPLETED: { bg: '#f0fdf4', text: '#15803d' },
    DEFAULT: { bg: Colors.bgTertiary, text: Colors.textSecondary },
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn thành',
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
        const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.DEFAULT;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/event/${item.order_id}`)}
            >
                {/* Date bar */}
                <View style={styles.dateBar}>
                    <Text style={styles.dateText}>{formatDate(item.start_time)}</Text>
                    <Text style={styles.timeText}>
                        {formatTime(item.start_time)} — {formatTime(item.end_time)}
                    </Text>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <Text style={styles.eventName} numberOfLines={1}>
                        {item.event_name}
                    </Text>

                    {item.customer_name && (
                        <Text style={styles.customerName}>🤝 {item.customer_name}</Text>
                    )}

                    {item.location && (
                        <Text style={styles.location} numberOfLines={1}>
                            📍 {item.location}
                        </Text>
                    )}

                    <View style={styles.footer}>
                        {item.role && (
                            <View style={styles.roleBadge}>
                                <Text style={styles.roleText}>{item.role}</Text>
                            </View>
                        )}
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                            <Text style={[styles.statusText, { color: statusStyle.text }]}>
                                {STATUS_LABELS[item.status] || item.status}
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
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
                    />
                }
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>📅</Text>
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
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    dateBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.bgTertiary,
    },
    dateText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
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
    customerName: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    location: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    roleBadge: {
        backgroundColor: Colors.bgTertiary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
    },
    roleText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    statusBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
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
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
