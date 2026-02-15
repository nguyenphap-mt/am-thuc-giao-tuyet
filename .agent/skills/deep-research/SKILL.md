---
name: deep-research
description: Skill thực hiện nghiên cứu sâu từ web với parallel processing, chain of density, và claim verification
version: 2.3.0
portable: true
optimizations:
  - parallel_url_reading
  - chain_of_density
  - claim_verification
  - recency_weighted_ranking
  - fresh_content_boost         # OPT-07
  - preserve_numerical_data     # OPT-02
  - preserve_citations          # OPT-06
  - code_reference_confidence   # OPT-08
  - adaptive_stagnation         # REC-1
  - vector_database             # REC-3
  - tiered_verification         # REC-4
  - rate_limit_backoff          # REC-5
---

# IDENTITY
Bạn là một Senior Research Analyst với 10+ năm kinh nghiệm trong technical research và competitive analysis. Bạn có khả năng tìm kiếm, đọc, và tổng hợp thông tin từ nhiều nguồn khác nhau thành insights có giá trị.

# CO-STEP FRAMEWORK

## CONTEXT (BỐI CẢNH)
- Bạn được invoke từ workflow `/research-prd` hoặc `/research`
- Bạn có quyền sử dụng các tools: `search_web`, `read_url_content`, `browser_subagent`
- Bạn cần output research có thể được sử dụng trực tiếp cho PRD drafting

## OBJECTIVE (MỤC TIÊU CỐT LÕI)
1. Tìm kiếm thông tin liên quan từ web (parallel processing)
2. Đọc và extract nội dung từ các URL chất lượng cao (với timeout handling)
3. Tổng hợp theo framework WHAT-WHY-HOW-COMPARE-IMPLICATIONS (Chain of Density)
4. Verify claims across multiple sources (anti-hallucination)
5. Tạo research report với citations đầy đủ

## STYLE & TONE
- **Style:** Academic nhưng practical
- **Tone:** Objective, evidence-based, fact-first

# RESEARCH PROCESS

## Phase 1: Query Formulation

### Step 1.1: Parse Research Topic
```python
def parse_topic(user_intent: str, tech_stack: str = None) -> ResearchPlan:
    """
    Phân tích intent và tạo research plan
    """
    plan = {
        "primary_topic": extract_main_subject(user_intent),
        "sub_topics": extract_sub_topics(user_intent),
        "research_questions": generate_questions(user_intent, count=5),
        "search_queries": generate_search_queries(user_intent, tech_stack),
        "depth_level": determine_depth(user_intent)  # quick | standard | deep
    }
    return plan
```

### Step 1.2: Generate Search Queries
```python
QUERY_TEMPLATES = [
    "{topic} best practices",
    "{topic} implementation guide",
    "{topic} vs alternatives comparison",
    "{topic} common mistakes pitfalls",
    "{topic} architecture design patterns",
    "{topic} case study real world",
    "{topic} {tech_stack} integration"  # Tech-stack specific
]

# ⭐ NEW: Add recency-focused queries
RECENCY_QUERIES = [
    "{topic} 2025 2026 latest",
    "{topic} modern approach"
]
```

## Phase 2: Data Collection - PARALLEL ⚡ OPTIMIZED

### Step 2.1: Web Search with Fallback
```python
async def execute_search_with_fallback(queries: list[str]) -> SearchResult:
    """
    Thực hiện tìm kiếm với fallback mechanism
    """
    try:
        all_results = []
        
        for query in queries:
            results = await search_web(query)
            all_results.extend(results)
        
        # ⭐ OPT-01: Check for empty results
        if len(all_results) == 0:
            log.warning("Web search returned 0 results. Triggering KB fallback.")
            return SearchResult(sources=[], mode="FALLBACK", error="Empty results")
        
        # Deduplicate và rank
        ranked = rank_by_relevance(deduplicate(all_results))
        
        # ⭐ NEW: Apply recency penalty
        ranked = apply_recency_penalty(ranked, max_age_months=12)
        
        return SearchResult(
            sources=ranked[:20],
            mode="FULL"
        )
    
    except SearchException as e:
        log.warning(f"Web search failed: {e}")
        return SearchResult(
            sources=[],
            mode="FALLBACK",
            error=str(e)
        )
```

### Step 2.1.1: Recency-Weighted Ranking ⚡ ENHANCED v2.2
```python
def apply_recency_penalty(sources: list, max_age_months: int = 12) -> list:
    """
    Penalize older sources to prefer recent content
    Formula: score * (1 - age_months / (max_age_months * 2))
    """
    now = datetime.now()
    
    for source in sources:
        publish_date = source.get("publish_date")
        if publish_date:
            age_months = (now - publish_date).days / 30
            
            if age_months > max_age_months:
                # Apply penalty: up to 50% reduction for very old content
                penalty = min(0.5, age_months / (max_age_months * 2))
                source["relevance_score"] *= (1 - penalty)
                source["recency_penalty"] = penalty
        else:
            # Unknown date: apply small penalty
            source["relevance_score"] *= 0.9
            source["recency_penalty"] = 0.1
    
    # Re-sort by adjusted score
    return sorted(sources, key=lambda x: x["relevance_score"], reverse=True)

# ⭐ OPT-07: Apply boost for very recent content
def apply_freshness_boost(sources: list, threshold_months: int = 3, boost_percentage: float = 0.10) -> list:
    """
    Boost sources published within threshold_months
    Formula: score * (1 + boost_percentage) for fresh content
    """
    now = datetime.now()
    
    for source in sources:
        publish_date = source.get("publish_date")
        if publish_date:
            age_months = (now - publish_date).days / 30
            
            if age_months <= threshold_months:
                # Apply boost for very fresh content
                source["relevance_score"] *= (1 + boost_percentage)
                source["freshness_boost"] = boost_percentage
                source["is_fresh"] = True
            else:
                source["is_fresh"] = False
    
    # Re-sort by adjusted score
    return sorted(sources, key=lambda x: x["relevance_score"], reverse=True)
```

### Step 2.2: Content Reading - PARALLEL with REC-5 Rate Limit
```python
async def read_sources_parallel(sources: list[SearchResult], depth: str) -> list[Content]:
    """
    ⚡ PARALLEL: Đọc tất cả URLs đồng thời với timeout handling
    ⭐ REC-5: Domain-specific rate limiting with exponential backoff
    """
    max_sources = {
        "quick": 5,
        "standard": 10,
        "deep": 20
    }
    
    timeout_per_source = {
        "quick": 10,
        "standard": 20,
        "deep": 30
    }
    
    sources_to_read = sources[:max_sources[depth]]
    timeout = timeout_per_source[depth]
    
    # ⭐ REC-5: Rate limit backoff helper
    async def fetch_with_backoff(url: str) -> str:
        """
        Fetch URL with domain-specific exponential backoff
        """
        domain = extract_domain(url)
        strategy = research_config.rate_limiting.domain_strategies.get(
            domain, 
            research_config.rate_limiting.domain_strategies.get("default")
        )
        
        for attempt in range(strategy.max_retries):
            try:
                return await read_url_content(url)
            except RateLimitError:
                delay = strategy.base_delay * (strategy.backoff_multiplier ** attempt)
                log.warning(f"Rate limited by {domain}, retry {attempt+1}/{strategy.max_retries} in {delay}s")
                await asyncio.sleep(delay)
            except Exception as e:
                if attempt == strategy.max_retries - 1:
                    raise e
        
        return None  # Graceful failure after all retries
    
    async def read_single_source(source):
        """Read one source with timeout, rate limiting, and error handling"""
        try:
            content = await asyncio.wait_for(
                fetch_with_backoff(source.url),
                timeout=timeout
            )
            
            return {
                "url": source.url,
                "title": source.title,
                "content": content,
                "relevance_score": source.score,
                "publish_date": extract_publish_date(content),
                "source_type": classify_source(source.url),
                "recency_penalty": source.get("recency_penalty", 0),
                "status": "success",
                "token_count": len(content) // 4  # Rough estimate
            }
        except asyncio.TimeoutError:
            log.warning(f"Timeout reading {source.url}")
            return {"url": source.url, "status": "timeout"}
        except Exception as e:
            log.warning(f"Error reading {source.url}: {e}")
            return {"url": source.url, "status": "error", "error": str(e)}
    
    # ⚡ Execute ALL reads in parallel
    results = await asyncio.gather(
        *[read_single_source(s) for s in sources_to_read],
        return_exceptions=True
    )
    
    # Filter successful reads and log stats
    successful = [r for r in results if isinstance(r, dict) and r.get("status") == "success"]
    failed = len(results) - len(successful)
    
    log.info({
        "event": "parallel_read_complete",
        "total": len(results),
        "successful": len(successful),
        "failed": failed,
        "total_tokens": sum(r.get("token_count", 0) for r in successful)
    })
    
    return successful
```

## Phase 3: Analysis & Synthesis - CHAIN OF DENSITY ⚡ OPTIMIZED

### Step 3.1: Chain of Density Synthesis ⚡ NEW
```python
def chain_of_density_synthesis(contents: list[Content], questions: list[str]) -> ResearchSynthesis:
    """
    ⚡ CHAIN OF DENSITY: 3-step progressive summarization
    Reduces token usage by 25-30% while preserving key information
    
    Step 1: Individual summaries (verbose, 500 tokens each)
    Step 2: Paired merges (denser, 300 tokens each)
    Step 3: Final framework synthesis (densest)
    """
    
    # ========== STEP 1: Individual Summaries ==========
    individual_summaries = []
    for content in contents:
        summary = summarize(
            content["content"],
            max_tokens=500,
            focus=["key_points", "best_practices", "warnings", "examples"]
        )
        
        # Extract verifiable claims for later verification
        claims = extract_key_claims(summary)
        
        individual_summaries.append({
            "url": content["url"],
            "title": content["title"],
            "source_type": content["source_type"],
            "summary": summary,
            "claims": claims,
            "publish_date": content.get("publish_date")
        })
    
    log.info(f"Step 1 complete: {len(individual_summaries)} individual summaries")
    
    # ========== STEP 2: Paired Merges ==========
    merged_summaries = []
    for i in range(0, len(individual_summaries), 2):
        pair = individual_summaries[i:i+2]
        
        merged = merge_summaries(
            pair,
            max_tokens=300,
            # ⭐ OPT-02, OPT-06: Enhanced preserve list to prevent data loss
            preserve=[
                "unique_insights", 
                "contradictions", 
                "consensus_points",
                "numerical_data",    # OPT-02: Statistics, metrics, percentages
                "citations",          # OPT-06: Source URLs, author attributions
                "dates",              # Publication dates, version numbers
                "code_examples"       # Code snippets and examples
            ]
        )
        
        merged["source_urls"] = [p["url"] for p in pair]
        merged["combined_claims"] = [c for p in pair for c in p.get("claims", [])]
        merged_summaries.append(merged)
    
    log.info(f"Step 2 complete: {len(merged_summaries)} merged summaries")
    
    # ========== STEP 3: Framework Synthesis ==========
    synthesis = {
        "WHAT": {
            "definition": extract_and_merge(merged_summaries, "definitions"),
            "key_concepts": extract_and_merge(merged_summaries, "concepts"),
            "components": extract_and_merge(merged_summaries, "components")
        },
        "WHY": {
            "benefits": extract_and_merge(merged_summaries, "benefits"),
            "use_cases": extract_and_merge(merged_summaries, "use_cases"),
            "motivations": extract_and_merge(merged_summaries, "motivations")
        },
        "HOW": {
            "implementation_approaches": extract_and_merge(merged_summaries, "approaches"),
            "step_by_step": extract_and_merge(merged_summaries, "guides"),
            "best_practices": extract_and_merge(merged_summaries, "best_practices"),
            "code_examples": extract_and_merge(merged_summaries, "code_snippets")
        },
        "COMPARE": {
            "alternatives": extract_and_merge(merged_summaries, "alternatives"),
            "comparison_matrix": build_comparison_matrix(merged_summaries),
            "pros_cons": extract_and_merge(merged_summaries, "pros_cons")
        },
        "IMPLICATIONS": {
            "risks": extract_and_merge(merged_summaries, "risks"),
            "considerations": extract_and_merge(merged_summaries, "considerations"),
            "limitations": extract_and_merge(merged_summaries, "limitations"),
            "future_trends": extract_and_merge(merged_summaries, "trends")
        }
    }
    
    # Answer research questions
    synthesis["question_answers"] = answer_questions(questions, merged_summaries)
    
    # Collect all claims for verification
    synthesis["all_claims"] = [
        c for m in merged_summaries for c in m.get("combined_claims", [])
    ]
    
    # Source metadata
    synthesis["sources"] = [
        {
            "url": s["url"],
            "title": s["title"],
            "type": s["source_type"],
            "publish_date": s.get("publish_date")
        }
        for s in individual_summaries
    ]
    
    log.info(f"Step 3 complete: Framework synthesis with {len(synthesis['sources'])} sources")
    
    return synthesis
```

### Step 3.2: Claim Verification Layer ⚡ ENHANCED v2.2
```python
def verify_claims(synthesis: ResearchSynthesis, min_sources: int = 2) -> ResearchSynthesis:
    """
    ⚡ ANTI-HALLUCINATION: Cross-check key claims với ≥2 independent sources
    Flag unverified claims as LOW_CONFIDENCE
    """
    all_claims = synthesis.get("all_claims", [])
    sources = synthesis.get("sources", [])
    
    verified_claims = []
    unverified_claims = []
    
    for claim in all_claims:
        # Find sources that support this claim
        supporting_sources = []
        code_reference_sources = []  # ⭐ OPT-08: Track code references
        
        for source in sources:
            if claim_appears_in_source(claim, source):
                supporting_sources.append(source["url"])
                # ⭐ OPT-08: Check if source is a code reference
                if is_code_reference(source):
                    code_reference_sources.append(source["url"])
        
        claim_data = {
            "claim": claim,
            "sources": supporting_sources,
            "code_references": code_reference_sources,
            "source_count": len(supporting_sources)
        }
        
        # ⭐ OPT-08: Code references count as HIGH confidence even with single source
        if len(supporting_sources) >= min_sources:
            claim_data["confidence"] = "HIGH"
            verified_claims.append(claim_data)
        elif len(code_reference_sources) >= 1 and research_config.verification.code_reference_as_high_confidence:
            # OPT-08: Single code reference = HIGH confidence (verified in codebase)
            claim_data["confidence"] = "HIGH"
            claim_data["note"] = "Verified via codebase reference"
            verified_claims.append(claim_data)
        elif len(supporting_sources) == 1:
            claim_data["confidence"] = "MEDIUM"
            claim_data["warning"] = "Single source - verify manually"
            unverified_claims.append(claim_data)
        else:
            claim_data["confidence"] = "LOW"
            claim_data["warning"] = "No direct source found - may be synthesized"
            unverified_claims.append(claim_data)
    
    # Calculate verification metrics
    total_claims = len(all_claims)
    verification_rate = len(verified_claims) / total_claims if total_claims > 0 else 1.0
    
    synthesis["verified_claims"] = verified_claims
    synthesis["unverified_claims"] = unverified_claims
    synthesis["verification_metrics"] = {
        "total_claims": total_claims,
        "verified": len(verified_claims),
        "unverified": len(unverified_claims),
        "verification_rate": verification_rate
    }
    
    # Log warning if verification rate is low
    if verification_rate < 0.7:
        log.warning({
            "event": "low_verification_rate",
            "rate": f"{verification_rate:.0%}",
            "unverified_count": len(unverified_claims)
        })
    
    return synthesis

# ⭐ OPT-08: Helper function to detect code references
def is_code_reference(source: dict) -> bool:
    """Check if source is a code reference from codebase"""
    url = source.get("url", "")
    source_type = source.get("type", "")
    
    # Check for file:// protocol (local codebase)
    if url.startswith("file://"):
        return True
    
    # Check for code reference types
    code_types = ["code_file", "function_ref", "class_ref", "module_ref"]
    if source_type in code_types:
        return True
    
    # Check for common code file patterns
    code_patterns = ["backend/", "frontend/", "src/", ".py", ".ts", ".tsx", ".js"]
    if any(pattern in url for pattern in code_patterns):
        return True
    
    return False
```

# OUTPUT FORMAT

```json
{
  "research_id": "res_2026012707xxxx",
  "topic": "string",
  "depth": "quick | standard | deep",
  "timestamp": "ISO8601",
  
  "synthesis": {
    "WHAT": {...},
    "WHY": {...},
    "HOW": {...},
    "COMPARE": {...},
    "IMPLICATIONS": {...}
  },
  
  "question_answers": [
    {
      "question": "string",
      "answer": "string",
      "citations": ["url1", "url2"],
      "confidence": "HIGH | MEDIUM | LOW"
    }
  ],
  
  "verification_metrics": {
    "total_claims": 25,
    "verified": 20,
    "unverified": 5,
    "verification_rate": 0.80
  },
  
  "verified_claims": [...],
  "unverified_claims": [...],
  
  "quality_score": {
    "total": 85,
    "breakdown": {
      "source_diversity": 85,
      "coverage": 80,
      "depth": 78,
      "recency": 90,
      "authority": 75,
      "verification": 80
    },
    "passed": true
  },
  
  "sources": [...],
  
  "performance_metrics": {
    "parallel_read_time_seconds": 12,
    "original_token_count": 80000,
    "compressed_token_count": 60000,
    "compression_rate": 0.25
  },
  
  "report_path": ".artifacts/research/{topic}_{date}.md"
}
```

# VERSION HISTORY
- v1.0.0: Initial release - Web search, URL reading, WHAT-WHY-HOW framework
- v2.0.0: Optimized release
  - ⚡ Parallel URL reading (70% latency reduction)
  - 🔗 Chain of Density synthesis (25% token reduction)
  - ✅ Claim Verification Layer (anti-hallucination)
  - 📊 Recency-Weighted Ranking
  - 🔄 Fallback to KB mode
  - 📈 Enhanced quality scoring with verification
- v2.2.0: Audit Optimizations (04/02/2026)
  - 🔄 OPT-01: Empty results trigger KB fallback
  - 📊 OPT-02: Preserve numerical_data in synthesis
  - 📎 OPT-06: Preserve citations in synthesis
  - 🚀 OPT-07: Fresh content boost (+10% for <3 months)
  - � OPT-08: Code references as HIGH confidence
