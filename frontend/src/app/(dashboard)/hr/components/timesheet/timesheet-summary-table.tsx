'use client';

import { useState, useMemo } from 'react';
import {
 IconChevronDown,
 IconChevronRight,
 IconClock,
 IconAlertTriangle,
 IconCheck,
 IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TimesheetResponse } from './timesheet-types';
import { aggregateByEmployee, type EmployeeSummary } from './timesheet-export';

// ─── Helpers ──────────────────────────────────────────────
function fmtTime(iso: string | null): string {
 if (!iso) return '--:--';
 const d = new Date(iso);
 return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
 const dd = String(d.getDate()).padStart(2, '0');
 const mm = String(d.getMonth() + 1).padStart(2, '0');
 return `${days[d.getDay()]} ${dd}/${mm}`;
}

function statusBadge(status: string) {
 switch (status) {
 case 'APPROVED':
 return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5">Duyệt</Badge>;
 case 'REJECTED':
 return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5">Từ chối</Badge>;
 default:
 return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5">Chờ</Badge>;
 }
}

// ─── Component ────────────────────────────────────────────
interface TimesheetSummaryTableProps {
 timesheets: TimesheetResponse[];
 searchQuery: string;
 onRowClick: (ts: TimesheetResponse) => void;
 onApprove?: (timesheetId: string) => void;
 onReject?: (timesheetId: string) => void;
 isApprovePending?: boolean;
 isRejectPending?: boolean;
}

export function TimesheetSummaryTable({
 timesheets,
 searchQuery,
 onRowClick,
 onApprove,
 onReject,
 isApprovePending = false,
 isRejectPending = false,
}: TimesheetSummaryTableProps) {
 const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

 const summaries = useMemo(() => {
 const agg = aggregateByEmployee(timesheets);
 if (!searchQuery.trim()) return agg;
 const q = searchQuery.toLowerCase();
 return agg.filter(
 (s) =>
 s.employee_name.toLowerCase().includes(q) ||
 s.employee_role.toLowerCase().includes(q)
 );
 }, [timesheets, searchQuery]);

 const toggleExpand = (id: string) => {
 setExpandedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 // Grand totals
 const grandTotals = useMemo(() => ({
 days: summaries.reduce((s, e) => s + e.total_days, 0),
 hours: summaries.reduce((s, e) => s + e.total_hours, 0),
 ot: summaries.reduce((s, e) => s + e.overtime_hours, 0),
 pending: summaries.reduce((s, e) => s + e.pending_count, 0),
 approved: summaries.reduce((s, e) => s + e.approved_count, 0),
 }), [summaries]);

 if (summaries.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-16 text-gray-400">
 <IconClock className="h-12 w-12 mb-3 opacity-30" />
 <p className="text-sm">Không có dữ liệu chấm công</p>
 </div>
 );
 }

 return (
 <div className="border rounded-lg overflow-hidden bg-white">
 {/* Table Header */}
 <div className="grid grid-cols-[2fr_80px_90px_80px_90px_90px] px-4 py-2.5 bg-gray-50/80 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
 <div>Nhân viên</div>
 <div className="text-center">Ngày</div>
 <div className="text-center">Tổng giờ</div>
 <div className="text-center">OT</div>
 <div className="text-center">Chờ duyệt</div>
 <div className="text-center">Đã duyệt</div>
 </div>

 {/* Data Rows */}
 {summaries.map((emp) => {
 const isExpanded = expandedIds.has(emp.employee_id);
 const hasOT = emp.overtime_hours > 0;

 return (
 <div key={emp.employee_id}>
 {/* Summary Row */}
 <button
 onClick={() => toggleExpand(emp.employee_id)}
 className="w-full grid grid-cols-[2fr_80px_90px_80px_90px_90px] px-4 py-3 items-center hover:bg-gray-50 transition-colors border-b text-left"
 >
 <div className="flex items-center gap-2">
 {isExpanded
 ? <IconChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
 : <IconChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
 }
 <div>
 <p className="text-sm font-medium text-gray-900 truncate">
 {emp.employee_name}
 </p>
 <p className="text-xs text-gray-400">{emp.employee_role}</p>
 </div>
 </div>
 <div className="text-center text-sm font-medium text-gray-700">
 {emp.total_days}
 </div>
 <div className="text-center text-sm font-semibold text-gray-900 tabular-nums">
 {emp.total_hours.toFixed(1)}h
 </div>
 <div className={`text-center text-sm font-medium tabular-nums ${hasOT ? 'text-amber-600' : 'text-gray-400'}`}>
 {hasOT && <IconAlertTriangle className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
 {emp.overtime_hours.toFixed(1)}
 </div>
 <div className="text-center">
 {emp.pending_count > 0 ? (
 <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
 {emp.pending_count}
 </Badge>
 ) : (
 <span className="text-gray-300 text-sm">0</span>
 )}
 </div>
 <div className="text-center">
 {emp.approved_count > 0 ? (
 <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
 {emp.approved_count}
 </Badge>
 ) : (
 <span className="text-gray-300 text-sm">0</span>
 )}
 </div>
 </button>

 {/* Expanded Detail Rows */}
 {isExpanded && (
 <div className="bg-gray-50/50 border-b">
 {emp.entries
 .sort((a, b) => a.work_date.localeCompare(b.work_date))
 .map((ts) => (
 <button
 key={ts.id}
 onClick={() => onRowClick(ts)}
 className="group w-full grid grid-cols-[2fr_80px_90px_80px_90px_90px] px-4 py-2 items-center hover:bg-white/80 transition-colors text-left border-b border-dashed border-gray-100 last:border-b-0"
 >
 <div className="pl-8 text-xs text-gray-500">
 {fmtDate(ts.work_date)}
 {ts.order_code && (
 <span className="ml-2 text-accent-primary">📦 {ts.order_code}</span>
 )}
 </div>
 <div className="text-center text-xs text-gray-400">—</div>
 <div className="text-center text-xs text-gray-700 tabular-nums">
 {fmtTime(ts.actual_start)} → {fmtTime(ts.actual_end)}
 </div>
 <div className={`text-center text-xs tabular-nums ${ts.overtime_hours > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
 {ts.total_hours.toFixed(1)}h
 </div>
 <div className="text-center flex items-center justify-center gap-1">
 {statusBadge(ts.status)}
 {ts.status === 'PENDING' && ts.actual_end && onApprove && onReject && (
 <span
 className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
 onClick={(e) => e.stopPropagation()}
 >
 <Button
 variant="ghost"
 size="sm"
 onClick={() => onApprove(ts.id)}
 disabled={isApprovePending}
 className="h-5 w-5 p-0 text-emerald-600 hover:bg-emerald-50"
 title="Duyệt"
 >
 <IconCheck className="h-3 w-3" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => onReject(ts.id)}
 disabled={isRejectPending}
 className="h-5 w-5 p-0 text-red-600 hover:bg-red-50"
 title="Từ chối"
 >
 <IconX className="h-3 w-3" />
 </Button>
 </span>
 )}
 </div>
 <div className="text-center text-xs text-gray-400">
 {ts.notes ? '📝' : ''}
 </div>
 </button>
 ))}
 </div>
 )}
 </div>
 );
 })}

 {/* Grand Total Row */}
 <div className="grid grid-cols-[2fr_80px_90px_80px_90px_90px] px-4 py-3 bg-accent-50 border-t-2 border-accent-subtle text-sm font-semibold">
 <div className="text-accent-strong">
 TỔNG CỘNG ({summaries.length} nhân viên)
 </div>
 <div className="text-center text-accent-strong">{grandTotals.days}</div>
 <div className="text-center text-accent-strong tabular-nums">{grandTotals.hours.toFixed(1)}h</div>
 <div className={`text-center tabular-nums ${grandTotals.ot > 0 ? 'text-amber-600' : 'text-accent-muted'}`}>
 {grandTotals.ot.toFixed(1)}
 </div>
 <div className="text-center text-amber-600">{grandTotals.pending}</div>
 <div className="text-center text-emerald-600">{grandTotals.approved}</div>
 </div>
 </div>
 );
}
