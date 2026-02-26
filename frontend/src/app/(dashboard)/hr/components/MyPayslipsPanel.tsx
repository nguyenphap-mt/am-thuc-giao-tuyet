'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
 IconReceipt,
 IconCash,
 IconBriefcase,
 IconCalendar,
 IconChevronDown,
 IconChevronUp,
} from '@tabler/icons-react';
import { useState } from 'react';

interface Payslip {
 period_id: string;
 period_name: string;
 period_status: string;
 start_date: string;
 end_date: string;
 regular_hours: number;
 overtime_hours: number;
 weekend_hours: number;
 holiday_hours: number;
 base_amount: number;
 ot_amount: number;
 allowance_total: number;
 gross_salary: number;
 deduction_social_ins: number;
 deduction_health_ins: number;
 deduction_unemployment: number;
 deduction_pit: number;
 deduction_advance: number;
 total_deductions: number;
 net_salary: number;
}

interface MyPayslipsData {
 employee: {
 id: string;
 full_name: string;
 role_type: string;
 } | null;
 payslips: Payslip[];
 message?: string;
}

const formatCurrency = (amount: number) =>
 new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const statusLabel: Record<string, string> = {
 CALCULATED: 'Đã tính',
 APPROVED: 'Đã duyệt',
 PAID: 'Đã trả',
};

export default function MyPayslipsPanel() {
 const [expandedId, setExpandedId] = useState<string | null>(null);

 const { data, isLoading } = useQuery<MyPayslipsData>({
 queryKey: ['hr', 'my-payslips'],
 queryFn: async () => {
 const res = await api.get('/hr/payroll/my-payslips');
 return res as MyPayslipsData;
 },
 });

 // Don't render if no linked employee
 if (!isLoading && (!data?.employee || data.payslips.length === 0)) {
 return null;
 }

 return (
 <Card>
 <CardHeader className="py-3">
 <CardTitle className="text-lg flex items-center gap-2">
 <IconReceipt className="h-5 w-5 text-green-600" />
 Phiếu lương của tôi
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-4 space-y-2">
 {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
 </div>
 ) : (
 <div className="divide-y max-h-[500px] overflow-y-auto">
 {data?.payslips.map(slip => (
 <div key={slip.period_id} className="hover:bg-gray-50 transition-colors">
 {/* Summary row */}
 <button
 className="w-full flex items-center justify-between p-3 text-left"
 onClick={() => setExpandedId(expandedId === slip.period_id ? null : slip.period_id)}
 >
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-50">
 <IconCalendar className="h-4 w-4 text-green-600" />
 </div>
 <div>
 <p className="font-medium text-sm">{slip.period_name}</p>
 <p className="text-xs text-gray-500">
 {slip.regular_hours.toFixed(1)}h · OT {slip.overtime_hours.toFixed(1)}h
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <div className="text-right">
 <p className="font-bold text-sm text-green-700 tabular-nums">
 {formatCurrency(slip.net_salary)}
 </p>
 <Badge variant="outline" className="text-[10px]">
 {statusLabel[slip.period_status] || slip.period_status}
 </Badge>
 </div>
 {expandedId === slip.period_id ? (
 <IconChevronUp className="h-4 w-4 text-gray-400" />
 ) : (
 <IconChevronDown className="h-4 w-4 text-gray-400" />
 )}
 </div>
 </button>

 {/* Expanded payslip detail */}
 {expandedId === slip.period_id && (
 <div className="px-4 pb-4 bg-green-50/50 space-y-3 text-sm">
 {/* Earnings */}
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thu nhập</p>
 <div className="grid grid-cols-2 gap-1">
 <span className="text-gray-600">Lương cơ bản</span>
 <span className="text-right font-medium tabular-nums">{formatCurrency(slip.base_amount)}</span>
 {slip.ot_amount > 0 && (
 <>
 <span className="text-gray-600">Tăng ca ({slip.overtime_hours.toFixed(1)}h)</span>
 <span className="text-right font-medium tabular-nums">{formatCurrency(slip.ot_amount)}</span>
 </>
 )}
 {slip.allowance_total > 0 && (
 <>
 <span className="text-gray-600">Phụ cấp</span>
 <span className="text-right font-medium tabular-nums">{formatCurrency(slip.allowance_total)}</span>
 </>
 )}
 <span className="text-gray-800 font-semibold border-t pt-1">Tổng thu nhập</span>
 <span className="text-right font-bold text-blue-700 border-t pt-1 tabular-nums">{formatCurrency(slip.gross_salary)}</span>
 </div>
 </div>

 {/* Deductions */}
 <div>
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Khấu trừ</p>
 <div className="grid grid-cols-2 gap-1">
 {slip.deduction_social_ins > 0 && (
 <>
 <span className="text-gray-600">BHXH</span>
 <span className="text-right text-red-600 tabular-nums">-{formatCurrency(slip.deduction_social_ins)}</span>
 </>
 )}
 {slip.deduction_health_ins > 0 && (
 <>
 <span className="text-gray-600">BHYT</span>
 <span className="text-right text-red-600 tabular-nums">-{formatCurrency(slip.deduction_health_ins)}</span>
 </>
 )}
 {slip.deduction_unemployment > 0 && (
 <>
 <span className="text-gray-600">BHTN</span>
 <span className="text-right text-red-600 tabular-nums">-{formatCurrency(slip.deduction_unemployment)}</span>
 </>
 )}
 {slip.deduction_pit > 0 && (
 <>
 <span className="text-gray-600">Thuế TNCN</span>
 <span className="text-right text-red-600 tabular-nums">-{formatCurrency(slip.deduction_pit)}</span>
 </>
 )}
 {slip.deduction_advance > 0 && (
 <>
 <span className="text-gray-600">Tạm ứng</span>
 <span className="text-right text-red-600 tabular-nums">-{formatCurrency(slip.deduction_advance)}</span>
 </>
 )}
 <span className="text-gray-800 font-semibold border-t pt-1">Tổng khấu trừ</span>
 <span className="text-right font-bold text-red-600 border-t pt-1 tabular-nums">-{formatCurrency(slip.total_deductions)}</span>
 </div>
 </div>

 {/* Net */}
 <div className="bg-white rounded-lg p-3 flex items-center justify-between border border-green-200">
 <span className="font-semibold flex items-center gap-2">
 <IconCash className="h-4 w-4 text-green-600" />
 Thực nhận
 </span>
 <span className="text-lg font-bold text-green-700 tabular-nums">
 {formatCurrency(slip.net_salary)}
 </span>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 );
}
