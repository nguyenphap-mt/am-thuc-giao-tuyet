'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { IconX } from '@tabler/icons-react';

interface RejectReasonDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employeeName: string;
    onConfirm: (reason: string) => void;
    isPending?: boolean;
}

export default function RejectReasonDialog({
    open,
    onOpenChange,
    employeeName,
    onConfirm,
    isPending,
}: RejectReasonDialogProps) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        const finalReason = reason.trim() || 'Không phù hợp';
        onConfirm(finalReason);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <IconX className="h-5 w-5" />
                        Từ chối đơn nghỉ phép
                    </DialogTitle>
                    <DialogDescription>
                        Từ chối đơn nghỉ phép của <strong>{employeeName}</strong>. Vui lòng nhập lý do để nhân viên biết.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Lý do từ chối <span className="text-gray-400">(tùy chọn)</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập lý do từ chối..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400
                            placeholder:text-gray-400 resize-none"
                        autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Để trống sẽ mặc định: &quot;Không phù hợp&quot;
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleClose} disabled={isPending}>
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
