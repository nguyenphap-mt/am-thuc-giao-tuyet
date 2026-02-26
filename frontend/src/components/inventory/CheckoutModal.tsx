'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
 Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
 IconArrowUp,
 IconPlus,
 IconX,
 IconAlertTriangle,
} from '@tabler/icons-react';
import { formatNumber } from '@/lib/utils';
import type { InventoryItemData } from '@/hooks/use-inventory';

interface CheckoutModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 equipmentItems: InventoryItemData[];
 onSubmit: (data: {
 items: Array<{ item_id: string; quantity: number }>;
 expected_return_date?: string;
 notes?: string;
 }) => void;
 isPending: boolean;
}

export function CheckoutModal({
 open,
 onOpenChange,
 equipmentItems,
 onSubmit,
 isPending,
}: CheckoutModalProps) {
 const [form, setForm] = useState({
 items: [{ item_id: '', quantity: 1 }],
 expected_return_date: '',
 notes: '',
 });
 const [showConfirm, setShowConfirm] = useState(false);

 const validItems = form.items.filter(i => i.item_id && i.quantity > 0);

 const handleSubmitClick = () => {
 if (validItems.length === 0) return;
 // Show confirm step (fix UX-03)
 setShowConfirm(true);
 };

 const handleConfirm = () => {
 onSubmit({
 items: validItems,
 expected_return_date: form.expected_return_date || undefined,
 notes: form.notes || undefined,
 });
 setShowConfirm(false);
 setForm({ items: [{ item_id: '', quantity: 1 }], expected_return_date: '', notes: '' });
 };

 const handleClose = () => {
 setShowConfirm(false);
 onOpenChange(false);
 };

 // Get stock info for selected item (fix UX-01)
 const getItemStock = (itemId: string) => {
 const item = equipmentItems.find(e => e.id === itemId);
 return item?.current_stock ?? null;
 };

 return (
 <Dialog open={open} onOpenChange={handleClose}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <IconArrowUp className="h-5 w-5 text-blue-600" />
 {showConfirm ? 'Xác nhận xuất dụng cụ' : 'Xuất dụng cụ'}
 </DialogTitle>
 <DialogDescription>
 {showConfirm
 ? `Xác nhận xuất ${validItems.length} dụng cụ?`
 : 'Chọn dụng cụ cần mượn cho sự kiện'}
 </DialogDescription>
 </DialogHeader>

 {showConfirm ? (
 /* Confirm step (fix UX-03) */
 <div className="space-y-3 py-2">
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
 <div className="flex items-start gap-2">
 <IconAlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
 <div className="text-sm">
 <p className="font-medium text-amber-800">Bạn sắp xuất:</p>
 <ul className="mt-1 space-y-0.5">
 {validItems.map((item, i) => {
 const eq = equipmentItems.find(e => e.id === item.item_id);
 return (
 <li key={i} className="text-amber-700">
 • {eq?.name || item.item_id} — <strong>{item.quantity}</strong> {eq?.uom || 'cái'}
 </li>
 );
 })}
 </ul>
 {form.expected_return_date && (
 <p className="mt-1 text-amber-600">
 Trả dự kiến: <strong>{new Date(form.expected_return_date).toLocaleDateString('vi-VN')}</strong>
 </p>
 )}
 </div>
 </div>
 </div>
 </div>
 ) : (
 /* Form step */
 <div className="space-y-4 py-2">
 {form.items.map((item, idx) => {
 const stock = item.item_id ? getItemStock(item.item_id) : null;
 return (
 <div key={idx} className="flex items-end gap-2">
 <div className="flex-1">
 <Label className="text-xs">Dụng cụ</Label>
 <Select
 value={item.item_id}
 onValueChange={(v) => {
 const newItems = [...form.items];
 newItems[idx].item_id = v;
 setForm({ ...form, items: newItems });
 }}
 >
 <SelectTrigger className="h-9">
 <SelectValue placeholder="Chọn dụng cụ" />
 </SelectTrigger>
 <SelectContent>
 {equipmentItems.map(eq => (
 <SelectItem key={eq.id} value={eq.id}>
 {eq.name} ({eq.sku}) — Tồn: {formatNumber(eq.current_stock)}
 </SelectItem>
 ))}
 {equipmentItems.length === 0 && (
 <SelectItem value="none" disabled>
 Chưa có dụng cụ (item_type=EQUIPMENT)
 </SelectItem>
 )}
 </SelectContent>
 </Select>
 {/* Inline stock info (fix UX-01) */}
 {stock !== null && (
 <p className={`text-xs mt-0.5 ${stock < item.quantity ? 'text-red-500' : 'text-green-600'}`}>
 Tồn kho: {formatNumber(stock)} {stock < item.quantity && '⚠�E�EKhông đủ!'}
 </p>
 )}
 </div>
 <div className="w-24">
 <Label className="text-xs">SL</Label>
 <Input
 type="number"
 min={1}
 value={item.quantity}
 onChange={(e) => {
 const newItems = [...form.items];
 newItems[idx].quantity = parseInt(e.target.value) || 1;
 setForm({ ...form, items: newItems });
 }}
 className="h-9"
 />
 </div>
 {form.items.length > 1 && (
 <Button
 variant="ghost"
 size="icon"
 className="h-9 w-9 text-red-500"
 onClick={() => {
 const newItems = form.items.filter((_, i) => i !== idx);
 setForm({ ...form, items: newItems });
 }}
 >
 <IconX className="h-4 w-4" />
 </Button>
 )}
 </div>
 );
 })}

 <Button
 variant="ghost"
 size="sm"
 className="text-xs text-accent-primary"
 onClick={() => setForm({
 ...form,
 items: [...form.items, { item_id: '', quantity: 1 }],
 })}
 >
 <IconPlus className="mr-1 h-3.5 w-3.5" />
 Thêm dụng cụ
 </Button>

 <div>
 <Label className="text-xs">Ngày trả dự kiến</Label>
 <Input
 type="date"
 value={form.expected_return_date}
 onChange={(e) => setForm({ ...form, expected_return_date: e.target.value })}
 className="h-9"
 />
 </div>

 <div>
 <Label className="text-xs">Ghi chú</Label>
 <Textarea
 rows={2}
 value={form.notes}
 onChange={(e) => setForm({ ...form, notes: e.target.value })}
 placeholder="VD: Tiệc cưới 50 bàn..."
 />
 </div>
 </div>
 )}

 <DialogFooter>
 {showConfirm ? (
 <>
 <Button variant="outline" onClick={() => setShowConfirm(false)}>Quay lại</Button>
 <Button
 className="bg-accent-gradient"
 onClick={handleConfirm}
 disabled={isPending}
 >
 {isPending ? 'Đang xử lý...' : 'Xác nhận xuất'}
 </Button>
 </>
 ) : (
 <>
 <Button variant="outline" onClick={handleClose}>Hủy</Button>
 <Button
 className="bg-accent-gradient"
 onClick={handleSubmitClick}
 disabled={validItems.length === 0}
 >
 Tiếp tục
 </Button>
 </>
 )}
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
