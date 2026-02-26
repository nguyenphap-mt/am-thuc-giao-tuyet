'use client';

import { toast } from 'sonner';
import type { TimesheetResponse } from './timesheet-types';

// ─── Shared Helpers ─────────────────────────────────────
function fmtDate(dateStr: string): string {
 const d = new Date(dateStr + 'T00:00:00');
 const dd = String(d.getDate()).padStart(2, '0');
 const mm = String(d.getMonth() + 1).padStart(2, '0');
 const yyyy = d.getFullYear();
 return `${dd}/${mm}/${yyyy}`;
}

function fmtTime(isoString: string | null): string {
 if (!isoString) return '--:--';
 const d = new Date(isoString);
 return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function statusLabel(status: string): string {
 switch (status) {
 case 'APPROVED': return 'Đã duyệt';
 case 'REJECTED': return 'Từ chối';
 case 'PENDING': return 'Chờ duyệt';
 default: return status;
 }
}

function sourceLabel(source: string | null): string {
 switch (source) {
 case 'AUTO_ORDER': return 'Đơn hàng';
 case 'MANUAL': return 'Thủ công';
 case 'IMPORT': return 'Nhập file';
 default: return 'N/A';
 }
}

// ─── Build flat data rows for Excel/PDF ─────────────────
function buildExportRows(timesheets: TimesheetResponse[]): Record<string, unknown>[] {
 return timesheets.map((ts, idx) => ({
 stt: idx + 1,
 employee_name: ts.employee_name || 'N/A',
 employee_role: ts.employee_role || '',
 work_date: fmtDate(ts.work_date),
 actual_start: fmtTime(ts.actual_start),
 actual_end: fmtTime(ts.actual_end),
 total_hours: ts.total_hours,
 overtime_hours: ts.overtime_hours,
 status: statusLabel(ts.status),
 source: sourceLabel(ts.source),
 order_code: ts.order_code || '',
 notes: ts.notes || '',
 }));
}

// Column definitions shared between Excel and PDF
const TIMESHEET_COLUMNS = [
 { key: 'stt', header: 'STT', format: 'number' as const, width: 6, alignment: 'center' as const },
 { key: 'employee_name', header: 'Nhân viên', width: 22 },
 { key: 'employee_role', header: 'Vai trò', width: 15 },
 { key: 'work_date', header: 'Ngày', width: 12 },
 { key: 'actual_start', header: 'Giờ vào', width: 10, alignment: 'center' as const },
 { key: 'actual_end', header: 'Giờ ra', width: 10, alignment: 'center' as const },
 { key: 'total_hours', header: 'Tổng giờ', format: 'number' as const, width: 10, summaryFn: 'sum' as const },
 { key: 'overtime_hours', header: 'OT (giờ)', format: 'number' as const, width: 10, summaryFn: 'sum' as const },
 { key: 'status', header: 'Trạng thái', width: 12 },
 { key: 'source', header: 'Nguồn', width: 12 },
 { key: 'order_code', header: 'Đơn hàng', width: 14 },
 { key: 'notes', header: 'Ghi chú', width: 20 },
];

// ─── CSV Export (zero-dep) ──────────────────────────────
export function exportTimesheetCsv(
 timesheets: TimesheetResponse[],
 dateRange: { start: string; end: string }
) {
 if (timesheets.length === 0) {
 toast.error('Không có dữ liệu để xuất');
 return;
 }

 const headers = TIMESHEET_COLUMNS.map(c => c.header);
 const rows = timesheets.map((ts, idx) => [
 idx + 1,
 ts.employee_name || 'N/A',
 ts.employee_role || '',
 fmtDate(ts.work_date),
 fmtTime(ts.actual_start),
 fmtTime(ts.actual_end),
 ts.total_hours.toFixed(1),
 ts.overtime_hours.toFixed(1),
 statusLabel(ts.status),
 sourceLabel(ts.source),
 ts.order_code || '',
 ts.notes || '',
 ]);

 const BOM = '\uFEFF';
 const csvContent = BOM + [
 headers.join(','),
 ...rows.map((row) =>
 row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
 ),
 ].join('\n');

 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `cham-cong_${dateRange.start}_${dateRange.end}.csv`;
 document.body.appendChild(a);
 a.click();
 URL.revokeObjectURL(url);
 document.body.removeChild(a);
 toast.success('Xuất file CSV thành công!');
}

// ─── Excel Export (Professional Engine) ─────────────────
export async function exportTimesheetExcel(
 timesheets: TimesheetResponse[],
 dateRange: { start: string; end: string }
) {
 if (timesheets.length === 0) {
 toast.error('Không có dữ liệu để xuất');
 return;
 }

 try {
 const { generateProfessionalReport, saveExcelFile } = await import('@/lib/excel-report-engine');

 const data = buildExportRows(timesheets);

 const blob = await generateProfessionalReport({
 sheets: [{
 name: 'Chấm Công',
 title: 'BÁO CÁO CHẤM CÔNG',
 subtitle: `${fmtDate(dateRange.start)} — ${fmtDate(dateRange.end)}`,
 columns: TIMESHEET_COLUMNS,
 data,
 summaryRow: true,
 }],
 filename: `cham-cong_${dateRange.start}_${dateRange.end}`,
 dateRange: `${fmtDate(dateRange.start)} — ${fmtDate(dateRange.end)}`,
 });

 await saveExcelFile(blob, `cham-cong_${dateRange.start}_${dateRange.end}`);
 toast.success('Xuất file Excel thành công!');
 } catch (error: any) {
 if (error?.message === 'CANCELLED') return;
 console.error('Excel export error:', error);
 toast.error(`Lỗi xuất Excel: ${error?.message || 'Unknown'}`);
 }
}

// ─── PDF Export (jsPDF + autotable, data-driven) ────────
type RGB = [number, number, number];

const PDF_BRAND = {
 brown: [139, 69, 19] as RGB,
 white: [255, 255, 255] as RGB,
 dark: [45, 45, 45] as RGB,
 gray: [100, 116, 139] as RGB,
 altRow: [240, 230, 212] as RGB,
 summaryBg: [255, 243, 205] as RGB,
 green: [27, 125, 58] as RGB,
 red: [198, 40, 40] as RGB,
 amber: [245, 158, 11] as RGB,
 border: [210, 180, 140] as RGB,
};

const PDF_STATUS_COLORS: Record<string, RGB> = {
 'Đã duyệt': [27, 125, 58],
 'Từ chối': [198, 40, 40],
 'Chờ duyệt': [245, 158, 11],
};

function formatPdfValue(value: unknown, format?: string): string {
 if (value === null || value === undefined) return '';
 const num = Number(value);
 if (format === 'number' && !isNaN(num)) {
 return num.toLocaleString('vi-VN');
 }
 return String(value);
}

export async function exportTimesheetPdf(
 timesheets: TimesheetResponse[],
 dateRange: { start: string; end: string }
) {
 if (timesheets.length === 0) {
 toast.error('Không có dữ liệu để xuất');
 return;
 }

 try {
 // Dynamic imports
 const jsPDFModule = await import('jspdf');
 const jsPDF = jsPDFModule.default;
 const autoTableModule = await import('jspdf-autotable');

 // Register autotable plugin (CRITICAL for ESM/Next.js)
 if (typeof autoTableModule.applyPlugin === 'function') {
 autoTableModule.applyPlugin(jsPDF as any);
 }

 const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
 const pageWidth = doc.internal.pageSize.getWidth();
 const pageHeight = doc.internal.pageSize.getHeight();
 const margin = 15;
 let currentY = margin;
 const FONT_NAME = 'Roboto';

 // ── Register Vietnamese font ──
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
 const toBase64 = (buf: ArrayBuffer) =>
 btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));

 doc.addFileToVFS('Roboto-Regular.ttf', toBase64(regularBuf));
 doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');
 doc.addFileToVFS('Roboto-Bold.ttf', toBase64(boldBuf));
 doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');
 doc.setFont(FONT_NAME, 'normal');
 }
 } catch {
 // Fallback: use Helvetica (no VN diacritics)
 doc.setFont('helvetica', 'normal');
 }

 // ── Logo ──
 try {
 const logoResp = await fetch('/Logo.png');
 if (logoResp.ok) {
 const logoBuf = await logoResp.arrayBuffer();
 const logoB64 = btoa(
 new Uint8Array(logoBuf).reduce((s, b) => s + String.fromCharCode(b), '')
 );
 doc.addImage(`data:image/png;base64,${logoB64}`, 'PNG', margin, currentY, 60, 22);
 }
 } catch { /* no logo */ }

 // Date range (right-aligned next to logo)
 doc.setFontSize(9);
 doc.setFont(FONT_NAME, 'normal');
 doc.setTextColor(...PDF_BRAND.gray);
 doc.text(
 `Kỳ: ${fmtDate(dateRange.start)} — ${fmtDate(dateRange.end)}`,
 pageWidth - margin, currentY + 8, { align: 'right' }
 );
 doc.text(
 `Xuất ngày: ${fmtDate(new Date().toISOString().split('T')[0])}`,
 pageWidth - margin, currentY + 14, { align: 'right' }
 );
 currentY += 25;

 // ── Brown separator ──
 doc.setDrawColor(...PDF_BRAND.brown);
 doc.setLineWidth(1);
 doc.line(margin, currentY, pageWidth - margin, currentY);
 currentY += 4;

 // ── Title ──
 doc.setFontSize(16);
 doc.setFont(FONT_NAME, 'bold');
 doc.setTextColor(...PDF_BRAND.dark);
 doc.text('BÁO CÁO CHẤM CÔNG', margin, currentY + 5);
 currentY += 12;

 // ── Summary stats line ──
 const totalHours = timesheets.reduce((s, t) => s + t.total_hours, 0);
 const totalOT = timesheets.reduce((s, t) => s + t.overtime_hours, 0);
 const approvedCount = timesheets.filter(t => t.status === 'APPROVED').length;
 doc.setFontSize(9);
 doc.setFont(FONT_NAME, 'normal');
 doc.setTextColor(...PDF_BRAND.gray);
 doc.text(
 `${timesheets.length} bản ghi | ${totalHours.toFixed(1)} giờ | ${totalOT.toFixed(1)} OT | ${approvedCount} đã duyệt`,
 margin, currentY
 );
 currentY += 6;

 // ── AutoTable ──
 const headers = TIMESHEET_COLUMNS.map(c => c.header);
 const data = buildExportRows(timesheets);

 const body = data.map(row =>
 TIMESHEET_COLUMNS.map(col => {
 const val = row[col.key];
 return col.format ? formatPdfValue(val, col.format) : String(val ?? '');
 })
 );

 // Summary row
 const summaryRowData = TIMESHEET_COLUMNS.map((col, idx) => {
 if (idx === 0) return '';
 if (idx === 1) return `TỔNG CỘNG (${timesheets.length})`;
 if (col.key === 'total_hours') return totalHours.toFixed(1);
 if (col.key === 'overtime_hours') return totalOT.toFixed(1);
 return '';
 });
 body.push(summaryRowData);

 const statusColIdx = TIMESHEET_COLUMNS.findIndex(c => c.key === 'status');
 const otColIdx = TIMESHEET_COLUMNS.findIndex(c => c.key === 'overtime_hours');
 const summaryRowIdx = data.length; // zero-based index of summary row in body

 (doc as any).autoTable({
 startY: currentY,
 head: [headers],
 body,
 margin: { left: margin, right: margin },
 styles: {
 fontSize: 8.5,
 cellPadding: 2.5,
 lineColor: PDF_BRAND.border,
 lineWidth: 0.3,
 textColor: PDF_BRAND.dark,
 font: FONT_NAME,
 },
 headStyles: {
 fillColor: PDF_BRAND.brown,
 textColor: PDF_BRAND.white,
 fontStyle: 'bold',
 fontSize: 8.5,
 halign: 'center',
 },
 bodyStyles: {
 fillColor: PDF_BRAND.white,
 },
 alternateRowStyles: {
 fillColor: PDF_BRAND.altRow,
 },
 columnStyles: TIMESHEET_COLUMNS.reduce((acc: Record<number, any>, col, idx) => {
 if (col.format === 'number' || col.alignment === 'center') {
 acc[idx] = { halign: 'center' };
 }
 return acc;
 }, {}),
 didParseCell: (cellData: any) => {
 if (cellData.section !== 'body') return;
 const rowIdx = cellData.row.index;
 const colIdx2 = cellData.column.index;

 // Summary row
 if (rowIdx === summaryRowIdx) {
 cellData.cell.styles.fillColor = PDF_BRAND.summaryBg;
 cellData.cell.styles.fontStyle = 'bold';
 cellData.cell.styles.fontSize = 9;
 }

 // Status column color
 if (colIdx2 === statusColIdx && rowIdx < summaryRowIdx) {
 const txt = String(cellData.cell.text?.[0] || '');
 const color = PDF_STATUS_COLORS[txt];
 if (color) {
 cellData.cell.styles.textColor = color;
 cellData.cell.styles.fontStyle = 'bold';
 }
 }

 // OT column - amber if > 0
 if (colIdx2 === otColIdx && rowIdx < summaryRowIdx) {
 const val = parseFloat(String(cellData.cell.text?.[0] || '0'));
 if (val > 0) {
 cellData.cell.styles.textColor = PDF_BRAND.amber;
 cellData.cell.styles.fontStyle = 'bold';
 }
 }
 },
 });

 // ── Page footer ──
 const totalPages = doc.getNumberOfPages();
 for (let p = 1; p <= totalPages; p++) {
 doc.setPage(p);
 doc.setFontSize(8);
 doc.setFont(FONT_NAME, 'normal');
 doc.setTextColor(...PDF_BRAND.gray);
 doc.text(
 `Trang ${p}/${totalPages} | Ẩm Thực Giao Tuyết ERP`,
 pageWidth / 2, pageHeight - 8, { align: 'center' }
 );
 }

 // ── Save ──
 const pdfBlob = doc.output('blob');
 const filename = `cham-cong_${dateRange.start}_${dateRange.end}`;

 if ('showSaveFilePicker' in window) {
 try {
 const handle = await (window as any).showSaveFilePicker({
 suggestedName: `${filename}.pdf`,
 types: [{ description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } }],
 });
 const writable = await handle.createWritable();
 await writable.write(pdfBlob);
 await writable.close();
 toast.success('Xuất file PDF thành công!');
 return;
 } catch (err: any) {
 if (err?.name === 'AbortError') return;
 }
 }

 // Fallback download
 const url = URL.createObjectURL(pdfBlob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `${filename}.pdf`;
 document.body.appendChild(a);
 a.click();
 URL.revokeObjectURL(url);
 document.body.removeChild(a);
 toast.success('Xuất file PDF thành công!');
 } catch (error: any) {
 console.error('PDF export error:', error);
 toast.error(`Lỗi xuất PDF: ${error?.message || 'Unknown'}`);
 }
}

// ─── Summary Aggregation (for Summary View) ─────────────
export interface EmployeeSummary {
 employee_id: string;
 employee_name: string;
 employee_role: string;
 total_days: number;
 total_hours: number;
 overtime_hours: number;
 pending_count: number;
 approved_count: number;
 rejected_count: number;
 entries: TimesheetResponse[];
}

export function aggregateByEmployee(timesheets: TimesheetResponse[]): EmployeeSummary[] {
 const map = new Map<string, EmployeeSummary>();

 for (const ts of timesheets) {
 const key = ts.employee_id;
 if (!map.has(key)) {
 map.set(key, {
 employee_id: key,
 employee_name: ts.employee_name || 'N/A',
 employee_role: ts.employee_role || '',
 total_days: 0,
 total_hours: 0,
 overtime_hours: 0,
 pending_count: 0,
 approved_count: 0,
 rejected_count: 0,
 entries: [],
 });
 }
 const agg = map.get(key)!;
 agg.total_days += 1;
 agg.total_hours += ts.total_hours;
 agg.overtime_hours += ts.overtime_hours;
 if (ts.status === 'PENDING') agg.pending_count += 1;
 if (ts.status === 'APPROVED') agg.approved_count += 1;
 if (ts.status === 'REJECTED') agg.rejected_count += 1;
 agg.entries.push(ts);
 }

 return Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}
