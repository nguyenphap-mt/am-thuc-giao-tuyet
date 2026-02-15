/**
 * Generate professional payroll slip PDF(s) for single or multiple employees.
 * Uses jsPDF with Roboto font for Vietnamese diacritics.
 * Layout: A4 Portrait with branded header, sections, and signature area.
 */

// ─── Number to Vietnamese Words ───

const ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const UNITS = ['', 'nghìn', 'triệu', 'tỷ'];

function readTriple(h: number, t: number, o: number, hasHigher: boolean): string {
    const parts: string[] = [];
    if (h > 0) {
        parts.push(`${ONES[h]} trăm`);
    } else if (hasHigher && (t > 0 || o > 0)) {
        parts.push('không trăm');
    }

    if (t > 1) {
        parts.push(`${ONES[t]} mươi`);
        if (o === 1) parts.push('mốt');
        else if (o === 4 && t >= 2) parts.push('tư');
        else if (o === 5) parts.push('lăm');
        else if (o > 0) parts.push(ONES[o]);
    } else if (t === 1) {
        parts.push('mười');
        if (o === 5) parts.push('lăm');
        else if (o > 0) parts.push(ONES[o]);
    } else if (o > 0) {
        if (h > 0 || hasHigher) parts.push('lẻ');
        parts.push(ONES[o]);
    }

    return parts.join(' ');
}

export function numberToVietnameseWords(n: number): string {
    if (n === 0) return 'không đồng';
    if (n < 0) return `âm ${numberToVietnameseWords(-n)}`;

    n = Math.round(n);
    const digits = n.toString();
    const padded = digits.padStart(Math.ceil(digits.length / 3) * 3, '0');
    const groups: number[][] = [];
    for (let i = 0; i < padded.length; i += 3) {
        groups.push([
            parseInt(padded[i]),
            parseInt(padded[i + 1]),
            parseInt(padded[i + 2]),
        ]);
    }

    const parts: string[] = [];
    const totalGroups = groups.length;
    for (let i = 0; i < totalGroups; i++) {
        const [h, t, o] = groups[i];
        if (h === 0 && t === 0 && o === 0) continue;
        const unitIdx = totalGroups - 1 - i;
        const hasHigher = i > 0;
        const text = readTriple(h, t, o, hasHigher);
        const unit = UNITS[unitIdx % 4] || '';
        parts.push(`${text} ${unit}`.trim());
    }

    const result = parts.join(' ').replace(/\s+/g, ' ').trim();
    return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}

// ─── Types ───

export interface PayrollSlipData {
    employee_name: string;
    employee_role: string;
    is_fulltime: boolean;
    regular_hours: number;
    overtime_hours: number;
    weekend_hours: number;
    holiday_hours: number;
    night_hours: number;
    regular_pay: number;
    overtime_pay: number;
    weekend_pay: number;
    holiday_pay: number;
    night_pay: number;
    allowance_meal: number;
    allowance_transport: number;
    bonus: number;
    gross_salary: number;
    deduction_social_ins: number;
    deduction_advance: number;
    total_deductions: number;
    net_salary: number;
}

// ─── Shared color & formatting constants ───

const BROWN: [number, number, number] = [139, 69, 19];
const DARK: [number, number, number] = [45, 45, 45];
const GRAY: [number, number, number] = [100, 116, 139];
const GREEN: [number, number, number] = [27, 125, 58];
const RED: [number, number, number] = [198, 40, 40];
const PURPLE: [number, number, number] = [123, 31, 162];
const WHITE: [number, number, number] = [255, 255, 255];

const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + ' đ';

const fmtDate = (s?: string) => {
    if (!s) return '';
    const d = new Date(s);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// ─── Render a single payroll slip page ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderSlipPage(
    doc: any,
    item: PayrollSlipData,
    periodName: string,
    periodStart: string | undefined,
    periodEnd: string | undefined,
    logoB64: string | null,
    FONT: string,
    pageIndex: number,
    totalPages: number,
) {
    const W = doc.internal.pageSize.getWidth();
    const M = 18;
    const CW = W - 2 * M;
    let y = M;

    // ─── HEADER ───
    if (logoB64) {
        try {
            doc.addImage(`data:image/png;base64,${logoB64}`, 'PNG', M, y, 40, 15);
        } catch { /* skip logo */ }
    }

    doc.setFont(FONT, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...BROWN);
    doc.text('ẨM THỰC GIAO TUYẾT', M + 44, y + 7);

    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Dịch vụ ẩm thực chuyên nghiệp', M + 44, y + 12);

    y += 19;

    // Brown separator
    doc.setDrawColor(...BROWN);
    doc.setLineWidth(0.8);
    doc.line(M, y, W - M, y);
    y += 8;

    // ─── TITLE ───
    doc.setFont(FONT, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...DARK);
    doc.text('PHIẾU LƯƠNG', W / 2, y, { align: 'center' });
    y += 6;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...GRAY);
    doc.text(periodName || '', W / 2, y, { align: 'center' });
    y += 5;

    if (periodStart && periodEnd) {
        doc.setFontSize(9);
        doc.text(`Kỳ: ${fmtDate(periodStart)} — ${fmtDate(periodEnd)}`, W / 2, y, { align: 'center' });
        y += 5;
    }
    y += 3;

    // ─── EMPLOYEE INFO ───
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 5;

    const infoLabelX = M;
    const infoValX = M + 30;
    const infoCol2LabelX = W / 2 + 5;
    const infoCol2ValX = W / 2 + 30;

    doc.setFontSize(10);
    doc.setFont(FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Họ tên:', infoLabelX, y);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.employee_name, infoValX, y);

    doc.setFont(FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Loại:', infoCol2LabelX, y);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.is_fulltime ? 'Toàn thời gian' : 'Part-time', infoCol2ValX, y);
    y += 6;

    doc.setFont(FONT, 'normal');
    doc.setTextColor(...GRAY);
    doc.text('Chức vụ:', infoLabelX, y);
    doc.setFont(FONT, 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.employee_role, infoValX, y);
    y += 5;

    doc.setDrawColor(200, 200, 200);
    doc.line(M, y, W - M, y);
    y += 7;

    // ─── Section header helper ───
    const drawSectionHeader = (title: string, color: [number, number, number]) => {
        doc.setFillColor(...color);
        doc.roundedRect(M, y - 4.5, CW, 7, 1.5, 1.5, 'F');
        doc.setFont(FONT, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...WHITE);
        doc.text(title, M + 4, y);
        y += 6;
    };

    // ─── Row helper ───
    const drawRow = (label: string, value: string, opts?: { color?: [number, number, number]; bold?: boolean }) => {
        doc.setFont(FONT, opts?.bold ? 'bold' : 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...DARK);
        doc.text(label, M + 4, y);
        doc.setTextColor(...(opts?.color || DARK));
        doc.setFont(FONT, opts?.bold ? 'bold' : 'normal');
        doc.text(value, W - M - 4, y, { align: 'right' });
        y += 5.5;
    };

    // ─── I. WORKING HOURS ───
    drawSectionHeader('I. GIỜ LÀM VIỆC', [66, 133, 244]);

    const totalHours = item.regular_hours + item.overtime_hours + item.weekend_hours + item.holiday_hours + item.night_hours;
    const hoursLabels = ['Thường', 'Tăng ca', 'Cuối tuần', 'Ngày lễ', 'Đêm', 'TỔNG'];
    const hoursVals = [
        `${item.regular_hours.toFixed(1)}h`,
        `${item.overtime_hours.toFixed(1)}h`,
        `${item.weekend_hours.toFixed(1)}h`,
        `${item.holiday_hours.toFixed(1)}h`,
        `${item.night_hours.toFixed(1)}h`,
        `${totalHours.toFixed(1)}h`,
    ];

    const colW = CW / 6;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    hoursLabels.forEach((label, i) => {
        doc.text(label, M + colW * i + colW / 2, y, { align: 'center' });
    });
    y += 5;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    hoursVals.forEach((val, i) => {
        doc.setTextColor(...(i === 5 ? PURPLE : DARK));
        doc.text(val, M + colW * i + colW / 2, y, { align: 'center' });
    });
    y += 9;

    // ─── II. INCOME ───
    drawSectionHeader('II. THU NHẬP', GREEN);

    drawRow('Lương cơ bản (giờ thường × 100%)', fmt(item.regular_pay));
    drawRow('Tăng ca (× 150%)', fmt(item.overtime_pay), { color: PURPLE });
    drawRow('Cuối tuần (× 200%)', fmt(item.weekend_pay));
    drawRow('Ngày lễ (× 300%)', fmt(item.holiday_pay));
    drawRow('Đêm (+30%)', fmt(item.night_pay));

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(M + 4, y - 2, W - M - 4, y - 2);
    y += 1;

    drawRow('Phụ cấp ăn', fmt(item.allowance_meal));
    drawRow('Phụ cấp đi lại', fmt(item.allowance_transport));
    drawRow('Thưởng', fmt(item.bonus), { color: GREEN });

    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.3);
    doc.line(M + 4, y - 2, W - M - 4, y - 2);
    y += 1;
    drawRow('TỔNG THU NHẬP', fmt(item.gross_salary), { bold: true, color: GREEN });
    y += 3;

    // ─── III. DEDUCTIONS ───
    drawSectionHeader('III. KHẤU TRỪ', RED);

    drawRow('BHXH, BHYT, BHTN', `-${fmt(item.deduction_social_ins)}`, { color: RED });
    drawRow('Tạm ứng', `-${fmt(item.deduction_advance)}`, { color: RED });

    doc.setDrawColor(...RED);
    doc.setLineWidth(0.3);
    doc.line(M + 4, y - 2, W - M - 4, y - 2);
    y += 1;
    drawRow('TỔNG KHẤU TRỪ', `-${fmt(item.total_deductions)}`, { bold: true, color: RED });
    y += 5;

    // ─── NET SALARY HIGHLIGHT ───
    doc.setFillColor(...BROWN);
    doc.roundedRect(M, y - 5, CW, 14, 2, 2, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text('THỰC NHẬN:', M + 6, y + 2);
    doc.setFontSize(14);
    doc.text(fmt(item.net_salary), W - M - 6, y + 2, { align: 'right' });
    y += 13;

    // Amount in words
    const words = numberToVietnameseWords(item.net_salary);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`(Bằng chữ: ${words})`, M + 4, y);
    y += 12;

    // ─── SIGNATURE AREA ───
    const now = new Date();
    const dateLabel = `Ngày ${now.getDate().toString().padStart(2, '0')} tháng ${(now.getMonth() + 1).toString().padStart(2, '0')} năm ${now.getFullYear()}`;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(dateLabel, W - M, y, { align: 'right' });
    y += 8;

    const sigCol1X = M + CW * 0.2;
    const sigCol2X = M + CW * 0.75;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text('NGƯỜI LẬP BẢNG', sigCol1X, y, { align: 'center' });
    doc.text('NGƯỜI NHẬN LƯƠNG', sigCol2X, y, { align: 'center' });
    y += 5;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('(Ký, ghi rõ họ tên)', sigCol1X, y, { align: 'center' });
    doc.text('(Ký, ghi rõ họ tên)', sigCol2X, y, { align: 'center' });
    y += 25;

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    const sigLineW = 50;
    doc.line(sigCol1X - sigLineW / 2, y, sigCol1X + sigLineW / 2, y);
    doc.line(sigCol2X - sigLineW / 2, y, sigCol2X + sigLineW / 2, y);

    // ─── FOOTER ───
    const pH = doc.internal.pageSize.getHeight();
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(
        'Áp dụng Luật Lao động VN: Thường 100% | OT 150% | Cuối tuần 200% | Lễ 300% | Đêm +30%',
        W / 2,
        pH - 12,
        { align: 'center' },
    );

    // Page number for batch
    if (totalPages > 1) {
        doc.text(`Trang ${pageIndex + 1} / ${totalPages}`, W - M, pH - 7, { align: 'right' });
    }
}

// ─── PDF setup helper (font + logo loading) ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function setupPdfDocument(orientation: 'portrait' | 'landscape' = 'portrait'): Promise<{ doc: any; FONT: string; logoB64: string | null }> {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;

    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    // Load Roboto font
    const FONT = 'Roboto';
    try {
        const [regResp, boldResp] = await Promise.all([
            fetch('/fonts/Roboto-Regular.ttf'),
            fetch('/fonts/Roboto-Bold.ttf'),
        ]);
        if (regResp.ok && boldResp.ok) {
            const [regBuf, boldBuf] = await Promise.all([
                regResp.arrayBuffer(),
                boldResp.arrayBuffer(),
            ]);
            const toB64 = (buf: ArrayBuffer) =>
                btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
            doc.addFileToVFS('Roboto-Regular.ttf', toB64(regBuf));
            doc.addFont('Roboto-Regular.ttf', FONT, 'normal');
            doc.addFileToVFS('Roboto-Bold.ttf', toB64(boldBuf));
            doc.addFont('Roboto-Bold.ttf', FONT, 'bold');
            doc.setFont(FONT, 'normal');
        }
    } catch {
        console.warn('Could not load Roboto font, falling back to helvetica');
    }

    // Load logo
    let logoB64: string | null = null;
    try {
        const logoResp = await fetch('/Logo.png');
        if (logoResp.ok) {
            const logoBuf = await logoResp.arrayBuffer();
            logoB64 = btoa(
                new Uint8Array(logoBuf).reduce((d, b) => d + String.fromCharCode(b), ''),
            );
        }
    } catch { /* skip logo */ }

    return { doc, FONT, logoB64 };
}

// ─── Public API: Single Slip ───

export async function generatePayrollSlipPdf(
    item: PayrollSlipData,
    periodName: string,
    periodStart?: string,
    periodEnd?: string,
): Promise<void> {
    const { doc, FONT, logoB64 } = await setupPdfDocument('portrait');
    renderSlipPage(doc, item, periodName, periodStart, periodEnd, logoB64, FONT, 0, 1);

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
}

// ─── Public API: Batch Slip (multiple employees → multi-page PDF) ───

export async function generateBatchPayrollSlipPdf(
    items: PayrollSlipData[],
    periodName: string,
    periodStart?: string,
    periodEnd?: string,
): Promise<void> {
    if (items.length === 0) return;

    const { doc, FONT, logoB64 } = await setupPdfDocument('portrait');
    const total = items.length;

    items.forEach((item, index) => {
        if (index > 0) doc.addPage();
        renderSlipPage(doc, item, periodName, periodStart, periodEnd, logoB64, FONT, index, total);
    });

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
}
