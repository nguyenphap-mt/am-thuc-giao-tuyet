'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
 IconArrowDown,
 IconCheck,
} from '@tabler/icons-react';
import type { EquipmentCheckout, CheckinRequest } from '@/hooks/use-inventory';

interface CheckinModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 checkout: EquipmentCheckout | null;
 onSubmit: (data: { checkoutId: string; data: CheckinRequest }) => void;
 isPending: boolean;
}

export function CheckinModal({
 open,
 onOpenChange,
 checkout,
 onSubmit,
 isPending,
}: CheckinModalProps) {
 const maxReturn = checkout
 ? checkout.checkout_qty - checkout.checkin_qty - checkout.damaged_qty
 : 0;

 const [form, setForm] = useState({
 returned_qty: maxReturn,
 damaged_qty: 0,
 damage_notes: '',
 });

 // Reset form when checkout changes
 const handleOpen = (isOpen: boolean) => {
 if (isOpen && checkout) {
 const remaining = checkout.checkout_qty - checkout.checkin_qty - checkout.damaged_qty;
 setForm({ returned_qty: remaining, damaged_qty: 0, damage_notes: '' });
 }
 onOpenChange(isOpen);
 };

 const handleSubmit = () => {
 if (!checkout) return;
 if (form.returned_qty <= 0 && form.damaged_qty <= 0) return;

 onSubmit({
 checkoutId: checkout.id,
 data: {
 returns: [{
 item_id: checkout.item_id,
 returned_qty: form.returned_qty,
 damaged_qty: form.damaged_qty,
 damage_notes: form.damage_notes || undefined,
 }],
 },
 });
 };

 return (
 <Dialog open={open} onOpenChange={handleOpen}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <IconArrowDown className="h-5 w-5 text-green-600" />
 Nhận trả dụng cụ
 </DialogTitle>
 <DialogDescription>
 {checkout && `${checkout.item_name} — Mượn: ${checkout.checkout_qty}, Đã trả: ${checkout.checkin_qty}`}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2">
 <div className="space-y-2 p-3 border rounded-lg">
 <div className="grid grid-cols-2 gap-2">
 <div>
 <Label className="text-xs">Trả tốt</Label>
 <Input
 type="number"
 min={0}
 max={maxReturn}
 value={form.returned_qty}
 onChange={(e) => setForm({ ...form, returned_qty: parseInt(e.target.value) || 0 })}
 className="h-9"
 />
 </div>
 <div>
 <Label className="text-xs text-red-500">Hư hỏng</Label>
 <Input
 type="number"
 min={0}
 max={maxReturn}
 value={form.damaged_qty}
 onChange={(e) => setForm({ ...form, damaged_qty: parseInt(e.target.value) || 0 })}
 className="h-9"
 />
 </div>
 </div>
 {form.damaged_qty > 0 && (
 <div>
 <Label className="text-xs text-red-500">Ghi chú hư hỏng</Label>
 <Textarea
 rows={2}
 value={form.damage_notes}
 onChange={(e) => setForm({ ...form, damage_notes: e.target.value })}
 placeholder="Mô tả tình trạng hư hỏng..."
 />
 </div>
 )}
 <p className="text-xs text-gray-400">Tối đa có thể trả: {maxReturn}</p>
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
 <Button
 className="bg-green-600 hover:bg-green-700 text-white"
 onClick={handleSubmit}
 disabled={isPending || (form.returned_qty <= 0 && form.damaged_qty <= 0)}
 >
 <IconCheck className="mr-1.5 h-4 w-4" />
 {isPending ? 'Đang xử lý...' : 'Xác nhận trả'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
