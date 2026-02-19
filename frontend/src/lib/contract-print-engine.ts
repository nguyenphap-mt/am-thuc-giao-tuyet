// ═══════════════════════════════════════════════════════════════
// Contract Print Engine — Word Template approach
// Downloads a .docx contract from backend API.
// Backend uses the Word template ('HDDV Giao Tuyet Template.docx')
// with actual order data filled in.
// ═══════════════════════════════════════════════════════════════

import apiClient from './api';

export interface ContractPrintData {
    orderId: string;
    orderCode: string;
}

/**
 * Download the generated contract .docx file from the backend.
 * The backend fills in the Word template with actual order data.
 */
export async function printContract(data: ContractPrintData): Promise<void> {
    try {
        const response = await apiClient.get(
            `/orders/${data.orderId}/contract-docx`,
            { responseType: 'blob' }
        );

        const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        const safeCode = data.orderCode.replace(/[^a-zA-Z0-9-]/g, '');
        const filename = `HopDong-${safeCode}.docx`;

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
        console.error('Contract generation failed:', err);
        throw err;
    }
}
