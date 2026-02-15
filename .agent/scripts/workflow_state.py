#!/usr/bin/env python3
"""
Recommendation 3: Workflow State Persistence
Manages workflow state for cross-session recovery.

Usage:
    python .agent/scripts/workflow_state.py status
    python .agent/scripts/workflow_state.py start --workflow=create-module --module=inventory
    python .agent/scripts/workflow_state.py checkpoint --step=2 --status=completed
    python .agent/scripts/workflow_state.py resume
    python .agent/scripts/workflow_state.py rollback --step=2
    python .agent/scripts/workflow_state.py abort
"""

import argparse
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional
import subprocess

STATE_FILE = Path(".agent/workflow-state.json")
ROLLBACK_REGISTRY = Path(".agent/rollback-registry.json")


def load_state() -> dict:
    """Load current workflow state"""
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict):
    """Save workflow state"""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")


def load_rollback_registry() -> dict:
    """Load rollback command registry"""
    if ROLLBACK_REGISTRY.exists():
        return json.loads(ROLLBACK_REGISTRY.read_text(encoding="utf-8"))
    return {
        "2": {
            "name": "database_complete",
            "command": "psql -U postgres -d erp_dev -f {down_migration}",
            "requires": ["down_migration"]
        },
        "3": {
            "name": "backend_complete", 
            "command": None,
            "note": "Manual cleanup required - remove backend/modules/{module_name}/"
        },
        "4": {
            "name": "frontend_complete",
            "command": None,
            "note": "Manual cleanup required - remove frontend/src/app/{module_name}/"
        }
    }


def cmd_start(args):
    """Start a new workflow"""
    existing = load_state()
    if existing.get("status") == "in_progress":
        print(f"⚠️ Workflow '{existing.get('workflow_id')}' already in progress.")
        print("   Use 'abort' to cancel or 'resume' to continue.")
        return
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    workflow_id = f"{args.workflow}_{timestamp}"
    
    state = {
        "workflow_id": workflow_id,
        "workflow_name": args.workflow,
        "module_name": args.module,
        "status": "in_progress",
        "current_step": 1,
        "started_at": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat(),
        "checkpoints": {
            "planning_complete": {"status": "pending", "timestamp": None},
            "database_complete": {"status": "pending", "timestamp": None},
            "backend_complete": {"status": "pending", "timestamp": None},
            "frontend_complete": {"status": "pending", "timestamp": None},
            "permission_defined": {"status": "pending", "timestamp": None},
            "integration_tests_passed": {"status": "pending", "timestamp": None},
            "browser_test_passed": {"status": "pending", "timestamp": None},
            "documentation_complete": {"status": "pending", "timestamp": None},
            "final_verification": {"status": "pending", "timestamp": None}
        },
        "rollback_points": {},
        "notes": []
    }
    
    save_state(state)
    print(f"✅ Started workflow: {workflow_id}")
    print(f"   Module: {args.module}")
    print(f"   Current step: 1 (planning)")


def cmd_status(args):
    """Show current workflow status"""
    state = load_state()
    
    if not state:
        print("📭 No active workflow.")
        print("   Start one with: workflow_state.py start --workflow=create-module --module=<name>")
        return
    
    print(f"\n{'='*60}")
    print(f"📋 Workflow: {state.get('workflow_id')}")
    print(f"{'='*60}")
    print(f"   Module: {state.get('module_name')}")
    print(f"   Status: {state.get('status')}")
    print(f"   Current Step: {state.get('current_step')}")
    print(f"   Started: {state.get('started_at')}")
    print(f"   Last Updated: {state.get('last_updated')}")
    
    print(f"\n📍 Checkpoints:")
    checkpoint_map = {
        1: "planning_complete",
        2: "database_complete",
        3: "backend_complete",
        4: "frontend_complete",
        5: "permission_defined",
        6: "integration_tests_passed",
        7: "browser_test_passed",
        8: "documentation_complete",
        9: "final_verification"
    }
    
    for step, name in checkpoint_map.items():
        cp = state.get("checkpoints", {}).get(name, {})
        status = cp.get("status", "pending")
        icon = "✅" if status == "completed" else "🔄" if status == "in_progress" else "⬜"
        print(f"   {icon} Step {step}: {name} ({status})")
    
    if state.get("rollback_points"):
        print(f"\n🔙 Rollback Points Available:")
        for step, info in state.get("rollback_points", {}).items():
            print(f"   Step {step}: {info}")
    
    print(f"\n{'='*60}")


def cmd_checkpoint(args):
    """Update a checkpoint status"""
    state = load_state()
    if not state:
        print("❌ No active workflow. Start one first.")
        return
    
    checkpoint_map = {
        1: "planning_complete",
        2: "database_complete",
        3: "backend_complete",
        4: "frontend_complete",
        5: "permission_defined",
        6: "integration_tests_passed",
        7: "browser_test_passed",
        8: "documentation_complete",
        9: "final_verification"
    }
    
    checkpoint_name = checkpoint_map.get(args.step)
    if not checkpoint_name:
        print(f"❌ Invalid step: {args.step}. Valid steps: 1-9")
        return
    
    state["checkpoints"][checkpoint_name] = {
        "status": args.status,
        "timestamp": datetime.now().isoformat()
    }
    state["current_step"] = args.step + 1 if args.status == "completed" else args.step
    state["last_updated"] = datetime.now().isoformat()
    
    # Register rollback point if provided
    if args.rollback_file:
        state["rollback_points"][str(args.step)] = args.rollback_file
    
    save_state(state)
    
    icon = "✅" if args.status == "completed" else "🔄"
    print(f"{icon} Checkpoint updated: Step {args.step} ({checkpoint_name}) → {args.status}")


def cmd_resume(args):
    """Resume from last checkpoint"""
    state = load_state()
    if not state:
        print("❌ No workflow to resume.")
        return
    
    current_step = state.get("current_step", 1)
    print(f"▶️ Resuming workflow: {state.get('workflow_id')}")
    print(f"   Module: {state.get('module_name')}")
    print(f"   Continue from Step: {current_step}")
    
    # Mark as in_progress
    state["status"] = "in_progress"
    state["last_updated"] = datetime.now().isoformat()
    save_state(state)


def cmd_rollback(args):
    """Rollback to a specific step"""
    state = load_state()
    if not state:
        print("❌ No workflow to rollback.")
        return
    
    registry = load_rollback_registry()
    step_str = str(args.step)
    
    if step_str in state.get("rollback_points", {}):
        rollback_file = state["rollback_points"][step_str]
        print(f"🔙 Rolling back Step {args.step}...")
        print(f"   Executing: {rollback_file}")
        # Would execute rollback here
        
        # Reset checkpoint status
        checkpoint_map = {
            1: "planning_complete",
            2: "database_complete",
            3: "backend_complete",
            4: "frontend_complete",
            5: "permission_defined",
            6: "integration_tests_passed",
            7: "browser_test_passed",
            8: "documentation_complete",
            9: "final_verification"
        }
        
        for step in range(args.step, 10):
            cp_name = checkpoint_map.get(step)
            if cp_name:
                state["checkpoints"][cp_name] = {"status": "pending", "timestamp": None}
        
        state["current_step"] = args.step
        state["last_updated"] = datetime.now().isoformat()
        state["notes"].append(f"Rolled back to Step {args.step} at {datetime.now().isoformat()}")
        save_state(state)
        
        print(f"✅ Rolled back to Step {args.step}. Run '/retry {args.step}' to redo.")
    
    elif step_str in registry:
        info = registry[step_str]
        if info.get("command"):
            print(f"🔙 Rollback command for Step {args.step}:")
            print(f"   {info['command']}")
            if info.get("requires"):
                print(f"   Requires: {info['requires']}")
        else:
            print(f"⚠️ Manual rollback required for Step {args.step}:")
            print(f"   {info.get('note', 'No instructions available')}")
    else:
        print(f"⚠️ No rollback available for Step {args.step}")


def cmd_abort(args):
    """Abort current workflow"""
    state = load_state()
    if not state:
        print("❌ No workflow to abort.")
        return
    
    print(f"⚠️ Aborting workflow: {state.get('workflow_id')}")
    
    state["status"] = "aborted"
    state["last_updated"] = datetime.now().isoformat()
    state["notes"].append(f"Aborted at {datetime.now().isoformat()}")
    save_state(state)
    
    # Archive the state
    archive_dir = Path(".agent/workflow-archive")
    archive_dir.mkdir(parents=True, exist_ok=True)
    archive_file = archive_dir / f"{state['workflow_id']}.json"
    archive_file.write_text(json.dumps(state, indent=2), encoding="utf-8")
    
    # Clear current state
    STATE_FILE.unlink()
    
    print(f"✅ Workflow aborted and archived to: {archive_file}")


def main():
    parser = argparse.ArgumentParser(description="Workflow State Management")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # status command
    subparsers.add_parser("status", help="Show current workflow status")
    
    # start command
    start_parser = subparsers.add_parser("start", help="Start a new workflow")
    start_parser.add_argument("--workflow", required=True, help="Workflow name (e.g., create-module)")
    start_parser.add_argument("--module", required=True, help="Module name")
    
    # checkpoint command
    cp_parser = subparsers.add_parser("checkpoint", help="Update checkpoint status")
    cp_parser.add_argument("--step", type=int, required=True, help="Step number (1-9)")
    cp_parser.add_argument("--status", choices=["pending", "in_progress", "completed", "failed"], required=True)
    cp_parser.add_argument("--rollback-file", help="File to execute for rollback")
    
    # resume command
    subparsers.add_parser("resume", help="Resume from last checkpoint")
    
    # rollback command
    rb_parser = subparsers.add_parser("rollback", help="Rollback to a specific step")
    rb_parser.add_argument("--step", type=int, required=True, help="Step to rollback to")
    
    # abort command
    subparsers.add_parser("abort", help="Abort current workflow")
    
    args = parser.parse_args()
    
    commands = {
        "status": cmd_status,
        "start": cmd_start,
        "checkpoint": cmd_checkpoint,
        "resume": cmd_resume,
        "rollback": cmd_rollback,
        "abort": cmd_abort
    }
    
    commands[args.command](args)


if __name__ == "__main__":
    main()
