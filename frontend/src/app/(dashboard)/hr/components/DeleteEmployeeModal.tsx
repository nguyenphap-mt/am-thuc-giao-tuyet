'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { IconAlertTriangle, IconLoader2, IconTrash } from '@tabler/icons-react';
import { Employee } from '@/types';

interface DeleteEmployeeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
}

export default function DeleteEmployeeModal({
    open,
    onOpenChange,
    employee,
}: DeleteEmployeeModalProps) {
    const queryClient = useQueryClient();

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!employee) throw new Error('No employee selected');
            return api.delete(`/hr/employees/${employee.id}`);
        },
        onSuccess: () => {
            toast.success(`Đã xóa nhân viên "${employee?.full_name}" thành công`);
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            onOpenChange(false);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Không thể xóa nhân viên');
        },
    });

    const handleDelete = () => {
        deleteMutation.mutate();
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <IconAlertTriangle className="h-5 w-5" />
                        Xác nhận xóa nhân viên
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        Bạn có chắc chắn muốn xóa nhân viên này? Hành động này sẽ vô hiệu hóa tài khoản nhân viên.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-medium shrink-0">
                                {employee.full_name?.charAt(0) || 'N'}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{employee.full_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {employee.role_type || employee.position || 'N/A'} • {employee.phone || 'Chưa có SĐT'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={deleteMutation.isPending}
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang xóa...
                            </>
                        ) : (
                            <>
                                <IconTrash className="mr-2 h-4 w-4" />
                                Xóa nhân viên
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
