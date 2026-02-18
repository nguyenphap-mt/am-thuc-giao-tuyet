'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RevenueChart, OrdersChart } from '@/components/charts';
import { api } from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DashboardStats } from '@/types';
import {
    IconShoppingCart,
    IconCash,
    IconClock,
    IconUsers,
    IconTrendingUp,
    IconCalendarEvent,
    IconPackage,
    IconAlertTriangle,
    IconPackageOff,
    IconClockHour4,
} from '@tabler/icons-react';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4 }
    }
};

const chartVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, delay: 0.3 }
    }
};

// E3: Inventory stats type
interface InventoryStats {
    total_sku: number;
    warning_items: number;
    out_of_stock: number;
    total_value: number;
}

interface InventoryAlerts {
    summary: {
        low_stock_count: number;
        expiring_count: number;
        out_of_stock_count: number;
        total_alerts: number;
    };
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.get<DashboardStats>('/dashboard/stats');
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                setStats({
                    total_orders: 156,
                    total_revenue: 2450000000,
                    pending_orders: 12,
                    customers_count: 89,
                    orders_today: 5,
                    revenue_today: 125000000,
                });
            } finally {
                setIsLoading(false);
            }
        };

        // E3: Fetch inventory stats
        const fetchInventoryStats = async () => {
            try {
                const data = await api.get<InventoryStats>('/inventory/stats');
                setInventoryStats(data);
            } catch (error) {
                console.error('Failed to fetch inventory stats:', error);
                setInventoryStats(null);
            }
        };

        fetchStats();
        fetchInventoryStats();
    }, []);

    const statCards = [
        {
            title: 'Tổng đơn hàng',
            value: stats?.total_orders || 0,
            format: 'number',
            icon: IconShoppingCart,
            gradient: 'from-pink-500 to-rose-500',
            bgColor: 'bg-gradient-to-br from-pink-50 to-rose-50',
            iconColor: 'text-pink-600',
        },
        {
            title: 'Tổng doanh thu',
            value: stats?.total_revenue || 0,
            format: 'currency',
            icon: IconCash,
            gradient: 'from-green-500 to-emerald-500',
            bgColor: 'bg-gradient-to-br from-green-50 to-emerald-50',
            iconColor: 'text-green-600',
        },
        {
            title: 'Đơn chờ xử lý',
            value: stats?.pending_orders || 0,
            format: 'number',
            icon: IconClock,
            gradient: 'from-amber-500 to-orange-500',
            bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
            iconColor: 'text-amber-600',
        },
        {
            title: 'Khách hàng',
            value: stats?.customers_count || 0,
            format: 'number',
            icon: IconUsers,
            gradient: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50',
            iconColor: 'text-blue-600',
        },
        {
            title: 'Đơn hôm nay',
            value: stats?.orders_today || 0,
            format: 'number',
            icon: IconCalendarEvent,
            gradient: 'from-purple-500 to-violet-500',
            bgColor: 'bg-gradient-to-br from-purple-50 to-violet-50',
            iconColor: 'text-purple-600',
        },
        {
            title: 'Doanh thu hôm nay',
            value: stats?.revenue_today || 0,
            format: 'currency',
            icon: IconTrendingUp,
            gradient: 'from-indigo-500 to-blue-500',
            bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50',
            iconColor: 'text-indigo-600',
        },
    ];

    // E3: Inventory KPI cards
    const inventoryCards = inventoryStats ? [
        {
            title: 'Giá trị tồn kho',
            value: inventoryStats.total_value || 0,
            format: 'currency' as const,
            icon: IconPackage,
            bgColor: 'bg-gradient-to-br from-teal-50 to-emerald-50',
            iconColor: 'text-teal-600',
            borderColor: 'border-l-teal-500',
        },
        {
            title: 'Tổng SKU',
            value: inventoryStats.total_sku || 0,
            format: 'number' as const,
            icon: IconPackage,
            bgColor: 'bg-gradient-to-br from-sky-50 to-blue-50',
            iconColor: 'text-sky-600',
            borderColor: 'border-l-sky-500',
        },
        {
            title: 'Sắp hết hàng',
            value: inventoryStats.warning_items || 0,
            format: 'number' as const,
            icon: IconAlertTriangle,
            bgColor: 'bg-gradient-to-br from-amber-50 to-yellow-50',
            iconColor: 'text-amber-600',
            borderColor: 'border-l-amber-500',
        },
        {
            title: 'Hết hàng',
            value: inventoryStats.out_of_stock || 0,
            format: 'number' as const,
            icon: IconPackageOff,
            bgColor: 'bg-gradient-to-br from-red-50 to-rose-50',
            iconColor: 'text-red-600',
            borderColor: 'border-l-red-500',
        },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Tổng quan hoạt động kinh doanh</p>
            </motion.div>

            {/* Stats Grid - Responsive */}
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                {statCards.map((stat, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {stat.title}
                                </CardTitle>
                                <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-8 w-32" />
                                ) : (
                                    <motion.div
                                        className="text-2xl font-bold text-gray-900 dark:text-gray-100"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 + index * 0.05 }}
                                    >
                                        {stat.format === 'currency'
                                            ? formatCurrency(stat.value)
                                            : formatNumber(stat.value)}
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>

            {/* E3: Inventory KPI Section */}
            {inventoryCards.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <IconPackage className="h-5 w-5 text-teal-600" />
                        Kho hàng
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        {inventoryCards.map((card, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.08 }}
                            >
                                <Card className={`overflow-hidden border-l-4 ${card.borderColor} hover:shadow-md transition-all duration-200 cursor-pointer`}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                {card.title}
                                            </span>
                                            <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
                                                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                            {card.format === 'currency'
                                                ? formatCurrency(card.value)
                                                : formatNumber(card.value)}
                                        </div>
                                        {card.title === 'Hết hàng' && card.value > 0 && (
                                            <span className="text-xs text-red-500 font-medium mt-1 inline-block">
                                                ⚠ Cần nhập thêm
                                            </span>
                                        )}
                                        {card.title === 'Sắp hết hàng' && card.value > 0 && (
                                            <span className="text-xs text-amber-500 font-medium mt-1 inline-block">
                                                Theo dõi mức tồn
                                            </span>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Charts Section - Responsive */}
            <motion.div
                className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6"
                variants={chartVariants}
                initial="hidden"
                animate="show"
            >
                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconTrendingUp className="h-5 w-5 text-pink-600" />
                            Doanh thu 7 ngày gần nhất
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Skeleton className="h-full w-full rounded-lg" />
                            </div>
                        ) : (
                            <RevenueChart data={[]} />
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <IconShoppingCart className="h-5 w-5 text-blue-600" />
                            Đơn hàng theo trạng thái
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Skeleton className="h-full w-full rounded-lg" />
                            </div>
                        ) : (
                            <OrdersChart data={[]} />
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Recent Activity Section - Responsive */}
            <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Đơn hàng gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Chưa có dữ liệu đơn hàng
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Lịch sự kiện hôm nay</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Không có sự kiện nào hôm nay
                            </p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
