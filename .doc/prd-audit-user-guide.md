# 📘 Hướng Dẫn Sử Dụng Workflow PRD-Audit V3.2.1

> **Version:** 3.2.1  
> **Cập nhật:** 2026-01-26  
> **Tác giả:** AI Workforce System
>
> **⭐ NEW V3.2.1:** Workflow bây giờ **LUÔN tạo PRD** bất kể score!

---

## 📑 Mục Lục

1. [Tổng Quan](#1-tổng-quan)
2. [Cú Pháp Lệnh](#2-cú-pháp-lệnh)
3. [Các Phase Trong Workflow](#3-các-phase-trong-workflow)
4. [Cấu Hình Business Flows](#4-cấu-hình-business-flows)
5. [Hướng Dẫn Từng Bước](#5-hướng-dẫn-từng-bước)
6. [Ví Dụ Thực Tế](#6-ví-dụ-thực-tế)
7. [Troubleshooting](#7-troubleshooting)
8. [Sử Dụng Cho Dự Án Mới](#8-sử-dụng-cho-dự-án-mới)

---

## 1. Tổng Quan

### Workflow này làm gì?

`/prd-audit` là workflow **audit chất lượng module** và **tạo PRD cải tiến** tự động. Nó giúp:

| Khả năng | Mô tả |
|:---------|:------|
| 🔍 **5-Dimension Audit** | Đánh giá module theo 5 chiều: UX, UI, FE, BE, DA |
| 🔄 **Business Flow Validation** | Kiểm tra luồng nghiệp vụ cross-module (V3.2 mới) |
| 📝 **Auto PRD Generation** | **LUÔN** tạo Improvement PRD (V3.2.1) |
| 🧪 **Test Generation** | Tạo test cases từ Acceptance Criteria |
| ⏱️ **Effort Estimation** | Ước lượng thời gian implement |

### Khi nào nên dùng?

- ✅ Trước khi refactor một module
- ✅ Sau khi hoàn thành một sprint
- ✅ Khi nghi ngờ có technical debt
- ✅ Khi cần tài liệu hóa cải tiến

---

## 2. Cú Pháp Lệnh

### Cú pháp cơ bản

```bash
/prd-audit [module-name]
```

### Các tùy chọn

| Tùy chọn | Mô tả | Ví dụ |
|:---------|:------|:------|
| `--dry-run` | Ước lượng cost mà không chạy thực | `/prd-audit order --dry-run` |
| `--fast` | Bỏ qua validations không bắt buộc | `/prd-audit quote --fast` |

### Danh sách modules có thể audit

| Module | Mô tả | Path Backend |
|:-------|:------|:-------------|
| `quote` | Quản lý báo giá | `backend/modules/quote` |
| `order` | Quản lý đơn hàng | `backend/modules/order` |
| `inventory` | Quản lý kho | `backend/modules/inventory` |
| `procurement` | Mua hàng & NCC | `backend/modules/procurement` |
| `crm` | Quản lý khách hàng | `backend/modules/crm` |
| `finance` | Tài chính kế toán | `backend/modules/finance` |
| `hr` | Nhân sự | `backend/modules/hr` |
| `menu` | Quản lý thực đơn | `backend/modules/menu` |
| `user` | Quản lý người dùng | `backend/modules/admin` |
| `settings` | Cài đặt hệ thống | `backend/modules/settings` |

---

## 3. Các Phase Trong Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PRD-AUDIT V3.2                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 0: Initialization                                        │
│     └── Load config, validate module, check dry-run             │
│                         ↓                                        │
│  Phase 1: Module Discovery                                      │
│     └── Scan files, load context, query knowledge base          │
│                         ↓                                        │
│  Phase 2: 5-Dimension Audit                                     │
│     └── UX (20) + UI (20) + FE (20) + BE (20) + DA (20) = 100   │
│                         ↓                                        │
│  Phase 2.5: Business Flow Validation (⭐ NEW)                   │
│     └── State machines + Integrations + Dependencies + Rules    │
│                         ↓                                        │
│  Phase 3: Improvement PRD Generation                            │
│     └── Reflexion Loop: Draft → Critic → Refine                 │
│                         ↓                                        │
│  Phase 4: Multi-Expert Validation                               │
│     └── codebase-validator + domain-expert (parallel)           │
│                         ↓                                        │
│  Phase 5: Human Checkpoint                                      │
│     └── Review & approve PRD                                     │
│                         ↓                                        │
│  Phase 6: Delivery                                              │
│     └── Save PRD + Generate tests + Estimate effort             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Chi tiết Phase 2.5: Business Flow Validation

Phase này kiểm tra các khía cạnh sau:

| Category | Điểm | Kiểm tra |
|:---------|:----:|:---------|
| **Module Structure** | 20 | Backend/Frontend paths tồn tại, entities defined |
| **State Machines** | 25 | States synced FE/BE, transitions implemented |
| **Integrations** | 30 | Cross-module functions exist, triggers work |
| **Dependencies** | 15 | No circular deps, imports correct |
| **Business Rules** | 10 | Rules enforced in code |

---

## 4. Cấu Hình Business Flows

### File cấu hình

```
.agent/config/business-flows.yaml
```

### Cấu trúc file

```yaml
# 1. Thông tin cơ bản
version: "1.0"
domain: "Catering ERP - Ẩm Thực Giáo Tuyết"

# 2. Danh sách modules
modules:
  - name: order
    path_backend: backend/modules/order
    path_frontend: frontend/src/app/order
    entities: [Order, OrderItem, OrderPayment]

# 3. Định nghĩa business flows
flows:
  sales_flow:
    name: "Quote to Order Flow"
    entities_involved: [Quote, Order, OrderPayment]
    states:
      - { entity: Quote, state: DRAFT, next: [PENDING] }
      - { entity: Quote, state: APPROVED, action: "CONVERT_TO_ORDER" }
    integrations:
      - source: Quote
        target: Order
        trigger: "Quote.status == APPROVED"
        action: "convert_to_order()"
        verify_in: "backend/modules/quote/services/quote_service.py"

# 4. Dependencies giữa modules
dependencies:
  order:
    depends_on: [quote, crm]
    provides_to: [finance]

# 5. Sync rules (FE/BE phải khớp)
sync_rules:
  - name: "Order Status Sync"
    source_of_truth: backend/modules/order/domain/models.py::OrderStatus
    must_match: frontend/src/app/order/models/order.model.ts::OrderStatus
    severity: HIGH

# 6. Business rules
business_rules:
  - rule_id: BR003
    description: "Deposit minimum 30% khi confirm Order"
    entity: Order
    condition: "deposit_amount >= total_amount * 0.3"
    action: "confirm"
```

---

## 5. Hướng Dẫn Từng Bước

### Bước 1: Chạy lệnh audit

```bash
/prd-audit order
```

### Bước 2: Xem kết quả 5-Dimension Audit

```
📊 Audit Results: order

| Dimension | Score | Max | Status |
|:----------|:-----:|:---:|:-------|
| UX        | 16    | 20  | 🟢     |
| UI        | 18    | 20  | 🟢     |
| FE        | 15    | 20  | 🟡     |
| BE        | 17    | 20  | 🟢     |
| DA        | 14    | 20  | 🟡     |
| **Total** | **80**| 100 | Grade: B |
```

### Bước 3: Xem kết quả Business Flow Validation

```
🔄 Business Flow Validation: order

| Category        | Score | Max | Issues |
|:----------------|:-----:|:---:|:------:|
| Module Structure| 20    | 20  | 0      |
| State Machines  | 22    | 25  | 1      |
| Integrations    | 25    | 30  | 2      |
| Dependencies    | 15    | 15  | 0      |
| Business Rules  | 8     | 10  | 1      |
| **Total**       | **90**| 100 | Grade: A |

Flows Validated: sales_flow, finance_flow
```

### Bước 4: Workflow Tự Động Tạo PRD (V3.2.1)

> ⭐ **Từ V3.2.1**, workflow **LUÔN tạo PRD** bất kể score.

| Score | Grade | Processing Mode |
|:------|:-----:|:----------------|
| ≥ 90 | A | Standard (minor polish) |
| 80-89 | B | Standard (improvement) |
| 70-79 | C | Enhanced (detailed) |
| 60-69 | D | Enhanced (comprehensive) |
| < 60 | F | Deep Analysis (full refactor) |

### Bước 5: Review PRD (nếu có)

Nếu PRD được tạo, bạn sẽ thấy:

```
📝 Improvement PRD Generated!

File: .agent/prds/IMPROVEMENT-PRD-order-abc12345.md

Next Steps:
1. /implement - Bắt đầu implement
2. /estimate - Xem chi tiết effort
3. /tests - Xem generated tests
```

---

## 6. Ví Dụ Thực Tế

### Ví dụ 1: Audit module Quote

```bash
/prd-audit quote
```

**Kết quả mong đợi:**
- Kiểm tra Quote states: DRAFT → PENDING → APPROVED/REJECTED
- Verify integration: Quote → Order conversion
- Check business rule: BR001 (Quote chỉ convert khi APPROVED)

### Ví dụ 2: Dry-run để ước lượng cost

```bash
/prd-audit inventory --dry-run
```

**Output:**
```
DRY RUN MODE
Estimated tokens: ~15,000
Estimated time: 45 seconds
Phases to run: 0, 1, 2, 2.5, 3, 4, 5, 6
Skills to invoke: module-auditor, business-flow-validator, prd-drafter, ...
```

### Ví dụ 3: Fast mode cho quick check

```bash
/prd-audit crm --fast
```

**Bỏ qua:**
- Domain expert validation
- Full reflexion loop (early exit nếu confidence cao)

---

## 7. Troubleshooting

### Lỗi: "Module not found"

```
❌ Module 'xyz' not found at expected paths
```

**Giải pháp:**
1. Kiểm tra module name có đúng không
2. Thêm module vào `.agent/config/business-flows.yaml`

### Lỗi: "No business-flows.yaml found"

```
⚠️ Skipping business flow validation - config not found
```

**Giải pháp:**
1. Tạo file `.agent/config/business-flows.yaml`
2. Copy từ template: `.agent/skills/business-flow-validator/templates/flow_config.template.yaml`

### Lỗi: "Circuit breaker open"

```
❌ Workflow halted due to repeated failures
```

**Giải pháp:**
1. Đợi 60 giây (cooldown period)
2. Kiểm tra network/API availability
3. Chạy lại với `--fast` mode

### Lỗi: "State machine mismatch"

```
HIGH: Frontend missing states: ['IN_PROGRESS', 'COMPLETED']
```

**Giải pháp:**
1. Sync enums/constants giữa FE và BE
2. Cập nhật `business-flows.yaml` nếu states đã thay đổi

---

## 8. Sử Dụng Cho Dự Án Mới

### Bước 1: Copy skill folder

```bash
# Từ project gốc
cp -r .agent/skills/business-flow-validator/ /path/to/new-project/.agent/skills/
```

### Bước 2: Tạo config mới

```bash
# Copy template
cp .agent/skills/business-flow-validator/templates/flow_config.template.yaml \
   /path/to/new-project/.agent/config/business-flows.yaml
```

### Bước 3: Customize config

Edit file `business-flows.yaml`:

```yaml
# Thay đổi domain
domain: "E-Commerce Platform"  # hoặc "Healthcare", "Construction", v.v.

# Định nghĩa modules của bạn
modules:
  - name: product
    path_backend: backend/modules/product
    path_frontend: frontend/src/app/product
    entities: [Product, Variant, Category]

# Định nghĩa flows
flows:
  checkout_flow:
    name: "Cart to Order"
    entities_involved: [Cart, Order, Payment]
    states:
      - { entity: Cart, state: ACTIVE, next: [CHECKOUT] }
      - { entity: Order, state: PENDING, next: [PAID, CANCELLED] }
```

### Bước 4: Copy workflow (nếu chưa có)

```bash
cp .agent/workflows/prd-audit.md /path/to/new-project/.agent/workflows/
```

### Bước 5: Chạy audit

```bash
/prd-audit product
```

---

## 📚 Tài Liệu Tham Khảo

| Tài liệu | Đường dẫn |
|:---------|:----------|
| Workflow PRD-Audit | `.agent/workflows/prd-audit.md` |
| SKILL Business Flow Validator | `.agent/skills/business-flow-validator/SKILL.md` |
| Config Template | `.agent/skills/business-flow-validator/templates/flow_config.template.yaml` |
| Config Ẩm Thực Giáo Tuyết | `.agent/config/business-flows.yaml` |
| Core Rules | `.agent/rules/core.md` |

---

## ❓ FAQ

### Q: Workflow có bắt buộc phải có `business-flows.yaml` không?

**A:** Không. Nếu không có file này, Phase 2.5 sẽ bị skip và workflow vẫn chạy bình thường với 5-Dimension Audit.

### Q: Tôi có thể thêm dimension mới vào audit không?

**A:** Có thể, nhưng cần sửa skill `module-auditor`. Workflow hiện tại hỗ trợ custom weights cho 5 dimensions sẵn có.

### Q: PRD được lưu ở đâu?

**A:** `.agent/prds/IMPROVEMENT-PRD-{module}-{id}.md`

### Q: Làm sao để xem lịch sử audit?

**A:** Kiểm tra `.agent/knowledge_base/audit-history/` - mỗi lần audit tạo 1 file JSON chứa scores, issues, và PRD path.

---

**💡 Tip:** Chạy `/prd-audit [module] --dry-run` trước khi audit thực để ước lượng thời gian và cost!
