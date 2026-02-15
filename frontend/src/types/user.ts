// Shared types for User Management module
// Used by: user-management-tab.tsx, user-modal.tsx, permission-matrix-tab.tsx

export interface UserRole {
    id: string;
    code: string;
    name: string;
    permissions: string[];
}

export interface UserItem {
    id: string;
    email: string;
    full_name: string;
    role: UserRole | string;
    is_active: boolean;
    status?: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
}

export interface UserStats {
    total: number;
    active: number;
    inactive: number;
    by_role: Record<string, number>;
    by_status: Record<string, number>;
}

export interface RoleOption {
    id: string;
    code: string;
    name: string;
}

export interface RoleData {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissions: string[];
    is_system: boolean;
}

// Helper functions
export function getRoleCode(role: UserRole | string): string {
    if (typeof role === 'string') return role;
    return role?.code || 'staff';
}

export const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Quản lý',
    chef: 'Đầu bếp',
    sales: 'Kinh doanh',
    staff: 'Nhân viên',
    accountant: 'Kế toán',
    viewer: 'Người xem',
};

export function getRoleName(role: UserRole | string): string {
    const code = getRoleCode(role);
    return ROLE_LABELS[code] || code.toUpperCase();
}

export const ROLE_BADGE_COLORS: Record<string, string> = {
    super_admin: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white',
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    chef: 'bg-orange-100 text-orange-700',
    sales: 'bg-green-100 text-green-700',
    staff: 'bg-gray-100 text-gray-700',
    accountant: 'bg-amber-100 text-amber-700',
    viewer: 'bg-slate-100 text-slate-600',
};

// Neutral avatar colors — distinct from role badge colors to avoid gradient-on-small-circle issues
export const AVATAR_COLORS: string[] = [
    'bg-purple-100 text-purple-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-rose-100 text-rose-700',
];

export function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
