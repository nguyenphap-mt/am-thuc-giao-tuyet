'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
 IconFileInvoice,
 IconBuilding,
 IconCalendar,
 IconCreditCard,
 IconPackage,
} from '@tabler/icons-react';

interface POItem {
 id: string;
 item_name: string;
 quantity: number;
 uom: string | null;
 unit_price: number;
 total_price: number;
}

interface PODetail {
 id: string;
 code: string;
 status: string;
 total_amount: number;
 paid_amount: number;
 payment_terms: string | null;
 due_date: string | null;
 note: string | null;
 created_at: string;
 expected_delivery: string | null;
 supplier: {
 id: string;
 name: string;
 phone: string | null;
 email: string | null;
 address: string | null;
 } | null;
 items: POItem[];
}

interface PayableDetailDrawerProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 poId: string | null;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
 DRAFT: { label: 'Nháp', className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
 SENT: { label: 'Đã gửi', className: 'bg-blue-100 text-blue-700' },
 RECEIVED: { label: 'Đã nhận hàng', className: 'bg-green-100 text-green-700' },
 PAID: { label: 'Đã thanh toán', className: 'bg-accent-100 text-accent-strong' },
 CANCELLED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
};

const PAYMENT_TERMS_MAP: Record<string, string> = {
 IMMEDIATE: 'Thanh toán ngay',
 NET15: 'Net 15 ngày',
 NET30: 'Net 30 ngày',
 NET60: 'Net 60 ngày',
 NET90: 'Net 90 ngày',
};

export function PayableDetailDrawer({
 open,
 onOpenChange,
 poId,
}: PayableDetailDrawerProps) {
 const { data, isLoading, error } = useQuery({
 queryKey: ['po-detail', poId],
 queryFn: async () => {
 const response = await api.get<PODetail>(`/procurement/orders/${poId}`);
 return response;
 },
 enabled: open && !!poId,
 });

 const balance = data ? Number(data.total_amount || 0) - Number(data.paid_amount || 0) : 0;
 const paidPercent = data && Number(data.total_amount) > 0
 ? Math.min(100, (Number(data.paid_amount || 0) / Number(data.total_amount)) * 100)
 : 0;
 const statusInfo = data ? STATUS_MAP[data.status] || { label: data.status, className: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' } : null;

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
 <SheetHeader className="pb-4 border-b">
 <SheetTitle className="flex items-center gap-2">
 <IconFileInvoice className="h-5 w-5 text-accent-primary" />
 Chi tiết đơn mua hàng
 </SheetTitle>
 {data && (
 <SheetDescription className="flex items-center gap-2 pt-1">
 <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">{data.code}</span>
 {statusInfo && (
 <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
 )}
 </SheetDescription>
 )}
 </SheetHeader>

 <div className="py-4 space-y-5">
 {isLoading ? (
 <div className="space-y-3">
 <Skeleton className="h-20 w-full" />
 <Skeleton className="h-16 w-full" />
 <Skeleton className="h-32 w-full" />
 </div>
 ) : error ? (
 <div className="text-center py-8 text-gray-500 dark:text-gray-400">
 Không thể tải chi tiết đơn hàng
 </div>
 ) : data ? (
 <>
 {/* Supplier Info */}
 {data.supplier && (
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
 <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
 <IconBuilding className="h-4 w-4" />
 Nhà cung cấp
 </div>
 <p className="font-semibold text-gray-900 dark:text-gray-100">{data.supplier.name}</p>
 {data.supplier.phone && (
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📞 {data.supplier.phone}</p>
 )}
 {data.supplier.email && (
 <p className="text-sm text-gray-500 dark:text-gray-400">✉️ {data.supplier.email}</p>
 )}
 {data.supplier.address && (
 <p className="text-sm text-gray-500 dark:text-gray-400">📍 {data.supplier.address}</p>
 )}
 </div>
 )}

 {/* Dates & Terms */}
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
 <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
 <IconCalendar className="h-3.5 w-3.5" />
 Ngày tạo
 </div>
 <p className="font-medium text-sm tabular-nums">
 {format(parseISO(data.created_at), 'dd/MM/yyyy', { locale: vi })}
 </p>
 </div>
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
 <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
 <IconCreditCard className="h-3.5 w-3.5" />
 Điều khoản
 </div>
 <p className="font-medium text-sm">
 {PAYMENT_TERMS_MAP[data.payment_terms || ''] || data.payment_terms || 'N/A'}
 </p>
 </div>
 {data.due_date && (
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hạn thanh toán</div>
 <p className="font-medium text-sm tabular-nums">
 {format(parseISO(data.due_date), 'dd/MM/yyyy', { locale: vi })}
 </p>
 </div>
 )}
 {data.expected_delivery && (
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
 <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Giao hàng dự kiến</div>
 <p className="font-medium text-sm tabular-nums">
 {format(parseISO(data.expected_delivery), 'dd/MM/yyyy', { locale: vi })}
 </p>
 </div>
 )}
 </div>

 {/* Payment Progress */}
 <div className="bg-white border rounded-lg p-4">
 <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tình hình thanh toán</h4>
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 dark:text-gray-400">Tổng tiền</span>
 <span className="font-semibold tabular-nums">{formatCurrency(data.total_amount)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 dark:text-gray-400">Đã thanh toán</span>
 <span className="font-semibold text-green-600 tabular-nums">{formatCurrency(data.paid_amount)}</span>
 </div>
 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
 <div
 className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-[width] duration-300"
 style={{ width: `${paidPercent}%` }}
 />
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-gray-500 dark:text-gray-400">Còn nợ</span>
 <span className={`font-bold tabular-nums ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
 {formatCurrency(balance)}
 </span>
 </div>
 </div>
 </div>

 <div className="border-t border-gray-200 dark:border-gray-700" />

 {/* Items Table */}
 <div>
 <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
 <IconPackage className="h-4 w-4" />
 Danh sách hàng hóa ({data.items?.length || 0})
 </div>
 {data.items && data.items.length > 0 ? (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-gray-200 dark:border-gray-700">
 <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Tên hàng</th>
 <th className="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-400">SL</th>
 <th className="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Đơn giá</th>
 <th className="text-right py-2 px-2 font-medium text-gray-600 dark:text-gray-400">Thành tiền</th>
 </tr>
 </thead>
 <tbody>
 {data.items.map((item) => (
 <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
 <td className="py-2 px-2">
 <span className="text-gray-900 dark:text-gray-100">{item.item_name}</span>
 {item.uom && (
 <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({item.uom})</span>
 )}
 </td>
 <td className="py-2 px-2 text-right tabular-nums">{Number(item.quantity)}</td>
 <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(item.unit_price)}</td>
 <td className="py-2 px-2 text-right font-medium tabular-nums">{formatCurrency(item.total_price)}</td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="border-t-2 border-gray-300 dark:border-gray-600">
 <td colSpan={3} className="py-2 px-2 font-semibold text-right">Tổng cộng</td>
 <td className="py-2 px-2 text-right font-bold tabular-nums">{formatCurrency(data.total_amount)}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 ) : (
 <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Không có hàng hóa</p>
 )}
 </div>

 {/* Notes */}
 {data.note && (
 <>
 <div className="border-t border-gray-200 dark:border-gray-700" />
 <div>
 <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ghi chú</h4>
 <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">{data.note}</p>
 </div>
 </>
 )}
 </>
 ) : null}
 </div>
 </SheetContent>
 </Sheet>
 );
}
