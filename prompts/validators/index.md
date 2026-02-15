# Validators Index

> **Purpose**: Entry point for all auto-validation systems.
> **Result**: Enables 100% automation by removing human checkpoints.

---

## Available Validators

| Validator | File | Removes Checkpoint |
| :--- | :--- | :--- |
| **Schema Validator** | `validators/schema-validator.md` | Step 2 (Database) |
| **Permission Engine** | `validators/permission-engine.md` | Step 6 (Permission) |
| **DoD Runner** | `validators/dod-runner.md` | Step 8 (Final) |

---

## Automation Level

### Before Validators
```
Step 2: Database    → Human Required (turbo-pause)
Step 6: Permission  → Human Required (turbo-pause)
Step 8: Final DoD   → Human Required (turbo-pause)

Automation: 69% (5.5/8 steps)
```

### After Validators
```
Step 2: Database    → Auto-Validate (turbo-validate)
Step 6: Permission  → Auto-Generate (turbo-auto-permission)
Step 8: Final DoD   → Auto-Verify (turbo-auto-dod)

Automation: 100% (8/8 steps) ✅
```

---

## Usage

### Workflow Annotations

| Annotation | Behavior |
| :--- | :--- |
| `// turbo` | Auto-run this step |
| `// turbo-all` | Auto-run all safe steps |
| `// turbo-pause` | Stop for human approval |
| `// turbo-validate` | Run schema validator, pause only on critical fail |
| `// turbo-auto-permission` | Run permission engine, pause only on sensitive |
| `// turbo-auto-dod` | Run DoD runner, pause only on critical fail |

### Commands

```yaml
/validate-schema {file}     # Run schema validation
/generate-permissions {entity}  # Generate permission matrix
/run-dod {feature}          # Run DoD verification
```

---

## Escalation Rules

| Validator | Auto-Approve When | Escalate When |
| :--- | :--- | :--- |
| Schema | All critical checks pass | Any critical fail |
| Permission | Pattern = CRUD_Standard, Owner_Based | Pattern = Sensitive_Data, Admin_Only |
| DoD | All critical + high pass | Any critical fail |

---

## Safety Guarantees

```yaml
safety_rules:
  # Never auto-approve these
  always_escalate:
    - RLS violation detected
    - Security breach pattern
    - Sensitive data without review
    - Production impact possible
    
  # Always log even on auto-approve
  always_log:
    - All validation results
    - All auto-approve decisions
    - Pattern matches used
    - Confidence scores
```

---

## File Structure

```
.agent/prompts/validators/
├── index.md              # This file
├── schema-validator.md   # SQL validation engine
├── permission-engine.md  # Permission pattern matching
└── dod-runner.md         # Automated DoD verification
```
