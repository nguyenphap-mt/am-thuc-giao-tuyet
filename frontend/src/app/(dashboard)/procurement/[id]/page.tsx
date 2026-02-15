'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    IconArrowLeft, IconSend, IconPackage, IconCash, IconEdit, IconTrash,
    IconTruck, IconCalendar, IconFileInvoice, IconCheck, IconClock,
    IconAlertCircle,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import {
    usePurchaseOrder, useUpdatePOStatus, useDeletePO, useReceivePO, PurchaseOrder,
} from '@/hooks/use-procurement';

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    'DRAFT': { label: 'Nháp', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800' },
    'SENT': { label: 'Đã gửi', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    'RECEIVED': { label: 'Đã nhận hàng', color: 'text-green-700', bgColor: 'bg-green-100' },
    'PAID': { label: 'Đã thanh toán', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
};

// Status transitions
const NEXT_STATUS: Record<string, { status: string; label: string; icon: React.ElementType; color: string }[]> = {
    'DRAFT': [{ status: 'SENT', label: 'Gửi đơn', icon: IconSend, color: 'bg-blue-600 hover:bg-blue-700' }],
    'SENT': [{ status: 'RECEIVED', label: 'Nhận hàng', icon: IconPackage, color: 'bg-green-600 hover:bg-green-700' }],
    'RECEIVED': [{ status: 'PAID', label: 'Đánh dấu đã thanh toán', icon: IconCash, color: 'bg-emerald-600 hover:bg-emerald-700' }],
    'PAID': [],
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDate(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr?: string) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: order, isLoading } = usePurchaseOrder(id);
    const updateStatus = useUpdatePOStatus();
    const deletePO = useDeletePO();
    const receivePO = useReceivePO();

    const [showDelete, setShowDelete] = useState(false);
    const [showReceive, setShowReceive] = useState(false);

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-20">
                <IconAlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">Không tìm thấy đơn mua hàng</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/procurement')}>
                    <IconArrowLeft className="mr-2 h-4 w-4" />Quay lại
                </Button>
            </div>
        );
    }

    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['DRAFT'];
    const nextActions = NEXT_STATUS[order.status] || [];
    const itemsTotal = (order.items || []).reduce((sum, item) => sum + (Number(item.total_price) || Number(item.quantity) * Number(item.unit_price) || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <motion.div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/procurement')} className="shrink-0">
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">{order.code}</h1>
                            <Badge className={`${statusCfg.bgColor} ${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tạo lúc {formatDateTime(order.created_at)}</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                    {nextActions.map(action => (
                        <Button key={action.status} className={`${action.color} text-white`}
                            onClick={() => {
                                if (action.status === 'RECEIVED') {
                                    setShowReceive(true);
                                } else {
                                    updateStatus.mutate({ id: order.id, status: action.status });
                                }
                            }}>
                            <action.icon className="mr-2 h-4 w-4" />{action.label}
                        </Button>
                    ))}
                    {order.status === 'DRAFT' && (
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDelete(true)}>
                            <IconTrash className="mr-2 h-4 w-4" />Xóa
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* Info Cards */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                {/* Supplier Info */}
                <Card>
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <IconTruck className="h-4 w-4 text-gray-400 dark:text-gray-500" />Nhà cung cấp
                        </h3>
                        {order.supplier ? (
                            <div className="space-y-1">
                                <p className="font-medium text-gray-900 dark:text-gray-100">{order.supplier.name}</p>
                                {order.supplier.contact_person && <p className="text-sm text-gray-500 dark:text-gray-400">{order.supplier.contact_person}</p>}
                                {order.supplier.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{order.supplier.phone}</p>}
                                {order.supplier.address && <p className="text-sm text-gray-500 dark:text-gray-400">{order.supplier.address}</p>}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Chưa chọn nhà cung cấp</p>
                        )}
                    </CardContent>
                </Card>

                {/* Delivery Info */}
                <Card>
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <IconCalendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />Thông tin giao hàng
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Ngày tạo</span>
                                <span className="text-sm font-medium">{formatDate(order.created_at)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Giao dự kiến</span>
                                <span className="text-sm font-medium">{formatDate(order.expected_delivery)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Điều khoản TT</span>
                                <span className="text-sm font-medium">{order.payment_terms || 'NET30'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Info */}
                <Card>
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                            <IconCash className="h-4 w-4 text-gray-400 dark:text-gray-500" />Tài chính
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Tổng giá trị</span>
                                <span className="text-sm font-bold tabular-nums">{formatCurrency(Number(order.total_amount) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Đã thanh toán</span>
                                <span className="text-sm font-medium text-green-600 tabular-nums">{formatCurrency(Number(order.paid_amount) || 0)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Còn nợ</span>
                                <span className="text-sm font-bold text-amber-600 tabular-nums">{formatCurrency((Number(order.total_amount) || 0) - (Number(order.paid_amount) || 0))}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Items Table */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                    <CardContent className="p-0">
                        <div className="p-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <IconFileInvoice className="h-4 w-4 text-gray-400 dark:text-gray-500" />Danh sách hàng ({order.items?.length || 0} mục)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                                        <th className="text-left p-3 font-medium text-gray-500 dark:text-gray-400">Tên hàng</th>
                                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Số lượng</th>
                                        <th className="text-center p-3 font-medium text-gray-500 dark:text-gray-400">ĐVT</th>
                                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Đơn giá</th>
                                        <th className="text-right p-3 font-medium text-gray-500 dark:text-gray-400">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(order.items || []).map((item, i) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                            <td className="p-3 text-gray-400 dark:text-gray-500">{i + 1}</td>
                                            <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{item.item_name}</td>
                                            <td className="p-3 text-right tabular-nums">{Number(item.quantity).toLocaleString()}</td>
                                            <td className="p-3 text-center text-gray-500 dark:text-gray-400">{item.uom || '—'}</td>
                                            <td className="p-3 text-right tabular-nums">{formatCurrency(Number(item.unit_price) || 0)}</td>
                                            <td className="p-3 text-right font-medium tabular-nums">{formatCurrency(Number(item.total_price) || Number(item.quantity) * Number(item.unit_price) || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 font-bold">
                                    <tr>
                                        <td colSpan={5} className="p-3 text-right">Tổng cộng</td>
                                        <td className="p-3 text-right tabular-nums">{formatCurrency(itemsTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Notes */}
            {order.note && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Ghi chú</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{order.note}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Status Timeline */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card>
                    <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tiến trình</h3>
                        <div className="flex items-center gap-0">
                            {['DRAFT', 'SENT', 'RECEIVED', 'PAID'].map((s, i, arr) => {
                                const isActive = s === order.status;
                                const isPast = arr.indexOf(order.status) > i;
                                const cfg = STATUS_CONFIG[s];
                                return (
                                    <div key={s} className="flex items-center flex-1">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${isPast ? 'bg-green-500 text-white' : isActive ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                            {isPast ? <IconCheck className="h-4 w-4" /> : i + 1}
                                        </div>
                                        <div className="ml-2 min-w-0 hidden sm:block">
                                            <p className={`text-xs font-medium ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{cfg.label}</p>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 ${isPast ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Goods Receipt Modal */}
            <ReceiveGoodsModal open={showReceive} onClose={() => setShowReceive(false)} order={order}
                onSubmit={(data) => {
                    receivePO.mutate({ id: order.id, data });
                    setShowReceive(false);
                }}
            />

            {/* Delete Confirm */}
            <Dialog open={showDelete} onOpenChange={setShowDelete}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle><DialogDescription>Bạn có chắc chắn muốn xóa đơn {order.code}?</DialogDescription></DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowDelete(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={() => { deletePO.mutate(order.id); router.push('/procurement'); }}>Xóa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ========== RECEIVE GOODS MODAL ==========

function ReceiveGoodsModal({ open, onClose, order, onSubmit }: {
    open: boolean;
    onClose: () => void;
    order: PurchaseOrder;
    onSubmit: (data: { items: any[]; note?: string }) => void;
}) {
    const [note, setNote] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // Initialize quantities from order items
    const items = order.items || [];
    const getQty = (itemId: string, defaultQty: number) => quantities[itemId] ?? defaultQty;

    const handleSubmit = () => {
        const receiveItems = items.map(item => ({
            item_id: item.item_id || item.id,
            quantity: getQty(item.id, Number(item.quantity)),
            unit_price: Number(item.unit_price) || 0,
        }));

        onSubmit({
            items: receiveItems,
            note: note || undefined,
        });
        setNote('');
        setQuantities({});
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nhận hàng — {order.code}</DialogTitle>
                    <DialogDescription>Xác nhận số lượng nhận cho từng mặt hàng. Tồn kho sẽ tự động cập nhật.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900 dark:bg-gray-800">
                            <tr>
                                <th className="text-left p-2 font-medium text-gray-500 dark:text-gray-400">Tên hàng</th>
                                <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">SL đặt</th>
                                <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">SL nhận</th>
                                <th className="text-right p-2 font-medium text-gray-500 dark:text-gray-400">Đơn giá</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                                    <td className="p-2 font-medium">{item.item_name}</td>
                                    <td className="p-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{Number(item.quantity)}</td>
                                    <td className="p-2">
                                        <Input type="number" className="w-24 ml-auto text-right text-sm"
                                            value={getQty(item.id, Number(item.quantity))}
                                            onChange={e => setQuantities({ ...quantities, [item.id]: parseFloat(e.target.value) || 0 })}
                                        />
                                    </td>
                                    <td className="p-2 text-right tabular-nums">{formatCurrency(Number(item.unit_price) || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div>
                        <Label>Ghi chú nhận hàng</Label>
                        <Textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1" rows={2} placeholder="Ghi chú về lô hàng..." />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSubmit}>
                        <IconPackage className="mr-2 h-4 w-4" />Xác nhận nhận hàng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
