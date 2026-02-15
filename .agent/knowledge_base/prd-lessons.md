# PRD Lessons Learned
# Lưu trữ các bài học từ workflow reflexion-prd
# Last Updated: 2026-01-24

---

## Format
```yaml
- lesson_id: "L-XXX"
  source_prd: "PRD-XXX"
  category: "drafting|critique|validation|domain"
  issue_encountered: "Description"
  resolution: "How it was resolved"
  prevention: "How to prevent in future"
  severity: "HIGH|MEDIUM|LOW"
  date: "YYYY-MM-DD"
```

---

## Lessons Database

### Drafting Issues

- lesson_id: "L-001"
  source_prd: "PRD-QUOTE-001"
  category: "drafting"
  issue_encountered: "Vague terminology - 'Quote' vs 'Quotation' vs 'Estimate' used interchangeably"
  resolution: "Standardized to 'Quote' throughout document"
  prevention: "Add terminology validation step in prd-drafter"
  severity: "MEDIUM"
  date: "2026-01-15"

- lesson_id: "L-002"
  source_prd: "PRD-INV-001"
  category: "drafting"
  issue_encountered: "Missing edge case - what happens when inventory quantity is 0"
  resolution: "Added explicit handling for zero-quantity state"
  prevention: "Include 'Edge Case Hunting' checklist in Enhanced Mode"
  severity: "HIGH"
  date: "2026-01-20"

### Critique Issues

- lesson_id: "L-003"
  source_prd: "PRD-ORDER-001"
  category: "critique"
  issue_encountered: "Critic missed business rule - Order cannot be cancelled if payment exists"
  resolution: "Human reviewapproval, added to domain rules"
  prevention: "Add domain-expert skill for business logic validation"
  severity: "HIGH"
  date: "2026-01-18"

- lesson_id: "L-004"
  source_prd: "PRD-FIN-001"
  category: "critique"
  issue_encountered: "Security review missed rate limiting for public report endpoints"
  resolution: "Added rate limiting in iteration 2"
  prevention: "Explicit rate limiting check in security matrix"
  severity: "MEDIUM"
  date: "2026-01-24"

### Validation Issues

- lesson_id: "L-005"
  source_prd: "PRD-PRINT-001"
  category: "validation"
  issue_encountered: "PRD referenced 'jspdf' library but project uses html2canvas approach"
  resolution: "Changed to use existing window.print() pattern"
  prevention: "Add codebase-validator to check existing patterns"
  severity: "MEDIUM"
  date: "2026-01-23"

### Domain Issues

- lesson_id: "L-006"
  source_prd: "PRD-QUOTE-001"
  category: "domain"
  issue_encountered: "Quote expiry logic didn't account for Vietnam timezone"
  resolution: "Added timezone handling per core.md standards"
  prevention: "Include timezone check in domain-expert validation"
  severity: "LOW"
  date: "2026-01-15"

---

## Pattern Library

### Successful Refinement Patterns

1. **Terminology Standardization**
   - Issue: Multiple terms for same entity
   - Pattern: Create glossary section, run consistency check
   - Effectiveness: Eliminates ~80% of consistency issues

2. **Edge Case Matrix**
   - Issue: Missing edge cases
   - Pattern: For each user story, enumerate: empty, null, boundary, error, concurrent
   - Effectiveness: Catches ~90% of edge cases

3. **Security Checklist Integration**
   - Issue: Security controls missed
   - Pattern: Run OWASP-based checklist for every API endpoint
   - Effectiveness: 100% coverage for standard vulnerabilities

### User Feedback Patterns

1. **Scope Creep**
   - Frequency: 3/5 PRDs
   - Feedback: "Can we also add..."
   - Prevention: Explicit "Out of Scope" section

2. **Timeline Concerns**
   - Frequency: 2/5 PRDs
   - Feedback: "This seems aggressive"
   - Prevention: Include effort estimates with buffer

3. **Integration Clarity**
   - Frequency: 2/5 PRDs
   - Feedback: "How does this connect to X?"
   - Prevention: Add dependency diagram

---

## Metrics

| Metric | Value |
|:-------|:------|
| **Total Lessons** | 6 |
| **HIGH Severity** | 2 (33%) |
| **MEDIUM Severity** | 3 (50%) |
| **LOW Severity** | 1 (17%) |
| **Most Common Category** | drafting (33%) |

---

## How to Use This Data

1. **prd-drafter**: Query lessons where `category == "drafting"` to avoid repeat issues
2. **prd-critic**: Check `category == "critique"` for common missed issues
3. **codebase-validator**: Reference `category == "validation"` for pattern conflicts
4. **domain-expert**: Use `category == "domain"` for business logic pitfalls
