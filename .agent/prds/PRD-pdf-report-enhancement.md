# PRD: Nâng Cấp Báo Cáo PDF Theo Mockup

## 1. Vấn đề

Hiện tại, PDF export chỉ có:
- Logo + title + date header
- Plain data table (autoTable) với alternating rows
- Summary row + percent coloring

**Mockup yêu cầu thêm:**
- 4 KPI Summary Cards (colored backgrounds, icons, trend arrows)
- Status column (emoji + colored text: ✅ Tốt, ⚠️ Cần theo dõi, ⭐ Xuất sắc)
- Section header rows (bold, purple background)
- Per-row format override (Khách hàng/Nhân viên → number, không phải currency)
- Right-aligned date range in header area

![Mockup](file:///C:/Users/nguye/.gemini/antigravity/brain/ddf4fda2-e1b1-49d9-baf0-57b47ad98f62/excel_overview_mockup_1770642030850.png)

---

## 2. Kết quả Nghiên cứu (Verified ≥2 sources)

### 2.1 KPI Cards — Pure jsPDF Drawing

> [!IMPORTANT]
> autoTable **KHÔNG** hỗ trợ merged cells. KPI cards phải dùng **pure jsPDF** drawing API.

```typescript
// Pattern: roundedRect + setFillColor + text
doc.setFillColor(232, 245, 233);   // #E8F5E9 green background
doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');

doc.setFontSize(8);
doc.setFont('Roboto', 'bold');
doc.setTextColor(100, 100, 100);
doc.text('💰 DOANH THU', x + padding, y + 8);

doc.setFontSize(14);
doc.setTextColor(27, 125, 58);     // #1B7D3A green
doc.text('3.250.000.000 ₫', x + padding, y + 18);

doc.setFontSize(7);
doc.setTextColor(27, 125, 58);
doc.text('↑ 12.5% so với tháng trước', x + padding, y + 25);
```

**Sources:** [jsPDF API docs](https://rawgit.com/MrRio/jsPDF/master/docs/), [pdfnoodle.com guide](https://pdfnoodle.com)

### 2.2 Status Column — didParseCell Hook

```typescript
didParseCell: (data) => {
    if (data.section === 'body') {
        const colDef = sheet.columns[data.column.index];
        if (colDef?.format === 'status') {
            const statusText = String(data.cell.raw);
            const statusMap = {
                'Xuất sắc': { color: [27, 125, 58], bg: [232, 245, 233] },
                'Tốt':      { color: [27, 125, 58], bg: [232, 245, 233] },
                'Ổn định':  { color: [30, 136, 229], bg: [227, 242, 253] },
                'Cần theo dõi': { color: [198, 40, 40], bg: [252, 228, 236] },
            };
            const info = statusMap[statusText];
            if (info) {
                data.cell.styles.textColor = info.color;
                data.cell.styles.fillColor = info.bg;
                data.cell.styles.fontStyle = 'bold';
            }
        }
    }
}
```

**Sources:** [jspdf-autotable npm docs](https://npmjs.com/package/jspdf-autotable), [StackOverflow examples](https://stackoverflow.com)

### 2.3 Section Header Rows — didParseCell Row Detection

```typescript
// Detect section row via _isSectionHeader flag in data
if (data.section === 'body') {
    const rowData = sheet.data[data.row.index];
    if (rowData?._isSectionHeader === true) {
        data.cell.styles.fillColor = [103, 58, 183] as any;   // Purple
        data.cell.styles.textColor = [255, 255, 255] as any;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
    }
}
```

### 2.4 Per-row Format Override

Pattern đã implement cho Excel engine — cần mirror cho PDF:

```typescript
// Check _format_{colKey} override trước khi format
const effectiveFormat = rowData?.[`_format_${colDef.key}`] || colDef.format;
const displayValue = formatPdfValue(rawValue, effectiveFormat);
```

### 2.5 Emoji/Unicode Support

> [!NOTE]
> Roboto font (đã đăng ký trong system) hỗ trợ Unicode symbols: ✅ ⚠️ ⭐ ↑ ↓ 💰 📊 📈
> Tuy nhiên, **colored emoji** (🟢🔴) sẽ render dạng text đen trắng trong PDF.
> → Dùng Unicode text symbols: `✅` `⚠️` `⭐` + `setTextColor()` thay vì colored emoji.

---

## 3. Gap Analysis

| Feature | Excel Engine | PDF Engine | Gap |
|:--------|:---:|:---:|:------|
| KPI Summary Cards | ✅ (merged cells + rich text) | ❌ | **NEW**: Pure jsPDF drawing |
| Status Column | ✅ (emoji + colored text) | ❌ | **NEW**: didParseCell hook |
| Section Header Rows | ✅ (_isSectionHeader) | ❌ | **NEW**: didParseCell hook |
| Per-row Format Override | ✅ (_format_{key}) | ❌ | **NEW**: formatPdfValue logic |
| Trend Arrows (colored ↑↓) | ✅ (rich text) | Partial (% coloring only) | **ENHANCE**: Add arrows |
| Right-aligned Date | ✅ | ❌ | **NEW**: doc.text with align right |

---

## 4. Proposed Changes

### 4.1 PDF Engine Enhancement

#### [MODIFY] [use-report-export.ts](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/frontend/src/hooks/use-report-export.ts)

**New helper function**: `buildPdfKpiCards(doc, kpiCards, startY, pageWidth, margin)`
- Draw 4 KPI cards side-by-side using `roundedRect` + colored text
- Each card: label (8pt bold gray), value (14pt bold colored), trend line (7pt)
- Card width: `(pageWidth - 2*margin - 3*gap) / 4`
- Card height: ~28mm
- Return updated Y position

**Enhance `exportPdf` function**:
1. After header, check `sheet.kpiCards` → call `buildPdfKpiCards`
2. Expand `didParseCell` hook:
   - Status column detection + emoji + colored fill
   - Section header row detection + purple fill
   - Per-row format override
3. Update `formatPdfValue` to accept per-row format override
4. Add right-aligned date range next to logo

**New brand colors** (matching Excel KPI palette):
```typescript
const KPI_REVENUE_BG: RGB = [232, 245, 233];   // #E8F5E9
const KPI_EXPENSE_BG: RGB = [252, 228, 236];   // #FCE4EC
const KPI_PROFIT_BG:  RGB = [243, 229, 245];   // #F3E5F5
const KPI_ORDERS_BG:  RGB = [227, 242, 253];   // #E3F2FD
const SECTION_BG:     RGB = [103, 58, 183];     // #673AB7 purple
const SECTION_TEXT:   RGB = [255, 255, 255];
```

### 4.2 SKILL Update

#### [MODIFY] [SKILL.md](file:///d:/PROJECT/AM%20THUC%20GIAO%20TUYET/.agent/skills/professional-pdf-report/SKILL.md)

- Add Section 14: KPI Cards Layout
- Add Section 15: Status Column Pattern
- Add Section 16: Section Header Rows
- Update Architecture diagram

---

## 5. Verification Plan

### Automated Tests
```bash
cd frontend && npx tsc --noEmit 2>&1 | Select-String 'use-report-export'
```

### Manual Verification
1. Navigate to `/analytics` → Overview tab
2. Click Export → PDF
3. Verify PDF contains:
   - [x] 4 KPI cards with colored backgrounds
   - [x] Data table with status column (emoji + colors)
   - [x] Section header rows (purple background)
   - [x] "Khách hàng" / "Nhân viên" without ₫ symbol
   - [x] Trend arrows with green/red coloring
   - [x] Right-aligned date range in header
