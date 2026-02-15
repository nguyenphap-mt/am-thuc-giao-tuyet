'use client';

import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { IconCash, IconTrendingUp, IconTrendingDown, IconWallet } from '@tabler/icons-react';

export default function FinancePage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['finance-stats'],
        queryFn: () => api.get<{
            total_revenue: number;
            total_expenses: number;
            net_profit: number;
            cash_balance: number;
        }>('/finance/stats'),
    });

    const statCards = [
        { title: 'Doanh thu', value: stats?.total_revenue || 0, icon: IconCash, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
        { title: 'Chi phí', value: stats?.total_expenses || 0, icon: IconTrendingDown, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
        { title: 'Lợi nhuận', value: stats?.net_profit || 0, icon: IconTrendingUp, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
        { title: 'Tiền mặt', value: stats?.cash_balance || 0, icon: IconWallet, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tài chính</h1>
                <p className="text-sm text-gray-500">Quản lý tài chính doanh nghiệp</p>
            </motion.div>

            {/* Stats Cards - Responsive */}
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
                                        <p className="text-sm md:text-base font-bold truncate">{formatCurrency(stat.value)}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Tabs - Responsive */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="w-full md:w-auto flex overflow-x-auto">
                        <TabsTrigger value="overview" className="text-xs md:text-sm">Tổng quan</TabsTrigger>
                        <TabsTrigger value="receivables" className="text-xs md:text-sm">Phải thu</TabsTrigger>
                        <TabsTrigger value="payables" className="text-xs md:text-sm">Phải trả</TabsTrigger>
                        <TabsTrigger value="transactions" className="text-xs md:text-sm">Giao dịch</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Biểu đồ doanh thu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48 md:h-64 flex items-center justify-center text-gray-400 border-2 border-dashed rounded-lg">
                                    📊 Biểu đồ sẽ được hiển thị ở đây
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="receivables">
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                <IconTrendingUp className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                Danh sách công nợ phải thu
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="payables">
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                <IconTrendingDown className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                Danh sách công nợ phải trả
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="transactions">
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                <IconCash className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                Lịch sử giao dịch
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
