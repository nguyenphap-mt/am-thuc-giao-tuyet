# 📘 Hướng Dẫn Sử Dụng: Reflexion PRD Workflow

> **Version:** 2.1.0  
> **Last Updated:** 24/01/2026  
> **Trigger:** `/prd [ý tưởng]`

---

## 1. Tổng Quan

### Workflow này dùng để làm gì?
Chuyển đổi **ý tưởng mơ hồ** (Vibe) thành **PRD chất lượng cao** thông qua vòng lặp tự phản xạ (Reflexion Loop).

### Khi nào nên dùng?
- ✅ Có ý tưởng feature mới cần document
- ✅ Cần PRD đạt chuẩn technical specs
- ✅ Muốn auto-generate test cases
- ❌ Chỉ cần quick fix (dùng `/fix-bug`)
- ❌ Refactor code existing (dùng `/refactor`)

---

## 2. Cách Sử Dụng

### 2.1 Basic Usage

```bash
/prd Tôi muốn thêm tính năng in báo giá PDF cho module Quote
```

### 2.2 Với Context Chi Tiết

```bash
/prd 
Tính năng: Export Inventory Report
- Xuất báo cáo tồn kho theo tháng
- Định dạng Excel và PDF
- Lọc theo warehouse, category
- Gửi email tự động cuối tháng
```

### 2.3 Với Hình Ảnh (Multimodal)

```bash
/prd
[Đính kèm mockup UI]
Implement giao diện dashboard như hình, bao gồm:
- 4 KPI cards
- Chart doanh thu theo tháng
- Bảng top 10 khách hàng
```

---

## 3. Processing Modes

Workflow tự động chọn mode dựa trên độ phức tạp:

| Mode | Complexity Score | Đặc điểm |
|:-----|:----------------:|:---------|
| **Standard** | ≤ 3 | 1 iteration, focus core features |
| **Enhanced** | 4-6 | 2 iterations, edge cases, alternatives |
| **Deep Analysis** | ≥ 7 | 3 iterations, risk matrix, migration plan |

### Cách Ép Mode Cụ Thể

```bash
/prd --mode=deep
Tính năng phức tạp cần phân tích sâu...
```

---

## 4. Workflow Phases

```
Phase 0: Initialization
    ↓
Phase 1: Context & Complexity Assessment
    ↓
Phase 2: Initial Drafting (prd-drafter)
    ↓
Phase 3: Reflexion Loop (prd-critic → prd-evaluator)
    ↓ (lặp nếu score < 85)
Phase 3.5: Multi-Expert Validation
    ↓
Phase 4: Human Checkpoint
    ↓
Phase 5: Delivery (tests, estimates, KB update)
```

---

## 5. Output Artifacts

| Artifact | Mô tả | Path |
|:---------|:------|:-----|
| PRD Document | Tài liệu PRD hoàn chỉnh | `.agent/prds/PRD-{feature}.md` |
| Test Cases | Auto-generated tests | `.agent/generated-tests/{prd_id}/` |
| Effort Estimate | Ước lượng effort | Trong PRD metadata |

---

## 6. Ví Dụ Prompt Theo Use Case

### 6.1 Feature CRUD Đơn Giản

```bash
/prd
Thêm chức năng quản lý Suppliers:
- CRUD suppliers (name, contact, address)
- Liên kết với Purchase Orders
- Đánh giá supplier (1-5 sao)
```

### 6.2 Feature Tích Hợp Phức Tạp

```bash
/prd --mode=enhanced
Tích hợp thanh toán VNPay:
- Checkout flow cho Orders
- Webhook nhận kết quả
- Retry logic khi fail
- Báo cáo giao dịch
```

### 6.3 Feature Liên Quan Security

```bash
/prd --mode=deep
Implement Row-Level Security cho multi-tenant:
- Mỗi tenant chỉ thấy data của mình
- Super-admin thấy tất cả  
- Audit log cho data access
```

---

## 7. Tương Tác Trong Quá Trình

### 7.1 Khi Được Hỏi Clarification

```
Agent: Tôi có một số câu hỏi:
1. "Nhanh" nghĩa là latency bao nhiêu?
2. Export PDF cần header/footer custom không?

User: 1. Dưới 200ms, 2. Có, logo công ty ở header
```

### 7.2 Khi Review Human Checkpoint

```
Agent: PRD đạt 88/100. Bạn có muốn:
1. Approve → Tiếp tục Phase 5
2. Reject + Feedback → Quay lại drafting

User: Approve
```

---

## 8. Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|:-------|:------------|:----------|
| Loop quá 3 lần | Yêu cầu quá mơ hồ | Cung cấp thêm context |
| Score thấp liên tục | Conflict với existing code | Kiểm tra `.agent/rules/core.md` |
| Không generate tests | PRD chưa có AC | Thêm Acceptance Criteria |

---

## 9. Tips & Best Practices

1. **Cung cấp context đầy đủ** - Càng chi tiết, PRD càng chính xác
2. **Đính kèm mockup** - Hình ảnh giúp giảm ambiguity
3. **Specify constraints** - "Không dùng library X", "Phải compatible với Y"
4. **Review iteration history** - Học từ feedback của critic

---

## 10. Related Workflows

| Workflow | Khi nào dùng |
|:---------|:-------------|
| `/prd-audit` | Audit module existing |
| `/create-module` | Implement đầy đủ từ PRD |
| `/fix-bug` | Sửa bug cụ thể |
