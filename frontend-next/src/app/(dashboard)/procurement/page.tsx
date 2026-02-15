'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PurchaseOrder } from '@/types';
import {
    IconSearch,
    IconPlus,
    IconEye,
    IconShoppingBag,
    IconClock,
    IconCheck,
    IconX,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconEdit,
} from '@tabler/icons-react';

const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
    draft: 'Nháp',
    pending: 'Chờ',
    approved: 'Duyệt',
    received: 'Nhận',
    cancelled: 'Hủy',
};

export default function ProcurementPage() {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['procurement', search],
        queryFn: () => api.get<{ items: PurchaseOrder[]; total: number }>(`/procurement?search=${search}`),
    });

    const orders = data?.items || [];

    const stats = {
        total: data?.total || 0,
        pending: orders.filter((o: PurchaseOrder) => o.status === 'pending').length,
        approved: orders.filter((o: PurchaseOrder) => o.status === 'approved').length,
        received: orders.filter((o: PurchaseOrder) => o.status === 'received').length,
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === orders.length ? [] : orders.map((o: PurchaseOrder) => o.id));
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
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mua hàng</h1>
                    <p className="text-sm text-gray-500">Quản lý đơn mua hàng</p>
                </div>
                <Link href="/procurement/create">
                    <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                        <IconPlus className="mr-2 h-4 w-4" />Tạo đơn mua
                    </Button>
                </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {[
                    { label: 'Tổng đơn', value: stats.total, icon: IconShoppingBag, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Chờ duyệt', value: stats.pending, icon: IconClock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { label: 'Đã duyệt', value: stats.approved, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Đã nhận', value: stats.received, icon: IconCheck, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
                ].map((stat, i) => (
                    <Card key={i} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3 md:p-4">
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                    <p className="text-base md:text-lg font-bold">{stat.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </motion.div>

            {/* Gmail-style List */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                        <Checkbox checked={orders.length > 0 && selectedIds.length === orders.length} onCheckedChange={toggleSelectAll} className="ml-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}><IconRefresh className="h-4 w-4" /></Button>
                        <div className="flex-1" />
                        <div className="relative w-full max-w-xs">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                        </div>
                    </div>

                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                        ) : orders.length === 0 ? (
                            <div className="text-center py-16">
                                <IconShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có đơn mua hàng</p>
                            </div>
                        ) : (
                            orders.map((order: PurchaseOrder) => (
                                <div
                                    key={order.id}
                                    className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onMouseEnter={() => setHoveredId(order.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => toggleSelect(order.id)}
                                >
                                    <Checkbox checked={selectedIds.includes(order.id)} onCheckedChange={() => toggleSelect(order.id)} onClick={(e) => e.stopPropagation()} />
                                    <button onClick={(e) => toggleStar(order.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                        {starredIds.includes(order.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400" />}
                                    </button>

                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                        <div className="w-24 md:w-32 truncate">
                                            <span className="font-medium text-sm text-gray-900">{order.supplier_name}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <Badge className={`${statusColors[order.status]} text-xs px-1.5 py-0.5 shrink-0`}>{statusLabels[order.status]}</Badge>
                                            <span className="text-sm text-gray-500 truncate hidden sm:inline">{order.po_number}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</span>
                                        </div>
                                        <div className="w-20 text-right shrink-0 hidden lg:block">
                                            <span className="text-xs text-gray-500">{formatDate(order.order_date)}</span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-0.5 shrink-0 ${hoveredId === order.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                                        <Link href={`/procurement/${order.id}`} onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"><IconEye className="h-4 w-4" /></Button>
                                        </Link>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconEdit className="h-4 w-4" /></Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}><IconDotsVertical className="h-4 w-4" /></Button>
                                </div>
                            ))
                        )}
                    </div>

                    {orders.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${orders.length} đơn`}</span>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
