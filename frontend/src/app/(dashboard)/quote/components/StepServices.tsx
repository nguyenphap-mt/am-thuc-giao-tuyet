'use client';

import { Input } from '@/components/ui/input';
import { IconBuildingStore, IconUsers } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { WizardState } from './quote-wizard-types';

interface Props {
    state: WizardState;
}

export function StepServices({ state }: Props) {
    const {
        serviceItems, staffItems,
        selectedServices, updateServiceQuantity,
        staffCount, setStaffCount, serviceTotal,
    } = state;

    return (
        <div className="space-y-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Dịch vụ thêm
            </h3>

            {/* Equipment Services (BAN category - dynamic from menu) */}
            <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <IconBuildingStore className="h-4 w-4 text-purple-600" />
                    Bàn ghế &amp; Trang trí
                </h4>
                <div className="space-y-3">
                    {serviceItems.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-2">Chưa có dịch vụ nào trong thực đơn (danh mục BAN)</p>
                    ) : (
                        serviceItems.map((service) => (
                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex-1">
                                    <span className="font-medium">{service.name}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                        ({formatCurrency(service.pricePerUnit)}/{service.unit})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">x</span>
                                    <Input
                                        type="number" inputMode="numeric" min="0" max="100"
                                        value={selectedServices[service.id] || 0}
                                        onChange={(e) => updateServiceQuantity(service.id, parseInt(e.target.value) || 0)}
                                        className="w-20 text-center"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">
                                        = {formatCurrency((selectedServices[service.id] || 0) * service.pricePerUnit)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Staff Services (NV category - dynamic from menu) */}
            <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <IconUsers className="h-4 w-4 text-purple-600" />
                    Nhân viên phục vụ
                </h4>
                {staffItems.length === 0 ? (
                    <p className="text-sm text-gray-400 italic py-2">Chưa có dịch vụ nhân viên trong thực đơn (danh mục NV)</p>
                ) : (
                    staffItems.map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex-1">
                                <span className="font-medium">{staff.name}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({formatCurrency(staff.pricePerUnit)}/{staff.unit})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number" inputMode="numeric" min="0" max="50"
                                    value={staffCount}
                                    onChange={(e) => setStaffCount(parseInt(e.target.value) || 0)}
                                    className="w-20 text-center"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400 w-24 text-right">
                                    = {formatCurrency(staffCount * staff.pricePerUnit)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Service Total */}
            <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-medium">
                    <span>Tổng dịch vụ:</span>
                    <span className="text-purple-600">{formatCurrency(serviceTotal)}</span>
                </div>
            </div>
        </div>
    );
}
