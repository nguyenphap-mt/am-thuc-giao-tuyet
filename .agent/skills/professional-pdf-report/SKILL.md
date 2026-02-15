---
name: Professional PDF Report
description: Tạo báo cáo PDF chuyên nghiệp với jsPDF + jspdf-autotable — branded header (logo), Vietnamese Unicode (Roboto font), styled tables, summary rows, page footer. Production-ready từ Analytics module.
---

# Professional PDF Report Skill

> **Source**: `frontend/src/hooks/use-report-export.ts` (function `exportPdf`)
> **Verified**: Feb 2026
> **Libraries**: [jsPDF](https://github.com/parallax/jsPDF), [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)

## Architecture Overview

```
┌─ Page (analytics/page.tsx) ──────────────────────┐
│  exportConfig = { sheets: ReportSheet[], ... }    │
│  ↓                                                │
│  useReportExport(exportConfig) hook               │
│  ↓                                                │
│  exportPdf(element, filename, title, config)      │
│  ↓                                                │
│  jsPDF + jspdf-autotable → Blob → File Save API   │
└──────────────────────────────────────────────────┘
```

---

## 1. Dependencies

```bash
npm install jspdf jspdf-autotable
```

---

## 2. Vietnamese Font Support (CRITICAL)

> [!CAUTION]
> jsPDF built-in fonts (Helvetica, Courier, Times) do **NOT** support Vietnamese diacritics (ă, ắ, ẳ, ơ, ờ, ụ, ữ, etc.).
> You **MUST** embed a Unicode font (Roboto, Inter, etc.) to render Vietnamese correctly.

### 2.1 Font Files

Place static `.ttf` font files in `frontend/public/fonts/`:

```
frontend/public/fonts/
├── Roboto-Regular.ttf   (~515 KB — full Vietnamese glyphs)
└── Roboto-Bold.ttf      (~514 KB — full Vietnamese glyphs)
```

**Download sources** (static hinted TTFs):
```bash
# From Google Fonts official repo
curl -L -o Roboto-Regular.ttf https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Regular.ttf
curl -L -o Roboto-Bold.ttf https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Bold.ttf
```

> [!WARNING]
> **Do NOT use Variable Font** format (`.ttf` from `google/fonts/ofl/roboto/Roboto[wdth,wght].ttf`). jsPDF does not parse variable font tables. Use static hinted fonts only.

### 2.2 Font Registration Pattern

```typescript
const FONT_NAME = 'Roboto';

// Fetch font files from public folder
const [regularResp, boldResp] = await Promise.all([
    fetch('/fonts/Roboto-Regular.ttf'),
    fetch('/fonts/Roboto-Bold.ttf'),
]);

if (regularResp.ok && boldResp.ok) {
    const [regularBuf, boldBuf] = await Promise.all([
        regularResp.arrayBuffer(),
        boldResp.arrayBuffer(),
    ]);

    // Convert ArrayBuffer → base64
    const toBase64 = (buf: ArrayBuffer) =>
        btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));

    // Register into jsPDF Virtual File System
    doc.addFileToVFS('Roboto-Regular.ttf', toBase64(regularBuf));
    doc.addFont('Roboto-Regular.ttf', FONT_NAME, 'normal');

    doc.addFileToVFS('Roboto-Bold.ttf', toBase64(boldBuf));
    doc.addFont('Roboto-Bold.ttf', FONT_NAME, 'bold');

    // Set as default
    doc.setFont(FONT_NAME, 'normal');
}
```

**Key rules:**
- `addFileToVFS(filename, base64)` — registers the raw font data
- `addFont(filename, fontName, style)` — maps it to a usable font name + style
- **Order matters**: `addFileToVFS` → `addFont` → `setFont`

> [!IMPORTANT]
> If Roboto doesn't have a separate Italic variant registered, use `'normal'` style instead of `'italic'` for subtitle/footer text. jsPDF will throw if you call `setFont('Roboto', 'italic')` without registering an italic font file.

---

## 3. jspdf-autotable Plugin Registration (CRITICAL for Next.js/ESM)

> [!CAUTION]
> `jspdf-autotable` does NOT auto-register in ESM/dynamic import environments (Next.js, Vite, etc.).
> A side-effect `import('jspdf-autotable')` alone will cause `doc.autoTable is not a function`.

### Correct Pattern:

```typescript
const jsPDFModule = await import('jspdf');
const jsPDF = jsPDFModule.default;
const autoTableModule = await import('jspdf-autotable');

// Explicitly register plugin on jsPDF constructor
if (typeof autoTableModule.applyPlugin === 'function') {
    autoTableModule.applyPlugin(jsPDF as any);
}

const doc = new jsPDF({ ... });
// ✅ doc.autoTable({...}) works now
```

### Wrong Patterns (WILL FAIL):

```typescript
// ❌ Side-effect import does NOT register in ESM
await import('jspdf-autotable');

// ❌ Named import doesn't auto-register either
const { default: autoTable } = await import('jspdf-autotable');
```

---

## 4. PDF Page Layout (Enhanced)

```
┌─────────────────── A4 Landscape (297 × 210 mm) ───────────────────┐
│  margin: 15mm                                                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [LOGO] (60×22mm)                    Date range (right)     │   │
│  │                                      Ngày xuất (right)      │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ══════ Brown separator (1mm thick) ══════                   │   │
│  │  BÁO CÁO TỔNG QUAN KINH DOANH  (16pt bold)                │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│  │  │💰DOANH  │ │📊CHI PHÍ│ │📈LỢI    │ │🧾ĐƠN   │  KPI    │   │
│  │  │THU      │ │         │ │NHUẬN    │ │HÀNG    │  Cards   │   │
│  │  │3.25B ₫  │ │2.45B ₫  │ │800M ₫   │ │1,250   │          │   │
│  │  │↑+12.5%  │ │↑+5.2%   │ │↑+28.3%  │ │↑+8.1%  │          │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ┌────────┬──────────┬──────────┬──────────┐               │   │
│  │  │ Chỉ số │ Giá trị  │Xu hướng %│Trạng thái│ ← Header    │   │
│  │  ├────────┼──────────┼──────────┼──────────┤               │   │
│  │  │Doanh   │ 3.25B ₫  │ ↑+12.5% │⭐Xuất sắc│ ← Status   │   │
│  │  │Chi phí │ 2.45B ₫  │ ↑+5.2%  │⚠️Theo dõi│              │   │
│  │  │Nhân viên│ 4       │  0.0%   │🔵Ổn định │ ← number fmt│   │
│  │  └────────┴──────────┴──────────┴──────────┘               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│            Trang 1/1  |  Ẩm Thực Giao Tuyết ERP  (8pt footer)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Brand Color Palette (RGB tuples)

```typescript
const BROWN: [number, number, number] = [139, 69, 19];     // #8B4513 SaddleBrown
const WHITE: [number, number, number] = [255, 255, 255];
const DARK_TEXT: [number, number, number] = [45, 45, 45];   // #2D2D2D
const GRAY_TEXT: [number, number, number] = [100, 116, 139]; // #64748B
const ALT_ROW: [number, number, number] = [240, 230, 212];  // #F0E6D4
const SUMMARY_BG: [number, number, number] = [255, 243, 205]; // #FFF3CD
const GREEN: [number, number, number] = [27, 125, 58];      // #1B7D3A — positive
const RED: [number, number, number] = [198, 40, 40];        // #C62828 — negative

// KPI Card backgrounds
const KPI_COLORS = {
    'E8F5E9': { bg: [232, 245, 233], text: [27, 125, 58] },   // Revenue (green)
    'FCE4EC': { bg: [252, 228, 236], text: [198, 40, 40] },   // Expenses (red)
    'F3E5F5': { bg: [243, 229, 245], text: [123, 31, 162] },  // Profit (purple)
    'E3F2FD': { bg: [227, 242, 253], text: [21, 101, 192] },  // Orders (blue)
};

// Section & Status
const SECTION_BG: RGB = [103, 58, 183];         // #673AB7 purple
const SECTION_TEXT_COLOR: RGB = [255, 255, 255]; // white
```

> These are **identical** to the Professional Excel Report brand palette. Both exports use the same visual identity.

---

## 6. Number Formatting (Vietnamese locale)

```typescript
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
```

**⚠️ Difference from Excel**: PDF values are pre-formatted as strings. Excel uses `numFmt` on raw numbers.

---

## 7. Logo Placement (jsPDF API)

```typescript
const logoResponse = await fetch('/Logo.png');
if (logoResponse.ok) {
    const logoBuffer = await logoResponse.arrayBuffer();
    const logoBase64 = btoa(
        new Uint8Array(logoBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
    );
    doc.addImage(
        `data:image/png;base64,${logoBase64}`,
        'PNG',
        margin,     // x position (15mm)
        currentY,   // y position
        60,         // width (mm)
        22          // height (mm)
    );
}
currentY += 25;  // Advance past logo
```

---

## 8. KPI Summary Cards (NEW)

> [!IMPORTANT]
> KPI cards use **pure jsPDF drawing** (NOT autoTable). autoTable does NOT support merged cells.

```typescript
function buildPdfKpiCards(doc, kpiCards, startY, pageWidth, margin, fontName) {
    const gap = 4;
    const cardW = (pageWidth - 2 * margin - 3 * gap) / 4;
    const cardH = 28;

    kpiCards.forEach((card, idx) => {
        const x = margin + idx * (cardW + gap);
        const y = startY;

        // 1. Colored background
        doc.setFillColor(...KPI_COLORS[card.bgColor].bg);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

        // 2. Label (7pt bold gray)
        doc.setFontSize(7);
        doc.setFont(fontName, 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(`${card.icon} ${card.label}`, x + 4, y + 7);

        // 3. Value (13pt bold colored)
        doc.setFontSize(13);
        doc.setTextColor(...KPI_COLORS[card.bgColor].text);
        doc.text(formatPdfValue(card.value, card.format), x + 4, y + 17);

        // 4. Trend line (7pt, arrow + percentage)
        doc.setFontSize(7);
        const arrow = card.trend > 0 ? '↑' : card.trend < 0 ? '↓' : '';
        doc.text(`${arrow} ${card.trend}% ${card.trendLabel}`, x + 4, y + 24);
    });

    return startY + cardH + 6;
}
```

**Data format** (from `KpiCard` interface in `excel-report-engine.ts`):
```typescript
const kpiCards: KpiCard[] = [
    { label: 'DOANH THU', value: 3250000000, format: 'currency',
      trend: 12.5, trendLabel: 'so với tháng trước',
      bgColor: 'E8F5E9', valueColor: '1B7D3A', icon: '💰' },
    // ... more cards
];
```

---

## 9. Status Column (NEW)

```typescript
// In didParseCell hook:
const PDF_STATUS_MAP = {
    'Xuất sắc':     { emoji: '⭐', color: [27, 125, 58],  bg: [232, 245, 233] },
    'Tốt':          { emoji: '✅', color: [27, 125, 58],  bg: [232, 245, 233] },
    'Ổn định':      { emoji: '🔵', color: [30, 136, 229], bg: [227, 242, 253] },
    'Cần theo dõi': { emoji: '⚠️', color: [198, 40, 40],  bg: [252, 228, 236] },
};

// Inside didParseCell:
if (effectiveFormat === 'status') {
    const statusInfo = PDF_STATUS_MAP[statusText];
    data.cell.text = [`${statusInfo.emoji} ${statusText}`];
    data.cell.styles.textColor = statusInfo.color;
    data.cell.styles.fillColor = statusInfo.bg;
    data.cell.styles.fontStyle = 'bold';
}
```

> [!NOTE]
> Emoji rendering in PDF depends on the font. Roboto covers ✅ ⚠️ ⭐ as Unicode symbols.
> Colored emoji (🟢🔴) render as monochrome in PDF — use `setTextColor()` for color.

---

## 10. Section Header Rows (NEW)

```typescript
// Detect via _isSectionHeader flag in row data
if (rowData[sectionKey] === true) {
    data.cell.styles.fillColor = [103, 58, 183]; // purple
    data.cell.styles.textColor = [255, 255, 255]; // white
    data.cell.styles.fontStyle = 'bold';
    data.cell.styles.fontSize = 10;
}
```

---

## 11. Per-Row Format Override (NEW)

> [!IMPORTANT]
> Rows like "Khách hàng: 30" and "Nhân viên: 4" are counts, NOT currency.
> Use `_format_value: 'number'` in data row to override column's `currency` format.

```typescript
// Data row with override:
{ metric: 'Khách hàng', value: 30, _format_value: 'number' }

// In table body rendering:
const effectiveFormat = row[`_format_${col.key}`] || col.format;
formatPdfValue(row[col.key], effectiveFormat);
```

---

## 12. Trend Arrows in Percent Column (Enhanced)

```typescript
// Inside didParseCell for percent columns:
if (effectiveFormat === 'percent') {
    const arrow = rawVal > 0 ? '↑ ' : rawVal < 0 ? '↓ ' : '';
    data.cell.text = [`${arrow}${data.cell.text[0]}`];
    data.cell.styles.textColor = rawVal > 0 ? GREEN : rawVal < 0 ? RED : GRAY_TEXT;
}
```

---

## 13. AutoTable Configuration

```typescript
(doc as any).autoTable({
    startY: currentY,
    head: [headers],
    body: body,
    margin: { left: margin, right: margin },
    styles: {
        fontSize: 9, cellPadding: 3,
        lineColor: [210, 180, 140],   // Tan border
        lineWidth: 0.3, textColor: DARK_TEXT, font: FONT_NAME,
    },
    headStyles: {
        fillColor: BROWN, textColor: WHITE,
        fontStyle: 'bold', fontSize: 9, halign: 'center',
    },
    bodyStyles: { fillColor: WHITE },
    alternateRowStyles: { fillColor: ALT_ROW },
    columnStyles: { /* per-column alignment */ },
    didParseCell: (data) => {
        // 1) Summary row → SUMMARY_BG
        // 2) Section headers → SECTION_BG + white text
        // 3) Status column → emoji + colored bg
        // 4) Percent column → trend arrows + colored text
    },
});
currentY = (doc as any).lastAutoTable.finalY + 10;
```

---

## 14. Multi-Sheet / Multi-Table Support

```typescript
for (let si = 0; si < sheets.length; si++) {
    const sheet = sheets[si];

    // Sheet section title
    if (sheets.length > 1) { doc.text(sheet.title, ...); }

    // KPI Cards (if present)
    if (sheet.kpiCards?.length > 0) {
        currentY = buildPdfKpiCards(doc, sheet.kpiCards, currentY, ...);
    }

    // AutoTable
    (doc as any).autoTable({ startY: currentY, ... });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Page break if needed
    if (si < sheets.length - 1 && currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
    }
}
```

---

## 15. Page Footer

```typescript
const totalPages = doc.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont(FONT_NAME, 'normal');
    doc.setTextColor(...GRAY_TEXT);
    doc.text(
        `Trang ${p}/${totalPages}  |  Ẩm Thực Giao Tuyết ERP`,
        pageWidth / 2, pageHeight - 8, { align: 'center' }
    );
}
```

---

## 16. Why NOT html2canvas / html2pdf.js

> [!WARNING]
> **html2canvas** cannot parse CSS Color Level 4 functions (`oklch()`, `lab()`) used by shadcn/ui.

| Approach | Result |
|:---------|:-------|
| Sanitize `<style>` in `onclone` | ❌ CSSOM already parsed before callback |
| **jsPDF data-driven (this skill)** | ✅ **No DOM rendering at all** |

---

## 17. Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Vietnamese chars garbled | Embed Roboto via `addFileToVFS` + `addFont` |
| `doc.autoTable is not a function` | Call `applyPlugin(jsPDF)` after dynamic import |
| Variable font causes blank text | Use **static** hinted TTF, NOT variable font |
| Logo doesn't appear | Ensure `/Logo.png` in `public/` |
| Emoji renders monochrome | Use `setTextColor()` for color, not colored emoji |
| Count rows show ₫ | Add `_format_value: 'number'` per-row override |
| KPI cards overlap table | `buildPdfKpiCards` returns updated Y position |
| `roundedRect` not found | Use jsPDF ≥ 2.5.0 |

---

## Quick Reference

| Element | File / Location |
|---------|----------------|
| PDF export function | `frontend/src/hooks/use-report-export.ts` → `exportPdf()` |
| KPI cards builder | `frontend/src/hooks/use-report-export.ts` → `buildPdfKpiCards()` |
| Export hook | `frontend/src/hooks/use-report-export.ts` → `useReportExport()` |
| Font files | `frontend/public/fonts/Roboto-{Regular,Bold}.ttf` |
| Logo image | `frontend/public/Logo.png` |
| Usage example | `frontend/src/app/(dashboard)/analytics/page.tsx` |
| Excel companion skill | `.agent/skills/professional-excel-report/SKILL.md` |
| Dependencies | `jspdf`, `jspdf-autotable` |\n
│  margin: 15mm                                                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  [LOGO] (60×22mm PNG)                                       │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ══════ Brown separator (1mm thick) ══════                   │   │
│  │  BÁO CÁO TỔNG QUAN  (16pt bold, dark text)                 │   │
│  │  Xuất ngày: 09/02/2026 | Ẩm Thực Giao Tuyết ERP (10pt)    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  ┌────────┬────────────┬──────────────┐                     │   │
│  │  │ CHỈ SỐ │ GIÁ TRỊ    │ XU HƯỚNG (%) │  ← Brown header   │   │
│  │  ├────────┼────────────┼──────────────┤                     │   │
│  │  │ ...    │ 229.281 ₫  │   +23.3%     │  ← Alt rows       │   │
│  │  │ ...    │ 0 ₫        │    0.0%      │                     │   │
│  │  ├────────┼────────────┼──────────────┤                     │   │
│  │  │ TỔNG   │ 459.183 ₫  │              │  ← Summary row    │   │
│  │  └────────┴────────────┴──────────────┘                     │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│            Trang 1/1  |  Ẩm Thực Giao Tuyết ERP  (8pt footer)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Brand Color Palette (RGB tuples)

```typescript
const BROWN: [number, number, number] = [139, 69, 19];     // #8B4513 SaddleBrown
const WHITE: [number, number, number] = [255, 255, 255];
const DARK_TEXT: [number, number, number] = [45, 45, 45];   // #2D2D2D
const GRAY_TEXT: [number, number, number] = [100, 116, 139]; // #64748B
const ALT_ROW: [number, number, number] = [240, 230, 212];  // #F0E6D4
const SUMMARY_BG: [number, number, number] = [255, 243, 205]; // #FFF3CD
const GREEN: [number, number, number] = [27, 125, 58];      // #1B7D3A — positive
const RED: [number, number, number] = [198, 40, 40];        // #C62828 — negative
```

> These are **identical** to the Professional Excel Report brand palette. Both exports use the same visual identity.

---

## 6. Number Formatting (Vietnamese locale)

```typescript
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
```

**⚠️ Difference from Excel**: PDF values are pre-formatted as strings. Excel uses `numFmt` on raw numbers.

---

## 7. Logo Placement (jsPDF API)

```typescript
const logoResponse = await fetch('/Logo.png');
if (logoResponse.ok) {
    const logoBuffer = await logoResponse.arrayBuffer();
    const logoBase64 = btoa(
        new Uint8Array(logoBuffer).reduce((s, b) => s + String.fromCharCode(b), '')
    );
    doc.addImage(
        `data:image/png;base64,${logoBase64}`,
        'PNG',
        margin,     // x position (15mm)
        currentY,   // y position
        60,         // width (mm)
        22          // height (mm)
    );
}
currentY += 25;  // Advance past logo
```

---

## 8. AutoTable Configuration

```typescript
(doc as any).autoTable({
    startY: currentY,
    head: [headers],
    body: body,
    margin: { left: margin, right: margin },
    styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [210, 180, 140],   // Tan border
        lineWidth: 0.3,
        textColor: DARK_TEXT,
        font: FONT_NAME,              // ← MUST be registered font name
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
    columnStyles: columns.reduce((acc, col, idx) => {
        const align = col.format === 'currency' || col.format === 'number'
            || col.format === 'percent' ? 'right' : 'left';
        acc[idx] = { halign: align };
        return acc;
    }, {}),
    didParseCell: (data) => {
        // Summary row styling
        if (isSummaryRow(data)) {
            data.cell.styles.fillColor = SUMMARY_BG;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 10;
        }
        // Conditional percent coloring
        if (isPercentCol(data)) {
            data.cell.styles.textColor = value > 0 ? GREEN : value < 0 ? RED : GRAY_TEXT;
            data.cell.styles.fontStyle = 'bold';
        }
    },
});

// Get final Y position for next content
currentY = (doc as any).lastAutoTable.finalY + 10;
```

---

## 9. Multi-Sheet / Multi-Table Support

```typescript
for (let si = 0; si < sheets.length; si++) {
    const sheet = sheets[si];

    // Sheet section title (only if multiple sheets)
    if (sheets.length > 1) {
        doc.setFontSize(12);
        doc.setFont(FONT_NAME, 'bold');
        doc.setTextColor(...BROWN);
        doc.text(sheet.title, margin, currentY);
        currentY += 6;
    }

    // Render autoTable for this sheet...
    (doc as any).autoTable({ startY: currentY, ... });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Auto page-break if next sheet won't fit
    if (si < sheets.length - 1 && currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
    }
}
```

---

## 10. Page Footer

```typescript
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
```

---

## 11. File Save (Browser)

```typescript
const pdfBlob = doc.output('blob');
await saveBlob(pdfBlob, `${filename}.pdf`, [
    { description: 'PDF Files', accept: { 'application/pdf': ['.pdf'] } },
]);
```

Uses the same `saveBlob()` helper as Excel: `showSaveFilePicker` (Chrome 86+) with fallback to `<a download>`.

---

## 12. Why NOT html2canvas / html2pdf.js

> [!WARNING]
> **html2canvas** cannot parse CSS Color Level 4 functions (`oklch()`, `lab()`, `oklab()`, `lch()`) used by modern UI frameworks (shadcn/ui, Tailwind 4, Radix).
>
> This causes:
> ```
> Error: Attempting to parse an unsupported color function "lab"
> ```

| Approach | Result |
|:---------|:-------|
| Sanitize `<style>` in `onclone` | ❌ CSSOM already parsed before callback |
| Delete stylesheets + inline colors | ❌ Computed styles still return `oklch` (Chrome 111+) |
| Sanitize live DOM before clone | ❌ `lab()` errors from SVGs and CSSOM caches |
| **jsPDF data-driven (this skill)** | ✅ **No DOM rendering at all** |

---

## 13. Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Vietnamese chars garbled (ỗ→Ổ) | Embed Roboto/Inter via `addFileToVFS` + `addFont`. Do NOT use Helvetica. |
| `doc.autoTable is not a function` | Call `applyPlugin(jsPDF)` after dynamic import. See Section 3. |
| Variable font `.ttf` causes blank text | Use **static** hinted TTF from `googlefonts/roboto-2`, NOT variable font. |
| `setFont('Roboto', 'italic')` throws | Only register styles you have (`normal`, `bold`). Use `'normal'` for subtitles. |
| Logo doesn't appear | Ensure `/Logo.png` exists in `public/` and `fetch` returns `200 OK`. |
| Table overflows page | autoTable handles page-breaks automatically. Set `margin.bottom` if footer is cut off. |
| `btoa` fails on large fonts | 515KB fonts convert fine. For >1MB fonts, use chunked base64 or `Uint8Array.from()`. |

---

## Quick Reference

| Element | File / Location |
|---------|----------------|
| PDF export function | `frontend/src/hooks/use-report-export.ts` → `exportPdf()` |
| Export hook | `frontend/src/hooks/use-report-export.ts` → `useReportExport()` |
| Font files | `frontend/public/fonts/Roboto-{Regular,Bold}.ttf` |
| Logo image | `frontend/public/Logo.png` |
| Usage example | `frontend/src/app/(dashboard)/analytics/page.tsx` |
| Excel companion skill | `.agent/skills/professional-excel-report/SKILL.md` |
| Dependencies | `jspdf`, `jspdf-autotable` |
