'use client';

import html2pdf from 'html2pdf.js';

export interface ExportPdfOptions {
    filename?: string;
    margin?: number | [number, number] | [number, number, number, number];
    pageSize?: 'A4' | 'letter';
    orientation?: 'portrait' | 'landscape';
}

/**
 * Export an HTML element to PDF file
 * @param element - The HTML element to convert to PDF
 * @param options - PDF export options
 */
export async function exportToPdf(
    element: HTMLElement,
    options: ExportPdfOptions = {}
): Promise<void> {
    const {
        filename = `bao-gia-${Date.now()}.pdf`,
        margin = 10,
        pageSize = 'A4',
        orientation = 'portrait',
    } = options;

    const opt = {
        margin,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            onclone: (clonedDoc: Document) => {
                // Remove all global styles to prevent html2canvas from parsing unsupported properties (e.g., oklch/lab)
                // This fixes the "unsupported color function" error
                Array.from(clonedDoc.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach((el) => {
                    el.remove();
                });
            },
        },
        jsPDF: {
            unit: 'mm' as const,
            format: pageSize.toLowerCase(),
            orientation,
        },
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (error) {
        console.error('Error exporting PDF:', error);
        throw error;
    }
}

/**
 * Generate a quote PDF filename based on quote code and date
 * Format: {quoteCode}-{DDMMYYYY}.pdf
 * Example: BG20241001001-01102024.pdf
 */
export function generateQuoteFilename(customerName: string, eventDate?: string, quoteCode?: string): string {
    const dateObj = eventDate ? new Date(eventDate) : new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}${month}${year}`;

    // If quote code is provided, use it. Otherwise generate a temp one.
    const code = quoteCode || `BG${year}${month}${day}`;

    // Sanitize to ensure valid filename
    const safeCode = code.replace(/[^a-zA-Z0-9-]/g, '');

    return `${safeCode}-${dateStr}.pdf`;
}
