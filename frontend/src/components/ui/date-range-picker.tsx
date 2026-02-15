'use client';

import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
    className?: string;
}

const QUICK_RANGES = [
    { label: 'Hôm nay', getValue: () => ({ from: new Date(), to: new Date() }) },
    { label: '7 ngày', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: '30 ngày', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: 'Tháng này', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false);

    const handleQuickSelect = (getValue: () => { from: Date; to: Date }) => {
        onChange(getValue());
        setOpen(false);
    };

    const formatDateRange = () => {
        if (!value?.from) return 'Chọn khoảng thời gian';
        if (!value.to) return format(value.from, 'dd/MM/yyyy', { locale: vi });
        return `${format(value.from, 'dd/MM', { locale: vi })} - ${format(value.to, 'dd/MM/yyyy', { locale: vi })}`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'justify-start text-left font-normal',
                        !value && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                {/* Quick Ranges */}
                <div className="flex flex-wrap gap-1 p-2 border-b">
                    {QUICK_RANGES.map((range) => (
                        <Button
                            key={range.label}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickSelect(range.getValue)}
                            className="text-xs h-7"
                        >
                            {range.label}
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { onChange(undefined); setOpen(false); }}
                        className="text-xs h-7 text-gray-500"
                    >
                        Xóa
                    </Button>
                </div>
                {/* Calendar */}
                <Calendar
                    mode="range"
                    selected={value}
                    onSelect={onChange}
                    numberOfMonths={2}
                    locale={vi}
                    defaultMonth={value?.from || new Date()}
                />
            </PopoverContent>
        </Popover>
    );
}
