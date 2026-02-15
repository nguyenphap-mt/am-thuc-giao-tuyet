// Tab Navigator Layout
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../constants/colors';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
    const icons: Record<string, string> = {
        'Lịch': '📅',
        'Thông báo': '🔔',
        'Mua hàng': '🛒',
        'Bếp': '👨‍🍳',
        'Tài khoản': '👤',
    };
    return (
        <View style={styles.iconWrapper}>
            <Text style={[styles.icon, focused && styles.iconFocused]}>
                {icons[name] || '📋'}
            </Text>
        </View>
    );
}

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: Colors.bgPrimary,
                    elevation: 0,
                    shadowOpacity: 0,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.borderLight,
                },
                headerTitleStyle: {
                    fontSize: FontSize.lg,
                    fontWeight: '700',
                    color: Colors.textPrimary,
                },
                tabBarStyle: {
                    backgroundColor: Colors.bgPrimary,
                    borderTopWidth: 1,
                    borderTopColor: Colors.borderLight,
                    height: 85,
                    paddingBottom: 25,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textTertiary,
                tabBarLabelStyle: {
                    fontSize: FontSize.xs,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="schedule"
                options={{
                    title: 'Lịch làm việc',
                    tabBarLabel: 'Lịch',
                    tabBarIcon: ({ focused }) => <TabIcon name="Lịch" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Thông báo',
                    tabBarLabel: 'Thông báo',
                    tabBarIcon: ({ focused }) => <TabIcon name="Thông báo" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="purchase"
                options={{
                    title: 'Mua hàng',
                    tabBarLabel: 'Mua hàng',
                    tabBarIcon: ({ focused }) => <TabIcon name="Mua hàng" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="prep"
                options={{
                    title: 'Phiếu chuẩn bị',
                    tabBarLabel: 'Bếp',
                    tabBarIcon: ({ focused }) => <TabIcon name="Bếp" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Tài khoản',
                    tabBarLabel: 'Tài khoản',
                    tabBarIcon: ({ focused }) => <TabIcon name="Tài khoản" focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 22,
    },
    iconFocused: {
        fontSize: 24,
    },
});
