# Workflow State Machine Controller

> **Purpose**: Finite State Machine (FSM) for deterministic workflow execution.
> **Architecture Score Target**: 7/10 → 10/10

---

## V2 Simplified Configuration

> **RED TEAM FIX**: Reduced complexity from 12 states to 6 core + optional.

```yaml
# Core States (Always Active)
core_states:
  - INIT       # Entry point
  - DEVELOP    # DB + BE + FE combined
  - TEST       # Browser + Permission + Doc
  - VERIFY     # Final DoD check
  - COMPLETE   # Success
  - FAILED     # Error handler

# Optional States (Lazy-loaded when needed)
optional_states:
  - PARALLEL_BROWSER_TEST
  - PARALLEL_PERMISSION
  - PARALLEL_DOC
  - RECOVERY

# Phase Grouping (for context retention)
phases:
  planning: [INIT]
  development: [DEVELOP]
  verification: [TEST, VERIFY]
  terminal: [COMPLETE, FAILED, RECOVERY]

# Lazy Loading
lazy_state_loading: true
load_optional_on: state_entry
```

---

## State Definitions

### State Enum
```yaml
states:
  INIT:
    description: Workflow initialized, context loading
    valid_transitions: [ANALYZING, ABORTED]
    timeout: 30s
    
  ANALYZING:
    description: 5-Dimensional Assessment in progress
    valid_transitions: [PLANNING, FAILED]
    timeout: 120s
    agent: orchestrator
    
  PLANNING:
    description: Schema/API design phase
    valid_transitions: [DB_READY, REVISION_NEEDED]
    timeout: 300s
    requires_approval: true
    agent: orchestrator
    
  DB_READY:
    description: Database migration phase
    valid_transitions: [BACKEND, FAILED]
    timeout: 180s
    requires_approval: true
    agent: database_specialist
    checkpoint: database_complete
    
  BACKEND:
    description: Go API implementation
    valid_transitions: [FRONTEND, FAILED]
    timeout: 600s
    agent: backend_specialist
    checkpoint: backend_complete
    parallel_unlock: [FRONTEND]  # FE can start after interface ready
    
  FRONTEND:
    description: React UI implementation
    valid_transitions: [PARALLEL_FORK, FAILED]
    timeout: 600s
    agent: frontend_specialist
    checkpoint: frontend_complete
    
  PARALLEL_FORK:
    description: Parallel execution phase
    valid_transitions: [PARALLEL_JOIN]
    parallel_tasks:
      - BROWSER_TEST
      - PERMISSION_DRAFT
      - DOC_OUTLINE
    timeout: 300s
    
  PARALLEL_JOIN:
    description: Waiting for all parallel tasks
    valid_transitions: [VERIFICATION, FAILED]
    requires: all_parallel_complete
    
  VERIFICATION:
    description: Final DoD verification
    valid_transitions: [COMPLETE, FAILED]
    timeout: 120s
    requires_approval: true
    agent: orchestrator
    
  COMPLETE:
    description: Workflow successfully completed
    valid_transitions: []
    final: true
    
  FAILED:
    description: Error occurred
    valid_transitions: [RECOVERY, ABORTED]
    agent: auto_correction_agent
    
  RECOVERY:
    description: Auto-recovery in progress
    valid_transitions: [ANALYZING, BACKEND, FRONTEND, ABORTED]
    max_retries: 3
    agent: auto_correction_agent
    
  ABORTED:
    description: Workflow cancelled
    valid_transitions: []
    final: true
```

---

## State Transition Rules

### Transition Matrix
| From State | Event | To State | Guard Condition |
| :--- | :--- | :--- | :--- |
| INIT | context_loaded | ANALYZING | files_accessible |
| ANALYZING | assessment_done | PLANNING | 5dim_complete |
| PLANNING | approved | DB_READY | human_approval |
| DB_READY | migration_success | BACKEND | tables_exist |
| DB_READY | migration_error | FAILED | - |
| BACKEND | interface_ready | FRONTEND | dto_generated |
| BACKEND | tests_pass | PARALLEL_FORK | coverage > 70% |
| FRONTEND | build_success | PARALLEL_FORK | no_ts_errors |
| PARALLEL_FORK | all_started | PARALLEL_JOIN | 3 tasks spawned |
| PARALLEL_JOIN | all_complete | VERIFICATION | no_blockers |
| VERIFICATION | dod_passed | COMPLETE | all_checks_green |
| FAILED | auto_recover | RECOVERY | retries < 3 |
| RECOVERY | fixed | {previous_failed_state} | test_pass |

---

## State Context Structure

```typescript
interface WorkflowState {
  // Identity
  workflow_id: string;
  feature_name: string;
  module: string;
  created_at: Date;
  
  // Current State
  current_state: StateEnum;
  previous_state: StateEnum;
  state_history: StateTransition[];
  
  // Checkpoints
  checkpoints: {
    [key: string]: {
      status: 'pending' | 'passed' | 'failed';
      timestamp?: Date;
      data?: any;
    };
  };
  
  // Parallel Execution
  parallel_tasks: {
    [task: string]: {
      status: 'pending' | 'running' | 'complete' | 'failed';
      result?: any;
    };
  };
  
  // Recovery
  error_log: ErrorEntry[];
  retry_count: number;
  recovery_strategy?: RecoveryStrategy;
  
  // Artifacts
  artifacts: {
    migration_files: string[];
    go_files: string[];
    react_files: string[];
    test_results: TestResult[];
    screenshots: string[];
  };
  
  // Token Metrics
  token_usage: {
    per_state: { [state: string]: number };
    total: number;
    budget: number;
  };
}
```

---

## State Machine Commands

### Control Commands
| Command | Action | From States |
| :--- | :--- | :--- |
| `/start` | Begin workflow | INIT |
| `/pause` | Pause execution | Any non-final |
| `/resume` | Resume paused workflow | PAUSED |
| `/retry` | Retry current state | FAILED |
| `/rollback {state}` | Go back to state | Any |
| `/abort` | Cancel workflow | Any |
| `/status` | Show current state | Any |
| `/history` | Show state transitions | Any |

### Query Commands
| Command | Returns |
| :--- | :--- |
| `/state` | Current state details |
| `/checkpoints` | All checkpoint statuses |
| `/parallel` | Parallel task statuses |
| `/tokens` | Token usage breakdown |
| `/errors` | Error log |

---

## Automatic Transitions

### Timeout Handling
```yaml
on_timeout:
  action: transition_to_failed
  error_code: TIMEOUT
  message: "State {state} timed out after {timeout}s"
  recovery_hint: "Check if agent is stuck, retry with /retry"
```

### Success Detection
```yaml
success_signals:
  DB_READY:
    - file_exists: "migrations/*.up.sql"
    - query_success: "SELECT 1 FROM {table}"
    
  BACKEND:
    - command_success: "go test ./... -v"
    - file_exists: "internal/modules/{module}/domain/entity.go"
    
  FRONTEND:
    - command_success: "npm run build"
    - file_exists: "src/app/(dashboard)/{module}/page.tsx"
```

---

## Integration with Existing Workflows

### Mapping to create-feature.md
| Original Step | FSM State |
| :---: | :--- |
| Step 1 | ANALYZING |
| Step 2 | DB_READY |
| Step 3 | BACKEND |
| Step 4 | FRONTEND |
| Step 5 | BROWSER_TEST (parallel) |
| Step 6 | PERMISSION_DRAFT (parallel) |
| Step 7 | DOC_OUTLINE (parallel) |
| Step 8 | VERIFICATION |

### Backward Compatibility
```yaml
legacy_support:
  # Old checkpoint names map to FSM states
  checkpoint_mapping:
    analysis_complete: ANALYZING
    database_complete: DB_READY
    backend_complete: BACKEND
    frontend_complete: FRONTEND
    browser_test_passed: PARALLEL_JOIN
    permission_defined: PARALLEL_JOIN
    documentation_complete: PARALLEL_JOIN
    final_verification: VERIFICATION
```
