// ═══════════════════════════════════════════════════════════════
// Menu Print Engine v5 — Word Template approach
// Downloads a .docx menu card from backend API.
// Backend uses the Word template ('menu mẫu.docx') with actual
// dish names filled in, preserving all ornamental borders.
// ═══════════════════════════════════════════════════════════════

import apiClient from './api';

export interface MenuPrintData {
    orderId: string;
    orderCode: string;
}

/**
 * Download the generated menu .docx file from the backend.
 * The backend fills in the Word template with actual order items.
 */
export async function printMenuA5(data: MenuPrintData): Promise<void> {
    try {
        const response = await apiClient.get(
            `/orders/${data.orderId}/menu-docx`,
            { responseType: 'blob' }
        );

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const safeCode = data.orderCode.replace(/[^a-zA-Z0-9-]/g, '');
        const filename = `ThucDon-${safeCode}.docx`;

        // Try native file picker first
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [
                        {
                            description: 'Word Documents',
                            accept: {
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                                    ['.docx'],
                            },
                        },
                    ],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err: any) {
                if (err?.name === 'AbortError') throw new Error('CANCELLED');
                // fallthrough to auto-download
            }
        }

        // Fallback: auto-download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err: any) {
        if (err?.message === 'CANCELLED') return;
        console.error('Menu generation failed:', err);
        throw err;
    }
}
