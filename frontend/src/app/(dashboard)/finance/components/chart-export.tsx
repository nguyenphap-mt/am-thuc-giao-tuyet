'use client';

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IconDownload, IconPhoto, IconTable, IconCopy, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';

export interface ChartExportProps {
    chartRef: React.RefObject<HTMLDivElement>;
    data: Record<string, unknown>[];
    filename?: string;
}

export function useChartExport() {
    const chartRef = useRef<HTMLDivElement>(null);

    const exportToPng = useCallback(async (filename: string = 'chart') => {
        if (!chartRef.current) {
            toast.error('Không tìm thấy chart để export');
            return;
        }

        try {
            // Dynamic import to avoid bundle size
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
            });

            const link = document.createElement('a');
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast.success('Đã xuất biểu đồ thành công!');
        } catch {
            toast.error('Lỗi khi xuất biểu đồ');
        }
    }, []);

    const exportToCsv = useCallback((data: Record<string, unknown>[], filename: string = 'data') => {
        if (!data || data.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }

        try {
            // Get headers from first row
            const headers = Object.keys(data[0]);

            // Build CSV content
            const csvContent = [
                headers.join(','),
                ...data.map(row =>
                    headers.map(header => {
                        const value = row[header];
                        // Escape commas and quotes
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`;
                        }
                        return value;
                    }).join(',')
                )
            ].join('\n');

            // Create and download file
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            toast.success('Đã xuất dữ liệu CSV thành công!');
        } catch {
            toast.error('Lỗi khi xuất CSV');
        }
    }, []);

    const copyToClipboard = useCallback(async (data: Record<string, unknown>[]) => {
        if (!data || data.length === 0) {
            toast.error('Không có dữ liệu để sao chép');
            return;
        }

        try {
            const headers = Object.keys(data[0]);
            const textContent = [
                headers.join('\t'),
                ...data.map(row => headers.map(h => row[h]).join('\t'))
            ].join('\n');

            await navigator.clipboard.writeText(textContent);
            toast.success('Đã sao chép vào clipboard!');
        } catch {
            toast.error('Lỗi khi sao chép');
        }
    }, []);

    return {
        chartRef,
        exportToPng,
        exportToCsv,
        copyToClipboard,
    };
}

interface ChartExportButtonProps {
    onExportPng: () => void;
    onExportCsv: () => void;
    onCopy: () => void;
    className?: string;
}

export function ChartExportButton({ onExportPng, onExportCsv, onCopy, className }: ChartExportButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className={className}>
                    <IconDownload className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportPng}>
                    <IconPhoto className="h-4 w-4 mr-2" />
                    Xuất PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportCsv}>
                    <IconTable className="h-4 w-4 mr-2" />
                    Xuất CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopy}>
                    <IconCopy className="h-4 w-4 mr-2" />
                    Sao chép dữ liệu
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
