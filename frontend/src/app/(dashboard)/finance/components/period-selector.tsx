'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { IconCalendar, IconChevronDown } from '@tabler/icons-react';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DateRange {
    from: Date;
    to: Date;
}

export interface PeriodSelectorProps {
    value?: DateRange;
    onChange?: (range: DateRange) => void;
    className?: string;
}

type PresetKey = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

const PRESETS: { key: PresetKey; label: string; getRange: () => DateRange }[] = [
    {
        key: 'this_month',
        label: 'Tháng này',
        getRange: () => ({
            from: startOfMonth(new Date()),
            to: endOfMonth(new Date()),
        }),
    },
    {
        key: 'last_month',
        label: 'Tháng trước',
        getRange: () => ({
            from: startOfMonth(subMonths(new Date(), 1)),
            to: endOfMonth(subMonths(new Date(), 1)),
        }),
    },
    {
        key: 'this_quarter',
        label: 'Quý này',
        getRange: () => ({
            from: startOfQuarter(new Date()),
            to: endOfQuarter(new Date()),
        }),
    },
    {
        key: 'this_year',
        label: 'Năm nay',
        getRange: () => ({
            from: startOfYear(new Date()),
            to: endOfYear(new Date()),
        }),
    },
];

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
    const [selectedPreset, setSelectedPreset] = useState<PresetKey>('this_month');
    const [customOpen, setCustomOpen] = useState(false);
    const [tempRange, setTempRange] = useState<DateRange | undefined>(value);

    const handlePresetClick = (preset: typeof PRESETS[0]) => {
        setSelectedPreset(preset.key);
        const range = preset.getRange();
        onChange?.(range);
    };

    const handleCustomSelect = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            setTempRange(range);
        }
    };

    const applyCustomRange = () => {
        if (tempRange) {
            setSelectedPreset('custom');
            onChange?.(tempRange);
            setCustomOpen(false);
        }
    };

    const displayRange = value || PRESETS[0].getRange();
    const displayText = selectedPreset === 'custom'
        ? `${format(displayRange.from, 'dd/MM/yyyy')} - ${format(displayRange.to, 'dd/MM/yyyy')}`
        : PRESETS.find(p => p.key === selectedPreset)?.label || 'Chọn kỳ';

    return (
        <div className={cn('flex items-center gap-1 flex-wrap', className)}>
            {/* Preset Buttons */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {PRESETS.map((preset) => (
                    <Button
                        key={preset.key}
                        variant={selectedPreset === preset.key ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                            'h-7 px-2 text-xs font-medium transition-colors duration-200',
                            selectedPreset === preset.key
                                ? 'bg-white shadow-sm text-gray-900 dark:text-gray-100'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-100 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800'
                        )}
                        onClick={() => handlePresetClick(preset)}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            {/* Custom Date Range Picker */}
            <Popover open={customOpen} onOpenChange={setCustomOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={selectedPreset === 'custom' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                            'h-7 gap-1 text-xs',
                            selectedPreset === 'custom' && 'bg-primary text-white'
                        )}
                    >
                        <IconCalendar className="h-3.5 w-3.5" />
                        {selectedPreset === 'custom' ? displayText : 'Tùy chọn'}
                        <IconChevronDown className="h-3 w-3" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b">
                        <p className="text-sm font-medium">Chọn khoảng thời gian</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Từ ngày - đến ngày</p>
                    </div>
                    <Calendar
                        mode="range"
                        selected={tempRange ? { from: tempRange.from, to: tempRange.to } : undefined}
                        onSelect={(range) => handleCustomSelect(range as DateRange | undefined)}
                        numberOfMonths={2}
                        locale={vi}
                        className="p-3"
                    />
                    <div className="flex justify-end gap-2 p-3 border-t bg-gray-50 dark:bg-gray-900">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomOpen(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            size="sm"
                            onClick={applyCustomRange}
                            disabled={!tempRange?.from || !tempRange?.to}
                        >
                            Áp dụng
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Current Range Display */}
            <div className="hidden md:flex items-center text-xs text-gray-500 dark:text-gray-400 ml-2">
                <span className="tabular-nums">
                    {format(displayRange.from, 'dd/MM/yyyy', { locale: vi })} - {format(displayRange.to, 'dd/MM/yyyy', { locale: vi })}
                </span>
            </div>
        </div>
    );
}
