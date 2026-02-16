---
bug_id: "BUG-{YYYYMMDD}-{SEQ}"
module: "{Module Name}"
severity: "{Critical|High|Medium|Low}"
status: "FIXED"
fixed_date: "{YYYY-MM-DD}"
root_cause_category: "{api-mismatch|timezone|auth-storage|schema-mismatch|missing-header|duplicate-code|missing-tests|other}"
keywords:
  - "{keyword1}"
  - "{keyword2}"
  - "{keyword3}"
files_changed:
  - "{path/to/file1}"
  - "{path/to/file2}"
prevention_pattern: "{Brief pattern to prevent similar bugs}"
---

# Bug Fix Report: {Bug Title}

## Bug Information

| Field | Value |
| :--- | :--- |
| **Bug ID** | {BUG-YYYYMMDD-SEQ} |
| **Module** | {Module Name} |
| **Severity** | {Critical / High / Medium / Low} |
| **Status** | ✅ FIXED |
| **Fixed Date** | {YYYY-MM-DD} |

## Description
{Clear description of the bug - what the user observed}

## Root Cause Analysis

### 5 Whys
| Level | Question | Answer |
| :---: | :--- | :--- |
| Why 1 | {Why did the bug occur?} | {Answer} |
| Why 2 | {Why did [Answer 1] happen?} | {Answer} |
| Why 3 | {Why did [Answer 2] happen?} | {Answer} |
| Why 4 | {Why did [Answer 3] happen?} | {Answer} |
| Why 5 | {Why did [Answer 4] happen?} | {Answer} |

### Root Cause Declaration
```
Root Cause ID: RC-{bug-id}
Description: {detailed explanation}
Location: {file path}:{line number}
Evidence: {log line, stack trace, or test case}
```

## Solution Applied

### Files Changed
| File | Change Type | Description |
| :--- | :---: | :--- |
| `{file1}` | MODIFIED | {What changed} |
| `{file2}` | NEW | {What was created} |

### Code Changes
```diff
- {old code}
+ {new code}
```

## Verification

### Test Results
| Test Case | Result | Evidence |
| :--- | :---: | :--- |
| {Test 1} | ✅ PASS | {Description} |
| {Test 2} | ✅ PASS | {Description} |

### Screenshot Evidence
<!-- Embed screenshots from .debug/BUG-{id}/ -->

## Prevention Measures
1. {Measure 1 to prevent recurrence}
2. {Measure 2}

## Related Bugs
<!-- List any related bugs from .debug/INDEX.md -->
- {BUG-YYYYMMDD-SEQ}: {Brief description of relation}
