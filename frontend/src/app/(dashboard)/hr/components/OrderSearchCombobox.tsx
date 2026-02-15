'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconSearch, IconChevronDown, IconCheck, IconCalendar, IconMapPin, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    order_code: string;
    customer_name: string;
    event_date: string;
    event_time?: string;
    event_location?: string;
    guest_count?: number;
    status: string;
}

interface OrderSearchComboboxProps {
    orders: Order[];
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function OrderSearchCombobox({
    orders,
    value,
    onValueChange,
    placeholder = 'Tìm đơn hàng...',
    className
}: OrderSearchComboboxProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when popover opens
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    // Get selected order
    const selectedOrder = orders.find(o => o.id === value);

    // Filter orders by search query
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;

        const query = searchQuery.toLowerCase().trim();
        return orders.filter(order =>
            order.customer_name?.toLowerCase().includes(query) ||
            order.order_code?.toLowerCase().includes(query) ||
            order.event_location?.toLowerCase().includes(query) ||
            format(parseISO(order.event_date), 'dd/MM/yyyy').includes(query)
        );
    }, [orders, searchQuery]);

    // Sort by event_date ascending
    const sortedOrders = useMemo(() => {
        return [...filteredOrders].sort((a, b) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        );
    }, [filteredOrders]);

    // Group orders by date
    const groupedOrders = useMemo(() => {
        return sortedOrders.reduce((groups, order) => {
            try {
                const dateKey = format(parseISO(order.event_date), 'yyyy-MM-dd');
                if (!groups[dateKey]) {
                    groups[dateKey] = [];
                }
                groups[dateKey].push(order);
            } catch {
                const key = 'unknown';
                if (!groups[key]) groups[key] = [];
                groups[key].push(order);
            }
            return groups;
        }, {} as Record<string, Order[]>);
    }, [sortedOrders]);

    // Get date label
    const getDateLabel = (dateKey: string) => {
        if (dateKey === 'unknown') return 'Chưa xác định';
        try {
            const date = parseISO(dateKey);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
                return `📅 Hôm nay (${format(date, 'dd/MM')})`;
            }
            if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
                return `📅 Ngày mai (${format(date, 'dd/MM')})`;
            }
            return `📅 ${format(date, 'EEEE, dd/MM', { locale: vi })}`;
        } catch {
            return dateKey;
        }
    };

    const formatTime = (order: Order) => {
        return order.event_time ? order.event_time.slice(0, 5) : '--:--';
    };

    const handleSelect = (orderId: string) => {
        onValueChange(orderId);
        setOpen(false);
        setSearchQuery('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onValueChange('');
        setSearchQuery('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between h-auto min-h-[40px] py-2 font-normal",
                        !selectedOrder && "text-muted-foreground",
                        className
                    )}
                >
                    {selectedOrder ? (
                        <div className="flex flex-col items-start gap-0.5 text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-purple-600 font-medium text-xs bg-purple-50 px-1.5 py-0.5 rounded">
                                    {format(parseISO(selectedOrder.event_date), 'dd/MM')} {formatTime(selectedOrder)}
                                </span>
                                <span className="font-medium text-sm">{selectedOrder.order_code}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>{selectedOrder.customer_name}</span>
                                {selectedOrder.event_location && (
                                    <>
                                        <span>•</span>
                                        <span className="truncate max-w-[180px]">{selectedOrder.event_location}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <span className="flex items-center gap-2">
                            <IconSearch className="h-4 w-4" />
                            {placeholder}
                        </span>
                    )}
                    <div className="flex items-center gap-1">
                        {selectedOrder && (
                            <div
                                className="h-5 w-5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 flex items-center justify-center cursor-pointer"
                                onClick={handleClear}
                            >
                                <IconX className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                            </div>
                        )}
                        <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                {/* Search Input */}
                <div className="flex items-center border-b px-3 py-2">
                    <IconSearch className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                    <Input
                        ref={inputRef}
                        placeholder="Tìm theo mã, tên KH, địa điểm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-0 focus-visible:ring-0 px-2 h-8"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setSearchQuery('')}
                        >
                            <IconX className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[350px] overflow-y-auto">
                    {Object.keys(groupedOrders).length === 0 ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            <IconSearch className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm">Không tìm thấy đơn hàng</p>
                            {searchQuery && (
                                <p className="text-xs mt-1">Thử tìm kiếm khác</p>
                            )}
                        </div>
                    ) : (
                        Object.entries(groupedOrders).map(([dateKey, dateOrders]) => (
                            <div key={dateKey}>
                                {/* Date Header */}
                                <div className="sticky top-0 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 flex items-center gap-2 border-b border-purple-100">
                                    <IconCalendar className="h-3.5 w-3.5" />
                                    {getDateLabel(dateKey)}
                                    <span className="text-purple-400 font-normal">({dateOrders.length})</span>
                                </div>

                                {/* Orders in this date group */}
                                {dateOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        onClick={() => handleSelect(order.id)}
                                        className={cn(
                                            "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors",
                                            value === order.id && "bg-purple-50"
                                        )}
                                    >
                                        {/* Check icon */}
                                        <div className="w-5 flex items-center justify-center pt-0.5">
                                            {value === order.id && (
                                                <IconCheck className="h-4 w-4 text-purple-600" />
                                            )}
                                        </div>

                                        {/* Order info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-600 font-medium text-xs bg-purple-100 px-1.5 py-0.5 rounded">
                                                    {formatTime(order)}
                                                </span>
                                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                                    {order.order_code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                <span className="font-medium">{order.customer_name}</span>
                                                {order.event_location && (
                                                    <div className="flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
                                                        <IconMapPin className="h-3 w-3" />
                                                        <span className="truncate max-w-[180px]">{order.event_location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer with count */}
                <div className="border-t px-3 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span>{filteredOrders.length} đơn hàng</span>
                    <span className="text-gray-400 dark:text-gray-500">↑↓ để chọn, Enter để xác nhận</span>
                </div>
            </PopoverContent>
        </Popover>
    );
}
