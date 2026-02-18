'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconMenu2, IconLogout, IconUser, IconSettings, IconBuilding } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { usePermission } from '@/hooks/usePermission';

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { canAccessModule } = usePermission();

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
                type="button"
                className="lg:hidden -m-2.5 p-2.5 text-gray-700 dark:text-gray-300"
                onClick={onMenuClick}
                aria-label="Mở menu"
            >
                <IconMenu2 className="h-6 w-6" />
            </button>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" />

            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                {/* Search placeholder */}
                <div className="flex flex-1 items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Xin chào, {user?.full_name || 'User'}!
                    </h2>
                </div>

                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Notifications - Dynamic with real data */}
                    <NotificationBell />

                    {/* User menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white">
                                        {user?.full_name ? getInitials(user.full_name) : 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/profile')}>
                                <IconUser className="mr-2 h-4 w-4" />
                                Trang cá nhân
                            </DropdownMenuItem>
                            {canAccessModule('settings') && (
                                <DropdownMenuItem onClick={() => router.push('/settings')}>
                                    <IconSettings className="mr-2 h-4 w-4" />
                                    Cài đặt
                                </DropdownMenuItem>
                            )}
                            {canAccessModule('tenant') && (
                                <DropdownMenuItem onClick={() => router.push('/admin/tenants')}>
                                    <IconBuilding className="mr-2 h-4 w-4" />
                                    Quản lý Tenant
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                <IconLogout className="mr-2 h-4 w-4" />
                                Đăng xuất
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
