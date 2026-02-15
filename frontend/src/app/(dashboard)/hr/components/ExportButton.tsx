'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconDownload, IconFileSpreadsheet, IconFileText, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ExportButtonProps {
    /** API endpoint path for export (e.g., '/hr/payroll/periods/{id}/export') */
    endpoint: string;
    /** Filename prefix (e.g., 'payroll_jan2026') */
    filename: string;
    /** Button size variant */
    size?: 'default' | 'sm' | 'lg' | 'icon';
    /** Button label (default: 'Xuất') */
    label?: string;
    /** Disabled state */
    disabled?: boolean;
}

export default function ExportButton({
    endpoint,
    filename,
    size = 'sm',
    label = 'Xuất',
    disabled = false,
}: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (format: 'excel' | 'pdf') => {
        setIsExporting(true);
        try {
            const response = await fetch(`/api${endpoint}?format=${format}`, {
                method: 'GET',
                headers: {
                    'Accept': format === 'excel'
                        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        : 'application/pdf',
                },
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`Xuất file ${format.toUpperCase()} thành công!`);
        } catch (error: any) {
            console.error('Export error:', error);
            toast.error(`Lỗi khi xuất file: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size={size}
                    variant="outline"
                    disabled={disabled || isExporting}
                    className="gap-1"
                >
                    {isExporting ? (
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <IconDownload className="h-4 w-4" />
                    )}
                    {size !== 'icon' && label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <IconFileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <IconFileText className="h-4 w-4 mr-2 text-red-600" />
                    PDF (.pdf)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
