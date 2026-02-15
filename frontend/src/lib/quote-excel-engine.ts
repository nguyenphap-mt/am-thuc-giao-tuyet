'use client';

import ExcelJS from 'exceljs';
import type { QuotePrintData } from '@/components/quote/QuotePrintPreview';

// ═══════════════════════════════════════════════════════════════
// Professional Quote Excel Engine — ExcelJS
// Editable spreadsheet format for staff to modify quotes easily
// ═══════════════════════════════════════════════════════════════

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
    wedding: 'Tiệc cưới',
    birthday: 'Tiệc sinh nhật',
    corporate: 'Tiệc công ty',
    anniversary: 'Tiệc kỷ niệm',
    funeral: 'Tiệc tang',
    housewarming: 'Tiệc tân gia',
    other: 'Khác',
};

// Brand Colors (ARGB format for ExcelJS)
const BRAND = {
    purple700: '7E22CE',
    purple600: '9333EA',
    purple50: 'FAF5FF',
    purple200: 'E9D5FF',
    dark: '111827',
    gray700: '374151',
    gray500: '6B7280',
    gray200: 'E5E7EB',
    gray100: 'F3F4F6',
    white: 'FFFFFF',
    green600: '16A34A',
    yellow50: 'FEFCE8',
    yellow700: 'A16207',
    pink500: 'EC4899',
};

const VND_FORMAT = '#,##0" ₫"';

// ─── Helpers ───────────────────────────────────────────────────

function formatDateVN(dateStr: string | Date): string {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function fillCell(
    ws: ExcelJS.Worksheet,
    row: number,
    col: number,
    value: string | number,
    opts?: {
        bold?: boolean;
        fontSize?: number;
        color?: string;
        bgColor?: string;
        alignment?: Partial<ExcelJS.Alignment>;
        numFmt?: string;
        border?: Partial<ExcelJS.Borders>;
    }
) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = {
        name: 'Arial',
        size: opts?.fontSize || 10,
        bold: opts?.bold || false,
        color: { argb: opts?.color || BRAND.dark },
    };
    if (opts?.bgColor) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: opts.bgColor },
        };
    }
    if (opts?.alignment) {
        cell.alignment = opts.alignment;
    }
    if (opts?.numFmt) {
        cell.numFmt = opts.numFmt;
    }
    if (opts?.border) {
        cell.border = opts.border;
    }
}

function thinBorder(color: string = BRAND.gray200): Partial<ExcelJS.Borders> {
    const style: ExcelJS.BorderStyle = 'thin';
    const border = { style, color: { argb: color } };
    return { top: border, bottom: border, left: border, right: border };
}

function bottomBorder(color: string = BRAND.purple200): Partial<ExcelJS.Borders> {
    return {
        bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: color } },
    };
}

// ─── Main Export Function ──────────────────────────────────────

export async function exportQuoteExcel(
    data: QuotePrintData,
    quoteCode?: string
): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Ẩm Thực Giáo Tuyết ERP';
    workbook.created = new Date();

    const code = quoteCode || `BG${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const today = formatDateVN(new Date());

    // Load logo
    let logoImageId: number | null = null;
    try {
        const logoResp = await fetch('/Logo.png');
        if (logoResp.ok) {
            const logoBuf = await logoResp.arrayBuffer();
            logoImageId = workbook.addImage({ buffer: logoBuf, extension: 'png' });
        }
    } catch { /* logo optional */ }

    // ─── Create Sheet ────────────────────────────────────
    const ws = workbook.addWorksheet('Báo Giá', {
        views: [{ showGridLines: false }],
        properties: { defaultColWidth: 15 },
    });

    // Column widths: A=STT, B=Tên, C=ĐVT/SL, D=Đơn giá, E=Thành tiền
    ws.columns = [
        { width: 6 },   // A: STT
        { width: 40 },  // B: Tên món / Dịch vụ
        { width: 12 },  // C: Số lượng / ĐVT
        { width: 18 },  // D: Đơn giá
        { width: 20 },  // E: Thành tiền
    ];

    let row = 1;

    // ─── Logo ────────────────────────────────────────────
    if (logoImageId !== null) {
        ws.addImage(logoImageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 200, height: 60 },
        });
        // White bg for logo area
        for (let r = 1; r <= 3; r++) {
            for (let c = 1; c <= 5; c++) {
                ws.getCell(r, c).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: BRAND.white },
                };
            }
        }
        row = 4;
    }

    // ─── Separator bar ───────────────────────────────────
    ws.getRow(row).height = 4;
    for (let c = 1; c <= 5; c++) {
        ws.getCell(row, c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: BRAND.purple600 },
        };
    }
    row++;

    // ─── Title ───────────────────────────────────────────
    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, 'BÁO GIÁ DỊCH VỤ', {
        bold: true,
        fontSize: 16,
        color: BRAND.purple700,
        bgColor: BRAND.white,
        alignment: { horizontal: 'left', vertical: 'middle' },
    });
    ws.getRow(row).height = 28;
    row++;

    // Subtitle: Mã + Ngày
    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, `Mã: ${code}  |  Ngày lập: ${today}`, {
        fontSize: 9,
        color: BRAND.gray500,
        bgColor: BRAND.white,
        alignment: { horizontal: 'left' },
    });
    row += 2;

    // ─── Customer & Event Info ───────────────────────────
    // Section header
    ws.mergeCells(row, 1, row, 2);
    fillCell(ws, row, 1, 'THÔNG TIN KHÁCH HÀNG', {
        bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.gray100,
    });
    ws.mergeCells(row, 3, row, 5);
    fillCell(ws, row, 3, 'CHI TIẾT SỰ KIỆN', {
        bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.gray100,
    });
    row++;

    // Info rows
    const infoRows = [
        ['Họ tên:', data.customer_name, 'Loại tiệc:', EVENT_TYPE_LABELS[data.event_type] || data.event_type || '-'],
        ['Điện thoại:', data.customer_phone, 'Ngày tiệc:', data.event_date ? formatDateVN(data.event_date) : '-'],
        ['Email:', data.customer_email || '-', 'Giờ:', data.event_time || '-'],
        ['Địa điểm:', data.event_address, 'Số bàn:', `${data.table_count} bàn`],
    ];
    if (data.guest_count) {
        infoRows.push(['', '', 'Số khách:', `${data.guest_count} khách`]);
    }

    infoRows.forEach((info) => {
        // Left: Customer
        fillCell(ws, row, 1, info[0], { fontSize: 9, color: BRAND.gray500, bgColor: BRAND.white });
        fillCell(ws, row, 2, info[1], { fontSize: 9, color: BRAND.dark, bgColor: BRAND.white });
        // Right: Event
        fillCell(ws, row, 3, info[2], { fontSize: 9, color: BRAND.gray500, bgColor: BRAND.white });
        ws.mergeCells(row, 4, row, 5);
        fillCell(ws, row, 4, info[3], { fontSize: 9, color: BRAND.dark, bgColor: BRAND.white });
        row++;
    });
    row++;

    // ─── Menu Items Table ────────────────────────────────
    if (data.menuItems.length > 0) {
        // Section header
        ws.mergeCells(row, 1, row, 5);
        fillCell(ws, row, 1, `THỰC ĐƠN (${data.menuItems.length} món)`, {
            bold: true, fontSize: 10, color: BRAND.white, bgColor: BRAND.purple700,
            alignment: { horizontal: 'center', vertical: 'middle' },
        });
        ws.getRow(row).height = 22;
        row++;

        // Column headers
        const menuHeaders = ['STT', 'Tên món', '', 'Đơn giá/bàn', ''];
        menuHeaders.forEach((h, i) => {
            fillCell(ws, row, i + 1, h, {
                bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.purple50,
                alignment: { horizontal: i === 0 ? 'center' : i >= 3 ? 'right' : 'left', vertical: 'middle' },
                border: thinBorder(BRAND.purple200),
            });
        });
        // Merge B+C header, D+E header
        ws.mergeCells(row, 2, row, 3);
        ws.mergeCells(row, 4, row, 5);
        ws.getRow(row).height = 20;
        row++;

        // Data rows
        data.menuItems.forEach((item, idx) => {
            const isAlt = idx % 2 === 1;
            const bg = isAlt ? BRAND.gray100 : BRAND.white;

            fillCell(ws, row, 1, idx + 1, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'center' },
                border: thinBorder(BRAND.gray200),
            });
            // Merge B+C for item name
            ws.mergeCells(row, 2, row, 3);
            fillCell(ws, row, 2, item.name, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'left', wrapText: true },
                border: thinBorder(BRAND.gray200),
            });
            // Merge D+E for price
            ws.mergeCells(row, 4, row, 5);
            fillCell(ws, row, 4, item.selling_price, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'right' },
                numFmt: VND_FORMAT,
                border: thinBorder(BRAND.gray200),
            });
            row++;
        });

        // Menu total row
        ws.mergeCells(row, 1, row, 3);
        fillCell(ws, row, 1, 'TỔNG THỰC ĐƠN / BÀN', {
            bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.purple50,
            alignment: { horizontal: 'right' },
            border: { top: { style: 'double' as ExcelJS.BorderStyle, color: { argb: BRAND.purple200 } } },
        });
        ws.mergeCells(row, 4, row, 5);
        fillCell(ws, row, 4, data.menuTotalPerTable, {
            bold: true, fontSize: 10, color: BRAND.purple700, bgColor: BRAND.purple50,
            alignment: { horizontal: 'right' },
            numFmt: VND_FORMAT,
            border: { top: { style: 'double' as ExcelJS.BorderStyle, color: { argb: BRAND.purple200 } } },
        });
        row += 2;
    }

    // ─── Services Table ──────────────────────────────────
    const hasServices = data.services.length > 0 || data.staffCount > 0;
    if (hasServices) {
        // Section header
        ws.mergeCells(row, 1, row, 5);
        fillCell(ws, row, 1, 'DỊCH VỤ ĐI KÈM', {
            bold: true, fontSize: 10, color: BRAND.white, bgColor: BRAND.purple700,
            alignment: { horizontal: 'center', vertical: 'middle' },
        });
        ws.getRow(row).height = 22;
        row++;

        // Column headers
        const svcHeaders = ['Dịch vụ', '', 'Số lượng', 'Đơn giá', 'Thành tiền'];
        svcHeaders.forEach((h, i) => {
            fillCell(ws, row, i + 1, h, {
                bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.purple50,
                alignment: { horizontal: i >= 2 ? (i === 2 ? 'center' : 'right') : 'left', vertical: 'middle' },
                border: thinBorder(BRAND.purple200),
            });
        });
        ws.mergeCells(row, 1, row, 2);
        ws.getRow(row).height = 20;
        row++;

        // Service data rows
        let svcIdx = 0;
        data.services.forEach((svc) => {
            const bg = svcIdx % 2 === 1 ? BRAND.gray100 : BRAND.white;
            ws.mergeCells(row, 1, row, 2);
            fillCell(ws, row, 1, svc.name, {
                fontSize: 9, bgColor: bg, border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 3, `${svc.quantity} ${svc.unit}`, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'center' },
                border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 4, svc.pricePerUnit, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'right' },
                numFmt: VND_FORMAT, border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 5, svc.pricePerUnit * svc.quantity, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'right' },
                numFmt: VND_FORMAT, border: thinBorder(BRAND.gray200),
            });
            row++;
            svcIdx++;
        });

        // Staff row
        if (data.staffCount > 0) {
            const bg = svcIdx % 2 === 1 ? BRAND.gray100 : BRAND.white;
            ws.mergeCells(row, 1, row, 2);
            fillCell(ws, row, 1, 'Nhân viên phục vụ', {
                fontSize: 9, bgColor: bg, border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 3, `${data.staffCount} người`, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'center' },
                border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 4, data.staffPricePerUnit, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'right' },
                numFmt: VND_FORMAT, border: thinBorder(BRAND.gray200),
            });
            fillCell(ws, row, 5, data.staffPricePerUnit * data.staffCount, {
                fontSize: 9, bgColor: bg, alignment: { horizontal: 'right' },
                numFmt: VND_FORMAT, border: thinBorder(BRAND.gray200),
            });
            row++;
        }

        // Service total row
        ws.mergeCells(row, 1, row, 4);
        fillCell(ws, row, 1, 'TỔNG DỊCH VỤ', {
            bold: true, fontSize: 9, color: BRAND.purple700, bgColor: BRAND.purple50,
            alignment: { horizontal: 'right' },
            border: { top: { style: 'double' as ExcelJS.BorderStyle, color: { argb: BRAND.purple200 } } },
        });
        fillCell(ws, row, 5, data.serviceTotal, {
            bold: true, fontSize: 10, color: BRAND.purple700, bgColor: BRAND.purple50,
            alignment: { horizontal: 'right' },
            numFmt: VND_FORMAT,
            border: { top: { style: 'double' as ExcelJS.BorderStyle, color: { argb: BRAND.purple200 } } },
        });
        row += 2;
    }

    // ─── Pricing Summary ─────────────────────────────────
    // Header bar
    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, 'TỔNG HỢP CHI PHÍ', {
        bold: true, fontSize: 11, color: BRAND.white, bgColor: BRAND.purple600,
        alignment: { horizontal: 'center', vertical: 'middle' },
    });
    ws.getRow(row).height = 24;
    row++;

    // Summary helper
    const addSummaryRow = (label: string, value: number, opts?: {
        bold?: boolean; color?: string; bgColor?: string; fontSize?: number; green?: boolean;
    }) => {
        ws.mergeCells(row, 1, row, 3);
        fillCell(ws, row, 1, label, {
            bold: opts?.bold, fontSize: opts?.fontSize || 10, color: opts?.color || BRAND.dark,
            bgColor: opts?.bgColor || BRAND.white,
            alignment: { horizontal: 'right' },
        });
        ws.mergeCells(row, 4, row, 5);
        fillCell(ws, row, 4, value, {
            bold: opts?.bold, fontSize: opts?.fontSize || 10,
            color: opts?.green ? BRAND.green600 : (opts?.color || BRAND.dark),
            bgColor: opts?.bgColor || BRAND.white,
            alignment: { horizontal: 'right' },
            numFmt: VND_FORMAT,
        });
        row++;
    };

    addSummaryRow(`Thực đơn (${data.table_count} bàn):`, data.menuTotalWithTables);
    if (data.serviceTotal > 0) {
        addSummaryRow('Dịch vụ đi kèm:', data.serviceTotal);
    }
    const totalDiscount = data.furnitureDiscountAmount + data.staffDiscountAmount + data.orderDiscountAmount;
    if (totalDiscount > 0) {
        addSummaryRow('Giảm giá:', -totalDiscount, { green: true });
    }

    // Separator
    for (let c = 1; c <= 5; c++) {
        ws.getCell(row, c).border = bottomBorder(BRAND.gray200);
        ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.white } };
    }
    ws.getRow(row).height = 4;
    row++;

    addSummaryRow('Tạm tính:', data.subtotal);
    if (data.includeVat && data.vatAmount > 0) {
        addSummaryRow('VAT (10%):', data.vatAmount);
    }

    // Grand total separator
    for (let c = 1; c <= 5; c++) {
        ws.getCell(row, c).border = bottomBorder(BRAND.purple200);
        ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.white } };
    }
    ws.getRow(row).height = 4;
    row++;

    // Grand total
    addSummaryRow('TỔNG CỘNG:', data.grandTotal, {
        bold: true, color: BRAND.purple700, bgColor: BRAND.purple50, fontSize: 13,
    });
    row++;

    // ─── Price Per Table Highlight ────────────────────────
    const pricePerTable = data.table_count > 0
        ? Math.round(data.grandTotal / data.table_count)
        : 0;

    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, 'Đơn giá mỗi bàn tiệc', {
        fontSize: 9, color: BRAND.gray500, bgColor: BRAND.purple50,
        alignment: { horizontal: 'center' },
    });
    row++;

    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, pricePerTable, {
        bold: true, fontSize: 16, color: BRAND.purple700, bgColor: BRAND.purple50,
        alignment: { horizontal: 'center' },
        numFmt: '#,##0" ₫/bàn"',
    });
    ws.getRow(row).height = 28;
    row++;

    ws.mergeCells(row, 1, row, 5);
    fillCell(ws, row, 1, `(Tổng: ${data.grandTotal.toLocaleString('vi-VN')} ₫ cho ${data.table_count} bàn)`, {
        fontSize: 8, color: BRAND.gray500, bgColor: BRAND.purple50,
        alignment: { horizontal: 'center' },
    });
    row += 2;

    // ─── Notes ───────────────────────────────────────────
    if (data.notes) {
        ws.mergeCells(row, 1, row, 5);
        fillCell(ws, row, 1, 'GHI CHÚ', {
            bold: true, fontSize: 9, color: BRAND.yellow700, bgColor: BRAND.yellow50,
        });
        row++;
        ws.mergeCells(row, 1, row, 5);
        fillCell(ws, row, 1, data.notes, {
            fontSize: 9, color: BRAND.gray700, bgColor: BRAND.yellow50,
            alignment: { wrapText: true },
        });
        ws.getRow(row).height = Math.max(20, Math.ceil(data.notes.length / 60) * 15);
        row += 2;
    }

    // ─── Footer ──────────────────────────────────────────
    for (let c = 1; c <= 5; c++) {
        ws.getCell(row, c).border = bottomBorder(BRAND.gray200);
    }
    ws.getRow(row).height = 2;
    row++;

    ws.mergeCells(row, 1, row, 2);
    fillCell(ws, row, 1, 'Nhân viên báo giá:', {
        bold: true, fontSize: 8, color: BRAND.gray700, bgColor: BRAND.white,
    });
    ws.mergeCells(row, 3, row, 5);
    fillCell(ws, row, 3, 'Trân trọng cảm ơn Quý khách!', {
        fontSize: 8, color: BRAND.gray500, bgColor: BRAND.white,
        alignment: { horizontal: 'right' },
    });
    row++;

    if (data.staff) {
        ws.mergeCells(row, 1, row, 2);
        fillCell(ws, row, 1, `${data.staff.full_name} — ${data.staff.email}`, {
            fontSize: 8, color: BRAND.gray500, bgColor: BRAND.white,
        });
    }
    ws.mergeCells(row, 3, row, 5);
    fillCell(ws, row, 3, 'GIÁO TUYẾT - Dịch vụ nấu tiệc tại nhà', {
        bold: true, fontSize: 8, color: BRAND.purple600, bgColor: BRAND.white,
        alignment: { horizontal: 'right' },
    });

    // ─── Print Setup ─────────────────────────────────────
    ws.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
            left: 0.5, right: 0.5,
            top: 0.5, bottom: 0.5,
            header: 0.3, footer: 0.3,
        },
    };

    // ─── Save ────────────────────────────────────────────
    const dateObj = data.event_date ? new Date(data.event_date) : new Date();
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const safeCode = code.replace(/[^a-zA-Z0-9-]/g, '');
    const filename = `${safeCode}-${dd}${mm}${yyyy}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await saveExcelBlob(blob, filename);
}

// ─── File Save Helper ──────────────────────────────────────

async function saveExcelBlob(blob: Blob, filename: string): Promise<void> {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Excel Files',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err: any) {
            if (err?.name === 'AbortError') throw new Error('CANCELLED');
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
}
