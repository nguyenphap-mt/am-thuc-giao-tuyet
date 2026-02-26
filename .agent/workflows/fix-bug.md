---
description: Quy trình sửa lỗi (bug) một cách có hệ thống - Hardened v3.3
version: 3.3
last_updated: 2026-02-21
---

# /fix-bug Workflow (Hardened v3.3)

> **Trigger**: Khi người dùng report một bug cần sửa.  
> **Output**: Bug fixed, tested, documented  
> **RPN Compliance**: All mitigations for RPN > 30 integrated
>
> **v3.2 Change**: Hybrid routing — thứ tự Knowledge Lookup vs Root Cause Analysis
> phụ thuộc vào Bug Complexity Level. Tránh lỗi confirmation bias khi lookup trước.

// turbo-all

---

## Step -1: Workflow Checklist Gate (BẮT BUỘC — TRƯỚC MỌI THỨ)

> [!CAUTION]
> **ĐÂY LÀ STEP ĐẦU TIÊN. KHÔNG ĐƯỢC SKIP. KHÔNG ĐƯỢC LÀM BẤT KỲ ĐIỀU GÌ KHÁC TRƯỚC KHI HOÀN THÀNH STEP NÀY.**
> 
> **Lesson Learned (BUG-20260220-002)**: AI đã skip Knowledge Lookup và Fix Report/Index vì không có checklist tracking. Kết quả: mất kiến thức bug, user phải nhắc lại.

### -1.1 Tạo Checklist trong task.md (MANDATORY)

**NGAY KHI nhận yêu cầu fix bug**, AI PHẢI tạo checklist sau trong `task.md`:

```markdown
## Fix Bug: {bug-description}

- [ ] **Step -1**: Tạo checklist này ✅
- [ ] **Step 1**: Triage — Thu thập & Phân loại
  - [ ] 1.1 Thu thập thông tin (Bug ID, Module, Severity, Error)
  - [ ] 1.2 Phân loại Bug Complexity Level (L1 / L2 / L3)
  - [ ] 1.3 Route theo Complexity Level
- [ ] **Step 2**: Phân tích & Tra cứu (thứ tự theo Complexity)
  - ROUTE A (L1): Lookup → RCA nhẹ → Fix
  - ROUTE B (L2): RCA cơ bản → Lookup cross-ref → Fix
  - ROUTE C (L3): RCA full → Lookup → Security Review → Fix
- [ ] **Step 3**: Sửa lỗi
  - [ ] 3.1 Apply fix (link Root Cause ID)
  - [ ] 3.2 Add unit test
- [ ] **Step 4**: Kiểm tra
  - [ ] 4.1 Build verification
  - [ ] 4.2 Manual / Browser verification
  - [ ] 4.3 Regression testing
- [ ] **Step 5**: Documentation & Completion
  - [ ] 5.1 Code comments + commit message
  - [ ] 5.2 Tạo fix-report.md → `.debug/BUG-{id}/`
  - [ ] 5.3 Cập nhật `.debug/INDEX.md`
```

### -1.2 Enforcement Rules

| Rule | Mô tả |
| :--- | :--- |
| **NO SKIP** | Mỗi step PHẢI được đánh dấu `[/]` (đang làm) hoặc `[x]` (xong) trước khi chuyển step tiếp |
| **NO EARLY NOTIFY** | KHÔNG được gọi `notify_user` để báo "done" trước khi Step 5.2 và 5.3 hoàn thành |
| **CLASSIFY FIRST** | PHẢI phân loại Complexity Level (Step 1.2) TRƯỚC khi quyết định thứ tự phân tích |
| **STEP 5.2/5.3 LAST** | Fix report và Index update là GATE cuối cùng — workflow chưa hoàn thành nếu thiếu |

### -1.3 Completion Gate

**Checklist phải tồn tại trong `task.md` TRƯỚC KHI thực hiện Step 1.**

Nếu AI bắt đầu phân tích mà chưa tạo checklist → vi phạm workflow → PHẢI dừng lại và tạo checklist trước.

---

## Step 1: Triage — Thu thập & Phân loại

### 1.1 Thu thập thông tin (MANDATORY TEMPLATE)

| Field | Value | Required |
| :--- | :--- | :---: |
| **Bug ID** | `BUG-{YYYYMMDD}-{SEQ}` | ✅ |
| **Module/Feature** | e.g., HR / Assignment Tab | ✅ |
| **Severity** | Critical / High / Medium / Low | ✅ |
| **Error Message** | Exact error text or stack trace | ✅ |
| **Affected File(s)** | File path(s) if known | ⬜ |
| **Steps to Reproduce** | Numbered list, minimum 3 steps | ✅ |
| **Expected Behavior** | Clear description | ✅ |
| **Actual Behavior** | Clear description | ✅ |
| **Environment** | OS, Browser, Backend version | ✅ |
| **Reporter** | Name/Contact | ✅ |

> [!TIP]
> **Search Keywords** (tự extract từ thông tin trên):
> - Module name: `{module}`
> - Error keywords: `{error_keyword_1}`, `{error_keyword_2}`
> - File names: `{filename}`
> - Technical terms: `{tech_term}` (ví dụ: parseISO, localStorage, RLS)

### 1.2 Phân loại Bug Complexity Level (BẮT BUỘC)

> [!IMPORTANT]
> **PHẢI phân loại Complexity Level TRƯỚC KHI quyết định thứ tự phân tích.**
> Complexity Level quyết định workflow route (A, B, hoặc C).

#### Bảng phân loại Bug Complexity

| Level | Tên | Đặc điểm nhận dạng | Ví dụ thực tế |
| :---: | :--- | :--- | :--- |
| **L1** | **Đơn giản** | Đáp ứng **TẤT CẢ** điều kiện dưới đây | |
| **L2** | **Trung bình** | Không đủ điều kiện L1, nhưng chưa đến L3 | |
| **L3** | **Phức tạp** | Đáp ứng **BẤT KỲ** điều kiện nào dưới đây | |

---

#### L1 — Bug Đơn giản

**Phải đáp ứng TẤT CẢ 4 điều kiện**:

| # | Điều kiện | Giải thích |
| :---: | :--- | :--- |
| 1 | **Error message CỤ THỂ** | Chỉ rõ loại lỗi + vị trí, ví dụ: `TypeError: Cannot read property 'split' of null at OrderSearchCombobox.tsx:66` |
| 2 | **Một file / một function** | Bug chỉ ảnh hưởng 1 file hoặc 1 function duy nhất |
| 3 | **Không liên quan data/logic nghiệp vụ** | Lỗi thuần technical (null check, wrong type, missing import), KHÔNG liên quan business logic |
| 4 | **Severity: Low hoặc Medium** | Không ảnh hưởng hệ thống rộng |

**Ví dụ thực tế L1**:

| Bug | Error Message | Tại sao là L1? |
| :--- | :--- | :--- |
| `parseISO(null)` crash | `TypeError: Cannot read property 'split' of null` | Error cụ thể, 1 file, null check thuần technical, Medium severity |
| Import thiếu module | `Module not found: '@/components/XYZ'` | Error cụ thể, 1 file, thiếu import, Low severity |
| CSS bị vỡ layout | `Element nằm sai vị trí` | 1 file CSS, không liên quan logic, Low severity |
| Typo trong text hiển thị | `"Phân côg" → "Phân công"` | 1 file, string literal, Low severity |

---

#### L2 — Bug Trung bình

**Không đủ TẤT CẢ điều kiện L1, nhưng chưa đến mức L3.**

| # | Đặc điểm nhận dạng | Giải thích |
| :---: | :--- | :--- |
| 1 | **Error message chung chung** | Ví dụ: `500 Internal Server Error`, `Network Error`, `Unexpected token` — không chỉ rõ vị trí |
| 2 | **Ảnh hưởng 2-3 files / modules** | Bug xuyên qua nhiều file trong cùng module |
| 3 | **Có liên quan logic nghiệp vụ nhẹ** | Ví dụ: sai format date, filter không đúng, sort order sai |
| 4 | **Severity: Medium hoặc High** | Feature bị ảnh hưởng nhưng hệ thống vẫn chạy |

**Ví dụ thực tế L2**:

| Bug | Error Message | Tại sao là L2? |
| :--- | :--- | :--- |
| API trả sai format | `500 Internal Server Error` trên `/orders` endpoint | Error chung, cần check cả FE + BE, Medium severity |
| Filter không hoạt động | "Lọc theo trạng thái nhưng hiển thị tất cả" | Không có error, cần trace logic FE → API → query, Medium severity |
| Orders hiển thị sai customer | "Đơn hàng A hiện tên khách B" | Liên quan data mapping, có thể 2-3 files, High severity |
| Batch assignment gửi sai data | `CORS error` khi POST `/assignments/batch` | Error không rõ root cause (CORS hay backend crash?), 2+ layers |

---

#### L3 — Bug Phức tạp

**Đáp ứng BẤT KỲ 1 điều kiện nào**:

| # | Đặc điểm nhận dạng | Giải thích |
| :---: | :--- | :--- |
| 1 | **Cross-module** | Bug ảnh hưởng ≥2 modules (ví dụ: HR + Order + Finance) |
| 2 | **Data integrity / Data loss** | Dữ liệu bị mất, bị trùng, bị sai khi save |
| 3 | **Security / Auth / RLS** | Liên quan đến phân quyền, bảo mật, multi-tenancy |
| 4 | **Race condition / Timing** | Bug chỉ xảy ra theo điều kiện thời gian, không reproduce được nhất quán |
| 5 | **Không reproduce được** | Sau 3 lần thử vẫn không tái tạo được lỗi |
| 6 | **Severity: Critical** | System down, data loss, security breach |

**Ví dụ thực tế L3**:

| Bug | Error Message | Tại sao là L3? |
| :--- | :--- | :--- |
| Login 500 error | `500 Internal Server Error` trên `/login` | Security-related, system down, Critical severity |
| Dữ liệu tenant A hiện ở tenant B | "Khách hàng lạ xuất hiện trong danh sách" | RLS violation, data integrity, Critical severity |
| Order complete nhưng stock không giảm | "Kho hàng không cập nhật sau khi hoàn thành đơn" | Cross-module (Order + Inventory), data integrity |
| Intermittent 401 errors | "Đôi khi bị đăng xuất khi đang dùng" | Race condition + Auth, không reproduce nhất quán |

---

#### Quick Classification Flowchart

```
Bug vào →
  ├── Severity = Critical? ──────────────────────── YES → L3
  ├── Security / Auth / RLS related? ────────────── YES → L3
  ├── Cross-module (≥2 modules)? ────────────────── YES → L3
  ├── Data integrity / Data loss? ───────────────── YES → L3
  ├── Không reproduce được sau 3 lần? ───────────── YES → L3
  ├── Error message CỤ THỂ + 1 file + technical? ── YES → L1
  └── Còn lại ───────────────────────────────────── L2
```

### 1.3 Route theo Complexity Level

> [!IMPORTANT]
> **Sau khi phân loại xong, đi theo đúng Route.**

| Level | Route | Thứ tự thực hiện | Lý do |
| :---: | :---: | :--- | :--- |
| **L1** | **A** | Info → **Lookup** → RCA nhẹ (verify) → Fix | Bug đơn giản, lookup giúp tiết kiệm thời gian. RCA nhẹ chỉ cần verify đúng root cause. |
| **L2** | **B** | Info → **RCA cơ bản** → Lookup (cross-ref) → Fix | Error mơ hồ, cần hiểu root cause trước mới search đúng. Lookup sau để cross-reference. |
| **L3** | **C** | Info → **RCA full** + Security Review → Lookup (cross-ref) → Fix | Bug phức tạp, PHẢI hiểu sâu trước. Lookup chỉ để kiểm tra đã từng có incident tương tự. |

---

## Step 2: Phân tích & Tra cứu (theo Route)

### ROUTE A — L1 Bug Đơn giản

> **Flow**: Lookup → RCA nhẹ → Fix

#### A.1 Knowledge Lookup (search INDEX trước)

```powershell
# // turbo - Search by module
Select-String -Path ".debug/INDEX.md" -Pattern "{module_name}" -CaseSensitive:$false

# // turbo - Search by error keyword
Select-String -Path ".debug/INDEX.md" -Pattern "{error_keyword}" -CaseSensitive:$false

# // turbo - Search by affected file
Select-String -Path ".debug/INDEX.md" -Pattern "{filename}" -CaseSensitive:$false
```

**Deep Search** (nếu INDEX không đủ):
```powershell
# // turbo
Get-ChildItem -Path ".debug/BUG-*/fix-report.md" -Recurse | Select-String -Pattern "{error_message}" -CaseSensitive:$false
```

#### A.2 RCA nhẹ — Verify root cause (BẮT BUỘC dù có tìm thấy bug cũ)

> [!WARNING]
> **Dù tìm thấy bug giống 100%, VẪN PHẢI verify root cause.**
> Lookup tạo ra giả thuyết. RCA nhẹ verify giả thuyết đó.

**Verify Checklist** (tối thiểu):

| Check | Status |
| :--- | :---: |
| Mở file bị lỗi, xác nhận error location | ⬜ |
| Đọc code context xung quanh (±20 lines) | ⬜ |
| Xác nhận root cause giống bug cũ hay khác | ⬜ |
| Nếu KHÁC → **Upgrade lên L2**, chạy Route B | ⬜ |

**Nếu root cause CONFIRMED giống bug cũ**:
- [ ] Note: `Same pattern as BUG-{old-id}`
- [ ] → Proceed to Step 3 (Fix)

**Nếu root cause KHÁC hoặc KHÔNG CHẮC**:
- [ ] **Upgrade lên L2** → Chạy Route B từ đầu

---

### ROUTE B — L2 Bug Trung bình

> **Flow**: RCA cơ bản → Lookup cross-ref → Fix

#### B.1 Reproduce lỗi

1. **Start dev environment**:
   ```powershell
   # // turbo
   .\.agent\scripts\dev-start.ps1
   ```

2. **Attempt Log**:
   | Attempt | Result | Notes |
   | :---: | :--- | :--- |
   | 1 | ⬜ Reproduced / ❌ Not reproduced | |
   | 2 | ⬜ Reproduced / ❌ Not reproduced | |
   | 3 | ⬜ Reproduced / ❌ Not reproduced | |

3. **If NOT reproduced after 3 attempts** → **Upgrade lên L3**, chạy Route C.

#### B.2 Root Cause Analysis — Check layers

| Layer | Check Question | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Frontend** | Console errors present? | ⬜ | |
| **API** | Response status/payload correct? | ⬜ | |
| **Backend** | Logic error in service/handler? | ⬜ | |
| **Database** | Data integrity issue? | ⬜ | |
| **RLS** | Row-Level Security policy blocking? | ⬜ | |
| **Auth** | Permission/role issue? | ⬜ | |

**Root Cause Declaration**:
```
Root Cause ID: RC-{bug-id}
Description: {detailed explanation}
Location: {file path}:{line number}
Evidence: {log line, stack trace, or test case}
```

#### B.3 Knowledge Lookup — Cross-reference (SAU KHI đã biết root cause)

> [!TIP]
> Lúc này đã biết root cause → search INDEX với keyword CHÍNH XÁC → kết quả đáng tin cậy.

```powershell
# // turbo - Search by root cause category
Select-String -Path ".debug/INDEX.md" -Pattern "{root_cause_category}" -CaseSensitive:$false

# // turbo - Search by technical keyword from RCA
Get-ChildItem -Path ".debug/BUG-*/*.md" -Recurse | Select-String -Pattern "{root_cause_keyword}" -CaseSensitive:$false
```

**Cross-reference Assessment**:
| Question | Answer |
| :--- | :--- |
| Found same root cause in past bugs? | ⬜ Yes / ⬜ No |
| Past fix pattern reusable? | ⬜ Yes / ⬜ Partially / ⬜ No |
| Any prevention pattern documented? | ⬜ Yes / ⬜ No |

→ Proceed to Step 3 (Fix)

---

### ROUTE C — L3 Bug Phức tạp

> **Flow**: RCA full + Security → Lookup cross-ref → Fix

#### C.1 Reproduce lỗi (ENVIRONMENT SNAPSHOT)

> [!CAUTION]
> **Must use identical environment. If cannot reproduce after 3 attempts, escalate.**

1. **Environment Verification Checklist**:
   - [ ] Database version matches reporter's environment
   - [ ] Test data loaded (use anonymized production dump if available)
   - [ ] Same browser/device type as reporter
   - [ ] Backend running with same configuration

2. **Reproduction Steps**:
   ```powershell
   # // turbo
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

#### C.2 Capture evidence (AUTO-ARCHIVE)

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

#### C.3 Root Cause Analysis — Full 5 Whys

| Layer | Check Question | Status | Evidence |
| :--- | :--- | :---: | :--- |
| **Frontend** | Console errors present? | ⬜ | |
| **API** | Response status/payload correct? | ⬜ | |
| **Backend** | Logic error in service/handler? | ⬜ | |
| **Database** | Data integrity issue? | ⬜ | |
| **RLS** | Row-Level Security policy blocking? | ⬜ | |
| **Auth** | Permission/role issue? | ⬜ | |

**Completion Gate**: Cannot proceed until ALL layers have status.

**5 Whys Analysis** (MANDATORY for L3):
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

#### C.4 Impact Assessment (L3 ONLY)

**Dependency Check**:
```powershell
# // turbo
cd frontend && npx nx graph --affected
```

**Affected Modules**:
| Module | Relationship | Impact Level |
| :--- | :--- | :---: |
| | | |

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

#### C.5 Knowledge Lookup — Cross-reference (SAU RCA full)

```powershell
# // turbo - Search past incidents with same root cause
Select-String -Path ".debug/INDEX.md" -Pattern "{root_cause_category}" -CaseSensitive:$false

# // turbo
Get-ChildItem -Path ".debug/BUG-*/*.md" -Recurse | Select-String -Pattern "{root_cause_keyword}" -CaseSensitive:$false
```

**Cross-reference Assessment** (same as Route B):
| Question | Answer |
| :--- | :--- |
| Found same root cause in past bugs? | ⬜ Yes / ⬜ No |
| Is this a recurring pattern? | ⬜ Yes (needs systemic fix) / ⬜ No |
| Past fix pattern reusable? | ⬜ Yes / ⬜ Partially / ⬜ No |

→ Proceed to Step 3 (Fix)

---

## Step 3: Implement Fix (Sửa lỗi)

### 3.1 Apply fix (ROOT CAUSE LINKED)

> [!IMPORTANT]
> **Fix must reference Root Cause ID and pass linting.**

1. **Fix Implementation**:
   - Reference: `RC-{bug-id}` from Step 2
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

### 3.2 Add unit test for bug (MANDATORY - NO EXCEPTIONS)

> [!CAUTION]
> **Test MUST assert the failure condition (negative test).**

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
        # Arrange → Act → Assert
        pass
    
    @pytest.mark.asyncio
    async def test_bug_condition_handled(self):
        """Negative test: Previous failure condition is now handled."""
        # Arrange → Act → Assert
        pass
```

---

## Step 4: Test Fix (Kiểm tra)

### 4.1 Build verification

```powershell
# // turbo - Frontend build
cd frontend && npx next build

# // turbo - Backend lint
cd backend && pylint --errors-only {changed_files}
```

**Build Status**: Must be ✅ exit code 0 before proceeding.

### 4.2 Manual / Browser verification

| Verification Item | Status | Verified By | Date |
| :--- | :---: | :--- | :--- |
| Bug no longer reproduces | ⬜ | | |
| Expected behavior works | ⬜ | | |
| No new issues introduced | ⬜ | | |

**UI Fix?**: ⬜ Yes / ⬜ No

If Yes (Browser Test):
1. Navigate to affected page
2. Execute original bug steps
3. Verify fix works in browser
4. Check console for errors
5. Check network tab for failed requests
6. Screenshot → `.debug/BUG-{bug-id}/verification.png`

**UI Not Visible Fix?**: Nếu fix liên quan đến component "biến mất" khỏi UI:
- [ ] Verify component được import trong parent file
- [ ] Verify component được render (có JSX `<ComponentName />` trong parent)
- [ ] Run orphaned check: `grep -r "ComponentName" frontend/src/ --include="*.tsx" | wc -l` (phải > 1)

### 4.3 Regression testing (L2/L3 ONLY)

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

---

## Step 5: Documentation & Completion

### 5.1 Code comments + Commit message

**Commit message (Conventional Format)**:
```
fix({module}): {short description} [BUG-{bug-id}]

Root Cause: RC-{bug-id} - {explanation}
Solution: {what was changed}
Complexity: L{1|2|3}

Closes #BUG-{bug-id}

Co-authored-by: AI Workforce <ai@catering.local>
```

### 5.2 Auto-Generate Fix Report (MANDATORY)

> [!CAUTION]
> **PHẢI tạo fix-report.md** sau khi fix xong. Đây là kiến thức cho bug tương tự trong tương lai.

1. **Create fix report** tại `.debug/BUG-{bug-id}/fix-report.md`

2. **Fill in ALL fields**, including:
   - [ ] YAML frontmatter (bug_id, module, severity, complexity_level, root_cause_category, keywords, files_changed)
   - [ ] Bug Information table
   - [ ] Root Cause Analysis
   - [ ] Solution Applied (files changed, code diffs)
   - [ ] Verification results
   - [ ] Prevention measures
   - [ ] Related Bugs (from Lookup)

3. **Assign root_cause_category** from taxonomy:
   | Category | When to Use |
   | :--- | :--- |
   | `null-safety` | Null/undefined data gây crash (parseISO(null), .split of null) |
   | `api-mismatch` | Frontend gọi sai endpoint hoặc response format |
   | `timezone` | Timezone mismatch (naive vs aware) |
   | `auth-storage` | Token/session storage issues |
   | `schema-mismatch` | DB schema khác ORM model |
   | `missing-header` | Thiếu HTTP header (X-Tenant-ID, etc.) |
   | `duplicate-code` | Code duplication gây bug |
   | `missing-tests` | Thiếu test coverage |
   | `route-redirect` | FastAPI redirect/routing issues |
   | `infra-config` | Infrastructure/env config sai |
   | `cross-module` | Bug liên quan ≥2 modules |
   | `race-condition` | Timing/concurrency issues |
   | `rls-violation` | Row-Level Security bypass |
   | `orphaned-component` | Component tạo xong nhưng KHÔNG import/render trong parent (SalaryAdvanceSection, AssignmentBatchModal pattern) |
   | `other` | Không thuộc category nào |

4. **Select 3-5 keywords** for future search

### 5.3 Update Bug Index (MANDATORY)

1. **Append new row** to `.debug/INDEX.md`:
   ```markdown
   | {BUG-ID} | {Module} | {Severity} | L{1|2|3} | `{root_cause_category}` | {keywords} | `{files}` | ✅ | {YYYY-MM-DD} |
   ```

2. **Verify**:
   ```powershell
   # // turbo
   Select-String -Path ".debug/INDEX.md" -Pattern "{BUG-ID}"
   ```

### 5.4 Completion Gate (HARD BLOCK — CANNOT SKIP)

> [!CAUTION]
> **AI KHÔNG ĐƯỢC gọi `notify_user` nếu chưa pass Completion Gate.**
> **Vi phạm = workflow FAILED, bug CHƯA ĐƯỢC ĐÓNG.**

**Pre-Notify Verification** (PHẢI chạy TẤT CẢ trước khi báo cáo user):

```powershell
# // turbo - Verify fix-report exists
Test-Path ".debug/BUG-{bug-id}/fix-report.md"
# Expected: True

# // turbo - Verify INDEX updated
Select-String -Path ".debug/INDEX.md" -Pattern "{BUG-ID}"
# Expected: Match found
```

| Gate Check | Verify | Expected | Status |
| :--- | :--- | :--- | :---: |
| Fix report exists | `Test-Path ".debug/BUG-{id}/fix-report.md"` | `True` | ⬜ |
| INDEX has entry | `Select-String ".debug/INDEX.md" -Pattern "{BUG-ID}"` | Match found | ⬜ |
| Code comment has `BUGFIX: BUG-{id}` | grep source files | Found | ⬜ |

**If ANY check FAILS**:
1. **STOP** — do NOT gọi notify_user
2. Tạo file/entry bị thiếu
3. Chạy lại Completion Gate
4. Chỉ proceed khi TẤT CẢ checks pass ✅

**When ALL checks PASS** → gọi `notify_user` với fix summary.

---

## Bug Severity Guide

| Severity | Description | Response Time | Security Review |
| :--- | :--- | :--- | :---: |
| **Critical** | System down, data loss | Immediate | ✅ Required |
| **High** | Major feature broken | Same day | ✅ Required |
| **Medium** | Feature partially works | 2-3 days | ⬜ Optional |
| **Low** | Minor UI issue | Next sprint | ⬜ Optional |

---

## Appendix A: Route Decision Summary

```
┌─────────────────────────────────────────────────────────┐
│                  BUG REPORT VÀO                         │
├─────────────────────────────────────────────────────────┤
│  Step 1.1: Thu thập thông tin                           │
│  Step 1.2: Phân loại Complexity                         │
├──────────┬──────────────────┬───────────────────────────┤
│   L1     │       L2         │          L3               │
│  ROUTE A │     ROUTE B      │        ROUTE C            │
├──────────┼──────────────────┼───────────────────────────┤
│ Lookup   │ Reproduce        │ Reproduce                 │
│   ↓      │   ↓              │   ↓                       │
│ RCA nhẹ  │ RCA cơ bản       │ Capture Evidence          │
│ (verify) │ (check layers)   │   ↓                       │
│   ↓      │   ↓              │ RCA full (5 Whys)         │
│          │ Lookup cross-ref │   ↓                       │
│          │                  │ Impact + STRIDE            │
│          │                  │   ↓                       │
│          │                  │ Lookup cross-ref           │
├──────────┴──────────────────┴───────────────────────────┤
│  Step 3: Fix → Step 4: Test → Step 5: Document          │
└─────────────────────────────────────────────────────────┘
```

## Appendix B: Complexity Upgrade Rules

> [!IMPORTANT]
> Complexity CÓ THỂ upgrade lên trong quá trình phân tích, KHÔNG THỂ downgrade.

| Trigger | Action |
| :--- | :--- |
| L1 nhưng RCA verify thất bại (root cause khác bug cũ) | **Upgrade → L2**, chạy Route B |
| L2 nhưng không reproduce được sau 3 lần | **Upgrade → L3**, chạy Route C |
| L2 nhưng phát hiện cross-module impact | **Upgrade → L3**, chạy Route C |
| L2 nhưng phát hiện security/RLS issue | **Upgrade → L3**, chạy Route C |
| Bất kỳ level nào phát hiện data loss | **Upgrade → L3**, chạy Route C |

## Appendix C: Version History

| Version | Date | Changes |
| :--- | :--- | :--- |
| v3.0 | 2026-02-20 | Initial hardened version with FMEA mitigations |
| v3.1 | 2026-02-21 | Moved Knowledge Lookup after info gathering |
| v3.2 | 2026-02-21 | Hybrid routing by Bug Complexity Level (L1/L2/L3) |
| v3.3 | 2026-02-21 | Added Step 5.4 Completion Gate — blocks notify_user until fix-report + INDEX verified |
| v3.4 | 2026-02-26 | Added `orphaned-component` root cause category + UI visibility verification step |
