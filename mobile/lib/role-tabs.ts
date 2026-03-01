// Role-based tab configuration
// Maps user roles to their visible bottom tabs
export type TabKey = 'home' | 'schedule' | 'notifications' | 'purchase' | 'profile';

interface TabConfig {
    key: TabKey;
    name: string;
    label: string;
    icon: string;   // Material Icon name (Filled)
    title: string;
}

const ALL_TABS: TabConfig[] = [
    { key: 'home', name: 'home', label: 'Trang chủ', icon: 'home', title: 'Trang chủ' },
    { key: 'schedule', name: 'schedule', label: 'Lịch', icon: 'event', title: 'Lịch làm việc' },
    { key: 'notifications', name: 'notifications', label: 'Thông báo', icon: 'notifications', title: 'Thông báo' },
    { key: 'purchase', name: 'purchase', label: 'Mua hàng', icon: 'shopping_cart', title: 'Mua hàng' },
    { key: 'profile', name: 'profile', label: 'Tài khoản', icon: 'person', title: 'Tài khoản' },
];

// Role → visible tabs mapping (max 5 tabs per Material Design guidelines)
const ROLE_TABS: Record<string, TabKey[]> = {
    // Admin/Manager: Home + Schedule + Notifications + Purchase + Profile
    'SUPER_ADMIN': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    'ADMIN': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    'MANAGER': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    // Chef: Schedule-focused — Home + Schedule + Notifications + Purchase + Profile
    'CHEF': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    // Staff: Schedule-focused — Home + Schedule + Notifications + Purchase + Profile
    'STAFF': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    'SERVER': ['home', 'schedule', 'notifications', 'purchase', 'profile'],
    // Purchasing: Purchase-focused — Home + Purchase + Schedule + Notifications + Profile
    'PURCHASING': ['home', 'purchase', 'schedule', 'notifications', 'profile'],
    'WAREHOUSE': ['home', 'purchase', 'schedule', 'notifications', 'profile'],
};

// Default fallback: all tabs
const DEFAULT_TABS: TabKey[] = ['home', 'schedule', 'notifications', 'purchase', 'profile'];

export function getTabsForRole(roleCode: string | undefined): TabConfig[] {
    const keys = ROLE_TABS[roleCode?.toUpperCase() || ''] || DEFAULT_TABS;
    return keys.map(key => ALL_TABS.find(t => t.key === key)!).filter(Boolean);
}

export { ALL_TABS };
