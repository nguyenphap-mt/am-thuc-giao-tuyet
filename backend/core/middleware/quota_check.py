"""
Quota Middleware — Enforce tenant plan limits
Checks resource quotas before allowing creation of users, orders, etc.
"""

from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from backend.modules.tenant.domain.models import TenantModel, TenantStatus
from backend.core.auth.models import User


# Plan defaults when plan_details is empty
PLAN_DEFAULTS = {
    "basic": {
        "max_users": 5,
        "max_orders_per_month": 50,
        "storage_mb": 100,
        "modules": ["menu", "quote", "order", "inventory"],
    },
    "standard": {
        "max_users": 15,
        "max_orders_per_month": 200,
        "storage_mb": 1024,
        "modules": ["menu", "quote", "order", "inventory", "hr", "crm"],
    },
    "premium": {
        "max_users": 50,
        "max_orders_per_month": 1000,
        "storage_mb": 10240,
        "modules": ["*"],  # All modules
    },
    "enterprise": {
        "max_users": 999999,
        "max_orders_per_month": 999999,
        "storage_mb": 102400,
        "modules": ["*"],
    },
}


async def get_plan_limits(db: AsyncSession, tenant_id: UUID) -> dict:
    """Get effective plan limits for a tenant (from plan_details or defaults)"""
    result = await db.execute(
        select(TenantModel).where(TenantModel.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        return PLAN_DEFAULTS["basic"]
    
    # Merge plan_details with defaults
    defaults = PLAN_DEFAULTS.get(tenant.plan or "basic", PLAN_DEFAULTS["basic"])
    plan_details = tenant.plan_details or {}
    
    return {
        "max_users": plan_details.get("max_users", defaults["max_users"]),
        "max_orders_per_month": plan_details.get("max_orders_per_month", defaults["max_orders_per_month"]),
        "storage_mb": plan_details.get("storage_mb", defaults["storage_mb"]),
        "modules": plan_details.get("modules", defaults["modules"]),
        "plan": tenant.plan or "basic",
        "status": tenant.status or "active",
    }


async def check_tenant_active(db: AsyncSession, tenant_id: UUID) -> None:
    """Check if tenant is active, raise 403 if suspended/cancelled"""
    result = await db.execute(
        select(TenantModel.status).where(TenantModel.id == tenant_id)
    )
    status = result.scalar_one_or_none()
    
    if status == TenantStatus.SUSPENDED:
        raise HTTPException(
            status_code=403,
            detail="Tài khoản đã bị tạm ngưng. Vui lòng liên hệ quản trị viên."
        )
    if status == TenantStatus.CANCELLED:
        raise HTTPException(
            status_code=403,
            detail="Tài khoản đã bị hủy."
        )


async def check_user_quota(db: AsyncSession, tenant_id: UUID) -> None:
    """Check if tenant has reached user creation limit"""
    limits = await get_plan_limits(db, tenant_id)
    
    # Count active users
    count_result = await db.execute(
        select(sa_func.count()).select_from(User)
        .where(User.tenant_id == tenant_id, User.is_active == True)
    )
    current_users = count_result.scalar() or 0
    max_users = limits.get("max_users", 999999)
    
    if current_users >= max_users:
        raise HTTPException(
            status_code=402,
            detail=f"Đã đạt giới hạn {max_users} người dùng theo gói {limits['plan'].upper()}. "
                   f"Vui lòng nâng cấp gói dịch vụ."
        )


async def check_order_quota(db: AsyncSession, tenant_id: UUID) -> None:
    """Check if tenant has reached monthly order creation limit"""
    from datetime import datetime, date
    limits = await get_plan_limits(db, tenant_id)
    
    # Count orders this month
    today = date.today()
    first_of_month = today.replace(day=1)
    
    try:
        from backend.modules.order.domain.models import OrderModel
        count_result = await db.execute(
            select(sa_func.count()).select_from(OrderModel)
            .where(
                OrderModel.tenant_id == tenant_id,
                sa_func.date(OrderModel.created_at) >= first_of_month
            )
        )
        current_orders = count_result.scalar() or 0
    except Exception:
        # If order model not available, skip check
        return
    
    max_orders = limits.get("max_orders_per_month", 999999)
    
    if current_orders >= max_orders:
        raise HTTPException(
            status_code=402,
            detail=f"Đã đạt giới hạn {max_orders} đơn hàng/tháng theo gói {limits['plan'].upper()}. "
                   f"Vui lòng nâng cấp gói dịch vụ."
        )


async def get_usage_summary(db: AsyncSession, tenant_id: UUID) -> dict:
    """Get comprehensive usage summary for a tenant"""
    from datetime import date
    
    limits = await get_plan_limits(db, tenant_id)
    
    # Count users
    user_result = await db.execute(
        select(sa_func.count()).select_from(User)
        .where(User.tenant_id == tenant_id, User.is_active == True)
    )
    current_users = user_result.scalar() or 0
    max_users = limits.get("max_users", 999999)
    
    # Count orders this month
    today = date.today()
    first_of_month = today.replace(day=1)
    current_orders = 0
    try:
        from backend.modules.order.domain.models import OrderModel
        order_result = await db.execute(
            select(sa_func.count()).select_from(OrderModel)
            .where(
                OrderModel.tenant_id == tenant_id,
                sa_func.date(OrderModel.created_at) >= first_of_month
            )
        )
        current_orders = order_result.scalar() or 0
    except Exception:
        pass
    
    max_orders = limits.get("max_orders_per_month", 999999)
    max_storage = limits.get("storage_mb", 100)
    
    return {
        "users": {
            "current": current_users,
            "limit": max_users,
            "percentage": round((current_users / max(max_users, 1)) * 100, 1),
        },
        "orders_this_month": {
            "current": current_orders,
            "limit": max_orders,
            "percentage": round((current_orders / max(max_orders, 1)) * 100, 1),
        },
        "storage": {
            "current": 0,  # Placeholder — real storage tracking TBD
            "limit": max_storage,
            "percentage": 0,
        },
        "plan": limits["plan"],
        "status": limits["status"],
        "modules": limits.get("modules", ["*"]),
    }
