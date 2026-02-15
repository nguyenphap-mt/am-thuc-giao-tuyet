'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
    generateProfessionalReport,
    saveExcelFile,
    type ReportSheet,
    type KpiCard,
    type ReportConfig as ProfessionalReportConfig,
} from '@/lib/excel-report-engine';

export type ExportFormat = 'excel' | 'csv' | 'pdf';

export interface ExportColumn {
    key: string;
    header: string;
    /** Optional transform for display value */
    format?: (value: unknown) => string;
}

export interface ExportConfig {
    /** Report title (appears as sheet name / PDF header) */
    title: string;
    /** Column definitions */
    columns: ExportColumn[];
    /** Row data */
    data: Record<string, unknown>[];
    /** Default filename (without extension) */
    filename: string;
    /** Professional multi-sheet config (uses ExcelJS engine) */
    sheets?: ReportSheet[];
    /** Date range string for report header */
    dateRange?: string;
    /** Custom logo URL (tenant dynamic logo) */
    logoUrl?: string;
}

/**
 * Save a Blob using File System Access API (showSaveFilePicker) 
 * with fallback to classic download for unsupported browsers. 
 */
async function saveBlob(
    blob: Blob,
    defaultFilename: string,
    acceptTypes: { description: string; accept: Record<string, string[]> }[]
): Promise<void> {
    // Try File System Access API first (Chrome 86+, Edge 86+)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: defaultFilename,
                types: acceptTypes,
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            // User cancelled the dialog
            if (err?.name === 'AbortError') {
                throw new Error('CANCELLED');
            }
            // API not supported or failed — fall through to legacy
        }
    }

    // Legacy fallback: auto-download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatValue(value: unknown, formatter?: (v: unknown) => string): string {
    if (formatter) return formatter(value);
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return String(value);
    return String(value);
}

/**
 * Export data as CSV
 */
async function exportCsv(config: ExportConfig): Promise<void> {
    const { columns, data, filename } = config;
    const headers = columns.map(c => c.header);

    const rows = data.map(row =>
        columns.map(col => {
            const val = formatValue(row[col.key], col.format);
            // Escape commas, quotes, newlines
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );

    const csvContent = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    await saveBlob(blob, `${filename}.csv`, [
        { description: 'CSV Files', accept: { 'text/csv': ['.csv'] } },
    ]);
}

/**
 * Export data as Excel (.xlsx)
 */
async function exportExcel(config: ExportConfig): Promise<void> {
    const { columns, data, filename, title } = config;

    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');

    // Build worksheet data
    const wsData = [
        columns.map(c => c.header),
        ...data.map(row =>
            columns.map(col => {
                const raw = row[col.key];
                if (col.format) return col.format(raw);
                return raw ?? '';
            })
        ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns
    const colWidths = columns.map((col, idx) => {
        const maxLen = Math.max(
            col.header.length,
            ...data.map(row => String(formatValue(row[col.key], col.format)).length)
        );
        return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31)); // Sheet name max 31 chars

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await saveBlob(blob, `${filename}.xlsx`, [
        { description: 'Excel Files', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
    ]);
}

/**
 * Format a number value for PDF display
 */
function formatPdfValue(value: unknown, format?: string): string {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (format === 'currency' && !isNaN(num)) {
        return num.toLocaleString('vi-VN') + ' ₫';
    }
    if (format === 'percent' && !isNaN(num)) {
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(1)}%`;
    }
    if (format === 'number' && !isNaN(num)) {
        return num.toLocaleString('vi-VN');
    }
    return String(value);
}

// ─── KPI Card Colors (RGB tuples) ───
type RGB = [number, number, number];
const KPI_COLORS: Record<string, { bg: RGB; text: RGB }> = {
    'E8F5E9': { bg: [232, 245, 233], text: [27, 125, 58] },
    'FCE4EC': { bg: [252, 228, 236], text: [198, 40, 40] },
    'F3E5F5': { bg: [243, 229, 245], text: [123, 31, 162] },
    'E3F2FD': { bg: [227, 242, 253], text: [21, 101, 192] },
};
const SECTION_BG: RGB = [103, 58, 183];
const SECTION_TEXT_COLOR: RGB = [255, 255, 255];

// Status map for PDF (matching Excel engine)
const PDF_STATUS_MAP: Record<string, { emoji: string; color: RGB; bg: RGB }> = {
    'Xuất sắc': { emoji: '⭐', color: [27, 125, 58], bg: [232, 245, 233] },
    'Tốt': { emoji: '✅', color: [27, 125, 58], bg: [232, 245, 233] },
    'Ổn định': { emoji: '🔵', color: [30, 136, 229], bg: [227, 242, 253] },
    'Cần theo dõi': { emoji: '⚠️', color: [198, 40, 40], bg: [252, 228, 236] },
};

/**
 * Build KPI summary cards using pure jsPDF drawing API.
 * Returns the updated Y position after the cards.
 */
function buildPdfKpiCards(
    doc: any,
    kpiCards: KpiCard[],
    startY: number,
    pageWidth: number,
    margin: number,
    fontName: string,
): number {
    if (!kpiCards || kpiCards.length === 0) return startY;

    const gap = 4;
    const cardCount = Math.min(kpiCards.length, 4);
    const totalWidth = pageWidth - 2 * margin;
    const cardW = (totalWidth - (cardCount - 1) * gap) / cardCount;
    const cardH = 28;
    const padding = 4;

    kpiCards.slice(0, 4).forEach((card, idx) => {
        const x = margin + idx * (cardW + gap);
        const y = startY;

        // Card background (rounded rect)
        const colorInfo = KPI_COLORS[card.bgColor || 'E8F5E9'];
        const bgColor = colorInfo?.bg || [240, 240, 240];
        const textColor = colorInfo?.text || [45, 45, 45];

        doc.setFillColor(...bgColor);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

        // Label (icon + text)
        doc.setFontSize(7);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(100, 100, 100);
        const icon = card.icon || '';
        doc.text(`${icon} ${card.label}`, x + padding, y + 7);

        // Value (large)
        doc.setFontSize(13);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(...textColor);
        const formattedValue = formatPdfValue(card.value, card.format);
        doc.text(formattedValue, x + padding, y + 17);

        // Trend line
        if (card.trend !== undefined) {
            doc.setFontSize(7);
            doc.setFont(fontName, 'normal');
            const trendVal = Number(card.trend) || 0;
            const arrow = trendVal > 0 ? '↑' : trendVal < 0 ? '↓' : '';
            const trendColor: RGB = trendVal > 0 ? [27, 125, 58] : trendVal < 0 ? [198, 40, 40] : [100, 100, 100];
            doc.setTextColor(...trendColor);
            const sign = trendVal > 0 ? '+' : '';
            const trendText = `${arrow} ${sign}${trendVal.toFixed(1)}% ${card.trendLabel || 'so với tháng trước'}`;
            doc.text(trendText, x + padding, y + 24);
        }
    });

    return startY + cardH + 6;
}

/**
 * Export report data as PDF using jsPDF + jspdf-autotable (data-driven, no html2canvas).
 * This completely BYPASSES html2canvas and its CSS Color Level 4 incompatibility.
 */
async function exportPdf(
    _element: HTMLElement | null,
    filename: string,
    title: string,
    config?: ExportConfig
): Promise<void> {
    // Dynamic imports to reduce bundle size
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    // Register autoTable plugin on jsPDF constructor
    if (typeof autoTableModule.applyPlugin === 'function') {
        autoTableModule.applyPlugin(jsPDF as any);
    }

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    });

    // --- Load & register Roboto font for Vietnamese Unicode support ---
    // jsPDF's built-in Helvetica does NOT support Vietnamese diacritics.
    const FONT_NAME = 'Roboto';
    try {
        const [regularResp, boldResp] = await Promise.all([
            fetch('/fonts/Roboto-Regular.ttf'),
            fetch('/fonts/Roboto-Bold.ttf'),
        ]);
        if (regularResp.ok && boldResp.ok) {
            const [regularBuf, boldBuf] = await Promise.all([
                regularResp.arrayBuffer(),
                boldResp.arrayBuffer(),
            ]);
            // Convert ArrayBuffer → base64 string
            const toBase64 = (buf: ArrayBuffer) =>
                btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));

            const regularB64 = toBase64(regularBuf);
            const boldB64 = toBase64(boldBuf);

            // Register fonts in jsPDF's VFS
            doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
            doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');

            doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
            doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');

            // Set Roboto as default font
            doc.setFont(FONT_NAME, 'normal');
        }
    } catch {
        // Fallback to helvetica if font loading fails
        console.warn('Could not load Roboto font, falling back to helvetica');
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // --- BRAND COLORS (matching Excel report engine) ---
    const BROWN: [number, number, number] = [139, 69, 19];     // #8B4513 SaddleBrown
    const WHITE: [number, number, number] = [255, 255, 255];
    const DARK_TEXT: [number, number, number] = [45, 45, 45];   // #2D2D2D
    const GRAY_TEXT: [number, number, number] = [100, 116, 139]; // #64748B
    const ALT_ROW: [number, number, number] = [240, 230, 212];  // #F0E6D4
    const SUMMARY_BG: [number, number, number] = [255, 243, 205]; // #FFF3CD
    const GREEN: [number, number, number] = [27, 125, 58];      // #1B7D3A
    const RED: [number, number, number] = [198, 40, 40];        // #C62828

    // --- Load logo ---
    try {
        const logoUrl = config?.logoUrl || '/Logo.png';
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            const logoBase64 = btoa(
                new Uint8Array(logoBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            doc.addImage(
                `data:image/png;base64,${logoBase64}`,
                'PNG', margin, currentY, 60, 22
            );
        }
    } catch {
        // Skip logo if unavailable
    }
    // --- Right-aligned date range next to logo ---
    const dateStr = config?.dateRange || `Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`;
    doc.setFontSize(9);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(dateStr, pageWidth - margin, currentY + 8, { align: 'right' });

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const exportTs = `Ngày xuất: ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    doc.text(exportTs, pageWidth - margin, currentY + 13, { align: 'right' });
    currentY += 25;

    // --- Brown separator line ---
    doc.setDrawColor(...BROWN);
    doc.setLineWidth(1);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    // --- Report title ---
    doc.setFontSize(16);
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...DARK_TEXT);
    doc.text(title, margin, currentY);
    currentY += 8;

    // --- Render sheets as tables ---
    const sheets = config?.sheets;
    if (sheets && sheets.length > 0) {
        for (let si = 0; si < sheets.length; si++) {
            const sheet = sheets[si];

            // Sheet title (if multiple sheets)
            if (sheets.length > 1) {
                doc.setFontSize(12);
                doc.setFont(FONT_NAME, 'bold');
                doc.setTextColor(...BROWN);
                doc.text(sheet.title, margin, currentY);
                currentY += 6;
            }

            // ─── KPI CARDS (before table) ───
            if (sheet.kpiCards && sheet.kpiCards.length > 0) {
                currentY = buildPdfKpiCards(doc, sheet.kpiCards, currentY, pageWidth, margin, FONT_NAME);
            }

            // Table headers
            const headers = sheet.columns.map(col => col.header);

            // Table body — with per-row format override
            const body = sheet.data.map((row) =>
                sheet.columns.map(col => {
                    // Per-row format override: check _format_{colKey}
                    const effectiveFormat = (row[`_format_${col.key}`] as string | undefined) || col.format;
                    return formatPdfValue(row[col.key], effectiveFormat);
                })
            );

            // Summary row
            if (sheet.summaryRow && sheet.data.length > 0) {
                const summaryRow = sheet.columns.map((col, idx) => {
                    if (idx === 0) return 'TỔNG CỘNG';
                    if (col.format === 'currency' || col.format === 'number') {
                        const sum = sheet.data.reduce(
                            (acc, r) => acc + (Number(r[col.key]) || 0), 0
                        );
                        return formatPdfValue(sum, col.format);
                    }
                    return '';
                });
                body.push(summaryRow);
            }

            // Section row key (for detecting section header rows)
            const sectionKey = sheet.sectionRowKey || '_isSectionHeader';

            // Generate table using jspdf-autotable
            (doc as any).autoTable({
                startY: currentY,
                head: [headers],
                body: body,
                margin: { left: margin, right: margin },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    lineColor: [210, 180, 140] as any, // Tan border
                    lineWidth: 0.3,
                    textColor: DARK_TEXT,
                    font: FONT_NAME,
                },
                headStyles: {
                    fillColor: BROWN,
                    textColor: WHITE,
                    fontStyle: 'bold',
                    fontSize: 9,
                    halign: 'center',
                },
                bodyStyles: {
                    fillColor: WHITE,
                },
                alternateRowStyles: {
                    fillColor: ALT_ROW,
                },
                columnStyles: sheet.columns.reduce((acc, col, idx) => {
                    const align = col.alignment || (
                        col.format === 'currency' || col.format === 'number' || col.format === 'percent'
                            ? 'right' : 'left'
                    );
                    acc[idx] = { halign: align as any };
                    return acc;
                }, {} as Record<number, any>),
                // Enhanced cell styling: summary, percent, status, section headers
                didParseCell: (data: any) => {
                    if (data.section !== 'body') return;
                    const rowIdx = data.row.index;
                    const colIdx = data.column.index;
                    const colDef = sheet.columns[colIdx];
                    const rowData = sheet.data[rowIdx];
                    if (!rowData || !colDef) return;

                    // 1) Summary row
                    if (sheet.summaryRow && rowIdx === body.length - 1) {
                        data.cell.styles.fillColor = SUMMARY_BG;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 10;
                        return;
                    }

                    // 2) Section header rows (purple bg, white text)
                    if (rowData[sectionKey] === true) {
                        data.cell.styles.fillColor = SECTION_BG;
                        data.cell.styles.textColor = SECTION_TEXT_COLOR;
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 10;
                        return;
                    }

                    // 3) Status column
                    const effectiveFormat = (rowData[`_format_${colDef.key}`] as string | undefined) || colDef.format;
                    if (effectiveFormat === 'status') {
                        const statusText = String(rowData[colDef.key] || '');
                        const statusInfo = PDF_STATUS_MAP[statusText];
                        if (statusInfo) {
                            data.cell.text = [`${statusInfo.emoji} ${statusText}`];
                            data.cell.styles.textColor = statusInfo.color;
                            data.cell.styles.fillColor = statusInfo.bg;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }

                    // 4) Percent column — colored trend arrows
                    if (effectiveFormat === 'percent') {
                        const rawVal = Number(rowData[colDef.key]);
                        if (!isNaN(rawVal)) {
                            const arrow = rawVal > 0 ? '↑ ' : rawVal < 0 ? '↓ ' : '';
                            data.cell.text = [`${arrow}${data.cell.text[0] || ''}`];
                            data.cell.styles.textColor = rawVal > 0 ? GREEN : rawVal < 0 ? RED : GRAY_TEXT;
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;

            // Add new page if needed for next sheet
            if (si < sheets.length - 1 && currentY > pageHeight - 30) {
                doc.addPage();
                currentY = margin;
            }
        }
    } else if (config) {
        // Fallback: use basic columns/data
        const headers = config.columns.map(c => c.header);
        const body = config.data.map(row =>
            config.columns.map(col => formatValue(row[col.key], col.format))
        );

        (doc as any).autoTable({
            startY: currentY,
            head: [headers],
            body: body,
            margin: { left: margin, right: margin },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                lineColor: [210, 180, 140] as any,
                lineWidth: 0.3,
                textColor: DARK_TEXT,
            },
            headStyles: {
                fillColor: BROWN,
                textColor: WHITE,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: ALT_ROW,
            },
        });
    }

    // --- Footer on each page ---
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(...GRAY_TEXT);
        doc.text(
            `Trang ${p}/${totalPages}  |  Ẩm Thực Giao Tuyết ERP`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
    }

    // --- Output as Blob ---
    const pdfBlob = doc.output('blob');
    await saveBlob(pdfBlob, `${filename}.pdf`, [
        { description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } },
    ]);
}

/**
 * Hook: useReportExport
 * Provides export functionality for any report tab
 */
export function useReportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

    const exportData = useCallback(async (
        format: ExportFormat,
        config: ExportConfig,
        pdfElement?: HTMLElement | null
    ) => {
        setIsExporting(true);
        setExportFormat(format);

        try {
            switch (format) {
                case 'csv':
                    await exportCsv(config);
                    toast.success('Xuất file CSV thành công!');
                    break;
                case 'excel':
                    if (config.sheets && config.sheets.length > 0) {
                        // Use professional ExcelJS engine
                        const reportConfig: ProfessionalReportConfig = {
                            sheets: config.sheets,
                            filename: config.filename,
                            dateRange: config.dateRange,
                        };
                        const blob = await generateProfessionalReport(reportConfig);
                        await saveExcelFile(blob, config.filename);
                    } else {
                        // Fallback to basic xlsx export
                        await exportExcel(config);
                    }
                    toast.success('Xuất file Excel thành công!');
                    break;
                case 'pdf':
                    await exportPdf(pdfElement ?? null, config.filename, config.title, config);
                    toast.success('Xuất file PDF thành công!');
                    break;
            }
        } catch (err: any) {
            if (err?.message === 'CANCELLED') {
                // User cancelled — do nothing
                return;
            }
            console.error('Export error:', err);
            toast.error(`Lỗi khi xuất file: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
            setExportFormat(null);
        }
    }, []);

    return {
        isExporting,
        exportFormat,
        exportData,
    };
}
