// Event Detail Screen with GPS Check-in/Check-out
import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn thành',
};

export default function EventDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [checkingIn, setCheckingIn] = useState(false);

    // Find event in cached schedule data
    const { data: schedule = [] } = useQuery({
        queryKey: ['my-schedule'],
        queryFn: () => api.get('/mobile/my-schedule'),
    });

    const event = schedule.find((e: any) => e.order_id === id);

    const handleCheckIn = async (type: 'in' | 'out') => {
        setCheckingIn(true);
        try {
            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            let latitude = null;
            let longitude = null;

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;
            }

            await api.post('/mobile/check-in', {
                order_id: id,
                check_type: type,
                latitude,
                longitude,
                recorded_at: new Date().toISOString(),
            });

            Alert.alert(
                type === 'in' ? '✅ Check-in thành công' : '✅ Check-out thành công',
                `${type === 'in' ? 'Đã ghi nhận check-in' : 'Đã ghi nhận check-out'} lúc ${new Date().toLocaleTimeString('vi-VN')}`,
            );

            queryClient.invalidateQueries({ queryKey: ['my-schedule'] });
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể thực hiện check-in');
        } finally {
            setCheckingIn(false);
        }
    };

    if (!event) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Chi tiết sự kiện' }} />
                <View style={styles.notFound}>
                    <Text style={styles.notFoundIcon}>🔍</Text>
                    <Text style={styles.notFoundText}>Không tìm thấy sự kiện</Text>
                </View>
            </View>
        );
    }

    const eventDate = event.start_time
        ? new Date(event.start_time).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
        : 'Chưa xác định';

    const startTime = event.start_time
        ? new Date(event.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Stack.Screen options={{ title: event.event_name }} />

            {/* Event Header */}
            <View style={styles.headerCard}>
                <Text style={styles.eventTitle}>{event.event_name}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: event.status === 'CONFIRMED' ? '#f0fdf4' : '#fff7ed' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: event.status === 'CONFIRMED' ? Colors.success : Colors.warning }
                    ]}>
                        {STATUS_LABELS[event.status] || event.status}
                    </Text>
                </View>
            </View>

            {/* Event Info */}
            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📅</Text>
                    <View>
                        <Text style={styles.infoLabel}>Ngày</Text>
                        <Text style={styles.infoValue}>{eventDate}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>⏰</Text>
                    <View>
                        <Text style={styles.infoLabel}>Thời gian</Text>
                        <Text style={styles.infoValue}>{startTime}</Text>
                    </View>
                </View>

                {event.location && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>📍</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Địa điểm</Text>
                                <Text style={styles.infoValue}>{event.location}</Text>
                            </View>
                        </View>
                    </>
                )}

                {event.customer_name && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>🤝</Text>
                            <View>
                                <Text style={styles.infoLabel}>Khách hàng</Text>
                                <Text style={styles.infoValue}>{event.customer_name}</Text>
                            </View>
                        </View>
                    </>
                )}

                {event.role && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>👤</Text>
                            <View>
                                <Text style={styles.infoLabel}>Vai trò</Text>
                                <Text style={styles.infoValue}>{event.role}</Text>
                            </View>
                        </View>
                    </>
                )}
            </View>

            {/* Check-in/Check-out Buttons */}
            <View style={styles.checkInSection}>
                <Text style={styles.sectionTitle}>Chấm công</Text>

                <TouchableOpacity
                    onPress={() => handleCheckIn('in')}
                    disabled={checkingIn}
                    style={styles.checkInWrapper}
                >
                    <LinearGradient
                        colors={[Colors.success, '#16a34a']}
                        style={styles.checkInButton}
                    >
                        {checkingIn ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.checkInIcon}>📥</Text>
                                <Text style={styles.checkInText}>Check-in</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleCheckIn('out')}
                    disabled={checkingIn}
                    style={styles.checkInWrapper}
                >
                    <LinearGradient
                        colors={[Colors.warning, '#d97706']}
                        style={styles.checkInButton}
                    >
                        {checkingIn ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.checkInIcon}>📤</Text>
                                <Text style={styles.checkInText}>Check-out</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 100,
        gap: Spacing.lg,
    },
    headerCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    eventTitle: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        color: Colors.textPrimary,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
    },
    statusText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
    },
    infoCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    infoIcon: {
        fontSize: 20,
        width: 28,
    },
    infoLabel: {
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginTop: 1,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginVertical: Spacing.xs,
    },
    checkInSection: {
        gap: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    checkInWrapper: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    checkInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    checkInIcon: {
        fontSize: 20,
    },
    checkInText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textInverse,
    },
    notFound: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notFoundIcon: {
        fontSize: 48,
        marginBottom: Spacing.lg,
    },
    notFoundText: {
        fontSize: FontSize.lg,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
});
