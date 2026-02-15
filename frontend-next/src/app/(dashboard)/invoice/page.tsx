'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    IconReceipt,
    IconSearch,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconEye,
    IconPrinter,
    IconCheck,
    IconClock,
} from '@tabler/icons-react';

export default function InvoicePage() {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['invoices', search],
        queryFn: () => api.get<{ items: any[]; total: number }>('/invoices'),
    });

    const invoices = data?.items || [];
    const stats = {
        total: data?.total || 0,
        paid: invoices.filter((i: any) => i.status === 'paid').length,
        pending: invoices.filter((i: any) => i.status !== 'paid').length,
    };

    const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === invoices.length ? [] : invoices.map((i: any) => i.id));
    const toggleStar = (id: number, e: React.MouseEvent) => { e.stopPropagation(); setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

    return (
        <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Hóa đơn</h1>
                <p className="text-sm text-gray-500">Quản lý hóa đơn</p>
            </motion.div>

            <motion.div className="grid grid-cols-3 gap-2 md:gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {[
                    { label: 'Tổng HĐ', value: stats.total, icon: IconReceipt, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Đã TT', value: stats.paid, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Chờ TT', value: stats.pending, icon: IconClock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
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

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="overflow-hidden">
                    <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                        <Checkbox checked={invoices.length > 0 && selectedIds.length === invoices.length} onCheckedChange={toggleSelectAll} className="ml-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}><IconRefresh className="h-4 w-4" /></Button>
                        <div className="flex-1" />
                        <div className="relative w-full max-w-xs">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                        </div>
                    </div>

                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                        ) : invoices.length === 0 ? (
                            <div className="text-center py-16">
                                <IconReceipt className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có hóa đơn</p>
                            </div>
                        ) : (
                            invoices.map((inv: any) => (
                                <div
                                    key={inv.id}
                                    className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(inv.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onMouseEnter={() => setHoveredId(inv.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => toggleSelect(inv.id)}
                                >
                                    <Checkbox checked={selectedIds.includes(inv.id)} onCheckedChange={() => toggleSelect(inv.id)} onClick={(e) => e.stopPropagation()} />
                                    <button onClick={(e) => toggleStar(inv.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                        {starredIds.includes(inv.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400" />}
                                    </button>

                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                        <div className="w-24 md:w-32 truncate">
                                            <span className="font-medium text-sm text-gray-900">{inv.customer_name}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <Badge className={`${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} text-xs px-1.5 py-0.5 shrink-0`}>
                                                {inv.status === 'paid' ? 'TT' : 'Chờ'}
                                            </Badge>
                                            <span className="text-sm text-gray-500 truncate hidden sm:inline">{inv.invoice_number}</span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-medium text-gray-900">{formatCurrency(inv.total_amount)}</span>
                                        </div>
                                        <div className="w-20 text-right shrink-0 hidden lg:block">
                                            <span className="text-xs text-gray-500">{formatDate(inv.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-0.5 shrink-0 ${hoveredId === inv.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconEye className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconPrinter className="h-4 w-4" /></Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}><IconDotsVertical className="h-4 w-4" /></Button>
                                </div>
                            ))
                        )}
                    </div>

                    {invoices.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${invoices.length} HĐ`}</span>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
