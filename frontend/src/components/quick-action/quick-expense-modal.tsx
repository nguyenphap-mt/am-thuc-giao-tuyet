'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { IconReceipt, IconCamera, IconLoader2, IconX, IconPackage } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface QuickExpenseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface ActiveOrder {
    id: string;
    code: string;
    customer_name: string;
    event_date: string | null;
    event_location: string | null;
}

const EXPENSE_CATEGORIES = [
    { value: 'INGREDIENT', label: 'Nguyên liệu' },
    { value: 'SUPPLY', label: 'Vật tư' },
    { value: 'TRANSPORT', label: 'Vận chuyển' },
    { value: 'OTHER', label: 'Khác' },
];

export function QuickExpenseModal({ open, onOpenChange, onSuccess }: QuickExpenseModalProps) {
    // Form state
    const [category, setCategory] = useState<string>('INGREDIENT');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    // Order linking state (Field Expense Feature)
    const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
    const [selectedOrderId, setSelectedOrderId] = useState<string>('');
    const [loadingOrders, setLoadingOrders] = useState(false);

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load active orders when modal opens
    useEffect(() => {
        if (open) {
            loadActiveOrders();
        }
    }, [open]);

    const loadActiveOrders = async () => {
        setLoadingOrders(true);
        try {
            const response = await api.get<ActiveOrder[]>('/orders/my-active');
            // BUGFIX: BUG-20260203-001 - Defensive check to ensure array
            const orders = Array.isArray(response) ? response : [];
            setActiveOrders(orders);
        } catch (error) {
            console.error('Failed to load active orders:', error);
            setActiveOrders([]);
        } finally {
            setLoadingOrders(false);
        }
    };

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setCategory('INGREDIENT');
            setAmount('');
            setDescription('');
            setReceiptImage(null);
            setReceiptPreview(null);
            setSelectedOrderId('');
            setActiveOrders([]);
        }
    }, [open]);

    const handleAmountChange = (value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        setAmount(numericValue);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setReceiptImage(null);
        setReceiptPreview(null);
    };

    const handleSubmit = async () => {
        const numericAmount = parseInt(amount, 10);
        if (!numericAmount || numericAmount <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        if (!description.trim()) {
            toast.error('Vui lòng nhập mô tả chi tiêu');
            return;
        }

        setIsSubmitting(true);
        try {
            // Create expense transaction
            await api.post('/finance/transactions', {
                type: 'PAYMENT',
                category,
                amount: numericAmount,
                description: description.trim(),
                payment_method: 'CASH',
                transaction_date: new Date().toISOString().split('T')[0], // Today's date
                reference_id: selectedOrderId || null,
                reference_type: selectedOrderId ? 'ORDER' : null,
            });

            const orderInfo = selectedOrderId
                ? ` (cho ${activeOrders.find(o => o.id === selectedOrderId)?.code})`
                : '';
            toast.success(`Đã ghi nhận chi tiêu ${formatCurrency(numericAmount)}đ${orderInfo}`);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error('Không thể ghi nhận chi tiêu. Vui lòng thử lại.');
            console.error('Expense error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconReceipt className="w-5 h-5 text-amber-500" />
                        Ghi Nhận Chi Tiêu Nhanh
                    </DialogTitle>
                    <DialogDescription>
                        Nhập thông tin chi tiêu mua hàng ngoài
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Category Select */}
                    <div>
                        <Label htmlFor="category" className="text-sm font-medium">
                            Hạng mục <span className="text-red-500">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue placeholder="Chọn hạng mục" />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <Label htmlFor="expense-amount" className="text-sm font-medium">
                            Số tiền <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-1.5">
                            <Input
                                id="expense-amount"
                                type="text"
                                inputMode="numeric"
                                placeholder="0"
                                value={amount ? formatCurrency(parseInt(amount, 10)) : ''}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                className="pr-10 text-lg font-medium"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">đ</span>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="expense-description" className="text-sm font-medium">
                            Mô tả <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="expense-description"
                            placeholder="Ví dụ: Mua rau chợ Bến Thành"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1.5 min-h-[80px]"
                        />
                    </div>

                    {/* Order Select - Field Expense Feature */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label htmlFor="order-select" className="text-sm font-medium flex items-center gap-2">
                            <IconPackage className="w-4 h-4 text-blue-500" />
                            Cho đơn hàng <span className="text-gray-400">(tùy chọn)</span>
                        </Label>
                        <Select value={selectedOrderId || 'none'} onValueChange={(val) => setSelectedOrderId(val === 'none' ? '' : val)}>
                            <SelectTrigger className="mt-1.5 bg-white">
                                <SelectValue placeholder={loadingOrders ? "Đang tải..." : "Không chọn - Chi phí vận hành"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không chọn - Chi phí vận hành</SelectItem>
                                {activeOrders.map((order) => (
                                    <SelectItem key={order.id} value={order.id}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{order.code}</span>
                                            <span className="text-xs text-gray-500">{order.customer_name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeOrders.length === 0 && !loadingOrders && (
                            <p className="text-xs text-gray-500 mt-1">Không có đơn hàng nào diễn ra hôm nay</p>
                        )}
                    </div>

                    {/* Receipt Image Capture */}
                    <div>
                        <Label className="text-sm font-medium">
                            Hình hóa đơn <span className="text-gray-400">(tùy chọn)</span>
                        </Label>

                        {receiptPreview ? (
                            <div className="relative mt-1.5">
                                <img
                                    src={receiptPreview}
                                    alt="Hóa đơn"
                                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 cursor-pointer"
                                    aria-label="Xóa hình"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <label
                                htmlFor="receipt-upload"
                                className={cn(
                                    "mt-1.5 flex flex-col items-center justify-center gap-2 p-6",
                                    "border-2 border-dashed border-gray-300 rounded-lg",
                                    "hover:border-amber-400 hover:bg-amber-50 transition-colors cursor-pointer"
                                )}
                            >
                                <IconCamera className="w-8 h-8 text-gray-400" />
                                <span className="text-sm text-gray-500">Chụp hoặc chọn hình hóa đơn</span>
                                <input
                                    id="receipt-upload"
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageCapture}
                                    className="sr-only"
                                />
                            </label>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount || !description.trim()}
                        className="bg-amber-500 hover:bg-amber-600"
                    >
                        {isSubmitting ? (
                            <>
                                <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            '💾 Ghi nhận'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
