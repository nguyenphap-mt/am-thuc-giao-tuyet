# PRD Effort History
# Lưu trữ historical data cho Effort Estimator calibration
# Last Updated: 2026-01-24

---

## Format
```yaml
- feature: "Feature Name"
  prd_id: "PRD-XXX"
  estimated_hours: XX
  actual_hours: XX
  variance_reason: "Reason for variance"
  complexity_factors: ["factor1", "factor2"]
  date_completed: "YYYY-MM-DD"
```

---

## Historical Data

### 2026 Q1

- feature: "Quote Management"
  prd_id: "PRD-QUOTE-001"
  estimated_hours: 24
  actual_hours: 32
  variance_reason: "UI complexity underestimated, AG Grid customization took longer"
  complexity_factors: ["ui_complexity", "new_table"]
  date_completed: "2026-01-15"

- feature: "Quote to Order Conversion"
  prd_id: "PRD-ORDER-001"
  estimated_hours: 16
  actual_hours: 14
  variance_reason: "Simpler than expected, reused existing components"
  complexity_factors: ["cross_module"]
  date_completed: "2026-01-18"

- feature: "Inventory Module"
  prd_id: "PRD-INV-001"
  estimated_hours: 80
  actual_hours: 96
  variance_reason: "RLS implementation more complex, lot tracking edge cases"
  complexity_factors: ["new_table", "security_feature", "cross_module"]
  date_completed: "2026-01-20"

- feature: "Quote Print/PDF"
  prd_id: "PRD-PRINT-001"
  estimated_hours: 20
  actual_hours: 24
  variance_reason: "Print CSS debugging, A4 layout adjustments"
  complexity_factors: ["ui_complexity"]
  date_completed: "2026-01-23"

- feature: "Finance Dashboard"
  prd_id: "PRD-FIN-001"
  estimated_hours: 40
  actual_hours: 48
  variance_reason: "Chart.js integration issues, data aggregation queries"
  complexity_factors: ["ui_complexity", "api_integration"]
  date_completed: "2026-01-24"

---

## Calibration Summary

| Metric | Value |
|:-------|:------|
| **Total Projects** | 5 |
| **Average Variance** | +15% (underestimate) |
| **Calibration Factor** | 1.15 |
| **Confidence Interval** | ±12% |

### Insights
1. UI complexity thường bị underestimate 20-30%
2. Cross-module features có variance cao hơn
3. RLS/Security features cần buffer 20%
4. Reusable components giúp ahead of schedule

---

## Instructions for Updates

1. Sau mỗi feature hoàn thành, thêm entry mới vào Historical Data
2. Cập nhật Calibration Summary khi có 5+ entries mới
3. effort-estimator skill sẽ tự động đọc file này để calibrate
