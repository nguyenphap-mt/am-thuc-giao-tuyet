'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import { IconCash, IconLoader2, IconSearch, IconCheck, IconUser } from '@tabler/icons-react';

interface Employee {
 id: string;
 full_name: string;
 role: string;
 is_active: boolean;
}

interface CreateAdvanceModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

const AMOUNT_PRESETS = [
 { label: '500K', value: 500000 },
 { label: '1M', value: 1000000 },
 { label: '2M', value: 2000000 },
 { label: '3M', value: 3000000 },
 { label: '5M', value: 5000000 },
];

export default function CreateAdvanceModal({
 open,
 onOpenChange,
}: CreateAdvanceModalProps) {
 const queryClient = useQueryClient();

 // Form state
 const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
 const [amount, setAmount] = useState(0);
 const [amountDisplay, setAmountDisplay] = useState('');
 const [reason, setReason] = useState('');

 // Employee search state
 const [employeeSearch, setEmployeeSearch] = useState('');
 const [showDropdown, setShowDropdown] = useState(false);

 // Load active employees
 const { data: employees } = useQuery({
 queryKey: ['hr', 'employees', 'active-list'],
 queryFn: async () => {
 return await api.get<Employee[]>('/hr/employees?is_active=true');
 },
 enabled: open,
 });

 // Filter employees by search
 const filteredEmployees = useMemo(() => {
 if (!employees) return [];
 if (!employeeSearch.trim()) return employees;
 const q = employeeSearch.toLowerCase();
 return employees.filter(
 (emp) =>
 emp.full_name.toLowerCase().includes(q) ||
 emp.role?.toLowerCase().includes(q)
 );
 }, [employees, employeeSearch]);

 const selectedEmployee = useMemo(
 () => employees?.find((e) => e.id === selectedEmployeeId),
 [employees, selectedEmployeeId]
 );

 // Create mutation
 const createMutation = useMutation({
 mutationFn: async (data: { employee_id: string; amount: number; reason: string }) => {
 return await api.post('/hr/payroll/advances', data);
 },
 onSuccess: () => {
 toast.success('Đã tạo yêu cầu ứng lương');
 queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
 resetForm();
 onOpenChange(false);
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Tạo ứng lương thất bại');
 },
 });

 const resetForm = () => {
 setSelectedEmployeeId('');
 setAmount(0);
 setAmountDisplay('');
 setReason('');
 setEmployeeSearch('');
 setShowDropdown(false);
 };

 // VND formatting
 const formatVND = (value: number) => {
 if (!value) return '';
 return new Intl.NumberFormat('vi-VN').format(value);
 };

 const handleAmountChange = (rawValue: string) => {
 // Strip non-digits
 const digits = rawValue.replace(/\D/g, '');
 const numVal = parseInt(digits, 10) || 0;
 setAmount(numVal);
 setAmountDisplay(numVal > 0 ? formatVND(numVal) : '');
 };

 const handlePresetClick = (presetValue: number) => {
 setAmount(presetValue);
 setAmountDisplay(formatVND(presetValue));
 };

 const handleSelectEmployee = (emp: Employee) => {
 setSelectedEmployeeId(emp.id);
 setEmployeeSearch(emp.full_name);
 setShowDropdown(false);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedEmployeeId) {
 toast.error('Vui lòng chọn nhân viên');
 return;
 }
 if (amount <= 0) {
 toast.error('Số tiền phải lớn hơn 0');
 return;
 }
 createMutation.mutate({
 employee_id: selectedEmployeeId,
 amount,
 reason,
 });
 };

 return (
 <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
 <DialogContent className="sm:max-w-[480px] p-0 gap-0">
 {/* Header */}
 <DialogHeader className="px-6 pt-5 pb-3">
 <DialogTitle className="flex items-center gap-2.5 text-lg">
 <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
 <IconCash className="h-4.5 w-4.5 text-white" />
 </div>
 Tạo yêu cầu ứng lương
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
 {/* Employee searchable select */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
 <IconUser className="h-3.5 w-3.5" />
 Nhân viên <span className="text-red-400">*</span>
 </label>
 <div className="relative">
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
 <IconSearch className="h-4 w-4" />
 </div>
 <Input
 value={employeeSearch}
 onChange={(e) => {
 setEmployeeSearch(e.target.value);
 setShowDropdown(true);
 if (!e.target.value) setSelectedEmployeeId('');
 }}
 onFocus={() => setShowDropdown(true)}
 placeholder="Tìm theo tên hoặc vai trò..."
 className="pl-9 pr-8"
 />
 {selectedEmployeeId && (
 <div className="absolute right-3 top-1/2 -translate-y-1/2">
 <IconCheck className="h-4 w-4 text-emerald-500" />
 </div>
 )}
 </div>

 {/* Dropdown list */}
 {showDropdown && !selectedEmployeeId && (
 <div className="border border-gray-200 rounded-lg max-h-[180px] overflow-y-auto bg-white shadow-lg">
 {filteredEmployees.length === 0 ? (
 <div className="px-3 py-4 text-center text-sm text-gray-400">
 Không tìm thấy nhân viên
 </div>
 ) : (
 filteredEmployees.map((emp) => (
 <button
 key={emp.id}
 type="button"
 onClick={() => handleSelectEmployee(emp)}
 className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent-50 transition-colors text-left border-b border-gray-50 last:border-0"
 >
 <div>
 <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
 <p className="text-xs text-gray-500">{emp.role || 'Chưa phân vai trò'}</p>
 </div>
 </button>
 ))
 )}
 </div>
 )}

 {/* Selected employee badge */}
 {selectedEmployee && (
 <div className="flex items-center gap-2 mt-1">
 <span className="text-xs bg-accent-50 text-accent-strong px-2 py-0.5 rounded-full font-medium">
 {selectedEmployee.full_name}
 </span>
 <button
 type="button"
 onClick={() => {
 setSelectedEmployeeId('');
 setEmployeeSearch('');
 setShowDropdown(true);
 }}
 className="text-xs text-gray-400 hover:text-red-500 transition-colors"
 >
 Đổi
 </button>
 </div>
 )}
 </div>

 {/* Amount with VND formatting */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
 <IconCash className="h-3.5 w-3.5" />
 Số tiền (VND) <span className="text-red-400">*</span>
 </label>
 <div className="relative">
 <Input
 value={amountDisplay}
 onChange={(e) => handleAmountChange(e.target.value)}
 placeholder="Ví dụ: 2.000.000"
 className="pr-8 text-base font-semibold tabular-nums"
 />
 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
 đ
 </span>
 </div>

 {/* Preset buttons */}
 <div className="flex gap-1.5 flex-wrap">
 {AMOUNT_PRESETS.map((preset) => (
 <button
 key={preset.value}
 type="button"
 onClick={() => handlePresetClick(preset.value)}
 className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${amount === preset.value
 ? 'bg-accent-50 border-accent-medium text-accent-strong'
 : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
 }`}
 >
 {preset.label}
 </button>
 ))}
 </div>
 </div>

 {/* Reason */}
 <div className="space-y-1.5">
 <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
 Lý do
 </label>
 <Textarea
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 placeholder="VD: Tiền cọc đám cưới, chi phí khẩn cấp..."
 rows={2}
 className="resize-none"
 />
 </div>

 {/* Footer */}
 <DialogFooter className="pt-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => { resetForm(); onOpenChange(false); }}
 >
 Hủy
 </Button>
 <Button
 type="submit"
 disabled={createMutation.isPending || !selectedEmployeeId || amount <= 0}
 className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
 >
 {createMutation.isPending ? (
 <>
 <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />
 Đang tạo...
 </>
 ) : (
 <>
 <IconCash className="h-4 w-4 mr-1" />
 {amount > 0
 ? `Ứng ${formatVND(amount)} đ`
 : 'Tạo ứng lương'}
 </>
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
