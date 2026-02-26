'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
 IconTool,
 IconArrowDown,
 IconPlus,
 IconSearch,
 IconChevronLeft,
 IconChevronRight,
} from '@tabler/icons-react';
import { type EquipmentCheckout } from '@/hooks/use-inventory';

// Status badge helpers
function getStatusBadge(status: string) {
 switch (status) {
 case 'CHECKED_OUT': return { label: 'Đang mượn', color: 'bg-blue-100 text-blue-700' };
 case 'PARTIALLY_RETURNED': return { label: 'Trả một phần', color: 'bg-amber-100 text-amber-700' };
 case 'RETURNED': return { label: 'Đã trả', color: 'bg-green-100 text-green-700' };
 case 'OVERDUE': return { label: 'Quá hạn', color: 'bg-red-100 text-red-700' };
 default: return { label: status, color: 'bg-gray-100 text-gray-700' };
 }
}

function formatDate(dateStr: string | undefined | null): string {
 if (!dateStr) return '—';
 try {
 return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
 } catch { return '—'; }
}

const STATUS_FILTERS = [
 { value: '', label: 'Tất cả' },
 { value: 'CHECKED_OUT', label: 'Đang mượn' },
 { value: 'PARTIALLY_RETURNED', label: 'Trả một phần' },
 { value: 'OVERDUE', label: 'Quá hạn' },
 { value: 'RETURNED', label: 'Đã trả' },
];

const PAGE_SIZE = 20;

interface CheckoutListCardProps {
 checkoutsData: { items: EquipmentCheckout[]; total: number } | undefined;
 isLoading: boolean;
 statusFilter: string;
 searchInput: string;
 onStatusFilterChange: (value: string) => void;
 onSearchChange: (value: string) => void;
 onCheckout: () => void;
 onCheckin: (checkout: EquipmentCheckout) => void;
}

export function CheckoutListCard({
 checkoutsData,
 isLoading,
 statusFilter,
 searchInput,
 onStatusFilterChange,
 onSearchChange,
 onCheckout,
 onCheckin,
}: CheckoutListCardProps) {
 const [currentPage, setCurrentPage] = useState(0);

 // Reset page when filter/search changes
 const filteredCheckouts = useMemo(() => {
 setCurrentPage(0);
 let items = checkoutsData?.items || [];
 if (searchInput) {
 const q = searchInput.toLowerCase();
 items = items.filter(c =>
 c.item_name?.toLowerCase().includes(q) ||
 c.item_sku?.toLowerCase().includes(q)
 );
 }
 return items;
 }, [checkoutsData, searchInput]);

 // Pagination (fix UX-02)
 const totalPages = Math.ceil(filteredCheckouts.length / PAGE_SIZE);
 const paginatedCheckouts = useMemo(() =>
 filteredCheckouts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
 [filteredCheckouts, currentPage]
 );
 const showPagination = filteredCheckouts.length > PAGE_SIZE;

 return (
 <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
 {/* Toolbar */}
 <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 border-b bg-gray-50/80">
 <Button
 className="bg-accent-gradient shadow-sm hover:shadow-md transition-shadow"
 size="sm"
 onClick={onCheckout}
 >
 <IconPlus className="mr-1.5 h-4 w-4" />
 Xuất dụng cụ
 </Button>

 {/* Desktop status filter */}
 <div className="hidden md:flex items-center gap-1">
 {STATUS_FILTERS.map(f => (
 <Badge
 key={f.value}
 variant={statusFilter === f.value ? 'default' : 'outline'}
 className="cursor-pointer text-xs hover:shadow-sm transition-shadow"
 onClick={() => onStatusFilterChange(f.value)}
 >
 {f.label}
 </Badge>
 ))}
 </div>

 {/* Mobile status filter (fix UX-05) */}
 <select
 className="md:hidden h-8 text-xs border rounded-md px-2 bg-white"
 value={statusFilter}
 onChange={(e) => onStatusFilterChange(e.target.value)}
 >
 {STATUS_FILTERS.map(f => (
 <option key={f.value} value={f.value}>{f.label}</option>
 ))}
 </select>

 <div className="flex-1" />

 <div className="relative w-full max-w-xs">
 <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
 <Input
 placeholder="Tìm dụng cụ..."
 value={searchInput}
 onChange={(e) => onSearchChange(e.target.value)}
 className="pl-9 h-8 text-sm"
 />
 </div>
 </div>

 {/* Checkout List */}
 <div className="divide-y">
 {isLoading ? (
 <div className="p-4 space-y-2">
 {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
 </div>
 ) : paginatedCheckouts.length === 0 ? (
 <div className="text-center py-16">
 <IconTool className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-4 text-gray-500">Chưa có phiếu mượn dụng cụ</p>
 <Button className="mt-4" variant="outline" size="sm" onClick={onCheckout}>
 <IconPlus className="mr-2 h-4 w-4" />
 Xuất dụng cụ
 </Button>
 </div>
 ) : (
 paginatedCheckouts.map((co) => {
 const statusBadge = getStatusBadge(co.status);
 const remaining = co.checkout_qty - co.checkin_qty - co.damaged_qty;
 const canCheckin = co.status !== 'RETURNED';

 return (
 <div
 key={co.id}
 className="flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 hover:bg-gray-50 transition-colors group"
 >
 {/* Item info */}
 <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-4">
 <div className="w-32 md:w-48 truncate">
 <span className="font-medium text-sm text-gray-900">{co.item_name || 'N/A'}</span>
 <p className="text-xs text-gray-400">{co.item_sku}</p>
 </div>

 <Badge className={`${statusBadge.color} text-xs px-1.5 py-0.5 shrink-0`}>
 {statusBadge.label}
 </Badge>

 {/* Quantities */}
 <div className="flex items-center gap-3 text-xs text-gray-500 hidden sm:flex">
 <span className="tabular-nums">Mượn: <strong className="text-gray-900">{co.checkout_qty}</strong></span>
 <span className="tabular-nums">Trả: <strong className="text-green-600">{co.checkin_qty}</strong></span>
 {co.damaged_qty > 0 && (
 <span className="tabular-nums text-red-500">Hư: <strong>{co.damaged_qty}</strong></span>
 )}
 {remaining > 0 && co.status !== 'RETURNED' && (
 <span className="tabular-nums text-amber-600">Còn: <strong>{remaining}</strong></span>
 )}
 </div>

 {/* Dates */}
 <span className="text-xs text-gray-400 hidden lg:inline tabular-nums">
 {formatDate(co.checkout_date)}
 {co.expected_return_date && ` →${formatDate(co.expected_return_date)}`}
 </span>
 </div>

 {/* Actions */}
 <div className={cn(
 'flex items-center gap-1 shrink-0',
 'opacity-0 group-hover:opacity-100 transition-opacity'
 )}>
 {canCheckin && (
 <Button
 variant="outline"
 size="sm"
 className="h-7 text-xs gap-1 border-green-300 text-green-600 hover:bg-green-50"
 onClick={() => onCheckin(co)}
 >
 <IconArrowDown className="h-3.5 w-3.5" />
 Nhận trả
 </Button>
 )}
 </div>
 </div>
 );
 })
 )}
 </div>

 {/* Pagination footer (fix UX-02) */}
 {showPagination && (
 <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50/80 text-xs text-gray-500">
 <span className="tabular-nums">
 {filteredCheckouts.length} phiếu • Trang {currentPage + 1}/{totalPages}
 </span>
 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7"
 disabled={currentPage === 0}
 onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
 >
 <IconChevronLeft className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7"
 disabled={currentPage >= totalPages - 1}
 onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
 >
 <IconChevronRight className="h-4 w-4" />
 </Button>
 </div>
 </div>
 )}
 </Card>
 );
}
