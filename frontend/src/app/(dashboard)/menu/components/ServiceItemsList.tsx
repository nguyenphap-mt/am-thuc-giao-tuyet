'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import {
    IconSearch, IconPlus, IconEdit, IconTrash, IconBuildingStore,
    IconUsers, IconRefresh,
} from '@tabler/icons-react';
import type { MenuItem, Category } from '@/hooks/use-menu';

interface ServiceItemsListProps {
    items: MenuItem[];
    categories: Category[];
    isLoading: boolean;
    search: string;
    setSearch: (s: string) => void;
    onRefresh: () => void;
    onEdit: (item: MenuItem) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

export function ServiceItemsList({
    items, categories, isLoading, search, setSearch,
    onRefresh, onEdit, onDelete, onAdd,
}: ServiceItemsListProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const categoryMap = new Map<string, string>();
    categories.forEach(c => categoryMap.set(c.id, c.name));

    // Group by category type
    const furnitureItems = items.filter(i => {
        const catName = i.category_name || categoryMap.get(i.category_id || '') || '';
        return catName.toLowerCase().includes('bàn') || catName.toLowerCase().includes('ban');
    });
    const staffItems = items.filter(i => {
        const catName = i.category_name || categoryMap.get(i.category_id || '') || '';
        return catName.toLowerCase().includes('nhân viên') || catName.toLowerCase().includes('nhan vien');
    });
    const otherItems = items.filter(i => !furnitureItems.includes(i) && !staffItems.includes(i));

    const renderGroup = (title: string, icon: React.ReactNode, groupItems: MenuItem[]) => (
        <div className="mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/80 border-b">
                {icon}
                <span className="text-sm font-medium text-gray-700">{title}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{groupItems.length}</Badge>
            </div>
            {groupItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400 italic">
                    Chưa có dịch vụ nào
                </div>
            ) : (
                <div className="divide-y">
                    {groupItems.map(item => (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => onEdit(item)}
                        >
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-sm text-gray-900">{item.name}</span>
                                {item.description && (
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                                )}
                            </div>
                            <div className="text-xs text-gray-500">{item.uom || 'ĐVT'}</div>
                            <div className="text-right shrink-0 w-28">
                                <span className="text-sm font-medium text-gray-900 tabular-nums">
                                    {formatCurrency(item.selling_price)}
                                </span>
                            </div>
                            <Badge className={cn('text-xs px-1.5 py-0.5', item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                                {item.is_active ? 'Hoạt động' : 'Ngừng'}
                            </Badge>

                            {/* Hover actions */}
                            <div className={cn('flex items-center gap-0.5 shrink-0 transition-opacity', hoveredId === item.id ? 'opacity-100' : 'opacity-0')}>
                                <PermissionGate module="menu" action="edit">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(item); }}>
                                        <IconEdit className="h-4 w-4" />
                                    </Button>
                                </PermissionGate>
                                <PermissionGate module="menu" action="delete">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(item.id); }}>
                                        <IconTrash className="h-4 w-4 text-red-500" />
                                    </Button>
                                </PermissionGate>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 p-2 md:p-3 border-b bg-gray-50/80">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
                    <IconRefresh className="h-4 w-4" />
                </Button>

                <div className="flex-1" />

                <div className="relative w-full max-w-xs shrink-0">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Tìm dịch vụ…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>

                <PermissionGate module="menu" action="create">
                    <Button size="sm" className="gap-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={onAdd}>
                        <IconPlus className="h-4 w-4" />Thêm DV
                    </Button>
                </PermissionGate>
            </div>

            {isLoading ? (
                <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : items.length === 0 ? (
                <div className="text-center py-16">
                    <IconBuildingStore className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-4 text-gray-500">{search ? `Không tìm thấy "${search}"` : 'Chưa có dịch vụ nào'}</p>
                    {!search && (
                        <PermissionGate module="menu" action="create">
                            <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}>
                                <IconPlus className="mr-2 h-4 w-4" />Thêm dịch vụ
                            </Button>
                        </PermissionGate>
                    )}
                </div>
            ) : (
                <>
                    {furnitureItems.length > 0 && renderGroup(
                        'Bàn ghế & Trang trí',
                        <IconBuildingStore className="h-4 w-4 text-purple-600" />,
                        furnitureItems
                    )}
                    {staffItems.length > 0 && renderGroup(
                        'Nhân viên phục vụ',
                        <IconUsers className="h-4 w-4 text-blue-600" />,
                        staffItems
                    )}
                    {otherItems.length > 0 && renderGroup(
                        'Dịch vụ khác',
                        <IconBuildingStore className="h-4 w-4 text-gray-600" />,
                        otherItems
                    )}
                </>
            )}

            {items.length > 0 && (
                <div className="flex items-center justify-between p-3 border-t bg-gray-50/80 text-sm text-gray-500">
                    <span>{items.length} dịch vụ</span>
                </div>
            )}
        </Card>
    );
}
