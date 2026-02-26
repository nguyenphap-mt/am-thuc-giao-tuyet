'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
 IconBolt,
 IconPlayerPlay,
 IconLogin,
 IconAlertTriangle,
 IconClipboard,
 IconMapPin,
 IconChevronDown,
 IconChevronUp,
} from '@tabler/icons-react';
import type { UnattendedAssignment } from './timesheet-types';

interface TimesheetQuickAttendanceProps {
 unattended: UnattendedAssignment[];
 overdueAssignments: UnattendedAssignment[];
 isToday: boolean;
 onCheckIn: (assignment: UnattendedAssignment) => void;
 onBatchCreate: (date: string, assignmentIds?: string[]) => void;
 isCheckInPending: boolean;
 isBatchPending: boolean;
 todayStr: string;
}

export function TimesheetQuickAttendance({
 unattended,
 overdueAssignments,
 isToday,
 onCheckIn,
 onBatchCreate,
 isCheckInPending,
 isBatchPending,
 todayStr,
}: TimesheetQuickAttendanceProps) {
 const [showOverdue, setShowOverdue] = useState(false);

 if (!isToday && overdueAssignments.length === 0) return null;
 if (isToday && unattended.length === 0 && overdueAssignments.length === 0) return null;

 return (
 <div className="space-y-3">
 {/* Quick Check-in Panel */}
 {isToday && unattended.length > 0 && (
 <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
 <CardHeader className="pb-2 pt-3 px-4">
 <div className="flex items-center justify-between">
 <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
 <IconBolt className="h-4 w-4" />
 Chấm công nhanh
 <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
 {unattended.length}
 </Badge>
 </CardTitle>
 <Button
 size="sm"
 variant="outline"
 onClick={() => onBatchCreate(
 todayStr,
 unattended.map((a) => a.assignment_id)
 )}
 disabled={isBatchPending}
 className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
 >
 <IconPlayerPlay className="h-3.5 w-3.5 mr-1" />
 Tạo tất cả
 </Button>
 </div>
 </CardHeader>
 <CardContent className="px-4 pb-3 pt-0">
 <div className="flex flex-wrap gap-2">
 {unattended.map((assignment) => (
 <button
 key={assignment.assignment_id}
 onClick={() => onCheckIn(assignment)}
 disabled={isCheckInPending}
 className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-sm transition-all text-sm"
 >
 <div className="h-6 w-6 rounded-full bg-accent-gradient-br flex items-center justify-center text-white text-xs font-medium shrink-0">
 {assignment.employee_name?.charAt(0) || 'N'}
 </div>
 <span className="font-medium text-gray-700 text-xs">
 {assignment.employee_name}
 </span>
 <IconLogin className="h-3.5 w-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
 </button>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Overdue Assignments Panel */}
 {overdueAssignments.length > 0 && (
 <Card className="border-amber-200 bg-gradient-to-r from-amber-50/50 to-orange-50/50">
 <CardHeader className="pb-2 pt-3 px-4">
 <button
 onClick={() => setShowOverdue(!showOverdue)}
 className="flex items-center justify-between w-full"
 >
 <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
 <IconAlertTriangle className="h-4 w-4" />
 Phân công quá hạn
 <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
 {overdueAssignments.length}
 </Badge>
 </CardTitle>
 {showOverdue ? (
 <IconChevronUp className="h-4 w-4 text-amber-500" />
 ) : (
 <IconChevronDown className="h-4 w-4 text-amber-500" />
 )}
 </button>
 </CardHeader>
 {showOverdue && (
 <CardContent className="px-4 pb-3 pt-0">
 <div className="space-y-2">
 {overdueAssignments.map((assignment) => (
 <div
 key={assignment.assignment_id}
 className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-white/70 border border-amber-100"
 >
 <div className="flex items-center gap-2 min-w-0">
 <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
 {assignment.employee_name?.charAt(0) || 'N'}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-medium truncate">
 {assignment.employee_name}
 </p>
 {assignment.order_code && (
 <div className="flex items-center gap-1 text-xs text-gray-400">
 <IconClipboard className="h-3 w-3" />
 {assignment.order_code}
 {assignment.event_location && (
 <>
 <IconMapPin className="h-3 w-3 ml-1" />
 <span className="truncate max-w-[100px]">
 {assignment.event_location}
 </span>
 </>
 )}
 </div>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <Badge
 variant="outline"
 className="text-xs border-amber-300 text-amber-600"
 >
 -{assignment.overdue_days}d
 </Badge>
 <Button
 size="sm"
 variant="outline"
 onClick={() => onBatchCreate(
 assignment.work_date || todayStr,
 [assignment.assignment_id]
 )}
 disabled={isBatchPending}
 className="h-7 text-xs"
 >
 Tạo CC
 </Button>
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 )}
 </Card>
 )}
 </div>
 );
}
