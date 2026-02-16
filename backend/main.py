from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from backend.api.websocket import workflow_ws

# ISS-002 FIX: Rate Limiting
from backend.core.rate_limiting import limiter, get_rate_limit_exceeded_handler, get_rate_limit_exception
from slowapi.errors import RateLimitExceeded

# RBAC: Centralized permission enforcement
from backend.core.auth.permissions import require_permission

app = FastAPI(
    title="AI Workforce API",
    description="Orchestration API for Modular Monolith ERP",
    version="3.0.0",
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
app.include_router(notification_router.router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("notification"))])

# Notification Preferences (user-level settings, open to all authenticated users)
from backend.modules.notification.infrastructure import preferences_router as notif_pref_router
app.include_router(notif_pref_router.router, prefix="/api/v1")

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
from backend.modules.tenant.infrastructure.http_router import router as tenant_router
app.include_router(tenant_router, prefix="/api/v1",
                   dependencies=[Depends(require_permission("tenant"))])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Workforce Orchestrator"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

