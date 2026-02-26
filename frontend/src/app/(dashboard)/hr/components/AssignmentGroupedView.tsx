'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from '@/components/ui/tooltip';
import {
 Collapsible,
 CollapsibleContent,
 CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
 IconChevronDown,
 IconChevronRight,
 IconMapPin,
 IconCalendar,
 IconClock,
 IconUsers,
 IconUserPlus,
 IconCheck,
 IconEdit,
 IconTrash,
 IconSearch,
 IconRefresh,
 IconPackage,
} from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

// Types
interface Assignment {
 id: string;
 tenant_id: string;
 event_id: string | null;
 employee_id: string | null;
 employee_name: string | null;
 employee_phone: string | null;
 employee_role_type: string | null;
 role: string | null;
 start_time: string | null;
 end_time: string | null;
 status: string;
 check_in_time: string | null;
 check_out_time: string | null;
 notes: string | null;
 order_code: string | null;
 order_customer_name: string | null;
 created_at: string;
 updated_at: string;
}

interface OrderInfo {
 id: string | null;
 code: string | null;
 customer_name: string | null;
 event_date: string | null;
 event_time: string | null;
 event_address: string | null;
 status: string | null;
}

interface GroupStats {
 total: number;
 assigned: number;
 confirmed: number;
 checked_in: number;
 completed: number;
 cancelled: number;
}

interface AssignmentGroup {
 order: OrderInfo;
 assignments: Assignment[];
 stats: GroupStats;
}

interface GroupedResponse {
 groups: AssignmentGroup[];
 total_groups: number;
 total_assignments: number;
}

interface AssignmentGroupedViewProps {
 onEdit: (assignment: Assignment) => void;
 onDelete: (assignment: Assignment) => void;
 onBatchCreate: (eventId?: string) => void;
 onSingleCreate: () => void;
 searchQuery: string;
 selectedStatus: string;
}

// Helper functions
function getStatusBadge(status: string) {
 const map: Record<string, { label: string; className: string }> = {
 'ASSIGNED': { label: 'Đã phân công', className: 'bg-blue-50 text-blue-700 border-blue-200' },
 'CONFIRMED': { label: 'Đã xác nhận', className: 'bg-green-50 text-green-700 border-green-200' },
 'CHECKED_IN': { label: 'Đã check-in', className: 'bg-accent-50 text-accent-strong border-accent-subtle' },
 'COMPLETED': { label: 'Hoàn thành', className: 'bg-gray-100 text-gray-600 border-gray-200' },
 'CANCELLED': { label: 'Đã hủy', className: 'bg-red-50 text-red-600 border-red-200' },
 };
 const config = map[status] || { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
 return <Badge variant="outline" className={`text-[11px] font-medium ${config.className}`}>{config.label}</Badge>;
}

function getRoleLabel(role: string | null): string {
 const map: Record<string, string> = {
 'CHEF': 'Đầu bếp', 'WAITER': 'Phục vụ', 'DRIVER': 'Tài xế',
 'LEAD': 'Trưởng nhóm', 'SERVER': 'Phục vụ', 'KITCHEN': 'Bếp',
 'HELPER': 'Phụ bếp', 'SETUP': 'Setup',
 };
 return map[role || ''] || role || 'Chưa rõ';
}

function formatDateTime(isoString: string | null): string {
 if (!isoString) return '--';
 try {
 return format(parseISO(isoString), 'dd/MM HH:mm');
 } catch {
 return '--';
 }
}

function formatEventDate(isoString: string | null, eventTime: string | null): string {
 if (!isoString) return '--';
 try {
 const d = parseISO(isoString);
 const dayName = format(d, 'EEEE', { locale: vi });
 const dateStr = format(d, 'dd/MM/yyyy');
 const timeStr = eventTime ? ` ${eventTime}` : '';
 return `${dayName}, ${dateStr}${timeStr}`;
 } catch {
 return '--';
 }
}

// Group Progress Bar
function GroupProgressBar({ stats }: { stats: GroupStats }) {
 const active = stats.total - stats.cancelled;
 if (active === 0) return null;

 const confirmedPct = ((stats.confirmed + stats.checked_in + stats.completed) / active) * 100;

 return (
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-300"
 style={{ width: `${confirmedPct}%` }}
 />
 </div>
 <span className="text-[10px] text-gray-500 tabular-nums whitespace-nowrap">
 {stats.confirmed + stats.checked_in + stats.completed}/{active}
 </span>
 </div>
 );
}


export default function AssignmentGroupedView({
 onEdit,
 onDelete,
 onBatchCreate,
 onSingleCreate,
 searchQuery,
 selectedStatus,
}: AssignmentGroupedViewProps) {
 const queryClient = useQueryClient();
 const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

 // Fetch grouped assignments
 const { data: grouped, isLoading } = useQuery({
 queryKey: ['hr-assignments-grouped', selectedStatus, searchQuery],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (selectedStatus !== 'all') params.append('status', selectedStatus);
 if (searchQuery.trim()) params.append('search', searchQuery.trim());
 const qs = params.toString() ? `?${params.toString()}` : '';
 return api.get<GroupedResponse>(`/hr/assignments/grouped${qs}`);
 },
 });

 // Update status mutation
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

 // Toggle group expand
 const toggleGroup = (key: string) => {
 setExpandedGroups((prev) => {
 const next = new Set(prev);
 if (next.has(key)) next.delete(key);
 else next.add(key);
 return next;
 });
 };

 // Auto-expand all initially
 const groups = grouped?.groups || [];

 if (isLoading) {
 return (
 <div className="p-4 space-y-3">
 {[1, 2, 3].map((i) => (
 <Skeleton key={i} className="h-24 w-full rounded-lg" />
 ))}
 </div>
 );
 }

 if (!groups.length) {
 return (
 <div className="text-center py-16">
 <IconPackage className="mx-auto h-12 w-12 text-gray-300" />
 <p className="mt-4 text-gray-500">Chưa có phân công nào</p>
 <Button variant="outline" className="mt-4" onClick={onSingleCreate}>
 <IconUserPlus className="mr-2 h-4 w-4" />
 Tạo phân công đầu tiên
 </Button>
 </div>
 );
 }

 return (
 <div className="divide-y">
 {groups.map((group) => {
 const key = group.order.id || 'no-order';
 const isExpanded = expandedGroups.has(key) || expandedGroups.has('all');
 const hasOrder = !!group.order.code;

 return (
 <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleGroup(key)}>
 {/* Group Header */}
 <CollapsibleTrigger asChild>
 <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors group">
 {/* Expand/Collapse Icon */}
 <div className="text-gray-400">
 {isExpanded ? (
 <IconChevronDown className="h-4 w-4" />
 ) : (
 <IconChevronRight className="h-4 w-4" />
 )}
 </div>

 {/* Order Avatar */}
 <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${hasOrder ? 'bg-accent-gradient-br' : 'bg-gray-200 text-gray-500'}`}>
 <IconPackage className="h-4 w-4" />
 </div>

 {/* Order Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-sm text-gray-900 truncate">
 {hasOrder ? group.order.code : 'Chưa gắn đơn hàng'}
 </span>
 {hasOrder && (
 <span className="text-xs text-gray-500 truncate">
 · {group.order.customer_name || '--'}
 </span>
 )}
 </div>
 <div className="flex items-center gap-3 mt-0.5">
 {group.order.event_date && (
 <div className="flex items-center gap-1 text-[11px] text-gray-500">
 <IconCalendar className="h-3 w-3" />
 {formatEventDate(group.order.event_date, group.order.event_time)}
 </div>
 )}
 {group.order.event_address && (
 <div className="flex items-center gap-1 text-[11px] text-gray-500 hidden md:flex">
 <IconMapPin className="h-3 w-3" />
 <span className="truncate max-w-[200px]">{group.order.event_address}</span>
 </div>
 )}
 </div>
 </div>

 {/* Stats */}
 <div className="flex items-center gap-2 shrink-0 hidden sm:flex">
 <div className="w-32">
 <GroupProgressBar stats={group.stats} />
 </div>
 <div className="flex items-center gap-1 text-xs text-gray-500">
 <IconUsers className="h-3.5 w-3.5" />
 <span className="tabular-nums">{group.stats.total}</span>
 </div>
 </div>

 {/* Quick Add Button (only on hover) */}
 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 text-accent-primary"
 onClick={(e) => {
 e.stopPropagation();
 onBatchCreate(group.order.id || undefined);
 }}
 >
 <IconUserPlus className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Thêm nhân viên</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 </div>
 </CollapsibleTrigger>

 {/* Group Content — Assignment Rows */}
 <CollapsibleContent>
 <div className="border-t bg-gray-50/30">
 {group.assignments.map((assignment) => (
 <div
 key={assignment.id}
 className="relative flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-white transition-colors group/row border-b border-gray-100 last:border-b-0"
 >
 {/* Employee Avatar */}
 <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-white text-xs font-medium shrink-0">
 {assignment.employee_name?.charAt(0) || 'N'}
 </div>

 {/* Employee Info */}
 <div className="w-36 shrink-0">
 <span className="text-sm font-medium text-gray-900 truncate block">
 {assignment.employee_name || 'N/A'}
 </span>
 <span className="text-[11px] text-gray-500">
 {getRoleLabel(assignment.role || assignment.employee_role_type)}
 </span>
 </div>

 {/* Time Range */}
 <div className="hidden lg:flex items-center gap-1 text-[11px] text-gray-500 w-28 shrink-0">
 <IconClock className="h-3 w-3" />
 <span>{formatDateTime(assignment.start_time)} - {formatDateTime(assignment.end_time)}</span>
 </div>

 {/* Status */}
 <div className="flex-1 flex justify-end">
 {getStatusBadge(assignment.status)}
 </div>

 {/* Hover Actions */}
 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pl-6 opacity-0 group-hover/row:opacity-100 transition-opacity bg-gradient-to-l from-gray-50 via-gray-50 to-transparent hidden md:flex">
 {assignment.status === 'ASSIGNED' && (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 bg-white/80 hover:bg-white text-green-600"
 onClick={(e) => {
 e.stopPropagation();
 updateStatusMutation.mutate({ id: assignment.id, status: 'CONFIRMED' });
 }}
 title="Xác nhận"
 >
 <IconCheck className="h-3.5 w-3.5" />
 </Button>
 )}
 {assignment.status !== 'CANCELLED' && assignment.status !== 'COMPLETED' && (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 bg-white/80 hover:bg-white text-blue-600"
 onClick={(e) => {
 e.stopPropagation();
 onEdit(assignment);
 }}
 title="Sửa"
 >
 <IconEdit className="h-3.5 w-3.5" />
 </Button>
 )}
 {assignment.status !== 'CANCELLED' && assignment.status !== 'COMPLETED' && (
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6 bg-white/80 hover:bg-white text-red-500"
 onClick={(e) => {
 e.stopPropagation();
 onDelete(assignment);
 }}
 title="Hủy"
 >
 <IconTrash className="h-3.5 w-3.5" />
 </Button>
 )}
 </div>
 </div>
 ))}

 {/* Add Employee Row */}
 {hasOrder && (
 <div className="pl-12 pr-4 py-2">
 <Button
 variant="ghost"
 size="sm"
 className="text-xs text-accent-primary hover:text-accent-strong hover:bg-accent-50 h-7"
 onClick={() => onBatchCreate(group.order.id || undefined)}
 >
 <IconUserPlus className="mr-1.5 h-3.5 w-3.5" />
 Thêm nhân viên
 </Button>
 </div>
 )}
 </div>
 </CollapsibleContent>
 </Collapsible>
 );
 })}
 </div>
 );
}
