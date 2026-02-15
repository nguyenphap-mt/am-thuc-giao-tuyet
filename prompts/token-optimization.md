# Token Micro-Optimizations

> **Purpose**: Squeeze the last 10% efficiency from token usage.
> **Token Efficiency Score Target**: 9/10 → 10/10

---

## 1. Prompt Caching Strategy

### 1.1 Static Content Cache
```yaml
cache_config:
  # Prompts that rarely change - cache aggressively
  static_prompts:
    - path: "prompts/rules/core.md"
      cache_key: "rules_core_v1"
      ttl: 24h
      
    - path: "prompts/specialists/*.md"
      cache_key: "specialist_{name}_v1"
      ttl: 24h
      
    - path: "prompts/modules/*.md"
      cache_key: "module_{name}_v1"
      ttl: 24h
      
  # Session-level cache
  session_cache:
    - key: "current_module"
      value: loaded_module_prompt
      ttl: session
      
    - key: "current_state"
      value: workflow_state_json
      ttl: session
```

### 1.2 Incremental Context Loading
```yaml
loading_strategy:
  # Phase 1: Minimal context (always)
  phase_1:
    load: ["rules/core.md"]
    tokens: ~1000
    
  # Phase 2: Task-specific (on demand)
  phase_2:
    triggers:
      DA_dimension: ["rules/database.md"]
      FE_dimension: ["rules/frontend.md"]
      security_work: ["rules/security.md"]
    tokens: ~1500 each
    
  # Phase 3: Full module (only when needed)
  phase_3:
    trigger: entering_module
    load: ["modules/{module}.md"]
    tokens: ~2000
    
  # Never load together
  mutex_groups:
    - ["rules/database.md", "rules/frontend.md"]  # One or the other
```

---

## 2. Dynamic Temperature Scaling

### 2.1 Temperature by State
```yaml
temperature_config:
  # Low temperature = deterministic, follow rules
  low_temp_states: # temp: 0.1-0.3
    - ANALYZING
    - DB_READY
    - VERIFICATION
    
  # Medium temperature = balanced
  medium_temp_states: # temp: 0.5-0.7
    - PLANNING
    - BACKEND
    - FRONTEND
    
  # Higher temperature = creative solutions
  high_temp_states: # temp: 0.8-1.0
    - RECOVERY  # Need creative problem-solving
    - PARALLEL_FORK  # Multiple approaches
```

### 2.2 Temperature by Task Type
```yaml
task_temperature:
  code_generation: 0.3  # Deterministic, follow patterns
  error_analysis: 0.7   # Need to find non-obvious causes
  documentation: 0.5    # Clear but natural language
  test_generation: 0.4  # Systematic but varied
  refactoring: 0.2      # Very deterministic
```

---

## 3. Context Window Management

### 3.1 Sliding Window with Priority
```yaml
context_management:
  max_tokens: 100000  # Model limit
  reserved_output: 4000  # For response
  usable_context: 96000
  
  priority_layers:
    P0_always: # ~5000 tokens
      - system_prompt
      - current_state
      - immediate_task
      
    P1_recent: # ~10000 tokens
      - last_3_messages
      - current_file_content
      - error_context (if any)
      
    P2_reference: # ~20000 tokens (sliding)
      - relevant_rules
      - relevant_specialist
      - code_snippets
      
    P3_history: # Remaining (compressed)
      - previous_checkpoints (summary only)
      - past_errors (pattern only)
```

### 3.2 Smart Summarization
```yaml
summarization_triggers:
  # When to summarize instead of include full content
  rules:
    - if: file_size > 5000_tokens
      action: summarize_to_key_points
      
    - if: message_age > 5_turns
      action: compress_to_summary
      
    - if: code_file && not_currently_editing
      action: include_signature_only
```

---

## 4. Lazy Evaluation

### V2 Smarter Context Retention (Red Team Correction)
```yaml
# CRITICAL: Prevent context fragmentation from aggressive unloading
context_retention:
  # Keep recently used (LRU cache)
  lru_size: 3
  
  # Never unload during active step
  sticky_during_step: true
  
  # Only unload when entering new major phase (not every state)
  unload_trigger: phase_change
  
  # Major phases
  phases:
    planning: [INIT, ANALYZING, PLANNING]
    development: [DB_READY, BACKEND, FRONTEND]
    verification: [BROWSER_TEST, PERMISSION, DOC, VERIFY]
    
  # Re-load cost awareness
  reload_penalty: 1.5x  # Account for re-load cost when deciding to unload
```

### 4.1 Defer Loading
```yaml
lazy_loading:
  # Don't load until actually needed
  defer:
    - permission_matrix: until PERMISSION_DRAFT state
    - api_contracts: until BACKEND state
    - database_schema: until DB_READY state
    - test_strategy: until BROWSER_TEST state
    
  # Unload when no longer needed
  unload:
    - database.md: after leaving DB_READY
    - frontend.md: after leaving FRONTEND
```

### 4.2 On-Demand Rule Expansion
```yaml
rule_expansion:
  # Start with summary, expand on need
  default: "summary_only"
  
  expand_triggers:
    - question_about: "RLS" → load full database.md
    - question_about: "AG Grid" → load full frontend.md
    - error_contains: "permission" → load full security.md
```

---

## 5. Compression Techniques

### 5.1 Code Compression
```yaml
code_compression:
  # When including code, compress non-essential parts
  include_full:
    - function being edited
    - related test
    
  include_signature_only:
    - other functions in file
    - imported modules
    
  exclude:
    - comments (unless explaining complex logic)
    - blank lines
    - type definitions (unless relevant)
```

### 5.2 Message Compression
```yaml
message_compression:
  # Compress older messages
  recent_3: full
  messages_4_to_10: summary
  older_than_10: key_decisions_only
  
  summary_template: |
    [Turn {n}]: {action} → {result}
    Files: {files_touched}
```

---

## 6. Token Budget Enforcement

### 6.1 Per-State Budgets
```yaml
token_budgets:
  ANALYZING: 5000
  PLANNING: 8000
  DB_READY: 10000
  BACKEND: 15000
  FRONTEND: 15000
  BROWSER_TEST: 8000
  VERIFICATION: 5000
  RECOVERY: 10000
  
  enforcement:
    soft_limit: 90%  # Warning
    hard_limit: 100%  # Compress context
```

### 6.2 Overage Handling
```yaml
on_budget_exceed:
  1. Compress oldest context (P3 → summary)
  2. Unload unused references (P2)
  3. If still over → summarize P1
  4. Never compress P0
```

---

## 7. Metrics & Monitoring

### 7.1 Token Usage Tracking
```yaml
tracking:
  per_state:
    measure: tokens_used
    compare: budget
    alert_if: over_budget
    
  per_workflow:
    measure: total_tokens
    compare: historical_average
    alert_if: "> 1.5x average"
    
  efficiency_score:
    formula: (output_quality / tokens_used) * 100
    target: "> 90"
```

### 7.2 Optimization Feedback Loop
```yaml
feedback_loop:
  collect:
    - tokens_per_successful_step
    - tokens_wasted_on_failed_attempts
    - compression_effectiveness
    
  adjust:
    - if: step_consistently_under_budget
      action: reduce_budget_10%
    - if: step_consistently_over
      action: increase_budget_10%
    - if: compression_hurts_quality
      action: relax_compression_rules
```
