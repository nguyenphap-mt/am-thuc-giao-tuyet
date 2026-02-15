'use client';

import { usePermission } from '@/hooks/usePermission';
import { ReactNode } from 'react';

interface PermissionGateProps {
    /** Module name (e.g., 'order', 'quote', 'finance') */
    module: string;
    /** Action name (e.g., 'create', 'delete', 'close_period') */
    action: string;
    /** Content to render when permission is granted */
    children: ReactNode;
    /** Optional fallback when permission is denied (default: null = hidden) */
    fallback?: ReactNode;
}

/**
 * PermissionGate — Conditionally renders children based on user's permission.
 * 
 * Usage:
 * ```tsx
 * <PermissionGate module="order" action="create">
 *   <Button>Tạo đơn hàng</Button>
 * </PermissionGate>
 * 
 * <PermissionGate module="hr" action="delete" fallback={<span>No access</span>}>
 *   <Button variant="destructive">Xóa</Button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({ module, action, children, fallback = null }: PermissionGateProps) {
    const { canPerformAction } = usePermission();

    if (!canPerformAction(module, action)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
