'use client';

import { PermissionGate } from '@/components/shared/PermissionGate';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { IconPlus, IconTrash, IconReceipt, IconPackage, IconSearch, IconEdit } from '@tabler/icons-react';
import type { SetMenu } from '@/hooks/use-menu';

interface SetMenusListProps {
    setMenus: SetMenu[];
    isLoading: boolean;
    onEdit: (sm: SetMenu) => void;
    onDelete: (id: string) => void;
    onAdd: () => void;
}

export function SetMenusList({ setMenus, isLoading, onEdit, onDelete, onAdd }: SetMenusListProps) {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return setMenus;
        const q = search.toLowerCase();
        return setMenus.filter(sm =>
            sm.name.toLowerCase().includes(q) ||
            (sm.description || '').toLowerCase().includes(q)
        );
    }, [setMenus, search]);

    return (
        <Card className="overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b bg-gray-50/80">
                <IconPackage className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Thực đơn combo</span>
                <div className="flex-1" />
                <div className="relative w-full max-w-xs">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Tìm combo…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                </div>
                <Badge variant="secondary">{filtered.length}/{setMenus.length} combo</Badge>
            </div>
            <div className="divide-y">
                {isLoading ? (
                    <div className="p-4 space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <IconReceipt className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-4 text-gray-500">{search ? `Không tìm thấy combo "${search}"` : 'Chưa có combo'}</p>
                        {!search && (
                            <PermissionGate module="menu" action="create">
                                <Button className="mt-4" variant="outline" size="sm" onClick={onAdd}><IconPlus className="mr-2 h-4 w-4" />Tạo combo</Button>
                            </PermissionGate>
                        )}
                    </div>
                ) : filtered.map((sm: SetMenu) => (
                    <div key={sm.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => onEdit(sm)}>
                        <div className="p-2 rounded-lg bg-purple-100">
                            <IconReceipt className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{sm.name}</p>
                            <p className="text-xs text-gray-500">{sm.items.length} món • {sm.description || 'Không có mô tả'}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-medium text-sm text-gray-900 tabular-nums">{formatCurrency(sm.selling_price)}</p>
                            <Badge className={cn('text-xs', sm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{sm.is_active ? 'Bán' : 'Ngừng'}</Badge>
                        </div>
                        {/* Hover actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <PermissionGate module="menu" action="edit">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(sm); }}>
                                    <IconEdit className="h-4 w-4 text-gray-500" />
                                </Button>
                            </PermissionGate>
                            <PermissionGate module="menu" action="delete">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onDelete(sm.id); }}>
                                    <IconTrash className="h-4 w-4 text-red-500" />
                                </Button>
                            </PermissionGate>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length > 0 && (
                <div className="flex items-center justify-between p-3 border-t bg-gray-50/80 text-sm text-gray-500">
                    <span>{filtered.length} combo</span>
                </div>
            )}
        </Card>
    );
}
