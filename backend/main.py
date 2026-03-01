from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from backend.api.websocket import workflow_ws

# ISS-002 FIX: Rate Limiting
from backend.core.rate_limiting import limiter, get_rate_limit_exceeded_handler, get_rate_limit_exception
from slowapi.errors import RateLimitExceeded

# RBAC: Centralized permission enforcement
from backend.core.auth.permissions import require_permission

from contextlib import asynccontextmanager
from backend.migrations.hotfix_logo import apply_logo_column_hotfix
from backend.migrations.hotfix_seed_menu import seed_menu_data_hotfix

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run hotfix migrations
    await apply_logo_column_hotfix()
    await seed_menu_data_hotfix()
    yield
    # Shutdown logic (if any)

app = FastAPI(
    title="AI Workforce API",
    description="Orchestration API for Modular Monolith ERP",
    version="3.0.0",
    lifespan=lifespan,
    # BUGFIX: BUG-20260216-004 — Users Tab Redirect to Login
    # FastAPI's default redirect_slashes=True causes 307 redirects when URL
    # trailing slash doesn't match route definition. The browser follows the 307
    # but strips the Authorization header, causing a 401 on the redirected request.
    # This triggers the frontend API interceptor to clear auth and redirect to /login.
    redirect_slashes=False,
)

# ISS-002: Enable Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, get_rate_limit_exceeded_handler())

# CORS Configuration — reads from CORS_ORIGINS env var in production
import os
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
if _cors_origins_env == "*":
    # Wildcard mode: allow all origins WITHOUT credentials (CORS spec requirement)
    ALLOWED_ORIGINS = ["*"]
    _allow_credentials = False
elif _cors_origins_env:
    # Explicit origins: allow credentials for trusted domains
    ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    _allow_credentials = True
else:
    # Local development: allow common dev origins with credentials
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:4500",
        "http://localhost:8081",         # Expo Web (Metro bundler)
        "http://localhost:8082",         # Expo Web (fallback port)
        "https://amthucgiaotuyet.vercel.app",
    ]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(workflow_ws.router, tags=["workflow-websocket"])

from backend.core.auth import router as auth_router
from backend.modules.menu.infrastructure import http_router as menu_router
from backend.modules.quote.infrastructure import http_router as quote_router
from backend.modules.order.infrastructure import http_router as order_router
from backend.modules.calendar.infrastructure import http_router as calendar_router
from backend.modules.procurement.infrastructure import http_router as procurement_router
from backend.modules.hr.infrastructure import http_router as hr_router
from backend.modules.finance.infrastructure import http_router as finance_router
from backend.modules.crm.infrastructure import http_router as crm_router
from backend.modules.analytics.infrastructure import http_router as analytics_router
from backend.modules.mobile.infrastructure import http_router as mobile_router
from backend.modules.notification.infrastructure import http_router as notification_router
from backend.modules.inventory.infrastructure import http_router as inventory_router
from backend.modules.dashboard.infrastructure import http_router as dashboard_router

# --- Auth (Public - no permission required) ---
app.include_router(auth_router.router, prefix="/api/v1")

# --- Module Routers (RBAC enforced via require_permission) ---
app.include_router(menu_router.router, prefix="/api/v1/menu",
                   dependencies=[Depends(require_permission("menu"))])
app.include_router(quote_router.router, prefix="/api/v1/quotes",
                   dependencies=[Depends(require_permission("quote"))])
app.include_router(order_router.router, prefix="/api/v1/orders",
                   dependencies=[Depends(require_permission("order"))])

# Order Internal Notes (same module = order)
from backend.modules.order.infrastructure import notes_router
app.include_router(notes_router.router, prefix="/api/v1/orders",
                   dependencies=[Depends(require_permission("order"))])

app.include_router(calendar_router.router, prefix="/api/v1/calendar",
                   dependencies=[Depends(require_permission("calendar"))])
app.include_router(procurement_router.router, prefix="/api/v1/procurement",
                   dependencies=[Depends(require_permission("procurement"))])
app.include_router(hr_router.router, prefix="/api/v1/hr",
                   dependencies=[Depends(require_permission("hr"))])

# Employee Self-Service Leave — accessible by ALL authenticated users
# Bypasses HR module guard so Chef/Staff/Sales can manage their own leave
from backend.modules.hr.infrastructure.leave_self_service_router import router as leave_self_service_router
app.include_router(leave_self_service_router, prefix="/api/v1/hr")

# Employee Self-Service Timesheet & Payroll — accessible by ALL authenticated users
# Bypasses HR module guard so all staff can view their own attendance & salary
from backend.modules.hr.infrastructure.hr_self_service_router import router as hr_self_service_router
app.include_router(hr_self_service_router, prefix="/api/v1/hr")
app.include_router(finance_router.router, prefix="/api/v1/finance",
                   dependencies=[Depends(require_permission("finance"))])
app.include_router(crm_router.router, prefix="/api/v1/crm",
                   dependencies=[Depends(require_permission("crm"))])
app.include_router(analytics_router.router, prefix="/api/v1/analytics",
                   dependencies=[Depends(require_permission("analytics"))])
app.include_router(inventory_router.router, prefix="/api/v1/inventory",
                   dependencies=[Depends(require_permission("inventory"))])

# --- Dashboard & Notifications (Open to all authenticated users) ---
app.include_router(dashboard_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("dashboard"))])
app.include_router(mobile_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("mobile"))])

# Mobile Push Token (open to all authenticated users — self-registers)
from backend.modules.mobile.infrastructure import push_router as mobile_push_router
app.include_router(mobile_push_router.router)

app.include_router(notification_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("notification"))])

# Notification Preferences (user-level settings, open to all authenticated users)
from backend.modules.notification.infrastructure import preferences_router as notif_pref_router
app.include_router(notif_pref_router.router, prefix="/api/v1")

# BUGFIX: BUG-20260226-001 — User notification endpoints (list, count, mark-read)
# Previously embedded in HR router which restricted to admin/manager/accountant.
# Now standalone at /api/v1/notifications/* for ALL authenticated users.
from backend.modules.notification.infrastructure.user_notifications_router import router as user_notif_router
app.include_router(user_notif_router, prefix="/api/v1")

# CRM Sub-routers (inherits CRM module permission)
from backend.modules.crm.infrastructure.routers import marketing as crm_marketing_router
app.include_router(crm_marketing_router.router, prefix="/api/v1/crm/marketing",
                   dependencies=[Depends(require_permission("crm"))])

# Loyalty Router (Phase 13 - CRM sub-module)
from backend.modules.crm.infrastructure import loyalty_router
app.include_router(loyalty_router.router,
                   dependencies=[Depends(require_permission("crm"))])

# User Management (already has endpoint-level RBAC, adding module-level too)
from backend.modules.user.infrastructure import http_router as user_router
app.include_router(user_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("user"))])

# Role Management (User Module sub-router)
from backend.modules.user.infrastructure import role_router
app.include_router(role_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("user"))])

# Invoice Module — ARCHIVED (Phương Án B: integrated into Order module)
# Order already has vat_rate, vat_amount, paid_amount, balance_amount fields
# from backend.modules.invoice.router import router as invoice_router
# app.include_router(invoice_router, prefix="/api/v1",
#                    dependencies=[Depends(require_permission("invoice"))])

# Settings Module (Sprint 18-19)
from backend.modules.settings.router import router as settings_router
app.include_router(settings_router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("settings"))])

# Tenant Management Module
# BUGFIX: BUG-20260226-002 — No blanket require_permission("tenant") on router level.
# Admin-only endpoints (/{tenant_id}, etc.) already have per-endpoint
# dependencies=[Depends(require_permission("tenant", "view"))].
# Self-service endpoints (/me, /me/settings, /me/usage) must be accessible
# by ALL authenticated users (chef, staff, etc.), not just super_admin.
from backend.modules.tenant.infrastructure.http_router import router as tenant_router
from backend.modules.tenant.infrastructure.http_router import public_router as tenant_public_router
app.include_router(tenant_router, prefix="/api/v1")

# BUGFIX: BUG-20260218-003 — Tenant public endpoints (logo serving)
# <img> tags cannot send JWT Authorization headers, so logo serving
# must be on a separate router WITHOUT auth dependencies.
app.include_router(tenant_public_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Workforce Orchestrator"}

# TEMPORARY: Diagnostic endpoint to debug login 500 on Render
# TODO: Remove after fixing login issue
@app.get("/debug/db")
async def debug_db():
    from backend.core.database import AsyncSessionLocal
    from sqlalchemy import text
    results = {}
    try:
        async with AsyncSessionLocal() as session:
            # 1. Check DB connection
            r = await session.execute(text("SELECT 1"))
            results["db_connection"] = "OK"
            
            # 2. Check search_path
            r = await session.execute(text("SHOW search_path"))
            results["search_path"] = r.scalar()
            
            # 3. Check if users table exists
            r = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users'"
            ))
            results["users_table_exists"] = r.scalar() > 0
            
            # 4. Check user count
            r = await session.execute(text("SELECT COUNT(*) FROM public.users"))
            results["user_count"] = r.scalar()
            
            # 5. Check specific user
            r = await session.execute(text(
                "SELECT id, email, tenant_id, role, is_active FROM public.users WHERE email='nguyenphap.mt@gmail.com'"
            ))
            row = r.fetchone()
            if row:
                results["user_found"] = True
                results["user_id"] = str(row[0])
                results["tenant_id"] = str(row[2])
                results["role"] = row[3]
                results["is_active"] = row[4]
            else:
                results["user_found"] = False
            
            # 6. Check tenants table
            r = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants'"
            ))
            results["tenants_table_exists"] = r.scalar() > 0
            
            # 7. Check user_sessions table
            r = await session.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='user_sessions'"
            ))
            results["user_sessions_table_exists"] = r.scalar() > 0
            
            # 8. Check bypass_rls setting
            try:
                await session.execute(text("SET app.bypass_rls = 'on'"))
                results["bypass_rls"] = "OK"
            except Exception as e:
                results["bypass_rls"] = f"FAIL: {str(e)}"
            
            # 9. Try login simulation
            try:
                r = await session.execute(text(
                    "SELECT id, hashed_password FROM public.users WHERE email='nguyenphap.mt@gmail.com'"
                ))
                row = r.fetchone()
                if row:
                    results["hashed_password_length"] = len(str(row[1])) if row[1] else 0
                    results["login_query"] = "OK"
                else:
                    results["login_query"] = "user not found"
            except Exception as e:
                results["login_query"] = f"FAIL: {str(e)}"

    except Exception as e:
        results["error"] = str(e)
        import traceback
        results["traceback"] = traceback.format_exc()
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

