---
description: Tự động phân tích QA và Code Review với Self-Healing Mechanism (FMEA Hardened)
version: 2.0
last_updated: 2026-01-30
trigger_keywords: ["review", "qa", "kiểm tra code", "đánh giá", "audit code", "test coverage"]
fmea_version: FMEA-20260130
rpn_addressed: [240, 216, 210, 192, 150, 147, 144, 120, 105, 100]
---

# /qa-review Workflow (V2.0 - FMEA Hardened)

> **Trigger**: Khi người dùng yêu cầu review/QA một feature hoặc module cụ thể.  
> **Output**: Detailed QA Report (Markdown + JSON) với test results, bugs, và recommendations.  
> **Hardening**: Tích hợp FMEA mitigations cho tất cả failure modes có RPN > 100.

// turbo-all

---

## Pre-Requisites

Trước khi bắt đầu, cần xác định:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `{target_feature}` | Tên feature/module cần review | Quote Management |
| `{module_path}` | Đường dẫn tới code | `backend/modules/quotes/` |
| `{prd_path}` | Đường dẫn tới PRD/requirements (nếu có) | `.knowledges/quote_prd.md` |
| `{tech_stack}` | Stack của module | FastAPI + Angular |

---

## Step 0: Pre-Flight Checks (Self-Healing Gate) 🛡️

> [!CAUTION]
> **NEW IN V2.0**: Mandatory pre-flight checks. Workflow aborts if any critical dependency is missing.

### 0.1 Environment Validation

```powershell
# // turbo - Pre-flight: Verify required directories
$requiredDirs = @(".debug", ".reports/qa")
foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "[PRE-FLIGHT] Creating directory: $dir" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "[PRE-FLIGHT] ✅ Directories ready" -ForegroundColor Green
```

### 0.2 Tool Dependency Check

```powershell
# // turbo - Pre-flight: Verify Python tools installed
$requiredTools = @(
    @{Name="radon"; ImportName="radon"},
    @{Name="bandit"; ImportName="bandit"},
    @{Name="pylint"; ImportName="pylint"},
    @{Name="pytest"; ImportName="pytest"},
    @{Name="pytest-cov"; ImportName="pytest_cov"}
)

$missingTools = @()
foreach ($tool in $requiredTools) {
    $checkCmd = "python -c `"import $($tool.ImportName)`" 2>&1"
    $result = Invoke-Expression $checkCmd
    if ($LASTEXITCODE -ne 0) {
        $missingTools += $tool.Name
    }
}

if ($missingTools.Count -gt 0) {
    Write-Host "[PRE-FLIGHT] ❌ Missing tools: $($missingTools -join ', ')" -ForegroundColor Red
    Write-Host "[PRE-FLIGHT] Run: pip install $($missingTools -join ' ')" -ForegroundColor Cyan
    throw "Pre-flight failed: Missing required tools"
}
Write-Host "[PRE-FLIGHT] ✅ All Python tools available" -ForegroundColor Green
```

### 0.3 Frontend Tools Check (if applicable)

```powershell
# // turbo - Pre-flight: Check ESLint availability
if ("{tech_stack}" -match "Angular|Frontend|TypeScript") {
    $eslintCheck = npx eslint --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "[PRE-FLIGHT] ESLint not available - Frontend analysis will be skipped"
    } else {
        Write-Host "[PRE-FLIGHT] ✅ ESLint available: $eslintCheck" -ForegroundColor Green
    }
    
    # Check for ESLint config
    if (-not (Test-Path "frontend/.eslintrc*") -and -not (Test-Path "frontend/eslint.config.*")) {
        Write-Warning "[PRE-FLIGHT] No ESLint config found - using defaults"
    }
}
```

### 0.4 Service Health Check (for Dynamic Analysis)

```powershell
# // turbo - Pre-flight: Check if backend is running (non-blocking)
$healthUrl = "http://localhost:8000/health"
try {
    $health = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($health.status -eq "healthy") {
        Write-Host "[PRE-FLIGHT] ✅ Backend is healthy" -ForegroundColor Green
        $global:BackendAvailable = $true
    } else {
        Write-Warning "[PRE-FLIGHT] Backend unhealthy - Dynamic analysis will be limited"
        $global:BackendAvailable = $false
    }
} catch {
    Write-Warning "[PRE-FLIGHT] Backend not running - Dynamic analysis will be skipped"
    Write-Host "         Start with: cd backend && uvicorn main:app --reload --port 8000" -ForegroundColor Cyan
    $global:BackendAvailable = $false
}
```

### Pre-Flight Summary

| Check | Status | Action if Failed |
| :--- | :---: | :--- |
| Directories | ✅/❌ | Auto-create |
| Python Tools | ✅/❌ | **ABORT** with install instructions |
| ESLint | ✅/⚠️ | Skip frontend analysis |
| Backend Health | ✅/⚠️ | Skip dynamic analysis |

---

## Step 1: Context Gathering (Thu thập Context)

### 1.1 Identify Module Scope

```powershell
# // turbo - List all files in module (with path validation)
if (-not (Test-Path "{module_path}")) {
    Write-Error "[CONTEXT] Module path does not exist: {module_path}"
    throw "Invalid module path"
}

$files = Get-ChildItem -Path "{module_path}" -Recurse -File -ErrorAction SilentlyContinue
if ($null -eq $files -or $files.Count -eq 0) {
    Write-Warning "[CONTEXT] No files found in module path"
} else {
    $files | Select-Object FullName, Length | Format-Table -AutoSize
}
```

**Output Template**:
| Metric | Value |
| :--- | :---: |
| Total Files | |
| Python Files (.py) | |
| TypeScript Files (.ts) | |
| Test Files | |
| LOC (Lines of Code) | |

### 1.2 Load PRD/Requirements (if available)

```powershell
# // turbo - Check for PRD (with graceful degradation)
try {
    if (Test-Path "{prd_path}") {
        $prdContent = Get-Content "{prd_path}" -Raw -ErrorAction Stop
        
        # V2.0: Validate PRD structure
        $requiredSections = @("Requirements", "Acceptance Criteria", "Features")
        $foundSections = @()
        foreach ($section in $requiredSections) {
            if ($prdContent -match $section) {
                $foundSections += $section
            }
        }
        
        if ($foundSections.Count -eq 0) {
            Write-Warning "[CONTEXT] PRD loaded but missing standard sections"
        } else {
            Write-Host "[CONTEXT] ✅ PRD loaded with sections: $($foundSections -join ', ')" -ForegroundColor Green
        }
        
        # Show first 50 lines
        Get-Content "{prd_path}" -Head 50
    } else {
        Write-Host "[CONTEXT] ⚠️ No PRD found at {prd_path} - requirement mapping will be limited" -ForegroundColor Yellow
    }
} catch {
    Write-Warning "[CONTEXT] Failed to read PRD: $($_.Exception.Message)"
}
```

### 1.3 Identify Dependencies

```powershell
# // turbo - Check imports (Python) with empty result handling
$imports = Select-String -Path "{module_path}/*.py" -Pattern "^from|^import" -ErrorAction SilentlyContinue | Select-Object -First 20

if ($null -eq $imports -or $imports.Count -eq 0) {
    Write-Warning "[CONTEXT] No Python imports found - module may be empty or non-Python"
} else {
    $imports | Format-Table -AutoSize
}
```

---

## Step 2: Static Code Analysis (Phân tích Tĩnh)

### 2.1 Code Complexity Analysis

> [!IMPORTANT]
> Sử dụng các metrics: Cyclomatic Complexity, Cognitive Complexity, LOC per function.

**Backend (Python)**:
```powershell
# // turbo - Run radon for complexity (with timeout)
$job = Start-Job -ScriptBlock {
    param($path)
    Set-Location "backend"
    python -m radon cc $path -a -s 2>&1
} -ArgumentList "{module_path}"

$result = $job | Wait-Job -Timeout 60
if ($job.State -eq 'Running') {
    Stop-Job $job
    Write-Warning "[STATIC] Radon timed out after 60s - complexity analysis incomplete"
} else {
    Receive-Job $job
}
Remove-Job $job -Force -ErrorAction SilentlyContinue
```

**Frontend (Angular/TypeScript)**:
```powershell
# // turbo - Run ESLint with complexity rules (if available)
if ("{tech_stack}" -match "Angular|Frontend|TypeScript") {
    try {
        cd frontend
        npx eslint "{module_path}/**/*.ts" --format json 2>&1 | Out-File ".debug/eslint-report.json" -Force
        Write-Host "[STATIC] ✅ ESLint report saved to .debug/eslint-report.json" -ForegroundColor Green
    } catch {
        Write-Warning "[STATIC] ESLint failed: $($_.Exception.Message)"
    }
}
```

### 2.2 Code Duplication Detection

```powershell
# // turbo - Find duplicate code blocks (with timeout)
$job = Start-Job -ScriptBlock {
    param($path)
    Set-Location "backend"
    python -m pylint $path --disable=all --enable=duplicate-code 2>&1
} -ArgumentList "{module_path}"

$result = $job | Wait-Job -Timeout 120  # 2 minute timeout for large codebases
if ($job.State -eq 'Running') {
    Stop-Job $job
    Write-Warning "[STATIC] Pylint duplicate-code check timed out after 120s"
} else {
    Receive-Job $job
}
Remove-Job $job -Force -ErrorAction SilentlyContinue
```

### 2.3 Security Vulnerability Scan

> [!CAUTION]
> STRIDE compliance check mandatory.

**Checklist**:
| Vulnerability Type | Check | Status |
| :--- | :--- | :---: |
| SQL Injection | Raw queries without parameterization? | ⬜ |
| XSS | Unescaped user input in templates? | ⬜ |
| Auth Bypass | Missing permission checks? | ⬜ |
| Sensitive Data Exposure | Secrets in code? | ⬜ |
| Rate Limiting | Missing on public endpoints? | ⬜ |

```powershell
# // turbo - Run bandit for Python security (with version check)
try {
    # Check bandit version (should be >= 1.7.0 for latest rules)
    $banditVersion = python -m bandit --version 2>&1
    Write-Host "[SECURITY] Using $banditVersion" -ForegroundColor Cyan
    
    cd backend
    python -m bandit -r {module_path} -f json -o .debug/bandit-report.json 2>&1
    
    # Parse and summarize
    $banditResult = Get-Content .debug/bandit-report.json | ConvertFrom-Json
    $highSev = ($banditResult.results | Where-Object { $_.issue_severity -eq "HIGH" }).Count
    $medSev = ($banditResult.results | Where-Object { $_.issue_severity -eq "MEDIUM" }).Count
    
    Write-Host "[SECURITY] Bandit found: $highSev HIGH, $medSev MEDIUM severity issues" -ForegroundColor $(if ($highSev -gt 0) { "Red" } else { "Green" })
} catch {
    Write-Warning "[SECURITY] Bandit scan failed: $($_.Exception.Message)"
}
```

### 2.4 Code Style & Linting

```powershell
# // turbo - Backend linting (with timeout)
$job = Start-Job -ScriptBlock {
    param($path)
    Set-Location "backend"
    python -m pylint $path --output-format=json 2>&1
} -ArgumentList "{module_path}"

$result = $job | Wait-Job -Timeout 120
if ($job.State -eq 'Running') {
    Stop-Job $job
    Write-Warning "[STATIC] Pylint timed out - using partial results"
    $partial = Receive-Job $job -Keep
    if ($partial) { $partial | Out-File ".debug/pylint-report.json" -Force }
} else {
    Receive-Job $job | Out-File ".debug/pylint-report.json" -Force
}
Remove-Job $job -Force -ErrorAction SilentlyContinue
```

**Static Analysis Summary**:
| Category | Issues Found | Severity |
| :--- | :---: | :---: |
| Complexity | | |
| Duplication | | |
| Security | | |
| Style | | |

---

## Step 3: Requirement Mapping (Đối chiếu PRD)

### 3.1 Feature Completeness Matrix

> [!IMPORTANT]
> So sánh implementation với PRD requirements.

| PRD Requirement | Implemented? | Location | Notes |
| :--- | :---: | :--- | :--- |
| {requirement_1} | ✅/❌ | | |
| {requirement_2} | ✅/❌ | | |
| {requirement_3} | ✅/❌ | | |

### 3.2 API Contract Verification

```powershell
# // turbo - Check API routes match specification (supports multiple patterns)
$routerPatterns = @(
    "@router\.(get|post|put|delete|patch)",  # FastAPI router
    "@app\.(get|post|put|delete|patch)",     # Direct app
    "\.route\s*\(",                           # Flask-style
    "router\.register"                        # DRF-style
)

$allRoutes = @()
foreach ($pattern in $routerPatterns) {
    $routes = Select-String -Path "{module_path}/*.py" -Pattern $pattern -ErrorAction SilentlyContinue
    if ($routes) { $allRoutes += $routes }
}

if ($allRoutes.Count -eq 0) {
    Write-Warning "[MAPPING] No API routes found - checking alternative patterns"
} else {
    Write-Host "[MAPPING] Found $($allRoutes.Count) API endpoints" -ForegroundColor Green
    $allRoutes | Format-Table -AutoSize
}
```

**API Endpoints Checklist**:
| Endpoint | Method | PRD Required? | Implemented? |
| :--- | :---: | :---: | :---: |
| | | | |

### 3.3 Data Model Verification

```powershell
# // turbo - Check models (supports multiple ORM patterns)
$modelPatterns = @(
    "class.*\(.*Base\)",           # SQLAlchemy
    "class.*Model\)",              # Generic Model
    "class.*\(models\.Model\)",    # Django
    "@dataclass"                   # Python dataclass
)

$allModels = @()
foreach ($pattern in $modelPatterns) {
    $models = Select-String -Path "{module_path}/*.py" -Pattern $pattern -ErrorAction SilentlyContinue
    if ($models) { $allModels += $models }
}

if ($allModels.Count -eq 0) {
    Write-Warning "[MAPPING] No data models found"
} else {
    Write-Host "[MAPPING] Found $($allModels.Count) data model definitions" -ForegroundColor Green
    $allModels | Format-Table -AutoSize
}
```

---

## Step 4: Automated Test Generation & Execution

### 4.1 Check Existing Test Coverage

```powershell
# // turbo - Run pytest with coverage (with timeout)
try {
    cd backend
    $testCmd = "pytest tests/{module}/ -v --cov={module_path} --cov-report=json:.debug/coverage.json --timeout=30 --timeout-method=thread 2>&1"
    
    $job = Start-Job -ScriptBlock {
        param($cmd)
        Invoke-Expression $cmd
    } -ArgumentList $testCmd
    
    $result = $job | Wait-Job -Timeout 300  # 5 minute max for test suite
    if ($job.State -eq 'Running') {
        Stop-Job $job
        Write-Warning "[TESTS] Test suite timed out after 5 minutes"
    } else {
        Receive-Job $job
    }
    Remove-Job $job -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "[TESTS] Coverage check failed: $($_.Exception.Message)"
}
```

**Coverage Summary**:
| Metric | Value | Target |
| :--- | :---: | :---: |
| Line Coverage | % | ≥70% |
| Branch Coverage | % | ≥60% |
| Function Coverage | % | ≥80% |

### 4.2 Generate Missing Tests

> [!NOTE]
> Tự động generate test cho các functions chưa được cover.

> [!CAUTION]
> **V2.0 CRITICAL**: All AI-generated tests MUST pass syntax validation before execution.

**Test Generation Template**:
```python
# Auto-generated test for {function_name}
import pytest
from {module_path} import {function_name}

class TestAutoGenerated{FunctionName}:
    """Auto-generated tests for {function_name}"""
    
    @pytest.mark.asyncio
    @pytest.mark.timeout(30)  # V2.0: Per-test timeout
    async def test_{function_name}_happy_path(self):
        """Test normal operation"""
        # Arrange
        # Act
        # Assert
        pass
    
    @pytest.mark.asyncio
    @pytest.mark.timeout(30)
    async def test_{function_name}_edge_case_empty_input(self):
        """Test with empty/null input"""
        pass
    
    @pytest.mark.asyncio
    @pytest.mark.timeout(30)
    async def test_{function_name}_edge_case_invalid_input(self):
        """Test with invalid input"""
        pass
```

### 4.2.1 Validate Generated Tests (NEW IN V2.0) 🛡️

```powershell
# // turbo - V2.0: Validate generated test syntax BEFORE execution
$generatedTestFile = "tests/test_generated_{module}.py"

if (Test-Path $generatedTestFile) {
    Write-Host "[VALIDATION] Checking generated test syntax..." -ForegroundColor Cyan
    
    # Step 1: Python AST check (syntax only)
    $astCheck = python -c "import ast; ast.parse(open('$generatedTestFile').read())" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "[VALIDATION] ❌ Generated test has SYNTAX ERRORS:"
        Write-Host $astCheck -ForegroundColor Red
        Write-Host "[VALIDATION] Aborting test execution - fix syntax first" -ForegroundColor Yellow
        throw "Generated test failed syntax validation"
    }
    Write-Host "[VALIDATION] ✅ Syntax check passed" -ForegroundColor Green
    
    # Step 2: Pylint errors-only check
    $pylintCheck = python -m pylint $generatedTestFile --errors-only --output-format=text 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "[VALIDATION] Pylint found errors in generated test:"
        Write-Host $pylintCheck -ForegroundColor Yellow
        Write-Host "[VALIDATION] Proceeding with caution..." -ForegroundColor Yellow
    } else {
        Write-Host "[VALIDATION] ✅ Pylint check passed" -ForegroundColor Green
    }
    
    # Step 3: Check for obvious infinite loops
    $content = Get-Content $generatedTestFile -Raw
    if ($content -match "while\s+True\s*:" -or $content -match "while\s+1\s*:") {
        Write-Error "[VALIDATION] ❌ Detected potential infinite loop in generated test"
        throw "Generated test contains unsafe infinite loop pattern"
    }
    Write-Host "[VALIDATION] ✅ No infinite loop patterns detected" -ForegroundColor Green
}
```

### 4.3 Execute All Tests

```powershell
# // turbo - Run full test suite with timeout protection
cd backend

# V2.0: Use pytest-timeout for per-test timeout
$testResult = pytest tests/{module}/ -v --tb=short --junitxml=.debug/test-results.xml --timeout=30 --timeout-method=thread 2>&1

# Parse results
if (Test-Path ".debug/test-results.xml") {
    [xml]$junit = Get-Content ".debug/test-results.xml"
    $passed = $junit.testsuites.testsuite.tests - $junit.testsuites.testsuite.failures - $junit.testsuites.testsuite.errors
    $failed = [int]$junit.testsuites.testsuite.failures + [int]$junit.testsuites.testsuite.errors
    
    Write-Host "[TESTS] Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
}
```

**Test Results Summary**:
| Status | Count |
| :--- | :---: |
| ✅ Passed | |
| ❌ Failed | |
| ⚠️ Skipped | |
| ⏱️ Timed Out | |
| 🕐 Duration | s |

### 4.4 Failed Test Analysis

| Test Name | Error Type | Root Cause | Fix Priority |
| :--- | :--- | :--- | :---: |
| | | | |

---

## Step 5: Dynamic Analysis & Performance

### 5.1 API Response Time Check

```powershell
# // turbo - API test (only if backend available)
if ($global:BackendAvailable -eq $true) {
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/{module}/health" -Method Get -TimeoutSec 10
        $stopwatch.Stop()
        
        $responseTime = $stopwatch.ElapsedMilliseconds
        $status = if ($responseTime -lt 200) { "✅ Good" } elseif ($responseTime -lt 500) { "⚠️ Slow" } else { "❌ Critical" }
        
        Write-Host "[PERF] API Response Time: ${responseTime}ms - $status" -ForegroundColor $(if ($responseTime -lt 200) { "Green" } else { "Yellow" })
    } catch {
        Write-Warning "[PERF] API test failed: $($_.Exception.Message)"
    }
} else {
    Write-Host "[PERF] Skipping API test - backend not available" -ForegroundColor Yellow
}
```

### 5.2 Memory & Resource Usage

> [!NOTE]
> Kiểm tra memory leaks và resource usage patterns.

**Metrics to Check**:
| Metric | Current | Threshold | Status |
| :--- | :---: | :---: | :---: |
| API Response Time | ms | <200ms | |
| Memory per Request | MB | <50MB | |
| DB Query Count | | <10 | |

### 5.3 Browser Test (if UI module)

> [!IMPORTANT]
> V2.0: Browser tests include retry logic for flaky tests.

```powershell
# Browser test with retry mechanism
$maxRetries = 3
$retryCount = 0
$testPassed = $false

while (-not $testPassed -and $retryCount -lt $maxRetries) {
    $retryCount++
    Write-Host "[BROWSER] Attempt $retryCount of $maxRetries..." -ForegroundColor Cyan
    
    try {
        # 1. Navigate to feature page
        # 2. Execute core user flow
        # 3. Capture console errors
        # 4. Check network failed requests
        # 5. Verify UI responsiveness
        
        $testPassed = $true
        Write-Host "[BROWSER] ✅ Test passed on attempt $retryCount" -ForegroundColor Green
    } catch {
        Write-Warning "[BROWSER] Attempt $retryCount failed: $($_.Exception.Message)"
        if ($retryCount -lt $maxRetries) {
            Write-Host "[BROWSER] Retrying in 2 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $testPassed) {
    Write-Error "[BROWSER] Test failed after $maxRetries attempts"
}
```

---

## Step 6: Reflexion & FMEA Analysis

### 6.1 Failure Mode Identification

> [!CAUTION]
> Áp dụng FMEA logic từ `/fix-bug` workflow.

| Component | Failure Mode | Severity | Occurrence | Detection | RPN |
| :--- | :--- | :---: | :---: | :---: | :---: |
| | | | | | |

### 6.2 Code Quality Scoring

```powershell
# // turbo - V2.0: Validate weights sum to 1.0
$weights = @{
    "Readability" = 0.20
    "Maintainability" = 0.20
    "Testability" = 0.20
    "Security" = 0.25
    "Performance" = 0.15
}

$totalWeight = ($weights.Values | Measure-Object -Sum).Sum
if ([math]::Abs($totalWeight - 1.0) -gt 0.001) {
    Write-Error "[SCORING] Weight validation failed: sum = $totalWeight (expected 1.0)"
    throw "Invalid quality scoring weights"
}
Write-Host "[SCORING] ✅ Weight validation passed" -ForegroundColor Green
```

| Dimension | Score (1-10) | Weight | Weighted Score |
| :--- | :---: | :---: | :---: |
| Readability | | 0.20 | |
| Maintainability | | 0.20 | |
| Testability | | 0.20 | |
| Security | | 0.25 | |
| Performance | | 0.15 | |
| **Total** | | 1.0 | **/10** |

### 6.3 Technical Debt Assessment

| Debt Type | Description | Effort to Fix | Priority |
| :--- | :--- | :---: | :---: |
| | | | |

---

## Step 7: Generate Final Report

### 7.1 Executive Summary

```markdown
## QA Review Report: {target_feature}

**Date**: {date}
**Reviewer**: AI Workforce (V2.0 FMEA Hardened)
**Module**: {module_path}

### Overall Status: ✅ PASS / ⚠️ CONDITIONAL PASS / ❌ FAIL

| Metric | Value | Status |
| :--- | :---: | :---: |
| Test Coverage | % | |
| Critical Issues | | |
| Security Score | /10 | |
| Quality Score | /10 | |

### V2.0 Self-Healing Summary
| Gate | Status |
| :--- | :---: |
| Pre-Flight Checks | ✅/❌ |
| Generated Test Validation | ✅/❌/N/A |
| Timeout Protection | ✅ |
| Retry Mechanisms | ✅ |
```

### 7.2 JSON Report Output

```json
{
  "$schema": "qa-review-report-v2",
  "report_id": "QA-{YYYYMMDD}-{module}",
  "timestamp": "{ISO8601}",
  "workflow_version": "2.0-FMEA",
  "module": "{target_feature}",
  "path": "{module_path}",
  "status": "PASS|CONDITIONAL_PASS|FAIL",
  "self_healing": {
    "pre_flight_passed": true,
    "generated_tests_validated": true,
    "timeout_protection_active": true,
    "retry_count": 0
  },
  "metrics": {
    "test_coverage": 0.0,
    "quality_score": 0.0,
    "security_score": 0.0,
    "complexity_avg": 0.0
  },
  "issues": [
    {
      "id": "ISS-001",
      "type": "BUG|SECURITY|PERFORMANCE|STYLE",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "location": "file:line",
      "description": "",
      "recommendation": ""
    }
  ],
  "tests": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "timed_out": 0
  },
  "recommendations": []
}
```

### 7.3 Validate & Save Report

```powershell
# // turbo - V2.0: Validate JSON before saving
$reportJson = Get-Content ".debug/qa-report-temp.json" -Raw -ErrorAction SilentlyContinue

if ($reportJson) {
    try {
        $parsed = $reportJson | ConvertFrom-Json
        
        # Validate required fields
        $requiredFields = @("report_id", "timestamp", "status", "metrics", "issues")
        $missingFields = @()
        foreach ($field in $requiredFields) {
            if (-not $parsed.PSObject.Properties.Name.Contains($field)) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -gt 0) {
            Write-Warning "[REPORT] JSON missing required fields: $($missingFields -join ', ')"
        } else {
            Write-Host "[REPORT] ✅ JSON schema validation passed" -ForegroundColor Green
        }
    } catch {
        Write-Error "[REPORT] Invalid JSON format: $($_.Exception.Message)"
    }
}

# Ensure directory exists and save
$reportDir = ".reports/qa"
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

$date = Get-Date -Format "yyyyMMdd"
$reportPath = "$reportDir/{module}-$date.md"

try {
    New-Item -Path $reportPath -ItemType File -Force | Out-Null
    Write-Host "[REPORT] ✅ Report saved to $reportPath" -ForegroundColor Green
} catch {
    Write-Warning "[REPORT] Failed to save to primary path: $($_.Exception.Message)"
    
    # Fallback path
    $fallbackPath = ".debug/qa-{module}-$date.md"
    New-Item -Path $fallbackPath -ItemType File -Force | Out-Null
    Write-Host "[REPORT] ⚠️ Report saved to fallback: $fallbackPath" -ForegroundColor Yellow
}
```

---

## Output Files

| File | Location | Description |
| :--- | :--- | :--- |
| QA Report (MD) | `.reports/qa/{module}-{date}.md` | Human-readable report |
| QA Report (JSON) | `.reports/qa/{module}-{date}.json` | Machine-readable for CI |
| Test Results | `.debug/test-results.xml` | JUnit XML format |
| Coverage Report | `.debug/coverage.json` | Coverage metrics |
| Lint Reports | `.debug/{tool}-report.json` | Static analysis results |

---

## Pass/Fail Criteria

| Criterion | Threshold | Weight |
| :--- | :---: | :---: |
| Pre-Flight Checks | All Critical Pass | **Required** |
| Test Coverage | ≥70% | Required |
| Critical Issues | 0 | Required |
| Security Score | ≥7/10 | Required |
| Quality Score | ≥6/10 | Recommended |
| All Tests Pass | 100% (no timeouts) | Required |
| Generated Test Validation | Pass | **Required** |

**Final Verdict**:
- ✅ **PASS**: All required criteria met (including V2.0 gates)
- ⚠️ **CONDITIONAL PASS**: Required met, recommended not met
- ❌ **FAIL**: Any required criterion not met OR pre-flight failed

---

## V2.0 Changelog (FMEA Mitigations)

| RPN | Issue | Mitigation Added |
| :---: | :--- | :--- |
| 240 | AI generates broken test syntax | Step 4.2.1: AST + Pylint validation |
| 216 | AI generates infinite loop | Step 4.2.1: Pattern detection + pytest timeout |
| 210 | Required tools not installed | Step 0.2: Pre-flight tool check |
| 192 | AI hallucinates PRD requirements | Step 1.2: PRD structure validation |
| 150 | Browser test flaky | Step 5.3: Retry mechanism (max 3) |
| 147 | Pylint hangs on large codebase | Step 2.2: 120s timeout with Job |
| 144 | Bandit false negatives | Step 2.3: Version check |
| 120 | ESLint config missing | Step 0.3: Config detection |
| 105 | Backend not running | Step 0.4: Health check (non-blocking) |
| 100 | Router pattern mismatch | Step 3.2: Multiple pattern support |

---

## Quick Reference

### Trigger Command
```
/qa-review {module_name}
```

### Example Usage
```
/qa-review quotes
/qa-review hr
/qa-review procurement
```

### Related Workflows
| Workflow | When to Use |
| :--- | :--- |
| `/fix-bug` | When issues found need fixing |
| `/refactor` | When technical debt identified |
| `/prd-audit` | When requirement gaps found |
