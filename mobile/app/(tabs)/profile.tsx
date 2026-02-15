// Profile Screen — with More menu navigation
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../lib/auth-store';
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/colors';

interface MenuItem {
    icon: string;
    label: string;
    route: string;
    managerOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
    { icon: '📋', label: 'Đơn hàng', route: '/orders' },
    { icon: '📦', label: 'Kho hàng', route: '/inventory' },
    { icon: '📊', label: 'Dashboard', route: '/dashboard', managerOnly: true },
    { icon: '👥', label: 'Nhân sự', route: '/hr/timesheet' },
    { icon: '💰', label: 'Tài chính', route: '/finance', managerOnly: true },
    { icon: '🤝', label: 'Khách hàng', route: '/crm' },
    { icon: '📅', label: 'Lịch sự kiện', route: '/calendar' },
    { icon: '📄', label: 'Báo giá', route: '/quotes' },
    { icon: '📈', label: 'Báo cáo', route: '/reports', managerOnly: true },
];

const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const isManager = MANAGER_ROLES.includes(user?.role?.code || '');

    const handleLogout = () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: () => logout(),
                },
            ]
        );
    };

    const initials = user?.full_name
        ?.split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '??';

    const visibleMenuItems = MENU_ITEMS.filter(
        item => !item.managerOnly || isManager
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
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
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vai trò</Text>
                    <Text style={styles.infoValue}>
                        {user?.role?.name || user?.role?.code || 'N/A'}
                    </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
                </View>
            </View>

            {/* More Menu */}
            <View style={styles.menuSection}>
                <Text style={styles.menuTitle}>📱 Chức năng</Text>
                {visibleMenuItems.map((item, index) => (
                    <TouchableOpacity
                        key={item.route}
                        style={[
                            styles.menuItem,
                            index === visibleMenuItems.length - 1 && { borderBottomWidth: 0 },
                        ]}
                        activeOpacity={0.6}
                        onPress={() => router.push(item.route as any)}
                    >
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        <Text style={styles.menuArrow}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* App Info */}
            <View style={styles.section}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phiên bản</Text>
                    <Text style={styles.infoValue}>2.0.0</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ứng dụng</Text>
                    <Text style={styles.infoValue}>Ẩm Thực Giao Tuyết</Text>
                </View>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
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
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.error,
        alignItems: 'center',
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
    menuTitle: {
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.textPrimary,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    menuIcon: {
        fontSize: 20,
        marginRight: Spacing.md,
    },
    menuLabel: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    menuArrow: {
        fontSize: FontSize.xl,
        color: Colors.textTertiary,
    },
});
