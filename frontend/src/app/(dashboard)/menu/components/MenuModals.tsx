'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { IconSearch, IconX, IconToolsKitchen, IconPercentage } from '@tabler/icons-react';
import type { Category, MenuItem, SetMenu } from '@/hooks/use-menu';

// === Helpers ===
const getFoodCostColor = (cost: number, sell: number) => {
    if (sell <= 0) return 'text-gray-400 dark:text-gray-500';
    const pct = (cost / sell) * 100;
    if (pct <= 30) return 'text-green-600 bg-green-50';
    if (pct <= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
};

// ============ ITEM FORM DATA ============
export interface ItemFormData {
    name: string;
    description: string;
    category_id: string;
    uom: string;
    cost_price: string;
    selling_price: string;
    is_active: boolean;
    image_url: string;
}

export const EMPTY_FORM: ItemFormData = {
    name: '', description: '', category_id: '', uom: 'Món',
    cost_price: '0', selling_price: '0', is_active: true, image_url: '',
};

// ============ MENU ITEM MODAL ============
interface MenuItemModalProps {
    open: boolean;
    onClose: () => void;
    editing: MenuItem | null;
    categories: Category[];
    onSave: (data: ItemFormData) => Promise<void>;
    isPending: boolean;
    isService?: boolean;
}

export function MenuItemModal({ open, onClose, editing, categories, onSave, isPending, isService = false }: MenuItemModalProps) {
    const [formData, setFormData] = useState<ItemFormData>(EMPTY_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // BUGFIX: BUG-20260214-001
    // Reactively sync formData with editing prop when modal opens
    // Previously resetForm was only called via DOM callbacks which don't fire reliably
    // when the dialog open state is controlled externally via React props
    useEffect(() => {
        if (open) {
            if (editing) {
                setFormData({
                    name: editing.name, description: editing.description || '', category_id: editing.category_id || '',
                    uom: editing.uom || 'Món', cost_price: String(editing.cost_price || 0), selling_price: String(editing.selling_price || 0),
                    is_active: editing.is_active, image_url: editing.image_url || '',
                });
            } else {
                setFormData(EMPTY_FORM);
            }
            setErrors({});
        }
    }, [open, editing]);

    // Reset form when modal opens/changes
    const resetForm = () => {
        if (editing) {
            setFormData({
                name: editing.name, description: editing.description || '', category_id: editing.category_id || '',
                uom: editing.uom || 'Món', cost_price: String(editing.cost_price || 0), selling_price: String(editing.selling_price || 0),
                is_active: editing.is_active, image_url: editing.image_url || '',
            });
        } else {
            setFormData(EMPTY_FORM);
        }
        setErrors({});
    };

    // Validate form
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên món ăn';
        const costPrice = parseFloat(formData.cost_price);
        const sellingPrice = parseFloat(formData.selling_price);
        if (isNaN(sellingPrice) || sellingPrice < 0) newErrors.selling_price = 'Giá bán phải ≥ 0';
        if (isNaN(costPrice) || costPrice < 0) newErrors.cost_price = 'Giá vốn phải ≥ 0';
        if (costPrice > sellingPrice && sellingPrice > 0) newErrors.cost_price = 'Giá vốn cao hơn giá bán — kiểm tra lại';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        await onSave(formData);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else resetForm(); }}>
            <DialogContent className="sm:max-w-lg" onOpenAutoFocus={resetForm}>
                <DialogHeader>
                    <DialogTitle>{editing ? (isService ? 'Chỉnh sửa dịch vụ' : 'Chỉnh sửa món') : (isService ? 'Thêm dịch vụ mới' : 'Thêm món mới')}</DialogTitle>
                    <DialogDescription>{editing ? (isService ? 'Cập nhật thông tin dịch vụ' : 'Cập nhật thông tin món ăn') : (isService ? 'Nhập thông tin cho dịch vụ mới' : 'Nhập thông tin cho món ăn mới')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{isService ? 'Tên dịch vụ' : 'Tên món'} *</Label>
                        <Input id="name" value={formData.name} onChange={e => { setFormData(d => ({ ...d, name: e.target.value })); if (errors.name) setErrors(e => ({ ...e, name: '' })); }} placeholder={isService ? 'VD: Bàn ghế inox 10 người' : 'VD: Gỏi cuốn tôm thịt'} autoFocus className={errors.name ? 'border-red-400' : ''} />
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label htmlFor="category">Danh mục</Label><Select value={formData.category_id} onValueChange={v => setFormData(d => ({ ...d, category_id: v }))}><SelectTrigger id="category"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><Label htmlFor="uom">Đơn vị</Label><Input id="uom" value={formData.uom} onChange={e => setFormData(d => ({ ...d, uom: e.target.value }))} placeholder="Món, dĩa, phần" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="cost_price">Giá vốn (đ)</Label>
                            <Input id="cost_price" type="number" value={formData.cost_price} onChange={e => { setFormData(d => ({ ...d, cost_price: e.target.value })); if (errors.cost_price) setErrors(er => ({ ...er, cost_price: '' })); }} className={errors.cost_price ? 'border-red-400' : ''} />
                            {errors.cost_price && <p className="text-xs text-red-500">{errors.cost_price}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="selling_price">Giá bán (đ)</Label>
                            <Input id="selling_price" type="number" value={formData.selling_price} onChange={e => { setFormData(d => ({ ...d, selling_price: e.target.value })); if (errors.selling_price) setErrors(er => ({ ...er, selling_price: '' })); }} className={errors.selling_price ? 'border-red-400' : ''} />
                            {errors.selling_price && <p className="text-xs text-red-500">{errors.selling_price}</p>}
                        </div>
                    </div>
                    {parseFloat(formData.selling_price) > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <IconPercentage className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-600 dark:text-gray-400">Food Cost:</span>
                            <span className={cn('text-sm font-medium px-1.5 py-0.5 rounded', getFoodCostColor(parseFloat(formData.cost_price), parseFloat(formData.selling_price)))}>{Math.round((parseFloat(formData.cost_price) / parseFloat(formData.selling_price)) * 100)}%</span>
                            <span className="text-sm text-gray-400 dark:text-gray-500 ml-auto">Lợi nhuận: {formatCurrency(parseFloat(formData.selling_price) - parseFloat(formData.cost_price))}</span>
                        </div>
                    )}
                    <div className="space-y-2"><Label htmlFor="desc">Mô tả</Label><Textarea id="desc" value={formData.description} onChange={e => setFormData(d => ({ ...d, description: e.target.value }))} rows={2} placeholder={isService ? 'Mô tả ngắn về dịch vụ...' : 'Mô tả ngắn về món ăn...'} /></div>
                    <div className="space-y-2">
                        <Label htmlFor="image_url">Hình ảnh (URL)</Label>
                        <Input id="image_url" value={formData.image_url} onChange={e => setFormData(d => ({ ...d, image_url: e.target.value }))} placeholder="https://example.com/food.jpg" />
                        {formData.image_url && (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border">
                                <img src={formData.image_url} alt="Preview" className="w-12 h-12 rounded-lg object-cover border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1">{formData.image_url}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setFormData(d => ({ ...d, image_url: '' }))}><IconX className="h-3 w-3" /></Button>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2"><Switch checked={formData.is_active} onCheckedChange={v => setFormData(d => ({ ...d, is_active: v }))} /><Label>{isService ? 'Đang hoạt động' : 'Đang bán'}</Label></div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={handleSave} disabled={isPending}>
                        {isPending ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Thêm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============ CATEGORY MODAL ============
interface CategoryModalProps {
    open: boolean;
    onClose: () => void;
    editingId: string | null;
    onSave: (data: { name: string; code: string; description: string; item_type: string }) => Promise<void>;
    initialData?: { name: string; code: string; description: string; item_type?: string };
    isPending: boolean;
}

export function CategoryModal({ open, onClose, editingId, onSave, initialData, isPending }: CategoryModalProps) {
    const [form, setForm] = useState(initialData || { name: '', code: '', description: '', item_type: 'FOOD' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const resetForm = () => {
        setForm(initialData || { name: '', code: '', description: '', item_type: 'FOOD' });
        setErrors({});
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setErrors({ name: 'Vui lòng nhập tên danh mục' }); return; }
        await onSave({ ...form, item_type: form.item_type || 'FOOD' });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else resetForm(); }}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={resetForm}>
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
                    <DialogDescription>{editingId ? 'Cập nhật thông tin danh mục' : 'Nhập thông tin cho danh mục mới'}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cat-name">Tên danh mục *</Label>
                        <Input id="cat-name" value={form.name} onChange={e => { setForm(d => ({ ...d, name: e.target.value })); if (errors.name) setErrors({}); }} placeholder="VD: Khai Vị" autoFocus className={errors.name ? 'border-red-400' : ''} />
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>
                    <div className="space-y-2"><Label htmlFor="cat-code">Mã (code)</Label><Input id="cat-code" value={form.code} onChange={e => setForm(d => ({ ...d, code: e.target.value }))} placeholder="VD: KHAI_VI" /></div>
                    <div className="space-y-2">
                        <Label htmlFor="cat-type">Loại danh mục</Label>
                        <Select value={form.item_type || 'FOOD'} onValueChange={v => setForm(d => ({ ...d, item_type: v }))}>
                            <SelectTrigger id="cat-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FOOD">Thực phẩm (FOOD)</SelectItem>
                                <SelectItem value="SERVICE">Dịch vụ (SERVICE)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="cat-desc">Mô tả</Label><Textarea id="cat-desc" value={form.description} onChange={e => setForm(d => ({ ...d, description: e.target.value }))} rows={2} /></div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={handleSave} disabled={isPending}>
                        {isPending ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Thêm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============ SET MENU MODAL ============
interface SetMenuModalProps {
    open: boolean;
    onClose: () => void;
    editing: SetMenu | null;
    onSave: (data: { name: string; description?: string; selling_price: number; items: Array<{ menu_item_id: string; quantity: number }> }) => Promise<void>;
    isPending: boolean;
    searchItems: MenuItem[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}

export function SetMenuModal({ open, onClose, editing, onSave, isPending, searchItems, searchQuery, setSearchQuery }: SetMenuModalProps) {
    const [form, setForm] = useState({ name: '', description: '', selling_price: '0' });
    const [selectedItems, setSelectedItems] = useState<Array<{ menu_item_id: string; name: string; quantity: number; selling_price: number }>>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const resetForm = () => {
        if (editing) {
            setForm({ name: editing.name, description: editing.description || '', selling_price: String(editing.selling_price || 0) });
            setSelectedItems(editing.items.map(i => ({ menu_item_id: i.menu_item_id, name: i.menu_item_name || '', quantity: i.quantity, selling_price: 0 })));
        } else {
            setForm({ name: '', description: '', selling_price: '0' });
            setSelectedItems([]);
        }
        setErrors({});
    };

    const totalItemsCost = useMemo(() => selectedItems.reduce((sum, i) => sum + (i.selling_price || 0) * i.quantity, 0), [selectedItems]);

    const addItem = (item: MenuItem) => {
        if (selectedItems.find(i => i.menu_item_id === item.id)) return;
        setSelectedItems(prev => [...prev, { menu_item_id: item.id, name: item.name, quantity: 1, selling_price: item.selling_price }]);
        setSearchQuery('');
    };

    const handleSave = async () => {
        if (!form.name.trim()) { setErrors({ name: 'Vui lòng nhập tên combo' }); return; }
        await onSave({
            name: form.name.trim(), description: form.description.trim() || undefined,
            selling_price: parseFloat(form.selling_price) || 0,
            items: selectedItems.map(i => ({ menu_item_id: i.menu_item_id, quantity: i.quantity })),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else resetForm(); }}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={resetForm}>
                <DialogHeader>
                    <DialogTitle>{editing ? 'Sửa combo' : 'Tạo combo mới'}</DialogTitle>
                    <DialogDescription>Combo bao gồm nhiều món với giá gói ưu đãi</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="sm-name">Tên combo *</Label>
                            <Input id="sm-name" value={form.name} onChange={e => { setForm(d => ({ ...d, name: e.target.value })); if (errors.name) setErrors({}); }} placeholder="VD: Set tiệc sinh nhật" autoFocus className={errors.name ? 'border-red-400' : ''} />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>
                        <div className="space-y-2"><Label htmlFor="sm-price">Giá bán combo (đ)</Label><Input id="sm-price" type="number" value={form.selling_price} onChange={e => setForm(d => ({ ...d, selling_price: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="sm-desc">Mô tả</Label><Textarea id="sm-desc" value={form.description} onChange={e => setForm(d => ({ ...d, description: e.target.value }))} rows={2} /></div>

                    {/* Item Picker */}
                    <div className="space-y-2">
                        <Label>Chọn món cho combo</Label>
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <Input placeholder="Tìm món để thêm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                        </div>
                        {searchQuery.length >= 2 && searchItems.length > 0 && (
                            <div className="border rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                                {searchItems.slice(0, 8).map(item => (
                                    <button key={item.id} onClick={() => addItem(item)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors">
                                        <IconToolsKitchen className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                                        <span className="text-sm truncate flex-1">{item.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.selling_price)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected items */}
                    {selectedItems.length > 0 && (
                        <div className="space-y-2">
                            <Label>Món đã chọn ({selectedItems.length})</Label>
                            <div className="border rounded-lg divide-y">
                                {selectedItems.map(item => (
                                    <div key={item.menu_item_id} className="flex items-center gap-3 px-3 py-2">
                                        <span className="text-sm flex-1 truncate">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-gray-500 dark:text-gray-400 sr-only">SL</Label>
                                            <Input type="number" min={1} value={item.quantity} onChange={e => setSelectedItems(prev => prev.map(i => i.menu_item_id === item.menu_item_id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))} className="w-16 h-7 text-sm text-center" />
                                        </div>
                                        {item.selling_price > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">{formatCurrency(item.selling_price * item.quantity)}</span>}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setSelectedItems(prev => prev.filter(i => i.menu_item_id !== item.menu_item_id))}><IconX className="h-3 w-3 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>
                            {totalItemsCost > 0 && (
                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Giá riêng lẻ: {formatCurrency(totalItemsCost)}</span>
                                    <span className={cn('font-medium', parseFloat(form.selling_price) < totalItemsCost ? 'text-green-600' : 'text-amber-600')}>
                                        Tiết kiệm: {formatCurrency(totalItemsCost - (parseFloat(form.selling_price) || 0))}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" onClick={handleSave} disabled={isPending}>
                        {isPending ? 'Đang lưu...' : (editing ? 'Cập nhật' : 'Tạo combo')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============ DELETE CONFIRM DIALOG ============
interface DeleteConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    type: 'item' | 'set-menu' | 'category';
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, type }: DeleteConfirmDialogProps) {
    const messages = {
        'item': 'Bạn có chắc chắn muốn xóa món ăn này?',
        'set-menu': 'Bạn có chắc chắn muốn xóa combo này?',
        'category': 'Bạn có chắc chắn muốn xóa danh mục này? Danh mục phải trống (không có món) mới xóa được.',
    };

    return (
        <Dialog open={open} onOpenChange={() => onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Xác nhận xóa</DialogTitle>
                    <DialogDescription>{messages[type]}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button variant="destructive" onClick={onConfirm}>Xóa</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
