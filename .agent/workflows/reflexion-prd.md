---
description: Workflow tạo PRD chuyên sâu sử dụng vòng lặp Reflexion (Drafter -> Critic -> Refinement) với full System 2 Thinking patterns.
version: 2.1.0
trigger: /prd [idea]
config: .agent/config/prd-workflow.yaml
---

# WORKFLOW: PRD GENERATION WITH REFLEXION LOOP V2.1

> **Philosophy:** Slow Thinking + Iterative Refinement + Multi-Expert Validation = High-Quality PRD
> 
> **Key Upgrades từ V2.0:**
> - ✅ Codebase Validation (Priority 1)
> - ✅ Package Registry Lookup (Priority 1)
> - ✅ Dynamic Stagnation Threshold (Priority 1)
> - ✅ Semantic Health Check (Priority 1)
> - ✅ Knowledge Base Query (Priority 2)
> - ✅ Domain Expert Review (Priority 2)
> - ✅ Observability Layer (Priority 2)
> - ✅ Test Generation (Priority 2)
> - ✅ CI/CD Integration API (Priority 3)
> - ✅ Effort Estimation (Priority 3)
> - ✅ Multi-Language Support (Priority 3)

---

## PHASE 0: INITIALIZATION

```yaml
# Load configuration
config = load_yaml(".agent/config/prd-workflow.yaml")

# Internal Variables
MAX_ITERATIONS: config.reflexion_prd.max_iterations  # 3
QUALITY_THRESHOLD: config.reflexion_prd.quality_threshold  # 85
current_iteration: 0
draft_history: []
workflow_id: generate_uuid()
start_time: now()
```

### Step 0.1: Initialize Observability (Priority 2 - #7)
```python
# Start tracing
trace = start_trace(workflow_id)
log.info({
    "event": "workflow_started",
    "workflow_id": workflow_id,
    "trigger": "prd",
    "timestamp": now()
})
```

### Step 0.2: Initialize State
- Set `current_iteration = 0`
- Create empty `draft_history[]` array
- Log start time for metrics

---

## PHASE 1: CONTEXT INGESTION & COMPLEXITY ASSESSMENT

### Step 1.0: Knowledge Base Query (Priority 2 - #5) ⭐ NEW
```python
# Query past PRDs and lessons
if config.knowledge_base.enabled:
    similar_prds = query_knowledge_base(
        query=USER_INTENT,
        sources=config.knowledge_base.phase_1_query.sources,
        max_results=5
    )
    
    past_lessons = extract_lessons(similar_prds)
    log.info({
        "event": "kb_query_complete",
        "similar_prds_found": len(similar_prds),
        "lessons_extracted": len(past_lessons)
    })
```

**Output:** `HISTORICAL_CONTEXT`, `PAST_LESSONS`

### Step 1.1: Analyze Intent
- Tiếp nhận `[idea]` từ người dùng
- Sử dụng khả năng multimodal để hiểu cả văn bản và hình ảnh (nếu có)
- **Output:** `USER_INTENT`

### Step 1.2: Context Grounding
- Đọc tệp `.agent/rules/prd-standards.md` để xác định khung xương tài liệu
- Đọc tệp `.agent/rules/core.md` để hiểu 5-Dimension Assessment
- Quét cấu trúc dự án (`package.json`, `schema.prisma`, `database-schema.md`)
- **Output:** `PROJECT_CONTEXT`

### Step 1.3: Complexity Assessment
Đánh giá độ phức tạp của yêu cầu theo 5 tiêu chí:

| Tiêu chí | Điểm (1-10) | Trọng số |
|:---------|:-----------:|:--------:|
| **UX Impact** | ? | 0.25 |
| **Cross-Module** | ? | 0.20 |
| **Security Sensitivity** | ? | 0.25 |
| **Data Complexity** | ? | 0.15 |
| **Integration Points** | ? | 0.15 |

**Tính toán:**
```
COMPLEXITY_SCORE = Σ(score × weight)
```

**Routing Decision:**
- `COMPLEXITY_SCORE ≤ 3`: **Standard Mode** (1 iteration có thể đủ)
- `COMPLEXITY_SCORE 4-6`: **Enhanced Mode** (2 iterations recommended)
- `COMPLEXITY_SCORE ≥ 7`: **Deep Analysis Mode** (3 iterations, human review bắt buộc)

**Output:** `COMPLEXITY_SCORE`, `PROCESSING_MODE`

---

## PHASE 2: INITIAL DRAFTING (Actor)

### Step 2.1: Activate PRD Drafter
Kích hoạt skill `prd-drafter` để tạo bản nháp đầu tiên.

**Input:**
- `USER_INTENT`
- `PROJECT_CONTEXT`
- `PROCESSING_MODE`
- `HISTORICAL_CONTEXT` (⭐ NEW)
- `PAST_LESSONS` (⭐ NEW)

**Instruction cho Agent:**
```markdown
Bạn đang ở Mode: [PROCESSING_MODE]
Locale: [config.i18n.default_locale]

1. Đọc kỹ USER_INTENT và PROJECT_CONTEXT
2. Tham khảo HISTORICAL_CONTEXT để tránh lặp lại issues đã gặp
3. Áp dụng PAST_LESSONS vào draft
4. Tuân thủ 100% cấu trúc trong prd-standards.md
5. Với mỗi section, output:
   - Content
   - Confidence Level (1-10)
   - Assumptions Made (nếu có)

Lưu ý cho [PROCESSING_MODE]:
- Standard: Focus on core functionality
- Enhanced: Include edge cases, alternative approaches
- Deep Analysis: Full risk matrix, dependency analysis, migration strategy
```

### Step 2.2: Calculate Draft Confidence
```
DRAFT_CONFIDENCE = Average(all_section_confidence_levels)
```

### Step 2.3: Store in History
```python
draft_history.append({
    "version": current_iteration + 1,
    "content": DRAFT_V{N},
    "confidence": DRAFT_CONFIDENCE,
    "timestamp": now()
})

log.info({
    "event": "draft_created",
    "version": current_iteration + 1,
    "confidence": DRAFT_CONFIDENCE
})
```

**Output:** `DRAFT_V{N}`, `DRAFT_CONFIDENCE`, `ASSUMPTIONS_LIST`

---

## PHASE 3: THE REFLEXION LOOP (Critic + Self-Correction)

### Step 3.1: Critical Analysis
Kích hoạt skill `prd-critic` để thực hiện vai trò "Devil's Advocate".

**Input:**
- `DRAFT_V{N}`
- `ASSUMPTIONS_LIST`
- `PROCESSING_MODE`

**Instruction:**
```markdown
Phân tích DRAFT_V{N} theo 4 ma trận:

1. **Tính Đầy Đủ (Completeness):** 0-25 điểm
2. **Tính Nhất Quán (Consistency):** 0-25 điểm
3. **Bảo Mật (Security):** 0-25 điểm
4. **Khả Thi Kỹ Thuật (Feasibility):** 0-25 điểm

Output format:
- QUALITY_SCORE: Tổng điểm /100
- ISSUES: List of {severity, description, suggestion}
- PASS/FAIL: QUALITY_SCORE >= QUALITY_THRESHOLD (85)
```

### Step 3.2: Evaluate Results with Dynamic Stagnation (Priority 1 - #3) ⭐ UPDATED
```python
# Dynamic stagnation threshold
if config.reflexion_prd.stagnation.detection_mode == "dynamic":
    stagnation_threshold = max(
        config.reflexion_prd.stagnation.min_threshold,
        min(
            QUALITY_SCORE * config.reflexion_prd.stagnation.dynamic_percentage,
            config.reflexion_prd.stagnation.max_threshold
        )
    )
else:
    stagnation_threshold = config.reflexion_prd.stagnation.static_threshold

# Check for stagnation
if len(draft_history) >= 2:
    previous_score = draft_history[-2]["quality_score"]
    improvement = QUALITY_SCORE - previous_score
    is_stagnating = improvement < stagnation_threshold
else:
    is_stagnating = False

# Decision logic
if QUALITY_SCORE >= QUALITY_THRESHOLD:
    # EXIT LOOP - Proceed to Phase 3.5
    pass
elif is_stagnating:
    # STAGNATION - Human intervention
    HUMAN_INTERVENTION_NEEDED = True
    goto Phase 4
elif current_iteration < MAX_ITERATIONS:
    # CONTINUE LOOP - Self-Correction
    current_iteration += 1
    goto Step 3.3
else:
    # MAX ITERATIONS REACHED - Force Human Review
    HUMAN_REVIEW_REQUIRED = True
    goto Phase 4
```

### Step 3.3: Self-Correction (Refinement)
Kích hoạt lại skill `prd-drafter` với tư duy phản xạ.

**Input:**
- `DRAFT_V{N}`
- `CRITIQUE_NOTES` (issues và suggestions)
- `draft_history` (để tránh lặp lại lỗi cũ)

**Instruction:**
```markdown
Đây là Iteration #{current_iteration}.

1. Đọc DRAFT_V{N} và CRITIQUE_NOTES
2. Review draft_history để không lặp lại lỗi đã fix
3. Giải quyết triệt để mọi điểm phê bình
4. Chuyển hóa các yêu cầu "Vibe" còn lại thành đặc tả kỹ thuật cụ thể
5. Tuân thủ 100% prd-standards.md

Output: DRAFT_V{N+1} với confidence scores
```

**Quay lại Step 2.3** để lưu vào history, sau đó **Step 3.1** để đánh giá lại.

---

## PHASE 3.5: MULTI-EXPERT VALIDATION ⭐ NEW

> **Note:** Phase này chạy SAU khi quality_score >= 80

### Step 3.5.1: Codebase Validation (Priority 1 - #1)
```python
if config.skills.validation[0].condition == "quality_score >= 80":
    if QUALITY_SCORE >= 80:
        # Invoke codebase-validator skill
        validation_result = invoke_skill("codebase-validator", {
            "draft_prd": DRAFT_V{N},
            "project_context": PROJECT_CONTEXT
        })
        
        CODEBASE_VALIDATION_SCORE = validation_result.overall_score.total
        CODEBASE_ISSUES = validation_result.breakdown
        
        log.info({
            "event": "codebase_validation_complete",
            "score": CODEBASE_VALIDATION_SCORE,
            "issues_found": len(validation_result.required_actions)
        })
```

#### Package Registry Lookup (Priority 1 - #2)
```python
# Within codebase-validator, check package registries
for dependency in prd_dependencies:
    npm_exists = check_registry("npm", dependency)
    pypi_exists = check_registry("pypi", dependency)
    
    if not (npm_exists or pypi_exists):
        # HALLUCINATION DETECTED
        flag_critical_issue({
            "type": "HALLUCINATED_PACKAGE",
            "package": dependency,
            "severity": "CRITICAL",
            "action": "BLOCK_AUTO_APPROVAL"
        })
```

### Step 3.5.2: Domain Expert Review (Priority 2 - #6)
```python
if PROCESSING_MODE != "Standard":
    # Invoke domain-expert skill (parallel with codebase-validator)
    domain_result = invoke_skill("domain-expert", {
        "draft_prd": DRAFT_V{N},
        "domain": "Catering"
    })
    
    DOMAIN_EXPERT_SCORE = domain_result.overall_score.total
    DOMAIN_ISSUES = domain_result.breakdown
    
    log.info({
        "event": "domain_review_complete",
        "score": DOMAIN_EXPERT_SCORE,
        "business_rules_violated": len(domain_result.breakdown.business_rules.violations)
    })
```

### Step 3.5.3: Aggregate Multi-Expert Scores
```python
# Weighted average of all expert scores
if PROCESSING_MODE == "Standard":
    FINAL_EXPERT_SCORE = (QUALITY_SCORE * 0.7) + (CODEBASE_VALIDATION_SCORE * 0.3)
elif PROCESSING_MODE == "Enhanced":
    FINAL_EXPERT_SCORE = (
        QUALITY_SCORE * 0.5 + 
        CODEBASE_VALIDATION_SCORE * 0.25 + 
        DOMAIN_EXPERT_SCORE * 0.25
    )
else:  # Deep Analysis
    FINAL_EXPERT_SCORE = (
        QUALITY_SCORE * 0.4 + 
        CODEBASE_VALIDATION_SCORE * 0.3 + 
        DOMAIN_EXPERT_SCORE * 0.3
    )

# Check if validation passed
VALIDATION_PASSED = (
    CODEBASE_VALIDATION_SCORE >= 70 and
    (DOMAIN_EXPERT_SCORE >= 75 if PROCESSING_MODE != "Standard" else True)
)

if not VALIDATION_PASSED:
    # Return to drafting with validation feedback
    CRITIQUE_NOTES.extend(CODEBASE_ISSUES)
    CRITIQUE_NOTES.extend(DOMAIN_ISSUES)
    goto Step 3.3
```

---

## PHASE 4: HUMAN CHECKPOINT

### Step 4.1: Prepare Review Package
```yaml
Review Package:
  - Final Draft: DRAFT_V{FINAL}
  - Quality Score: {QUALITY_SCORE}
  - Codebase Validation Score: {CODEBASE_VALIDATION_SCORE}
  - Domain Expert Score: {DOMAIN_EXPERT_SCORE}
  - Final Expert Score: {FINAL_EXPERT_SCORE}
  - Iterations Completed: {current_iteration}
  - Version History: {draft_history summary}
  - Outstanding Issues: {HIGH severity issues if any}
  - Processing Mode: {PROCESSING_MODE}
```

### Step 4.2: Semantic Health Check (Priority 1 - #4) ⭐ NEW
```python
# Pre-auto-approval semantic checks
semantic_checks = [
    check_no_hallucinated_libraries(),
    check_consistent_terminology(),
    check_complete_user_flows(),
    check_security_controls_defined(),
    check_realistic_effort_estimates()
]

# Evaluate checks
critical_failures = [c for c in semantic_checks if c.severity == "CRITICAL" and not c.passed]
high_failures = [c for c in semantic_checks if c.severity == "HIGH" and not c.passed]

# Block auto-approval conditions
BLOCK_AUTO_APPROVAL = (
    len(critical_failures) > 0 or
    len(high_failures) >= 2 or
    DOMAIN_EXPERT_SCORE < 75 or
    CODEBASE_VALIDATION_SCORE < 70
)
```

### Step 4.3: Human Review Gate
**Condition A: Auto-Approval (nếu tất cả đúng)**
- `FINAL_EXPERT_SCORE >= 90`
- `HIGH_SEVERITY_ISSUES == 0`
- `PROCESSING_MODE != "Deep Analysis"`
- `BLOCK_AUTO_APPROVAL == False` (⭐ NEW)

→ Tự động proceed to Phase 5

**Condition B: Manual Review Required**
- Hiển thị Review Package cho User
- Chờ approval hoặc feedback

### Step 4.4: Handle Feedback
```python
if user_approved:
    FINAL_PRD = DRAFT_V{FINAL}
    goto Phase 5
else:
    # Incorporate user feedback
    USER_FEEDBACK = get_user_input()
    CRITIQUE_NOTES.append(USER_FEEDBACK)
    current_iteration = 0  # Reset counter
    goto Phase 2  # New drafting cycle with feedback
```

---

## PHASE 5: DELIVERY & KNOWLEDGE CONSOLIDATION

### Step 5.1: Artifact Generation
```python
# Generate PRD file
prd_filename = f"PRD-{feature_name}.md"

# Multi-language support (Priority 3 - #11)
if config.i18n.enabled:
    if config.i18n.output_mode == "bilingual":
        generate_bilingual_prd(FINAL_PRD, ["vi-VN", "en-US"])
    else:
        generate_prd(FINAL_PRD, config.i18n.default_locale)

# Include metadata
prd_metadata = {
    "title": feature_name,
    "author": "prd-drafter v2.0",
    "status": "Approved",
    "created": now(),
    "iterations": current_iteration,
    "quality_score": QUALITY_SCORE,
    "codebase_validation_score": CODEBASE_VALIDATION_SCORE,
    "domain_expert_score": DOMAIN_EXPERT_SCORE,
    "processing_mode": PROCESSING_MODE
}
```

### Step 5.2: Test Generation (Priority 2 - #8) ⭐ NEW
```python
if config.skills.post_approval[0].condition == "status == 'Approved'":
    # Invoke test-generator skill
    test_result = invoke_skill("test-generator", {
        "prd": FINAL_PRD
    })
    
    log.info({
        "event": "tests_generated",
        "backend_unit": test_result.statistics.tests_generated.backend_unit,
        "frontend_unit": test_result.statistics.tests_generated.frontend_unit,
        "integration": test_result.statistics.tests_generated.integration,
        "e2e": test_result.statistics.tests_generated.e2e
    })
    
    # Save generated tests
    save_generated_tests(test_result.generated_files)
```

### Step 5.3: Effort Estimation (Priority 3 - #10) ⭐ NEW
```python
if user_requested_estimate or PROCESSING_MODE == "Deep Analysis":
    # Invoke effort-estimator skill
    estimate_result = invoke_skill("effort-estimator", {
        "prd": FINAL_PRD,
        "team_size": config.get("team_size", 2)
    })
    
    log.info({
        "event": "effort_estimated",
        "total_hours": estimate_result.summary.total_effort_hours,
        "calendar_days": estimate_result.summary.calendar_days_estimate,
        "sprints": estimate_result.sprint_suggestion.recommended_sprints
    })
```

### Step 5.4: Knowledge Base Update
```python
if config.knowledge_base.phase_5_update.enabled:
    lessons = {
        "prd_id": prd_id,
        "issues_encountered": CRITIQUE_NOTES,
        "refinement_patterns": extract_refinement_patterns(draft_history),
        "user_feedback": USER_FEEDBACK if user_feedback else None,
        "effort_variance": None  # To be updated after implementation
    }
    
    if config.knowledge_base.phase_5_update.require_approval:
        request_kb_update_approval(lessons)
    else:
        save_to_knowledge_base(lessons)
```

### Step 5.5: Metrics Logging (Priority 2 - #7)
```python
# Calculate and log metrics
metrics = {
    "workflow_id": workflow_id,
    "total_iterations": current_iteration,
    "time_elapsed_seconds": (now() - start_time).seconds,
    "final_quality_score": QUALITY_SCORE,
    "codebase_validation_score": CODEBASE_VALIDATION_SCORE,
    "domain_expert_score": DOMAIN_EXPERT_SCORE,
    "final_expert_score": FINAL_EXPERT_SCORE,
    "confidence_delta": DRAFT_CONFIDENCE - draft_history[0]["confidence"],
    "processing_mode": PROCESSING_MODE,
    "auto_approved": AUTO_APPROVED,
    "tests_generated": test_result.statistics if test_result else None
}

log.info({"event": "workflow_completed", **metrics})
export_metrics(metrics, config.observability.metrics.export_path)
```

### Step 5.6: CI/CD Webhook (Priority 3 - #9) ⭐ NEW
```python
if config.cicd.enabled:
    # Send webhook notification
    send_webhook("prd.approved", {
        "prd_id": prd_id,
        "title": feature_name,
        "quality_score": QUALITY_SCORE,
        "tests_generated": test_result.statistics.tests_generated if test_result else {},
        "effort_estimate": estimate_result.summary if estimate_result else None
    })
```

### Step 5.7: Next Step Prompt
Hiển thị thông điệp tương tác:

> 📋 **PRD đã hoàn thành!**
> - Quality Score: {QUALITY_SCORE}/100
> - Codebase Validation: {CODEBASE_VALIDATION_SCORE}/100
> - Domain Expert: {DOMAIN_EXPERT_SCORE}/100
> - Iterations: {current_iteration}
> - Processing Mode: {PROCESSING_MODE}
> - Tests Generated: {test_count}
> - Estimated Effort: {effort_hours} hours
>
> **Bạn muốn làm gì tiếp theo?**
> 1. `/plan` - Tạo Implementation Plan từ PRD này
> 2. `/estimate` - Xem chi tiết effort estimation
> 3. `/decompose` - Chia nhỏ thành user stories
> 4. `/review` - Request peer review
> 5. `/tests` - View generated test cases

---

## 📊 APPENDIX A: QUALITY SCORING RUBRIC

### Completeness (25 points)
| Criteria | Points |
|:---------|:------:|
| Title & Metadata đầy đủ | 3 |
| Problem Statement rõ ràng | 5 |
| Proposed Solution chi tiết | 5 |
| User Stories + AC đầy đủ | 7 |
| Technical Specs (DB + API) | 5 |

### Consistency (25 points)
| Criteria | Points |
|:---------|:------:|
| Thuật ngữ thống nhất | 10 |
| Không có mâu thuẫn logic | 10 |
| Format đúng chuẩn | 5 |

### Security (25 points)
| Criteria | Points |
|:---------|:------:|
| Auth/AuthZ defined | 8 |
| Input validation | 7 |
| Rate limiting | 5 |
| Data protection | 5 |

### Feasibility (25 points)
| Criteria | Points |
|:---------|:------:|
| Phù hợp tech stack | 10 |
| Realistic scope | 10 |
| Dependencies identified | 5 |

---

## 📊 APPENDIX B: MULTI-EXPERT SCORING WEIGHTS

| Processing Mode | prd-critic | codebase-validator | domain-expert |
|:----------------|:----------:|:------------------:|:-------------:|
| Standard | 70% | 30% | - |
| Enhanced | 50% | 25% | 25% |
| Deep Analysis | 40% | 30% | 30% |

---

## 🔧 APPENDIX C: CONFIGURATION REFERENCE

See `.agent/config/prd-workflow.yaml` for full configuration options.

---

**Version History:**
- v1.0.0: Initial release (single iteration)
- v2.0.0: Full Reflexion Loop with System 2 patterns
- v2.1.0: All Priority 1/2/3 recommendations implemented
  - Added: codebase-validator, domain-expert, test-generator, effort-estimator
  - Added: Observability, CI/CD integration, multi-language support
  - Updated: Dynamic stagnation, semantic health check, knowledge base
