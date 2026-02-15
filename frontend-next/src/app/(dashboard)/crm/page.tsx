'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Customer } from '@/types';
import {
    IconSearch,
    IconUsers,
    IconTrendingUp,
    IconHeart,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconPhone,
    IconMail,
    IconEdit,
    IconPlus,
} from '@tabler/icons-react';

const loyaltyColors: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-700',
    silver: 'bg-gray-200 text-gray-700',
    gold: 'bg-yellow-100 text-yellow-700',
    platinum: 'bg-purple-100 text-purple-700',
};

export default function CrmPage() {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('all');

    const { data: customers, isLoading, refetch } = useQuery({
        queryKey: ['customers', search],
        queryFn: () => api.get<{ items: Customer[]; total: number }>(`/crm/customers?search=${search}`),
    });

    const { data: stats } = useQuery({
        queryKey: ['crm-stats'],
        queryFn: () => api.get<{ total: number; active: number; new_this_month: number }>('/crm/stats'),
    });

    const customerList = customers?.items || [];

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === customerList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(customerList.map((c: Customer) => c.id));
        }
    };

    const toggleStar = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">CRM - Quản lý khách hàng</h1>
                    <p className="text-sm text-gray-500">Quản lý quan hệ khách hàng</p>
                </div>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <IconPlus className="mr-2 h-4 w-4" />
                    Thêm khách hàng
                </Button>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {[
                    { label: 'Tổng KH', value: stats?.total || 0, icon: IconUsers, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Hoạt động', value: stats?.active || 0, icon: IconTrendingUp, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Thân thiết', value: stats?.new_this_month || 0, icon: IconHeart, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                    { label: 'Mới tháng', value: stats?.new_this_month || 0, icon: IconStar, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{formatNumber(stat.value)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Gmail-style List */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="overflow-hidden">
                    {/* Toolbar with Tabs */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={customerList.length > 0 && selectedIds.length === customerList.length}
                                onCheckedChange={toggleSelectAll}
                                className="ml-1"
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                                <IconRefresh className="h-4 w-4" />
                            </Button>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                            <TabsList className="h-8">
                                <TabsTrigger value="all" className="text-xs px-2 py-1">Tất cả</TabsTrigger>
                                <TabsTrigger value="platinum" className="text-xs px-2 py-1">Platinum</TabsTrigger>
                                <TabsTrigger value="gold" className="text-xs px-2 py-1">Gold</TabsTrigger>
                                <TabsTrigger value="silver" className="text-xs px-2 py-1">Silver</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full md:w-64">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                ))}
                            </div>
                        ) : customerList.length === 0 ? (
                            <div className="text-center py-16">
                                <IconUsers className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có khách hàng nào</p>
                                <Button className="mt-4" variant="outline" size="sm">
                                    <IconPlus className="mr-2 h-4 w-4" />
                                    Thêm khách hàng
                                </Button>
                            </div>
                        ) : (
                            customerList.map((customer: Customer) => (
                                <div
                                    key={customer.id}
                                    className={`
                                        flex items-center gap-2 md:gap-4 px-2 md:px-4 py-3 
                                        cursor-pointer transition-colors
                                        ${selectedIds.includes(customer.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                    `}
                                    onMouseEnter={() => setHoveredId(customer.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => toggleSelect(customer.id)}
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(customer.id)}
                                        onCheckedChange={() => toggleSelect(customer.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    <button onClick={(e) => toggleStar(customer.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                        {starredIds.includes(customer.id) ? (
                                            <IconStarFilled className="h-4 w-4 text-amber-400" />
                                        ) : (
                                            <IconStar className="h-4 w-4 text-gray-400 hover:text-amber-400" />
                                        )}
                                    </button>

                                    {/* Avatar */}
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
                                        {customer.name?.charAt(0) || 'K'}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                        <div className="w-28 md:w-40 truncate">
                                            <span className="font-medium text-sm text-gray-900">{customer.name}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            {customer.loyalty_tier && (
                                                <Badge className={`${loyaltyColors[customer.loyalty_tier.toLowerCase()]} text-xs px-1.5 py-0.5 shrink-0`}>
                                                    {customer.loyalty_tier}
                                                </Badge>
                                            )}
                                            <span className="text-sm text-gray-500 truncate hidden sm:inline">
                                                {customer.phone}
                                            </span>
                                        </div>

                                        {/* Orders & Spent */}
                                        <div className="text-right shrink-0 hidden md:block">
                                            <span className="text-xs text-gray-500">{customer.total_orders} đơn</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-medium text-gray-900">
                                                {formatCurrency(customer.total_spent)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className={`
                                        flex items-center gap-0.5 shrink-0
                                        ${hoveredId === customer.id ? 'opacity-100' : 'opacity-0'}
                                        transition-opacity
                                    `}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                            <IconPhone className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                            <IconMail className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}>
                                        <IconDotsVertical className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {customerList.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${customerList.length} khách hàng`}</span>
                            <span>Trang 1 / 1</span>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
