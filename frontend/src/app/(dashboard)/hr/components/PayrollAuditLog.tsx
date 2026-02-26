'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconHistory, IconCalculator, IconCheck, IconCash, IconArrowBackUp, IconTrash } from '@tabler/icons-react';

interface AuditLog {
 id: string;
 period_id: string | null;
 action: string;
 action_by_name: string | null;
 action_at: string | null;
 period_name: string | null;
 employee_name: string | null;
 details: string | null;
 previous_status: string | null;
 new_status: string | null;
}

const ACTION_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
 CALCULATE: { label: 'Tính lương', color: 'bg-blue-100 text-blue-700', icon: <IconCalculator className="h-3.5 w-3.5" /> },
 APPROVE: { label: 'Duyệt', color: 'bg-green-100 text-green-700', icon: <IconCheck className="h-3.5 w-3.5" /> },
 PAY: { label: 'Trả lương', color: 'bg-accent-100 text-accent-strong', icon: <IconCash className="h-3.5 w-3.5" /> },
 REOPEN: { label: 'Mở lại', color: 'bg-amber-100 text-amber-700', icon: <IconArrowBackUp className="h-3.5 w-3.5" /> },
 DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-700', icon: <IconTrash className="h-3.5 w-3.5" /> },
 EDIT_ITEM: { label: 'Chỉnh sửa', color: 'bg-gray-100 text-gray-700', icon: <IconHistory className="h-3.5 w-3.5" /> },
};

function formatDateTime(iso: string | null) {
 if (!iso) return '';
 const d = new Date(iso);
 return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PayrollAuditLog() {
 const { data: logs, isLoading } = useQuery({
 queryKey: ['hr', 'payroll', 'audit-logs'],
 queryFn: async () => {
 return await api.get<AuditLog[]>('/hr/payroll/audit-logs?limit=20');
 },
 });

 if (isLoading || !logs || logs.length === 0) return null;

 return (
 <Card className="border-gray-200">
 <CardHeader className="py-3 px-4">
 <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
 <IconHistory className="h-4 w-4" />
 Lịch sử thao tác ({logs.length} gần nhất)
 </CardTitle>
 </CardHeader>
 <CardContent className="px-4 pb-3 pt-0">
 <div className="space-y-2 max-h-[240px] overflow-y-auto">
 {logs.map((log) => {
 const action = ACTION_MAP[log.action] || ACTION_MAP.EDIT_ITEM;
 return (
 <div
 key={log.id}
 className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0"
 >
 <Badge className={`${action.color} shrink-0 gap-1 font-normal`}>
 {action.icon}
 {action.label}
 </Badge>
 <span className="text-gray-700 truncate flex-1">
 {log.period_name && <span className="font-medium">{log.period_name}</span>}
 {log.employee_name && <span> • {log.employee_name}</span>}
 {log.previous_status && log.new_status && (
 <span className="text-gray-400"> ({log.previous_status} → {log.new_status})</span>
 )}
 </span>
 <span className="text-xs text-gray-400 tabular-nums shrink-0">
 {formatDateTime(log.action_at)}
 </span>
 </div>
 );
 })}
 </div>
 </CardContent>
 </Card>
 );
}
