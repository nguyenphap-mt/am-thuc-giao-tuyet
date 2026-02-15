'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type { Supplier } from '@/hooks/use-procurement';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

interface CreatePOModalProps {
    open: boolean;
    onClose: () => void;
    suppliers: Supplier[];
    onSubmit: (data: any) => void;
}

export default function CreatePOModal({ open, onClose, suppliers, onSubmit }: CreatePOModalProps) {
    const [supplierId, setSupplierId] = useState('');
    const [note, setNote] = useState('');
    const [expectedDelivery, setExpectedDelivery] = useState('');
    const [items, setItems] = useState<Array<{ item_name: string; quantity: number; uom: string; unit_price: number }>>([
        { item_name: '', quantity: 1, uom: 'kg', unit_price: 0 },
    ]);

    const addItem = () => setItems([...items, { item_name: '', quantity: 1, uom: 'kg', unit_price: 0 }]);
    const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: string, value: any) => {
        const updated = [...items];
        (updated[i] as any)[field] = value;
        setItems(updated);
    };

    const total = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const handleSubmit = () => {
        if (!items.some(i => i.item_name)) {
            toast.error('Vui lòng thêm ít nhất 1 mặt hàng');
            return;
        }
        onSubmit({
            supplier_id: supplierId || undefined,
            total_amount: total,
            status: 'DRAFT',
            expected_delivery: expectedDelivery || undefined,
            note: note || undefined,
            items: items.filter(i => i.item_name).map(i => ({
                item_name: i.item_name,
                quantity: i.quantity,
                uom: i.uom,
                unit_price: i.unit_price,
                total_price: i.quantity * i.unit_price,
            })),
        });
        // Reset form
        setSupplierId(''); setNote(''); setExpectedDelivery('');
        setItems([{ item_name: '', quantity: 1, uom: 'kg', unit_price: 0 }]);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo đơn mua hàng mới</DialogTitle>
                    <DialogDescription>Điền thông tin đơn mua hàng</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Nhà cung cấp</Label>
                            <Select value={supplierId} onValueChange={setSupplierId}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn nhà cung cấp" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Ngày giao dự kiến</Label>
                            <Input type="date" value={expectedDelivery} onChange={e => setExpectedDelivery(e.target.value)} className="mt-1" />
                        </div>
                    </div>

                    <div>
                        <Label>Ghi chú</Label>
                        <Textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1" rows={2} placeholder="Ghi chú cho đơn mua..." />
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Mặt hàng</Label>
                            <Button variant="outline" size="sm" onClick={addItem}><IconPlus className="h-3 w-3 mr-1" />Thêm dòng</Button>
                        </div>
                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        {i === 0 && <Label className="text-xs">Tên hàng</Label>}
                                        <Input value={item.item_name} onChange={e => updateItem(i, 'item_name', e.target.value)} placeholder="Tên mặt hàng..." className="text-sm" />
                                    </div>
                                    <div className="w-20">
                                        {i === 0 && <Label className="text-xs">SL</Label>}
                                        <Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="text-sm" />
                                    </div>
                                    <div className="w-16">
                                        {i === 0 && <Label className="text-xs">ĐVT</Label>}
                                        <Input value={item.uom} onChange={e => updateItem(i, 'uom', e.target.value)} className="text-sm" />
                                    </div>
                                    <div className="w-28">
                                        {i === 0 && <Label className="text-xs">Đơn giá</Label>}
                                        <Input type="number" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="text-sm" />
                                    </div>
                                    <div className="w-28 text-right">
                                        {i === 0 && <Label className="text-xs block">Thành tiền</Label>}
                                        <span className="text-sm font-medium tabular-nums">{formatCurrency(item.quantity * item.unit_price)}</span>
                                    </div>
                                    {items.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeItem(i)}><IconTrash className="h-3.5 w-3.5 text-red-400" /></Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end mt-3 pt-3 border-t">
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tổng cộng</p>
                                <p className="text-lg font-bold tabular-nums">{formatCurrency(total)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={handleSubmit}>Tạo đơn mua</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
