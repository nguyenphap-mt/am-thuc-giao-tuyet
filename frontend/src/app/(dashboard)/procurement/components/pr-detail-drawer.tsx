'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconCheck, IconX, IconArrowRight, IconTrash, IconClipboardList } from '@tabler/icons-react';
import type { PurchaseRequisition } from '@/hooks/use-procurement';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PR_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    'PENDING': { label: 'Chờ duyệt', color: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
    'APPROVED': { label: 'Đã duyệt', color: 'bg-green-50 text-green-700 border border-green-200', dot: 'bg-green-500' },
    'REJECTED': { label: 'Từ chối', color: 'bg-red-50 text-red-700 border border-red-200', dot: 'bg-red-500' },
    'CONVERTED': { label: 'Đã chuyển PO', color: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
};

const PR_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    'LOW': { label: 'Thấp', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
    'NORMAL': { label: 'Bình thường', color: 'bg-blue-100 text-blue-600' },
    'HIGH': { label: 'Cao', color: 'bg-orange-100 text-orange-600' },
    'URGENT': { label: 'Khẩn cấp', color: 'bg-red-100 text-red-600' },
};

interface PRDetailDrawerProps {
    pr: PurchaseRequisition | null;
    open: boolean;
    onClose: () => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onConvert: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function PRDetailDrawer({ pr, open, onClose, onApprove, onReject, onConvert, onDelete }: PRDetailDrawerProps) {
    if (!pr) return null;

    const statusCfg = PR_STATUS_CONFIG[pr.status] || PR_STATUS_CONFIG['PENDING'];
    const priorityCfg = PR_PRIORITY_CONFIG[pr.priority] || PR_PRIORITY_CONFIG['NORMAL'];
    const lines = pr.lines || [];
    const total = lines.reduce((sum, line) => sum + (Number(line.estimated_total) || Number(line.quantity) * Number(line.estimated_unit_price) || 0), 0);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                        <DialogTitle className="font-mono">{pr.code}</DialogTitle>
                        <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
                        <Badge className={`${priorityCfg.color} text-xs`}>{priorityCfg.label}</Badge>
                    </div>
                    <DialogDescription>{pr.title}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Meta Info */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Ngày tạo</p>
                            <p className="text-sm font-medium">{formatDate(pr.created_at)}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Số mặt hàng</p>
                            <p className="text-sm font-medium">{lines.length} mục</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 rounded-lg">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng ước tính</p>
                            <p className="text-sm font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent tabular-nums">{formatCurrency(total)}</p>
                        </div>
                    </div>

                    {/* Notes */}
                    {pr.notes && (
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-amber-600 mb-1">Ghi chú</p>
                            <p className="text-sm text-amber-900 whitespace-pre-wrap">{pr.notes}</p>
                        </div>
                    )}

                    {/* Line Items Table */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                            <IconClipboardList className="h-4 w-4 text-gray-400 dark:text-gray-500" />Danh sách mặt hàng
                        </h4>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-2.5 font-medium text-gray-500 dark:text-gray-400">#</th>
                                        <th className="text-left p-2.5 font-medium text-gray-500 dark:text-gray-400">Tên hàng</th>
                                        <th className="text-right p-2.5 font-medium text-gray-500 dark:text-gray-400">SL</th>
                                        <th className="text-center p-2.5 font-medium text-gray-500 dark:text-gray-400">ĐVT</th>
                                        <th className="text-right p-2.5 font-medium text-gray-500 dark:text-gray-400">Đơn giá (ƯT)</th>
                                        <th className="text-right p-2.5 font-medium text-gray-500 dark:text-gray-400">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {lines.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-6 text-center text-gray-400 dark:text-gray-500">Không có mặt hàng nào</td>
                                        </tr>
                                    ) : lines.map((line, i) => (
                                        <tr key={line.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                            <td className="p-2.5 text-gray-400 dark:text-gray-500">{i + 1}</td>
                                            <td className="p-2.5">
                                                <span className="font-medium text-gray-900 dark:text-gray-100">{line.item_name}</span>
                                                {line.item_sku && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">({line.item_sku})</span>}
                                                {line.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{line.notes}</p>}
                                            </td>
                                            <td className="p-2.5 text-right tabular-nums">{Number(line.quantity).toLocaleString()}</td>
                                            <td className="p-2.5 text-center text-gray-500 dark:text-gray-400">{line.uom || '—'}</td>
                                            <td className="p-2.5 text-right tabular-nums">{formatCurrency(Number(line.estimated_unit_price) || 0)}</td>
                                            <td className="p-2.5 text-right font-medium tabular-nums">{formatCurrency(Number(line.estimated_total) || Number(line.quantity) * Number(line.estimated_unit_price) || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {lines.length > 0 && (
                                    <tfoot className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 font-bold">
                                        <tr>
                                            <td colSpan={5} className="p-2.5 text-right">Tổng cộng</td>
                                            <td className="p-2.5 text-right tabular-nums">{formatCurrency(total)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <DialogFooter className="gap-2 flex-wrap">
                    {pr.status === 'PENDING' && (
                        <>
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => onReject(pr.id)}>
                                <IconX className="mr-1.5 h-4 w-4" />Từ chối
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(pr.id)}>
                                <IconCheck className="mr-1.5 h-4 w-4" />Duyệt
                            </Button>
                        </>
                    )}
                    {(pr.status === 'APPROVED' || pr.status === 'PENDING') && (
                        <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={() => onConvert(pr.id)}>
                            <IconArrowRight className="mr-1.5 h-4 w-4" />Chuyển thành PO
                        </Button>
                    )}
                    {pr.status !== 'CONVERTED' && (
                        <Button variant="ghost" className="text-red-500" onClick={() => onDelete(pr.id)}>
                            <IconTrash className="mr-1.5 h-4 w-4" />Xóa
                        </Button>
                    )}
                    <Button variant="outline" onClick={onClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
