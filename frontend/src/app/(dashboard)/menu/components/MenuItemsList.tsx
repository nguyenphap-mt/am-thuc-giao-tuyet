'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import {
    IconSearch, IconPlus, IconEdit, IconTrash, IconToolsKitchen,
    IconRefresh, IconDotsVertical, IconChefHat,
} from '@tabler/icons-react';
import type { MenuItem, Category } from '@/hooks/use-menu';

// === Helpers ===
const getFoodCostColor = (cost: number, sell: number) => {
    if (sell <= 0) return 'text-gray-400';
    const pct = (cost / sell) * 100;
    if (pct <= 30) return 'text-green-600 bg-green-50';
    if (pct <= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
};

interface MenuItemsListProps {
    items: MenuItem[];
    categories: Category[];
    isLoading: boolean;
    filterCategoryId: string | null;
    setFilterCategoryId: (id: string | null) => void;
    search: string;
    setSearch: (s: string) => void;
    onRefresh: () => void;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onToggleActive: (id: string, e: React.MouseEvent) => void;
    onOpenRecipe: (id: string) => void;
    onAdd: () => void;
}

export function MenuItemsList({
    items, categories, isLoading, filterCategoryId, setFilterCategoryId,
    search, setSearch,
    onRefresh, onEdit, onDelete, onToggleActive, onOpenRecipe, onAdd,
}: MenuItemsListProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const categoryMap = new Map<string, string>();
    categories.forEach(c => categoryMap.set(c.id, c.name));

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/80">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}><IconRefresh className="h-4 w-4" /></Button>

                {/* Category chips */}
                <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setFilterCategoryId(null)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer', !filterCategoryId ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>Tất cả</button>
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)} className={cn('px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer', filterCategoryId === cat.id ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>{cat.name}</button>
                    ))}
                </div>

                <div className="relative w-full max-w-xs shrink-0">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Tìm kiếm…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_80px_120px_100px_72px_100px_100px_140px] gap-2 px-4 py-2.5 border-b bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500 select-none">
                <span>Tên món</span>
                <span className="text-center">Trạng thái</span>
                <span>Danh mục</span>
                <span className="text-right">Giá gốc</span>
                <span className="text-center">FC %</span>
                <span className="text-right">Giá bán</span>
                <span className="text-right">Lợi nhuận</span>
                <span></span>
            </div>

            {/* Items list */}
            <div className="divide-y">
                {isLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-16">
                        <IconToolsKitchen className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-4 text-gray-500">{search ? `Không tìm thấy "${search}"` : 'Chưa có món ăn nào'}</p>
                        {!search && (
                            <PermissionGate module="menu" action="create">
                                <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}><IconPlus className="mr-2 h-4 w-4" />Thêm món</Button>
                            </PermissionGate>
                        )}
                    </div>
                ) : items.map(item => {
                    const costPct = item.selling_price > 0 ? Math.round((item.cost_price / item.selling_price) * 100) : 0;
                    return (
                        <div
                            key={item.id}
                            className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_80px_120px_100px_72px_100px_100px_140px] gap-2 items-center px-2 md:px-4 py-2.5 md:py-3 cursor-pointer transition-colors hover:bg-gray-50/80"
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => onEdit(item)}
                        >
                            {/* Tên món */}
                            <div className="min-w-0 truncate">
                                <span className={cn('font-medium text-sm', item.is_active ? 'text-gray-900' : 'text-gray-400 line-through')}>{item.name}</span>
                                {/* Mobile-only: show category + price inline */}
                                <div className="flex items-center gap-2 mt-0.5 md:hidden">
                                    <Badge className={cn('text-[10px] px-1 py-0 shrink-0', item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{item.is_active ? 'Bán' : 'Ngừng'}</Badge>
                                    <span className="text-xs text-gray-400 truncate">{item.category_name || categoryMap.get(item.category_id || '') || ''}</span>
                                    <span className="text-xs font-medium text-gray-900 tabular-nums ml-auto">{formatCurrency(item.selling_price)}</span>
                                </div>
                            </div>

                            {/* Mobile: dots menu */}
                            <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden shrink-0" onClick={e => { e.stopPropagation(); onEdit(item); }}><IconDotsVertical className="h-4 w-4" /></Button>

                            {/* Trạng thái — desktop */}
                            <div className="hidden md:flex justify-center">
                                <Badge className={cn('text-xs px-1.5 py-0.5', item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{item.is_active ? 'Bán' : 'Ngừng'}</Badge>
                            </div>

                            {/* Danh mục — desktop */}
                            <div className="hidden md:block min-w-0 truncate">
                                <span className="text-sm text-gray-500">{item.category_name || categoryMap.get(item.category_id || '') || '—'}</span>
                            </div>

                            {/* Giá gốc — desktop */}
                            <div className="hidden md:block text-right">
                                <span className="text-sm text-gray-500 tabular-nums">{item.cost_price > 0 ? formatCurrency(item.cost_price) : '—'}</span>
                            </div>

                            {/* Food Cost % — desktop */}
                            <div className="hidden md:flex justify-center">
                                {costPct > 0 ? <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded tabular-nums', getFoodCostColor(item.cost_price, item.selling_price))}>{costPct}%</span> : <span className="text-xs text-gray-300">—</span>}
                            </div>

                            {/* Giá bán — desktop */}
                            <div className="hidden md:block text-right">
                                <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(item.selling_price)}</span>
                            </div>

                            {/* Lợi nhuận — desktop */}
                            <div className="hidden md:block text-right">
                                {item.selling_price > 0 ? (
                                    <span className={cn('text-sm font-medium tabular-nums', (item.selling_price - item.cost_price) >= 0 ? 'text-green-600' : 'text-red-600')}>
                                        {formatCurrency(item.selling_price - item.cost_price)}
                                    </span>
                                ) : <span className="text-sm text-gray-300">—</span>}
                            </div>

                            {/* Hover actions — desktop */}
                            <div className={cn('hidden md:flex items-center gap-0.5 justify-end shrink-0 transition-opacity duration-150', hoveredId === item.id ? 'opacity-100' : 'opacity-0')}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onOpenRecipe(item.id); }}><IconChefHat className="h-4 w-4 text-purple-500" /></Button>
                                <PermissionGate module="menu" action="edit">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(item); }}><IconEdit className="h-4 w-4" /></Button>
                                </PermissionGate>
                                <div className="flex items-center" onClick={e => e.stopPropagation()}>
                                    <Switch checked={item.is_active} onCheckedChange={() => onToggleActive(item.id, { stopPropagation: () => { } } as React.MouseEvent)} className="scale-75" />
                                </div>
                                <PermissionGate module="menu" action="delete">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(item.id); }}><IconTrash className="h-4 w-4 text-red-500" /></Button>
                                </PermissionGate>
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 0 && <div className="flex items-center justify-between p-3 border-t bg-gray-50/80 text-sm text-gray-500"><span>{items.length} món</span></div>}
        </Card>
    );
}
