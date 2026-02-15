---
name: qa-code-review
description: Skill tự động QA và Code Review cho bất kỳ module nào. Sử dụng CO-STEP Framework với Static Analysis, Test Generation, và FMEA.
version: 1.0
triggers:
  - "review code"
  - "qa"
  - "kiểm tra code"
  - "đánh giá module"
  - "audit"
  - "test coverage"
---

# QA & Code Review Skill

> **Purpose**: Tự động hóa hoàn toàn quy trình QA và Code Review cho bất kỳ feature/module nào.
> **Framework**: CO-STEP (Context, Objective, Style, Tone, Example, Process)

---

## 🎯 When to Use This Skill

- User yêu cầu "review", "QA", "kiểm tra code", hoặc "audit" một module
- Trước khi merge PR lớn
- Sau khi hoàn thành implementation của một feature
- Định kỳ audit code quality

---

## 📋 Input Requirements

```yaml
required:
  - target_feature: string  # Tên module (e.g., "Quote Management")
  - module_path: string     # Path tới source code
  
optional:
  - prd_path: string        # Path tới PRD/requirements
  - tech_stack: string      # "FastAPI|Angular|Both"
  - coding_standards: string # "PEP8|ESLint|Clean Code"
```

---

## 🔄 CO-STEP Execution Process

### **C** - CONTEXT Gathering

1. **Scope Identification**:
   - Count files, LOC, test files
   - Map module dependencies
   - Load PRD if available

2. **Context Template**:
   ```
   Module: {target_feature}
   Path: {module_path}
   Files: {file_count} ({py_count} Python, {ts_count} TypeScript)
   LOC: {total_loc}
   Test Coverage: {existing_coverage}%
   PRD Available: Yes/No
   ```

### **O** - OBJECTIVE Definition

**Primary Objectives**:
1. Identify bugs and potential issues
2. Measure code quality metrics
3. Verify requirement compliance
4. Generate/execute tests
5. Provide actionable recommendations

**Success Criteria**:
| Metric | Target |
| :--- | :---: |
| Test Coverage | ≥70% |
| Critical Issues | 0 |
| Security Score | ≥7/10 |
| Quality Score | ≥6/10 |

### **S** - STYLE Guidelines

- **Code Analysis**: Technical, precise, data-driven
- **Report Writing**: Clear, actionable, prioritized
- **Recommendations**: Constructive, with code examples

### **T** - TONE Configuration

| Scenario | Tone |
| :--- | :--- |
| Critical Issue | Urgent, direct |
| Minor Issue | Informative, suggestive |
| Best Practice | Educational, encouraging |
| Security Concern | Serious, mandatory |

### **E** - EXAMPLE (Few-Shot Pattern)

**Input**: `/qa-review quotes`

**Process**:
1. Scanned `backend/modules/quotes/` - 12 files, 1,847 LOC
2. Found 2 CRITICAL: SQL injection risk in `router.py:45`
3. Test coverage: 45% (below 70% threshold)
4. Generated 8 unit tests, 3 failed on edge cases
5. PRD compliance: 85% (missing bulk delete feature)

**Output**:
```json
{
  "status": "FAIL",
  "critical_issues": 2,
  "test_coverage": 45,
  "quality_score": 5.8,
  "top_recommendations": [
    "Fix SQL injection in router.py:45",
    "Add tests for quote calculation edge cases",
    "Implement missing bulk delete feature"
  ]
}
```

### **P** - PROCESS Steps

#### Step 1: Static Analysis
```python
# Tools to use
STATIC_ANALYSIS_TOOLS = {
    "python": {
        "complexity": "radon cc -a -s",
        "lint": "pylint --output-format=json",
        "security": "bandit -f json",
        "duplication": "pylint --enable=duplicate-code"
    },
    "typescript": {
        "lint": "eslint --format json",
        "complexity": "eslint --rule complexity"
    }
}
```

#### Step 2: Requirement Mapping
- Load PRD from `{prd_path}` or `.knowledges/{module}_prd.md`
- Create Feature Completeness Matrix
- Identify gaps and missing implementations

#### Step 3: Test Analysis
```python
# Test coverage threshold
COVERAGE_THRESHOLDS = {
    "line": 70,
    "branch": 60,
    "function": 80
}

# Test generation rules
TEST_GENERATION_RULES = {
    "happy_path": True,       # Normal operation
    "edge_empty": True,       # Empty/null input
    "edge_invalid": True,     # Invalid input
    "edge_boundary": True,    # Boundary values
    "error_handling": True    # Exception cases
}
```

#### Step 4: Security Scan (STRIDE)
| Threat | Check Method |
| :--- | :--- |
| **S**poofing | Auth token validation |
| **T**ampering | Input sanitization |
| **R**epudiation | Audit logging |
| **I**nfo Disclosure | Sensitive data handling |
| **D**enial of Service | Rate limiting |
| **E**levation | Permission checks |

#### Step 5: Quality Scoring
```python
QUALITY_SCORING = {
    "readability": {"weight": 0.20, "factors": ["naming", "comments", "structure"]},
    "maintainability": {"weight": 0.20, "factors": ["complexity", "coupling", "cohesion"]},
    "testability": {"weight": 0.20, "factors": ["coverage", "test_quality", "mocking"]},
    "security": {"weight": 0.25, "factors": ["stride_compliance", "vuln_count"]},
    "performance": {"weight": 0.15, "factors": ["response_time", "resource_usage"]}
}
```

#### Step 6: FMEA Integration
- Apply Failure Mode analysis from `/fix-bug` workflow
- Calculate RPN (Risk Priority Number)
- Prioritize issues by risk

#### Step 7: Report Generation
- Executive Summary (Pass/Fail)
- Detailed Technical Review
- Test Results Table
- Recommendations (prioritized)

---

## 📊 Output Schema

### Markdown Report Structure
```markdown
# QA Review Report: {module}

## Executive Summary
- Status: ✅ PASS / ⚠️ CONDITIONAL / ❌ FAIL
- Coverage: XX%
- Issues: X Critical, Y High, Z Medium

## Static Analysis Results
[Detailed findings]

## Test Execution Results
| Test | Status | Duration |
| :--- | :---: | :---: |

## Recommendations
1. [Priority 1 fix]
2. [Priority 2 fix]
```

### JSON Report Schema
```json
{
  "$schema": "qa-review-report-v1",
  "report_id": "QA-YYYYMMDD-{module}",
  "timestamp": "ISO8601",
  "module": {
    "name": "string",
    "path": "string",
    "files": 0,
    "loc": 0
  },
  "status": "PASS|CONDITIONAL_PASS|FAIL",
  "metrics": {
    "test_coverage": {"line": 0, "branch": 0, "function": 0},
    "quality_score": 0.0,
    "security_score": 0.0,
    "complexity": {"avg": 0, "max": 0}
  },
  "issues": [{
    "id": "string",
    "type": "BUG|SECURITY|PERFORMANCE|STYLE",
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "location": "file:line",
    "description": "string",
    "recommendation": "string",
    "effort": "LOW|MEDIUM|HIGH"
  }],
  "tests": {
    "total": 0, "passed": 0, "failed": 0, "skipped": 0,
    "coverage": 0.0
  },
  "prd_compliance": {
    "total_requirements": 0,
    "implemented": 0,
    "missing": []
  },
  "recommendations": [{
    "priority": 1,
    "category": "string",
    "action": "string",
    "effort": "string"
  }]
}
```

---

## 🛠️ Helper Scripts

### `scripts/qa-analyze.py`
```python
#!/usr/bin/env python3
"""Quick QA analysis script for single module."""

import subprocess
import json
from pathlib import Path

def analyze_module(module_path: str) -> dict:
    """Run static analysis on module."""
    results = {}
    
    # Complexity
    complexity = subprocess.run(
        ["python", "-m", "radon", "cc", module_path, "-a", "-j"],
        capture_output=True, text=True
    )
    results["complexity"] = json.loads(complexity.stdout) if complexity.returncode == 0 else {}
    
    # Security
    bandit = subprocess.run(
        ["python", "-m", "bandit", "-r", module_path, "-f", "json"],
        capture_output=True, text=True
    )
    results["security"] = json.loads(bandit.stdout) if bandit.returncode == 0 else {}
    
    return results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(json.dumps(analyze_module(sys.argv[1]), indent=2))
```

---

## 📎 Integration with Other Skills/Workflows

| Trigger | Integrates With |
| :--- | :--- |
| Critical Issue Found | `/fix-bug` workflow |
| High Technical Debt | `/refactor` workflow |
| PRD Gap Identified | `/prd-audit` workflow |
| New Tests Generated | CI/CD Pipeline |

---

## 🔧 Configuration

### `.agent/config/qa-review.yaml`
```yaml
qa_review:
  thresholds:
    test_coverage: 70
    security_score: 7
    quality_score: 6
    max_complexity: 15
  
  tools:
    python:
      linter: pylint
      security: bandit
      coverage: pytest-cov
    typescript:
      linter: eslint
      coverage: jest
  
  reports:
    output_dir: .reports/qa/
    formats: [markdown, json]
    
  notifications:
    on_fail: true
    on_critical: true
```

---

## ✅ Skill Completion Checklist

- [ ] Context gathered and documented
- [ ] Static analysis completed
- [ ] PRD compliance checked
- [ ] Tests executed (existing + generated)
- [ ] Security scan completed
- [ ] Quality score calculated
- [ ] Report generated (MD + JSON)
- [ ] Recommendations prioritized
