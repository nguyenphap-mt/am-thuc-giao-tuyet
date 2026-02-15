# Roadmap Auto-Update Module

> **Purpose**: Automatically update ROADMAP.md status when features are completed.
> **Trigger**: On `COMPLETE` state or `final_verification` checkpoint passed

---

## Update Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature Complete → Find Task in Roadmap → Update Status → Log  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Files

| File | Purpose |
| :--- | :--- |
| `.agent/ROADMAP.md` | Main roadmap |
| `.agent/roadmap/sprint-3a-finance.md` | Sprint 3A detail |
| `.agent/roadmap/sprint-3b-hr.md` | Sprint 3B detail |

---

## Update Rules

### 1. Status Symbols
| Symbol | Meaning | When |
| :---: | :--- | :--- |
| ⬜ | Pending | Initial state |
| 🔄 | In Progress | On task start |
| ✅ | Complete | On verification pass |
| ❌ | Blocked | On dependency fail |

### 2. Pattern Matching
```yaml
find_task:
  patterns:
    - "| {task_name} |"
    - "- [ ] {task_name}"
    - "| {feature_name} |"
  
  fuzzy_match:
    enabled: true
    threshold: 0.8
    # Match "Employee CRUD API" to "Employees table"
```

### 3. Update Action
```yaml
update_status:
  # Table format
  before: "| {task_name} | {owner} | ⬜ |"
  after:  "| {task_name} | {owner} | ✅ |"
  
  # Checklist format
  before: "- [ ] {task_name}"
  after:  "- [x] {task_name}"
```

---

## Integration with Workflow

### Step 7: Auto-Update Roadmap
```yaml
trigger: 
  - on_event: dod_passed
  - on_checkpoint: final_verification
  
actions:
  1_identify_sprint:
    method: by_date_or_feature
    rules:
      - Week 1-2: Sprint 1
      - Week 3-4: Sprint 2
      - Week 5-6: Sprint 3A/3B
      - Week 7-8: Sprint 4
      - Week 9-10: Sprint 5
      - Week 11-12: Sprint 6
      
  2_find_task:
    search_in:
      - .agent/ROADMAP.md
      - .agent/roadmap/sprint-{N}*.md
    pattern: feature_name
    
  3_update_status:
    old: "⬜"
    new: "✅"
    
  4_add_timestamp:
    format: "<!-- Completed: YYYY-MM-DD HH:mm -->"
    position: after_task_line
    
  5_update_deliverables:
    find: "- [ ] {related_deliverable}"
    update: "- [x] {related_deliverable}"
    
  6_calculate_progress:
    count: completed_tasks / total_tasks
    update_section: "Sprint Progress"
```

---

## Example Updates

### Before
```markdown
#### 3.4.2 Backend API
| Task | Owner | Status | Priority |
| :--- | :--- | :---: | :---: |
| Employee CRUD API | BE Agent | ⬜ | P0 |
| Attendance API | BE Agent | ⬜ | P0 |
| Piece-Rate Payroll Engine | BE Agent | ⬜ | P0 |
```

### After (Employee CRUD completed)
```markdown
#### 3.4.2 Backend API
| Task | Owner | Status | Priority |
| :--- | :--- | :---: | :---: |
| Employee CRUD API | BE Agent | ✅ | P0 |
<!-- Completed: 2026-01-12 22:40 -->
| Attendance API | BE Agent | ⬜ | P0 |
| Piece-Rate Payroll Engine | BE Agent | ⬜ | P0 |
```

---

## Progress Tracking

### Auto-Generated Summary
```markdown
## Sprint Progress

### Sprint 3A: Finance
Progress: ████████░░ 80% (22/27 tasks)
- Remaining: 5 tasks
- Blocked: 0 tasks

### Sprint 3B: HR  
Progress: ██░░░░░░░░ 20% (7/34 tasks)
- Remaining: 27 tasks
- Blocked: 0 tasks
```

---

## Logging

### Completion Log Format
```yaml
# .agent/logs/roadmap-updates.log

- timestamp: 2026-01-12T22:40:00+07:00
  feature: Employee CRUD API
  sprint: 3B
  task_id: 3.4.2.1
  owner: BE Agent
  duration: 2h 15m
  files_changed:
    - internal/modules/hr/application/employee_dto.go
    - internal/modules/hr/infrastructure/employee_handler.go
```

---

## Error Handling

| Error | Resolution |
| :--- | :--- |
| Task not found | Log warning, ask to add manually |
| Multiple matches | Use most specific match |
| File locked | Retry after 5s, max 3 times |
| Invalid format | Skip update, log error |

---

## Configuration

```yaml
# .agent/config/roadmap-updater.yaml

enabled: true
auto_commit: false  # Require manual commit
log_level: info

matching:
  fuzzy_enabled: true
  threshold: 0.8
  case_sensitive: false

update:
  add_timestamp: true
  update_deliverables: true
  calculate_progress: true
  
notifications:
  on_sprint_complete: true
  on_milestone: true
```
