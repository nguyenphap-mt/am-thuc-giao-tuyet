# PRODUCT REQUIREMENTS DOCUMENT (PRD) - IMMUTABLE STANDARDS

> **Version:** 2.0.0  
> **Last Updated:** 2026-01-24  
> **Changelog:** Added Risk Matrix, Version History section, Reflexion Loop v2.0 integration

---

## IDENTITY & CONTEXT
Bạn là một thành viên trong hệ thống Agentic Development của Google Antigravity. Mọi tài liệu PRD bạn tạo ra hoặc đánh giá đều phải tuân thủ "Hiến pháp" này để đảm bảo sự hội tụ giữa Vibe Coding (sáng tạo) và Reflexion (kỷ luật).

---

## I. CẤU TRÚC BẮT BUỘC (MANDATORY STRUCTURE)

Mọi PRD phải bao gồm đầy đủ các phần sau, không ngoại lệ:

### 1. Title & Metadata (3 điểm)
```yaml
---
title: [Feature Name]
author: [Agent ID or Human Name]
status: Draft | Refined | Approved | Rejected
created: [YYYY-MM-DD]
last_updated: [YYYY-MM-DD]
version: [X.Y.Z]
processing_mode: Standard | Enhanced | Deep Analysis
quality_score: [0-100]
---
```

### 2. Problem Statement (5 điểm)
Mô tả nỗi đau của người dùng dựa trên "Vibe" ban đầu.
- **Who:** Ai gặp vấn đề?
- **What:** Vấn đề cụ thể là gì?
- **Impact:** Ảnh hưởng như thế nào nếu không giải quyết?

### 3. Proposed Solution (5 điểm)
Giải pháp tổng thể và cách nó giải quyết vấn đề.
- Overview ngắn gọn
- Key features (bullet points)
- Out of scope (những gì KHÔNG làm)

### 4. User Stories (7 điểm)
Định dạng: `As a [role], I want [action], so that [value]`.

Mỗi User Story PHẢI kèm theo:
- **Acceptance Criteria (AC):** Given-When-Then format
- **Priority:** P0 (Must have) | P1 (Should have) | P2 (Nice to have)
- **Effort Estimate:** XS | S | M | L | XL

### 5. Technical Specifications (5 điểm)
- **Database Schema:** Tên bảng, kiểu dữ liệu, relationships
- **API Endpoints:** Method, Path, Request/Response body
- **State Management:** Frontend state changes
- **Dependencies:** External services, libraries

### 6. Non-functional Requirements (NFRs) (5 điểm)
- **Security:** OWASP standards compliance
- **Performance:** Latency < 200ms, Throttling specs
- **Scalability:** Expected load, growth projections
- **Accessibility:** WCAG compliance level

### 7. Risk Matrix (⭐ NEW - Required for Deep Analysis Mode)
| Risk | Probability | Impact | Mitigation |
|:-----|:-----------:|:------:|:-----------|
| [Risk description] | Low/Med/High | Low/Med/High | [Mitigation strategy] |

### 8. Version History (⭐ NEW)
| Version | Date | Author | Changes |
|:--------|:-----|:-------|:--------|
| 1.0.0 | YYYY-MM-DD | [Author] | Initial draft |
| 1.1.0 | YYYY-MM-DD | [Author] | [Change description] |

---

## II. QUY TẮC NGÔN NGỮ & ĐỊNH DẠNG (STYLE & TONE)

* **Định dạng:** Markdown chuẩn 100%
* **Tone giọng:** Chuyên nghiệp kỹ thuật (Technical Professional), khách quan
* **Triệt tiêu sự mơ hồ:** Tuyệt đối không dùng các từ định tính

| ❌ Sai | ✅ Đúng |
|:-------|:--------|
| "Hệ thống phải phản hồi nhanh" | "Thời gian phản hồi (TTFB) phải dưới 100ms trong điều kiện 1000 requests/s" |
| "Giao diện mượt mà" | "60 FPS, transition 200ms ease-out, no jank" |
| "Bảo mật cao" | "OWASP Top 10 compliant, bcrypt với cost factor 12" |
| "Dễ sử dụng" | "Task completion trong ≤3 clicks" |

---

## III. CƠ CHẾ VIBE-TO-SPEC (DECODING LOGIC)

Khi nhận đầu vào là "Vibe" (ngôn ngữ tự nhiên, cảm xúc), Agent phải thực hiện các bước:

### Step 1: Ambiguity Resolution
Nếu input thiếu dữ liệu (<10 từ hoặc quá mơ hồ):
- Liệt kê 3 assumptions kỹ thuật
- Yêu cầu user confirm trước khi viết PRD

### Step 2: Context Grounding
Neo giải pháp vào Codebase hiện tại:
- Đọc `.agent/rules/core.md` → Tech stack, 5-Dimension Assessment
- Đọc `.agent/knowledge_base` → Patterns, lessons learned
- Scan `package.json`, `database-schema.md` → Dependencies

### Step 3: Constraint Mapping
| Vibe Term | Technical Metric |
|:----------|:-----------------|
| "nhanh" | Latency < 200ms |
| "mượt" | 60 FPS, no jank |
| "đẹp" | Design System compliant |
| "an toàn" | OWASP Top 10 compliant |
| "dễ dùng" | < 3 clicks to complete |

---

## IV. CƠ CHẾ PHẢN XẠ (REFLEXION PROTOCOL V2.0)

Mọi bản thảo PRD phải đi qua vòng lặp Actor-Critic trước khi hiển thị dưới dạng Artifact:

### Agents Involved
| Agent | Role | Responsibility |
|:------|:-----|:---------------|
| `prd-drafter` | Producer | Tính đầy đủ và sáng tạo |
| `prd-critic` | Devil's Advocate | Tìm lỗi, đánh giá 4 ma trận |
| `prd-evaluator` | Gate Keeper | Scoring, iteration control |

### Quality Score Threshold
- **Standard Mode:** ≥ 85/100 to pass
- **Enhanced Mode:** ≥ 85/100 to pass
- **Deep Analysis Mode:** ≥ 90/100 to pass

### 4 Ma Trận Đánh Giá (100 điểm)
1. **Tính Đầy Đủ (Completeness):** 0-25 điểm
2. **Tính Nhất Quán (Consistency):** 0-25 điểm
3. **Bảo Mật (Security):** 0-25 điểm
4. **Khả Thi Kỹ Thuật (Feasibility):** 0-25 điểm

### Iteration Rules
- **Max Iterations:** 3 (prevent infinite loop)
- **Exit Conditions:** Score ≥ threshold OR max iterations reached
- **Stagnation Detection:** If improvement < 2 points → human intervention

---

## V. RÀNG BUỘC BẢO MẬT & HIỆU NĂNG

### Security (Non-negotiable)
* ❌ Không bao giờ đề xuất lưu mật khẩu dạng plain text
* ❌ Không expose sensitive data trong API response
* ✅ Mọi API public phải có Rate Limiting cụ thể
* ✅ Input validation cho tất cả user inputs
* ✅ RBAC/ABAC cho authorization

### Performance
* ✅ API response time < 200ms (P95)
* ✅ Optimistic UI cho actions yêu cầu "vibe mượt mà"
* ✅ Lazy loading cho non-critical resources
* ✅ Pagination cho list views (default: 20 items/page)

---

## VI. CHECKLIST TRƯỚC KHI SUBMIT

### For Drafter
- [ ] Đủ 6 sections bắt buộc (+ Risk Matrix nếu Deep Analysis)
- [ ] Không có từ mơ hồ (nhanh, mượt, đẹp...)
- [ ] Confidence score cho mỗi section
- [ ] Assumptions listed

### For Critic
- [ ] Đánh giá 4 ma trận với điểm số cụ thể
- [ ] Issues classified (HIGH/MEDIUM/LOW)
- [ ] Actionable suggestions cho mỗi issue

### For Human Reviewer
- [ ] Quality Score ≥ threshold
- [ ] Không có HIGH severity issues
- [ ] Phù hợp với business goals
- [ ] Technical feasibility confirmed

---

## Document History

| Version | Date | Changes |
|:--------|:-----|:--------|
| 1.0.0 | 2025-XX-XX | Initial standards |
| 2.0.0 | 2026-01-24 | Added Risk Matrix, Version History, Reflexion v2.0 integration, Quality Score thresholds |