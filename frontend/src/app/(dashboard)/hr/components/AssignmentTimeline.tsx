'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from '@/components/ui/tooltip';
import {
 IconChevronLeft,
 IconChevronRight,
 IconPackage,
 IconClock,
 IconUsers,
} from '@tabler/icons-react';
import { format, parseISO, addDays, subDays, startOfDay, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';

// Types
interface Assignment {
 id: string;
 event_id: string | null;
 employee_id: string | null;
 employee_name: string | null;
 role: string | null;
 employee_role_type: string | null;
 start_time: string | null;
 end_time: string | null;
 status: string;
 order_code: string | null;
 order_customer_name: string | null;
}

interface AssignmentTimelineProps {
 onEdit: (assignment: Assignment) => void;
 searchQuery: string;
 selectedStatus: string;
}

// Constants
const HOUR_START = 6;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

// Status colors
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
 'ASSIGNED': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
 'CONFIRMED': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
 'CHECKED_IN': { bg: 'bg-accent-100', border: 'border-accent-medium', text: 'text-accent-strong' },
 'COMPLETED': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600' },
 'CANCELLED': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-500' },
};

function getRoleLabel(role: string | null): string {
 const map: Record<string, string> = {
 'CHEF': 'Đầu bếp', 'WAITER': 'Phục vụ', 'DRIVER': 'Tài xế',
 'LEAD': 'Trưởng nhóm', 'HELPER': 'Phụ bếp', 'SETUP': 'Setup',
 };
 return map[role || ''] || role || '';
}

function getHourPosition(dateStr: string | null): number {
 if (!dateStr) return 0;
 try {
 const d = parseISO(dateStr);
 const hours = d.getHours() + d.getMinutes() / 60;
 return Math.max(0, Math.min(TOTAL_HOURS, hours - HOUR_START));
 } catch { return 0; }
}


export default function AssignmentTimeline({
 onEdit,
 searchQuery,
 selectedStatus,
}: AssignmentTimelineProps) {
 const [selectedDate, setSelectedDate] = useState(new Date());

 // Fetch assignments for the selected day
 const dateStr = format(selectedDate, 'yyyy-MM-dd');
 const { data: assignments, isLoading } = useQuery({
 queryKey: ['hr-assignments', selectedStatus, searchQuery, dateStr],
 queryFn: async () => {
 const params = new URLSearchParams();
 if (selectedStatus !== 'all') params.append('status', selectedStatus);
 if (searchQuery.trim()) params.append('search', searchQuery.trim());
 params.append('date_from', dateStr);
 params.append('date_to', dateStr);
 const qs = params.toString() ? `?${params.toString()}` : '';
 return api.get<Assignment[]>(`/hr/assignments${qs}`);
 },
 });

 // Group by order
 const grouped = useMemo(() => {
 if (!assignments) return [];
 const map = new Map<string, { orderCode: string; customerName: string; assignments: Assignment[] }>();

 for (const a of assignments) {
 const key = a.event_id || 'no-order';
 if (!map.has(key)) {
 map.set(key, {
 orderCode: a.order_code || 'Chưa gắn đơn',
 customerName: a.order_customer_name || '',
 assignments: [],
 });
 }
 map.get(key)!.assignments.push(a);
 }

 return Array.from(map.values());
 }, [assignments]);

 // Date navigation
 const goNext = () => setSelectedDate(addDays(selectedDate, 1));
 const goPrev = () => setSelectedDate(subDays(selectedDate, 1));
 const goToday = () => setSelectedDate(new Date());

 if (isLoading) {
 return (
 <div className="p-4 space-y-3">
 {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
 </div>
 );
 }

 return (
 <div className="p-4">
 {/* Date Navigation */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
 <IconChevronLeft className="h-4 w-4" />
 </Button>
 <span className="text-sm font-semibold text-gray-900 w-40 text-center">
 {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
 </span>
 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
 <IconChevronRight className="h-4 w-4" />
 </Button>
 {!isToday(selectedDate) && (
 <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToday}>
 Hôm nay
 </Button>
 )}
 </div>
 <div className="flex items-center gap-3 text-xs text-gray-500">
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" />
 Đã phân công
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
 Đã xác nhận
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-sm bg-accent-100 border border-accent-medium" />
 Đã check-in
 </div>
 <div className="flex items-center gap-1">
 <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
 Hoàn thành
 </div>
 </div>
 </div>

 {/* Timeline Grid */}
 <div className="border rounded-lg overflow-hidden">
 {/* Hour Header */}
 <div className="flex border-b bg-gray-50">
 <div className="w-44 shrink-0 border-r px-3 py-2 text-xs font-medium text-gray-500">
 Nhân viên
 </div>
 <div className="flex-1 relative" style={{ minWidth: `${TOTAL_HOURS * 60}px` }}>
 <div className="flex h-full">
 {HOURS.map((h) => (
 <div
 key={h}
 className="flex-1 border-r border-gray-200 text-center py-2"
 style={{ minWidth: '60px' }}
 >
 <span className="text-[10px] text-gray-500 tabular-nums">
 {String(h).padStart(2, '0')}:00
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Content Rows */}
 {grouped.length === 0 ? (
 <div className="text-center py-12 text-sm text-gray-500">
 <IconClock className="mx-auto h-8 w-8 text-gray-300 mb-3" />
 Không có phân công nào trong ngày này
 </div>
 ) : (
 grouped.map((group, gi) => (
 <div key={gi}>
 {/* Group Header */}
 <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/70 border-b text-xs font-medium text-gray-600">
 <IconPackage className="h-3.5 w-3.5 text-accent-primary" />
 <span className="text-accent-strong">{group.orderCode}</span>
 {group.customerName && (
 <span className="text-gray-400">· {group.customerName}</span>
 )}
 <span className="text-gray-400 ml-auto">{group.assignments.length} NV</span>
 </div>

 {/* Employee Rows */}
 {group.assignments.map((assignment) => {
 const startPos = getHourPosition(assignment.start_time);
 const endPos = getHourPosition(assignment.end_time);
 const barWidth = Math.max(endPos - startPos, 0.5);
 const colors = STATUS_COLORS[assignment.status] || STATUS_COLORS['ASSIGNED'];

 return (
 <div key={assignment.id} className="flex border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
 {/* Name Column */}
 <div className="w-44 shrink-0 border-r px-3 py-2 flex items-center gap-2">
 <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-white text-[9px] font-medium shrink-0">
 {assignment.employee_name?.charAt(0) || 'N'}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-medium text-gray-900 truncate">
 {assignment.employee_name || 'N/A'}
 </p>
 <p className="text-[10px] text-gray-500 truncate">
 {getRoleLabel(assignment.role || assignment.employee_role_type)}
 </p>
 </div>
 </div>

 {/* Timeline Bar */}
 <div className="flex-1 relative py-1.5" style={{ minWidth: `${TOTAL_HOURS * 60}px` }}>
 {/* Grid lines */}
 <div className="absolute inset-0 flex">
 {HOURS.map((h) => (
 <div key={h} className="flex-1 border-r border-gray-100" style={{ minWidth: '60px' }} />
 ))}
 </div>

 {/* Assignment Bar */}
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <div
 className={`absolute top-1.5 bottom-1.5 rounded-md border cursor-pointer transition-all hover:shadow-md hover:brightness-95 ${colors.bg} ${colors.border}`}
 style={{
 left: `${(startPos / TOTAL_HOURS) * 100}%`,
 width: `${(barWidth / TOTAL_HOURS) * 100}%`,
 minWidth: '30px',
 }}
 onClick={() => onEdit(assignment)}
 >
 <div className={`px-1.5 py-0.5 text-[10px] font-medium truncate ${colors.text}`}>
 {assignment.employee_name?.split(' ').pop() || ''}
 </div>
 </div>
 </TooltipTrigger>
 <TooltipContent side="top" className="text-xs">
 <div>
 <strong>{assignment.employee_name}</strong>
 <br />
 {assignment.start_time ? format(parseISO(assignment.start_time), 'HH:mm') : '--'}
 {' – '}
 {assignment.end_time ? format(parseISO(assignment.end_time), 'HH:mm') : '--'}
 <br />
 {assignment.order_code || ''}
 </div>
 </TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 </div>
 );
 })}
 </div>
 ))
 )}
 </div>
 </div>
 );
}
