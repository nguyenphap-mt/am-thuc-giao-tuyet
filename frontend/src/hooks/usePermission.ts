'use client';

import { useAuthStore } from '@/stores/auth-store';

/**
 * Module Access Config — mirrors backend MODULE_ACCESS in auth/permissions.py
 * Defines which role codes can access each module.
 * "*" means all authenticated users.
 */
const MODULE_ACCESS: Record<string, string[]> = {
    dashboard: ['*'],
    menu: ['super_admin', 'admin', 'manager', 'chef', 'sales', 'viewer'],
    quote: ['super_admin', 'admin', 'manager', 'sales', 'accountant'],
    order: ['super_admin', 'admin', 'manager', 'chef', 'sales', 'staff', 'accountant'],
    calendar: ['super_admin', 'admin', 'manager', 'chef', 'sales', 'staff'],
    procurement: ['super_admin', 'admin', 'manager', 'chef', 'accountant'],
    hr: ['super_admin', 'admin', 'manager'],
    finance: ['super_admin', 'admin', 'manager', 'accountant'],
    crm: ['super_admin', 'admin', 'manager', 'sales'],
    analytics: ['super_admin', 'admin', 'manager', 'sales', 'accountant'],
    inventory: ['super_admin', 'admin', 'manager', 'chef'],
    user: ['super_admin', 'admin'],
    settings: ['super_admin', 'admin'],
    tenant: ['super_admin'],
    notification: ['*'],
};

/**
 * Map frontend routes to backend module names.
 * Used by sidebar to check if user can see a nav item.
 */
export const ROUTE_TO_MODULE: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/menu': 'menu',
    '/quote': 'quote',
    '/orders': 'order',
    '/calendar': 'calendar',
    '/procurement': 'procurement',
    '/inventory': 'inventory',
    '/hr': 'hr',
    '/finance': 'finance',
    '/crm': 'crm',
    '/analytics': 'analytics',
    '/settings': 'settings',
    '/admin/tenants': 'tenant',
};

/**
 * Extract role code from the user object.
 * The API returns role as { code, name, permissions } but the frontend
 * type may store it as a string or object depending on version.
 */
function getRoleCode(user: unknown): string {
    if (!user) return '';
    const u = user as Record<string, unknown>;
    const role = u.role;
    if (!role) return '';
    if (typeof role === 'string') return role.toLowerCase();
    if (typeof role === 'object' && role !== null) {
        const roleObj = role as Record<string, unknown>;
        return (roleObj.code as string || '').toLowerCase();
    }
    return '';
}

/**
 * Extract permissions array from user object.
 */
function getPermissions(user: unknown): string[] {
    if (!user) return [];
    const u = user as Record<string, unknown>;
    const role = u.role;
    if (!role || typeof role !== 'object') return [];
    const roleObj = role as Record<string, unknown>;
    return Array.isArray(roleObj.permissions) ? roleObj.permissions : [];
}

/**
 * Check if a role has access to a module.
 */
export function hasModuleAccess(roleCode: string, module: string): boolean {
    const allowed = MODULE_ACCESS[module];
    if (!allowed) return false;
    if (allowed.includes('*')) return true;
    return allowed.includes(roleCode.toLowerCase());
}

/**
 * Check if a role has a specific action permission.
 */
export function hasActionPermission(
    roleCode: string,
    permissions: string[],
    module: string,
    action: string
): boolean {
    // Super admin always has access
    if (roleCode === 'super_admin') return true;

    // Must have module access first
    if (!hasModuleAccess(roleCode, module)) return false;

    // Check action-level permissions
    const permKey = `${module}:${action}`;
    const wildcardKey = `${module}:*`;

    if (permissions.includes('ALL') || permissions.includes(wildcardKey) || permissions.includes(permKey)) {
        return true;
    }

    // If no granular permissions set, fall back to module-level access
    if (permissions.length === 0) return true;

    return false;
}

/**
 * Hook: usePermission
 * 
 * Usage:
 *   const { canAccessModule, canPerformAction, userRole, filterNavigation } = usePermission();
 *   
 *   if (canAccessModule('finance')) { ... }
 *   if (canPerformAction('order', 'delete')) { ... }
 */
export function usePermission() {
    const user = useAuthStore(state => state.user);
    const roleCode = getRoleCode(user);
    const permissions = getPermissions(user);

    return {
        userRole: roleCode,

        /** Check if user can access an entire module */
        canAccessModule: (module: string): boolean => {
            return hasModuleAccess(roleCode, module);
        },

        /** Check if user can perform a specific action in a module */
        canPerformAction: (module: string, action: string): boolean => {
            return hasActionPermission(roleCode, permissions, module, action);
        },

        /** Filter navigation items based on user's module access */
        filterNavigation: <T extends { href: string }>(items: T[]): T[] => {
            return items.filter(item => {
                const module = ROUTE_TO_MODULE[item.href];
                if (!module) return true; // Unknown routes stay visible
                return hasModuleAccess(roleCode, module);
            });
        },
    };
}
