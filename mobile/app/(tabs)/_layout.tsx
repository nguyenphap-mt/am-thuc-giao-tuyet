// Tab Navigator Layout — MD3 Navigation Bar with pill-shaped active indicator
// Follows Material Design 3 spec: 80dp height, filled/outlined icons, labels always visible
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize } from '../../constants/colors';
import { useAuthStore } from '../../lib/auth-store';
import { getTabsForRole, ALL_TABS } from '../../lib/role-tabs';

// MD3: Active = Filled icon, Inactive = Outlined icon
const ICON_MAP: Record<string, { filled: keyof typeof MaterialIcons.glyphMap; outlined: keyof typeof MaterialIcons.glyphMap }> = {
    'home': { filled: 'home', outlined: 'home' },
    'event': { filled: 'event', outlined: 'event' },
    'notifications': { filled: 'notifications', outlined: 'notifications-none' },
    'shopping_cart': { filled: 'shopping-cart', outlined: 'shopping-cart' },
    'person': { filled: 'person', outlined: 'person-outline' },
};

function TabIcon({ iconName, focused }: { iconName: string; focused: boolean }) {
    const icons = ICON_MAP[iconName] || { filled: 'circle', outlined: 'circle' };
    const materialName = focused ? icons.filled : icons.outlined;
    return (
        <View style={styles.iconContainer}>
            {/* MD3: Pill-shaped active indicator behind icon */}
            {focused && <View style={styles.activeIndicator} />}
            <MaterialIcons
                name={materialName}
                size={24}
                color={focused ? Colors.primary : Colors.textTertiary}
            />
        </View>
    );
}

export default function TabsLayout() {
    const { user } = useAuthStore();
    const visibleTabs = getTabsForRole(user?.role?.code);
    const visibleKeys = new Set(visibleTabs.map(t => t.key));

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
                    backgroundColor: Colors.surface,
                    borderTopWidth: 0,           // MD3: no border, use elevation
                    height: 80,                  // MD3: 80dp
                    paddingBottom: 16,
                    paddingTop: 12,
                    elevation: 2,                // MD3: Surface tint elevation 2
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 3,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.onSurfaceVariant,
                tabBarLabelStyle: {
                    fontSize: 12,                // MD3: Label Medium
                    fontWeight: '600',
                    marginTop: 4,
                    letterSpacing: 0.5,
                },
            }}
        >
            {ALL_TABS.map(tab => (
                <Tabs.Screen
                    key={tab.key}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarLabel: tab.label,
                        tabBarIcon: ({ focused }) => <TabIcon iconName={tab.icon} focused={focused} />,
                        // Hide header for Home (has its own gradient header)
                        headerShown: tab.key !== 'home',
                        // Hide tabs not in user's role
                        href: visibleKeys.has(tab.key) ? undefined : null,
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 64,              // MD3: container width for indicator
        height: 32,             // MD3: container height
        position: 'relative',
    },
    activeIndicator: {
        position: 'absolute',
        width: 64,              // MD3: pill width
        height: 32,             // MD3: pill height
        borderRadius: 16,       // MD3: fully rounded pill
        backgroundColor: Colors.primaryContainer,
    },
});
