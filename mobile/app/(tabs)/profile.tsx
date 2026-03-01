// Profile Screen — Material Design 3 with MaterialIcons
// UX Audit fixes: SafeArea, Offline, ScrollIndicator, a11y on info rows + avatar, extracted inline style
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/auth-store';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';
import { hapticLight, hapticWarning } from '../../lib/haptics';
import { useState } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { OfflineBanner } from '../../components/OfflineBanner';

interface MenuItem {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    route: string;
    // Roles that can see this menu item (matches .agent/permission-matrix.md Section 2)
    // undefined = all authenticated users (self-service / open)
    allowedRoles?: string[];
}

// Role constants matching backend MODULE_ACCESS
const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF', 'SALES', 'STAFF', 'ACCOUNTANT', 'VIEWER'];
const ORDER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF', 'SALES', 'STAFF', 'ACCOUNTANT'];
const INVENTORY_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF'];
const HR_ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const CRM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES'];
const CALENDAR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF', 'SALES', 'STAFF'];
const QUOTE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
const ANALYTICS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];

const MENU_ITEMS: MenuItem[] = [
    // Open to order-accessible roles
    { icon: 'receipt-long', label: 'Đơn hàng', route: '/orders', allowedRoles: ORDER_ROLES },
    { icon: 'inventory-2', label: 'Kho hàng', route: '/inventory', allowedRoles: INVENTORY_ROLES },
    // Dashboard open to all
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    // HR admin (employee management)
    { icon: 'people', label: 'Nhân sự', route: '/hr/timesheet', allowedRoles: HR_ADMIN_ROLES },
    // Self-service: all authenticated users
    { icon: 'beach-access', label: 'Nghỉ phép', route: '/hr/leave' },
    { icon: 'fingerprint', label: 'Chấm công', route: '/hr/my-timesheet' },
    { icon: 'payments', label: 'Bảng lương', route: '/hr/my-payroll' },
    // Finance
    { icon: 'account-balance', label: 'Tài chính', route: '/finance', allowedRoles: FINANCE_ROLES },
    { icon: 'add-shopping-cart', label: 'Ghi chi tiêu', route: '/finance/create-expense', allowedRoles: FINANCE_ROLES },
    { icon: 'credit-score', label: 'Ghi thanh toán', route: '/finance/record-payment', allowedRoles: FINANCE_ROLES },
    // CRM
    { icon: 'handshake', label: 'Khách hàng', route: '/crm', allowedRoles: CRM_ROLES },
    // Calendar
    { icon: 'event', label: 'Lịch sự kiện', route: '/calendar', allowedRoles: CALENDAR_ROLES },
    // Quotes
    { icon: 'request-quote', label: 'Báo giá', route: '/quotes', allowedRoles: QUOTE_ROLES },
    // Reports/Analytics
    { icon: 'bar-chart', label: 'Báo cáo', route: '/reports', allowedRoles: ANALYTICS_ROLES },
];

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [showLogout, setShowLogout] = useState(false);

    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');
    const userRoleCode = user?.role?.code || '';

    const handleLogout = () => {
        setShowLogout(true);
    };

    const initials = user?.full_name
        ?.split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';

    const roleName = user?.role?.name || user?.role?.code || 'N/A';
    const emailDisplay = user?.email || 'N/A';

    const visibleMenuItems = MENU_ITEMS.filter(
        item => !item.allowedRoles || item.allowedRoles.includes(userRoleCode)
    );

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <OfflineBanner />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar */}
                <View style={styles.avatarSection}
                    accessibilityLabel={`${user?.full_name || 'Người dùng'}, ${roleName}`}
                    accessibilityRole="header">
                    <LinearGradient
                        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                        style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    <Text style={styles.name}>{user?.full_name || 'Người dùng'}</Text>
                    <Text style={styles.email}>{user?.email || ''}</Text>
                </View>

                {/* Info Cards */}
                <View style={styles.section}>
                    <View style={styles.infoRow}
                        accessibilityLabel={`Vai trò: ${roleName}`}
                        accessibilityRole="text">
                        <View style={styles.infoLeft}>
                            <MaterialIcons name="badge" size={18} color={Colors.textSecondary} />
                            <Text style={styles.infoLabel}>Vai trò</Text>
                        </View>
                        <Text style={styles.infoValue}>{roleName}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}
                        accessibilityLabel={`Email: ${emailDisplay}`}
                        accessibilityRole="text">
                        <View style={styles.infoLeft}>
                            <MaterialIcons name="email" size={18} color={Colors.textSecondary} />
                            <Text style={styles.infoLabel}>Email</Text>
                        </View>
                        <Text style={styles.infoValue}>{emailDisplay}</Text>
                    </View>
                </View>

                {/* More Menu */}
                <View style={styles.menuSection}>
                    <View style={styles.menuTitleRow}>
                        <MaterialIcons name="apps" size={18} color={Colors.textPrimary} />
                        <Text style={styles.menuTitle}>Chức năng</Text>
                    </View>
                    {visibleMenuItems.map((item, index) => (
                        <Pressable
                            key={item.route}
                            style={({ pressed }) => [
                                styles.menuItem,
                                index === visibleMenuItems.length - 1 && styles.menuItemLast,
                                pressed && styles.menuItemPressed,
                            ]}
                            onPress={() => { hapticLight(); router.push(item.route as any); }}
                            accessibilityLabel={item.label}
                            accessibilityRole="button"
                            accessibilityHint={`Mở ${item.label}`}
                            android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                            <MaterialIcons name={item.icon} size={22} color={Colors.textSecondary} />
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <MaterialIcons name="chevron-right" size={22} color={Colors.textTertiary} />
                        </Pressable>
                    ))}
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <View style={styles.infoRow}
                        accessibilityLabel="Phiên bản: 2.0.0"
                        accessibilityRole="text">
                        <View style={styles.infoLeft}>
                            <MaterialIcons name="info" size={18} color={Colors.textSecondary} />
                            <Text style={styles.infoLabel}>Phiên bản</Text>
                        </View>
                        <Text style={styles.infoValue}>2.0.0</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}
                        accessibilityLabel="Ứng dụng: Ẩm Thực Giao Tuyết"
                        accessibilityRole="text">
                        <View style={styles.infoLeft}>
                            <MaterialIcons name="restaurant-menu" size={18} color={Colors.textSecondary} />
                            <Text style={styles.infoLabel}>Ứng dụng</Text>
                        </View>
                        <Text style={styles.infoValue}>Ẩm Thực Giao Tuyết</Text>
                    </View>
                </View>

                {/* Logout Button */}
                <Pressable
                    style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
                    onPress={() => { hapticWarning(); handleLogout(); }}
                    accessibilityLabel="Đăng xuất"
                    accessibilityRole="button"
                    accessibilityHint="Nhấn để đăng xuất khỏi tài khoản"
                    android_ripple={{ color: 'rgba(239,68,68,0.1)' }}
                >
                    <MaterialIcons name="logout" size={20} color={Colors.error} />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </Pressable>
            </ScrollView>

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                visible={showLogout}
                title="Đăng xuất"
                message="Bạn có chắc chắn muốn đăng xuất?"
                confirmText="Đăng xuất"
                cancelText="Hủy"
                onConfirm={() => { setShowLogout(false); logout(); }}
                onCancel={() => setShowLogout(false)}
                variant="danger"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    container: {
        flex: 1,
        backgroundColor: Colors.bgSecondary,
    },
    content: {
        paddingBottom: 100,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        backgroundColor: Colors.bgPrimary,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.xxl,
        fontWeight: '800',
        color: Colors.textInverse,
    },
    name: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginTop: Spacing.md,
    },
    email: {
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    section: {
        backgroundColor: Colors.bgPrimary,
        marginTop: Spacing.md,
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    infoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoLabel: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
    },
    infoValue: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.borderLight,
        marginHorizontal: Spacing.lg,
    },
    logoutButton: {
        marginTop: Spacing.xxl,
        marginHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.error,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.sm,
    },
    logoutText: {
        fontSize: FontSize.md,
        fontWeight: '600',
        color: Colors.error,
    },
    menuSection: {
        backgroundColor: Colors.bgPrimary,
        marginTop: Spacing.md,
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    menuTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    menuTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
        gap: Spacing.md,
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuItemPressed: {
        backgroundColor: Colors.bgTertiary,
    },
    menuLabel: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
});
