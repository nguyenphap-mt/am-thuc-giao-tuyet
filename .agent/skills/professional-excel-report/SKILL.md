---
name: Professional Excel Report
description: Tạo báo cáo Excel chuyên nghiệp với ExcelJS — branded header (logo), hidden gridlines, freeze panes, VND formatting, alternating rows, summary rows, multi-sheet. Production-ready từ Analytics module.
---

# Professional Excel Report Skill

> **Source**: `frontend/src/lib/excel-report-engine.ts` + `frontend/src/hooks/use-report-export.ts`
> **Verified**: Feb 2026
> **Library**: [ExcelJS](https://github.com/exceljs/exceljs) (npm: `exceljs`)

## Architecture Overview

```
┌─ Page (analytics/page.tsx) ──────────────────────┐
│  exportConfig = { sheets: ReportSheet[], ... }    │
│  ↓                                                │
│  useReportExport(exportConfig) hook               │
│  ↓                                                │
│  generateProfessionalReport(config) ← engine.ts   │
│  ↓                                                │
│  saveExcelFile(blob, filename) → File Save API    │
└──────────────────────────────────────────────────┘
```

---

## 1. Dependencies

```bash
npm install exceljs file-saver
npm install -D @types/file-saver
```

---

## 2. Core Types (Interface Contract)

```typescript
export type ColumnFormat = 'currency' | 'percent' | 'number' | 'text' | 'date';
export type SummaryFn = 'sum' | 'avg' | 'count' | 'none';

export interface ColumnDef {
    key: string;        // Data key (maps to row[key])
    header: string;     // Display header text
    width?: number;     // Column width in characters (auto-detected if omitted)
    format?: ColumnFormat;
    alignment?: 'left' | 'center' | 'right';
    summaryFn?: SummaryFn;  // How to aggregate in summary row
}

export interface ReportSheet {
    name: string;           // Sheet tab name (max 31 chars — Excel limit)
    title: string;          // Report title (displayed below logo)
    subtitle?: string;      // e.g. date range
    columns: ColumnDef[];
    data: Record<string, unknown>[];
    summaryRow?: boolean;   // Add TỔNG CỘNG row at bottom
}

export interface ReportConfig {
    sheets: ReportSheet[];
    filename: string;       // Without .xlsx extension
    dateRange?: string;     // Global date range for all sheets
}
```

---

## 3. Sheet Layout Structure

```
Row 1-3:  Logo image (white background, no gridlines)
Row 4:    ══ Brown separator line (4px height) ══
Row 5:    REPORT TITLE (14pt bold, dark brown, left-aligned)
Row 6:    Kỳ: dd/MM/yyyy — dd/MM/yyyy (10pt italic gray)
Row 7:    Spacer (8px)
Row 8:    Column headers (brown bg #8B4513, white text) ← FREEZE HERE
Row 9+:   Data rows (alternating #F0E6D4 / #FFFFFF)
Row N:    TỔNG CỘNG (cream bg, double top border)
Row N+2:  Footer (8pt gray italic, right-aligned)
```

**Key Design Rules:**
- Logo image IS the header — do NOT add company name as cell text (logo already contains it)
- Gridlines hidden via `showGridLines: false`
- Freeze panes set at column header row
- All cells get explicit fill (white or cream) to mask hidden gridlines

---

## 4. Brand Color Palette

```typescript
const BRAND = {
    primary: '8B4513',        // SaddleBrown — header bg, separator
    headerText: 'FFFFFF',     // White text on brown headers
    accent: 'A0522D',         // Sienna — secondary brown
    altRowBg: 'F0E6D4',       // Warm beige — alternating rows
    summaryBg: 'FFF3CD',      // Warm cream — summary row
    borderColor: 'D2B48C',    // Tan — cell borders
    positive: '1B7D3A',       // Dark green — positive trends
    negative: 'C62828',       // Dark red — negative trends
    titleColor: '4A2600',     // Very dark brown — titles
    subtitleColor: '6B7280',  // Gray — subtitles, footer
    white: 'FFFFFF',
    textDark: '2D2D2D',       // Near-black — data text
};
```

> **Customization**: Replace these values with your own brand colors. Keep `altRowBg` close to white but visibly different.

---

## 5. Number Format Strings (Vietnamese)

```typescript
const FORMAT = {
    currency: '#,##0" ₫"',           // 229,281,940 ₫
    percent: '+0.0%;-0.0%;0.0%',      // +23.3% / -81.7% / 0.0%
    number: '#,##0',                   // 1,234
    date: 'DD/MM/YYYY',                // 17/01/2026
    text: '@',                         // Plain text
};
```

**⚠️ Percent Values**: Data must be in decimal form (e.g. `0.233` for 23.3%). If your API returns `23.3`, divide by 100 before setting `cell.value`:
```typescript
cell.value = col.format === 'percent' ? num / 100 : num;
```

---

## 6. Logo Image Placement (ExcelJS API)

```typescript
// Step 1: Load logo into workbook
const logoResponse = await fetch('/Logo.png');
const logoBuffer = await logoResponse.arrayBuffer();
const logoImageId = workbook.addImage({
    buffer: logoBuffer,
    extension: 'png',
});

// Step 2: Place on worksheet using tl/br anchor (zero-based, fractional)
ws.addImage(logoImageId, {
    tl: { col: 0.1, row: 0.1 },      // Top-left: slightly inset from A1
    br: { col: 3.9, row: 2.9 },       // Bottom-right: spans ~4 cols, 3 rows
    editAs: 'oneCell',                  // Moves with cell but doesn't resize
});
```

**ExcelJS Image Anchoring Rules:**
| Property | Description |
|----------|-------------|
| `tl` | Top-left anchor `{ col: number, row: number }` (zero-based, fractional) |
| `br` | Bottom-right anchor — defines image extent |
| `ext` | Alternative to `br` — `{ width: px, height: px }` (pixel based) |
| `editAs` | `'oneCell'` = moves with cell, `'twoCell'` = scales with cells, `'absolute'` = fixed |

> **CRITICAL**: Do NOT put text in the same cells as the logo — it will overlap. The logo image should be the ONLY content in rows 1-3.

---

## 7. Freeze Panes + Hidden Gridlines

```typescript
ws.views = [{
    state: 'frozen',
    xSplit: 0,                    // Don't freeze columns
    ySplit: headerRowNumber,      // Freeze below column headers
    showGridLines: false,         // Clean white background
}];
```

---

## 8. Auto Column Width Algorithm

```typescript
function autoWidth(col: ColumnDef, data: Record<string, unknown>[]): number {
    if (col.width) return col.width;  // Explicit width takes priority
    
    const headerLen = col.header.length;
    const maxDataLen = Math.max(
        ...data.map(r => String(r[col.key] ?? '').length),
        0
    );
    
    // Bonus for formatted values (currency/percent use more chars)
    const bonus = col.format === 'currency' ? 8 
                : col.format === 'percent' ? 4 
                : 2;
    
    return Math.max(
        Math.min(Math.max(headerLen, maxDataLen) + bonus + 2, 45),  // Max 45
        15  // Min 15
    );
}
```

---

## 9. Data Row Styling Pattern

```typescript
sheet.data.forEach((row, rowIdx) => {
    const dataRow = ws.getRow(currentRow);
    dataRow.height = 24;
    const isAlt = rowIdx % 2 === 1;

    sheet.columns.forEach((col, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        
        // Value
        if (col.format === 'currency' || col.format === 'number') {
            cell.value = Number(rawValue) || 0;
        } else if (col.format === 'percent') {
            cell.value = (Number(rawValue) || 0) / 100;  // Excel expects decimal
        } else {
            cell.value = rawValue != null ? String(rawValue) : '';
        }
        
        // Number format
        if (col.format) cell.numFmt = FORMAT[col.format];
        
        // Conditional color for percent
        if (col.format === 'percent') {
            const v = Number(rawValue) || 0;
            cell.font = {
                name: 'Arial', size: 10, bold: v !== 0,
                color: { argb: v > 0 ? BRAND.positive : v < 0 ? BRAND.negative : BRAND.subtitleColor }
            };
        } else {
            cell.font = { name: 'Arial', size: 10, color: { argb: BRAND.textDark } };
        }
        
        // Alternating fill — MUST set for ALL cells (gridlines are hidden)
        cell.fill = {
            type: 'pattern', pattern: 'solid',
            fgColor: { argb: isAlt ? BRAND.altRowBg : BRAND.white },
        };
        
        // Border
        cell.border = thinBorder(BRAND.borderColor);
    });
    currentRow++;
});
```

---

## 10. Summary Row Pattern

```typescript
if (sheet.summaryRow && sheet.data.length > 0) {
    sheet.columns.forEach((col, colIdx) => {
        const cell = ws.getRow(currentRow).getCell(colIdx + 1);
        
        if (colIdx === 0) {
            cell.value = 'TỔNG CỘNG';
        } else if (col.format === 'currency' || col.format === 'number') {
            // Auto SUM
            cell.value = data.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
            cell.numFmt = FORMAT[col.format];
        }
        
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: BRAND.titleColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.summaryBg } };
        cell.border = {
            ...thinBorder(BRAND.borderColor),
            top: { style: 'double', color: { argb: BRAND.primary } },     // Double top border
            bottom: { style: 'medium', color: { argb: BRAND.primary } },   // Medium bottom border
        };
    });
}
```

---

## 11. File Save (Browser)

```typescript
export async function saveExcelFile(blob: Blob, filename: string): Promise<void> {
    const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

    // Modern: File System Access API (Chrome 86+)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: fullFilename,
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

    // Fallback: Classic download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

---

## 12. Integration Pattern (Page → Hook → Engine)

### Step 1: Page builds `ExportConfig` with `sheets`

```typescript
// In your page component
const exportConfig = useMemo((): ExportConfig => {
    const col = (key: string, header: string, opts: Partial<ColumnDef> = {}): ColumnDef => ({
        key, header, format: 'text', ...opts,
    });

    const sheets: ReportSheet[] = [{
        name: 'Tổng quan KPI',           // Tab name
        title: 'Báo cáo Tổng quan',      // Displayed title
        subtitle: '01/01/2026 — 09/02/2026',
        columns: [
            col('metric', 'Chỉ số', { width: 25 }),
            col('value', 'Giá trị', { format: 'currency', width: 22 }),
            col('trend', 'Xu hướng', { format: 'percent', width: 16 }),
        ],
        data: [
            { metric: 'Doanh thu tháng', value: 229281940, trend: 23.3 },
            { metric: 'Chi phí tháng', value: 0, trend: 0 },
            // ...
        ],
        summaryRow: false,
    }];

    return {
        title: 'Báo cáo Tổng quan',
        columns: [],  // Used for CSV fallback
        data: sheets[0].data,
        filename: `bao-cao-tong-quan_${today}`,
        sheets,
        dateRange: '01/01/2026 — 09/02/2026',
    };
}, [data]);
```

### Step 2: Hook detects `sheets` → uses ExcelJS engine

```typescript
// In use-report-export.ts
case 'excel':
    if (config.sheets && config.sheets.length > 0) {
        // Professional ExcelJS engine
        const reportConfig: ProfessionalReportConfig = {
            sheets: config.sheets,
            filename: config.filename,
            dateRange: config.dateRange,
        };
        const blob = await generateProfessionalReport(reportConfig);
        await saveExcelFile(blob, config.filename);
    } else {
        // Fallback: basic xlsx export (no styling)
        await exportBasicExcel(config);
    }
    break;
```

---

## 13. Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Logo overlaps text | Do NOT put text in rows 1-3. Logo IS the header. |
| Gridlines visible | Set `showGridLines: false` in `ws.views` |
| Merge fill invisible | Apply fill to ALL cells in merged range, not just first |
| Percent shows raw decimal | Use percent format `+0.0%` AND divide value by 100 |
| Sheet name > 31 chars | ExcelJS truncates, but use `.substring(0, 31)` explicitly |
| Column too narrow for formatted values | Add bonus width for currency (+8) and percent (+4) |

---

## Quick Reference

| Element | File |
|---------|------|
| Engine implementation | `frontend/src/lib/excel-report-engine.ts` |
| Export hook | `frontend/src/hooks/use-report-export.ts` |
| Usage example | `frontend/src/app/(dashboard)/analytics/page.tsx` |
| Logo image | `/Logo.png` (in `public/` folder) |
| Dependencies | `exceljs`, `file-saver` |
