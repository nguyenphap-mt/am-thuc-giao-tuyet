'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IconEdit, IconTrash, IconCategory, IconSearch, IconPlus } from '@tabler/icons-react';
import type { Category, MenuItem } from '@/hooks/use-menu';

interface CategoriesListProps {
    categories: Category[];
    items: MenuItem[];
    onEdit: (cat: Category) => void;
    onDelete: (id: string) => void;
    onAdd?: () => void;
}

export function CategoriesList({ categories, items, onEdit, onDelete, onAdd }: CategoriesListProps) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return categories;
        const q = search.toLowerCase();
        return categories.filter(cat =>
            cat.name.toLowerCase().includes(q) ||
            (cat.code || '').toLowerCase().includes(q) ||
            (cat.description || '').toLowerCase().includes(q)
        );
    }, [categories, search]);

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b bg-gray-50/80">
                <IconCategory className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Danh mục món ăn</span>
                <div className="flex-1" />
                <div className="relative w-full max-w-xs">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Tìm danh mục…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>
                <Badge variant="secondary">{filtered.length}/{categories.length} danh mục</Badge>
            </div>
            <div className="divide-y">
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <IconCategory className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-4 text-gray-500">{search ? `Không tìm thấy "${search}"` : 'Chưa có danh mục'}</p>
                        {!search && onAdd && (
                            <PermissionGate module="menu" action="create">
                                <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}><IconPlus className="mr-2 h-4 w-4" />Thêm danh mục</Button>
                            </PermissionGate>
                        )}
                    </div>
                ) : filtered.map(cat => {
                    const itemCount = items.filter(i => i.category_id === cat.id || i.category_name === cat.name).length;
                    return (
                        <div key={cat.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onEdit(cat)}>
                            <div className="p-2 rounded-lg bg-purple-50">
                                <IconCategory className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900">{cat.name}</p>
                                <p className="text-xs text-gray-500">{cat.code ? `${cat.code} • ` : ''}{cat.description || 'Không có mô tả'}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">{itemCount} món</Badge>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <PermissionGate module="menu" action="edit">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(cat); }}>
                                        <IconEdit className="h-4 w-4" />
                                    </Button>
                                </PermissionGate>
                                <PermissionGate module="menu" action="delete">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(cat.id); }}>
                                        <IconTrash className="h-4 w-4 text-red-500" />
                                    </Button>
                                </PermissionGate>
                            </div>
                        </div>
                    );
                })}
            </div>
            {filtered.length > 0 && (
                <div className="flex items-center justify-between p-3 border-t bg-gray-50/80 text-sm text-gray-500">
                    <span>{filtered.length} danh mục</span>
                </div>
            )}
        </Card>
    );
}
