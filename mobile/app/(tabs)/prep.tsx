// Kitchen Prep Sheet Screen
import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

interface PrepItem {
    item_name: string;
    category: string | null;
    quantity: number;
    uom: string;
    note: string | null;
}

interface OrderPrep {
    order_id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    items: PrepItem[];
}

export default function PrepScreen() {
    const [refreshing, setRefreshing] = useState(false);

    // Fetch upcoming schedules then get prep details for each
    const { data: schedule = [], isLoading, refetch } = useQuery({
        queryKey: ['prep-schedule'],
        queryFn: async () => {
            try {
                const items = await api.get('/mobile/my-schedule');
                return Array.isArray(items) ? items : [];
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

    const renderScheduleItem = ({ item }: { item: any }) => {
        const eventDate = item.start_time
            ? new Date(item.start_time).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            })
            : 'Chưa xác định';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.eventName}>{item.event_name}</Text>
                    <Text style={styles.dateText}>{eventDate}</Text>
                </View>
                {item.customer_name && (
                    <Text style={styles.customer}>🤝 {item.customer_name}</Text>
                )}
                {item.location && (
                    <Text style={styles.location}>📍 {item.location}</Text>
                )}
                <View style={styles.prepNote}>
                    <Text style={styles.prepNoteIcon}>👨‍🍳</Text>
                    <Text style={styles.prepNoteText}>
                        Vai trò: {item.role || 'Chưa phân công'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={schedule}
                keyExtractor={(item) => item.order_id}
                renderItem={renderScheduleItem}
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
                            <Text style={styles.emptyIcon}>👨‍🍳</Text>
                            <Text style={styles.emptyTitle}>Chưa có phiếu chuẩn bị</Text>
                            <Text style={styles.emptyText}>
                                Phiếu chuẩn bị sẽ hiện khi bạn có đơn hàng được phân công.
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
        padding: Spacing.lg,
        gap: Spacing.xs,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventName: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        flex: 1,
    },
    dateText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    customer: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    location: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
    },
    prepNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
        backgroundColor: Colors.bgTertiary,
        padding: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    prepNoteIcon: {
        fontSize: 16,
    },
    prepNoteText: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
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
