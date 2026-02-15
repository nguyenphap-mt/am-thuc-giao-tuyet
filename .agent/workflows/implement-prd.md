---
description: Tự động tạo Implementation Plan từ PRD và thực thi tất cả phases liên tục (autonomous) — chỉ báo cáo khi hoàn thành
---

# WORKFLOW: Implement From PRD (Autonomous Execution)

> **Mục đích**: Đọc PRD + Roadmap YAML → Tạo plan → Tự động thực hiện TẤT CẢ phases liên tục → Auto test/review giữa các phase → Báo cáo cuối cùng.
>
> **Trigger**: `/implement-prd` hoặc khi user yêu cầu triển khai PRD
>
> **Mode**: FULLY AUTONOMOUS — Không hỏi user giữa chừng. Chỉ notify khi DONE hoặc CRITICAL FAILURE.

---

## PHASE 0: INITIALIZATION

### Step 0.1: Load PRD & Roadmap
```python
# 1. Tìm PRD file
prd_file = find_latest_prd(".agent/prds/PRD-*.md")
# Nếu user chỉ định: prd_file = user_specified_path

# 2. Tìm Roadmap YAML tương ứng
roadmap_file = find_roadmap(".agent/config/*-roadmap.yaml")

# 3. Load cả hai
PRD = read_file(prd_file)
ROADMAP = parse_yaml(roadmap_file)

# 4. Extract project metadata
PROJECT_NAME = ROADMAP.project.name
TECH_STACK = ROADMAP.project.tech_stack
PHASES = [phase for phase in ROADMAP if phase.startswith("phase_")]
```

### Step 0.2: Validate Prerequisites
```python
prerequisites = {
    "prd_exists": exists(prd_file),
    "roadmap_exists": exists(roadmap_file),
    "backend_running": check_port(8000),
    "frontend_running": check_port(3000),
    "database_accessible": check_db_connection()
}

# Nếu service chưa chạy → auto-start
if not prerequisites["backend_running"]:
    run_command("cd backend && python -m uvicorn main:app --reload --port 8000")  # // turbo
if not prerequisites["frontend_running"]:
    run_command("cd frontend && npx next dev --port 3000")  # // turbo
```

### Step 0.3: Generate Master Implementation Plan
```python
# Tạo file plan tổng hợp cho ALL phases
PLAN_FILE = ".agent/plans/implementation-{project_slug}.md"

plan_content = generate_plan({
    "prd": PRD,
    "roadmap": ROADMAP,
    "phases": PHASES,
    "include": [
        "Files to create/modify per sprint",
        "Exact commands to run",
        "Database migrations",
        "Test cases per feature",
        "Verification steps"
    ]
})

save_file(plan_content, PLAN_FILE)
```

---

## PHASE 1: AUTONOMOUS EXECUTION LOOP

> **CRITICAL**: Loop này chạy qua TẤT CẢ phases KHÔNG dừng lại.
> Chỉ dừng nếu: (1) Hoàn thành tất cả, hoặc (2) Critical failure không thể tự sửa.

### Step 1.1: Phase Iterator
```python
execution_log = []
failed_phases = []

for phase_key in PHASES:
    phase = ROADMAP[phase_key]
    
    # Skip nếu đã DONE
    if phase.status == "DONE":
        log.info(f"⏭️ Skipping {phase.name} — already DONE")
        continue
    
    # Check dependencies
    if phase.depends_on:
        for dep in phase.depends_on:
            if ROADMAP[dep].status != "DONE":
                log.error(f"❌ Dependency {dep} not DONE. Cannot proceed.")
                failed_phases.append(phase_key)
                continue
    
    # === EXECUTE PHASE ===
    result = execute_phase(phase_key, phase)
    execution_log.append(result)
    
    # === AUTO TEST/REVIEW ===
    test_result = auto_test_phase(phase_key, phase)
    
    if test_result.passed:
        # Update YAML status
        update_roadmap_status(roadmap_file, phase_key, "DONE")
        log.info(f"✅ {phase.name} — PASSED all quality gates")
    else:
        # TỰ ĐỘNG SỬA
        fix_result = auto_fix(phase_key, test_result.failures)
        
        if fix_result.success:
            update_roadmap_status(roadmap_file, phase_key, "DONE")
            log.info(f"🔧 {phase.name} — Fixed and PASSED")
        else:
            # Ghi nhận failure, tiếp tục phase khác nếu có thể
            failed_phases.append({
                "phase": phase_key,
                "failures": test_result.failures,
                "fix_attempted": True
            })
            update_roadmap_status(roadmap_file, phase_key, "BLOCKED")
            log.error(f"❌ {phase.name} — BLOCKED after auto-fix attempt")
```

### Step 1.2: Execute Phase Detail
```python
def execute_phase(phase_key, phase):
    """
    Thực hiện tất cả sprints trong một phase.
    """
    phase_result = {"phase": phase_key, "sprints": []}
    
    # Update YAML
    update_roadmap_status(roadmap_file, phase_key, "IN_PROGRESS")
    
    for sprint in phase.sprints:
        sprint_result = execute_sprint(sprint)
        phase_result["sprints"].append(sprint_result)
        
        # Update từng sprint status
        update_sprint_status(roadmap_file, sprint.id, "DONE")
    
    return phase_result

def execute_sprint(sprint):
    """
    Thực hiện tất cả tasks trong một sprint.
    Phân loại task theo type: backend / frontend / both.
    """
    for task in sprint.tasks:
        # Update task status
        update_task_status(roadmap_file, task.id, "IN_PROGRESS")
        
        if task.type == "backend":
            execute_backend_task(task)
        elif task.type == "frontend" or task.type is None:
            execute_frontend_task(task)
        
        # Verify task
        if task.acceptance:
            verify_acceptance(task)
        
        update_task_status(roadmap_file, task.id, "DONE")

def execute_backend_task(task):
    """
    Backend tasks: migrations, models, routers, services.
    """
    if task.migration:
        # 1. Tạo migration SQL
        create_migration_file(task.migration)
        # 2. Chạy migration
        # // turbo
        run_command(f"cd backend && python _run_migration.py {task.migration}")
        # 3. Tạo/update ORM models
        create_or_update_models(task)
    
    if task.api:
        # Tạo/update router endpoint
        create_or_update_router(task)
    
    # Auto-test: verify API endpoint responds correctly
    if task.api:
        # // turbo
        test_endpoint(task.api)

def execute_frontend_task(task):
    """
    Frontend/Mobile tasks: screens, components, hooks.
    """
    # 1. Tạo component/screen files
    create_component(task)
    
    # 2. Wire up navigation
    update_navigation(task)
    
    # 3. Build check
    # // turbo
    run_command("cd mobile && npx expo export --platform web 2>&1 | head -20")
```

### Step 1.3: Auto Test/Review Between Phases
```python
def auto_test_phase(phase_key, phase):
    """
    Tự động test sau mỗi phase.
    Kiểm tra quality gates từ roadmap YAML.
    """
    results = {"passed": True, "failures": []}
    
    # 1. Check quality gates
    gate_key = f"{phase_key}_gate"
    if gate_key in ROADMAP.quality_gates:
        for gate_item in ROADMAP.quality_gates[gate_key]:
            gate_passed = verify_quality_gate(gate_item)
            if not gate_passed:
                results["failures"].append(gate_item)
                results["passed"] = False
    
    # 2. Backend endpoint health check (nếu có new endpoints)
    if phase.get("new_endpoints"):
        for endpoint in phase.new_endpoints:
            # // turbo
            response = test_endpoint(endpoint)
            if response.status_code >= 400:
                results["failures"].append(f"Endpoint {endpoint} returned {response.status_code}")
                results["passed"] = False
    
    # 3. Build verification
    # // turbo
    build_result = run_command("cd mobile && npx tsc --noEmit 2>&1 | tail -5")
    if build_result.exit_code != 0:
        results["failures"].append("TypeScript build failed")
        results["passed"] = False
    
    # 4. RLS Check (nếu có new tables)
    if phase.get("migrations"):
        for migration in phase.migrations:
            rls_ok = verify_rls(migration.table)
            if not rls_ok:
                results["failures"].append(f"RLS not enabled on {migration.table}")
                results["passed"] = False
    
    return results

def auto_fix(phase_key, failures):
    """
    Tự động sửa lỗi bằng cách gọi workflow /fix-bug (Hardened v2.0).
    Ref: .agent/workflows/fix-bug.md
    
    Flow: Detect failure → Generate BUG-ID → Invoke fix-bug 5-step process → Re-verify
    Max 3 attempts per failure.
    """
    MAX_ATTEMPTS = 3
    all_fixed = True
    bug_reports = []
    
    for failure in failures:
        bug_id = f"BUG-{datetime.now().strftime('%Y%m%d')}-{generate_seq()}"
        
        for attempt in range(MAX_ATTEMPTS):
            log.info(f"🔧 Attempt {attempt + 1}/{MAX_ATTEMPTS} for: {failure}")
            
            # =============================================
            # INVOKE /fix-bug WORKFLOW (5-Step Process)
            # Ref: .agent/workflows/fix-bug.md
            # =============================================
            
            # Step 1: Bug Analysis (fix-bug Step 1)
            bug_info = {
                "bug_id": bug_id,
                "module": phase_key,
                "severity": classify_severity(failure),  # Auto-classify
                "steps_to_reproduce": f"Automated test failure during /implement-prd Phase {phase_key}",
                "expected": "Quality gate passes",
                "actual": failure,
                "environment": "Dev (automated pipeline)"
            }
            
            # Step 2: Root Cause Analysis (fix-bug Step 2)
            # — Check all layers: Frontend, API, Backend, Database, RLS, Auth
            root_cause = invoke_workflow("fix-bug", step="root_cause_analysis", {
                "bug_info": bug_info,
                "check_layers": ["frontend", "api", "backend", "database", "rls"],
                "apply_5_whys": True
            })
            
            # Step 3: Implement Fix (fix-bug Step 3)
            fix_result = invoke_workflow("fix-bug", step="implement_fix", {
                "root_cause": root_cause,
                "bug_id": bug_id,
                "code_comment": f"BUGFIX: {bug_id} — Auto-detected during /implement-prd",
                "add_unit_test": True  # Mandatory per fix-bug workflow
            })
            
            # Step 4: Test Fix (fix-bug Step 4)
            test_result = invoke_workflow("fix-bug", step="test_fix", {
                "bug_id": bug_id,
                "run_unit_tests": True,
                "run_regression": True,
                "browser_verify": fix_result.touches_ui
            })
            
            if test_result.all_passed:
                # Step 5: Documentation (fix-bug Step 5)
                invoke_workflow("fix-bug", step="document", {
                    "bug_id": bug_id,
                    "root_cause": root_cause,
                    "fix_description": fix_result.description,
                    "archive_to": f".debug/{bug_id}/"
                })
                
                # Re-verify quality gate
                retest = verify_quality_gate(failure)
                if retest:
                    log.info(f"✅ Fixed via /fix-bug: {failure} (attempt {attempt + 1})")
                    bug_reports.append({
                        "bug_id": bug_id,
                        "failure": failure,
                        "status": "FIXED",
                        "attempts": attempt + 1,
                        "root_cause": root_cause.id
                    })
                    break
            
            if attempt == MAX_ATTEMPTS - 1:
                log.error(f"❌ /fix-bug could not resolve: {failure} after {MAX_ATTEMPTS} attempts")
                bug_reports.append({
                    "bug_id": bug_id,
                    "failure": failure,
                    "status": "UNRESOLVED",
                    "attempts": MAX_ATTEMPTS,
                    "root_cause": root_cause.id if root_cause else "UNKNOWN"
                })
                all_fixed = False
    
    return {
        "success": all_fixed,
        "bug_reports": bug_reports,
        "workflow_used": "/fix-bug (Hardened v2.0)"
    }
```

---

## PHASE 2: COMPLETION & REPORTING

### Step 2.1: Generate Completion Report
```python
# Sau khi tất cả phases hoàn thành (hoặc blocked)
report = generate_completion_report({
    "project": PROJECT_NAME,
    "prd": prd_file,
    "roadmap": roadmap_file,
    "execution_log": execution_log,
    "failed_phases": failed_phases,
    "total_phases": len(PHASES),
    "completed_phases": len([p for p in execution_log if p.status == "DONE"]),
    "total_tasks": count_all_tasks(ROADMAP),
    "completed_tasks": count_completed_tasks(ROADMAP)
})
```

### Step 2.2: Save Report
// turbo
```python
REPORT_FILE = ".agent/reports/implementation-report-{project_slug}-{date}.md"
save_file(report, REPORT_FILE)

# Also save to .doc/ for user documentation
DOC_FILE = ".doc/{project_slug}-implementation-report.md"
save_file(report, DOC_FILE)
```

### Step 2.3: Notify User (ONLY AT END)
```python
# Đây là lần DUY NHẤT notify user
notify_user({
    "message": f"""
## ✅ Implementation Complete: {PROJECT_NAME}

| Metric | Value |
|:---|---:|
| Phases Completed | {completed_phases}/{total_phases} |
| Tasks Completed | {completed_tasks}/{total_tasks} |
| Failed/Blocked | {len(failed_phases)} |
| Duration | {elapsed_time} |

📄 **Report**: {REPORT_FILE}
📄 **Documentation**: {DOC_FILE}
📋 **Roadmap (updated)**: {roadmap_file}

{if failed_phases: "⚠️ Some phases were BLOCKED — see report for details."}
""",
    "paths_to_review": [REPORT_FILE, DOC_FILE, roadmap_file],
    "blocked_on_user": False
})
```

---

## REPORT TEMPLATE

```markdown
# 📋 Implementation Report: {PROJECT_NAME}

> **Generated**: {datetime}
> **PRD**: {prd_file}
> **Roadmap**: {roadmap_file}

---

## Executive Summary

| Metric | Value |
|:---|---:|
| Total Phases | {N} |
| Completed | {N} |
| Blocked | {N} |
| Total Tasks | {N} |
| Tasks Done | {N} |
| Duration | {duration} |

---

## Phase Results

### Phase 0: {name} — {status_emoji} {status}
- Tasks: {completed}/{total}
- Quality Gate: PASSED/FAILED
- Notes: {any issues}

### Phase 1: {name} — {status_emoji} {status}
...

---

## Files Created/Modified
| File | Action | Phase |
|:---|:---|:---|
| {path} | CREATED | Phase 0 |
| {path} | MODIFIED | Phase 1 |

---

## Database Migrations Applied
| Migration | Table | Status |
|:---|:---|:---|
| {file} | {table} | ✅ Applied |

---

## Quality Gate Results
| Gate | Result | Details |
|:---|:---:|:---|
| {gate_item} | ✅/❌ | {detail} |

---

## Issues & Blockers
| # | Issue | Phase | Auto-Fix | Resolution |
|:---|:---|:---|:---:|:---|
| 1 | {description} | Phase {N} | ✅/❌ | {detail} |

---

## Recommendations
1. {next_steps}
2. {follow_up_items}

---
*Report generated by AI Workforce — /implement-prd workflow*
```

---

## ERROR HANDLING

### Critical Failure Scenarios
```python
CRITICAL_FAILURES = [
    "Database connection lost",
    "Backend server crash (port 8000 unresponsive)",
    "Migration SQL syntax error (data corruption risk)",
    "Expo build fails with native module error"
]

def handle_critical_failure(error):
    """
    Chỉ dừng và notify user khi gặp CRITICAL failure.
    Non-critical failures → auto-fix hoặc skip + log.
    """
    if is_critical(error):
        # STOP and notify immediately
        notify_user({
            "message": f"🚨 CRITICAL FAILURE: {error}\nWorkflow stopped. Manual intervention required.",
            "blocked_on_user": True
        })
        save_partial_report()
        exit_workflow()
    else:
        # Log and continue
        execution_log.append({"type": "warning", "error": error})
        log.warning(f"⚠️ Non-critical issue: {error} — continuing...")
```

### Recovery Strategy
```python
# Nếu workflow bị interrupt giữa chừng, có thể resume:
# /implement-prd --resume
# AI sẽ:
# 1. Đọc roadmap YAML
# 2. Tìm phase/sprint/task đầu tiên có status != DONE
# 3. Tiếp tục từ đó
```

---

## CONFIGURATION

```yaml
# .agent/config/implement-prd-config.yaml
autonomous_mode: true
max_fix_attempts: 3
skip_on_failure: false  # true = skip blocked phase, continue next
notify_on_phase_complete: false  # true = notify user after each phase
notify_on_critical_only: true
auto_start_services: true
update_roadmap_yaml: true
generate_documentation: true
report_format: "markdown"  # markdown | html
```

---

## USAGE

```bash
# Cách sử dụng:
# 1. Đảm bảo đã có PRD và Roadmap YAML
# 2. Gọi workflow:

/implement-prd

# Hoặc chỉ định PRD cụ thể:
/implement-prd .agent/prds/PRD-mobile-platform.md

# Resume sau khi bị interrupt:
/implement-prd --resume

# Chỉ chạy 1 phase cụ thể:
/implement-prd --phase phase_1
```
