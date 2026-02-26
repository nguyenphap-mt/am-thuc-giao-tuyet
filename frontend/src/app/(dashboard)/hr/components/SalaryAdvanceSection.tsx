'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
 IconCash,
 IconCheck,
 IconX,
 IconCreditCard,
 IconPlus,
 IconLoader2,
} from '@tabler/icons-react';
import CreateAdvanceModal from './CreateAdvanceModal';

// --- Types ---

interface SalaryAdvanceResponse {
 id: string;
 employee_id: string;
 employee_name: string | null;
 amount: number;
 request_date: string;
 reason: string | null;
 status: string;
 approved_at: string | null;
 created_at: string;
}

// --- Component ---

export default function SalaryAdvanceSection() {
 const queryClient = useQueryClient();
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [statusFilter, setStatusFilter] = useState<string>('ALL');

 // Query: List advances
 const { data: advances, isLoading } = useQuery({
 queryKey: ['hr', 'payroll', 'advances', statusFilter],
 queryFn: async () => {
 const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
 return await api.get<SalaryAdvanceResponse[]>(`/hr/payroll/advances${params}`);
 },
 });

 // Mutation: Approve
 const approveMutation = useMutation({
 mutationFn: async (id: string) => {
 return await api.put(`/hr/payroll/advances/${id}/approve`, {});
 },
 onSuccess: () => {
 toast.success('Đã duyệt yêu cầu ứng lương');
 queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
 },
 onError: () => {
 toast.error('Duyệt thất bại');
 },
 });

 // Mutation: Pay
 const payMutation = useMutation({
 mutationFn: async (id: string) => {
 return await api.put(`/hr/payroll/advances/${id}/pay`, {});
 },
 onSuccess: () => {
 toast.success('Đã xác nhận chi ứng lương');
 queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
 },
 onError: () => {
 toast.error('Xác nhận chi thất bại');
 },
 });

 const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('vi-VN', {
 style: 'currency',
 currency: 'VND',
 maximumFractionDigits: 0,
 }).format(amount);
 };

 const formatDate = (dateStr: string) => {
 const date = new Date(dateStr);
 return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
 };

 const getStatusBadge = (status: string) => {
 switch (status) {
 case 'PAID':
 return <Badge className="bg-green-100 text-green-700">Đã chi</Badge>;
 case 'APPROVED':
 return <Badge className="bg-blue-100 text-blue-700">Đã duyệt</Badge>;
 case 'REJECTED':
 return <Badge className="bg-red-100 text-red-700">Từ chối</Badge>;
 case 'DEDUCTED':
 return <Badge className="bg-accent-100 text-accent-strong">Đã trừ lương</Badge>;
 default:
 return <Badge className="bg-amber-100 text-amber-700">Chờ duyệt</Badge>;
 }
 };

 const statusFilters = [
 { key: 'ALL', label: 'Tất cả' },
 { key: 'PENDING', label: 'Chờ duyệt' },
 { key: 'APPROVED', label: 'Đã duyệt' },
 { key: 'PAID', label: 'Đã chi' },
 ];

 const totalPending = advances?.filter(a => a.status === 'PENDING').reduce((s, a) => s + a.amount, 0) ?? 0;

 return (
 <>
 <Card>
 <CardHeader className="py-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-lg flex items-center gap-2">
 <IconCash className="h-5 w-5" />
 Ứng lương
 {totalPending > 0 && (
 <Badge variant="destructive" className="ml-2 text-xs">
 {formatCurrency(totalPending)} chờ duyệt
 </Badge>
 )}
 </CardTitle>
 <div className="flex items-center gap-2">
 {/* Status filter pills */}
 <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
 {statusFilters.map((f) => (
 <button
 key={f.key}
 onClick={() => setStatusFilter(f.key)}
 className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${statusFilter === f.key
 ? 'bg-white text-gray-900 shadow-sm'
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 {f.label}
 </button>
 ))}
 </div>
 <Button
 size="sm"
 className="bg-accent-gradient-2stop"
 onClick={() => setShowCreateModal(true)}
 >
 <IconPlus className="h-4 w-4 mr-1" />
 Tạo ứng lương
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-4 space-y-2">
 {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
 </div>
 ) : !advances || advances.length === 0 ? (
 <div className="text-center py-10">
 <IconCash className="mx-auto h-10 w-10 text-gray-300" />
 <p className="mt-3 text-gray-500 text-sm">Không có yêu cầu ứng lương</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-50 border-b">
 <tr>
 <th className="text-left px-3 py-2 font-medium">Nhân viên</th>
 <th className="text-right px-3 py-2 font-medium">Số tiền</th>
 <th className="text-left px-3 py-2 font-medium">Ngày yêu cầu</th>
 <th className="text-left px-3 py-2 font-medium">Lý do</th>
 <th className="text-center px-3 py-2 font-medium">Trạng thái</th>
 <th className="text-center px-3 py-2 font-medium w-32">Thao tác</th>
 </tr>
 </thead>
 <tbody className="divide-y">
 {advances.map((adv) => (
 <tr key={adv.id} className="hover:bg-gray-50 transition-colors">
 <td className="px-3 py-2.5 font-medium">
 {adv.employee_name || '—'}
 </td>
 <td className="text-right px-3 py-2.5 font-bold text-amber-600 tabular-nums">
 {formatCurrency(adv.amount)}
 </td>
 <td className="px-3 py-2.5 text-gray-600">
 {formatDate(adv.request_date)}
 </td>
 <td className="px-3 py-2.5 text-gray-600 max-w-[200px] truncate">
 {adv.reason || '—'}
 </td>
 <td className="text-center px-3 py-2.5">
 {getStatusBadge(adv.status)}
 </td>
 <td className="text-center px-3 py-2.5">
 <div className="flex items-center justify-center gap-1">
 {adv.status === 'PENDING' && (
 <>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => approveMutation.mutate(adv.id)}
 disabled={approveMutation.isPending}
 className="h-7 px-2 text-emerald-600 hover:bg-emerald-50 text-xs"
 title="Duyệt"
 >
 {approveMutation.isPending ? (
 <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <IconCheck className="h-3.5 w-3.5" />
 )}
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 px-2 text-red-600 hover:bg-red-50 text-xs"
 title="Từ chối"
 disabled
 >
 <IconX className="h-3.5 w-3.5" />
 </Button>
 </>
 )}
 {adv.status === 'APPROVED' && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => payMutation.mutate(adv.id)}
 disabled={payMutation.isPending}
 className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs"
 title="Xác nhận đã chi"
 >
 {payMutation.isPending ? (
 <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
 ) : (
 <>
 <IconCreditCard className="h-3.5 w-3.5 mr-1" />
 Chi
 </>
 )}
 </Button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>

 <CreateAdvanceModal
 open={showCreateModal}
 onOpenChange={setShowCreateModal}
 />
 </>
 );
}
