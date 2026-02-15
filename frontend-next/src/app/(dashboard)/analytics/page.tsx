'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { IconChartBar, IconChartPie, IconTrendingUp, IconCalendar } from '@tabler/icons-react';

export default function AnalyticsPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['analytics-stats'],
        queryFn: () => api.get<any>('/analytics/overview'),
    });

    const statCards = [
        { title: 'Doanh thu', value: stats?.revenue_month || 0, icon: IconTrendingUp, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
        { title: 'Đơn hàng', value: stats?.orders_month || 0, icon: IconChartBar, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', format: 'number' },
        { title: 'KH mới', value: stats?.new_customers || 0, icon: IconChartPie, bgColor: 'bg-purple-50', iconColor: 'text-purple-600', format: 'number' },
        { title: 'Sự kiện', value: stats?.upcoming_events || 0, icon: IconCalendar, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', format: 'number' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Báo cáo & Phân tích</h1>
                <p className="text-sm text-gray-500">Dữ liệu thống kê kinh doanh</p>
            </motion.div>

            {/* Stats */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {statCards.map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            {isLoading ? <Skeleton className="h-12 w-full" /> : (
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                        <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">{stat.title}</p>
                                        <p className="text-sm md:text-base font-bold truncate">
                                            {stat.format === 'number' ? formatNumber(stat.value) : formatCurrency(stat.value)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Tabs defaultValue="revenue" className="space-y-4">
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="revenue" className="text-xs md:text-sm">Doanh thu</TabsTrigger>
                        <TabsTrigger value="orders" className="text-xs md:text-sm">Đơn hàng</TabsTrigger>
                        <TabsTrigger value="customers" className="text-xs md:text-sm">Khách hàng</TabsTrigger>
                        <TabsTrigger value="products" className="text-xs md:text-sm">Sản phẩm</TabsTrigger>
                    </TabsList>
                    {['revenue', 'orders', 'customers', 'products'].map((tab) => (
                        <TabsContent key={tab} value={tab}>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">
                                        Biểu đồ {tab === 'revenue' ? 'doanh thu' : tab === 'orders' ? 'đơn hàng' : tab === 'customers' ? 'khách hàng' : 'sản phẩm'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-48 md:h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                                        📊 Biểu đồ Recharts
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </motion.div>
        </div>
    );
}
