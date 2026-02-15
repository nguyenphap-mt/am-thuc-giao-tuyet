'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Supplier } from '@/types';
import {
    IconSearch,
    IconPlus,
    IconEdit,
    IconTrash,
    IconBuildingStore,
    IconCheck,
    IconX,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
    IconPhone,
    IconMail,
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function SupplierPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['suppliers', search],
        queryFn: () => api.get<{ items: Supplier[]; total: number }>(`/procurement/suppliers?search=${search}`),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/procurement/suppliers/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['suppliers'] }); toast.success('Xóa thành công'); setDeleteId(null); },
        onError: () => toast.error('Không thể xóa'),
    });

    const suppliers = data?.items || [];

    const stats = {
        total: data?.total || 0,
        active: suppliers.filter((s: Supplier) => s.is_active).length,
        inactive: suppliers.filter((s: Supplier) => !s.is_active).length,
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        setSelectedIds(selectedIds.length === suppliers.length ? [] : suppliers.map((s: Supplier) => s.id));
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
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Nhà cung cấp</h1>
                    <p className="text-sm text-gray-500">Quản lý nhà cung cấp</p>
                </div>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <IconPlus className="mr-2 h-4 w-4" />Thêm NCC
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
                className="grid grid-cols-3 gap-2 md:gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                {[
                    { label: 'Tổng NCC', value: stats.total, icon: IconBuildingStore, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Hoạt động', value: stats.active, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Ngừng', value: stats.inactive, icon: IconX, bgColor: 'bg-gray-100', iconColor: 'text-gray-600' },
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
                        <Checkbox checked={suppliers.length > 0 && selectedIds.length === suppliers.length} onCheckedChange={toggleSelectAll} className="ml-1" />
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
                        ) : suppliers.length === 0 ? (
                            <div className="text-center py-16">
                                <IconBuildingStore className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có nhà cung cấp</p>
                            </div>
                        ) : (
                            suppliers.map((s: Supplier) => (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 cursor-pointer transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                    onMouseEnter={() => setHoveredId(s.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    onClick={() => toggleSelect(s.id)}
                                >
                                    <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} onClick={(e) => e.stopPropagation()} />
                                    <button onClick={(e) => toggleStar(s.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                        {starredIds.includes(s.id) ? <IconStarFilled className="h-4 w-4 text-amber-400" /> : <IconStar className="h-4 w-4 text-gray-400" />}
                                    </button>

                                    <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                        <div className="w-32 md:w-48 truncate">
                                            <span className="font-medium text-sm text-gray-900">{s.name}</span>
                                        </div>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <Badge className={`${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} text-xs px-1.5 py-0.5 shrink-0`}>
                                                {s.is_active ? 'HĐ' : 'Ngừng'}
                                            </Badge>
                                            <span className="text-sm text-gray-500 truncate hidden sm:inline">{s.contact_person}</span>
                                        </div>
                                        <div className="text-right shrink-0 hidden md:block">
                                            <span className="text-sm text-gray-500">{s.phone}</span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-0.5 shrink-0 ${hoveredId === s.id ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconPhone className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconMail className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}><IconEdit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}><IconTrash className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}><IconDotsVertical className="h-4 w-4" /></Button>
                                </div>
                            ))
                        )}
                    </div>

                    {suppliers.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${suppliers.length} NCC`}</span>
                        </div>
                    )}
                </Card>
            </motion.div>

            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle><DialogDescription>Bạn có chắc chắn?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
                        <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Xóa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
