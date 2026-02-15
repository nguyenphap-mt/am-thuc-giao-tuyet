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

interface CreatePRModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export default function CreatePRModal({ open, onClose, onSubmit }: CreatePRModalProps) {
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('NORMAL');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<Array<{ item_name: string; quantity: number; uom: string; estimated_unit_price: number }>>([
        { item_name: '', quantity: 1, uom: 'kg', estimated_unit_price: 0 },
    ]);

    const addLine = () => setLines([...lines, { item_name: '', quantity: 1, uom: 'kg', estimated_unit_price: 0 }]);
    const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: string, value: any) => {
        const updated = [...lines];
        (updated[i] as any)[field] = value;
        setLines(updated);
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            toast.error('Vui lòng nhập tiêu đề yêu cầu');
            return;
        }
        if (!lines.some(l => l.item_name)) {
            toast.error('Vui lòng thêm ít nhất 1 mặt hàng');
            return;
        }
        const totalAmount = lines.reduce((sum, l) => sum + (l.quantity * l.estimated_unit_price), 0);
        onSubmit({
            title,
            priority,
            notes: notes || undefined,
            total_amount: totalAmount,
            lines: lines.filter(l => l.item_name).map(l => ({
                item_name: l.item_name,
                quantity: l.quantity,
                uom: l.uom,
                estimated_unit_price: l.estimated_unit_price,
                estimated_total: l.quantity * l.estimated_unit_price,
            })),
        });
        // Reset
        setTitle(''); setPriority('NORMAL'); setNotes('');
        setLines([{ item_name: '', quantity: 1, uom: 'kg', estimated_unit_price: 0 }]);
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Tạo yêu cầu mua hàng</DialogTitle>
                    <DialogDescription>Điền thông tin yêu cầu mua hàng mới</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Mua nguyên liệu tuần 3..." className="mt-1" />
                        </div>
                        <div>
                            <Label>Mức ưu tiên</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Thấp</SelectItem>
                                    <SelectItem value="NORMAL">Bình thường</SelectItem>
                                    <SelectItem value="HIGH">Cao</SelectItem>
                                    <SelectItem value="URGENT">Khẩn cấp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Ghi chú</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" rows={2} placeholder="Ghi chú thêm..." />
                    </div>

                    {/* Lines */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Mặt hàng</Label>
                            <Button variant="outline" size="sm" onClick={addLine}><IconPlus className="h-3 w-3 mr-1" />Thêm dòng</Button>
                        </div>
                        <div className="space-y-2">
                            {lines.map((line, i) => (
                                <div key={i} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        {i === 0 && <Label className="text-xs">Tên hàng</Label>}
                                        <Input value={line.item_name} onChange={e => updateLine(i, 'item_name', e.target.value)} placeholder="Tên mặt hàng..." className="text-sm" />
                                    </div>
                                    <div className="w-20">
                                        {i === 0 && <Label className="text-xs">SL</Label>}
                                        <Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value) || 0)} className="text-sm" />
                                    </div>
                                    <div className="w-16">
                                        {i === 0 && <Label className="text-xs">ĐVT</Label>}
                                        <Input value={line.uom} onChange={e => updateLine(i, 'uom', e.target.value)} className="text-sm" />
                                    </div>
                                    <div className="w-28">
                                        {i === 0 && <Label className="text-xs">Đơn giá ƯT</Label>}
                                        <Input type="number" value={line.estimated_unit_price} onChange={e => updateLine(i, 'estimated_unit_price', parseFloat(e.target.value) || 0)} className="text-sm" />
                                    </div>
                                    <div className="w-28 text-right">
                                        {i === 0 && <Label className="text-xs block">Thành tiền</Label>}
                                        <span className="text-sm font-medium tabular-nums">{formatCurrency(line.quantity * line.estimated_unit_price)}</span>
                                    </div>
                                    {lines.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeLine(i)}><IconTrash className="h-3.5 w-3.5 text-red-400" /></Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white" onClick={handleSubmit}>Tạo yêu cầu</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
