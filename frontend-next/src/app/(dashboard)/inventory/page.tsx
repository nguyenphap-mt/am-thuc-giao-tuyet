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
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { InventoryItem } from '@/types';
import {
    IconSearch,
    IconPlus,
    IconEdit,
    IconTrash,
    IconPackage,
    IconAlertTriangle,
    IconCheck,
    IconX,
    IconStar,
    IconStarFilled,
    IconRefresh,
    IconDotsVertical,
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function InventoryPage() {
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [starredIds, setStarredIds] = useState<number[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['inventory', search],
        queryFn: () => api.get<{ items: InventoryItem[]; total: number }>(`/inventory?search=${search}`),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/inventory/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success('Xóa thành công');
            setDeleteId(null);
        },
        onError: () => toast.error('Không thể xóa'),
    });

    const items = data?.items || [];

    // Stats
    const stats = {
        total: data?.total || 0,
        inStock: items.filter((i: InventoryItem) => i.quantity > i.min_quantity).length,
        lowStock: items.filter((i: InventoryItem) => i.quantity > 0 && i.quantity <= i.min_quantity).length,
        outOfStock: items.filter((i: InventoryItem) => i.quantity <= 0).length,
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map((i: InventoryItem) => i.id));
        }
    };

    const toggleStar = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setStarredIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const getStockStatus = (qty: number, min: number) => {
        if (qty <= 0) return { label: 'Hết', color: 'bg-red-100 text-red-700' };
        if (qty <= min) return { label: 'Thấp', color: 'bg-yellow-100 text-yellow-700' };
        return { label: 'OK', color: 'bg-green-100 text-green-700' };
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
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Kho hàng</h1>
                    <p className="text-sm text-gray-500">Quản lý nguyên vật liệu</p>
                </div>
                <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                    <IconPlus className="mr-2 h-4 w-4" />
                    Thêm mới
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
                    { label: 'Tổng SP', value: stats.total, icon: IconPackage, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
                    { label: 'Còn hàng', value: stats.inStock, icon: IconCheck, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
                    { label: 'Sắp hết', value: stats.lowStock, icon: IconAlertTriangle, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
                    { label: 'Hết hàng', value: stats.outOfStock, icon: IconX, bgColor: 'bg-red-50', iconColor: 'text-red-600' },
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
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/50">
                        <Checkbox
                            checked={items.length > 0 && selectedIds.length === items.length}
                            onCheckedChange={toggleSelectAll}
                            className="ml-1"
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                            <IconRefresh className="h-4 w-4" />
                        </Button>
                        <div className="flex-1" />
                        <div className="relative w-full max-w-xs">
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
                                    <Skeleton key={i} className="h-14 w-full" />
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-16">
                                <IconPackage className="mx-auto h-12 w-12 text-gray-300" />
                                <p className="mt-4 text-gray-500">Chưa có dữ liệu</p>
                                <Button className="mt-4" variant="outline" size="sm">
                                    <IconPlus className="mr-2 h-4 w-4" />
                                    Thêm sản phẩm
                                </Button>
                            </div>
                        ) : (
                            items.map((item: InventoryItem) => {
                                const stockStatus = getStockStatus(item.quantity, item.min_quantity);
                                return (
                                    <div
                                        key={item.id}
                                        className={`
                                            flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 
                                            cursor-pointer transition-colors
                                            ${selectedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                        `}
                                        onMouseEnter={() => setHoveredId(item.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        onClick={() => toggleSelect(item.id)}
                                    >
                                        <Checkbox
                                            checked={selectedIds.includes(item.id)}
                                            onCheckedChange={() => toggleSelect(item.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />

                                        <button onClick={(e) => toggleStar(item.id, e)} className="p-1 hover:bg-gray-100 rounded">
                                            {starredIds.includes(item.id) ? (
                                                <IconStarFilled className="h-4 w-4 text-amber-400" />
                                            ) : (
                                                <IconStar className="h-4 w-4 text-gray-400 hover:text-amber-400" />
                                            )}
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
                                            <div className="w-32 md:w-48 truncate">
                                                <span className="font-medium text-sm text-gray-900">{item.name}</span>
                                            </div>

                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <Badge className={`${stockStatus.color} text-xs px-1.5 py-0.5 shrink-0`}>
                                                    {stockStatus.label}
                                                </Badge>
                                                <span className="text-sm text-gray-500 truncate hidden sm:inline">
                                                    {item.category} • {item.unit}
                                                </span>
                                            </div>

                                            {/* Quantity */}
                                            <div className="text-right shrink-0">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatNumber(item.quantity)} {item.unit}
                                                </span>
                                            </div>

                                            {/* Price - Desktop only */}
                                            <div className="w-24 text-right shrink-0 hidden lg:block">
                                                <span className="text-sm text-gray-500">
                                                    {formatCurrency(item.latest_purchase_price)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className={`
                                            flex items-center gap-0.5 shrink-0
                                            ${hoveredId === item.id ? 'opacity-100' : 'opacity-0'}
                                            transition-opacity
                                        `}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                                <IconEdit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(item.id);
                                                }}
                                            >
                                                <IconTrash className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>

                                        <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden" onClick={(e) => e.stopPropagation()}>
                                            <IconDotsVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                        <div className="flex items-center justify-between p-3 border-t bg-gray-50/50 text-sm text-gray-500">
                            <span>{selectedIds.length > 0 ? `${selectedIds.length} đã chọn` : `${items.length} sản phẩm`}</span>
                            <span>Trang 1 / 1</span>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>Bạn có chắc chắn muốn xóa?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Hủy</Button>
                        <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Xóa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
