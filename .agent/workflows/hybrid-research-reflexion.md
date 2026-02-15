---
description: Hybrid workflow kết hợp Deep Research (External Context) với Reflexion Loop (Internal Logic) để tạo PRD 100% không hallucination
version: 1.0.0
trigger: /hybrid-prd [idea]
config: .agent/config/prd-workflow.yaml
portable: true
optimizations:
  - parallel_url_reading
  - chain_of_density
  - claim_verification
  - semantic_stagnation
  - codebase_validation
  - tree_of_thoughts
---

# WORKFLOW: HYBRID RESEARCH-REFLEXION PRD v1.0

> **Philosophy:** External Research + Internal Context + Reflexion Loop = 100% Hallucination-Free PRD
> 
> **Core Principles:**
> - 🔍 **Deep Research**: Thu thập best practices từ web
> - ✅ **Claim Verification**: Cross-check với ≥2 sources  
> - 🧪 **Codebase Grounding**: Validate với project thực tế
> - 🔄 **Reflexion Loop**: Iterative improvement với Devil's Advocate
> - 🌲 **Tree of Thoughts**: Multi-branch reasoning trước khi commit

---

## PHASE 0: INITIALIZATION & PROJECT DETECTION

### Step 0.1: Initialize Workflow
```yaml
# Load configuration
config = load_yaml(".agent/config/prd-workflow.yaml")
research_config = load_yaml(".agent/config/research-config.yaml")

# Internal Variables
workflow_id: generate_uuid()
start_time: now()
research_depth: "standard"  # quick | standard | deep

# Token Budget Controller
token_budget = {
    "quick": 50000,
    "standard": 100000,
    "deep": 200000
}
current_tokens = 0
MAX_TOKENS = token_budget[research_depth]

# Reflexion Settings
MAX_ITERATIONS: config.reflexion_prd.max_iterations  # 3
QUALITY_THRESHOLD: config.reflexion_prd.quality_threshold  # 85
current_iteration: 0
draft_history: []
```

### Step 0.2: Auto-Detect Project Context
```python
# Detect tech stack từ project files
project_context = {
    "tech_stack": detect_tech_stack(),  # Scan package.json, pyproject.toml
    "backend_framework": None,  # fastapi | express | django
    "frontend_framework": None,  # angular | react | vue | nextjs
    "database": None,  # postgresql | mysql | mongodb
    "has_existing_prds": check_path(".agent/prds/"),
    "has_knowledge_base": check_path(".agent/knowledge_base/"),
    "orm_models": detect_orm_models(),  # SQLAlchemy, Prisma, TypeORM
    "dependency_versions": extract_dependency_versions()
}

log.info({
    "event": "project_detected",
    "tech_stack": project_context.tech_stack,
    "token_budget": MAX_TOKENS
})
```

### Step 0.3: Parse User Intent
- Tiếp nhận `[idea]` từ người dùng
- Xác định `RESEARCH_TOPIC` và `PRD_SCOPE`
- Phân loại `RESEARCH_DEPTH`:
  - `/hybrid-prd-quick [idea]` → Quick (skip deep research)
  - `/hybrid-prd [idea]` → Standard
  - `/hybrid-prd-deep [idea]` → Comprehensive

**Output:** `USER_INTENT`, `RESEARCH_TOPIC`, `RESEARCH_DEPTH`, `MAX_TOKENS`

---

## PHASE 1: DEEP EXTERNAL RESEARCH (Tree of Thoughts - Branch 1)

> **Mục tiêu:** Thu thập thông tin từ bên ngoài trước khi tạo PRD
> **⚡ Optimized:** Parallel processing, Chain of Density, Claim Verification

### Step 1.1: Define Research Questions
```python
# Tạo 3-5 câu hỏi nghiên cứu (Tree of Thoughts: Branch exploration)
research_questions = generate_questions(USER_INTENT)

# Add tech-stack specific questions
if project_context.tech_stack:
    research_questions.append(
        f"Best practices for {RESEARCH_TOPIC} with {project_context.tech_stack}"
    )

# Log thought branch
log.info({
    "thought_branch": "external_research",
    "questions_count": len(research_questions)
})
```

### Step 1.2: Web Search (// turbo)
```python
# Thực hiện tìm kiếm web
search_queries = [
    f"{RESEARCH_TOPIC} best practices 2024",
    f"{RESEARCH_TOPIC} implementation guide",
    f"{RESEARCH_TOPIC} vs alternatives comparison",
    f"{RESEARCH_TOPIC} common mistakes pitfalls",
    f"{RESEARCH_TOPIC} {project_context.tech_stack} integration"
]

try:
    search_results = []
    for query in search_queries:
        results = search_web(query)
        search_results.extend(results)
    
    # Check for empty results and trigger fallback
    if len(search_results) == 0:
        log.warning("Web search returned 0 results. Triggering KB fallback.")
        FALLBACK_MODE = True
        goto Step 1.6
    
    # Filter và rank kết quả with recency penalty
    ranked_sources = rank_by_relevance(search_results, RESEARCH_TOPIC)
    ranked_sources = apply_recency_penalty(ranked_sources, max_age_months=12)
    
except SearchException as e:
    log.warning(f"Web search failed: {e}. Falling back to KB only mode.")
    FALLBACK_MODE = True
    goto Step 1.6
```

### Step 1.3: Deep Content Reading - PARALLEL (// turbo)
```python
# PARALLEL URL reading with asyncio.gather() - 70% latency reduction
if RESEARCH_DEPTH in ["standard", "deep"]:
    max_sources = {"quick": 5, "standard": 10, "deep": 20}
    top_sources = ranked_sources[:max_sources[RESEARCH_DEPTH]]
    
    async def read_all_sources_parallel(sources):
        timeout = research_config.depth_settings[RESEARCH_DEPTH].timeout_per_source
        
        async def read_with_timeout(source):
            try:
                content = await asyncio.wait_for(
                    read_url_content(source.url),
                    timeout=timeout
                )
                return {
                    "url": source.url,
                    "title": source.title,
                    "content": content,
                    "relevance_score": source.score,
                    "publish_date": extract_publish_date(content),
                    "status": "success"
                }
            except asyncio.TimeoutError:
                return {"url": source.url, "status": "timeout"}
            except Exception as e:
                return {"url": source.url, "status": "error", "error": str(e)}
        
        results = await asyncio.gather(
            *[read_with_timeout(s) for s in sources],
            return_exceptions=True
        )
        return [r for r in results if r.get("status") == "success"]
    
    content_corpus = await read_all_sources_parallel(top_sources)
    current_tokens += sum(len(c["content"]) / 4 for c in content_corpus)
```

### Step 1.4: Chain of Density Synthesis
```python
def chain_of_density_synthesis(contents: list) -> dict:
    """
    3-step density compression:
    1. Individual summaries (verbose)
    2. Paired merges (denser)
    3. Final synthesis (densest)
    """
    
    # Step 1: Create initial summaries (500 tokens each)
    individual_summaries = []
    for content in contents:
        summary = summarize(content["content"], max_tokens=500)
        individual_summaries.append({
            "url": content["url"],
            "summary": summary,
            "claims": extract_key_claims(summary)
        })
    
    # Step 2: Merge pairs (300 tokens each)
    merged_summaries = []
    for i in range(0, len(individual_summaries), 2):
        pair = individual_summaries[i:i+2]
        merged = merge_summaries(pair, max_tokens=300)
        merged_summaries.append(merged)
    
    # Step 3: Final synthesis using WHAT-WHY-HOW-COMPARE framework
    research_synthesis = {
        "WHAT": extract_and_merge(merged_summaries, "definitions"),
        "WHY": extract_and_merge(merged_summaries, "benefits_motivations"),
        "HOW": extract_and_merge(merged_summaries, "implementation_approaches"),
        "COMPARE": extract_and_merge(merged_summaries, "alternatives"),
        "IMPLICATIONS": extract_and_merge(merged_summaries, "risks_considerations"),
        "sources": [c["url"] for c in contents],
        "all_claims": collect_all_claims(individual_summaries)
    }
    
    return research_synthesis

research_synthesis = chain_of_density_synthesis(content_corpus)
```

### Step 1.5: CLAIM VERIFICATION LAYER (Anti-Hallucination)
```python
# Cross-check key claims với ≥2 independent sources
def verify_claims(synthesis: dict, min_sources: int = 2) -> dict:
    """
    Flag unverified claims as LOW_CONFIDENCE
    This is CRITICAL for preventing hallucinations
    """
    all_claims = synthesis["all_claims"]
    verified_claims = []
    unverified_claims = []
    
    for claim in all_claims:
        supporting_sources = find_supporting_sources(claim, synthesis["sources"])
        
        if len(supporting_sources) >= min_sources:
            verified_claims.append({
                "claim": claim,
                "confidence": "HIGH",
                "sources": supporting_sources
            })
        else:
            unverified_claims.append({
                "claim": claim,
                "confidence": "LOW",
                "sources": supporting_sources,
                "warning": "⚠️ Claim found in only 1 source - REQUIRES MANUAL VERIFICATION"
            })
    
    synthesis["verified_claims"] = verified_claims
    synthesis["unverified_claims"] = unverified_claims
    synthesis["verification_rate"] = len(verified_claims) / len(all_claims) if all_claims else 1.0
    
    if synthesis["verification_rate"] < 0.7:
        log.warning(f"⚠️ Low claim verification rate: {synthesis['verification_rate']:.0%}")
    
    return synthesis

research_synthesis = verify_claims(research_synthesis)
```

### Step 1.6: Knowledge Base Fallback
```python
if FALLBACK_MODE:
    log.info("Executing KB-only research mode...")
    
    kb_results = query_knowledge_base(
        query=USER_INTENT,
        sources=[".agent/prds/*.md", ".agent/knowledge_base/*.md", "docs/**/*.md"],
        max_results=10
    )
    
    # Validate KB content freshness
    stale_content = []
    fresh_content = []
    max_age = 6  # months
    
    for kb_item in kb_results:
        last_modified = get_file_modified_date(kb_item["path"])
        age_months = (now() - last_modified).days / 30
        
        if age_months > max_age:
            kb_item["stale"] = True
            stale_content.append(kb_item)
        else:
            kb_item["stale"] = False
            fresh_content.append(kb_item)
    
    kb_results = fresh_content + stale_content
    
    research_synthesis = {
        "WHAT": extract_from_kb(kb_results, "definitions"),
        "WHY": extract_from_kb(kb_results, "benefits"),
        "HOW": extract_from_kb(kb_results, "implementation"),
        "COMPARE": {"note": "External comparison unavailable - KB only mode"},
        "IMPLICATIONS": extract_from_kb(kb_results, "risks"),
        "sources": [r["path"] for r in kb_results],
        "mode": "KB_FALLBACK",
        "verification_rate": 0.7
    }
```

**Output:** `RESEARCH_SYNTHESIS`, `FALLBACK_MODE`

---

## PHASE 2: INTERNAL CONTEXT GROUNDING (Tree of Thoughts - Branch 2)

> **Mục tiêu:** Map external findings với internal capabilities

### Step 2.1: Codebase Scan
```python
# Quét cấu trúc dự án hiện tại
codebase_context = {
    "project_structure": scan_directory_structure(),
    "existing_modules": identify_modules(),
    "dependencies": parse_dependencies(),
    "database_schema": parse_schema(),
    "dependency_versions": extract_dependency_versions()
}

log.info({
    "thought_branch": "codebase_grounding",
    "modules_found": len(codebase_context["existing_modules"]),
    "tables_found": len(codebase_context["database_schema"])
})
```

### Step 2.2: Package Registry Lookup (Anti-Hallucination)
```python
# CRITICAL: Verify ALL dependencies mentioned in research exist
for dependency in research_synthesis.get("suggested_dependencies", []):
    npm_exists = check_registry("npm", dependency)
    pypi_exists = check_registry("pypi", dependency)
    
    if not (npm_exists or pypi_exists):
        # HALLUCINATION DETECTED
        flag_critical_issue({
            "type": "HALLUCINATED_PACKAGE",
            "package": dependency,
            "severity": "CRITICAL",
            "action": "REMOVE_FROM_PRD"
        })
        
        # Remove from synthesis
        research_synthesis["suggested_dependencies"].remove(dependency)
        log.error(f"🚫 HALLUCINATED PACKAGE DETECTED: {dependency}")
```

### Step 2.3: Merge Research with Internal Context
```python
# Kết hợp External Research + Internal Context
FULL_CONTEXT = {
    "external_research": research_synthesis,
    "project_context": project_context,
    "codebase_context": codebase_context,
    "historical_context": similar_prds,
    "past_lessons": past_lessons,
    "research_mode": "FALLBACK" if FALLBACK_MODE else "FULL",
    "token_usage": current_tokens,
    "verification_rate": research_synthesis.get("verification_rate", 1.0)
}
```

**Output:** `FULL_CONTEXT`

---

## PHASE 3: COMPLEXITY ASSESSMENT

### Step 3.1: Evaluate Complexity
```python
# Đánh giá độ phức tạp theo 5 tiêu chí
complexity_scores = {
    "ux_impact": assess_ux_complexity(USER_INTENT),         # 1-10
    "cross_module": assess_module_dependencies(codebase_context),  # 1-10
    "security_sensitivity": assess_security_needs(USER_INTENT),    # 1-10
    "data_complexity": assess_data_requirements(USER_INTENT),      # 1-10
    "integration_points": count_integrations(FULL_CONTEXT)         # 1-10
}

weights = {
    "ux_impact": 0.25,
    "cross_module": 0.20,
    "security_sensitivity": 0.25,
    "data_complexity": 0.15,
    "integration_points": 0.15
}

COMPLEXITY_SCORE = sum(score * weights[key] for key, score in complexity_scores.items())
```

### Step 3.2: Set Processing Mode
```python
if COMPLEXITY_SCORE <= 3:
    PROCESSING_MODE = "Standard"      # 1 iteration có thể đủ
    MAX_ITERATIONS = 2
elif COMPLEXITY_SCORE <= 6:
    PROCESSING_MODE = "Enhanced"      # 2 iterations recommended
    MAX_ITERATIONS = 3
else:
    PROCESSING_MODE = "Deep Analysis" # 3 iterations, human review bắt buộc
    MAX_ITERATIONS = 3
    HUMAN_REVIEW_REQUIRED = True
```

**Output:** `COMPLEXITY_SCORE`, `PROCESSING_MODE`, `MAX_ITERATIONS`

---

## PHASE 4: INITIAL DRAFTING (Actor - Reflexion Step 1)

### Step 4.1: Activate PRD Drafter
```python
# Invoke prd-drafter skill with full context
draft_input = {
    "user_intent": USER_INTENT,
    "full_context": FULL_CONTEXT,
    "research_synthesis": research_synthesis,
    "processing_mode": PROCESSING_MODE,
    "unverified_claims": research_synthesis.get("unverified_claims", []),
    "verified_claims": research_synthesis.get("verified_claims", [])
}

DRAFT_V1 = invoke_skill("prd-drafter", draft_input)

# Track history with embeddings for semantic comparison
draft_history.append({
    "version": 1,
    "content": DRAFT_V1,
    "confidence": DRAFT_V1.confidence,
    "timestamp": now(),
    "embedding": compute_embedding(DRAFT_V1)
})
current_iteration = 1
```

**Output:** `DRAFT_V1`, `DRAFT_CONFIDENCE`

---

## PHASE 5: THE REFLEXION LOOP (Critic + Self-Correction)

> **Devil's Advocate Analysis:** Evaluate draft against 4 matrices

### Step 5.1: Critical Analysis
```python
# Invoke prd-critic skill (Devil's Advocate persona)
critique = invoke_skill("prd-critic", {
    "draft": DRAFT_V{N},
    "processing_mode": PROCESSING_MODE,
    "research_synthesis": research_synthesis
})

# 4 Matrices Evaluation
# 1. Completeness (0-25): All sections present, detailed specs
# 2. Consistency (0-25): Terminology, no contradictions
# 3. Security (0-25): Auth, validation, rate limiting
# 4. Feasibility (0-25): Tech stack fit, realistic scope

QUALITY_SCORE = critique.quality_score  # Sum of 4 matrices
CRITIQUE_NOTES = critique.issues
```

### Step 5.2: Reflexion Decision with Semantic Stagnation
```python
while current_iteration < MAX_ITERATIONS and QUALITY_SCORE < QUALITY_THRESHOLD:
    # Self-correction
    refined_draft = invoke_skill("prd-drafter", {
        "draft": draft_history[-1].content,
        "critique_notes": CRITIQUE_NOTES,
        "draft_history": draft_history,
        "instruction": f"Iteration #{current_iteration + 1}: Fix all issues"
    })
    
    # Compute embedding for semantic comparison
    new_embedding = compute_embedding(refined_draft)
    
    # Store in history
    current_iteration += 1
    draft_history.append({
        "version": current_iteration,
        "content": refined_draft,
        "confidence": refined_draft.confidence,
        "timestamp": now(),
        "embedding": new_embedding
    })
    
    # Re-evaluate
    critique = invoke_skill("prd-critic", {"draft": refined_draft})
    QUALITY_SCORE = critique.quality_score
    CRITIQUE_NOTES = critique.issues
    
    # SEMANTIC STAGNATION CHECK
    if len(draft_history) >= 2:
        prev_embedding = draft_history[-2]["embedding"]
        similarity = cosine_similarity(prev_embedding, new_embedding)
        
        # Adaptive threshold: increases with iterations
        stagnation_threshold = min(0.98, 0.90 + (0.02 * current_iteration))
        
        if similarity > stagnation_threshold:
            log.info({
                "event": "semantic_stagnation",
                "similarity": f"{similarity:.2%}",
                "threshold": f"{stagnation_threshold:.2%}",
                "action": "BREAK_LOOP"
            })
            break
    
    # Token budget check
    current_tokens += estimate_tokens(refined_draft)
    if current_tokens > MAX_TOKENS * 0.9:
        log.warning(f"Token budget at 90%: {current_tokens}/{MAX_TOKENS}. Stopping.")
        break
```

**Output:** `FINAL_DRAFT`, `QUALITY_SCORE`, `draft_history`

---

## PHASE 6: MULTI-EXPERT VALIDATION (Parallel Check)

> **Note:** Phase này chạy SAU khi quality_score >= 80

### Step 6.1: Parallel Expert Validation
```python
if QUALITY_SCORE >= 80:
    async def run_parallel_validation():
        tasks = []
        
        # Task 1: Codebase Validation (always run)
        tasks.append(invoke_skill_async("codebase-validator", {
            "draft_prd": FINAL_DRAFT,
            "project_context": project_context,
            "check_versions": True
        }))
        
        # Task 2: Domain Expert (Enhanced/Deep mode only)
        if PROCESSING_MODE != "Standard":
            tasks.append(invoke_skill_async("domain-expert", {
                "draft_prd": FINAL_DRAFT,
                "domain": config.project.domain
            }))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    validation_results = await run_parallel_validation()
    
    CODEBASE_VALIDATION_SCORE = validation_results[0].score
    if PROCESSING_MODE != "Standard":
        DOMAIN_EXPERT_SCORE = validation_results[1].score
```

### Step 6.2: Calculate Final Score
```python
if PROCESSING_MODE == "Standard":
    FINAL_SCORE = (QUALITY_SCORE * 0.7) + (CODEBASE_VALIDATION_SCORE * 0.3)
elif PROCESSING_MODE == "Enhanced":
    FINAL_SCORE = (QUALITY_SCORE * 0.5) + (CODEBASE_VALIDATION_SCORE * 0.25) + (DOMAIN_EXPERT_SCORE * 0.25)
else:  # Deep Analysis
    FINAL_SCORE = (QUALITY_SCORE * 0.4) + (CODEBASE_VALIDATION_SCORE * 0.3) + (DOMAIN_EXPERT_SCORE * 0.3)

# Penalty for low verification rate
if research_synthesis.get("verification_rate", 1.0) < 0.7:
    FINAL_SCORE *= 0.95  # 5% penalty
    log.warning("⚠️ Applied 5% penalty due to low claim verification rate")
```

---

## PHASE 7: HUMAN CHECKPOINT

### Step 7.1: Prepare Review Package
```markdown
## 📋 PRD Review Package

### Scores
| Metric | Score |
|:-------|------:|
| Quality Score | {QUALITY_SCORE}/100 |
| Codebase Validation | {CODEBASE_VALIDATION_SCORE}/100 |
| Domain Expert | {DOMAIN_EXPERT_SCORE}/100 |
| **Final Score** | **{FINAL_SCORE}/100** |

### Research Quality
- Sources Analyzed: {len(research_synthesis.sources)}
- Claim Verification Rate: {research_synthesis.verification_rate:.0%}
- Research Mode: {research_synthesis.mode}

### ⚠️ Unverified Claims (Review Required)
{list unverified_claims if any}

### Outstanding Issues
{HIGH severity issues if any}
```

### Step 7.2: Auto-Approval Check
```python
AUTO_APPROVE = (
    FINAL_SCORE >= 90 and
    HIGH_SEVERITY_ISSUES == 0 and
    PROCESSING_MODE != "Deep Analysis" and
    research_synthesis.get("verification_rate", 1.0) >= 0.8 and
    len(research_synthesis.get("unverified_claims", [])) <= 2
)

if AUTO_APPROVE:
    goto Phase 8
else:
    notify_user(review_package)
    await user_approval()
```

---

## PHASE 8: DELIVERY

> [!CAUTION]
> **MANDATORY**: Artifacts PHẢI được lưu vào `.agent/prds/` (project) VÀ conversation brain.

### Step 8.1: Save Artifacts (// turbo)
```python
# File naming convention
feature_slug = slugify(RESEARCH_TOPIC)
prd_filename = f"PRD-{feature_slug}.md"
research_filename = f"research-{feature_slug}.md"

# Define paths
PROJECT_PRD_PATH = f".agent/prds/{prd_filename}"
PROJECT_RESEARCH_PATH = f".agent/prds/{research_filename}"
BRAIN_PATH = f"<appDataDir>/brain/<conversation-id>/"
BRAIN_PRD_PATH = f"{BRAIN_PATH}{prd_filename}"

# Atomic Dual-Save
await atomic_dual_save(FINAL_DRAFT, PROJECT_PRD_PATH, BRAIN_PRD_PATH)
save_file(research_synthesis, PROJECT_RESEARCH_PATH)

# Validation
assert exists(PROJECT_PRD_PATH), f"FAIL: PRD not saved to {PROJECT_PRD_PATH}"
assert exists(BRAIN_PRD_PATH), f"FAIL: PRD not saved to {BRAIN_PRD_PATH}"
```

### Step 8.2: Next Step Prompt
```markdown
> 📋 **PRD đã hoàn thành!**
> 
> | Metric | Value |
> |:-------|------:|
> | Quality Score | {QUALITY_SCORE}/100 |
> | Codebase Validation | {CODEBASE_VALIDATION_SCORE}/100 |
> | Domain Expert | {DOMAIN_EXPERT_SCORE}/100 |
> | Final Score | {FINAL_SCORE}/100 |
> | Research Mode | {RESEARCH_MODE} |
> | Claim Verification | {verification_rate:.0%} |
> | Iterations | {current_iteration} |
>
> **Bạn muốn làm gì tiếp theo?**
> 1. `/plan` - Tạo Implementation Plan từ PRD này
> 2. `/estimate` - Xem chi tiết effort estimation
> 3. `/decompose` - Chia nhỏ thành user stories
> 4. `/review` - Request peer review
> 5. `/tests` - Generate test cases
```

---

## 📊 APPENDIX A: QUALITY SCORING RUBRIC

### 4 Matrices Evaluation

| Matrix | Points | Criteria |
|:-------|:------:|:---------|
| **Completeness** | 0-25 | Title, Problem, Solution, User Stories, Tech Specs |
| **Consistency** | 0-25 | Terminology, no contradictions, format |
| **Security** | 0-25 | Auth/AuthZ, validation, rate limiting |
| **Feasibility** | 0-25 | Tech stack fit, realistic scope, dependencies |

**Total:** 100 points

---

## 📊 APPENDIX B: CLAIM VERIFICATION RULES

| Sources | Confidence | Action |
|:-------:|:----------:|:-------|
| ≥ 3 | **HIGH** | Include in PRD |
| 2 | **MEDIUM** | Include with note |
| 1 | **LOW** | Flag for manual review |
| 0 | **NONE** | Remove from PRD |

---

## 📊 APPENDIX C: EXAMPLE

**Input:** "Add a subscription module with Stripe"

**Process:**
```
Step 1 (Research): 
  Thought: Search Stripe API best practices 
  Observation: Use Webhooks for async events, HMAC signature validation required

Step 2 (Codebase):
  Thought: Scan internal repo 
  Observation: Project uses FastAPI + SQLAlchemy, no existing Stripe integration

Step 3 (Claim Verification):
  - "stripe-python" package → npm/pypi check → ✅ EXISTS
  - "stripe-webhooks-sdk" → npm/pypi check → ❌ HALLUCINATED (removed)

Step 4 (Reflexion):
  Iteration 1: Initial draft missed webhook security
  Critique: Security score 15/25 (missing HMAC validation)
  Iteration 2: Added HMAC signature validation
  Critique: Security score 24/25 ✅
```

**Output:** PRD including Stripe webhook endpoint specs with HMAC security controls

---

**Version History:**
- v1.0.0: Initial release - Hybrid of research-prd v2.3 + reflexion-prd v2.1
  - Combined: Deep Research + Claim Verification + Reflexion Loop
  - Added: Tree of Thoughts reasoning, Package Registry Lookup
  - Anti-Hallucination: Mandatory ≥2 source verification
