'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
 IconUsers,
 IconUserPlus,
 IconAlertTriangle,
 IconSearch,
 IconClock,
 IconBeach,
} from '@tabler/icons-react';
import { OrderSearchCombobox } from './OrderSearchCombobox';

// Types
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

interface BatchResult {
 created: any[];
 conflicts: Array<{ employee_id: string; employee_name?: string; reason: string }>;
 total_created: number;
 total_conflicts: number;
}

interface AssignmentBatchModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 preselectedEventId?: string;
}

const ROLE_OPTIONS = [
 { value: 'CHEF', label: 'Đầu bếp' },
 { value: 'WAITER', label: 'Phục vụ' },
 { value: 'DRIVER', label: 'Tài xế' },
 { value: 'LEAD', label: 'Trưởng nhóm' },
 { value: 'HELPER', label: 'Phụ bếp' },
 { value: 'SETUP', label: 'Setup' },
];


export default function AssignmentBatchModal({
 open,
 onOpenChange,
 preselectedEventId,
}: AssignmentBatchModalProps) {
 const queryClient = useQueryClient();
 const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
 const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
 const [role, setRole] = useState('');
 const [startTime, setStartTime] = useState('');
 const [endTime, setEndTime] = useState('');
 const [notes, setNotes] = useState('');
 const [searchQuery, setSearchQuery] = useState('');

 // Update event ID when preselected changes
 useEffect(() => {
 if (preselectedEventId) setSelectedEventId(preselectedEventId);
 }, [preselectedEventId]);

 // Fetch employees
 const { data: employees, isLoading: loadingEmployees } = useQuery({
 queryKey: ['employees-active'],
 queryFn: async () => {
 return api.get<Employee[]>('/hr/employees?is_active=true');
 },
 enabled: open,
 });

 // Fetch orders for combobox
 const { data: orders } = useQuery({
 queryKey: ['orders-list'],
 queryFn: async () => {
 const result = await api.get<{ items: Order[] } | Order[]>('/orders?limit=200');
 return Array.isArray(result) ? result : result.items || [];
 },
 enabled: open,
 });

 // Filter employees
 const filteredEmployees = useMemo(() => {
 if (!employees) return [];
 if (!searchQuery.trim()) return employees;
 const q = searchQuery.toLowerCase();
 return employees.filter(e =>
 e.full_name.toLowerCase().includes(q) ||
 e.role_type.toLowerCase().includes(q)
 );
 }, [employees, searchQuery]);

 // Batch create mutation
 const batchMutation = useMutation({
 mutationFn: async () => {
 return api.post<BatchResult>('/hr/assignments/batch', {
 event_id: selectedEventId,
 employee_ids: Array.from(selectedEmployees),
 role: role || null,
 start_time: startTime ? new Date(startTime).toISOString() : null,
 end_time: endTime ? new Date(endTime).toISOString() : null,
 notes: notes || null,
 });
 },
 onSuccess: (result) => {
 if (result.total_created > 0) {
 toast.success(`Phân công ${result.total_created} nhân viên thành công!`);
 }
 if (result.total_conflicts > 0) {
 const names = result.conflicts
 .map(c => c.employee_name || 'N/A')
 .join(', ');
 toast.warning(`${result.total_conflicts} nhân viên bờtrùng: ${names}`);
 }
 queryClient.invalidateQueries({ queryKey: ['hr-assignments'] });
 queryClient.invalidateQueries({ queryKey: ['hr-assignments-grouped'] });
 resetForm();
 onOpenChange(false);
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Lỗi phân công');
 },
 });

 // Toggle employee selection
 const toggleEmployee = (id: string) => {
 setSelectedEmployees((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 // Select all / deselect
 const toggleAll = () => {
 if (selectedEmployees.size === filteredEmployees.length) {
 setSelectedEmployees(new Set());
 } else {
 setSelectedEmployees(new Set(filteredEmployees.map(e => e.id)));
 }
 };

 const resetForm = () => {
 setSelectedEmployees(new Set());
 setRole('');
 setStartTime('');
 setEndTime('');
 setNotes('');
 setSearchQuery('');
 if (!preselectedEventId) setSelectedEventId('');
 };

 const getRoleLabel = (r: string) => {
 return ROLE_OPTIONS.find(o => o.value === r)?.label || r;
 };

 return (
 <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
 <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <IconUsers className="h-5 w-5 text-accent-primary" />
 Phân công nhiều nhân viên
 </DialogTitle>
 <DialogDescription>
 Chọn đơn hàng, chọn nhân viên và cấu hình ca làm
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 mt-2">
 {/* Order Selection */}
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-gray-700">Đơn hàng / Sự kiện *</Label>
 <OrderSearchCombobox
 orders={orders || []}
 value={selectedEventId}
 onValueChange={setSelectedEventId}
 />
 </div>

 {/* Time Range */}
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-gray-700">Bắt đầu</Label>
 <Input
 type="datetime-local"
 value={startTime}
 onChange={(e) => setStartTime(e.target.value)}
 className="h-9 text-sm"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-gray-700">Kết thúc</Label>
 <Input
 type="datetime-local"
 value={endTime}
 onChange={(e) => setEndTime(e.target.value)}
 className="h-9 text-sm"
 />
 </div>
 </div>

 {/* Role */}
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-gray-700">Vai trò (áp dụng cho tất cả)</Label>
 <Select value={role} onValueChange={setRole}>
 <SelectTrigger className="h-9 text-sm">
 <SelectValue placeholder="Mặc định theo NV" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="default">Mặc định theo NV</SelectItem>
 {ROLE_OPTIONS.map(o => (
 <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Employee Selection */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-medium text-gray-700">
 Chọn nhân viên ({selectedEmployees.size} đã chọn)
 </Label>
 <Button
 variant="ghost"
 size="sm"
 className="h-6 text-[11px] text-accent-primary"
 onClick={toggleAll}
 >
 {selectedEmployees.size === filteredEmployees.length ? 'Bờchọn tất cả' : 'Chọn tất cả'}
 </Button>
 </div>

 {/* Search */}
 <div className="relative">
 <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
 <Input
 placeholder="Tìm nhân viên..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-8 pl-8 text-sm"
 />
 </div>

 {/* Employee List */}
 <div className="border rounded-lg max-h-[240px] overflow-y-auto divide-y">
 {loadingEmployees ? (
 <div className="p-3 space-y-2">
 {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
 </div>
 ) : filteredEmployees.length === 0 ? (
 <div className="p-4 text-center text-sm text-gray-500">
 Không tìm thấy nhân viên
 </div>
 ) : (
 filteredEmployees.map((emp) => (
 <label
 key={emp.id}
 className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
 >
 <Checkbox
 checked={selectedEmployees.has(emp.id)}
 onCheckedChange={() => toggleEmployee(emp.id)}
 />
 <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-white text-[10px] font-medium shrink-0">
 {emp.full_name.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-gray-900 truncate block">
 {emp.full_name}
 </span>
 <span className="text-[11px] text-gray-500">
 {getRoleLabel(emp.role_type)}
 {emp.is_fulltime && ' · Toàn thời gian'}
 </span>
 </div>
 </label>
 ))
 )}
 </div>
 </div>

 {/* Notes */}
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-gray-700">Ghi chú</Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ghi chú cho phân công..."
 className="h-9 text-sm"
 />
 </div>
 </div>

 <DialogFooter className="mt-4">
 <Button
 variant="outline"
 onClick={() => { resetForm(); onOpenChange(false); }}
 >
 Hủy
 </Button>
 <Button
 disabled={!selectedEventId || selectedEmployees.size === 0 || batchMutation.isPending}
 className="bg-accent-gradient hover:opacity-90"
 onClick={() => batchMutation.mutate()}
 >
 <IconUserPlus className="mr-2 h-4 w-4" />
 {batchMutation.isPending
 ? 'Đang phân công...'
 : `Phân công ${selectedEmployees.size} nhân viên`
 }
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
