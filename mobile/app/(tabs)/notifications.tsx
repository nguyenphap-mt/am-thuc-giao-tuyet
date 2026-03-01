// Notifications Screen — Material Design 3
// UX Audit fixes: SafeArea, Skeleton, Offline, useCallback, Haptic, Accessibility
import { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight } from '../../lib/haptics';
import { OfflineBanner } from '../../components/OfflineBanner';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string | null;
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
    ORDER_ASSIGNED: { icon: 'assignment', color: Colors.info, bg: '#e3f2fd' },
    LEAVE_APPROVED: { icon: 'check-circle', color: Colors.success, bg: '#e8f5e9' },
    LEAVE_REJECTED: { icon: 'cancel', color: Colors.error, bg: '#ffebee' },
    SCHEDULE_CHANGE: { icon: 'sync', color: Colors.warning, bg: '#fff3e0' },
    SYSTEM: { icon: 'notifications', color: Colors.primary, bg: Colors.primaryContainer },
    DEFAULT: { icon: 'campaign', color: Colors.textSecondary, bg: Colors.bgTertiary },
};

// Unread background — extracted from inline
const UNREAD_BG = '#fdf2f8';

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

// Skeleton loader
function NotificationSkeleton() {
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
        <View style={styles.list}>
            {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={[styles.card, { gap: Spacing.sm }]}>
                    <B w={42} h={42} s={{ borderRadius: 21 }} />
                    <View style={{ flex: 1, gap: 6 }}>
                        <B w="60%" h={16} />
                        <B w="90%" h={12} />
                        <B w={80} h={10} s={{ marginTop: 2 }} />
                    </View>
                </View>
            ))}
        </View>
    );
}

export default function NotificationsScreen() {
    const [refreshing, setRefreshing] = useState(false);

    const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            try {
                const data = await api.get('/notifications');
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

    // useCallback renderItem — H1
    const renderItem = useCallback(({ item }: { item: Notification }) => {
        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.DEFAULT;
        const readStatus = item.is_read ? 'đã đọc' : 'chưa đọc';

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    !item.is_read && styles.cardUnread,
                    pressed && styles.pressed,
                ]}
                onPress={() => hapticLight()}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                accessibilityLabel={`${item.title}: ${item.message}, ${readStatus}, ${timeAgo(item.created_at)}`}
                accessibilityRole="button"
                accessibilityHint="Nhấn để xem chi tiết thông báo"
            >
                <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                    <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={styles.content}>
                    <Text style={[styles.title, !item.is_read && styles.titleUnread]}>
                        {item.title}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>
                        {item.message}
                    </Text>
                    <View style={styles.timeRow}>
                        <MaterialIcons name="schedule" size={12} color={Colors.textTertiary} />
                        <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                    </View>
                </View>
                {!item.is_read ? <View style={styles.unreadDot} /> : null}
            </Pressable>
        );
    }, []);

    // useCallback keyExtractor — H2
    const keyExtractor = useCallback((item: Notification) => item.id, []);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            {isLoading && !refreshing ? (
                <NotificationSkeleton />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={Colors.primary}
                            colors={[Colors.primary, Colors.primaryDark]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialIcons name="notifications-none" size={56} color={Colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Không có thông báo</Text>
                            <Text style={styles.emptyText}>
                                Bạn sẽ nhận được thông báo khi có sự kiện hoặc cập nhật mới.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
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
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardUnread: {
        backgroundColor: UNREAD_BG,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        gap: 3,
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
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    time: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginTop: 6,
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
