'use client';

import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 IconAlertTriangle,
 IconLoader2,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { OrderSearchCombobox } from './OrderSearchCombobox';

// Types
interface ConflictCheck {
 has_conflict: boolean;
 conflicts: Array<{
 assignment_id: string;
 event_id: string | null;
 start_time: string | null;
 end_time: string | null;
 status: string;
 }>;
}

interface Employee {
 id: string;
 full_name: string;
 role_type: string;
 phone: string | null;
 is_fulltime: boolean;
}

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

interface FormData {
 event_id: string;
 employee_id: string;
 role: string;
 start_time: string;
 end_time: string;
 notes: string;
}

interface AssignmentCreateModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 editMode: boolean;
 editingAssignmentId: string | null;
 formData: FormData;
 setFormData: React.Dispatch<React.SetStateAction<FormData>>;
 conflictWarning: ConflictCheck | null;
 checkConflict: () => void;
 employees: Employee[];
 orders: Order[];
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 createMutation: any;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 updateMutation: any;
 getRoleLabel: (role: string | null) => string;
}

export default function AssignmentCreateModal({
 open,
 onOpenChange,
 editMode,
 editingAssignmentId,
 formData,
 setFormData,
 conflictWarning,
 checkConflict,
 employees,
 orders,
 createMutation,
 updateMutation,
 getRoleLabel,
}: AssignmentCreateModalProps) {
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[500px]">
 <DialogHeader>
 <DialogTitle>{editMode ? 'Sửa phân công' : 'Tạo phân công mới'}</DialogTitle>
 <DialogDescription>
 {editMode ? 'Chỉnh sửa thông tin phân công' : 'Chọn nhân viên và đơn hàng để phân công'}
 </DialogDescription>
 </DialogHeader>

 {/* Conflict Warning */}
 {conflictWarning?.has_conflict && (
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
 <IconAlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
 <div className="w-full">
 <p className="text-sm font-medium text-amber-800">Đã có phân công trùng!</p>
 <p className="text-xs text-amber-700 mt-1">
 Nhân viên đã được phân công {conflictWarning.conflicts.length} ca khác trong thời gian này.
 </p>
 {/* Shift Conflict Visual Timeline */}
 <div className="mt-3 bg-white rounded-md p-2 border border-amber-100">
 <p className="text-[10px] text-gray-500 mb-1.5 font-medium">Timeline ca làm việc (08:00 - 20:00)</p>
 <div className="relative h-6 bg-gray-50 rounded-full overflow-hidden border">
 {/* Hour markers */}
 {[8, 10, 12, 14, 16, 18, 20].map(h => (
 <div key={h} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${((h - 8) / 12) * 100}%` }}>
 <span className="absolute -top-0.5 -translate-x-1/2 text-[8px] text-gray-400">{h}:00</span>
 </div>
 ))}
 {/* Existing shifts (red for conflicts) */}
 {conflictWarning.conflicts.map((c, i) => {
 const cStart = c.start_time ? new Date(c.start_time).getHours() + new Date(c.start_time).getMinutes() / 60 : 8;
 const cEnd = c.end_time ? new Date(c.end_time).getHours() + new Date(c.end_time).getMinutes() / 60 : 20;
 const left = Math.max(0, ((cStart - 8) / 12) * 100);
 const width = Math.min(100 - left, ((cEnd - cStart) / 12) * 100);
 return (
 <div
 key={i}
 className="absolute top-1 h-4 bg-red-400 rounded-sm opacity-80"
 style={{ left: `${left}%`, width: `${width}%` }}
 title={`Ca: ${c.start_time ? format(parseISO(c.start_time), 'HH:mm') : '--'} - ${c.end_time ? format(parseISO(c.end_time), 'HH:mm') : '--'}`}
 />
 );
 })}
 {/* New shift (green) */}
 {formData.start_time && formData.end_time && (() => {
 const newStart = new Date(formData.start_time).getHours() + new Date(formData.start_time).getMinutes() / 60;
 const newEnd = new Date(formData.end_time).getHours() + new Date(formData.end_time).getMinutes() / 60;
 const left = Math.max(0, ((newStart - 8) / 12) * 100);
 const width = Math.min(100 - left, ((newEnd - newStart) / 12) * 100);
 return (
 <div
 className="absolute top-1 h-4 bg-green-400 rounded-sm opacity-60 border-2 border-green-600 border-dashed"
 style={{ left: `${left}%`, width: `${width}%` }}
 title="Ca mới (đang tạo)"
 />
 );
 })()}
 </div>
 <div className="flex items-center gap-3 mt-1.5">
 <div className="flex items-center gap-1">
 <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
 <span className="text-[9px] text-gray-500">Ca trùng</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-2.5 h-2.5 rounded-sm bg-green-400 border border-green-600 border-dashed" />
 <span className="text-[9px] text-gray-500">Ca mới</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="grid gap-4 py-4">
 {/* Order Select - Phase 3: Searchable Combobox */}
 <div className="grid gap-2">
 <Label>Đơn hàng / Sự kiện *</Label>
 <OrderSearchCombobox
 orders={orders || []}
 value={formData.event_id}
 onValueChange={(v) => setFormData(prev => ({ ...prev, event_id: v }))}
 placeholder="Tìm đơn hàng..."
 disabled={editMode}
 />
 </div>

 {/* Employee Select - disabled in edit mode */}
 <div className="grid gap-2">
 <Label>Nhân viên *</Label>
 <Select
 value={formData.employee_id}
 onValueChange={(v) => {
 setFormData(prev => ({ ...prev, employee_id: v }));
 }}
 disabled={editMode}
 >
 <SelectTrigger>
 <SelectValue placeholder="Chọn nhân viên..." />
 </SelectTrigger>
 <SelectContent>
 {employees?.map((emp) => (
 <SelectItem key={emp.id} value={emp.id}>
 {emp.full_name} ({getRoleLabel(emp.role_type)})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Role Override */}
 <div className="grid gap-2">
 <Label>Vai trò (tùy chọn)</Label>
 <Select
 value={formData.role}
 onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}
 >
 <SelectTrigger>
 <SelectValue placeholder="Giữ nguyên vai trò mặc định" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="WAITER">Phục vụ</SelectItem>
 <SelectItem value="CHEF">Đầu bếp</SelectItem>
 <SelectItem value="KITCHEN">Nhân viên bếp</SelectItem>
 <SelectItem value="DRIVER">Tài xế</SelectItem>
 <SelectItem value="LEAD">Trưởng nhóm</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Time Range */}
 <div className="grid grid-cols-2 gap-3">
 <div className="grid gap-2">
 <Label>Bắt đầu</Label>
 <Input
 type="datetime-local"
 value={formData.start_time}
 onChange={(e) => {
 setFormData(prev => ({ ...prev, start_time: e.target.value }));
 }}
 onBlur={checkConflict}
 />
 </div>
 <div className="grid gap-2">
 <Label>Kết thúc</Label>
 <Input
 type="datetime-local"
 value={formData.end_time}
 onChange={(e) => {
 setFormData(prev => ({ ...prev, end_time: e.target.value }));
 }}
 onBlur={checkConflict}
 />
 </div>
 </div>

 {/* Notes */}
 <div className="grid gap-2">
 <Label>Ghi chú</Label>
 <Textarea
 placeholder="Ghi chú thêm..."
 value={formData.notes}
 onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
 rows={2}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => onOpenChange(false)}>
 Hủy
 </Button>
 <Button
 onClick={() => {
 if (editMode && editingAssignmentId) {
 updateMutation.mutate({ id: editingAssignmentId, data: formData });
 } else {
 createMutation.mutate(formData);
 }
 }}
 disabled={!formData.event_id || !formData.employee_id || createMutation.isPending || updateMutation.isPending}
 className="bg-accent-gradient"
 >
 {(createMutation.isPending || updateMutation.isPending) && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
 {editMode ? 'Cập nhật' : 'Tạo phân công'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
