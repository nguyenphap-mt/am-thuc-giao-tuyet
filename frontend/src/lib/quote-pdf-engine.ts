'use client';

import type { QuotePrintData } from '@/components/quote/QuotePrintPreview';

// ═══════════════════════════════════════════════════════════════
// Professional Quote PDF Engine — jsPDF + jspdf-autotable
// Data-driven (no DOM rendering), Vietnamese Unicode support
// ═══════════════════════════════════════════════════════════════

type RGB = [number, number, number];

// Event type labels (mirrored from QuotePrintPreview)
const EVENT_TYPE_LABELS: Record<string, string> = {
    wedding: 'Tiệc cưới',
    birthday: 'Tiệc sinh nhật',
    corporate: 'Tiệc công ty',
    anniversary: 'Tiệc kỷ niệm',
    funeral: 'Tiệc tang',
    housewarming: 'Tiệc tân gia',
    other: 'Khác',
};

// Brand Color Palette
const C = {
    purple700: [126, 34, 206] as RGB,
    purple600: [147, 51, 234] as RGB,
    purple50: [250, 245, 255] as RGB,
    purple200: [233, 213, 255] as RGB,
    purple300: [216, 180, 254] as RGB,
    dark: [17, 24, 39] as RGB,
    gray700: [55, 65, 81] as RGB,
    gray500: [107, 114, 128] as RGB,
    gray200: [229, 231, 235] as RGB,
    gray100: [243, 244, 246] as RGB,
    green600: [22, 163, 74] as RGB,
    yellow700: [161, 98, 7] as RGB,
    yellow50: [254, 252, 232] as RGB,
    white: [255, 255, 255] as RGB,
    pink500: [236, 72, 153] as RGB,
};

const FONT_NAME = 'Roboto';
const MARGIN = 15; // mm

// ─── Helpers ───────────────────────────────────────────────────

function formatVND(value: number): string {
    if (!value && value !== 0) return '';
    return value.toLocaleString('vi-VN') + ' ₫';
}

function formatDate(dateStr: string | Date): string {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function toBase64(buf: ArrayBuffer): string {
    return btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
}

// ─── Main Export Function ──────────────────────────────────────

/**
 * Export a professional catering quote as PDF
 * Uses jsPDF + jspdf-autotable (data-driven, no DOM rendering)
 */
export async function exportQuotePdf(
    data: QuotePrintData,
    quoteCode?: string,
    tenantLogoUrl?: string
): Promise<void> {
    // Dynamic imports (tree-shaking friendly)
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');

    // Register autoTable plugin
    if (typeof autoTableModule.applyPlugin === 'function') {
        autoTableModule.applyPlugin(jsPDF as any);
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();   // 210
    const pageHeight = doc.internal.pageSize.getHeight();  // 297
    const contentWidth = pageWidth - 2 * MARGIN;

    // ─── Step 1: Register Vietnamese fonts ───────────────
    const [regularResp, boldResp] = await Promise.all([
        fetch('/fonts/Roboto-Regular.ttf'),
        fetch('/fonts/Roboto-Bold.ttf'),
    ]);

    if (regularResp.ok && boldResp.ok) {
        const [regularBuf, boldBuf] = await Promise.all([
            regularResp.arrayBuffer(),
            boldResp.arrayBuffer(),
        ]);
        doc.addFileToVFS('Roboto-Regular.ttf', toBase64(regularBuf));
        doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
        doc.addFileToVFS('Roboto-Bold.ttf', toBase64(boldBuf));
        doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
        doc.setFont(FONT_NAME, 'normal');
    }

    let y = MARGIN;
    const today = formatDate(new Date());
    const code = quoteCode || `BG${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

    // ─── Step 2: Header ──────────────────────────────────
    // Logo (left)
    try {
        const logoUrl = tenantLogoUrl || '/Logo.png';
        const logoResp = await fetch(logoUrl);
        if (logoResp.ok) {
            const logoBuf = await logoResp.arrayBuffer();
            const logoB64 = toBase64(logoBuf);
            doc.addImage(`data:image/png;base64,${logoB64}`, 'PNG', MARGIN, y, 55, 20);
        }
    } catch { /* logo optional */ }

    // Title + info (right)
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...C.purple700);
    doc.text('BÁO GIÁ DỊCH VỤ', pageWidth - MARGIN, y + 6, { align: 'right' });

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.gray500);
    doc.text(`Mã: ${code}`, pageWidth - MARGIN, y + 12, { align: 'right' });
    doc.text(`Ngày lập: ${today}`, pageWidth - MARGIN, y + 16, { align: 'right' });

    y += 24;

    // Gradient separator
    doc.setDrawColor(...C.purple600);
    doc.setLineWidth(1);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 6;

    // ─── Step 3: Customer & Event Info (2 columns) ───────
    const colW = (contentWidth - 6) / 2; // 6mm gap
    const leftX = MARGIN;
    const rightX = MARGIN + colW + 6;

    // Card backgrounds
    doc.setFillColor(...C.gray100);
    doc.roundedRect(leftX, y, colW, 36, 2, 2, 'F');
    doc.roundedRect(rightX, y, colW, 36, 2, 2, 'F');

    // Left card: Customer Info
    let cardY = y + 5;
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.purple700);
    doc.text('THÔNG TIN KHÁCH HÀNG', leftX + 4, cardY);
    cardY += 5;

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.dark);

    const customerInfo = [
        ['Họ tên:', data.customer_name],
        ['Điện thoại:', data.customer_phone],
        ...(data.customer_email ? [['Email:', data.customer_email]] : []),
        ['Địa điểm:', data.event_address],
    ];
    customerInfo.forEach(([label, value]) => {
        doc.setTextColor(...C.gray500);
        doc.text(label, leftX + 4, cardY);
        doc.setTextColor(...C.dark);
        const maxW = colW - 32;
        const lines = doc.splitTextToSize(value || '-', maxW);
        doc.text(lines[0] || '-', leftX + 28, cardY);
        cardY += 5;
    });

    // Right card: Event Details
    cardY = y + 5;
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.purple700);
    doc.text('CHI TIẾT SỰ KIỆN', rightX + 4, cardY);
    cardY += 5;

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8.5);

    const eventInfo = [
        ['Loại tiệc:', EVENT_TYPE_LABELS[data.event_type] || data.event_type || '-'],
        ['Ngày tiệc:', data.event_date ? formatDate(data.event_date) : '-'],
        ['Giờ:', data.event_time || '-'],
        ['Số bàn:', `${data.table_count} bàn`],
        ...(data.guest_count ? [['Số khách:', `${data.guest_count} khách`]] : []),
    ];
    eventInfo.forEach(([label, value]) => {
        doc.setTextColor(...C.gray500);
        doc.text(label, rightX + 4, cardY);
        doc.setTextColor(...C.dark);
        doc.text(value, rightX + 28, cardY);
        cardY += 5;
    });

    y += 40;

    // ─── Step 4: Menu Items Table ────────────────────────
    if (data.menuItems.length > 0) {
        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...C.purple700);
        doc.text(`THỰC ĐƠN (${data.menuItems.length} món)`, MARGIN, y);
        y += 4;

        const menuHead = [['STT', 'Tên món', 'Đơn giá/bàn']];
        const menuBody = data.menuItems.map((item, idx) => [
            String(idx + 1),
            item.name,
            formatVND(item.selling_price),
        ]);

        (doc as any).autoTable({
            startY: y,
            head: menuHead,
            body: menuBody,
            margin: { left: MARGIN, right: MARGIN },
            styles: {
                fontSize: 8.5,
                cellPadding: 2.5,
                lineColor: C.purple200,
                lineWidth: 0.3,
                textColor: C.dark,
                font: FONT_NAME,
            },
            headStyles: {
                fillColor: C.purple700,
                textColor: C.white,
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center',
            },
            bodyStyles: { fillColor: C.white },
            alternateRowStyles: { fillColor: C.gray100 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'left' },
                2: { halign: 'right', cellWidth: 35 },
            },
            foot: [[
                { content: '', styles: { fillColor: C.purple50 } },
                { content: 'TỔNG THỰC ĐƠN / BÀN', styles: { fillColor: C.purple50, fontStyle: 'bold', textColor: C.purple700, halign: 'right' } },
                { content: formatVND(data.menuTotalPerTable), styles: { fillColor: C.purple50, fontStyle: 'bold', textColor: C.purple700, halign: 'right' } },
            ]],
            footStyles: { fontSize: 9 },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ─── Step 5: Services Table ──────────────────────────
    const hasServices = data.services.length > 0 || data.staffCount > 0;
    if (hasServices) {
        // Check page break needed
        if (y > pageHeight - 80) {
            doc.addPage();
            y = MARGIN;
        }

        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...C.purple700);
        doc.text('DỊCH VỤ ĐI KÈM', MARGIN, y);
        y += 4;

        const svcHead = [['Dịch vụ', 'Số lượng', 'Thành tiền']];
        const svcBody: string[][] = [];

        data.services.forEach((svc) => {
            svcBody.push([
                svc.name,
                `${svc.quantity} ${svc.unit}`,
                formatVND(svc.pricePerUnit * svc.quantity),
            ]);
        });
        if (data.staffCount > 0) {
            svcBody.push([
                'Nhân viên phục vụ',
                `${data.staffCount} người`,
                formatVND(data.staffPricePerUnit * data.staffCount),
            ]);
        }

        (doc as any).autoTable({
            startY: y,
            head: svcHead,
            body: svcBody,
            margin: { left: MARGIN, right: MARGIN },
            styles: {
                fontSize: 8.5,
                cellPadding: 2.5,
                lineColor: C.purple200,
                lineWidth: 0.3,
                textColor: C.dark,
                font: FONT_NAME,
            },
            headStyles: {
                fillColor: C.purple700,
                textColor: C.white,
                fontStyle: 'bold',
                halign: 'center',
            },
            bodyStyles: { fillColor: C.white },
            alternateRowStyles: { fillColor: C.gray100 },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'right', cellWidth: 35 },
            },
            foot: [[
                { content: 'TỔNG DỊCH VỤ', colSpan: 2, styles: { fillColor: C.purple50, fontStyle: 'bold', textColor: C.purple700, halign: 'right' } },
                { content: formatVND(data.serviceTotal), styles: { fillColor: C.purple50, fontStyle: 'bold', textColor: C.purple700, halign: 'right' } },
            ]],
            footStyles: { fontSize: 9 },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ─── Step 6: Pricing Summary ─────────────────────────
    if (y > pageHeight - 90) {
        doc.addPage();
        y = MARGIN;
    }

    // Summary header bar
    const summaryH = 7;
    doc.setFillColor(...C.purple600);
    doc.roundedRect(MARGIN, y, contentWidth, summaryH, 1.5, 1.5, 'F');
    // Overlay partial pink gradient
    doc.setFillColor(...C.pink500);
    doc.rect(MARGIN + contentWidth * 0.6, y, contentWidth * 0.4, summaryH, 'F');
    // Re-draw rounded corners on right side
    doc.setFillColor(...C.pink500);
    doc.roundedRect(MARGIN + contentWidth * 0.55, y, contentWidth * 0.45, summaryH, 1.5, 1.5, 'F');

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text('TỔNG HỢP CHI PHÍ', MARGIN + 4, y + 4.8);
    y += summaryH + 3;

    // Summary line items
    const labelX = MARGIN + 4;
    const valueX = pageWidth - MARGIN - 4;
    const lineH = 5.5;

    const drawSummaryLine = (label: string, value: string, opts?: { bold?: boolean; color?: RGB; large?: boolean; green?: boolean }) => {
        doc.setFont(FONT_NAME, opts?.bold ? 'bold' : 'normal');
        doc.setFontSize(opts?.large ? 11 : 9);
        doc.setTextColor(...(opts?.color || C.dark));
        doc.text(label, labelX, y);
        if (opts?.green) doc.setTextColor(...C.green600);
        doc.text(value, valueX, y, { align: 'right' });
        y += opts?.large ? 7 : lineH;
    };

    drawSummaryLine(`Thực đơn (${data.table_count} bàn):`, formatVND(data.menuTotalWithTables));
    if (data.serviceTotal > 0) {
        drawSummaryLine('Dịch vụ đi kèm:', formatVND(data.serviceTotal));
    }
    const totalDiscount = data.furnitureDiscountAmount + data.staffDiscountAmount + data.orderDiscountAmount;
    if (totalDiscount > 0) {
        drawSummaryLine('Giảm giá:', `-${formatVND(totalDiscount)}`, { green: true });
    }

    // Separator
    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.3);
    doc.line(labelX, y, valueX, y);
    y += 4;

    drawSummaryLine('Tạm tính:', formatVND(data.subtotal));
    if (data.includeVat && data.vatAmount > 0) {
        drawSummaryLine('VAT (10%):', formatVND(data.vatAmount));
    }

    // Grand total separator
    doc.setDrawColor(...C.purple300);
    doc.setLineWidth(0.6);
    doc.line(labelX, y, valueX, y);
    y += 5;

    drawSummaryLine('TỔNG CỘNG:', formatVND(data.grandTotal), {
        bold: true, color: C.purple700, large: true,
    });

    y += 2;

    // ─── Step 7: Price-Per-Table Highlight ────────────────
    if (y > pageHeight - 40) {
        doc.addPage();
        y = MARGIN;
    }

    const pricePerTable = data.table_count > 0
        ? Math.round(data.grandTotal / data.table_count)
        : 0;

    const highlightH = 18;
    // Background
    doc.setFillColor(...C.purple50);
    doc.setDrawColor(...C.purple300);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, contentWidth, highlightH, 2, 2, 'FD');

    // Center text
    const centerX = pageWidth / 2;
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.gray500);
    doc.text('Đơn giá mỗi bàn tiệc', centerX, y + 5, { align: 'center' });

    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.purple700);
    doc.text(`${formatVND(pricePerTable)}/bàn`, centerX, y + 12, { align: 'center' });

    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gray500);
    doc.text(`(Tổng: ${formatVND(data.grandTotal)} cho ${data.table_count} bàn)`, centerX, y + 16.5, { align: 'center' });

    y += highlightH + 5;

    // ─── Step 8: Notes Section ───────────────────────────
    if (data.notes) {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = MARGIN;
        }

        const noteLines = doc.splitTextToSize(data.notes, contentWidth - 8);
        const noteH = Math.max(12, noteLines.length * 4 + 10);

        doc.setFillColor(...C.yellow50);
        doc.setDrawColor(254, 240, 138); // yellow-200
        doc.setLineWidth(0.3);
        doc.roundedRect(MARGIN, y, contentWidth, noteH, 2, 2, 'FD');

        doc.setFont(FONT_NAME, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.yellow700);
        doc.text('GHI CHÚ', MARGIN + 4, y + 5);

        doc.setFont(FONT_NAME, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.gray700);
        doc.text(noteLines, MARGIN + 4, y + 10);

        y += noteH + 5;
    }

    // ─── Step 9: Footer ──────────────────────────────────
    if (y > pageHeight - 30) {
        doc.addPage();
        y = MARGIN;
    }

    doc.setDrawColor(...C.gray200);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += 5;

    // Left: Staff info
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.gray700);
    doc.text('Nhân viên báo giá:', MARGIN, y);
    y += 4;

    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...C.gray500);
    if (data.staff) {
        doc.text(data.staff.full_name, MARGIN, y);
        y += 3.5;
        doc.text(data.staff.email, MARGIN, y);
    } else {
        doc.text('-', MARGIN, y);
    }

    // Right: Company tagline
    const footerRightY = y - 3.5;
    doc.setFont(FONT_NAME, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.gray500);
    doc.text('Trân trọng cảm ơn Quý khách!', pageWidth - MARGIN, footerRightY, { align: 'right' });
    doc.setFont(FONT_NAME, 'bold');
    doc.setTextColor(...C.purple600);
    doc.text('GIAO TUYẾT - Dịch vụ nấu tiệc tại nhà', pageWidth - MARGIN, footerRightY + 4, { align: 'right' });

    // ─── Step 10: Page Numbers & Save ────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setFont(FONT_NAME, 'normal');
        doc.setTextColor(...C.gray500);
        doc.text(
            `Trang ${p}/${totalPages}  |  Ẩm Thực Giáo Tuyết`,
            pageWidth / 2,
            pageHeight - 8,
            { align: 'center' }
        );
    }

    // Generate filename
    const dateObj = data.event_date ? new Date(data.event_date) : new Date();
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const safeCode = code.replace(/[^a-zA-Z0-9-]/g, '');
    const filename = `${safeCode}-${dd}${mm}${yyyy}.pdf`;

    // Save via File System Access API with fallback
    const pdfBlob = doc.output('blob');
    await savePdfBlob(pdfBlob, filename);
}

// ─── File Save Helper ──────────────────────────────────────

async function savePdfBlob(blob: Blob, filename: string): Promise<void> {
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'PDF Files',
                    accept: { 'application/pdf': ['.pdf'] },
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
