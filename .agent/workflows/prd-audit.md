---
description: Workflow audit module và LUÔN tạo Improvement PRD (V3.2.2) với Feature Completeness Check.
version: 3.2.2
trigger: /prd-audit [module-name] [--dry-run] [--fast]
config: .agent/config/prd-workflow.yaml
---

# WORKFLOW: MODULE AUDIT & IMPROVEMENT PRD V3.2.2


> **Philosophy:** Continuous Improvement through Systematic Audit + Full Reflexion Loop
> 
> **Key Upgrades từ V3.1 (Business Flow Validation):**
> - ✅ **Phase 2.5:** Business Flow Validation (Cross-module)
> - ✅ **business-flow-validator skill:** Config-driven, reusable for any project
> - ✅ State machine, integration, dependency, business rules validation
>
> **Previous V3.1 Upgrades:**
> - ✅ **R14:** Data Completeness Check (FE-BE sync validation)
>
> **Previous V3.0 Upgrades:**
> - ✅ **R1:** Circuit Breaker Pattern for cascading failures
> - ✅ **R2:** Skill Result Caching
> - ✅ **R3:** Fixed Stagnation False-Positive at threshold
> - ✅ **R4:** Token Cost Tracking per phase
> - ✅ **R5:** Parallel Multi-Expert Execution
> - ✅ **R6:** Early-Exit for high-confidence drafts
> - ✅ **R9:** Configurable dimension weights per module
> - ✅ **R10:** Dry-run mode for cost estimation


---

## PHASE 0: INITIALIZATION

```yaml
# Load configuration
config = load_yaml(".agent/config/prd-workflow.yaml")

# Internal Variables
audit_id: generate_uuid()
module_name: extract_from_trigger()  # e.g., "quote", "inventory", "user"
timestamp: now()

# Command-line flags (⭐ NEW R10)
DRY_RUN_MODE: "--dry-run" in args
FAST_MODE: "--fast" in args  # Skip non-essential validations

# Reflexion Loop Variables
MAX_ITERATIONS: config.reflexion_prd.max_iterations  # 3
QUALITY_THRESHOLD: config.reflexion_prd.quality_threshold  # 85
current_iteration: 0
draft_history: []
start_time: now()

# ⭐ NEW V3.0: Cost Tracking (R4)
cost_tracker = {
    "total_tokens": 0,
    "phase_breakdown": {},
    "skill_invocations": 0,
    "cache_hits": 0
}

# ⭐ NEW V3.0: Skill Cache (R2)
skill_cache = {}

# ⭐ NEW V3.0: Circuit Breaker State (R1)
circuit_breaker = {
    "failure_count": 0,
    "max_failures": 3,
    "state": "CLOSED",  # CLOSED | OPEN | HALF_OPEN
    "last_failure_time": None
}
```

### Step 0.1: Initialize Observability
```python
# Start tracing with cost tracking
trace = start_trace(audit_id)
log.info({
    "event": "audit_started",
    "audit_id": audit_id,
    "module": module_name,
    "workflow_version": "3.1.0",
    "dry_run": DRY_RUN_MODE,
    "fast_mode": FAST_MODE,
    "timestamp": now()
})
```

### Step 0.2: Dry-Run Early Exit (⭐ NEW R10)
```python
if DRY_RUN_MODE:
    # Estimate cost without executing
    estimated_cost = estimate_workflow_cost(module_name, config)
    
    return {
        "mode": "DRY_RUN",
        "estimated_tokens": estimated_cost.total_tokens,
        "estimated_time_seconds": estimated_cost.time_seconds,
        "phases_to_run": estimated_cost.phases,
        "skills_to_invoke": estimated_cost.skills
    }
```

### Step 0.3: Validate Module
```python
# ⭐ IMPROVED: Use config-based path lookup
module_config = get_module_config(module_name, config.module_audit.available_modules)

if not module_config:
    # Check if module exists at default paths
    module_paths = {
        "backend": f"backend/modules/{module_name}",
        "frontend": f"frontend/src/app/{module_name}"
    }
    
    # Also check alternative frontend paths
    alt_paths = [
        f"frontend/src/app/admin/{module_name}",
        f"frontend/src/app/admin/{module_name}-management"
    ]
    
    for alt in alt_paths:
        if exists(alt):
            module_paths["frontend"] = alt
            break
else:
    module_paths = module_config.paths
```

---

## PHASE 1: MODULE DISCOVERY

### Step 1.0: Knowledge Base Query
```python
# Query past audits and PRDs for this module
if config.knowledge_base.enabled:
    # ⭐ NEW: Check cache first (R2)
    cache_key = f"kb_query_{module_name}"
    if cache_key in skill_cache and not cache_expired(skill_cache[cache_key]):
        past_audits = skill_cache[cache_key].data
        cost_tracker["cache_hits"] += 1
    else:
        past_audits = query_knowledge_base(
            query=f"audit {module_name}",
            sources=["audits", "prds", "lessons"],
            max_results=5
        )
        skill_cache[cache_key] = CacheEntry(data=past_audits, expires=now() + timedelta(hours=1))
    
    past_lessons = extract_lessons(past_audits)
    log.info({
        "event": "kb_query_complete",
        "past_audits_found": len(past_audits),
        "lessons_extracted": len(past_lessons),
        "cache_hit": cache_key in skill_cache
    })
```

**Output:** `HISTORICAL_AUDITS`, `PAST_LESSONS`

### Step 1.1: Scan Module Structure
```python
# Discover all files in module
frontend_path = module_paths.get("frontend", f"frontend/src/app/{module_name}")

module_files = {
    "backend": {
        "models": scan_files(f"{module_paths['backend']}/domain/*.py"),
        "router": scan_files(f"{module_paths['backend']}/**/router*.py"),
        "services": scan_files(f"{module_paths['backend']}/**/*service*.py")
    },
    "frontend": {
        "components": scan_dirs(f"{frontend_path}/components/*"),
        "services": scan_files(f"{frontend_path}/**/*.service.ts"),
        "models": scan_files(f"{frontend_path}/**/*.model.ts")
    },
    "database": {
        "migrations": find_migrations_for_module(module_name)
    }
}

# ⭐ Update cost tracker
cost_tracker["phase_breakdown"]["discovery"] = count_tokens_used()

log.info({
    "event": "module_scanned",
    "total_files": count_files(module_files),
    "structure": summarize(module_files)
})
```

### Step 1.2: Load Module Context
```python
# Load related context
context = {
    "core_rules": read_file(".agent/rules/core.md"),
    "prd_standards": read_file(".agent/rules/prd-standards.md"),
    "permission_matrix": read_file(".agent/permission-matrix.md"),
    "existing_prds": find_prds_for_module(module_name),
    "past_lessons": PAST_LESSONS
}
```

**Output:** `MODULE_FILES`, `MODULE_CONTEXT`

---

## PHASE 2: 5-DIMENSION AUDIT

### Step 2.1: Get Dimension Weights (⭐ NEW R9)
```python
# Configurable weights per module type
if module_name in config.module_audit.custom_weights:
    DIMENSION_WEIGHTS = config.module_audit.custom_weights[module_name]
else:
    DIMENSION_WEIGHTS = config.module_audit.dimension_weights  # Default 20/20/20/20/20
    
log.info({
    "event": "dimension_weights_loaded",
    "module": module_name,
    "weights": DIMENSION_WEIGHTS
})
```

### Step 2.2: Invoke Module Auditor
```python
# ⭐ Check circuit breaker state (R1)
if circuit_breaker["state"] == "OPEN":
    if time_since(circuit_breaker["last_failure_time"]) > config.circuit_breaker.cooldown_seconds:
        circuit_breaker["state"] = "HALF_OPEN"
        log.info({"event": "circuit_breaker_half_open"})
    else:
        raise CircuitBreakerOpenError("Workflow halted due to repeated failures")

try:
    # Kích hoạt skill module-auditor
    audit_result = invoke_skill("module-auditor", {
        "module_name": module_name,
        "module_files": MODULE_FILES,
        "context": MODULE_CONTEXT,
        "dimension_weights": DIMENSION_WEIGHTS  # ⭐ Pass custom weights
    })
    
    # Reset circuit breaker on success
    if circuit_breaker["state"] == "HALF_OPEN":
        circuit_breaker["state"] = "CLOSED"
        circuit_breaker["failure_count"] = 0
        
    cost_tracker["skill_invocations"] += 1
    
except Exception as e:
    # ⭐ Circuit breaker pattern (R1)
    circuit_breaker["failure_count"] += 1
    circuit_breaker["last_failure_time"] = now()
    
    if circuit_breaker["failure_count"] >= circuit_breaker["max_failures"]:
        circuit_breaker["state"] = "OPEN"
        log.error({"event": "circuit_breaker_opened", "reason": str(e)})
        raise CircuitBreakerOpenError("Too many consecutive failures")
    
    raise

AUDIT_SCORE = audit_result.overall_score.total
AUDIT_GRADE = audit_result.overall_score.grade
DIMENSION_SCORES = audit_result.dimension_scores
ALL_ISSUES = audit_result.all_issues

# ⭐ Update cost tracker
cost_tracker["phase_breakdown"]["audit"] = count_tokens_used()
```

### Step 2.3: Display Audit Summary
```markdown
## 📊 Audit Results: {module_name}

| Dimension | Score | Max | Weight | Status |
|:----------|:-----:|:---:|:------:|:-------|
| UX | {ux_score} | 20 | {DIMENSION_WEIGHTS.UX}% | {status_emoji} |
| UI | {ui_score} | 20 | {DIMENSION_WEIGHTS.UI}% | {status_emoji} |
| FE | {fe_score} | 20 | {DIMENSION_WEIGHTS.FE}% | {status_emoji} |
| BE | {be_score} | 20 | {DIMENSION_WEIGHTS.BE}% | {status_emoji} |
| DA | {da_score} | 20 | {DIMENSION_WEIGHTS.DA}% | {status_emoji} |
| **Total** | **{total}** | **100** | - | **Grade: {grade}** |

### Issues Found
- 🔴 CRITICAL: {critical_count}
- 🟠 HIGH: {high_count}
- 🟡 MEDIUM: {medium_count}
- 🟢 LOW: {low_count}

### Cost So Far
- Tokens Used: {cost_tracker.total_tokens}
- Cache Hits: {cost_tracker.cache_hits}
```

### Step 2.4: Determine Next Action
```python
# ⭐ V3.2.1 UPDATE: Always generate PRD regardless of score
# Only processing mode changes based on score

ACTION = "GENERATE_IMPROVEMENT_PRD"  # Always generate PRD

if AUDIT_SCORE >= 90:
    PROCESSING_MODE = "Standard"
    message = "Module is healthy. Generating minor polish PRD..."
elif AUDIT_SCORE >= 80:
    PROCESSING_MODE = "Standard"
    message = "Module is good. Generating improvement PRD..."
elif AUDIT_SCORE >= 70:
    PROCESSING_MODE = "Enhanced"
    message = "Module needs work. Generating detailed improvement PRD..."
elif AUDIT_SCORE >= 60:
    PROCESSING_MODE = "Enhanced"
    message = "Module is poor. Generating comprehensive improvement PRD..."
else:
    PROCESSING_MODE = "Deep Analysis"
    message = "Module is critical. Generating full refactor PRD..."

# Display summary (no prompt, auto-proceed)
log.info({
    "event": "prd_generation_started",
    "score": AUDIT_SCORE,
    "grade": AUDIT_GRADE,
    "processing_mode": PROCESSING_MODE,
    "message": message
})

# ⭐ Auto-proceed to Phase 3 (no user confirmation needed)
# Previous behavior: prompt_user() - now removed for auto-flow
```


---

## PHASE 2.5: BUSINESS FLOW VALIDATION (⭐ NEW V3.2)

> **Purpose:** Validate cross-module business flows, integrations, and business rules.
> This phase uses config-driven approach - reusable for any project.

### Step 2.5.1: Load Flow Config
```python
# Check if business-flows.yaml exists
flow_config_path = ".agent/config/business-flows.yaml"

if not exists(flow_config_path):
    log.warning({
        "event": "flow_config_not_found",
        "path": flow_config_path,
        "action": "Skipping business flow validation"
    })
    FLOW_VALIDATION_SCORE = None
    FLOW_ISSUES = []
    goto Phase 3

flow_config = load_yaml(flow_config_path)

log.info({
    "event": "flow_config_loaded",
    "domain": flow_config.domain,
    "version": flow_config.version,
    "modules_count": len(flow_config.modules),
    "flows_count": len(flow_config.flows)
})
```

### Step 2.5.2: Check Module in Config
```python
# Verify module is defined in config
module_in_config = any(m.name == module_name for m in flow_config.modules)

if not module_in_config:
    log.warning({
        "event": "module_not_in_flow_config",
        "module": module_name,
        "action": "Skipping flow validation for this module"
    })
    FLOW_VALIDATION_SCORE = None
    FLOW_ISSUES = []
    goto Phase 3

# Find related flows for this module
related_flows = [
    flow_id for flow_id, flow in flow_config.flows.items()
    if module_name in [m.split('.')[0].lower() for m in flow.entities_involved]
    or module_name in flow_config.dependencies.get(module_name, {}).get("depends_on", [])
    or module_name in flow_config.dependencies.get(module_name, {}).get("provides_to", [])
]

log.info({
    "event": "related_flows_found",
    "module": module_name,
    "flows": related_flows
})
```

### Step 2.5.3: Invoke Business Flow Validator
```python
# ⭐ Check circuit breaker
if circuit_breaker["state"] == "OPEN":
    log.warning({"event": "circuit_breaker_open_flow_validation_skipped"})
    FLOW_VALIDATION_SCORE = None
    FLOW_ISSUES = []
    goto Phase 3

try:
    # Invoke the config-driven skill
    flow_result = invoke_skill("business-flow-validator", {
        "module_name": module_name,
        "config": flow_config,
        "module_files": MODULE_FILES,
        "related_flows": related_flows
    })
    
    FLOW_VALIDATION_SCORE = flow_result.overall_score.total
    FLOW_GRADE = flow_result.overall_score.grade
    FLOW_ISSUES = flow_result.critical_issues + flow_result.breakdown.get_all_issues()
    
    cost_tracker["skill_invocations"] += 1
    
    log.info({
        "event": "flow_validation_complete",
        "score": FLOW_VALIDATION_SCORE,
        "grade": FLOW_GRADE,
        "issues_found": len(FLOW_ISSUES),
        "flows_validated": len(related_flows)
    })
    
except Exception as e:
    circuit_breaker["failure_count"] += 1
    log.error({
        "event": "flow_validation_failed",
        "error": str(e)
    })
    FLOW_VALIDATION_SCORE = None
    FLOW_ISSUES = []
```

### Step 2.5.4: Merge Flow Issues with Audit Issues
```python
if FLOW_ISSUES:
    # Add flow issues to the main issues list
    for issue in FLOW_ISSUES:
        # Tag issues with flow source
        issue["source"] = "business_flow_validator"
        ALL_ISSUES.append(issue)
    
    log.info({
        "event": "flow_issues_merged",
        "flow_issues_count": len(FLOW_ISSUES),
        "total_issues_count": len(ALL_ISSUES)
    })

# Adjust processing mode if critical flow issues found
critical_flow_issues = [i for i in FLOW_ISSUES if i.get("severity") == "CRITICAL"]

if len(critical_flow_issues) > 0:
    log.warning({
        "event": "critical_flow_issues_detected",
        "count": len(critical_flow_issues),
        "action": "Upgrading to Deep Analysis mode"
    })
    PROCESSING_MODE = "Deep Analysis"
```

### Step 2.5.5: Display Flow Validation Summary
```markdown
## 🔄 Business Flow Validation: {module_name}

| Category | Score | Max | Issues |
|:---------|:-----:|:---:|:------:|
| Module Structure | {structure_score} | 20 | {issues} |
| State Machines | {state_score} | 25 | {issues} |
| Integrations | {integration_score} | 30 | {issues} |
| Dependencies | {dependency_score} | 15 | {issues} |
| Business Rules | {rules_score} | 10 | {issues} |
| **Total** | **{FLOW_VALIDATION_SCORE}** | **100** | **Grade: {FLOW_GRADE}** |

### Flows Validated
{related_flows list}

### Critical Issues (if any)
{critical_flow_issues}
```

### Step 2.5.6: Update Cost Tracker
```python
cost_tracker["phase_breakdown"]["flow_validation"] = count_tokens_used()
```

---

## PHASE 2.6: FEATURE COMPLETENESS CHECK (⭐ NEW V3.2.2)

> **Purpose:** Kiểm tra xem module có đủ các tính năng chuẩn hay không.
> Sử dụng config-driven approach với `.agent/config/feature-checklists.yaml`

### Step 2.6.1: Load Feature Checklist
```python
# Check if feature-checklists.yaml exists
checklist_config_path = ".agent/config/feature-checklists.yaml"

if not exists(checklist_config_path):
    log.warning({
        "event": "feature_checklist_not_found",
        "path": checklist_config_path,
        "action": "Skipping feature completeness check"
    })
    FEATURE_COMPLETENESS_SCORE = None
    MISSING_FEATURES = []
    goto Phase 3

checklist_config = load_yaml(checklist_config_path)

log.info({
    "event": "feature_checklist_loaded",
    "domain": checklist_config.domain,
    "version": checklist_config.version
})
```

### Step 2.6.2: Get Module Checklist
```python
# Get checklist for this module
if module_name not in checklist_config:
    log.warning({
        "event": "module_not_in_checklist",
        "module": module_name,
        "action": "Skipping feature completeness check"
    })
    FEATURE_COMPLETENESS_SCORE = None
    MISSING_FEATURES = []
    goto Phase 3

module_checklist = checklist_config[module_name]
expected_features = module_checklist.features
global_features = checklist_config.get("_global", {}).get("features", [])

# Combine module-specific + global features
all_expected_features = expected_features + global_features

log.info({
    "event": "checklist_loaded",
    "module": module_name,
    "expected_features": len(all_expected_features)
})
```

### Step 2.6.3: Check Each Feature
```python
FOUND_FEATURES = []
MISSING_FEATURES = []

for feature in all_expected_features:
    feature_id = feature.id
    verify_by = feature.verify_by
    is_found = False
    
    # Check by files existence
    if verify_by.get("files"):
        for file_pattern in verify_by.files:
            if glob_exists(file_pattern):
                is_found = True
                break
    
    # Check by grep patterns
    if not is_found and verify_by.get("grep"):
        for grep_check in verify_by.grep:
            pattern = grep_check.pattern
            search_in = grep_check.get("in", ".")
            
            if grep_search(pattern, search_in):
                is_found = True
                break
    
    if is_found:
        FOUND_FEATURES.append(feature)
    else:
        MISSING_FEATURES.append(feature)
        
        # Add as issue
        severity = "CRITICAL" if feature.priority == "CRITICAL" else \
                   "HIGH" if feature.priority == "HIGH" else "MEDIUM"
        
        ALL_ISSUES.append({
            "id": f"FEAT_{feature.id.upper()}",
            "severity": severity,
            "category": "FEATURE_GAP",
            "source": "feature_completeness_check",
            "description": f"Missing feature: {feature.name}",
            "feature_id": feature.id,
            "feature_name": feature.name
        })

log.info({
    "event": "feature_check_complete",
    "found": len(FOUND_FEATURES),
    "missing": len(MISSING_FEATURES)
})
```

### Step 2.6.4: Calculate Feature Completeness Score
```python
total_features = len(all_expected_features)
found_count = len(FOUND_FEATURES)

# Calculate weighted score (CRITICAL=3, HIGH=2, MEDIUM=1, LOW=0.5)
max_weighted = sum([
    3 if f.priority == "CRITICAL" else
    2 if f.priority == "HIGH" else
    1 if f.priority == "MEDIUM" else 0.5
    for f in all_expected_features
])

found_weighted = sum([
    3 if f.priority == "CRITICAL" else
    2 if f.priority == "HIGH" else
    1 if f.priority == "MEDIUM" else 0.5
    for f in FOUND_FEATURES
])

FEATURE_COMPLETENESS_SCORE = round((found_weighted / max_weighted) * 100) if max_weighted > 0 else 100
FEATURE_COMPLETENESS_GRADE = grade_from_score(FEATURE_COMPLETENESS_SCORE)

log.info({
    "event": "feature_completeness_scored",
    "score": FEATURE_COMPLETENESS_SCORE,
    "grade": FEATURE_COMPLETENESS_GRADE,
    "found": f"{found_count}/{total_features}"
})
```

### Step 2.6.5: Display Feature Completeness Summary
```markdown
## 📋 Feature Completeness Check: {module_name}

| Priority | Expected | Found | Missing |
|:---------|:--------:|:-----:|:-------:|
| CRITICAL | {critical_total} | {critical_found} | {critical_missing} |
| HIGH | {high_total} | {high_found} | {high_missing} |
| MEDIUM | {medium_total} | {medium_found} | {medium_missing} |
| LOW | {low_total} | {low_found} | {low_missing} |
| **Total** | **{total}** | **{found}** | **{missing}** |

### Completeness Score: {FEATURE_COMPLETENESS_SCORE}% (Grade: {FEATURE_COMPLETENESS_GRADE})

### Missing Features (if any)
{MISSING_FEATURES list with priority and name}
```

### Step 2.6.6: Adjust Processing Mode
```python
# If many critical features missing, upgrade to Deep Analysis
critical_missing = [f for f in MISSING_FEATURES if f.priority == "CRITICAL"]

if len(critical_missing) >= 2:
    log.warning({
        "event": "multiple_critical_features_missing",
        "count": len(critical_missing),
        "action": "Upgrading to Deep Analysis mode"
    })
    PROCESSING_MODE = "Deep Analysis"

# Update cost tracker
cost_tracker["phase_breakdown"]["feature_completeness"] = count_tokens_used()
```

---

## PHASE 3: IMPROVEMENT PRD GENERATION


> **Note:** This phase implements FULL reflexion loop with optimizations

### Step 3.1: Prioritize Issues
```python
# Group issues by priority
priority_matrix = {
    "P0_Critical": [i for i in ALL_ISSUES if i.severity == "CRITICAL"],
    "P1_Security": [i for i in ALL_ISSUES if i.severity == "HIGH" and i.category == "BE"],
    "P2_Experience": [i for i in ALL_ISSUES if i.category in ["UX", "UI"]],
    "P3_Technical": [i for i in ALL_ISSUES if i.category in ["FE", "DA"]]
}

# Calculate initial effort
total_effort = estimate_effort(ALL_ISSUES)
```

### Step 3.2: Generate Initial Improvement PRD Draft
```python
# ⭐ Check cache for similar drafts (R2)
draft_cache_key = f"draft_{module_name}_{hash(str(priority_matrix))}"

if draft_cache_key in skill_cache and not cache_expired(skill_cache[draft_cache_key]):
    improvement_prd = skill_cache[draft_cache_key].data
    cost_tracker["cache_hits"] += 1
    log.info({"event": "draft_cache_hit", "module": module_name})
else:
    # Invoke prd-drafter in IMPROVEMENT mode
    improvement_prd = invoke_skill("prd-drafter", {
        "mode": "IMPROVEMENT",
        "processing_mode": PROCESSING_MODE,
        "audit_result": audit_result,
        "priority_matrix": priority_matrix,
        "past_lessons": PAST_LESSONS,
        "instruction": """
        Tạo Improvement PRD cho module {module_name}.
        
        Dựa trên kết quả audit:
        - Score: {AUDIT_SCORE}/100
        - Issues: {len(ALL_ISSUES)} issues found
        
        PRD phải bao gồm:
        1. Problem Statement: Tóm tắt các vấn đề phát hiện
        2. Proposed Solution: Cải tiến theo priority
        3. User Stories: Mỗi nhóm issues thành 1 story
        4. Technical Specs: Chi tiết fix cho từng issue
        5. NFRs: Đảm bảo compliance với core.md
        6. Verification: Cách verify sau khi fix
        7. Acceptance Criteria: Để generate test cases
        """
    })
    
    cost_tracker["skill_invocations"] += 1

DRAFT_CONFIDENCE = improvement_prd.confidence
```

### Step 3.3: Early Exit Check (⭐ NEW R6)
```python
# If first draft has very high confidence, consider early exit
if current_iteration == 0 and DRAFT_CONFIDENCE >= 90 and FAST_MODE:
    log.info({
        "event": "early_exit_triggered",
        "confidence": DRAFT_CONFIDENCE,
        "reason": "High confidence first draft in FAST_MODE"
    })
    # Skip reflexion loop, go directly to multi-expert
    goto Phase 4.5
```

### Step 3.4: Store in Draft History
```python
draft_history.append({
    "version": current_iteration + 1,
    "content": improvement_prd,
    "confidence": DRAFT_CONFIDENCE,
    "timestamp": now()
})

log.info({
    "event": "draft_created",
    "version": current_iteration + 1,
    "confidence": DRAFT_CONFIDENCE
})

# ⭐ Update cost tracker
cost_tracker["phase_breakdown"]["drafting"] = count_tokens_used()
```

---

## PHASE 4: THE REFLEXION LOOP (⭐ IMPROVED)

### Step 4.1: Critical Analysis
```python
# ⭐ Check circuit breaker
if circuit_breaker["state"] == "OPEN":
    raise CircuitBreakerOpenError("Reflexion loop halted")

try:
    # Invoke prd-critic skill explicitly
    CRITIQUE_NOTES = invoke_skill("prd-critic", {
        "draft": improvement_prd,
        "assumptions": improvement_prd.assumptions,
        "processing_mode": PROCESSING_MODE,
        "audit_context": audit_result
    })
    
    cost_tracker["skill_invocations"] += 1
    
except Exception as e:
    circuit_breaker["failure_count"] += 1
    if circuit_breaker["failure_count"] >= circuit_breaker["max_failures"]:
        circuit_breaker["state"] = "OPEN"
    raise

QUALITY_SCORE = CRITIQUE_NOTES.quality_score
ISSUES = CRITIQUE_NOTES.issues
```

### Step 4.2: Evaluate with FIXED Stagnation Logic (⭐ R3 FIX)
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
    stagnation_threshold = 2  # Default static

# Check for stagnation
if len(draft_history) >= 2:
    previous_score = draft_history[-2].get("quality_score", 0)
    improvement = QUALITY_SCORE - previous_score
    is_stagnating = improvement < stagnation_threshold
else:
    is_stagnating = False

# Store quality score in history
draft_history[-1]["quality_score"] = QUALITY_SCORE

# ⭐ FIXED DECISION LOGIC (R3): Check threshold FIRST
if QUALITY_SCORE >= QUALITY_THRESHOLD:
    # EXIT LOOP - Proceed to Phase 4.5 (Multi-Expert)
    log.info({
        "event": "quality_threshold_met",
        "score": QUALITY_SCORE,
        "threshold": QUALITY_THRESHOLD,
        "iterations": current_iteration
    })
    goto Phase 4.5
elif is_stagnating and QUALITY_SCORE < (QUALITY_THRESHOLD - 2):
    # ⭐ R3 FIX: Only trigger stagnation if NOT within 2 points of threshold
    # This prevents false positive when score is 84 improving to 85
    HUMAN_INTERVENTION_NEEDED = True
    log.warning({
        "event": "stagnation_detected",
        "iteration": current_iteration,
        "quality_score": QUALITY_SCORE,
        "improvement": improvement,
        "stagnation_threshold": stagnation_threshold
    })
    goto Phase 5
elif current_iteration < MAX_ITERATIONS:
    # CONTINUE LOOP - Self-Correction
    current_iteration += 1
    goto Step 4.3
else:
    # MAX ITERATIONS REACHED - Force Human Review
    HUMAN_REVIEW_REQUIRED = True
    goto Phase 5
```

### Step 4.3: Self-Correction (Refinement)
```python
# Re-invoke prd-drafter with critique feedback
refined_prd = invoke_skill("prd-drafter", {
    "mode": "REFINEMENT",
    "original_draft": improvement_prd,
    "critique_notes": CRITIQUE_NOTES,
    "draft_history": draft_history,
    "instruction": f"""
    Đây là Iteration #{current_iteration}.
    
    1. Đọc DRAFT và CRITIQUE_NOTES
    2. Review draft_history để không lặp lại lỗi đã fix
    3. Giải quyết triệt để mọi điểm phê bình
    4. Đảm bảo Acceptance Criteria rõ ràng cho test generation
    
    Output: DRAFT_V{current_iteration + 1} với confidence scores
    """
})

cost_tracker["skill_invocations"] += 1

improvement_prd = refined_prd
DRAFT_CONFIDENCE = refined_prd.confidence

# Loop back to Step 3.4 to store, then Step 4.1 to evaluate
goto Step 3.4
```

---

## PHASE 4.5: MULTI-EXPERT VALIDATION (⭐ PARALLEL EXECUTION R5)

> **Note:** Runs AFTER quality_score >= QUALITY_THRESHOLD

### Step 4.5.1: Parallel Expert Invocation (⭐ NEW R5)
```python
# ⭐ V3.0: Invoke experts in PARALLEL for performance
from concurrent.futures import ThreadPoolExecutor, as_completed

expert_tasks = []

async def invoke_experts_parallel():
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Submit codebase-validator
        codebase_future = executor.submit(
            invoke_skill,
            "codebase-validator",
            {
                "draft_prd": improvement_prd,
                "module_files": MODULE_FILES,
                "project_context": MODULE_CONTEXT
            }
        )
        expert_tasks.append(("codebase-validator", codebase_future))
        
        # Submit domain-expert (if not Standard mode)
        if PROCESSING_MODE != "Standard":
            domain_future = executor.submit(
                invoke_skill,
                "domain-expert",
                {
                    "draft_prd": improvement_prd,
                    "domain": "Catering ERP",
                    "audit_context": audit_result
                }
            )
            expert_tasks.append(("domain-expert", domain_future))
        
        # Wait for all tasks and collect results
        results = {}
        for name, future in expert_tasks:
            try:
                results[name] = future.result(timeout=60)  # 60 second timeout
                cost_tracker["skill_invocations"] += 1
            except TimeoutError:
                log.error({"event": "expert_timeout", "expert": name})
                circuit_breaker["failure_count"] += 1
                results[name] = None
            except Exception as e:
                log.error({"event": "expert_error", "expert": name, "error": str(e)})
                circuit_breaker["failure_count"] += 1
                results[name] = None
        
        return results

expert_results = await invoke_experts_parallel()
```

### Step 4.5.2: Process Results
```python
# Codebase Validation
if expert_results.get("codebase-validator"):
    validation_result = expert_results["codebase-validator"]
    CODEBASE_VALIDATION_SCORE = validation_result.overall_score.total
    CODEBASE_ISSUES = validation_result.required_actions
else:
    CODEBASE_VALIDATION_SCORE = 0
    CODEBASE_ISSUES = [{"severity": "HIGH", "issue": "Validation failed/timeout"}]

log.info({
    "event": "codebase_validation_complete",
    "score": CODEBASE_VALIDATION_SCORE,
    "issues_found": len(CODEBASE_ISSUES)
})

# Domain Expert Review
if PROCESSING_MODE != "Standard":
    if expert_results.get("domain-expert"):
        domain_result = expert_results["domain-expert"]
        DOMAIN_EXPERT_SCORE = domain_result.overall_score.total
        DOMAIN_ISSUES = domain_result.business_rule_violations
    else:
        DOMAIN_EXPERT_SCORE = 0
        DOMAIN_ISSUES = [{"severity": "HIGH", "issue": "Domain review failed/timeout"}]
    
    log.info({
        "event": "domain_review_complete",
        "score": DOMAIN_EXPERT_SCORE,
        "violations": len(DOMAIN_ISSUES)
    })
else:
    DOMAIN_EXPERT_SCORE = 100
    DOMAIN_ISSUES = []

# ⭐ Update cost tracker
cost_tracker["phase_breakdown"]["validation"] = count_tokens_used()
```

### Step 4.5.3: Aggregate Multi-Expert Scores
```python
# Weighted average based on processing mode
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
    # Return to refinement with validation feedback
    CRITIQUE_NOTES.issues.extend(CODEBASE_ISSUES)
    CRITIQUE_NOTES.issues.extend(DOMAIN_ISSUES)
    current_iteration += 1
    goto Step 4.3
```

### Step 4.5.4: Data Completeness Check (⭐ NEW V3.1 - R14)
```python
# ⭐ V3.1: Prevent issues like Permission Matrix missing modules
# Cross-validate FE mock data/config with BE actual config

DATA_COMPLETENESS_ISSUES = []

# 1. Check for Permission/Config Sync
if module_has_permission_components(MODULE_FILES):
    # Extract FE permission modules
    fe_permission_modules = []
    for file in MODULE_FILES["frontend"]["services"]:
        if "permission" in file.lower() or "user.service" in file.lower():
            fe_modules = extract_permission_modules_from_file(file)
            fe_permission_modules.extend(fe_modules)
    
    # Extract BE MODULE_ACCESS
    be_module_access = extract_module_access_from_backend(
        "backend/core/auth/permissions.py"
    )
    
    # Compare
    fe_set = set(fe_permission_modules)
    be_set = set(be_module_access.keys())
    
    missing_in_fe = be_set - fe_set
    missing_in_be = fe_set - be_set
    
    if missing_in_fe:
        DATA_COMPLETENESS_ISSUES.append({
            "severity": "CRITICAL",
            "area": "PERMISSION_SYNC",
            "title": f"Frontend missing {len(missing_in_fe)} permission modules",
            "description": f"Backend has {len(be_set)} modules, Frontend only has {len(fe_set)}",
            "missing_modules": list(missing_in_fe),
            "fix": "Update getPermissionModules() in user.service.ts"
        })
        log.warning({
            "event": "data_completeness_gap",
            "type": "permission_modules",
            "missing": list(missing_in_fe)
        })

# 2. Check for Mock Data vs API Sync
if module_has_mock_data(MODULE_FILES):
    mock_data_files = find_mock_data_files(MODULE_FILES)
    for mock_file in mock_data_files:
        mock_items = extract_mock_items(mock_file)
        api_items = extract_api_response_schema(MODULE_FILES["backend"])
        
        if len(mock_items) != len(api_items):
            DATA_COMPLETENESS_ISSUES.append({
                "severity": "MEDIUM",
                "area": "MOCK_DATA_SYNC",
                "title": f"Mock data count mismatch in {mock_file}",
                "description": f"Mock has {len(mock_items)} items, API schema expects {len(api_items)}"
            })

# 3. Check for Enum/Constant Sync
fe_enums = extract_enums_from_frontend(MODULE_FILES)
be_enums = extract_enums_from_backend(MODULE_FILES)

for enum_name in set(fe_enums.keys()) & set(be_enums.keys()):
    fe_values = set(fe_enums[enum_name])
    be_values = set(be_enums[enum_name])
    if fe_values != be_values:
        DATA_COMPLETENESS_ISSUES.append({
            "severity": "HIGH",
            "area": "ENUM_SYNC",
            "title": f"Enum '{enum_name}' values mismatch",
            "description": f"FE has {len(fe_values)} values, BE has {len(be_values)}",
            "fe_only": list(fe_values - be_values),
            "be_only": list(be_values - fe_values)
        })

# Add to critique notes if issues found
if DATA_COMPLETENESS_ISSUES:
    for issue in DATA_COMPLETENESS_ISSUES:
        CRITIQUE_NOTES.issues.append(issue)
    
    # CRITICAL issues should block
    critical_data_issues = [i for i in DATA_COMPLETENESS_ISSUES if i["severity"] == "CRITICAL"]
    if critical_data_issues:
        log.error({
            "event": "data_completeness_critical",
            "issues": len(critical_data_issues)
        })
        # Don't auto-approve, require human review
        BLOCK_AUTO_APPROVAL = True

log.info({
    "event": "data_completeness_check_complete",
    "issues_found": len(DATA_COMPLETENESS_ISSUES),
    "critical": len([i for i in DATA_COMPLETENESS_ISSUES if i["severity"] == "CRITICAL"]),
    "high": len([i for i in DATA_COMPLETENESS_ISSUES if i["severity"] == "HIGH"])
})
```

---

## PHASE 5: HUMAN CHECKPOINT

### Step 5.1: Semantic Health Check
```python
# Pre-approval semantic checks
semantic_checks = [
    check_no_hallucinated_libraries(improvement_prd),
    check_consistent_terminology(improvement_prd),
    check_complete_user_flows(improvement_prd),
    check_security_controls_defined(improvement_prd),
    check_realistic_effort_estimates(improvement_prd, ALL_ISSUES)
]

critical_failures = [c for c in semantic_checks if c.severity == "CRITICAL" and not c.passed]
high_failures = [c for c in semantic_checks if c.severity == "HIGH" and not c.passed]

# Block auto-approval conditions
BLOCK_AUTO_APPROVAL = (
    len(critical_failures) > 0 or
    len(high_failures) >= 2 or
    (DOMAIN_EXPERT_SCORE < 75 if PROCESSING_MODE != "Standard" else False) or
    CODEBASE_VALIDATION_SCORE < 70
)
```

### Step 5.2: Prepare Review Package
```yaml
Review Package:
  - Audit Score: {AUDIT_SCORE}/100 (Original)
  - Final Draft: improvement_prd
  - Quality Score: {QUALITY_SCORE}/100
  - Codebase Validation: {CODEBASE_VALIDATION_SCORE}/100
  - Domain Expert: {DOMAIN_EXPERT_SCORE}/100
  - Final Expert Score: {FINAL_EXPERT_SCORE}/100
  - Iterations Completed: {current_iteration}
  - Version History: {draft_history summary}
  - Semantic Health: {semantic_checks summary}
  - Processing Mode: {PROCESSING_MODE}
  # ⭐ V3.0: Cost Summary
  - Total Tokens Used: {cost_tracker.total_tokens}
  - Skills Invoked: {cost_tracker.skill_invocations}
  - Cache Hits: {cost_tracker.cache_hits}
```

### Step 5.3: Human Review Gate
**Condition A: Auto-Approval (if all true)**
- `FINAL_EXPERT_SCORE >= 90`
- `HIGH_SEVERITY_ISSUES == 0`
- `PROCESSING_MODE != "Deep Analysis"`
- `BLOCK_AUTO_APPROVAL == False`

→ Auto-proceed to Phase 6

**Condition B: Manual Review Required**
- Display Review Package
- Wait for user approval or feedback

### Step 5.4: Handle Feedback
```python
if user_approved:
    FINAL_PRD = improvement_prd
    goto Phase 6
else:
    # Incorporate user feedback
    USER_FEEDBACK = get_user_input()
    CRITIQUE_NOTES.issues.append({
        "severity": "HIGH",
        "source": "human",
        "description": USER_FEEDBACK
    })
    # ⭐ V3.0 FIX: Preserve history, don't reset counter completely
    # Only reset if starting completely new direction
    if user_feedback.type == "MAJOR_CHANGE":
        current_iteration = 0
    # Keep draft_history intact for learning
    goto Step 3.2
```

---

## PHASE 6: DELIVERY & KNOWLEDGE CONSOLIDATION

### Step 6.1: Generate Improvement PRD Artifact
```python
# Save final PRD
prd_filename = f"IMPROVEMENT-PRD-{module_name}-{audit_id[:8]}.md"

# Add rich metadata
prd_metadata = {
    "title": f"[IMPROVEMENT] {module_name} - Quality Enhancement",
    "type": "improvement",
    "source_audit": audit_id,
    "original_score": AUDIT_SCORE,
    "target_score": min(AUDIT_SCORE + 15, 100),
    "author": "module-auditor v3.0",
    "status": "Approved",
    "created": timestamp,
    "processing_mode": PROCESSING_MODE,
    "iterations": current_iteration,
    "quality_score": QUALITY_SCORE,
    "codebase_validation_score": CODEBASE_VALIDATION_SCORE,
    "domain_expert_score": DOMAIN_EXPERT_SCORE,
    "final_expert_score": FINAL_EXPERT_SCORE,
    # ⭐ V3.0: Include cost data
    "cost_summary": cost_tracker
}

save_artifact(f"prds/{prd_filename}", FINAL_PRD, metadata=prd_metadata)
```

### Step 6.2: Test Generation
```python
# Generate test cases from Acceptance Criteria
test_result = invoke_skill("test-generator", {
    "prd": FINAL_PRD,
    "focus": "improvements",
    "original_issues": ALL_ISSUES
})

cost_tracker["skill_invocations"] += 1

log.info({
    "event": "tests_generated",
    "unit_tests": test_result.statistics.tests_generated.unit,
    "integration_tests": test_result.statistics.tests_generated.integration,
    "e2e_tests": test_result.statistics.tests_generated.e2e
})

# Save test files
save_generated_tests(test_result.generated_files, f"tests/{module_name}/")
```

### Step 6.3: Effort Estimation
```python
# Estimate effort for improvements
estimate_result = invoke_skill("effort-estimator", {
    "prd": FINAL_PRD,
    "issues": ALL_ISSUES,
    "team_size": config.get("team_size", 2)
})

cost_tracker["skill_invocations"] += 1

log.info({
    "event": "effort_estimated",
    "total_hours": estimate_result.summary.total_effort_hours,
    "calendar_days": estimate_result.summary.calendar_days_estimate,
    "sprints": estimate_result.sprint_suggestion.recommended_sprints
})

# ⭐ Update cost tracker
cost_tracker["phase_breakdown"]["delivery"] = count_tokens_used()
```

### Step 6.4: Generate Audit Report
```python
# Create comprehensive audit report
report = f"""
# Module Audit Report: {module_name}

## Summary
- **Audit ID:** {audit_id}
- **Date:** {timestamp}
- **Workflow Version:** 3.0.0
- **Original Score:** {AUDIT_SCORE}/100 (Grade: {AUDIT_GRADE})
- **Processing Mode:** {PROCESSING_MODE}

## Reflexion Loop Stats
- **Iterations:** {current_iteration}
- **Final Quality Score:** {QUALITY_SCORE}/100
- **Codebase Validation:** {CODEBASE_VALIDATION_SCORE}/100
- **Domain Expert:** {DOMAIN_EXPERT_SCORE}/100
- **Final Expert Score:** {FINAL_EXPERT_SCORE}/100

## Dimension Breakdown
{dimension_table}

## Issues Detail
{issues_table}

## Improvement PRD
- **PRD File:** {prd_filename}
- **Target Score:** {AUDIT_SCORE + 15}+
- **Estimated Effort:** {estimate_result.summary.total_effort_hours} hours
- **Recommended Sprints:** {estimate_result.sprint_suggestion.recommended_sprints}

## Generated Tests
- Unit Tests: {test_result.statistics.tests_generated.unit}
- Integration Tests: {test_result.statistics.tests_generated.integration}
- E2E Tests: {test_result.statistics.tests_generated.e2e}

## 💰 Cost Summary (V3.0)
- **Total Tokens:** {cost_tracker.total_tokens}
- **Skills Invoked:** {cost_tracker.skill_invocations}
- **Cache Hits:** {cost_tracker.cache_hits}
- **Cache Hit Rate:** {(cost_tracker.cache_hits / cost_tracker.skill_invocations * 100):.1f}%

### Phase Breakdown
{format_phase_breakdown(cost_tracker.phase_breakdown)}

## Recommended Next Audit
- **When:** After implementing improvements
- **Expected Score:** {min(AUDIT_SCORE + 15, 100)}+
"""

save_artifact(f"audits/{module_name}/{audit_id}.md", report)
```

### Step 6.5: Update Knowledge Base (⭐ Improved with Rollback)
```python
# Track audit for future learning
audit_record = {
    "audit_id": audit_id,
    "module": module_name,
    "date": timestamp,
    "score": AUDIT_SCORE,
    "grade": AUDIT_GRADE,
    "issues_count": len(ALL_ISSUES),
    "prd_generated": True,
    "reflexion_iterations": current_iteration,
    "final_quality_score": QUALITY_SCORE,
    "effort_hours": estimate_result.summary.total_effort_hours,
    "cost_summary": cost_tracker
}

try:
    save_to_knowledge_base(f"audit-history/{module_name}", audit_record)
except Exception as e:
    log.error({
        "event": "kb_write_failed",
        "error": str(e),
        "audit_id": audit_id
    })
    # ⭐ V3.0: Save to backup location
    save_artifact(f"audits/{module_name}/kb_backup_{audit_id}.json", audit_record)
```

### Step 6.6: Metrics & Observability
```python
# Log final metrics
metrics = {
    "audit_id": audit_id,
    "module": module_name,
    "original_score": AUDIT_SCORE,
    "final_quality_score": QUALITY_SCORE,
    "iterations": current_iteration,
    "time_elapsed_seconds": (now() - start_time).seconds,
    "issues_found": len(ALL_ISSUES),
    "tests_generated": test_result.statistics.tests_generated,
    "effort_hours": estimate_result.summary.total_effort_hours,
    # ⭐ V3.0: Include cost metrics
    "total_tokens": cost_tracker["total_tokens"],
    "skill_invocations": cost_tracker["skill_invocations"],
    "cache_hits": cost_tracker["cache_hits"],
    "cache_hit_rate": cost_tracker["cache_hits"] / max(cost_tracker["skill_invocations"], 1),
    "circuit_breaker_state": circuit_breaker["state"]
}

log.info({"event": "audit_workflow_completed", **metrics})
export_metrics(metrics, config.observability.metrics.export_path)
```

### Step 6.7: Next Step Prompt
```markdown
> 📊 **Audit Complete! Improvement PRD Generated!**
> 
> | Metric | Value |
> |--------|-------|
> | Original Score | {AUDIT_SCORE}/100 |
> | Target Score | {AUDIT_SCORE + 15}/100 |
> | Quality Score | {QUALITY_SCORE}/100 |
> | Iterations | {current_iteration} |
> | Effort Estimate | {estimate_result.summary.total_effort_hours} hours |
> | Tests Generated | {test_result.statistics.total} |
> | **Total Tokens** | **{cost_tracker.total_tokens}** |
> | **Cache Hit Rate** | **{cache_hit_rate:.1f}%** |
>
> **Bạn muốn làm gì tiếp theo?**
> 1. `/implement` - Bắt đầu implement improvements
> 2. `/estimate` - Xem chi tiết effort estimation
> 3. `/tests` - Xem generated test cases
> 4. `/re-audit` - Re-audit sau khi implement
> 5. `/cost-report` - Xem chi tiết cost breakdown (V3.0)
```

---

## 📊 APPENDIX A: GRADING SCALE

| Score | Grade | Status | Action |
|:------|:-----:|:-------|:-------|
| 90-100 | A | 🟢 Excellent | Minor polish only |
| 80-89 | B | 🟢 Good | Optional improvements |
| 70-79 | C | 🟡 Needs Work | Improvement PRD recommended |
| 60-69 | D | 🟠 Poor | Improvement PRD required |
| <60 | F | 🔴 Critical | Major refactor/rewrite |

---

## 📊 APPENDIX B: MULTI-EXPERT WEIGHTS

| Processing Mode | prd-critic | codebase-validator | domain-expert |
|:----------------|:----------:|:------------------:|:-------------:|
| Standard | 70% | 30% | - |
| Enhanced | 50% | 25% | 25% |
| Deep Analysis | 40% | 30% | 30% |

---

## 📊 APPENDIX C: CIRCUIT BREAKER STATES (⭐ NEW V3.0)

| State | Description | Action |
|:------|:------------|:-------|
| **CLOSED** | Normal operation | Process requests |
| **OPEN** | Too many failures | Reject requests immediately |
| **HALF_OPEN** | Cooldown expired | Try one request to test recovery |

---

## 🔧 APPENDIX D: AVAILABLE MODULES

Current modules that can be audited:
- `quote` - Quote Management
- `order` - Order Management  
- `inventory` - Inventory Management
- `crm` - Customer Relationship Management
- `finance` - Finance & Accounting
- `hr` - Human Resources
- `user` - User Management (alias: admin/user-management)
- `procurement` - Procurement & Suppliers
- `settings` - System Settings

---

## 📝 EXAMPLE USAGE

```bash
# Standard Audit
/prd-audit quote

# Dry-Run (estimate cost without executing)
/prd-audit inventory --dry-run

# Fast Mode (skip optional validations)
/prd-audit user --fast

# Combined
/prd-audit crm --fast --dry-run
```

---

**Version History:**
- v1.0.0: Initial release - 5-dimension audit, basic PRD generation
- v2.0.0: Full Reflexion Loop integration
  - Added: Full iteration loop with stagnation detection
  - Added: Multi-expert validation (codebase-validator, domain-expert)
  - Added: Semantic health check
  - Added: Test generation for improvements
  - Added: Effort estimation
  - Added: Observability layer
  - Added: Knowledge base integration
- **v3.0.0: Performance & Resilience Upgrade (Based on SWOT Analysis)**
  - ✅ **R1:** Circuit Breaker Pattern for cascading failures
  - ✅ **R2:** Skill Result Caching with TTL
  - ✅ **R3:** Fixed Stagnation False-Positive at threshold boundary
  - ✅ **R4:** Token Cost Tracking per phase
  - ✅ **R5:** Parallel Multi-Expert Execution
  - ✅ **R6:** Early-Exit for high-confidence drafts (FAST_MODE)
  - ✅ **R9:** Configurable dimension weights per module type
  - ✅ **R10:** Dry-run mode for cost estimation
  - ✅ **KB Rollback:** Backup mechanism for Knowledge Base write failures
- **v3.1.0: Data Completeness Check (Permission Matrix Lesson)**
  - ✅ **R14:** Data Completeness Check - FE/BE sync validation
  - ✅ Prevent "Blind Spots" like Permission Matrix missing modules
- **v3.2.0: Business Flow Validation**
  - ✅ **Phase 2.5:** New Business Flow Validation phase
  - ✅ **business-flow-validator skill:** Config-driven, reusable for any project
  - ✅ Cross-module integration validation
  - ✅ State machine completeness check
  - ✅ Business rules enforcement validation
  - ✅ Dependency chain analysis (circular dependency detection)
  - ✅ **Reusability:** Just change `.agent/config/business-flows.yaml` for new projects
- **v3.2.1: Always Generate PRD**
  - ✅ **Always Generate:** PRD được tạo bất kể score (không còn Grade A skip)
  - ✅ **Auto-proceed:** Không cần user confirmation, tự động chạy Phase 3-6
  - ✅ **Processing Mode:** Tự động chọn Standard/Enhanced/Deep Analysis theo score
- **v3.2.2: Feature Completeness Check (⭐ LATEST)**
  - ✅ **Phase 2.6:** Kiểm tra tính năng còn thiếu so với checklist chuẩn
  - ✅ **feature-checklists.yaml:** Config file định nghĩa features per module
  - ✅ **Weighted Scoring:** CRITICAL=3, HIGH=2, MEDIUM=1, LOW=0.5
  - ✅ **Auto-detect missing features:** Thêm vào issues list
  - ✅ **Modules covered:** user, quote, order, inventory, crm, finance



