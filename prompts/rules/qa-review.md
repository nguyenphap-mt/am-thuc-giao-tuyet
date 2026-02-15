# QA & Code Review Rules

> **Purpose**: Quy tắc bắt buộc khi thực hiện QA và Code Review.
> **Scope**: Áp dụng cho `/qa-review` workflow và `qa-code-review` skill.

---

## 1. Mandatory Checks (Bắt buộc)

### 1.1 Static Analysis Rules

| Rule | Severity | Enforcement |
| :--- | :---: | :--- |
| No CRITICAL linting errors | 🔴 Block | Fail if any |
| Cyclomatic complexity ≤15 | 🟡 Warn | Flag for review |
| No duplicate code blocks >10 lines | 🟡 Warn | Flag for refactor |
| No security vulnerabilities (bandit) | 🔴 Block | Fail if any |
| No hardcoded secrets | 🔴 Block | Fail immediately |

### 1.2 Test Coverage Rules

| Metric | Minimum | Ideal | Action if Below |
| :--- | :---: | :---: | :--- |
| Line Coverage | 70% | 85% | Block merge |
| Branch Coverage | 60% | 75% | Warn |
| Function Coverage | 80% | 95% | Block merge |

### 1.3 Security Rules (STRIDE Compliance)

> [!CAUTION]
> **BẮT BUỘC**: Mọi module phải pass STRIDE checklist.

```yaml
stride_requirements:
  spoofing:
    - All endpoints require authentication (except /health, /docs)
    - Token validation on every request
  tampering:
    - Input validation on all user inputs
    - Parameterized queries (no raw SQL)
  repudiation:
    - Audit logging for state-changing operations
  information_disclosure:
    - No sensitive data in logs
    - Proper error messages (no stack traces in production)
  denial_of_service:
    - Rate limiting on public endpoints
    - Request size limits
  elevation_of_privilege:
    - Permission checks before data access
    - RLS enabled for multi-tenant data
```

---

## 2. Quality Scoring Standards

### 2.1 Score Calculation

```python
QUALITY_DIMENSIONS = {
    "readability": {
        "weight": 0.20,
        "criteria": {
            "naming_conventions": 3,  # max points
            "code_comments": 2,
            "function_length": 2,
            "file_organization": 3
        }
    },
    "maintainability": {
        "weight": 0.20,
        "criteria": {
            "low_complexity": 4,
            "single_responsibility": 3,
            "dependency_injection": 3
        }
    },
    "testability": {
        "weight": 0.20,
        "criteria": {
            "test_coverage": 5,
            "test_quality": 3,
            "mocking_support": 2
        }
    },
    "security": {
        "weight": 0.25,
        "criteria": {
            "stride_compliance": 5,
            "no_vulnerabilities": 5
        }
    },
    "performance": {
        "weight": 0.15,
        "criteria": {
            "response_time": 4,
            "query_optimization": 3,
            "caching_strategy": 3
        }
    }
}
```

### 2.2 Score Thresholds

| Score | Grade | Status | Action |
| :---: | :---: | :---: | :--- |
| 9-10 | A | ✅ Excellent | Ready for production |
| 7-8.9 | B | ✅ Good | Minor improvements recommended |
| 6-6.9 | C | ⚠️ Acceptable | Improvements needed before release |
| 4-5.9 | D | ⚠️ Needs Work | Significant improvements required |
| <4 | F | ❌ Fail | Major rewrite recommended |

---

## 3. PRD Compliance Rules

### 3.1 Requirement Mapping

> [!IMPORTANT]
> Mọi requirement trong PRD phải được map với implementation.

| Compliance Level | Threshold | Status |
| :--- | :---: | :---: |
| Full Compliance | 100% | ✅ Pass |
| High Compliance | 90-99% | ⚠️ Conditional |
| Partial Compliance | 70-89% | ⚠️ Review Required |
| Low Compliance | <70% | ❌ Fail |

### 3.2 Gap Documentation

Mỗi PRD gap phải có:
- Gap ID
- PRD requirement reference
- Reason for gap (technical/business/deferred)
- Remediation plan
- Target completion date

---

## 4. Test Generation Rules

### 4.1 Mandatory Test Types

| Test Type | When Required | Coverage |
| :--- | :--- | :--- |
| Unit Tests | All functions | 100% public methods |
| Integration Tests | All API endpoints | Happy path + 2 error cases |
| Edge Case Tests | Data processing functions | Null, empty, boundary |
| Security Tests | Auth/permission code | All auth flows |

### 4.2 Test Naming Convention

```python
# Backend (Python/pytest)
def test_{function_name}_{scenario}():
    """Test {function_name} when {scenario_description}."""
    pass

# Frontend (TypeScript/Jest)
describe('{ComponentName}', () => {
  it('should {expected_behavior} when {scenario}', () => {
    // test
  });
});
```

### 4.3 Test Quality Criteria

- [ ] Follows AAA pattern (Arrange, Act, Assert)
- [ ] Single assertion per test (when possible)
- [ ] Descriptive test names
- [ ] No hardcoded test data
- [ ] Proper mocking of dependencies

---

## 5. Report Generation Rules

### 5.1 Required Sections

| Section | Content | Format |
| :--- | :--- | :--- |
| Executive Summary | Pass/Fail, key metrics | Markdown table |
| Static Analysis | Lint/complexity findings | Detailed list |
| Test Results | Pass/fail counts, coverage | Table + chart |
| Security Findings | STRIDE results | Prioritized list |
| Recommendations | Actionable items | Numbered, prioritized |

### 5.2 Issue Severity Mapping

| Severity | Criteria | Response Time |
| :--- | :--- | :--- |
| 🔴 CRITICAL | Security vulnerability, data loss risk | Immediate |
| 🟠 HIGH | Feature broken, performance degradation | Same day |
| 🟡 MEDIUM | Code quality issues, minor bugs | 1-3 days |
| 🟢 LOW | Style issues, suggestions | Next sprint |

### 5.3 Output Files

```
.reports/qa/{module}-{YYYYMMDD}/
├── report.md           # Human-readable report
├── report.json         # Machine-readable for CI
├── test-results.xml    # JUnit XML for CI
├── coverage/           # HTML coverage report
└── screenshots/        # Browser test evidence (if applicable)
```

---

## 6. Automation Integration

### 6.1 CI/CD Gates

| Gate | Condition | Action |
| :--- | :--- | :--- |
| Pre-commit | Lint errors | Block commit |
| PR Creation | Coverage drop >5% | Block PR |
| PR Merge | Any CRITICAL issue | Block merge |
| Deploy | Security score <7 | Block deploy |

### 6.2 Notification Rules

```yaml
notifications:
  critical_issue:
    channels: [slack, email]
    recipients: [security_team, lead_dev]
  
  test_failure:
    channels: [slack]
    recipients: [author, reviewer]
  
  coverage_drop:
    channels: [slack]
    recipients: [author]
    threshold: 5  # percentage drop
```

---

## 7. Exception Handling

### 7.1 When Exceptions Are Allowed

| Exception Type | Approval Required | Documentation |
| :--- | :--- | :--- |
| Coverage exemption | Tech Lead | Written justification |
| Security waiver | Security Team | Risk assessment |
| Complexity exemption | Architect | Refactoring plan |

### 7.2 Exception Documentation

```markdown
## QA Exception Request

**Module**: {module_name}
**Requested By**: {name}
**Date**: {date}

### Exception Type
- [ ] Coverage below threshold
- [ ] Security rule waiver
- [ ] Complexity exemption

### Justification
{Why this exception is necessary}

### Remediation Plan
{When/how this will be addressed}

### Approval
- [ ] Tech Lead: {name} on {date}
- [ ] Security (if applicable): {name} on {date}
```

---

## Quick Reference

### Trigger Keywords
`review`, `qa`, `kiểm tra code`, `đánh giá`, `audit code`

### Key Thresholds
| Metric | Minimum |
| :--- | :---: |
| Test Coverage | 70% |
| Security Score | 7/10 |
| Quality Score | 6/10 |
| Complexity | ≤15 |

### Pass/Fail Criteria
- ✅ **PASS**: All required thresholds met
- ⚠️ **CONDITIONAL**: Required met, recommended not
- ❌ **FAIL**: Any required threshold not met
