// Notifications Screen
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string | null;
}

const TYPE_ICONS: Record<string, string> = {
    ORDER_ASSIGNED: '📋',
    LEAVE_APPROVED: '✅',
    LEAVE_REJECTED: '❌',
    SCHEDULE_CHANGE: '🔄',
    SYSTEM: '🔔',
    DEFAULT: '📢',
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

export default function NotificationsScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            try {
                const data = await api.get('/notifications');
                // API may return { items: [...] } or [...] directly
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

    const renderItem = ({ item }: { item: Notification }) => {
        const icon = TYPE_ICONS[item.type] || TYPE_ICONS.DEFAULT;

        return (
            <View style={[styles.card, !item.is_read && styles.cardUnread]}>
                <View style={styles.iconCircle}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>
                <View style={styles.content}>
                    <Text style={[styles.title, !item.is_read && styles.titleUnread]}>
                        {item.title}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
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
                            <Text style={styles.emptyIcon}>🔔</Text>
                            <Text style={styles.emptyTitle}>Không có thông báo</Text>
                            <Text style={styles.emptyText}>
                                Bạn sẽ nhận được thông báo khi có sự kiện hoặc cập nhật mới.
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
        gap: Spacing.sm,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        gap: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardUnread: {
        backgroundColor: '#fdf2f8',
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 18,
    },
    content: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: FontSize.md,
        fontWeight: '500',
        color: Colors.textPrimary,
    },
    titleUnread: {
        fontWeight: '700',
    },
    message: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    time: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        marginTop: 2,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginTop: 4,
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
