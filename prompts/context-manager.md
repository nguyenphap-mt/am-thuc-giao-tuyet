# Context Manager

> **Purpose**: Manage context efficiently to prevent overflow and maintain coherence.
> **Trigger**: Auto-activate every 10 tool calls or on demand

---

## 1. Context Tracking

### 1.1 Context Budget
```yaml
context_budget:
  total_tokens: 128000        # Claude context window
  reserved_for_output: 8000   # Response generation
  available: 120000           # Usable context
  
  zones:
    system_prompt: 15000      # Fixed
    conversation: 80000       # Dynamic, can compress
    files: 20000              # Currently viewed files
    artifacts: 5000           # Generated artifacts
```

### 1.2 Context Health Check
```yaml
health_check:
  trigger: every_10_tool_calls
  
  metrics:
    - conversation_length: count messages
    - files_loaded: count unique files
    - artifacts_created: count artifacts
    
  thresholds:
    warning: 70%              # Show warning
    critical: 85%             # Auto-compress
    emergency: 95%            # Force summarize
```

---

## 2. Auto-Summarization

### 2.1 When to Summarize
| Trigger | Action |
| :--- | :--- |
| Context > 85% | Compress old messages |
| Step complete | Summarize step output |
| Checkpoint reached | Save checkpoint summary |
| User requests | `/summarize` command |

### 2.2 Summarization Format
```markdown
## Context Summary (Auto-generated)
**Workflow**: {workflow_id}
**Feature**: {feature_name}
**Current Step**: {step_number} - {step_name}

### Completed Steps:
1. ✅ Analysis: {summary}
2. ✅ Database: Created tables `{tables}`
3. ✅ Backend: Created files `{files}`
4. 🔄 Frontend: In progress...

### Key Decisions:
- Decision 1: {description}
- Decision 2: {description}

### Pending Work:
- [ ] Task 1
- [ ] Task 2

### Files Modified:
- `path/to/file1.go` - {purpose}
- `path/to/file2.tsx` - {purpose}
```

---

## 3. Selective Loading

### 3.1 Load Priority
| Priority | Files | Load When |
| :---: | :--- | :--- |
| P0 | `orchestrator.md` | Always |
| P0 | Current step specialist | Current step |
| P1 | Current module agent | Current module |
| P2 | Related validators | Validation phase |
| P3 | Templates | Generation phase |

### 3.2 Unload Strategy
```yaml
unload_rules:
  - after_step_complete: unload step specialist
  - after_validation: unload validators
  - after_generation: unload templates
  - keep_always: orchestrator, state-machine
```

---

## 4. Checkpoint Context

### 4.1 Checkpoint Structure
```yaml
checkpoint:
  id: checkpoint_{step}_{timestamp}
  step: 3
  name: backend_complete
  
  context_snapshot:
    files_created:
      - path: internal/modules/inventory/domain/entity.go
        purpose: Domain entities
      - path: internal/modules/inventory/application/dto.go
        purpose: API DTOs
        
    key_decisions:
      - "Using repository pattern for data access"
      - "Implementing soft delete for all entities"
      
    pending_tasks:
      - "Create HTTP handlers"
      - "Add validation middleware"
      
    dependencies:
      - table: purchase_orders (created in step 2)
      - api: /api/v1/purchase-orders (to be created)
```

### 4.2 Resume from Checkpoint
```yaml
resume_protocol:
  1_load_checkpoint:
    - Read checkpoint file
    - Extract context_snapshot
    
  2_rebuild_context:
    - Load orchestrator
    - Load current step specialist
    - Inject checkpoint summary
    
  3_continue:
    - Start from next action in step
    - Reference previous work from snapshot
```

---

## 5. Commands

### `/summarize`
```
Usage: /summarize

Output: Generates a context summary of current conversation.
Saves to: .agent/context/summary_{timestamp}.md
```

### `/context`
```
Usage: /context

Output: Shows current context usage:
- Total tokens used: X / 120000 (Y%)
- Conversation: X tokens
- Files loaded: X files
- Artifacts: X items
```

### `/compact`
```
Usage: /compact

Action: Force compress conversation history.
Keeps: Last 10 messages + all checkpoints
Removes: Intermediate messages
```

---

## 6. Implementation

### 6.1 Auto-Compress Logic
```typescript
function shouldCompress(currentUsage: number): boolean {
  const threshold = 0.85; // 85%
  return currentUsage > threshold;
}

function compressConversation(messages: Message[]): Message[] {
  // Keep system messages
  const system = messages.filter(m => m.role === 'system');
  
  // Keep last N messages
  const recent = messages.slice(-10);
  
  // Summarize middle messages
  const middle = messages.slice(system.length, -10);
  const summary = generateSummary(middle);
  
  return [...system, { role: 'assistant', content: summary }, ...recent];
}
```

### 6.2 Integration with Workflow
```yaml
workflow_integration:
  after_each_step:
    - Save checkpoint context
    - Check context health
    - Compress if needed
    
  before_next_step:
    - Unload previous specialist
    - Load next specialist
    - Inject relevant checkpoint
```

---

## 7. Best Practices

### For Developers
1. **Break large features** into smaller sub-features
2. **Use `/status`** frequently to check progress
3. **Use `/summarize`** before complex operations
4. **Start new conversation** if context gets cluttered

### For AI Agent
1. **Summarize** after completing each step
2. **Reference checkpoints** instead of re-reading files
3. **Unload** unused context proactively
4. **Warn user** when approaching context limits
