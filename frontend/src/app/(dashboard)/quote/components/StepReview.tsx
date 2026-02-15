'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconToolsKitchen2, IconNotes, IconDiscount, IconPercentage } from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { WizardState, EVENT_TYPES } from './quote-wizard-types';

interface Props {
    state: WizardState;
    onGoToStep?: (step: number) => void;
}

export function StepReview({ state, onGoToStep }: Props) {
    const {
        formData, handleChange,
        selectedItems, selectedItemsData,
        serviceItems, staffItems,
        selectedServices, staffCount,
        discountFurniture, setDiscountFurniture,
        discountStaff, setDiscountStaff,
        discountOrder, setDiscountOrder,
        includeVat, setIncludeVat,
        selectedQuoteNote, setSelectedQuoteNote,
        notePresets, notesLoading,
        tableCount, menuTotalWithTables,
        profitAnalysis,
        serviceTotal, furnitureDiscountAmount, staffDiscountAmount, orderDiscountAmount,
        subtotal, vatAmount, grandTotal,
    } = state;

    const editLink = (step: number, label: string) => onGoToStep ? (
        <button type="button" onClick={() => onGoToStep(step)}
            className="text-xs text-purple-600 hover:text-purple-800 ml-2 underline">Sửa {label}</button>
    ) : null;

    return (
        <div className="space-y-6">
            {/* Event Summary */}
            <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center justify-between">
                    Thông tin tiệc
                    {editLink(1, '')}
                </h4>
                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Khách hàng:</dt>
                        <dd className="font-medium">{formData.customer_name}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Loại tiệc:</dt>
                        <dd>{EVENT_TYPES.find(t => t.value === formData.event_type)?.label}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Ngày tiệc:</dt>
                        <dd>{formData.event_date}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Giờ:</dt>
                        <dd>{formData.event_time}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Số bàn:</dt>
                        <dd>{tableCount}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Địa điểm:</dt>
                        <dd className="text-right max-w-[200px] truncate">{formData.event_address}</dd>
                    </div>
                </dl>
            </div>

            {/* Notes Dropdown */}
            <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <IconNotes className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    Ghi chú báo giá
                </h4>
                <Select value={selectedQuoteNote} onValueChange={(value) => {
                    setSelectedQuoteNote(value);
                    if (value !== '__custom__') handleChange('notes', value);
                }} disabled={notesLoading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={notesLoading ? "Đang tải ghi chú..." : "Chọn ghi chú có sẵn hoặc nhập mới..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {notePresets.map((note: any) => (
                            <SelectItem key={note.id} value={note.content}>{note.content}</SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-purple-600 font-medium">✏️ Nhập ghi chú khác...</SelectItem>
                    </SelectContent>
                </Select>
                {selectedQuoteNote === '__custom__' && (
                    <div className="mt-3">
                        <Label htmlFor="custom_quote_note" className="text-sm text-gray-600 dark:text-gray-400">Nhập ghi chú của bạn:</Label>
                        <Textarea id="custom_quote_note" placeholder="Nhập ghi chú tùy ý cho báo giá này..."
                            value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)}
                            className="mt-2 min-h-[100px] resize-none" rows={3} />
                    </div>
                )}
                {selectedQuoteNote && selectedQuoteNote !== '__custom__' && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-purple-50 p-2 rounded">
                        <strong>Ghi chú đã chọn:</strong> {selectedQuoteNote}
                    </p>
                )}
            </div>

            {/* Profit Analysis + Cost Summary */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <IconToolsKitchen2 className="h-5 w-5 text-purple-600" />
                        Tổng hợp Chi phí & Lợi nhuận
                    </h4>
                </div>

                <div className="p-4 space-y-6">
                    {/* Profit Analysis Table */}
                    <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Phân tích lợi nhuận thực đơn ({selectedItems.length} món)
                            {editLink(2, 'món')}
                        </h5>
                        {selectedItemsData.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Chưa chọn món nào</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800 border-b">
                                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">#</th>
                                            <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Tên món</th>
                                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Giá bán</th>
                                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Giá gốc</th>
                                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Lợi nhuận</th>
                                            <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {profitAnalysis.items.map((item, idx) => (
                                            <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                                                <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(Number(item.selling_price))}</td>
                                                <td className="py-2 px-3 text-right text-gray-500 dark:text-gray-400">{formatCurrency(Number(item.cost_price))}</td>
                                                <td className="py-2 px-3 text-right font-medium text-green-600">{formatCurrency(Number(item.profit))}</td>
                                                <td className="py-2 px-3 text-right text-green-600">{item.profitPercent.toFixed(0)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                            <td colSpan={2} className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Tổng/bàn:</td>
                                            <td className="py-2 px-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrency(profitAnalysis.perTableSelling)}</td>
                                            <td className="py-2 px-3 text-right font-medium text-gray-500 dark:text-gray-400">{formatCurrency(profitAnalysis.perTableCost)}</td>
                                            <td className="py-2 px-3 text-right font-bold text-green-600">{formatCurrency(profitAnalysis.perTableProfit)}</td>
                                            <td className="py-2 px-3 text-right font-bold text-green-600">
                                                {profitAnalysis.perTableProfit > 0 && profitAnalysis.perTableCost > 0
                                                    ? ((profitAnalysis.perTableProfit / profitAnalysis.perTableCost) * 100).toFixed(0) : 0}%
                                            </td>
                                        </tr>
                                        <tr className="bg-purple-50 border-t-2 border-purple-200">
                                            <td colSpan={2} className="py-3 px-3 font-bold text-purple-900">TỔNG THỰC ĐƠN ({tableCount} bàn):</td>
                                            <td className="py-3 px-3 text-right font-bold text-purple-700">{formatCurrency(profitAnalysis.totalSelling)}</td>
                                            <td className="py-3 px-3 text-right font-bold text-gray-600 dark:text-gray-400">{formatCurrency(profitAnalysis.totalCost)}</td>
                                            <td className="py-3 px-3 text-right font-bold text-green-700 text-base">{formatCurrency(profitAnalysis.totalProfit)}</td>
                                            <td className="py-3 px-3 text-right font-bold text-green-700">{profitAnalysis.profitPercent.toFixed(0)}%</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Cost Summary */}
                    <div className="border-t pt-4">
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Tổng hợp chi phí
                            {editLink(3, 'DV')}
                        </h5>
                        <dl className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-500 dark:text-gray-400">Thực đơn ({tableCount} bàn):</dt>
                                <dd className="font-medium">{formatCurrency(menuTotalWithTables)}</dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="text-gray-500 dark:text-gray-400 mb-2">Dịch vụ thêm:</dt>
                                <dd className="space-y-1 pl-4">
                                    {serviceItems.filter(s => (selectedServices[s.id] || 0) > 0).map(service => {
                                        const qty = selectedServices[service.id];
                                        const total = qty * service.pricePerUnit;
                                        return (
                                            <div key={service.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                                <span>{service.name} x{qty} ({formatCurrency(service.pricePerUnit)}/{service.unit})</span>
                                                <span className="font-medium">{formatCurrency(total)}</span>
                                            </div>
                                        );
                                    })}
                                    {staffCount > 0 && staffItems.map(staff => (
                                        <div key={staff.id} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span>{staff.name} x{staffCount} ({formatCurrency(staff.pricePerUnit)}/{staff.unit})</span>
                                            <span className="font-medium">{formatCurrency(staffCount * staff.pricePerUnit)}</span>
                                        </div>
                                    ))}
                                    {serviceTotal > 0 && (
                                        <div className="flex justify-between pt-1 border-t border-dashed border-gray-300 dark:border-gray-600 mt-1">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Tổng dịch vụ:</span>
                                            <span className="font-medium">{formatCurrency(serviceTotal)}</span>
                                        </div>
                                    )}
                                    {serviceTotal === 0 && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">Chưa chọn dịch vụ nào</span>
                                    )}
                                </dd>
                            </div>

                            {/* Discount Section */}
                            <div className="border-t pt-3 mt-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <IconDiscount className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium text-gray-700 dark:text-gray-300">Giảm giá</span>
                                </div>
                                {[
                                    { id: 'discount_furniture', label: 'Bàn ghế, khung rạp:', value: discountFurniture, setter: setDiscountFurniture, amount: furnitureDiscountAmount },
                                    { id: 'discount_staff', label: 'Nhân viên phục vụ:', value: discountStaff, setter: setDiscountStaff, amount: staffDiscountAmount },
                                    { id: 'discount_order', label: 'Giảm giá đơn hàng:', value: discountOrder, setter: setDiscountOrder, amount: orderDiscountAmount },
                                ].map(d => (
                                    <div key={d.id} className="flex items-center justify-between py-2">
                                        <label htmlFor={d.id} className="text-gray-600 dark:text-gray-400 flex-1">{d.label}</label>
                                        <div className="flex items-center gap-2">
                                            <div className="relative w-20">
                                                <Input id={d.id} type="number" inputMode="numeric" min="0" max="100"
                                                    value={d.value}
                                                    onChange={(e) => d.setter(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                                    className="pr-6 text-right h-8" />
                                                <IconPercentage className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 dark:text-gray-500" />
                                            </div>
                                            {d.amount > 0 && (
                                                <span className="text-green-600 text-xs w-24 text-right">-{formatCurrency(d.amount)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subtotal and VAT */}
                            <div className="border-t pt-3 mt-3">
                                <div className="flex justify-between py-1">
                                    <dt className="text-gray-500 dark:text-gray-400">Tạm tính:</dt>
                                    <dd className="font-medium">{formatCurrency(subtotal)}</dd>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2">
                                        <Switch id="include_vat" checked={includeVat} onCheckedChange={setIncludeVat} />
                                        <label htmlFor="include_vat" className="text-gray-600 dark:text-gray-400 cursor-pointer">Tính VAT (10%):</label>
                                    </div>
                                    <dd className={includeVat ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}>{formatCurrency(vatAmount)}</dd>
                                </div>
                            </div>

                            {/* Grand Total */}
                            <div className="border-t-2 border-purple-200 pt-4 mt-3 bg-gradient-to-r from-purple-50 to-pink-50 -mx-4 px-4 pb-4 rounded-b-lg">
                                <div className="flex justify-between text-xl font-bold">
                                    <dt className="text-purple-900">TỔNG CỘNG:</dt>
                                    <dd className="text-purple-600">{formatCurrency(grandTotal)}</dd>
                                </div>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
