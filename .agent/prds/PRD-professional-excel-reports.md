# PRD: Nâng Cấp Báo Cáo Excel Chuyên Nghiệp

## Bối cảnh

Hệ thống hiện xuất Excel dạng **raw data dump** — không header, không logo, không màu sắc, không format số. Cần nâng cấp thành báo cáo chuyên nghiệp có branding.

> [!IMPORTANT]
> **Thay đổi library:** `xlsx` (SheetJS) → `exceljs` — hỗ trợ styled cells, images, multi-sheet, conditional formatting.

---

## Hiện Trạng vs Mục Tiêu

### ❌ Hiện tại — Raw Data Dump
| Vấn đề | Mô tả |
|---------|--------|
| Không logo/branding | Chỉ có data thuần |
| Không format số | `195380000` thay vì `195.380.000 ₫` |
| Không màu sắc | Trắng toàn bộ, không phân biệt header/data |
| Chỉ 1 sheet | Thiếu multi-sheet cho các nhóm data |
| Không summary row | Không có dòng tổng cộng |
| Không metadata | Không ngày xuất, khoảng thời gian |

### ✅ Mục tiêu — Báo cáo chuyên nghiệp
| Cải tiến | Mô tả |
|----------|--------|
| **Logo + Header** | Logo Giao Tuyết + tên báo cáo + khoảng thời gian |
| **Format VND** | `195.380.000 ₫` với `#,##0" ₫"` |
| **Color scheme** | Nâu/sienna brand (#8B4513) cho header, alternating rows |
| **Multi-sheet** | Sales: "Doanh thu theo kỳ" + "Top Khách hàng" |
| **Summary rows** | Tổng cộng, trung bình tự động |
| **Footer metadata** | "Xuất ngày: 09/02/2026 — Ẩm Thực Giao Tuyết ERP" |

---

## Proposed Changes

### 1. Excel Report Engine (Core)

**[NEW] `frontend/src/lib/excel-report-engine.ts`**

Engine trung tâm sử dụng **ExcelJS** tạo styled workbook:

```typescript
interface ReportSheet {
  name: string;           // Sheet tab name (max 31 chars)
  title: string;          // Report title in header
  subtitle?: string;      // Period/date range
  columns: ColumnDef[];   // Column definitions with format
  data: Record<string, unknown>[];
  summaryRow?: boolean;   // Auto-calculate totals
}

async function generateReport(sheets: ReportSheet[]): Promise<Blob>
```

**Layout mỗi sheet:**

```
┌──────────────────────────────────────────────────┐
│  [LOGO]   ẨM THỰC GIAO TUYẾT                    │  ← Row 1-3: Header
│           Dịch Vụ Nấu Tiệc Tại Nhà              │     Logo.png embedded
│           BÁO CÁO DOANH THU                      │     Brand color #8B4513
│           Kỳ: 10/01/2026 — 09/02/2026           │  ← Row 4: Subtitle
├──────────────────────────────────────────────────┤
│  Kỳ    │ Doanh thu    │ Đơn hàng │ Lợi nhuận   │  ← Row 6: Column headers
│         │              │          │              │     Bold, white text
│         │              │          │              │     Brown background
├─────────┼──────────────┼──────────┼──────────────┤
│  01/26  │ 95.200.000 ₫ │    25    │ 85.000.000 ₫│  ← Data rows
│  02/26  │100.180.000 ₫ │    25    │ 90.000.000 ₫│     Alternating #FFF/#F5EBE0
├─────────┼──────────────┼──────────┼──────────────┤
│  TỔNG   │195.380.000 ₫ │    50    │175.000.000 ₫│  ← Summary row
│         │              │          │              │     Bold, top border
├──────────────────────────────────────────────────┤
│  Xuất ngày: 09/02/2026 | Ẩm Thực Giao Tuyết ERP│  ← Footer
└──────────────────────────────────────────────────┘
```

**Brand Color Palette:**

| Token | Color | Usage |
|-------|-------|-------|
| `headerBg` | `#8B4513` (SaddleBrown) | Header row background, title |
| `headerText` | `#FFFFFF` | Header text |
| `altRow` | `#F5EBE0` | Alternating row background |
| `borderColor` | `#D2B48C` (Tan) | Cell borders |
| `summaryBg` | `#FFF8DC` (Cornsilk) | Summary row |
| `positive` | `#22C55E` | Positive trend/growth |
| `negative` | `#EF4444` | Negative trend/loss |
| `accent` | `#A0522D` (Sienna) | Sub-headers |

---

### 2. Export Hook Update

**[MODIFY] `frontend/src/hooks/use-report-export.ts`**

Thay thế `exportExcel()` sử dụng engine mới.

---

### 3. Analytics Page Update

**[MODIFY] `frontend/src/app/(dashboard)/analytics/page.tsx`**

Multi-sheet configs:

| Tab | Sheet 1 | Sheet 2 |
|-----|---------|---------|
| **Tổng quan** | KPI Metrics + Trends | — |
| **Doanh thu** | Doanh thu theo kỳ | Top Khách hàng |
| **Kho hàng** | Biến động nhập/xuất | Top Nguyên liệu |
| **Mua hàng** | Top Nhà cung cấp | — |
| **Nhân sự** | Phân bố phòng ban | — |
| **Tài chính** | P&L Summary | — |

---

### 4. Logo Integration

Embed `Logo.png` (120×60px) vào cell A1:A3 via ExcelJS `worksheet.addImage()`.

---

### 5. Number Formatting

```typescript
const VND_FORMAT = '#,##0" ₫"';
const PERCENT_FORMAT = '0.0"%"';
const NUMBER_FORMAT = '#,##0';
const DATE_FORMAT = 'dd/mm/yyyy';
```

---

## Verification Plan

1. Xuất Excel từ mỗi tab (6 tabs)
2. Kiểm tra: logo, brand colors, VND format, summary rows, multi-sheet
3. So sánh before/after screenshots
