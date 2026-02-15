'use client';

import ExcelJS from 'exceljs';

// ============ BRAND COLORS ============
const BRAND = {
    primary: '8B4513',        // SaddleBrown - from Logo
    headerText: 'FFFFFF',
    accent: 'A0522D',         // Sienna
    altRowBg: 'F0E6D4',       // Warm beige (stronger contrast)
    summaryBg: 'FFF3CD',      // Warm cream
    borderColor: 'D2B48C',    // Tan
    separatorColor: '8B4513', // Brown separator
    positive: '1B7D3A',       // Dark green
    negative: 'C62828',       // Dark red
    titleColor: '4A2600',     // Very dark brown
    subtitleColor: '6B7280',  // Gray
    white: 'FFFFFF',
    textDark: '2D2D2D',       // Near-black for data text
    // KPI Card backgrounds
    kpiGreenBg: 'E8F5E9',
    kpiRedBg: 'FCE4EC',
    kpiPurpleBg: 'F3E5F5',
    kpiBlueBg: 'E3F2FD',
    kpiAmberBg: 'FFF8E1',
    // Section header
    sectionBg: 'E0D4F5',     // Light purple
    sectionText: '4A148C',    // Deep purple
    // Status colors
    statusGood: '1B7D3A',
    statusWarning: 'F59E0B',
    statusNeutral: '3B82F6',
};

// ============ NUMBER FORMATS ============
const FORMAT: Record<string, string> = {
    currency: '#,##0" ₫"',
    percent: '+0.0%;-0.0%;0.0%',
    number: '#,##0',
    date: 'DD/MM/YYYY',
    text: '@',
};

// ============ TYPES ============
export type ColumnFormat = 'currency' | 'percent' | 'number' | 'text' | 'date' | 'status';
export type SummaryFn = 'sum' | 'avg' | 'count' | 'none';

export interface ColumnDef {
    key: string;
    header: string;
    width?: number;
    format?: ColumnFormat;
    alignment?: 'left' | 'center' | 'right';
    summaryFn?: SummaryFn;
}

export interface KpiCard {
    label: string;
    value: number;
    format: 'currency' | 'number';
    trend: number;
    trendLabel?: string;
    bgColor: string;
    valueColor: string;
    icon?: string;
}

export interface ReportSheet {
    name: string;
    title: string;
    subtitle?: string;
    columns: ColumnDef[];
    data: Record<string, unknown>[];
    summaryRow?: boolean;
    kpiCards?: KpiCard[];
    sectionRowKey?: string;
    statusMap?: Record<string, { emoji: string; color: string }>;
}

// Default status mapping
const DEFAULT_STATUS_MAP: Record<string, { emoji: string; color: string }> = {
    'Tốt': { emoji: '✅', color: '1B7D3A' },
    'Xuất sắc': { emoji: '⭐', color: '1B7D3A' },
    'Cần theo dõi': { emoji: '⚠️', color: 'F59E0B' },
    'Ổn định': { emoji: '🔵', color: '3B82F6' },
};

export interface ReportConfig {
    sheets: ReportSheet[];
    filename: string;
    dateRange?: string;
    logoUrl?: string;
}

// ============ HELPERS ============

function getNumFmt(format?: ColumnFormat): string | undefined {
    if (!format) return undefined;
    return FORMAT[format] || undefined;
}

function getAlignment(col: ColumnDef): Partial<ExcelJS.Alignment> {
    if (col.alignment) {
        return { horizontal: col.alignment, vertical: 'middle', wrapText: false };
    }
    if (col.format === 'currency' || col.format === 'number' || col.format === 'percent') {
        return { horizontal: 'right', vertical: 'middle', wrapText: false };
    }
    return { horizontal: 'left', vertical: 'middle', wrapText: false };
}

function thinBorder(color: string): Partial<ExcelJS.Borders> {
    const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: color } };
    return { top: side, bottom: side, left: side, right: side };
}

function calcSummary(data: Record<string, unknown>[], key: string, fn: SummaryFn): unknown {
    if (fn === 'none') return '';
    const nums = data.map(r => Number(r[key]) || 0);
    if (fn === 'sum') return nums.reduce((a, b) => a + b, 0);
    if (fn === 'avg') return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    if (fn === 'count') return nums.filter(n => n > 0).length;
    return '';
}

function autoWidth(col: ColumnDef, data: Record<string, unknown>[]): number {
    if (col.width) return col.width;
    const headerLen = col.header.length;
    const maxDataLen = Math.max(
        ...data.map(r => {
            const val = r[col.key];
            if (val === null || val === undefined) return 0;
            return String(val).length;
        }),
        0
    );
    const bonus = (col.format === 'currency') ? 8 : (col.format === 'percent') ? 4 : 2;
    return Math.max(Math.min(Math.max(headerLen, maxDataLen) + bonus + 2, 45), 15);
}

// ============ KPI CARDS BUILDER ============

function buildKpiCards(
    ws: ExcelJS.Worksheet,
    cards: KpiCard[],
    startRow: number,
    colCount: number,
): number {
    if (!cards || cards.length === 0) return startRow;

    const cardHeight = 3; // each card spans 3 rows
    const cardCols = Math.max(1, Math.floor(colCount / cards.length));

    // Set row heights for card area
    for (let r = startRow; r < startRow + cardHeight; r++) {
        ws.getRow(r).height = 22;
    }

    cards.forEach((card, i) => {
        const sc = i * cardCols + 1;
        const ec = Math.min((i + 1) * cardCols, colCount);

        // Fill ALL cells in merge range first (ExcelJS quirk for merged fills)
        for (let r = startRow; r < startRow + cardHeight; r++) {
            for (let c = sc; c <= ec; c++) {
                const fillCell = ws.getCell(r, c);
                fillCell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: card.bgColor },
                };
                fillCell.border = thinBorder(BRAND.borderColor);
            }
        }

        // Merge cells
        ws.mergeCells(startRow, sc, startRow + cardHeight - 1, ec);

        const cell = ws.getCell(startRow, sc);
        const trendSign = card.trend > 0 ? '↑' : card.trend < 0 ? '↓' : '';
        const formattedValue = card.format === 'currency'
            ? card.value.toLocaleString('vi-VN') + ' ₫'
            : card.value.toLocaleString('vi-VN');

        cell.value = {
            richText: [
                {
                    text: `${card.icon ? card.icon + ' ' : ''}${card.label}\n`,
                    font: { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.titleColor } },
                },
                {
                    text: `${formattedValue}\n`,
                    font: { name: 'Arial', size: 16, bold: true, color: { argb: card.valueColor } },
                },
                {
                    text: `${trendSign} ${Math.abs(card.trend).toFixed(1)}% ${card.trendLabel || 'so với tháng trước'}`,
                    font: { name: 'Arial', size: 9, color: { argb: card.valueColor } },
                },
            ],
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });

    return startRow + cardHeight;
}

// ============ MAIN EXPORT ============

export async function generateProfessionalReport(config: ReportConfig): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ẩm Thực Giao Tuyết ERP';
    workbook.created = new Date();

    // Load logo
    let logoImageId: number | null = null;
    try {
        const logoResponse = await fetch(config.logoUrl || '/Logo.png');
        if (logoResponse.ok) {
            const logoBuffer = await logoResponse.arrayBuffer();
            logoImageId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png',
            });
        }
    } catch {
        console.warn('Could not load logo for Excel report');
    }

    for (const sheet of config.sheets) {
        buildSheet(workbook, sheet, logoImageId, config.dateRange);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
}

// ============ BUILD SHEET ============

function buildSheet(
    workbook: ExcelJS.Workbook,
    sheet: ReportSheet,
    logoImageId: number | null,
    dateRange?: string,
) {
    const ws = workbook.addWorksheet(sheet.name.substring(0, 31), {
        properties: { defaultRowHeight: 20 },
        pageSetup: {
            paperSize: 9,
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.5, right: 0.5,
                top: 0.5, bottom: 0.5,
                header: 0.3, footer: 0.3,
            },
        },
    });

    const colCount = sheet.columns.length;
    let currentRow = 1;

    // Set column widths FIRST
    sheet.columns.forEach((col, idx) => {
        ws.getColumn(idx + 1).width = autoWidth(col, sheet.data);
    });

    // ─── SECTION 1: LOGO HEADER (Rows 1-3) ───
    // Logo already contains company name + slogan — NO text cells needed
    ws.getRow(1).height = 25;
    ws.getRow(2).height = 25;
    ws.getRow(3).height = 25;

    // White background for logo rows
    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= colCount; c++) {
            const cell = ws.getCell(r, c);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: BRAND.white },
            };
        }
    }

    // Add logo image spanning across header area
    if (logoImageId !== null) {
        // Logo is 1400×528px (wide horizontal) — place left-aligned spanning ~4 columns
        const logoEndCol = Math.min(colCount, 4);
        ws.addImage(logoImageId, {
            tl: { col: 0.1, row: 0.1 } as ExcelJS.Anchor,
            br: { col: logoEndCol - 0.1, row: 2.9 } as ExcelJS.Anchor,
            editAs: 'oneCell',
        });
    }

    // Right-aligned date range + export timestamp
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const exportTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const rightStart = Math.max(Math.ceil(colCount / 2) + 1, 5);
    if (rightStart <= colCount) {
        // Row 1: date range
        if (dateRange) {
            ws.mergeCells(1, rightStart, 1, colCount);
            const dateCell = ws.getCell(1, rightStart);
            dateCell.value = `Thời gian: ${dateRange}`;
            dateCell.font = { name: 'Arial', size: 10, color: { argb: BRAND.subtitleColor } };
            dateCell.alignment = { horizontal: 'right', vertical: 'top' };
        }
        // Row 2: export timestamp
        ws.mergeCells(2, rightStart, 2, colCount);
        const timeCell = ws.getCell(2, rightStart);
        timeCell.value = `Xuất lúc: ${exportTimestamp}`;
        timeCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: BRAND.subtitleColor } };
        timeCell.alignment = { horizontal: 'right', vertical: 'top' };
    }

    currentRow = 4;

    // ─── SECTION 2: BROWN SEPARATOR LINE (Row 4) ───
    ws.getRow(currentRow).height = 4;
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: BRAND.primary },
        };
    }
    currentRow++;

    // ─── SECTION 3: REPORT TITLE (Row 5) ───
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    const titleCell = ws.getCell(currentRow, 1);
    titleCell.value = sheet.title.toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: BRAND.titleColor } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(currentRow).height = 30;
    currentRow++;

    // ─── SECTION 4: SUBTITLE / DATE RANGE (Row 6) ───
    const subtitleText = sheet.subtitle || dateRange || '';
    if (subtitleText) {
        ws.mergeCells(currentRow, 1, currentRow, colCount);
        const subtitleCell = ws.getCell(currentRow, 1);
        subtitleCell.value = `Kỳ: ${subtitleText}`;
        subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: BRAND.subtitleColor } };
        subtitleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(currentRow).height = 22;
        currentRow++;
    }

    // ─── SECTION 5: SPACER ───
    ws.getRow(currentRow).height = 8;
    currentRow++;

    // ─── SECTION 5.5: KPI SUMMARY CARDS (optional) ───
    if (sheet.kpiCards && sheet.kpiCards.length > 0) {
        currentRow = buildKpiCards(ws, sheet.kpiCards, currentRow, colCount);
        // Spacer after cards
        ws.getRow(currentRow).height = 8;
        currentRow++;
    }

    // ─── SECTION 6: COLUMN HEADERS ───
    const headerRowNum = currentRow;
    const headerRow = ws.getRow(headerRowNum);
    headerRow.height = 28;

    sheet.columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.headerText } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: BRAND.primary },
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder(BRAND.primary);
    });

    currentRow++;

    // ─── FREEZE PANES below column headers ───
    ws.views = [{
        state: 'frozen',
        xSplit: 0,
        ySplit: headerRowNum,
        showGridLines: false,
    }];

    // ─── SECTION 7: DATA ROWS ───
    const statusMap = sheet.statusMap || DEFAULT_STATUS_MAP;
    const sectionKey = sheet.sectionRowKey || '_isSectionHeader';

    sheet.data.forEach((row, rowIdx) => {
        const dataRow = ws.getRow(currentRow);
        dataRow.height = 24;
        const isAlt = rowIdx % 2 === 1;
        const isSectionRow = row[sectionKey] === true;

        sheet.columns.forEach((col, colIdx) => {
            const cell = dataRow.getCell(colIdx + 1);
            const rawValue = row[col.key];

            // Per-row format override: data row can specify _format_{colKey} to override column format
            const effectiveFormat = (row[`_format_${col.key}`] as ColumnFormat | undefined) || col.format;

            // Status column: emoji + colored text
            if (effectiveFormat === 'status') {
                const statusText = String(rawValue || '');
                const statusInfo = statusMap[statusText];
                if (statusInfo) {
                    cell.value = `${statusInfo.emoji} ${statusText}`;
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: statusInfo.color } };
                } else {
                    cell.value = statusText;
                    cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.textDark } };
                }
            } else if (effectiveFormat === 'currency' || effectiveFormat === 'number' || effectiveFormat === 'percent') {
                // Keep numeric values as numbers for Excel formatting
                const num = Number(rawValue) || 0;
                cell.value = effectiveFormat === 'percent' ? num / 100 : num;

                // Number format
                const numFmt = getNumFmt(effectiveFormat);
                if (numFmt) cell.numFmt = numFmt;

                // Font + conditional coloring for percent/trend columns
                if (effectiveFormat === 'percent') {
                    const numVal = Number(rawValue) || 0;
                    if (numVal > 0) {
                        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.positive } };
                    } else if (numVal < 0) {
                        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: BRAND.negative } };
                    } else {
                        cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.subtitleColor } };
                    }
                } else {
                    cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.textDark } };
                }
            } else {
                cell.value = rawValue != null ? String(rawValue) : '';
                cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.textDark } };
            }

            // Alignment
            cell.alignment = getAlignment(col);

            // Section header row: bold + purple background
            if (isSectionRow) {
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: BRAND.sectionText } };
                cell.fill = {
                    type: 'pattern', pattern: 'solid',
                    fgColor: { argb: BRAND.sectionBg },
                };
            } else {
                // Fill (alternating rows) — only if not section and not status (already set)
                if (!cell.fill || !(cell.fill as ExcelJS.FillPattern).fgColor) {
                    cell.fill = {
                        type: 'pattern', pattern: 'solid',
                        fgColor: { argb: isAlt ? BRAND.altRowBg : BRAND.white },
                    };
                } else {
                    cell.fill = {
                        type: 'pattern', pattern: 'solid',
                        fgColor: { argb: isAlt ? BRAND.altRowBg : BRAND.white },
                    };
                }
            }

            // Border
            cell.border = thinBorder(BRAND.borderColor);
        });

        currentRow++;
    });

    // ─── SECTION 8: SUMMARY ROW ───
    if (sheet.summaryRow && sheet.data.length > 0) {
        const summaryRowExcel = ws.getRow(currentRow);
        summaryRowExcel.height = 28;

        sheet.columns.forEach((col, colIdx) => {
            const cell = summaryRowExcel.getCell(colIdx + 1);

            if (colIdx === 0) {
                cell.value = 'TỔNG CỘNG';
            } else if (col.summaryFn && col.summaryFn !== 'none') {
                cell.value = calcSummary(sheet.data, col.key, col.summaryFn) as number;
                const numFmt = getNumFmt(col.format);
                if (numFmt) cell.numFmt = numFmt;
            } else if (col.format === 'currency' || col.format === 'number') {
                cell.value = calcSummary(sheet.data, col.key, 'sum') as number;
                const numFmt = getNumFmt(col.format);
                if (numFmt) cell.numFmt = numFmt;
            } else {
                cell.value = '';
            }

            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: BRAND.titleColor } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: BRAND.summaryBg },
            };
            cell.alignment = getAlignment(col);
            cell.border = {
                ...thinBorder(BRAND.borderColor),
                top: { style: 'double', color: { argb: BRAND.primary } },
                bottom: { style: 'medium', color: { argb: BRAND.primary } },
            };
        });

        currentRow++;
    }

    // ─── SECTION 9: FOOTER ───
    currentRow++; // blank row
    ws.mergeCells(currentRow, 1, currentRow, colCount);
    const footerCell = ws.getCell(currentRow, 1);
    const footerNow = new Date();
    const fpad = (n: number) => n.toString().padStart(2, '0');
    const exportDate = `${fpad(footerNow.getDate())}/${fpad(footerNow.getMonth() + 1)}/${footerNow.getFullYear()} ${fpad(footerNow.getHours())}:${fpad(footerNow.getMinutes())}`;
    footerCell.value = `Xuất bởi: Ẩm Thực Giao Tuyết ERP | Ngày xuất: ${exportDate}`;
    footerCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: BRAND.subtitleColor } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Print footer
    ws.headerFooter.oddFooter = '&C&8Trang &P / &N  |  Ẩm Thực Giao Tuyết ERP';
}

// ============ SAVE HELPER ============

export async function saveExcelFile(blob: Blob, filename: string): Promise<void> {
    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: fullFilename,
                types: [
                    {
                        description: 'Excel Files',
                        accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            if (err?.name === 'AbortError') {
                throw new Error('CANCELLED');
            }
        }
    }

    // Legacy fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
