'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from '@/components/ui/dialog';
import { IconCalendar, IconLoader2, IconCash } from '@tabler/icons-react';

interface CreatePayrollPeriodModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
}

interface PayrollPeriodPayload {
 period_name: string;
 start_date: string;
 end_date: string;
 notes: string;
}

export default function CreatePayrollPeriodModal({
 open,
 onOpenChange,
}: CreatePayrollPeriodModalProps) {
 const queryClient = useQueryClient();

 // Default to current month
 const now = new Date();
 const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
 const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
 const defaultPeriodName = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

 const [formData, setFormData] = useState<PayrollPeriodPayload>({
 period_name: defaultPeriodName,
 start_date: defaultStartDate,
 end_date: defaultEndDate,
 notes: '',
 });

 const createMutation = useMutation({
 mutationFn: async (data: PayrollPeriodPayload) => {
 return api.post('/hr/payroll/periods', data);
 },
 onSuccess: () => {
 toast.success('Tạo kỳ lương thành công!');
 queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
 onOpenChange(false);
 resetForm();
 },
 onError: (error: any) => {
 toast.error(error?.message || 'Không thể tạo kỳ lương');
 },
 });

 const resetForm = () => {
 setFormData({
 period_name: defaultPeriodName,
 start_date: defaultStartDate,
 end_date: defaultEndDate,
 notes: '',
 });
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();

 if (!formData.period_name.trim()) {
 toast.error('Vui lòng nhập tên kỳ lương');
 return;
 }
 if (!formData.start_date || !formData.end_date) {
 toast.error('Vui lòng chọn ngày bắt đầu và kết thúc');
 return;
 }
 if (new Date(formData.start_date) > new Date(formData.end_date)) {
 toast.error('Ngày kết thúc phải sau ngày bắt đầu');
 return;
 }

 createMutation.mutate(formData);
 };

 const handleChange = (field: keyof PayrollPeriodPayload, value: string) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 // Auto-generate period name when dates change
 const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
 setFormData(prev => {
 const newData = { ...prev, [field]: value };

 // Auto-generate name based on start date
 if (field === 'start_date' && value) {
 const date = new Date(value);
 newData.period_name = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
 }

 return newData;
 });
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[450px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <IconCash className="h-5 w-5 text-green-600" />
 Tạo kỳ lương mới
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleSubmit} className="space-y-4">
 {/* Period Name */}
 <div className="space-y-2">
 <Label>Tên kỳ lương <span className="text-red-500">*</span></Label>
 <Input
 value={formData.period_name}
 onChange={(e) => handleChange('period_name', e.target.value)}
 placeholder="Tháng 2/2026"
 />
 </div>

 {/* Date Range */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="flex items-center gap-1">
 <IconCalendar className="h-4 w-4" />
 Từ ngày <span className="text-red-500">*</span>
 </Label>
 <input
 type="date"
 value={formData.start_date}
 onChange={(e) => handleDateChange('start_date', e.target.value)}
 className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
 />
 </div>
 <div className="space-y-2">
 <Label className="flex items-center gap-1">
 <IconCalendar className="h-4 w-4" />
 Đến ngày <span className="text-red-500">*</span>
 </Label>
 <input
 type="date"
 value={formData.end_date}
 onChange={(e) => handleDateChange('end_date', e.target.value)}
 className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
 />
 </div>
 </div>

 {/* Notes */}
 <div className="space-y-2">
 <Label>Ghi chú</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => handleChange('notes', e.target.value)}
 placeholder="Ghi chú thêm về kỳ lương..."
 rows={2}
 />
 </div>

 {/* Info Box */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-sm text-blue-700">
 💡 Sau khi tạo kỳ lương, bạn cần nhấn <strong>"Tính lương"</strong> để hệ thống tự động tính toán dựa trên bảng chấm công.
 </p>
 </div>

 <DialogFooter className="pt-4">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={createMutation.isPending}
 >
 Hủy
 </Button>
 <Button
 type="submit"
 disabled={createMutation.isPending}
 className="bg-accent-gradient"
 >
 {createMutation.isPending ? (
 <>
 <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
 Đang xử lý...
 </>
 ) : (
 'Tạo kỳ lương'
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
