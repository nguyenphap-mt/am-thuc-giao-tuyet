'use client';

import { useState, useMemo } from 'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import {
 IconReceipt,
 IconTruck,
 IconUsers,
 IconBuildingStore,
 IconDots,
 IconArrowsSort,
 IconSortAscending,
 IconSortDescending,
} from '@tabler/icons-react';

// ============ TYPE DEFINITIONS ============

interface RevenueDetail {
 code: string;
 customer: string;
 amount: number;
 date: string | null;
 payment_method: string | null;
}

interface CogsDetail {
 code: string;
 supplier: string;
 amount: number;
 status: string;
 date: string | null;
}

interface OpexDetail {
 code: string;
 description: string;
 amount: number;
 date: string | null;
 payment_method: string | null;
}

interface OpexCategory {
 label: string;
 total: number;
 count: number;
 details: OpexDetail[];
}

export type PnLDialogType = 'revenue' | 'cogs' | 'opex' | null;

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface PnLDetailDialogProps {
 type: PnLDialogType;
 open: boolean;
 onClose: () => void;
 period: string;
 // Revenue data
 revenueData?: { total: number; count: number; details: RevenueDetail[] };
 // COGS data
 cogsData?: { total: number; count: number; details: CogsDetail[] };
 // OPEX data
 opexData?: { total: number; breakdown: { salary: OpexCategory; operating: OpexCategory; other: OpexCategory } };
}

// ============ SORT HELPERS ============

function parseDate(dateStr: string | null): number {
 if (!dateStr) return 0;
 // Format: dd/MM/yyyy
 const parts = dateStr.split('/');
 if (parts.length === 3) {
 return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
 }
 return 0;
}

function SortButton({
 field,
 currentField,
 currentDir,
 onClick,
}: {
 field: SortField;
 currentField: SortField;
 currentDir: SortDirection;
 onClick: (field: SortField) => void;
}) {
 const isActive = field === currentField;
 return (
 <button
 onClick={() => onClick(field)}
 className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
 >
 {isActive ? (
 currentDir === 'asc' ? (
 <IconSortAscending className="h-3.5 w-3.5 text-primary" />
 ) : (
 <IconSortDescending className="h-3.5 w-3.5 text-primary" />
 )
 ) : (
 <IconArrowsSort className="h-3.5 w-3.5 text-muted-foreground/50" />
 )}
 </button>
 );
}

// ============ STATUS BADGE ============

function StatusBadge({ status }: { status: string }) {
 const variants: Record<string, string> = {
 RECEIVED: 'bg-blue-100 text-blue-700',
 PAID: 'bg-green-100 text-green-700',
 DRAFT: 'bg-gray-100 text-gray-600',
 SENT: 'bg-amber-100 text-amber-700',
 };
 const labels: Record<string, string> = {
 RECEIVED: 'Đã nhận',
 PAID: 'Đã thanh toán',
 DRAFT: 'Nháp',
 SENT: 'Đã gửi',
 };
 return (
 <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', variants[status] || 'bg-gray-100 text-gray-600')}>
 {labels[status] || status}
 </span>
 );
}

// ============ PAYMENT METHOD BADGE ============

function PaymentMethodBadge({ method }: { method: string | null }) {
 if (!method) return null;
 const labels: Record<string, string> = {
 CASH: 'Tiền mặt',
 BANK_TRANSFER: 'Chuyển khoản',
 CARD: 'Thẻ',
 MOMO: 'MoMo',
 VNPAY: 'VNPay',
 OTHER: 'Khác',
 };
 return (
 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
 {labels[method] || method}
 </span>
 );
}

// ============ MAIN COMPONENT ============

export function PnLDetailDialog({ type, open, onClose, period, revenueData, cogsData, opexData }: PnLDetailDialogProps) {
 const [sortField, setSortField] = useState<SortField>('date');
 const [sortDir, setSortDir] = useState<SortDirection>('desc');

 const handleSort = (field: SortField) => {
 if (sortField === field) {
 setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
 } else {
 setSortField(field);
 setSortDir('desc');
 }
 };

 // Prepare dialog content based on type
 const dialogConfig = useMemo(() => {
 switch (type) {
 case 'revenue':
 return {
 title: `Chi tiết Doanh thu`,
 icon: IconReceipt,
 total: revenueData?.total || 0,
 count: revenueData?.count || 0,
 color: 'text-green-600',
 bgColor: 'bg-green-50',
 };
 case 'cogs':
 return {
 title: `Chi tiết Giá vốn hàng bán`,
 icon: IconTruck,
 total: cogsData?.total || 0,
 count: cogsData?.count || 0,
 color: 'text-red-600',
 bgColor: 'bg-red-50',
 };
 case 'opex':
 return {
 title: `Chi tiết Chi phí vận hành`,
 icon: IconBuildingStore,
 total: opexData?.total || 0,
 count: (opexData?.breakdown.salary.count || 0) + (opexData?.breakdown.operating.count || 0) + (opexData?.breakdown.other.count || 0),
 color: 'text-orange-600',
 bgColor: 'bg-orange-50',
 };
 default:
 return { title: '', icon: IconReceipt, total: 0, count: 0, color: '', bgColor: '' };
 }
 }, [type, revenueData, cogsData, opexData]);

 // Sort data
 const sortedRevenueDetails = useMemo(() => {
 if (!revenueData?.details) return [];
 return [...revenueData.details].sort((a, b) => {
 const mul = sortDir === 'asc' ? 1 : -1;
 if (sortField === 'amount') return (a.amount - b.amount) * mul;
 return (parseDate(a.date) - parseDate(b.date)) * mul;
 });
 }, [revenueData, sortField, sortDir]);

 const sortedCogsDetails = useMemo(() => {
 if (!cogsData?.details) return [];
 return [...cogsData.details].sort((a, b) => {
 const mul = sortDir === 'asc' ? 1 : -1;
 if (sortField === 'amount') return (a.amount - b.amount) * mul;
 return (parseDate(a.date) - parseDate(b.date)) * mul;
 });
 }, [cogsData, sortField, sortDir]);

 // Flatten OPEX details for sorting within each category
 const opexCategories = useMemo(() => {
 if (!opexData?.breakdown) return [];
 const cats: { key: string; label: string; icon: typeof IconUsers; details: OpexDetail[]; total: number }[] = [];
 const sortDetails = (details: OpexDetail[]) => {
 return [...details].sort((a, b) => {
 const mul = sortDir === 'asc' ? 1 : -1;
 if (sortField === 'amount') return (a.amount - b.amount) * mul;
 return (parseDate(a.date) - parseDate(b.date)) * mul;
 });
 };
 if (opexData.breakdown.salary.count > 0) {
 cats.push({ key: 'salary', label: opexData.breakdown.salary.label, icon: IconUsers, details: sortDetails(opexData.breakdown.salary.details), total: opexData.breakdown.salary.total });
 }
 if (opexData.breakdown.operating.count > 0) {
 cats.push({ key: 'operating', label: opexData.breakdown.operating.label, icon: IconBuildingStore, details: sortDetails(opexData.breakdown.operating.details), total: opexData.breakdown.operating.total });
 }
 if (opexData.breakdown.other.count > 0) {
 cats.push({ key: 'other', label: opexData.breakdown.other.label, icon: IconDots, details: sortDetails(opexData.breakdown.other.details), total: opexData.breakdown.other.total });
 }
 return cats;
 }, [opexData, sortField, sortDir]);

 if (!type) return null;

 const Icon = dialogConfig.icon;

 return (
 <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
 <DialogContent className="sm:max-w-[860px] max-h-[85vh] flex flex-col">
 {/* Header */}
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-base">
 <div className={cn('p-1.5 rounded-lg', dialogConfig.bgColor)}>
 <Icon className={cn('h-5 w-5', dialogConfig.color)} />
 </div>
 {dialogConfig.title}
 <span className="text-muted-foreground font-normal text-sm">— {period}</span>
 </DialogTitle>
 <DialogDescription asChild>
 <div className="flex items-center gap-3 mt-1">
 <Badge variant="secondary" className="text-xs font-medium">
 {dialogConfig.count} giao dịch
 </Badge>
 <span className={cn('text-sm font-semibold tabular-nums', dialogConfig.color)}>
 Tổng: {formatCurrency(dialogConfig.total)}
 </span>
 </div>
 </DialogDescription>
 </DialogHeader>

 {/* Scrollable Table Area */}
 <div className="flex-1 overflow-auto -mx-6 px-6 min-h-0">
 {/* ===== REVENUE TABLE ===== */}
 {type === 'revenue' && (
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-background z-10">
 <tr className="border-b text-left">
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[100px]">Mã đơn</th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground">Khách hàng</th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[90px]">
 <span className="inline-flex items-center gap-1">
 Ngày
 <SortButton field="date" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[100px]">PT thanh toán</th>
 <th className="py-2.5 text-xs font-medium text-muted-foreground text-right w-[140px]">
 <span className="inline-flex items-center gap-1 justify-end">
 Số tiền
 <SortButton field="amount" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 </tr>
 </thead>
 <tbody>
 {sortedRevenueDetails.length > 0 ? (
 sortedRevenueDetails.map((item, idx) => (
 <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
 <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.code}</td>
 <td className="py-2 pr-3 text-foreground">{item.customer}</td>
 <td className="py-2 pr-3 text-muted-foreground text-xs">{item.date || '—'}</td>
 <td className="py-2 pr-3"><PaymentMethodBadge method={item.payment_method} /></td>
 <td className="py-2 text-right tabular-nums font-medium text-green-600">
 {formatCurrency(item.amount)}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
 Không có thanh toán trong kỳ
 </td>
 </tr>
 )}
 </tbody>
 {sortedRevenueDetails.length > 0 && (
 <tfoot>
 <tr className="border-t-2 border-border font-semibold">
 <td colSpan={4} className="py-2.5 text-foreground">Tổng cộng</td>
 <td className="py-2.5 text-right tabular-nums text-green-600">
 {formatCurrency(revenueData?.total || 0)}
 </td>
 </tr>
 </tfoot>
 )}
 </table>
 )}

 {/* ===== COGS TABLE ===== */}
 {type === 'cogs' && (
 <table className="w-full text-sm">
 <thead className="sticky top-0 bg-background z-10">
 <tr className="border-b text-left">
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[100px]">Mã PO</th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground">Nhà cung cấp</th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[90px]">
 <span className="inline-flex items-center gap-1">
 Ngày
 <SortButton field="date" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 <th className="py-2.5 pr-3 text-xs font-medium text-muted-foreground w-[100px]">Trạng thái</th>
 <th className="py-2.5 text-xs font-medium text-muted-foreground text-right w-[140px]">
 <span className="inline-flex items-center gap-1 justify-end">
 Số tiền
 <SortButton field="amount" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 </tr>
 </thead>
 <tbody>
 {sortedCogsDetails.length > 0 ? (
 sortedCogsDetails.map((item, idx) => (
 <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
 <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.code}</td>
 <td className="py-2 pr-3 text-foreground">{item.supplier}</td>
 <td className="py-2 pr-3 text-muted-foreground text-xs">{item.date || '—'}</td>
 <td className="py-2 pr-3"><StatusBadge status={item.status} /></td>
 <td className="py-2 text-right tabular-nums font-medium text-red-600">
 -{formatCurrency(item.amount)}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
 Không có đơn mua hàng trong kỳ
 </td>
 </tr>
 )}
 </tbody>
 {sortedCogsDetails.length > 0 && (
 <tfoot>
 <tr className="border-t-2 border-border font-semibold">
 <td colSpan={4} className="py-2.5 text-foreground">Tổng cộng</td>
 <td className="py-2.5 text-right tabular-nums text-red-600">
 -{formatCurrency(cogsData?.total || 0)}
 </td>
 </tr>
 </tfoot>
 )}
 </table>
 )}

 {/* ===== OPEX TABLE (grouped by category) ===== */}
 {type === 'opex' && (
 <div className="space-y-4">
 {opexCategories.length > 0 ? (
 opexCategories.map((cat) => {
 const CatIcon = cat.icon;
 return (
 <div key={cat.key}>
 {/* Category header */}
 <div className="flex items-center gap-2 mb-2 px-1">
 <CatIcon className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-semibold text-foreground">{cat.label}</span>
 <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
 {cat.details.length}
 </Badge>
 <span className="ml-auto text-sm font-semibold tabular-nums text-orange-600">
 -{formatCurrency(cat.total)}
 </span>
 </div>
 {/* Category table */}
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b text-left">
 <th className="py-2 pr-3 text-xs font-medium text-muted-foreground w-[100px]">Mã</th>
 <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Mô tả</th>
 <th className="py-2 pr-3 text-xs font-medium text-muted-foreground w-[90px]">
 <span className="inline-flex items-center gap-1">
 Ngày
 <SortButton field="date" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 <th className="py-2 pr-3 text-xs font-medium text-muted-foreground w-[100px]">PT thanh toán</th>
 <th className="py-2 text-xs font-medium text-muted-foreground text-right w-[140px]">
 <span className="inline-flex items-center gap-1 justify-end">
 Số tiền
 <SortButton field="amount" currentField={sortField} currentDir={sortDir} onClick={handleSort} />
 </span>
 </th>
 </tr>
 </thead>
 <tbody>
 {cat.details.map((item, idx) => (
 <tr key={idx} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
 <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.code}</td>
 <td className="py-2 pr-3 text-foreground">{item.description}</td>
 <td className="py-2 pr-3 text-muted-foreground text-xs">{item.date || '—'}</td>
 <td className="py-2 pr-3"><PaymentMethodBadge method={item.payment_method} /></td>
 <td className="py-2 text-right tabular-nums font-medium text-red-600">
 -{formatCurrency(item.amount)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
 })
 ) : (
 <div className="py-8 text-center text-muted-foreground italic">
 Không có chi phí vận hành trong kỳ
 </div>
 )}

 {/* Grand total for OPEX */}
 {opexCategories.length > 0 && (
 <div className="border-t-2 border-border pt-2.5 flex justify-between px-1">
 <span className="font-semibold text-sm text-foreground">Tổng chi phí vận hành</span>
 <span className="font-semibold text-sm tabular-nums text-orange-600">
 -{formatCurrency(opexData?.total || 0)}
 </span>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Footer */}
 <DialogFooter className="mt-2">
 <Button variant="outline" onClick={onClose}>
 Đóng
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
