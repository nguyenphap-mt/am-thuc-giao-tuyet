'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 IconUserPlus,
 IconClock,
 IconUsers,
 IconEdit,
 IconTrash,
 IconMapPin,
 IconCheck,
 IconPackage,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Use Record type for max compatibility with parent Assignment type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Assignment = Record<string, any>;

interface AssignmentListViewProps {
 assignments: Assignment[];
 selectedAssignment: Assignment | null;
 onEdit: (assignment: Assignment) => void;
 onDelete: (assignment: Assignment) => void;
 onCreate: () => void;
}

// Helpers
function getRoleLabel(role: string | null): string {
 const map: Record<string, string> = {
 'CHEF': 'Đầu bếp', 'WAITER': 'Phục vụ', 'DRIVER': 'Tài xế',
 'LEAD': 'Trưởng nhóm', 'HELPER': 'Phụ bếp', 'SETUP': 'Setup',
 'SERVER': 'Phục vụ', 'KITCHEN': 'Bếp',
 };
 return map[role || ''] || role || 'Chưa rõ';
}

function formatTimeRange(start: string | null, end: string | null): string {
 const fmt = (s: string | null) => {
 if (!s) return '--';
 try { return format(parseISO(s), 'HH:mm'); } catch { return '--'; }
 };
 return `${fmt(start)} - ${fmt(end)}`;
}

function formatEventDate(start: string | null): string {
 if (!start) return '';
 try {
 return format(parseISO(start), 'EEE, dd/MM', { locale: vi });
 } catch { return ''; }
}

const STATUS_OPTIONS = [
 { value: 'ASSIGNED', label: 'Đã phân công', color: 'text-blue-700 bg-blue-50 border-blue-200' },
 { value: 'CONFIRMED', label: 'Đã xác nhận', color: 'text-green-700 bg-green-50 border-green-200' },
 { value: 'CHECKED_IN', label: 'Đã check-in', color: 'text-accent-strong bg-accent-50 border-accent-subtle' },
 { value: 'COMPLETED', label: 'Hoàn thành', color: 'text-gray-600 bg-gray-100 border-gray-200' },
 { value: 'CANCELLED', label: 'Đã hủy', color: 'text-red-600 bg-red-50 border-red-200' },
];


export default function AssignmentListView({
 assignments,
 selectedAssignment,
 onEdit,
 onDelete,
 onCreate,
}: AssignmentListViewProps) {
 const queryClient = useQueryClient();

 // Inline status update mutation
 const updateStatusMutation = useMutation({
 mutationFn: async ({ id, status }: { id: string; status: string }) => {
 return api.put(`/hr/assignments/${id}`, { status });
 },
 onSuccess: () => {
 toast.success('Cập nhật trạng thái thành công');
 queryClient.invalidateQueries({ queryKey: ['hr-assignments'] });
 queryClient.invalidateQueries({ queryKey: ['hr-assignments-grouped'] });
 },
 });

 if (!assignments || assignments.length === 0) {
 return (
 <div className="text-center py-16">
 <IconUsers className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-4 text-gray-500">Chưa có phân công nào</p>
 <Button variant="outline" className="mt-4" onClick={onCreate}>
 <IconUserPlus className="mr-2 h-4 w-4" />
 Tạo phân công đầu tiên
 </Button>
 </div>
 );
 }

 return (
 <div className="divide-y">
 {assignments.map((assignment) => {
 const isSelected = selectedAssignment?.id === assignment.id;
 const currentStatus = STATUS_OPTIONS.find(s => s.value === assignment.status);

 return (
 <div
 key={assignment.id}
 className={`relative flex items-start gap-3 px-4 py-3 transition-colors group ${isSelected ? 'bg-accent-50' : 'hover:bg-gray-50'
 }`}
 >
 {/* Employee Avatar */}
 <div className="h-10 w-10 rounded-full bg-accent-gradient-br flex items-center justify-center text-white font-medium shrink-0 mt-0.5">
 {assignment.employee_name?.charAt(0) || 'N'}
 </div>

 {/* Main Content */}
 <div className="flex-1 min-w-0">
 {/* Row 1: Name + Role */}
 <div className="flex items-center gap-2">
 <span className="font-semibold text-sm text-gray-900 truncate">
 {assignment.employee_name || 'N/A'}
 </span>
 <Badge variant="outline" className="text-[10px] h-5 shrink-0">
 {getRoleLabel(assignment.role || assignment.employee_role_type)}
 </Badge>
 </div>

 {/* Row 2: Order Info + Location */}
 <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
 {assignment.order_code ? (
 <div className="flex items-center gap-1">
 <IconPackage className="h-3 w-3 text-accent-primary" />
 <span className="font-medium text-accent-strong">{assignment.order_code}</span>
 <span className="text-gray-400">·</span>
 <span className="truncate max-w-[160px]">
 {assignment.order_customer_name || '--'}
 </span>
 </div>
 ) : (
 <span className="text-gray-400">Chưa gắn đơn hàng</span>
 )}
 {assignment.event_address && (
 <div className="flex items-center gap-1 text-xs text-gray-400">
 <IconMapPin className="h-3 w-3 text-orange-400" />
 <span className="truncate max-w-[140px]">{assignment.event_address}</span>
 </div>
 )}
 </div>

 {/* Row 3: Time + Date */}
 <div className="flex items-center gap-3 mt-1">
 <div className="flex items-center gap-1 text-xs text-gray-500">
 <IconClock className="h-3 w-3" />
 <span className="tabular-nums">{formatTimeRange(assignment.start_time, assignment.end_time)}</span>
 </div>
 {assignment.start_time && (
 <span className="text-[11px] text-gray-400">
 {formatEventDate(assignment.start_time)}
 </span>
 )}
 </div>
 </div>

 {/* Inline Status Dropdown */}
 <div className="shrink-0 mt-1">
 <Select
 value={assignment.status}
 onValueChange={(newStatus) => {
 if (newStatus !== assignment.status) {
 updateStatusMutation.mutate({ id: assignment.id, status: newStatus });
 }
 }}
 >
 <SelectTrigger
 className={`h-7 w-[130px] text-[11px] font-medium border ${currentStatus?.color || 'text-gray-600 bg-gray-50 border-gray-200'}`}
 onClick={(e) => e.stopPropagation()}
 >
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {STATUS_OPTIONS.map((opt) => (
 <SelectItem key={opt.value} value={opt.value} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Gmail-style Overlay Actions */}
 <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-6 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex bg-gradient-to-l ${isSelected ? 'from-purple-50/90/90' : 'from-gray-50 via-gray-50'
 } to-transparent`}>
 {assignment.status !== 'CANCELLED' && assignment.status !== 'COMPLETED' && (
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 bg-white/80 hover:bg-white text-blue-600"
 onClick={(e) => { e.stopPropagation(); onEdit(assignment); }}
 title="Sửa phân công"
 >
 <IconEdit className="h-4 w-4" />
 </Button>
 )}
 {assignment.status !== 'CANCELLED' && assignment.status !== 'COMPLETED' && (
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 bg-white/80 hover:bg-white text-red-500"
 onClick={(e) => { e.stopPropagation(); onDelete(assignment); }}
 title="Hủy phân công"
 >
 <IconTrash className="h-4 w-4" />
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 );
}
