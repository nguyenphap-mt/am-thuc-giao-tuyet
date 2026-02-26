'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from '@/components/ui/popover';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
 IconCalendar,
 IconRefresh,
 IconChecks,
 IconX,
 IconPlus,
 IconSearch,
 IconDownload,
 IconFileSpreadsheet,
 IconFileText,
 IconLoader2,
 IconFileTypePdf,
} from '@tabler/icons-react';
import type { QuickFilter, StatusFilter } from './timesheet-types';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface TimesheetFilterBarProps {
 dateRange: { start: string; end: string };
 quickFilter: QuickFilter;
 statusFilter: StatusFilter;
 selectedCount: number;
 searchQuery: string;
 onQuickFilter: (filter: QuickFilter) => void;
 onCustomRange: (start: string, end: string) => void;
 onStatusFilter: (status: StatusFilter) => void;
 onSearchChange: (query: string) => void;
 onRefresh: () => void;
 onBulkApprove: () => void;
 onBulkReject: () => void;
 onCreate: () => void;
 onExportCsv?: () => void;
 onExportExcel?: () => void;
 onExportPdf?: () => void;
 isBulkPending: boolean;
 hasData: boolean;
}

const quickFilterButtons: { key: QuickFilter; label: string }[] = [
 { key: 'today', label: 'Hôm nay' },
 { key: 'week', label: 'Tuần này' },
 { key: 'month', label: 'Tháng này' },
];

export function TimesheetFilterBar({
 dateRange,
 quickFilter,
 statusFilter,
 selectedCount,
 searchQuery,
 onQuickFilter,
 onCustomRange,
 onStatusFilter,
 onSearchChange,
 onRefresh,
 onBulkApprove,
 onBulkReject,
 onCreate,
 onExportCsv,
 onExportExcel,
 onExportPdf,
 isBulkPending,
 hasData,
}: TimesheetFilterBarProps) {
 const [datePickerOpen, setDatePickerOpen] = useState(false);
 const [customStartDate, setCustomStartDate] = useState(dateRange.start);
 const [customEndDate, setCustomEndDate] = useState(dateRange.end);

 const handleApplyCustomRange = () => {
 if (customStartDate && customEndDate) {
 onCustomRange(customStartDate, customEndDate);
 setDatePickerOpen(false);
 }
 };

 return (
 <div className="space-y-3">
 {/* Row 1: Date Filters + Status + Actions */}
 <div className="flex flex-wrap items-center gap-2">
 {/* Quick date filter pills */}
 <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
 {quickFilterButtons.map((btn) => (
 <button
 key={btn.key}
 onClick={() => onQuickFilter(btn.key)}
 className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${quickFilter === btn.key
 ? 'bg-white text-gray-900 shadow-sm'
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 {btn.label}
 </button>
 ))}

 {/* Custom range */}
 <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
 <PopoverTrigger asChild>
 <button
 className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${quickFilter === 'custom'
 ? 'bg-white text-gray-900 shadow-sm'
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <IconCalendar className="h-3.5 w-3.5" />
 {quickFilter === 'custom'
 ? `${dateRange.start.slice(5)} → ${dateRange.end.slice(5)}`
 : 'Tùy chọn'}
 </button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-4" align="start">
 <div className="space-y-3">
 <p className="text-sm font-medium text-gray-700">Chọn khoảng ngày</p>
 <div className="flex items-center gap-2">
 <Input
 type="date"
 value={customStartDate}
 onChange={(e) => setCustomStartDate(e.target.value)}
 className="h-8 text-sm"
 />
 <span className="text-gray-400">→</span>
 <Input
 type="date"
 value={customEndDate}
 onChange={(e) => setCustomEndDate(e.target.value)}
 className="h-8 text-sm"
 />
 </div>
 <Button size="sm" onClick={handleApplyCustomRange} className="w-full">
 Áp dụng
 </Button>
 </div>
 </PopoverContent>
 </Popover>
 </div>

 {/* Status filter */}
 <Select
 value={statusFilter}
 onValueChange={(v) => onStatusFilter(v as StatusFilter)}
 >
 <SelectTrigger className="w-[130px] h-8 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ALL">Tất cả</SelectItem>
 <SelectItem value="PENDING">Chờ duyệt</SelectItem>
 <SelectItem value="APPROVED">Đã duyệt</SelectItem>
 <SelectItem value="REJECTED">Từ chối</SelectItem>
 </SelectContent>
 </Select>

 {/* Export dropdown */}
 {hasData && (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="outline"
 size="sm"
 className="h-8 text-xs gap-1"
 >
 <IconDownload className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">Xuất</span>
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 <DropdownMenuItem onClick={onExportExcel}>
 <IconFileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
 Excel (.xlsx)
 </DropdownMenuItem>
 <DropdownMenuItem onClick={onExportCsv}>
 <IconFileText className="h-4 w-4 mr-2 text-blue-600" />
 CSV (.csv)
 </DropdownMenuItem>
 <DropdownMenuItem onClick={onExportPdf}>
 <IconFileTypePdf className="h-4 w-4 mr-2 text-red-600" />
 PDF (.pdf)
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 )}

 {/* Refresh */}
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8"
 onClick={onRefresh}
 title="Làm mới"
 >
 <IconRefresh className="h-4 w-4" />
 </Button>

 {/* Spacer */}
 <div className="flex-1" />

 {/* Bulk actions (when items selected) */}
 {selectedCount > 0 && (
 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
 {/* Animated count badge */}
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-100 text-accent-strong text-xs font-semibold animate-in zoom-in-75 duration-150">
 <span className="tabular-nums">{selectedCount}</span>
 <span className="text-accent-primary">đã chọn</span>
 </span>
 <PermissionGate module="hr" action="approve">
 <Button
 size="sm"
 onClick={onBulkApprove}
 disabled={isBulkPending}
 className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs transition-all duration-200"
 >
 {isBulkPending ? (
 <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
 ) : (
 <IconChecks className="h-3.5 w-3.5 mr-1" />
 )}
 Duyệt ({selectedCount})
 </Button>
 </PermissionGate>
 <PermissionGate module="hr" action="approve">
 <Button
 size="sm"
 variant="outline"
 onClick={onBulkReject}
 disabled={isBulkPending}
 className="h-8 border-red-300 text-red-600 hover:bg-red-50 text-xs transition-all duration-200"
 >
 {isBulkPending ? (
 <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
 ) : (
 <IconX className="h-3.5 w-3.5 mr-1" />
 )}
 Từ chối
 </Button>
 </PermissionGate>
 </div>
 )}

 {/* Create button */}
 <PermissionGate module="hr" action="create">
 <Button
 size="sm"
 onClick={onCreate}
 className="h-8 bg-accent-gradient text-xs"
 >
 <IconPlus className="h-3.5 w-3.5 mr-1" />
 <span className="hidden sm:inline">Tạo chấm công</span>
 </Button>
 </PermissionGate>
 </div>

 {/* Row 2: Search */}
 <div className="relative">
 <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
 <Input
 type="text"
 placeholder="Tìm theo tên nhân viên..."
 value={searchQuery}
 onChange={(e) => onSearchChange(e.target.value)}
 className="h-9 pl-9 text-sm bg-gray-50 border-gray-200 focus:bg-white"
 />
 </div>
 </div>
 );
}
