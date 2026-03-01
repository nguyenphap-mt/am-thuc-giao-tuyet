// Home Screen — Material Design 3 compliant
// Greeting header + KPI cards + Today's events + Quick Actions
// UX Audit fixes: SafeArea, Skeleton, Animations, Memo, Offline
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    RefreshControl,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { useAuthStore } from '../../lib/auth-store';
import { useDashboardStats, useTodayOrders } from '../../lib/hooks/useDashboard';
import { usePendingActions } from '../../lib/hooks/usePendingActions';
import { OfflineBanner } from '../../components/OfflineBanner';
import { hapticLight } from '../../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KPI_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2;
const ANIMATION_DURATION = 400;
const STAGGER_DELAY = 80;

// --- Utility ---
function formatCurrency(amount: number): string {
    if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'tỷ';
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr';
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatFullCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
}

function getTodayFormatted(): string {
    return new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

// Status chip colors
const STATUS_CHIP: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: '#fff7ed', text: Colors.warning, label: 'Chờ xác nhận' },
    NEW: { bg: '#fff7ed', text: Colors.warning, label: 'Mới' },
    CONFIRMED: { bg: '#f0fdf4', text: Colors.success, label: 'Đã xác nhận' },
    IN_PROGRESS: { bg: '#eff6ff', text: Colors.info, label: 'Đang thực hiện' },
    COMPLETED: { bg: '#f0fdf4', text: '#15803d', label: 'Hoàn thành' },
    DEFAULT: { bg: Colors.bgTertiary, text: Colors.textSecondary, label: '' },
};

// Quick action items
interface QuickAction {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    route: string;
    color: string;
    bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    { icon: 'receipt-long', label: 'Đơn hàng', route: '/orders', color: Colors.primary, bgColor: Colors.primaryContainer },
    { icon: 'request-quote', label: 'Báo giá', route: '/quotes', color: '#6a1b9a', bgColor: '#f3e5f5' },
    { icon: 'note-add', label: 'Tạo báo giá', route: '/quotes/create', color: '#00796b', bgColor: '#e0f2f1' },
    { icon: 'restaurant-menu', label: 'Thực đơn', route: '/menu', color: '#e65100', bgColor: '#fff3e0' },
    { icon: 'inventory-2', label: 'Kho hàng', route: '/inventory', color: '#7b1fa2', bgColor: Colors.secondaryContainer },
    { icon: 'shopping-cart', label: 'Mua hàng', route: '/(tabs)/purchase', color: Colors.info, bgColor: '#e3f2fd' },
    { icon: 'bar-chart', label: 'Báo cáo', route: '/reports', color: '#0d47a1', bgColor: '#e3f2fd' },
    { icon: 'people', label: 'Khách hàng', route: '/crm', color: Colors.success, bgColor: '#e8f5e9' },
    { icon: 'account-balance', label: 'Tài chính', route: '/finance', color: '#00695c', bgColor: '#e0f2f1' },
];

// --- Skeleton Components ---

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
            ]),
        ).start();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    backgroundColor: Colors.bgTertiary,
                    borderRadius: BorderRadius.sm,
                    opacity,
                },
                style,
            ]}
        />
    );
}

const KPISkeleton = React.memo(function KPISkeleton() {
    return (
        <View style={styles.kpiGrid}>
            {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.kpiCard, { borderLeftColor: Colors.bgTertiary }]}>
                    <SkeletonBox width={80} height={12} />
                    <SkeletonBox width={60} height={24} style={{ marginTop: Spacing.sm }} />
                </View>
            ))}
        </View>
    );
});

const EventsSkeleton = React.memo(function EventsSkeleton() {
    return (
        <View style={styles.section}>
            <SkeletonBox width={180} height={18} style={{ marginBottom: Spacing.md }} />
            {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.eventCard, { padding: Spacing.lg }]}>
                    <SkeletonBox width={100} height={14} />
                    <SkeletonBox width="80%" height={16} style={{ marginTop: 6 }} />
                    <SkeletonBox width={140} height={12} style={{ marginTop: 6 }} />
                </View>
            ))}
        </View>
    );
});

// --- Animated Wrapper ---

function FadeInView({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        const timeout = setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: ANIMATION_DURATION,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: ANIMATION_DURATION,
                    useNativeDriver: true,
                }),
            ]).start();
        }, delay);
        return () => clearTimeout(timeout);
    }, [fadeAnim, slideAnim, delay]);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {children}
        </Animated.View>
    );
}

// --- Components ---

const GradientHeader = React.memo(function GradientHeader({
    userName,
    pendingNotifications,
    topInset,
}: {
    userName: string;
    pendingNotifications: number;
    topInset: number;
}) {
    const router = useRouter();

    return (
        <LinearGradient
            colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: topInset + Spacing.lg }]}
        >
            <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                    <Text style={styles.greeting}>{getGreeting()},</Text>
                    <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.headerDate}>{getTodayFormatted()}</Text>
                </View>
                <Pressable
                    style={styles.notificationBtn}
                    onPress={() => { hapticLight(); router.push('/(tabs)/notifications'); }}
                    accessibilityLabel={`Thông báo, ${pendingNotifications} mới`}
                    accessibilityRole="button"
                    accessibilityHint="Mở danh sách thông báo"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
                >
                    <MaterialIcons name="notifications" size={26} color="#fff" />
                    {pendingNotifications > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {pendingNotifications > 99 ? '99+' : pendingNotifications}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>
        </LinearGradient>
    );
});

const KPIGrid = React.memo(function KPIGrid({ stats }: { stats: any }) {
    const kpiItems = useMemo(() => [
        {
            icon: 'trending-up' as const,
            label: 'Doanh thu tháng',
            value: formatCurrency(stats?.revenue?.this_month ?? 0) + '₫',
            color: Colors.success,
            borderColor: Colors.success,
        },
        {
            icon: 'assignment' as const,
            label: 'Đơn đang xử lý',
            value: String((stats?.orders?.confirmed ?? 0) + (stats?.orders?.in_progress ?? 0)),
            color: Colors.info,
            borderColor: Colors.info,
        },
        {
            icon: 'payments' as const,
            label: 'Chi phí tháng',
            value: formatCurrency(stats?.expenses?.this_month ?? 0) + '₫',
            color: Colors.warning,
            borderColor: Colors.warning,
        },
        {
            icon: 'warning' as const,
            label: 'Công nợ quá hạn',
            value: formatCurrency(stats?.receivables?.overdue ?? 0) + '₫',
            color: Colors.error,
            borderColor: Colors.error,
        },
    ], [stats]);

    return (
        <View style={styles.kpiGrid}>
            {kpiItems.map((item, index) => (
                <FadeInView key={item.label} delay={index * STAGGER_DELAY}>
                    <View style={[styles.kpiCard, { borderLeftColor: item.borderColor }]}>
                        <View style={styles.kpiHeader}>
                            <MaterialIcons name={item.icon} size={18} color={item.color} />
                            <Text style={styles.kpiLabel} numberOfLines={1}>{item.label}</Text>
                        </View>
                        <Text style={[styles.kpiValue, { color: item.color }]}>{item.value}</Text>
                    </View>
                </FadeInView>
            ))}
        </View>
    );
});

const TodayEvents = React.memo(function TodayEvents({ orders }: { orders: any[] }) {
    const router = useRouter();

    if (orders.length === 0) {
        return (
            <FadeInView delay={STAGGER_DELAY * 5}>
                <View style={styles.section}>
                    <SectionHeader icon="event" title="Sự kiện hôm nay" count={0} />
                    <View style={styles.emptyCard}>
                        <MaterialIcons name="event-available" size={40} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>Không có sự kiện</Text>
                        <Text style={styles.emptyText}>Không có sự kiện nào được lên lịch cho hôm nay</Text>
                    </View>
                </View>
            </FadeInView>
        );
    }

    return (
        <FadeInView delay={STAGGER_DELAY * 5}>
            <View style={styles.section}>
                <SectionHeader icon="event" title="Sự kiện hôm nay" count={orders.length} />
                {orders.slice(0, 5).map((order: any, index: number) => {
                    const chip = STATUS_CHIP[order.status] || STATUS_CHIP.DEFAULT;
                    return (
                        <FadeInView key={order.id} delay={STAGGER_DELAY * (6 + index)}>
                            <Pressable
                                style={({ pressed }) => [styles.eventCard, pressed && styles.pressed]}
                                onPress={() => { hapticLight(); router.push(`/orders/${order.id}`); }}
                                accessibilityLabel={`Đơn hàng ${order.code} - ${order.customer_name}`}
                                accessibilityRole="button"
                                accessibilityHint="Nhấn để xem chi tiết đơn hàng"
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                            >
                                {/* Left accent */}
                                <View style={[styles.eventAccent, { backgroundColor: chip.text }]} />

                                <View style={styles.eventBody}>
                                    {/* Top row: code + time */}
                                    <View style={styles.eventTopRow}>
                                        <Text style={styles.eventCode}>{order.code}</Text>
                                        <View style={styles.eventTimeRow}>
                                            <MaterialIcons name="schedule" size={14} color={Colors.textSecondary} />
                                            <Text style={styles.eventTime}>
                                                {formatTime(order.event_start_time || order.start_time)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Customer */}
                                    <Text style={styles.eventCustomer} numberOfLines={1}>{order.customer_name}</Text>

                                    {/* Location */}
                                    {order.event_location && (
                                        <View style={styles.eventLocationRow}>
                                            <MaterialIcons name="place" size={14} color={Colors.textTertiary} />
                                            <Text style={styles.eventLocation} numberOfLines={1}>
                                                {order.event_location}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Bottom: status chip + amount */}
                                    <View style={styles.eventBottom}>
                                        <View style={[styles.chip, { backgroundColor: chip.bg }]}>
                                            <Text style={[styles.chipText, { color: chip.text }]}>
                                                {chip.label || order.status}
                                            </Text>
                                        </View>
                                        <Text style={styles.eventAmount}>
                                            {formatFullCurrency(order.total_amount ?? order.final_amount ?? 0)}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        </FadeInView>
                    );
                })}
            </View>
        </FadeInView>
    );
});

// --- Hero Actions: Prominent gradient buttons for Expense & Payment ---
const HeroActions = React.memo(function HeroActions() {
    const router = useRouter();

    return (
        <FadeInView delay={STAGGER_DELAY * 4}>
            <View style={styles.heroSection}>
                {/* Ghi nhận chi tiêu */}
                <Pressable
                    style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                    onPress={() => { hapticLight(); router.push('/finance/create-expense' as any); }}
                    accessibilityLabel="Ghi nhận chi tiêu"
                    accessibilityRole="button"
                    accessibilityHint="Mở form ghi nhận chi phí nhanh"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <LinearGradient
                        colors={['#e65100', '#ff6d00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroIconCircle}>
                            <MaterialIcons name="add-shopping-cart" size={28} color="#e65100" />
                        </View>
                        <View style={styles.heroTextBlock}>
                            <Text style={styles.heroTitle}>Ghi chi tiêu</Text>
                            <Text style={styles.heroSubtitle}>Ghi nhận chi phí phát sinh</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </Pressable>

                {/* Ghi nhận thanh toán */}
                <Pressable
                    style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                    onPress={() => { hapticLight(); router.push('/finance/record-payment' as any); }}
                    accessibilityLabel="Ghi nhận thanh toán"
                    accessibilityRole="button"
                    accessibilityHint="Mở form ghi nhận thanh toán nhanh"
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                    <LinearGradient
                        colors={['#00695c', '#00897b']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroIconCircle}>
                            <MaterialIcons name="credit-score" size={28} color="#00695c" />
                        </View>
                        <View style={styles.heroTextBlock}>
                            <Text style={styles.heroTitle}>Ghi thanh toán</Text>
                            <Text style={styles.heroSubtitle}>Thu tiền đơn hàng nhanh</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </Pressable>
            </View>
        </FadeInView>
    );
});

const QuickActionsGrid = React.memo(function QuickActionsGrid() {
    const router = useRouter();

    return (
        <FadeInView delay={STAGGER_DELAY * 12}>
            <View style={styles.section}>
                <SectionHeader icon="bolt" title="Truy cập nhanh" />
                <View style={styles.quickGrid}>
                    {QUICK_ACTIONS.map((action) => (
                        <Pressable
                            key={action.route}
                            style={({ pressed }) => [styles.quickBtn, pressed && styles.pressed]}
                            onPress={() => { hapticLight(); router.push(action.route as any); }}
                            accessibilityLabel={action.label}
                            accessibilityRole="button"
                            accessibilityHint={`Mở ${action.label}`}
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <View style={[styles.quickIconCircle, { backgroundColor: action.bgColor }]}>
                                <MaterialIcons name={action.icon} size={24} color={action.color} />
                            </View>
                            <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </FadeInView>
    );
});

const SectionHeader = React.memo(function SectionHeader({
    icon,
    title,
    count,
}: {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    count?: number;
}) {
    return (
        <View style={styles.sectionHeaderRow}>
            <MaterialIcons name={icon} size={20} color={Colors.textPrimary} />
            <Text style={styles.sectionTitle}>{title}</Text>
            {count !== undefined && (
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            )}
        </View>
    );
});

// --- Main Screen ---
export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);

    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
    const { data: todayOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useTodayOrders();
    const { data: pending } = usePendingActions();

    const isLoading = statsLoading || ordersLoading;

    const pendingTotal = useMemo(() =>
        (pending?.quotes_pending ?? 0) +
        (pending?.orders_pending ?? 0) +
        (pending?.purchase_pending ?? 0) +
        (pending?.leave_pending ?? 0),
        [pending]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchStats(), refetchOrders()]);
        setRefreshing(false);
    }, [refetchStats, refetchOrders]);

    const displayName = user?.full_name || user?.email || 'Bạn';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.primary}
                    colors={[Colors.primary, Colors.primaryDark]}
                    progressViewOffset={insets.top}
                />
            }
        >
            {/* Offline Banner */}
            <OfflineBanner />

            {/* Gradient Header — dynamic safe area */}
            <GradientHeader
                userName={displayName}
                pendingNotifications={pendingTotal}
                topInset={insets.top}
            />

            {/* KPI Summary */}
            {isLoading && !refreshing ? (
                <KPISkeleton />
            ) : (
                <KPIGrid stats={stats} />
            )}

            {/* Hero Actions — Prominent expense/payment buttons */}
            <HeroActions />

            {/* Today's Events */}
            {isLoading && !refreshing ? (
                <EventsSkeleton />
            ) : (
                <TodayEvents orders={todayOrders} />
            )}

            {/* Quick Actions */}
            <QuickActionsGrid />

            {/* Bottom spacer for safe area */}
            <View style={{ height: Math.max(insets.bottom, 32) }} />
        </ScrollView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    content: {
        paddingBottom: 24,
    },

    // Header
    header: {
        paddingBottom: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
        borderBottomLeftRadius: BorderRadius.xl,
        borderBottomRightRadius: BorderRadius.xl,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
        marginRight: Spacing.lg,
    },
    greeting: {
        fontSize: FontSize.md,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '400',
    },
    userName: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: '#ffffff',
        marginTop: 2,
    },
    headerDate: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.7)',
        marginTop: Spacing.xs,
    },
    notificationBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: Colors.gradientEnd,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#ffffff',
    },

    // KPI Grid
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        marginTop: -Spacing.lg, // overlap with header
    },
    kpiCard: {
        width: KPI_CARD_WIDTH,
        flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    kpiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    kpiLabel: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    kpiValue: {
        fontSize: FontSize.xl,
        fontWeight: '800',
        marginTop: Spacing.sm,
        fontVariant: ['tabular-nums'],
    },

    // Sections
    section: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
        flex: 1,
    },
    countBadge: {
        backgroundColor: Colors.primaryContainer,
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    countText: {
        fontSize: FontSize.xs,
        fontWeight: '700',
        color: Colors.primary,
    },

    // Empty state
    emptyCard: {
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xxxl,
        alignItems: 'center',
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    emptyTitle: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    emptyText: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },

    // Event cards
    eventCard: {
        flexDirection: 'row',
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    eventAccent: {
        width: 4,
    },
    eventBody: {
        flex: 1,
        padding: Spacing.lg,
        gap: 4,
    },
    eventTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eventCode: {
        fontSize: FontSize.sm,
        fontWeight: '700',
        color: Colors.primary,
        fontVariant: ['tabular-nums'],
    },
    eventTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventTime: {
        fontSize: FontSize.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    eventCustomer: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    eventLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    eventLocation: {
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        flex: 1,
    },
    eventBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    chip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    chipText: {
        fontSize: FontSize.xs,
        fontWeight: '600',
    },
    eventAmount: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.success,
        fontVariant: ['tabular-nums'],
    },

    // Hero Actions
    heroSection: {
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        gap: Spacing.sm,
    },
    heroButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    heroGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    heroIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTextBlock: {
        flex: 1,
        marginLeft: Spacing.lg,
    },
    heroTitle: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: '#ffffff',
    },
    heroSubtitle: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Quick Actions
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    quickBtn: {
        width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 3,
        flexGrow: 1,
        backgroundColor: Colors.bgPrimary,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    quickIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontSize: FontSize.xs,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
    },
});
