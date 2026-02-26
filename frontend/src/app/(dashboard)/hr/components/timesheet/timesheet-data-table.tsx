'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
    IconClock,
    IconPlus,
    IconCheck,
    IconX,
    IconPencil,
    IconLogin,
    IconLogout,
    IconClipboard,
    IconMapPin,
    IconAlertCircle,
} from '@tabler/icons-react';
import { formatTime, formatDate } from './use-timesheet-queries';
import type { TimesheetResponse } from './timesheet-types';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface TimesheetDataTableProps {
    timesheets: TimesheetResponse[] | undefined;
    isLoading: boolean;
    isMultiDay: boolean;
    selectedIds: Set<string>;
    editingTimesheet: string | null;
    editField: 'start' | 'end' | null;
    editValue: string;
    isEditingSaving: boolean;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onRowClick: (ts: TimesheetResponse) => void;
    onStartTimeEdit: (timesheetId: string, field: 'start' | 'end', currentValue: string | null) => void;
    onSaveTimeEdit: (ts: TimesheetResponse) => void;
    onCancelTimeEdit: () => void;
    onEditValueChange: (value: string) => void;
    onCheckIn: (timesheetId: string) => void;
    onCheckOut: (timesheetId: string) => void;
    onApprove: (timesheetId: string) => void;
    onReject: (timesheetId: string) => void;
    onCreate: () => void;
    isCheckInPending: boolean;
    isCheckOutPending: boolean;
    isApprovePending: boolean;
    isRejectPending: boolean;
}

// Status badge helper
function getStatusBadge(status: string) {
    switch (status) {
        case 'APPROVED':
            return (
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium">
                    Đã duyệt
                </Badge>
            );
        case 'REJECTED':
            return (
                <Badge className="bg-red-100 text-red-700 border-0 text-xs font-medium">
                    Từ chối
                </Badge>
            );
        default:
            return (
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-medium">
                    Chờ duyệt
                </Badge>
            );
    }
}

function getSourceBadge(source: string | null) {
    if (source === 'AUTO_ORDER') {
        return (
            <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50/50 text-xs">
                Đơn hàng
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">
            Thủ công
        </Badge>
    );
}

// Detect late check-in: actual_start > scheduled_start + 15min
function isLateCheckIn(ts: TimesheetResponse): boolean {
    if (!ts.actual_start || !ts.scheduled_start) return false;
    const actual = new Date(ts.actual_start).getTime();
    const scheduled = new Date(ts.scheduled_start).getTime();
    const LATE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    return actual > scheduled + LATE_THRESHOLD_MS;
}

function getLateMinutes(ts: TimesheetResponse): number {
    if (!ts.actual_start || !ts.scheduled_start) return 0;
    const actual = new Date(ts.actual_start).getTime();
    const scheduled = new Date(ts.scheduled_start).getTime();
    return Math.round((actual - scheduled) / 60000);
}

// Time display with edit indicator
function formatTimeDisplay(ts: TimesheetResponse, field: 'start' | 'end') {
    const value = field === 'start' ? ts.actual_start : ts.actual_end;
    const original = field === 'start' ? ts.original_start : ts.original_end;

    if (!value) return { displayTime: '--:--', isEdited: false, original: null };

    const date = new Date(value);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const displayTime = `${hours}:${minutes}`;
    const isEdited = !!(original && value !== original);

    return { displayTime, isEdited, original };
}

export function TimesheetDataTable({
    timesheets,
    isLoading,
    isMultiDay,
    selectedIds,
    editingTimesheet,
    editField,
    editValue,
    isEditingSaving,
    onToggleSelect,
    onToggleSelectAll,
    onRowClick,
    onStartTimeEdit,
    onSaveTimeEdit,
    onCancelTimeEdit,
    onEditValueChange,
    onCheckIn,
    onCheckOut,
    onApprove,
    onReject,
    onCreate,
    isCheckInPending,
    isCheckOutPending,
    isApprovePending,
    isRejectPending,
}: TimesheetDataTableProps) {
    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-10" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    // Empty state
    if (!timesheets || timesheets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="relative mb-4">
                    <div className="h-16 w-16 rounded-2xl bg-accent-100 flex items-center justify-center">
                        <IconClock className="h-8 w-8 text-accent-muted" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-accent-gradient-br flex items-center justify-center">
                        <IconPlus className="h-3.5 w-3.5 text-white" />
                    </div>
                </div>
                <p className="text-base font-medium text-gray-700 mb-1">Chưa có dữ liệu chấm công</p>
                <p className="text-sm text-gray-400 mb-4 text-center max-w-xs">
                    Chọn khoảng ngày khác hoặc tạo chấm công mới cho nhân viên
                </p>
                <PermissionGate module="hr" action="create">
                    <Button
                        onClick={onCreate}
                        className="bg-accent-gradient"
                    >
                        <IconPlus className="mr-2 h-4 w-4" />
                        Tạo chấm công
                    </Button>
                </PermissionGate>
            </div>
        );
    }

    // Summary row for multi-day view
    const summaryRow = isMultiDay ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 px-4 py-2.5 bg-accent-50/80 to-pink-50/80 border-b">
            <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Bản ghi</p>
                <p className="font-bold text-sm">{timesheets.length}</p>
            </div>
            <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tổng giờ</p>
                <p className="font-bold text-sm">
                    {timesheets.reduce((sum, ts) => sum + ts.total_hours, 0).toFixed(1)}h
                </p>
            </div>
            <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Giờ OT</p>
                <p className="font-bold text-sm text-accent-primary">
                    {timesheets.reduce((sum, ts) => sum + ts.overtime_hours, 0).toFixed(1)}h
                </p>
            </div>
            <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Chờ duyệt</p>
                <p className="font-bold text-sm text-amber-600">
                    {timesheets.filter((ts) => ts.status === 'PENDING').length}
                </p>
            </div>
            <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Đã duyệt</p>
                <p className="font-bold text-sm text-emerald-600">
                    {timesheets.filter((ts) => ts.status === 'APPROVED').length}
                </p>
            </div>
        </div>
    ) : null;

    const pendingTimesheets = timesheets.filter((ts) => ts.status === 'PENDING' && ts.actual_end);
    const allPendingSelected =
        pendingTimesheets.length > 0 && selectedIds.size === pendingTimesheets.length;

    return (
        <div>
            {summaryRow}

            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50/80 border-b text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="w-5">
                    {pendingTimesheets.length > 0 && (
                        <Checkbox
                            checked={allPendingSelected}
                            onCheckedChange={onToggleSelectAll}
                            className="h-4 w-4"
                        />
                    )}
                </div>
                <div className="w-10" /> {/* Avatar */}
                <div className="flex-1 min-w-0">Nhân viên</div>
                {isMultiDay && <div className="w-20 text-center">Ngày</div>}
                <div className="w-[70px] text-center">Vào</div>
                <div className="w-[70px] text-center">Ra</div>
                <div className="w-14 text-center">Giờ</div>
                <div className="w-20">Trạng thái</div>
                <div className="w-20">Nguồn</div>
                <div className="w-[100px]" /> {/* Actions */}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100">
                {timesheets.map((ts, index) => (
                    <div
                        key={ts.id}
                        className={`group flex items-center gap-4 px-4 py-2.5 cursor-pointer transition-colors hover:bg-blue-50/50 ${index % 2 === 1 ? 'bg-gray-50/30' : ''
                            } ${ts.overtime_hours > 0 ? 'border-l-2 border-l-amber-400 bg-amber-50/20' : ''
                            } ${isLateCheckIn(ts) ? 'border-l-2 border-l-red-400 bg-red-50/10' : ''
                            }`}
                        onClick={() => onRowClick(ts)}
                    >
                        {/* Checkbox */}
                        <div className="w-5" onClick={(e) => e.stopPropagation()}>
                            {ts.status === 'PENDING' && ts.actual_end ? (
                                <Checkbox
                                    checked={selectedIds.has(ts.id)}
                                    onCheckedChange={() => onToggleSelect(ts.id)}
                                    className="h-4 w-4"
                                />
                            ) : (
                                <div className="w-4" />
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="h-9 w-9 rounded-full bg-accent-gradient-br flex items-center justify-center text-white font-medium text-sm shrink-0">
                            {ts.employee_name?.charAt(0) || 'N'}
                        </div>

                        {/* Employee info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                    {ts.employee_name || 'Unknown'}
                                </p>
                                {isLateCheckIn(ts) && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold shrink-0" title={`Trễ ${getLateMinutes(ts)} phút`}>
                                        <IconAlertCircle className="h-2.5 w-2.5" />
                                        Trễ {getLateMinutes(ts)}p
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{ts.employee_role || '--'}</span>
                                {ts.order_id && ts.order_code && (
                                    <span className="flex items-center gap-0.5 text-xs text-accent-primary font-medium">
                                        <IconClipboard className="h-3 w-3" />
                                        {ts.order_code}
                                        {ts.event_location && (
                                            <span className="flex items-center gap-0.5 text-gray-400 font-normal ml-1">
                                                <IconMapPin className="h-3 w-3" />
                                                <span className="truncate max-w-[100px]">{ts.event_location}</span>
                                            </span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Date column (multi-day only) */}
                        {isMultiDay && (
                            <div className="w-20 text-center text-xs text-gray-500">
                                {formatDate(ts.work_date)}
                                {/* GAP-P5: Weekend badge */}
                                {(() => {
                                    const d = new Date(ts.work_date);
                                    const day = d.getDay();
                                    if (day === 0) return <span className="ml-1 inline-block px-1 py-0.5 text-[9px] font-bold bg-red-100 text-red-600 rounded">CN</span>;
                                    if (day === 6) return <span className="ml-1 inline-block px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-600 rounded">T7</span>;
                                    return null;
                                })()}
                            </div>
                        )}

                        {/* Check-in time */}
                        <div className="w-[70px] text-center" onClick={(e) => e.stopPropagation()}>
                            {editingTimesheet === ts.id && editField === 'start' ? (
                                <div className="flex items-center gap-0.5">
                                    <input
                                        type="time"
                                        value={editValue}
                                        onChange={(e) => onEditValueChange(e.target.value)}
                                        className="w-[68px] px-1 py-0.5 text-xs border rounded focus:ring-2 focus:ring-accent focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => onSaveTimeEdit(ts)}
                                        disabled={isEditingSaving}
                                        className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                        <IconCheck className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={onCancelTimeEdit}
                                        className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                    >
                                        <IconX className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-0.5">
                                    {(() => {
                                        const info = formatTimeDisplay(ts, 'start');
                                        return (
                                            <>
                                                <span
                                                    className={`text-sm font-medium tabular-nums ${ts.actual_start ? 'text-emerald-600' : 'text-gray-300'
                                                        }`}
                                                >
                                                    {info.displayTime}
                                                </span>
                                                {info.isEdited && (
                                                    <span
                                                        className="text-xs text-blue-500 cursor-help"
                                                        title={`Gốc: ${formatTime(info.original as string)}`}
                                                    >
                                                        🔄
                                                    </span>
                                                )}
                                                {ts.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => onStartTimeEdit(ts.id, 'start', ts.actual_start)}
                                                        className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-accent-primary transition-opacity"
                                                        title="Chỉnh sửa giờ vào"
                                                    >
                                                        <IconPencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Check-out time */}
                        <div className="w-[70px] text-center" onClick={(e) => e.stopPropagation()}>
                            {editingTimesheet === ts.id && editField === 'end' ? (
                                <div className="flex items-center gap-0.5">
                                    <input
                                        type="time"
                                        value={editValue}
                                        onChange={(e) => onEditValueChange(e.target.value)}
                                        className="w-[68px] px-1 py-0.5 text-xs border rounded focus:ring-2 focus:ring-accent focus:outline-none"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => onSaveTimeEdit(ts)}
                                        disabled={isEditingSaving}
                                        className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                        <IconCheck className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={onCancelTimeEdit}
                                        className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"
                                    >
                                        <IconX className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-0.5">
                                    {(() => {
                                        const info = formatTimeDisplay(ts, 'end');
                                        return (
                                            <>
                                                <span
                                                    className={`text-sm font-medium tabular-nums ${ts.actual_end ? 'text-emerald-600' : 'text-gray-300'
                                                        }`}
                                                >
                                                    {info.displayTime}
                                                </span>
                                                {info.isEdited && (
                                                    <span
                                                        className="text-xs text-blue-500 cursor-help"
                                                        title={`Gốc: ${formatTime(info.original as string)}`}
                                                    >
                                                        🔄
                                                    </span>
                                                )}
                                                {ts.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => onStartTimeEdit(ts.id, 'end', ts.actual_end)}
                                                        className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-accent-primary transition-opacity"
                                                        title="Chỉnh sửa giờ ra"
                                                    >
                                                        <IconPencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Hours */}
                        <div className="w-14 text-center">
                            <p className="text-sm font-bold tabular-nums">{ts.total_hours.toFixed(1)}h</p>
                            {ts.overtime_hours > 0 && (
                                <p className="text-[10px] text-accent-primary font-medium">
                                    +{ts.overtime_hours.toFixed(1)} OT
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div className="w-20">{getStatusBadge(ts.status)}</div>

                        {/* Source */}
                        <div className="w-20">{getSourceBadge(ts.source)}</div>

                        {/* Actions (Gmail-style: visible on hover) */}
                        <div
                            className="w-[100px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {!ts.actual_start && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onCheckIn(ts.id)}
                                    disabled={isCheckInPending}
                                    className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-xs"
                                >
                                    <IconLogin className="h-3.5 w-3.5 mr-0.5" />
                                    Vào
                                </Button>
                            )}
                            {ts.actual_start && !ts.actual_end && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onCheckOut(ts.id)}
                                    disabled={isCheckOutPending}
                                    className="h-7 px-2 text-orange-600 hover:bg-orange-50 text-xs"
                                >
                                    <IconLogout className="h-3.5 w-3.5 mr-0.5" />
                                    Ra
                                </Button>
                            )}
                            {ts.status === 'PENDING' && ts.actual_end && (
                                <PermissionGate module="hr" action="approve">
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onApprove(ts.id)}
                                            disabled={isApprovePending}
                                            className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs"
                                        >
                                            <IconCheck className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onReject(ts.id)}
                                            disabled={isRejectPending}
                                            className="h-7 px-2 text-red-600 hover:bg-red-50 text-xs"
                                        >
                                            <IconX className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                </PermissionGate>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
