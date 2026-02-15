'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    IconCheck, IconSend, IconPrinter, IconFileText,
    IconFileSpreadsheet, IconLoader2,
} from '@tabler/icons-react';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { QuotePrintPreview } from '@/components/quote';
import type { QuotePrintData } from '@/components/quote/QuotePrintPreview';
import { exportQuotePdf } from '@/lib/quote-pdf-engine';
import { exportQuoteExcel } from '@/lib/quote-excel-engine';
import { WizardState, WizardMode } from './quote-wizard-types';

interface Props {
    state: WizardState;
    mode: WizardMode;
    isPending: boolean;
    onSubmit: () => void;
    onSaveDraft: () => void;
}

export function StepSubmit({ state, mode, isPending, onSubmit, onSaveDraft }: Props) {
    const {
        formData, selectedItemsData, serviceItems, staffItems,
        selectedServices, staffCount,
        tableCount, menuTotal, menuTotalWithTables, serviceTotal,
        furnitureDiscountAmount, staffDiscountAmount, orderDiscountAmount,
        subtotal, includeVat, vatAmount, grandTotal,
    } = state;

    const { user } = useAuthStore();
    const printRef = useRef<HTMLDivElement>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const printData: QuotePrintData = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || undefined,
        event_address: formData.event_address,
        event_type: formData.event_type,
        event_date: formData.event_date,
        event_time: formData.event_time,
        table_count: tableCount,
        guest_count: formData.guest_count ? parseInt(formData.guest_count) : undefined,
        menuItems: selectedItemsData.map(item => ({
            id: item.id,
            name: item.name,
            selling_price: typeof item.selling_price === 'string'
                ? parseFloat(item.selling_price) : item.selling_price,
        })),
        services: serviceItems.filter(s => (selectedServices[s.id] || 0) > 0).map(s => ({
            id: s.id, name: s.name, pricePerUnit: s.pricePerUnit, unit: s.unit,
            quantity: selectedServices[s.id] || 0,
        })),
        staffCount,
        staffPricePerUnit: staffItems.length > 0 ? staffItems[0].pricePerUnit : 0,
        menuTotalPerTable: menuTotal,
        menuTotalWithTables,
        serviceTotal,
        furnitureDiscountAmount,
        staffDiscountAmount,
        orderDiscountAmount,
        subtotal,
        includeVat,
        vatAmount,
        grandTotal,
        notes: formData.notes || undefined,
        staff: user ? { full_name: user.full_name, email: user.email } : undefined,
    };

    const handlePrint = async () => {
        try { await exportQuotePdf(printData); }
        catch (err: any) { if (err?.message !== 'CANCELLED') console.error('Error exporting PDF:', err); }
    };

    const handleExportExcel = async () => {
        try { await exportQuoteExcel(printData); }
        catch (err: any) { if (err?.message !== 'CANCELLED') console.error('Error exporting Excel:', err); }
    };

    const submitLabel = mode === 'create' ? 'Xác nhận báo giá' : 'Cập nhật báo giá';
    const pendingLabel = mode === 'create' ? 'Đang tạo…' : 'Đang lưu…';

    return (
        <>
            <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <IconCheck className="h-10 w-10 text-green-600" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sẵn sàng tạo báo giá</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Tổng giá trị: <strong className="text-purple-600">{formatCurrency(grandTotal)}</strong>
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Đơn giá: <strong>{formatCurrency(tableCount > 0 ? Math.round(grandTotal / tableCount) : 0)}/bàn</strong> ({tableCount} bàn)
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                    <Button variant="outline" onClick={() => setShowPrintPreview(true)}
                        className="border-purple-300 text-purple-600 hover:bg-purple-50">
                        <IconPrinter className="mr-2 h-4 w-4" /> In Báo Giá
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel}
                        className="border-green-300 text-green-600 hover:bg-green-50">
                        <IconFileSpreadsheet className="mr-2 h-4 w-4" /> Xuất Excel
                    </Button>
                    <Button variant="outline" onClick={onSaveDraft} disabled={isPending}>
                        <IconFileText className="mr-2 h-4 w-4" /> Lưu Nháp
                    </Button>
                    <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                        onClick={onSubmit} disabled={isPending}>
                        {isPending ? (
                            <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" />{pendingLabel}</>
                        ) : (
                            <><IconSend className="mr-2 h-4 w-4" />{submitLabel}</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Print Preview Dialog */}
            <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
                <DialogContent className="min-w-[960px] max-w-[98vw] max-h-[90vh] overflow-y-auto p-4">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconPrinter className="h-5 w-5" /> Xem trước Báo Giá
                        </DialogTitle>
                    </DialogHeader>
                    <div className="border rounded-lg overflow-x-auto bg-gray-100 dark:bg-gray-800 p-4 flex justify-center">
                        <QuotePrintPreview ref={printRef} data={printData} />
                    </div>
                    <DialogFooter className="no-print">
                        <Button variant="outline" onClick={() => setShowPrintPreview(false)}>Đóng</Button>
                        <Button variant="outline" onClick={handleExportExcel}
                            className="border-green-300 text-green-600 hover:bg-green-50">
                            <IconFileSpreadsheet className="mr-2 h-4 w-4" /> Xuất Excel
                        </Button>
                        <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"
                            onClick={handlePrint}>
                            <IconPrinter className="mr-2 h-4 w-4" /> In / Xuất PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
