---
description: Quy trình sửa lỗi (bug) một cách có hệ thống
---

---
description: Quy trình sửa lỗi (bug) một cách có hệ thống - Hardened v2.0
version: 2.0
last_updated: 2026-01-30
---

# /fix-bug Workflow (Hardened v2.0)

> **Trigger**: Khi người dùng report một bug cần sửa.  
> **Output**: Bug fixed, tested, documented  
> **RPN Compliance**: All mitigations for RPN > 30 integrated

// turbo-all

---

## Step 1: Bug Analysis (Phân tích lỗi)

### 1.1 Thu thập thông tin (MANDATORY TEMPLATE)

> [!IMPORTANT]
> **F1.1 Mitigation**: Use this structured template. All fields required.

| Field | Value | Required |
| :--- | :--- | :---: |
| **Bug ID** | `BUG-{YYYYMMDD}-{SEQ}` | ✅ |
| **Module/Feature** | e.g., Quote Management | ✅ |
| **Severity** | Critical / High / Medium / Low | ✅ |
| **Steps to Reproduce** | Numbered list, minimum 3 steps | ✅ |
| **Expected Behavior** | Clear description | ✅ |
| **Actual Behavior** | Clear description | ✅ |
| **Environment** | OS, Browser, Backend version | ✅ |
| **Reporter** | Name/Contact | ✅ |

### 1.2 Reproduce lỗi (ENVIRONMENT SNAPSHOT)

> [!CAUTION]
> **F1.2/F1.3 Mitigation**: Must use identical environment. If cannot reproduce after 3 attempts, escalate.

1. **Environment Verification Checklist**:
   - [ ] Database version matches reporter's environment
   - [ ] Test data loaded (use anonymized production dump if available)
   - [ ] Same browser/device type as reporter
   - [ ] Backend running with same configuration

2. **Reproduction Steps**:
   ```powershell
   # // turbo - Start dev environment
   .\.agent\scripts\dev-start.ps1
   ```

3. **Attempt Log**:
   | Attempt | Result | Notes |
   | :---: | :--- | :--- |
   | 1 | ⬜ Reproduced / ❌ Not reproduced | |
   | 2 | ⬜ Reproduced / ❌ Not reproduced | |
   | 3 | ⬜ Reproduced / ❌ Not reproduced | |

4. **If NOT reproduced after 3 attempts**:
   - [ ] Contact reporter for live session
   - [ ] Request HAR file / browser recording
   - [ ] Check for race condition / timing issue

### 1.3 Capture evidence (AUTO-ARCHIVE)

> [!IMPORTANT]
> **F1.4 Mitigation**: All evidence must be saved to persistent location.

1. **Create evidence folder**:
   ```powershell
   # // turbo
   mkdir -p .debug/BUG-{bug-id}/
   ```

2. **Capture and save**:
   - [ ] Screenshot → `.debug/BUG-{bug-id}/screenshot.png`
   - [ ] Console logs → `.debug/BUG-{bug-id}/console.log`
   - [ ] Network HAR → `.debug/BUG-{bug-id}/network.har`
   - [ ] Database state → `.debug/BUG-{bug-id}/db_state.sql`
   - [ ] Backend logs → `.debug/BUG-{bug-id}/backend.log`

---

## Step 2: Root Cause Analysis (Tìm nguyên nhân)

### 2.1 Check layers (MANDATORY - NO SKIP)

> [!CAUTION]
> **F2.1 Mitigation**: ALL layers must be checked. Mark ✅, ❌, or N/A for each.

| Layer | Check Question | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Frontend** | Console errors present? | ⬜ | |
| **API** | Response status/payload correct? | ⬜ | |
| **Backend** | Logic error in service/handler? | ⬜ | |
| **Database** | Data integrity issue? | ⬜ | |
| **RLS** | Row-Level Security policy blocking? | ⬜ | |
| **Auth** | Permission/role issue? | ⬜ | |

**Completion Gate**: Cannot proceed until all layers have status.

### 2.2 Identify root cause (5 WHYS TECHNIQUE)

> [!IMPORTANT]
> **F2.2/F2.3 Mitigation**: Apply "5 Whys" before declaring root cause.

**5 Whys Analysis**:
| Level | Question | Answer | Evidence |
| :---: | :--- | :--- | :--- |
| Why 1 | Why did the bug occur? | | |
| Why 2 | Why did [Answer 1] happen? | | |
| Why 3 | Why did [Answer 2] happen? | | |
| Why 4 | Why did [Answer 3] happen? | | |
| Why 5 | Why did [Answer 4] happen? | | |

**Root Cause Declaration**:
```
Root Cause ID: RC-{bug-id}
Description: {detailed explanation}
Location: {file path}:{line number}
Evidence: {log line, stack trace, or test case}
```

> [!WARNING]
> **Validation**: Root cause MUST have evidence (log line, stack trace, or failing test).

### 2.3 Impact assessment (DEPENDENCY + SECURITY CHECK)

> [!CAUTION]
> **F2.4 Mitigation**: Check dependency graph for affected modules.

**Dependency Check**:
```powershell
# // turbo - For Angular projects
cd frontend && npx nx graph --affected
```

**Affected Modules**:
| Module | Relationship | Impact Level |
| :--- | :--- | :---: |
| | | |

> [!CAUTION]
> **F2.5 Mitigation**: STRIDE Security Assessment

**Security Impact (STRIDE Checklist)**:
| Threat | Question | Risk? |
| :--- | :--- | :---: |
| **S**poofing | Can this bug allow identity spoofing? | ⬜ |
| **T**ampering | Can data be modified maliciously? | ⬜ |
| **R**epudiation | Can actions be denied? | ⬜ |
| **I**nformation Disclosure | Can sensitive data leak? | ⬜ |
| **D**enial of Service | Can this crash the system? | ⬜ |
| **E**levation of Privilege | Can permissions be bypassed? | ⬜ |

**If ANY security risk is YES**: Tag as `security-critical` and involve security review.

---

## Step 3: Implement Fix (Sửa lỗi)

### 3.1 Create fix branch (ENFORCED)

> [!NOTE]
> **F3.1 Mitigation**: Git hooks enforce branch naming.

```bash
# // turbo
git checkout -b bugfix/BUG-{bug-id}-{short-description}
```

**Branch Naming Convention**: `bugfix/BUG-YYYYMMDD-SEQ-description`

### 3.2 Apply fix (ROOT CAUSE LINKED)

> [!IMPORTANT]
> **F3.2/F3.3 Mitigation**: Fix must reference Root Cause ID and pass linting.

1. **Fix Implementation**:
   - Reference: `RC-{bug-id}` from Step 2.2
   - Follow coding standards from `prompts/rules/`

2. **Code Comment Template**:
   ```python
   # BUGFIX: BUG-{bug-id}
   # Root Cause: RC-{bug-id} - {brief explanation}
   # Solution: {what this code change does}
   ```

3. **Pre-commit Lint Check**:
   ```powershell
   # // turbo - Backend
   cd backend && pylint --errors-only {changed_files}
   
   # // turbo - Frontend
   cd frontend && npx eslint --fix {changed_files}
   ```

### 3.3 Add unit test for bug (MANDATORY - NO EXCEPTIONS)

> [!CAUTION]
> **F3.4/F3.5 Mitigation**: Test MUST assert the failure condition (negative test).

**Test Requirements**:
- [ ] Test filename: `test_bugfix_{bug_id}.py` or `*.spec.ts`
- [ ] MUST include negative test (assert old behavior would fail)
- [ ] MUST include positive test (assert fix works)

**Test Template**:
```python
# tests/test_bugfix_{bug_id}.py
import pytest

class TestBugfix{BugId}:
    """
    BUGFIX: BUG-{bug-id}
    Root Cause: {RC-id}
    """
    
    @pytest.mark.asyncio
    async def test_bug_no_longer_occurs(self):
        """Positive test: Fixed behavior works correctly."""
        # Arrange: Setup scenario
        # Act: Execute the fixed code
        # Assert: Verify correct behavior
        pass
    
    @pytest.mark.asyncio
    async def test_bug_condition_handled(self):
        """Negative test: Previous failure condition is now handled."""
        # Arrange: Setup the exact scenario that caused the bug
        # Act: Execute code that previously failed
        # Assert: Verify no error / graceful handling
        pass
```

**CI Gate**: PR cannot merge without passing tests for the bug.

---

## Step 4: Test Fix (Kiểm tra)

### 4.1 Run unit tests (CI MANDATORY)

> [!NOTE]
> **F4.1 Mitigation**: Tests must pass both locally and in CI.

```powershell
# // turbo - Backend
cd backend && pytest tests/ -v --tb=short

# // turbo - Frontend  
cd frontend && ng test --watch=false --browsers=ChromeHeadless
```

**CI Status**: Must be ✅ GREEN before proceeding.

### 4.2 Manual verification (SIGNED OFF)

> [!IMPORTANT]
> **F4.2 Mitigation**: Manual verification with sign-off required.

| Verification Item | Status | Verified By | Date |
| :--- | :---: | :--- | :--- |
| Bug no longer reproduces | ⬜ | | |
| Expected behavior works | ⬜ | | |
| No new issues introduced | ⬜ | | |

**Sign-off**: `{Name} verified on {Date}`

### 4.3 Regression testing (MODULE-LEVEL)

> [!CAUTION]
> **F4.3 Mitigation**: Run smoke tests for affected module.

```powershell
# // turbo - Run module-specific tests
cd backend && pytest tests/{module}/ -v

# // turbo - Run integration tests
cd backend && pytest tests/integration/ -v -k "{module}"
```

**Regression Checklist**:
- [ ] All module tests pass
- [ ] Integration tests pass
- [ ] No new warnings introduced

### 4.4 Browser verification (MANDATORY FOR UI FIXES)

> [!IMPORTANT]
> **F4.4 Mitigation**: Browser test required for any fix touching UI layer.

**UI Fix?**: ⬜ Yes / ⬜ No (Skip if No)

If Yes:
1. Navigate to affected page
2. Execute original bug steps
3. Verify fix works in browser
4. Check console for errors
5. Check network tab for failed requests

**Browser Test Evidence**: Screenshot saved to `.debug/BUG-{bug-id}/verification.png`

---

## Step 5: Documentation & Completion

### 5.1 Update code comments

```python
# Fixed: {bug description}
# Issue: {bug-id}
# Date: {date}
```

### 5.2 Create commit message (CONVENTIONAL FORMAT)

> [!NOTE]
> **F5.1 Mitigation**: Use Conventional Commits format.

```
fix({module}): {short description} [BUG-{bug-id}]

Root Cause: RC-{bug-id} - {explanation}
Solution: {what was changed}

Closes #BUG-{bug-id}

Co-authored-by: AI Workforce <ai@catering.local>
```

### 5.3 Create PR

Follow `.agent/GIT_WORKFLOW.md` for PR template.

**PR Template Additions**:
- [ ] Bug ID linked
- [ ] Root Cause ID linked
- [ ] Test coverage confirmed
- [ ] Security review (if applicable)

### 5.4 Final checklist (AUTOMATED GATES)

> [!IMPORTANT]
> **F5.2 Mitigation**: All checklist items are CI-enforced.

| Item | Enforcement | Status |
| :--- | :--- | :---: |
| Bug is fixed | Manual verification | ⬜ |
| Unit test added | CI gate | ⬜ |
| Lint passes | Pre-commit hook | ⬜ |
| Regression tests pass | CI pipeline | ⬜ |
| Security review (if flagged) | Manual review | ⬜ |
| PR created | Git workflow | ⬜ |
| Evidence archived | `.debug/` folder | ⬜ |

---

## Bug Severity Guide

| Severity | Description | Response Time | Security Review |
| :--- | :--- | :--- | :---: |
| **Critical** | System down, data loss | Immediate | ✅ Required |
| **High** | Major feature broken | Same day | ✅ Required |
| **Medium** | Feature partially works | 2-3 days | ⬜ Optional |
| **Low** | Minor UI issue | Next sprint | ⬜ Optional |

---

## Appendix A: Tool Recommendations

| Failure Mode | Recommended Tool | Integration |
| :--- | :--- | :--- |
| F1.2 Environment mismatch | Docker DevContainer | `.devcontainer/` |
| F1.4 Evidence lost | Sentry | Error tracking |
| F2.4 Dependency analysis | Nx Graph / Madge | `npx nx graph` |
| F3.4 Test enforcement | GitHub Actions | CI pipeline |
| F4.3 Regression testing | Cypress | E2E tests |
| F5.1 Commit linting | commitlint | Git hooks |

---

## Appendix B: Metrics & Continuous Improvement

**Post-Implementation Metrics to Track**:
- Bug recurrence rate (same bug, same root cause)
- Time to reproduce
- Fix verification failures
- Regression incidents

**Review Cadence**: Monthly FMEA review to assess mitigation effectiveness.
