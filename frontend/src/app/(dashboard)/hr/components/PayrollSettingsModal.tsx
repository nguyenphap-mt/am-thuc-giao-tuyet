'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    IconSettings,
    IconCash,
    IconShieldCheck,
    IconClock,
    IconLoader2,
} from '@tabler/icons-react';

interface PayrollSettings {
    id: string;
    tenant_id: string;
    // Allowances
    default_allowance_meal: number;
    default_allowance_transport: number;
    default_allowance_phone: number;
    default_allowance_other: number;
    default_base_salary: number;
    // Insurance rates
    rate_social_insurance: number;
    rate_health_insurance: number;
    rate_unemployment: number;
    // Multipliers
    multiplier_overtime: number;
    multiplier_weekend: number;
    multiplier_holiday: number;
    multiplier_night: number;
    // Hours config
    standard_working_days_per_month: number;
    standard_hours_per_day: number;
}

interface PayrollSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function PayrollSettingsModal({ open, onOpenChange }: PayrollSettingsModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<PayrollSettings>>({});

    // Query: Get current settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['hr', 'payroll', 'settings'],
        queryFn: async () => {
            return await api.get<PayrollSettings>('/hr/payroll/settings');
        },
        enabled: open,
    });

    // Populate form when settings load
    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    // Mutation: Update settings
    const updateMutation = useMutation({
        mutationFn: async (data: Partial<PayrollSettings>) => {
            return await api.put<PayrollSettings>('/hr/payroll/settings', data);
        },
        onSuccess: () => {
            toast.success('Đã lưu cấu hình lương!');
            queryClient.invalidateQueries({ queryKey: ['hr', 'payroll'] });
            onOpenChange(false);
        },
        onError: () => {
            toast.error('Lưu thất bại');
        },
    });

    const handleChange = (field: keyof PayrollSettings, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: parseFloat(value) || 0,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500">
                            <IconSettings className="h-5 w-5 text-white" />
                        </div>
                        Cấu hình Lương & Phụ cấp
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <IconLoader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Section: Allowances */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <IconCash className="h-5 w-5 text-green-600" />
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Phụ cấp mặc định (VND/tháng)</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="allowance_meal">Phụ cấp ăn</Label>
                                    <Input
                                        id="allowance_meal"
                                        type="number"
                                        value={formData.default_allowance_meal || ''}
                                        onChange={(e) => handleChange('default_allowance_meal', e.target.value)}
                                        placeholder="500,000"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Hiện tại: {formatCurrency(settings?.default_allowance_meal || 0)} đ</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allowance_transport">Phụ cấp xăng xe</Label>
                                    <Input
                                        id="allowance_transport"
                                        type="number"
                                        value={formData.default_allowance_transport || ''}
                                        onChange={(e) => handleChange('default_allowance_transport', e.target.value)}
                                        placeholder="300,000"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Hiện tại: {formatCurrency(settings?.default_allowance_transport || 0)} đ</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allowance_phone">Phụ cấp điện thoại</Label>
                                    <Input
                                        id="allowance_phone"
                                        type="number"
                                        value={formData.default_allowance_phone || ''}
                                        onChange={(e) => handleChange('default_allowance_phone', e.target.value)}
                                        placeholder="200,000"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Hiện tại: {formatCurrency(settings?.default_allowance_phone || 0)} đ</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="base_salary">Lương căn bản mặc định</Label>
                                    <Input
                                        id="base_salary"
                                        type="number"
                                        value={formData.default_base_salary || ''}
                                        onChange={(e) => handleChange('default_base_salary', e.target.value)}
                                        placeholder="8,000,000"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Hiện tại: {formatCurrency(settings?.default_base_salary || 0)} đ</p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Insurance Rates */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <IconShieldCheck className="h-5 w-5 text-blue-600" />
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Tỷ lệ Bảo hiểm (%)</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="social_ins">BHXH</Label>
                                    <div className="relative">
                                        <Input
                                            id="social_ins"
                                            type="number"
                                            step="0.1"
                                            value={(formData.rate_social_insurance || 0) * 100}
                                            onChange={(e) => handleChange('rate_social_insurance', String(parseFloat(e.target.value) / 100))}
                                            placeholder="8.0"
                                            className="text-right pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 8%</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="health_ins">BHYT</Label>
                                    <div className="relative">
                                        <Input
                                            id="health_ins"
                                            type="number"
                                            step="0.1"
                                            value={(formData.rate_health_insurance || 0) * 100}
                                            onChange={(e) => handleChange('rate_health_insurance', String(parseFloat(e.target.value) / 100))}
                                            placeholder="1.5"
                                            className="text-right pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 1.5%</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="unemployment">BHTN</Label>
                                    <div className="relative">
                                        <Input
                                            id="unemployment"
                                            type="number"
                                            step="0.1"
                                            value={(formData.rate_unemployment || 0) * 100}
                                            onChange={(e) => handleChange('rate_unemployment', String(parseFloat(e.target.value) / 100))}
                                            placeholder="1.0"
                                            className="text-right pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 1%</p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Overtime Multipliers */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <IconClock className="h-5 w-5 text-purple-600" />
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Hệ số Tăng ca (theo Luật Lao động VN)</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="overtime">Tăng ca (x)</Label>
                                    <Input
                                        id="overtime"
                                        type="number"
                                        step="0.1"
                                        value={formData.multiplier_overtime || ''}
                                        onChange={(e) => handleChange('multiplier_overtime', e.target.value)}
                                        placeholder="1.5"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 1.5x</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weekend">Cuối tuần (x)</Label>
                                    <Input
                                        id="weekend"
                                        type="number"
                                        step="0.1"
                                        value={formData.multiplier_weekend || ''}
                                        onChange={(e) => handleChange('multiplier_weekend', e.target.value)}
                                        placeholder="2.0"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 2.0x</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="holiday">Ngày lễ (x)</Label>
                                    <Input
                                        id="holiday"
                                        type="number"
                                        step="0.1"
                                        value={formData.multiplier_holiday || ''}
                                        onChange={(e) => handleChange('multiplier_holiday', e.target.value)}
                                        placeholder="3.0"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 3.0x</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="night">Ca đêm (+)</Label>
                                    <Input
                                        id="night"
                                        type="number"
                                        step="0.1"
                                        value={formData.multiplier_night || ''}
                                        onChange={(e) => handleChange('multiplier_night', e.target.value)}
                                        placeholder="0.3"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: +30%</p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Working Hours */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <IconClock className="h-5 w-5 text-amber-600" />
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Cấu hình Giờ làm</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="days_per_month">Ngày làm việc/tháng</Label>
                                    <Input
                                        id="days_per_month"
                                        type="number"
                                        value={formData.standard_working_days_per_month || ''}
                                        onChange={(e) => handleChange('standard_working_days_per_month', e.target.value)}
                                        placeholder="26"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 26 ngày</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hours_per_day">Giờ làm/ngày</Label>
                                    <Input
                                        id="hours_per_day"
                                        type="number"
                                        value={formData.standard_hours_per_day || ''}
                                        onChange={(e) => handleChange('standard_hours_per_day', e.target.value)}
                                        placeholder="8"
                                        className="text-right"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Mặc định: 8 giờ</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <IconSettings className="h-4 w-4 mr-2" />
                                        Lưu cấu hình
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
