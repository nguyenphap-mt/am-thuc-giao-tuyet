'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    IconHome,
    IconFileText,
    IconShoppingCart,
    IconUsers,
    IconPackage,
    IconTruck,
    IconCash,
    IconUserCircle,
    IconCalendar,
    IconChartBar,
    IconSettings,
    IconReceipt,
    IconChefHat,
    IconBuilding,
} from '@tabler/icons-react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: IconHome },
    { name: 'Báo giá', href: '/quote', icon: IconFileText },
    { name: 'Đơn hàng', href: '/orders', icon: IconShoppingCart },
    { name: 'Khách hàng', href: '/crm', icon: IconUsers },
    { name: 'Thực đơn', href: '/menu', icon: IconChefHat },
    { name: 'Kho hàng', href: '/inventory', icon: IconPackage },
    { name: 'Mua hàng', href: '/procurement', icon: IconTruck },
    { name: 'Nhà cung cấp', href: '/suppliers', icon: IconBuilding },
    { name: 'Tài chính', href: '/finance', icon: IconCash },
    { name: 'Nhân sự', href: '/hr', icon: IconUserCircle },
    { name: 'Lịch', href: '/calendar', icon: IconCalendar },
    { name: 'Báo cáo', href: '/analytics', icon: IconChartBar },
    { name: 'Hóa đơn', href: '/invoice', icon: IconReceipt },
    { name: 'Cài đặt', href: '/settings', icon: IconSettings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
                    {/* Logo */}
                    <div className="flex h-16 shrink-0 items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-white">GT</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Giao Tuyết
                                </h1>
                                <p className="text-xs text-gray-500">Catering ERP</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-1 flex-col">
                        <ul role="list" className="flex flex-1 flex-col gap-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                return (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'group flex gap-x-3 rounded-lg p-2.5 text-sm font-medium transition-all duration-200',
                                                isActive
                                                    ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-purple-700'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            )}
                                        >
                                            <item.icon
                                                className={cn(
                                                    'h-5 w-5 shrink-0 transition-colors',
                                                    isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'
                                                )}
                                            />
                                            {item.name}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
}
