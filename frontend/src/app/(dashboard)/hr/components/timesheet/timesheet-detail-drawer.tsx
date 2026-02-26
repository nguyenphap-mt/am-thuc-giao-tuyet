'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
} from '@/components/ui/sheet';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
 DialogDescription,
} from '@/components/ui/dialog';
import {
 IconClock,
 IconCheck,
 IconPencil,
 IconTrash,
 IconExternalLink,
 IconClipboard,
 IconMapPin,
 IconAlertTriangle,
 IconLoader2,
 IconNotes,
 IconArrowRight,
 IconLock,
 IconLockOpen,
} from '@tabler/icons-react';
import { formatTime, formatDate } from './use-timesheet-queries';
import type { TimesheetResponse } from './timesheet-types';

// Status badge
function getStatusBadge(status: string) {
 switch (status) {
 case 'APPROVED':
 return <Badge className="bg-emerald-100 text-emerald-700 border-0">Đã duyệt</Badge>;
 case 'REJECTED':
 return <Badge className="bg-red-100 text-red-700 border-0">Từ chối</Badge>;
 default:
 return <Badge className="bg-amber-100 text-amber-700 border-0">Chờ duyệt</Badge>;
 }
}

// Helper: ISO datetime string → "HH:mm" string
function isoToTimeStr(iso: string | null | undefined): string {
 if (!iso) return '';
 const d = new Date(iso);
 if (isNaN(d.getTime())) return '';
 return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface TimesheetDetailDrawerProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 timesheet: TimesheetResponse | null;
 onUpdate: (id: string, data: { work_date?: string; notes?: string }) => void;
 onDelete: (id: string) => void;
 onApprove?: (id: string) => void;
 onReject?: (id: string) => void;
 onEditTime?: (id: string, payload: Record<string, string>) => void;
 onUnlock?: (id: string) => void;
 isUpdatePending: boolean;
 isDeletePending: boolean;
 isApprovePending?: boolean;
 isRejectPending?: boolean;
 isTimePending?: boolean;
 isUnlockPending?: boolean;
}

export function TimesheetDetailDrawer({
 open,
 onOpenChange,
 timesheet,
 onUpdate,
 onDelete,
 onApprove,
 onReject,
 onEditTime,
 onUnlock,
 isUpdatePending,
 isDeletePending,
 isApprovePending = false,
 isRejectPending = false,
 isTimePending = false,
 isUnlockPending = false,
}: TimesheetDetailDrawerProps) {
 const [isEditing, setIsEditing] = useState(false);
 const [isEditingTime, setIsEditingTime] = useState(false);
 const [editNotes, setEditNotes] = useState('');
 const [editWorkDate, setEditWorkDate] = useState('');
 const [editStartTime, setEditStartTime] = useState('');
 const [editEndTime, setEditEndTime] = useState('');
 const [editReason, setEditReason] = useState('');
 const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

 // Reset editing state when drawer opens/closes or timesheet changes
 useEffect(() => {
 if (!open) {
 setIsEditing(false);
 setIsEditingTime(false);
 setDeleteConfirmOpen(false);
 setEditReason('');
 }
 }, [open]);

 // Reset editing state when timesheet changes
 const handleOpenChange = (newOpen: boolean) => {
 if (!newOpen) {
 setIsEditing(false);
 setIsEditingTime(false);
 setDeleteConfirmOpen(false);
 setEditReason('');
 }
 onOpenChange(newOpen);
 };

 const handleStartEdit = () => {
 if (!timesheet) return;
 setEditNotes(timesheet.notes || '');
 setEditWorkDate(timesheet.work_date);
 setIsEditing(true);
 };

 const handleSave = () => {
 if (!timesheet) return;
 onUpdate(timesheet.id, {
 work_date: editWorkDate !== timesheet.work_date ? editWorkDate : undefined,
 notes: editNotes !== (timesheet.notes || '') ? editNotes : undefined,
 });
 setIsEditing(false);
 };

 const handleStartTimeEdit = () => {
 if (!timesheet) return;
 setEditStartTime(isoToTimeStr(timesheet.actual_start as any));
 setEditEndTime(isoToTimeStr(timesheet.actual_end as any));
 setEditReason('');
 setIsEditingTime(true);
 };

 const handleSaveTime = () => {
 if (!timesheet || !onEditTime) return;

 // Build ISO datetime from work_date + time string
 const payload: Record<string, string> = {};
 if (editStartTime) {
 payload.actual_start = `${timesheet.work_date}T${editStartTime}:00+07:00`;
 }
 if (editEndTime) {
 payload.actual_end = `${timesheet.work_date}T${editEndTime}:00+07:00`;
 }
 if (editReason.trim()) {
 payload.edit_reason = editReason.trim();
 }
 onEditTime(timesheet.id, payload);
 setIsEditingTime(false);
 };

 const handleUnlock = () => {
 if (!timesheet || !onUnlock) return;
 onUnlock(timesheet.id);
 };

 const handleDelete = () => {
 if (!timesheet) return;
 onDelete(timesheet.id);
 setDeleteConfirmOpen(false);
 handleOpenChange(false);
 };

 if (!timesheet) return null;

 const isPending = timesheet.status === 'PENDING';
 const isApproved = timesheet.status === 'APPROVED';
 const isRejected = timesheet.status === 'REJECTED';
 const canEditTime = isPending && !!onEditTime;
 const canUnlock = isApproved && !!onUnlock;
 const canApprove = isPending && !!onApprove && !!timesheet.actual_end;
 const canReject = isPending && !!onReject && !!timesheet.actual_end;

 return (
 <>
 <Sheet open={open} onOpenChange={handleOpenChange}>
 <SheetContent className="w-[420px] sm:w-[460px] overflow-y-auto">
 <SheetHeader className="pb-4 border-b">
 <SheetTitle className="sr-only">Chi tiết chấm công</SheetTitle>
 {/* Employee header card */}
 <div className="flex items-center gap-3">
 <div className="h-12 w-12 rounded-full bg-accent-gradient-br flex items-center justify-center text-white font-medium text-lg shrink-0">
 {timesheet.employee_name?.charAt(0) || 'N'}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-semibold text-lg truncate">
 {timesheet.employee_name || 'Unknown'}
 </p>
 <p className="text-sm text-gray-500">
 {timesheet.employee_role || '--'}
 </p>
 </div>
 {getStatusBadge(timesheet.status)}
 </div>
 </SheetHeader>

 <div className="mt-5 space-y-5">
 {/* Order Context Card */}
 {timesheet.order_id && timesheet.order_code && (
 <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 space-y-2">
 <div className="flex items-center gap-1.5 text-blue-700 text-sm font-medium">
 <IconClipboard className="h-4 w-4" />
 Đơn hàng
 </div>
 <div className="space-y-1 text-sm">
 <p className="font-medium text-blue-800">{timesheet.order_code}</p>
 {timesheet.customer_name && (
 <p className="text-blue-600">KH: {timesheet.customer_name}</p>
 )}
 {timesheet.event_location && (
 <p className="text-blue-600 flex items-center gap-1">
 <IconMapPin className="h-3 w-3 shrink-0" />
 {timesheet.event_location}
 </p>
 )}
 </div>
 <a
 href={`/orders/${timesheet.order_id}`}
 className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
 >
 <IconExternalLink className="h-3 w-3" />
 Xem đơn hàng
 </a>
 </div>
 )}

 {/* Time Visual Timeline */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
 <IconClock className="h-4 w-4" />
 Thời gian — {formatDate(timesheet.work_date)}
 </div>
 {/* Time edit button */}
 {canEditTime && !isEditingTime && (
 <Button
 variant="ghost"
 size="sm"
 className="h-7 text-xs text-accent-primary hover:text-accent-strong hover:bg-accent-50"
 onClick={handleStartTimeEdit}
 >
 <IconPencil className="h-3.5 w-3.5 mr-1" />
 Sửa giờ
 </Button>
 )}
 {/* Unlock button for approved */}
 {canUnlock && !isEditingTime && (
 <Button
 variant="ghost"
 size="sm"
 className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
 onClick={handleUnlock}
 disabled={isUnlockPending}
 >
 {isUnlockPending ? (
 <IconLoader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
 ) : (
 <IconLockOpen className="h-3.5 w-3.5 mr-1" />
 )}
 Mở khóa
 </Button>
 )}
 </div>

 {/* Time editing form */}
 {isEditingTime ? (
 <div className="rounded-lg border border-accent-subtle bg-accent-50 p-3 space-y-3">
 <p className="text-xs text-accent-primary font-medium">Chỉnh sửa giờ chấm công</p>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs text-gray-500 mb-1 block">Giờ vào</label>
 <Input
 type="time"
 value={editStartTime}
 onChange={(e) => setEditStartTime(e.target.value)}
 className="h-9 text-sm"
 />
 </div>
 <div>
 <label className="text-xs text-gray-500 mb-1 block">Giờ ra</label>
 <Input
 type="time"
 value={editEndTime}
 onChange={(e) => setEditEndTime(e.target.value)}
 className="h-9 text-sm"
 />
 </div>
 </div>
 <div>
 <label className="text-xs text-gray-500 mb-1 block">Lý do chỉnh sửa (tùy chọn)</label>
 <Textarea
 value={editReason}
 onChange={(e) => setEditReason(e.target.value)}
 placeholder="VD: Quên bấm check-in..."
 rows={2}
 className="text-sm"
 />
 </div>
 <div className="flex items-center gap-2">
 <Button
 size="sm"
 onClick={handleSaveTime}
 disabled={isTimePending || (!editStartTime && !editEndTime)}
 className="bg-accent-solid "
 >
 {isTimePending ? (
 <>
 <IconLoader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu...
 </>
 ) : (
 <>
 <IconCheck className="mr-1.5 h-3.5 w-3.5" /> Lưu giờ
 </>
 )}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsEditingTime(false)}
 >
 Hủy
 </Button>
 </div>
 </div>
 ) : (
 /* Normal timeline display */
 <>
 <div className="flex items-center gap-3 px-2">
 {/* Check-in */}
 <div className="text-center">
 <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
 <span className="text-sm font-bold text-emerald-700 tabular-nums">
 {formatTime(timesheet.actual_start)}
 </span>
 </div>
 <p className="text-[10px] text-gray-400 uppercase">Vào</p>
 {timesheet.original_start && timesheet.actual_start !== timesheet.original_start && (
 <p className="text-[10px] text-blue-500" title="Giờ gốc trước khi sửa">
 🔄 Gốc: {formatTime(timesheet.original_start)}
 </p>
 )}
 </div>

 {/* Arrow connector */}
 <div className="flex-1 flex items-center">
 <div className="h-px flex-1 bg-gradient-to-r from-emerald-300 to-orange-300" />
 <IconArrowRight className="h-4 w-4 text-gray-300 mx-1" />
 <div className="h-px flex-1 bg-gradient-to-r from-orange-300 to-orange-400" />
 </div>

 {/* Check-out */}
 <div className="text-center">
 <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center mb-1">
 <span className="text-sm font-bold text-orange-700 tabular-nums">
 {formatTime(timesheet.actual_end)}
 </span>
 </div>
 <p className="text-[10px] text-gray-400 uppercase">Ra</p>
 {timesheet.original_end && timesheet.actual_end !== timesheet.original_end && (
 <p className="text-[10px] text-blue-500" title="Giờ gốc trước khi sửa">
 🔄 Gốc: {formatTime(timesheet.original_end)}
 </p>
 )}
 </div>
 </div>
 </>
 )}

 {/* Hours stats */}
 <div className="grid grid-cols-3 gap-2">
 <div className="rounded-lg bg-gray-50 p-2.5 text-center">
 <p className="text-[10px] text-gray-400 uppercase">Tổng giờ</p>
 <p className="text-lg font-bold tabular-nums">{timesheet.total_hours.toFixed(1)}h</p>
 </div>
 <div className="rounded-lg bg-accent-50 p-2.5 text-center">
 <p className="text-[10px] text-gray-400 uppercase">OT</p>
 <p className="text-lg font-bold text-accent-primary tabular-nums">
 {timesheet.overtime_hours.toFixed(1)}h
 </p>
 </div>
 <div className="rounded-lg bg-gray-50 p-2.5 text-center">
 <p className="text-[10px] text-gray-400 uppercase">Nguồn</p>
 <Badge
 variant="outline"
 className={`mt-0.5 text-xs ${timesheet.source === 'AUTO_ORDER'
 ? 'border-blue-200 text-blue-600 bg-blue-50/50'
 : 'border-gray-200 text-gray-500'
 }`}
 >
 {timesheet.source === 'AUTO_ORDER' ? 'Đơn hàng' : 'Thủ công'}
 </Badge>
 </div>
 </div>

 {/* Edit audit trail */}
 {timesheet.time_edited_at && (
 <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 space-y-0.5">
 <p>✏️ Sửa lúc: {new Date(timesheet.time_edited_at).toLocaleString('vi-VN')}</p>
 {timesheet.edit_reason && <p>Lý do: {timesheet.edit_reason}</p>}
 </div>
 )}
 </div>

 {/* Notes */}
 <div className="space-y-2">
 <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
 <IconNotes className="h-4 w-4" />
 Ghi chú
 </div>
 {isEditing && isPending ? (
 <div className="space-y-2">
 <div>
 <label className="text-xs text-gray-500">Ngày làm việc</label>
 <Input
 type="date"
 value={editWorkDate}
 onChange={(e) => setEditWorkDate(e.target.value)}
 className="mt-1 h-8 text-sm"
 />
 </div>
 <Textarea
 value={editNotes}
 onChange={(e) => setEditNotes(e.target.value)}
 placeholder="Nhập ghi chú..."
 rows={3}
 />
 </div>
 ) : (
 <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
 {timesheet.notes || 'Không có ghi chú'}
 </p>
 )}
 </div>

 {/* Metadata */}
 <div className="text-xs text-gray-400 space-y-0.5 border-t pt-3">
 <p>Tạo: {new Date(timesheet.created_at).toLocaleString('vi-VN')}</p>
 <p>Cập nhật: {new Date(timesheet.updated_at).toLocaleString('vi-VN')}</p>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2 border-t pt-4">
 {isEditing ? (
 <>
 <Button
 onClick={handleSave}
 disabled={isUpdatePending}
 className="bg-accent-gradient"
 >
 {isUpdatePending ? (
 <>
 <IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...
 </>
 ) : (
 <>
 <IconCheck className="mr-2 h-4 w-4" /> Lưu
 </>
 )}
 </Button>
 <Button variant="outline" onClick={() => setIsEditing(false)}>
 Hủy
 </Button>
 </>
 ) : (
 <>
 {isPending && (
 <>
 {canApprove && (
 <Button
 size="sm"
 onClick={() => onApprove!(timesheet.id)}
 disabled={isApprovePending}
 className="bg-emerald-600 hover:bg-emerald-700 text-white"
 >
 {isApprovePending ? (
 <>
 <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> Đang duyệt...
 </>
 ) : (
 <>
 <IconCheck className="h-4 w-4 mr-1" /> Duyệt
 </>
 )}
 </Button>
 )}
 {canReject && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => onReject!(timesheet.id)}
 disabled={isRejectPending}
 className="text-red-600 border-red-200 hover:bg-red-50"
 >
 {isRejectPending ? (
 <>
 <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> Đang từ chối...
 </>
 ) : (
 'Từ chối'
 )}
 </Button>
 )}
 <div className="border-l h-5 mx-1" />
 <Button variant="outline" size="sm" onClick={handleStartEdit}>
 <IconPencil className="h-4 w-4 mr-1" />
 Sửa
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-red-600 border-red-200 hover:bg-red-50"
 onClick={() => setDeleteConfirmOpen(true)}
 >
 <IconTrash className="h-4 w-4 mr-1" />
 Xóa
 </Button>
 </>
 )}
 {isApproved && canUnlock && (
 <Button
 variant="outline"
 size="sm"
 onClick={handleUnlock}
 disabled={isUnlockPending}
 className="text-amber-700 border-amber-300 hover:bg-amber-50"
 >
 {isUnlockPending ? (
 <>
 <IconLoader2 className="h-4 w-4 mr-1 animate-spin" /> Đang mở khóa...
 </>
 ) : (
 <>
 <IconLockOpen className="h-4 w-4 mr-1" /> Mở khóa
 </>
 )}
 </Button>
 )}
 {isApproved && (
 <div className="flex items-center gap-1.5 text-xs text-gray-400">
 <IconLock className="h-3.5 w-3.5" />
 Đã khóa — đã được duyệt
 </div>
 )}
 {isRejected && (
 <Button
 variant="outline"
 size="sm"
 className="text-red-600 border-red-200 hover:bg-red-50"
 onClick={() => setDeleteConfirmOpen(true)}
 >
 <IconTrash className="h-4 w-4 mr-1" />
 Xóa
 </Button>
 )}
 {timesheet.order_id && (
 <a
 href={`/orders/${timesheet.order_id}`}
 className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors ml-auto"
 >
 <IconExternalLink className="h-4 w-4" />
 Tới đơn hàng
 </a>
 )}
 </>
 )}
 </div>
 </div>
 </SheetContent>
 </Sheet>

 {/* Delete Confirmation */}
 <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
 <DialogContent className="sm:max-w-[400px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-red-600">
 <IconAlertTriangle className="h-5 w-5" />
 Xóa bản chấm công
 </DialogTitle>
 <DialogDescription>
 Hành động này không thể hoàn tác.
 </DialogDescription>
 </DialogHeader>
 <div className="bg-red-50 rounded-lg p-3 text-sm space-y-1">
 <p><strong>Nhân viên:</strong> {timesheet.employee_name}</p>
 <p><strong>Ngày:</strong> {formatDate(timesheet.work_date)}</p>
 {timesheet.order_code && (
 <p><strong>Đơn hàng:</strong> {timesheet.order_code}</p>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
 Hủy
 </Button>
 <Button
 variant="destructive"
 onClick={handleDelete}
 disabled={isDeletePending}
 >
 {isDeletePending ? (
 <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...</>
 ) : (
 <><IconTrash className="mr-2 h-4 w-4" /> Xóa</>
 )}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </>
 );
}
