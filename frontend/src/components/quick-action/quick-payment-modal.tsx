'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconCash, IconBuildingBank, IconCreditCard, IconSearch, IconLoader2 } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Order {
    id: string;
    code: string;
    customer_name: string;
    event_date: string;
    final_amount: number;
    paid_amount: number;
    balance_amount: number;
    status: string;
}

interface QuickPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'CASH', label: 'Tiền mặt', icon: <IconCash className="w-5 h-5" /> },
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: <IconBuildingBank className="w-5 h-5" /> },
    { value: 'CARD', label: 'Thẻ', icon: <IconCreditCard className="w-5 h-5" /> },
];

// Status badge component
const STATUS_STYLES: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PAID: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn thành',
    PAID: 'Đã thanh toán',
};

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={cn(
            "inline-block px-1.5 py-0.5 text-[10px] font-medium rounded mt-1",
            STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
        )}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

// Highlight matching text component
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
    if (!highlight || highlight.length < 2) {
        return <>{text}</>;
    }

    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

// Format date helper
function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date);
    } catch {
        return dateString;
    }
}

export function QuickPaymentModal({ open, onOpenChange, onSuccess }: QuickPaymentModalProps) {
    // Form state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [note, setNote] = useState('');

    // UI state
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchResults, setSearchResults] = useState<Order[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            setSearchQuery('');
            setSelectedOrder(null);
            setAmount('');
            setPaymentMethod('CASH');
            setNote('');
            setSearchResults([]);
            setShowDropdown(false);
        }
    }, [open]);

    // Load recent orders on mount
    useEffect(() => {
        if (open) {
            loadRecentOrders();
        }
    }, [open]);

    const loadRecentOrders = async () => {
        try {
            // BUGFIX: BUG-20260203-001
            // Root Cause: Native fetch() was used without auth token
            // Solution: Use api client which includes Authorization header via interceptor
            const data = await api.get<{ items: Order[] }>('/orders?unpaid=true&page_size=5');
            setRecentOrders(data.items || []);
        } catch (error) {
            console.error('Failed to load recent orders:', error);
        }
    };

    // Search orders with debounce
    const searchOrders = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        setIsSearching(true);
        try {
            // BUGFIX: BUG-20260203-001 - Use api client for authenticated requests
            const data = await api.get<{ items: Order[] }>(`/orders?search=${encodeURIComponent(query)}&unpaid=true&page_size=10`);
            setSearchResults(data.items || []);
            setShowDropdown(true);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && !selectedOrder) {
                searchOrders(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedOrder, searchOrders]);

    const handleSelectOrder = (order: Order) => {
        setSelectedOrder(order);
        setSearchQuery(order.code);
        setShowDropdown(false);
        // Auto-fill balance amount
        if (order.balance_amount > 0) {
            setAmount(order.balance_amount.toString());
        }
    };

    const handleAmountChange = (value: string) => {
        // Remove non-numeric characters except comma/dot
        const numericValue = value.replace(/[^0-9]/g, '');
        setAmount(numericValue);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const handleSubmit = async () => {
        if (!selectedOrder) {
            toast.error('Vui lòng chọn đơn hàng');
            return;
        }

        const numericAmount = parseInt(amount, 10);
        if (!numericAmount || numericAmount <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        setIsSubmitting(true);
        try {
            // BUGFIX: BUG-20260203-001 - Use api client for authenticated requests
            await api.post(`/orders/${selectedOrder.id}/payments`, {
                amount: numericAmount,
                payment_method: paymentMethod,
                note: note || undefined,
            });

            // api.post throws on error, so if we reach here it succeeded

            toast.success(`Đã ghi nhận ${formatCurrency(numericAmount)}đ cho ${selectedOrder.code}`);
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error('Không thể ghi nhận thanh toán. Vui lòng thử lại.');
            console.error('Payment error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayOrders = searchResults.length > 0 ? searchResults : recentOrders;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconCash className="w-5 h-5 text-emerald-500" />
                        Ghi Nhận Thanh Toán Nhanh
                    </DialogTitle>
                    <DialogDescription>
                        Chọn đơn hàng và nhập thông tin thanh toán
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Order Search */}
                    <div className="relative">
                        <Label htmlFor="order-search" className="text-sm font-medium">
                            Đơn hàng <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-1.5">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                id="order-search"
                                placeholder="Nhập mã đơn hàng hoặc tên khách hàng..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (selectedOrder && e.target.value !== selectedOrder.code) {
                                        setSelectedOrder(null);
                                    }
                                }}
                                onFocus={() => {
                                    if (!selectedOrder && displayOrders.length > 0) {
                                        setShowDropdown(true);
                                    }
                                }}
                                className="pl-10"
                                autoComplete="off"
                            />
                            {isSearching && (
                                <IconLoader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                            )}
                        </div>

                        {/* Dropdown with Highlighted Results */}
                        {showDropdown && displayOrders.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-auto">
                                {/* Header */}
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b sticky top-0">
                                    {searchResults.length > 0
                                        ? `Tìm thấy ${searchResults.length} kết quả`
                                        : 'Đơn hàng gần đây'
                                    }
                                </div>

                                {displayOrders.map((order) => (
                                    <button
                                        key={order.id}
                                        onClick={() => handleSelectOrder(order)}
                                        className="w-full px-3 py-3 text-left hover:bg-emerald-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            {/* Order Code with highlight */}
                                            <div className="font-semibold text-sm text-gray-900">
                                                <HighlightText text={order.code} highlight={searchQuery} />
                                            </div>
                                            {/* Customer Name with highlight */}
                                            <div className="text-sm text-gray-600 truncate">
                                                <HighlightText text={order.customer_name} highlight={searchQuery} />
                                            </div>
                                            {/* Event Date */}
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                📅 {formatDate(order.event_date)}
                                            </div>
                                        </div>
                                        <div className="text-right ml-3 flex-shrink-0">
                                            <div className="text-sm font-bold text-emerald-600">
                                                {formatCurrency(order.balance_amount)}đ
                                            </div>
                                            <div className="text-xs text-gray-400">còn nợ</div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </button>
                                ))}

                                {/* No results message */}
                                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                        Không tìm thấy đơn hàng phù hợp với "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Selected Order Info */}
                    {selectedOrder && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium">{selectedOrder.code}</div>
                                    <div className="text-sm text-gray-500">{selectedOrder.customer_name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm">
                                        Tổng: <span className="font-medium">{formatCurrency(selectedOrder.final_amount)}đ</span>
                                    </div>
                                    <div className="text-sm text-emerald-600">
                                        Còn nợ: <span className="font-medium">{formatCurrency(selectedOrder.balance_amount)}đ</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div>
                        <Label htmlFor="amount" className="text-sm font-medium">
                            Số tiền <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative mt-1.5">
                            <Input
                                id="amount"
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

                    {/* Payment Method */}
                    <div>
                        <Label className="text-sm font-medium">Hình thức thanh toán</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                            {PAYMENT_METHODS.map((method) => (
                                <button
                                    key={method.value}
                                    type="button"
                                    onClick={() => setPaymentMethod(method.value)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all cursor-pointer",
                                        paymentMethod === method.value
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                                    )}
                                >
                                    {method.icon}
                                    <span className="text-xs font-medium">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <Label htmlFor="note" className="text-sm font-medium">
                            Ghi chú <span className="text-gray-400">(tùy chọn)</span>
                        </Label>
                        <Input
                            id="note"
                            placeholder="Ví dụ: Thu tiền tại event"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="mt-1.5"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !selectedOrder || !amount}
                        className="bg-emerald-500 hover:bg-emerald-600"
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
