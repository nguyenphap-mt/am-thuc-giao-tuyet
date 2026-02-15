'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    IconCash,
    IconClock,
    IconMoon,
    IconSun,
    IconCalendar,
    IconMinus,
    IconPlus,
    IconReceipt,
    IconPrinter,
} from '@tabler/icons-react';
import { generatePayrollSlipPdf, type PayrollSlipData } from '@/lib/payroll-slip-pdf';

interface PayrollItemResponse {
    id: string;
    employee_id: string;
    employee_name: string;
    employee_role: string;
    is_fulltime: boolean;
    regular_hours: number;
    overtime_hours: number;
    weekend_hours: number;
    holiday_hours: number;
    night_hours: number;
    regular_pay: number;
    overtime_pay: number;
    weekend_pay: number;
    holiday_pay: number;
    night_pay: number;
    allowance_meal: number;
    allowance_transport: number;
    bonus: number;
    gross_salary: number;
    deduction_social_ins: number;
    deduction_advance: number;
    total_deductions: number;
    net_salary: number;
    status: string;
}

interface PayrollItemDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PayrollItemResponse | null;
    periodName?: string;
    periodStart?: string;
    periodEnd?: string;
}

export default function PayrollItemDetailModal({
    open,
    onOpenChange,
    item,
    periodName,
    periodStart,
    periodEnd,
}: PayrollItemDetailModalProps) {
    const [isPrinting, setIsPrinting] = useState(false);

    if (!item) return null;

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            await generatePayrollSlipPdf(item as PayrollSlipData, periodName || '', periodStart, periodEnd);
        } catch (e) {
            console.error('Failed to generate payroll slip:', e);
        } finally {
            setIsPrinting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const totalHours = item.regular_hours + item.overtime_hours + item.weekend_hours + item.holiday_hours + item.night_hours;
    const totalAllowances = item.allowance_meal + item.allowance_transport + item.bonus;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <IconReceipt className="h-5 w-5" />
                            Chi tiết lương - {item.employee_name}
                        </DialogTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="border-amber-200 text-amber-700 hover:bg-amber-50 shrink-0"
                        >
                            <IconPrinter className="h-4 w-4 mr-1" />
                            {isPrinting ? 'Đang tạo...' : 'In phiếu lương'}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{item.employee_role}</Badge>
                        <Badge className={item.is_fulltime ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}>
                            {item.is_fulltime ? 'Toàn thời gian' : 'Part-time'}
                        </Badge>
                        {periodName && <span className="text-sm text-gray-500 dark:text-gray-400">{periodName}</span>}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Hours Breakdown */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="py-3 px-4">
                            <h4 className="font-medium text-blue-800 flex items-center gap-2 mb-3">
                                <IconClock className="h-4 w-4" />
                                Giờ làm việc ({totalHours.toFixed(1)} giờ)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Thường</p>
                                    <p className="font-bold text-blue-600">{item.regular_hours.toFixed(1)}h</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Tăng ca</p>
                                    <p className="font-bold text-purple-600">{item.overtime_hours.toFixed(1)}h</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Cuối tuần</p>
                                    <p className="font-bold text-orange-600">{item.weekend_hours.toFixed(1)}h</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs">Lễ</p>
                                    <p className="font-bold text-red-600">{item.holiday_hours.toFixed(1)}h</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center justify-center gap-1">
                                        <IconMoon className="h-3 w-3" /> Đêm
                                    </p>
                                    <p className="font-bold text-indigo-600">{item.night_hours.toFixed(1)}h</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Earnings */}
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="py-3 px-4">
                            <h4 className="font-medium text-green-800 flex items-center gap-2 mb-3">
                                <IconPlus className="h-4 w-4" />
                                Thu nhập ({formatCurrency(item.gross_salary)})
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Lương cơ bản (giờ thường × 100%)</span>
                                    <span className="font-medium">{formatCurrency(item.regular_pay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Tăng ca (× 150%)</span>
                                    <span className="font-medium text-purple-600">{formatCurrency(item.overtime_pay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Cuối tuần (× 200%)</span>
                                    <span className="font-medium text-orange-600">{formatCurrency(item.weekend_pay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Ngày lễ (× 300%)</span>
                                    <span className="font-medium text-red-600">{formatCurrency(item.holiday_pay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Đêm (+30%)</span>
                                    <span className="font-medium text-indigo-600">{formatCurrency(item.night_pay)}</span>
                                </div>

                                <div className="border-t pt-2 mt-2">
                                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phụ cấp</h5>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Phụ cấp ăn</span>
                                        <span className="font-medium">{formatCurrency(item.allowance_meal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Phụ cấp đi lại</span>
                                        <span className="font-medium">{formatCurrency(item.allowance_transport)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Thưởng</span>
                                        <span className="font-medium text-green-600">{formatCurrency(item.bonus)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Deductions */}
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="py-3 px-4">
                            <h4 className="font-medium text-red-800 flex items-center gap-2 mb-3">
                                <IconMinus className="h-4 w-4" />
                                Khấu trừ ({formatCurrency(item.total_deductions)})
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">BHXH, BHYT, BHTN</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(item.deduction_social_ins)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Tạm ứng</span>
                                    <span className="font-medium text-red-600">-{formatCurrency(item.deduction_advance)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Net Salary */}
                    <Card className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                        <CardContent className="py-4 px-4">
                            <div className="flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <IconCash className="h-6 w-6" />
                                    <span className="font-medium text-lg">THỰC NHẬN</span>
                                </div>
                                <span className="text-2xl font-bold">{formatCurrency(item.net_salary)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Vietnam Labor Law Reference */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                        <p className="font-medium flex items-center gap-1">
                            <IconSun className="h-3 w-3" />
                            Áp dụng Luật Lao động Việt Nam
                        </p>
                        <p className="mt-1">
                            Thường: 100% • Tăng ca: 150% • Cuối tuần: 200% • Lễ: 300% • Đêm (22h-6h): +30%
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
