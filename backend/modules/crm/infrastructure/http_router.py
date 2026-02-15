from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from typing import List, Optional
from uuid import UUID

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, CurrentTenant
from backend.modules.crm.domain.models import CustomerModel, InteractionLogModel
from backend.modules.crm.domain.entities import Customer, CustomerCreate, CustomerUpdate, InteractionLog, InteractionLogBase

router = APIRouter(tags=["CRM"])


@router.get("/customers", response_model=List[Customer])
async def list_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    sort_by: Optional[str] = 'created_at',
    sort_dir: Optional[str] = 'desc',
    customer_type: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    query = select(CustomerModel).where(CustomerModel.tenant_id == tenant_id)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                CustomerModel.full_name.ilike(search_term),
                CustomerModel.phone.ilike(search_term),
                CustomerModel.email.ilike(search_term)
            )
        )
    
    if customer_type:
        query = query.where(CustomerModel.customer_type == customer_type)

    # Sorting
    if sort_dir == 'asc':
        query = query.order_by(getattr(CustomerModel, sort_by))
    else:
        query = query.order_by(desc(getattr(CustomerModel, sort_by)))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/customers/{id}", response_model=Customer)
async def get_customer(id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomerModel).where(CustomerModel.id == id, CustomerModel.tenant_id == tenant_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    # Check if phone already exists
    if customer.phone:
        existing = await db.execute(select(CustomerModel).where(
            CustomerModel.phone == customer.phone, 
            CustomerModel.tenant_id == tenant_id
        ))
        if existing.scalars().first():
             raise HTTPException(status_code=400, detail="Phone number already exists")

    new_customer = CustomerModel(
        **customer.model_dump(),
        tenant_id=tenant_id
    )
    db.add(new_customer)
    await db.commit()
    await db.refresh(new_customer)
    return new_customer

@router.put("/customers/{id}", response_model=Customer)
async def update_customer(id: UUID, update_data: CustomerUpdate, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomerModel).where(CustomerModel.id == id, CustomerModel.tenant_id == tenant_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    
    await db.commit()
    await db.refresh(customer)
    return customer

@router.delete("/customers/{id}")
async def delete_customer(id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomerModel).where(CustomerModel.id == id, CustomerModel.tenant_id == tenant_id))
    customer = result.scalars().first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    await db.delete(customer)
    await db.commit()
    return {"message": "Customer deleted successfully"}

@router.get("/stats")
async def get_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    
    # Total Customers
    total_query = select(func.count(CustomerModel.id)).where(CustomerModel.tenant_id == tenant_id)
    total = (await db.execute(total_query)).scalar() or 0
    
    # VIP Customers
    vip_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == tenant_id,
        CustomerModel.customer_type == 'VIP'
    )
    vip = (await db.execute(vip_query)).scalar() or 0

    # Loyal customers (type LOYAL or REGULAR with >3 orders)
    loyal_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == tenant_id,
        CustomerModel.customer_type.in_(['LOYAL', 'VIP'])
    )
    loyal = (await db.execute(loyal_query)).scalar() or 0

    # New this month (customers created in current month)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == tenant_id,
        CustomerModel.created_at >= month_start
    )
    new_this_month = (await db.execute(new_query)).scalar() or 0

    # Churn Risk
    churn_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == tenant_id,
        CustomerModel.customer_type.in_(['CHURN_RISK', 'LOST'])
    )
    churn_risk = (await db.execute(churn_query)).scalar() or 0
    
    return {
        "total_customers": total,
        "vip_customers": vip,
        "loyal_customers": loyal,
        "new_this_month": new_this_month,
        "churn_risk": churn_risk
    }


@router.get("/customers/{id}/live-stats")
async def get_customer_live_stats(id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """
    Get live aggregated stats for a customer (Total Orders, Spent, Quotes)
    Queries the tables directly for real-time data.
    """
    from backend.modules.order.domain.models import OrderModel
    from backend.modules.quote.domain.models import QuoteModel
    from sqlalchemy import Integer

    # 1. Order Stats (Confirmed/Completed)
    order_query = select(
        func.count(OrderModel.id).label('count'),
        func.sum(OrderModel.final_amount).label('total'),
        func.max(OrderModel.created_at).label('last_order')
    ).where(
        OrderModel.customer_id == id,
        OrderModel.tenant_id == tenant_id,
        OrderModel.status.in_(['COMPLETED', 'CONFIRMED'])
    )
    
    order_result = (await db.execute(order_query)).one()
    
    # 2. Quote Stats
    quote_query = select(
        func.count(QuoteModel.id).label('total_quotes'),
        func.sum(func.cast(QuoteModel.status == 'REJECTED', Integer)).label('rejected_quotes')
    ).where(
        QuoteModel.customer_id == id,
        QuoteModel.tenant_id == tenant_id
    )
    
    quote_result = (await db.execute(quote_query)).one()
    
    return {
        "total_orders": order_result.count or 0,
        "total_spent": order_result.total or 0,
        "last_order_at": order_result.last_order,
        "total_quotes": quote_result.total_quotes or 0,
        "rejected_quotes": quote_result.rejected_quotes or 0
    }


# ============ INTERACTION LOGGING ============

@router.get("/customers/{customer_id}/interactions", response_model=List[InteractionLog])
async def get_customer_interactions(
    customer_id: UUID,
    skip: int = 0,
    limit: int = 50,
    type_filter: Optional[str] = Query(None, description="Filter by type: CALL, EMAIL, MEETING, NOTE, QUOTE_SENT, ORDER_PLACED"),
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get interaction history for a customer.
    Returns chronological list of all interactions (calls, emails, quotes, orders, etc.)
    """
    # Verify customer exists
    customer_result = await db.execute(
        select(CustomerModel).where(
            CustomerModel.id == customer_id,
            CustomerModel.tenant_id == tenant_id
        )
    )
    if not customer_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Build query
    query = select(InteractionLogModel).where(
        InteractionLogModel.customer_id == customer_id,
        InteractionLogModel.tenant_id == tenant_id
    )
    
    if type_filter:
        query = query.where(InteractionLogModel.type == type_filter)
    
    query = query.order_by(desc(InteractionLogModel.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/customers/{customer_id}/interactions", response_model=InteractionLog)
async def create_interaction(
    customer_id: UUID,
    interaction: InteractionLogBase,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new interaction log for a customer.
    Types: CALL, EMAIL, MEETING, NOTE, ZALO, FACEBOOK, QUOTE_SENT, ORDER_PLACED
    """
    # Verify customer exists
    customer_result = await db.execute(
        select(CustomerModel).where(
            CustomerModel.id == customer_id,
            CustomerModel.tenant_id == tenant_id
        )
    )
    if not customer_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Validate type
    valid_types = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'ZALO', 'FACEBOOK', 'QUOTE_SENT', 'ORDER_PLACED', 'QUOTE_CREATED', 'ORDER_CONFIRMED']
    if interaction.type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid interaction type. Must be one of: {', '.join(valid_types)}"
        )
    
    new_interaction = InteractionLogModel(
        tenant_id=tenant_id,
        customer_id=customer_id,
        type=interaction.type,
        content=interaction.content,
        sentiment=interaction.sentiment or "NEUTRAL"
    )
    
    db.add(new_interaction)
    await db.commit()
    await db.refresh(new_interaction)
    return new_interaction


@router.get("/customers/{customer_id}/interactions/stats")
async def get_interaction_stats(
    customer_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get interaction statistics for a customer.
    Shows count by type and last interaction date.
    """
    # Verify customer exists
    customer_result = await db.execute(
        select(CustomerModel).where(
            CustomerModel.id == customer_id,
            CustomerModel.tenant_id == tenant_id
        )
    )
    if not customer_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Count by type
    type_counts_query = select(
        InteractionLogModel.type,
        func.count(InteractionLogModel.id).label('count')
    ).where(
        InteractionLogModel.customer_id == customer_id,
        InteractionLogModel.tenant_id == tenant_id
    ).group_by(InteractionLogModel.type)
    
    type_counts_result = await db.execute(type_counts_query)
    type_counts = {row[0]: row[1] for row in type_counts_result.all()}
    
    # Last interaction
    last_interaction_query = select(InteractionLogModel).where(
        InteractionLogModel.customer_id == customer_id,
        InteractionLogModel.tenant_id == tenant_id
    ).order_by(desc(InteractionLogModel.created_at)).limit(1)
    
    last_result = await db.execute(last_interaction_query)
    last_interaction = last_result.scalar_one_or_none()
    
    # Total count
    total_count = sum(type_counts.values())
    
    return {
        "total_interactions": total_count,
        "by_type": type_counts,
        "last_interaction": {
            "type": last_interaction.type if last_interaction else None,
            "content": last_interaction.content if last_interaction else None,
            "date": last_interaction.created_at if last_interaction else None
        }
    }


# ============ BIRTHDAY ALERTS ============

@router.get("/upcoming-birthdays")
async def get_upcoming_birthdays(
    days: int = 30,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get customers with upcoming birthdays within the next N days.
    Uses month-day comparison to find birthdays regardless of year.
    """
    from datetime import datetime, timezone, timedelta
    
    today = datetime.now(timezone.utc).date()
    
    # Query customers with non-null birthdays
    query = select(CustomerModel).where(
        CustomerModel.tenant_id == tenant_id,
        CustomerModel.birthday.isnot(None)
    )
    
    result = await db.execute(query)
    all_with_birthdays = result.scalars().all()
    
    # Filter in Python for cross-year birthday matching
    upcoming = []
    for c in all_with_birthdays:
        if c.birthday:
            try:
                this_year_bday = c.birthday.replace(year=today.year)
            except ValueError:
                this_year_bday = c.birthday.replace(year=today.year, day=28)
            
            if this_year_bday < today:
                try:
                    this_year_bday = c.birthday.replace(year=today.year + 1)
                except ValueError:
                    this_year_bday = c.birthday.replace(year=today.year + 1, day=28)
            
            days_until = (this_year_bday - today).days
            if 0 <= days_until <= days:
                upcoming.append({
                    "id": str(c.id),
                    "full_name": c.full_name,
                    "phone": c.phone,
                    "birthday": c.birthday.isoformat(),
                    "days_until": days_until,
                    "customer_type": c.customer_type,
                })
    
    upcoming.sort(key=lambda x: x["days_until"])
    return upcoming


# ============ GROWTH STATS ============

@router.get("/growth-stats")
async def get_growth_stats(
    months: int = 6,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get customer growth statistics per month for the last N months.
    Returns array of { month: "MM/YYYY", count: N }.
    """
    from datetime import datetime, timezone, timedelta
    
    now = datetime.now(timezone.utc)
    result = []
    
    for i in range(months - 1, -1, -1):
        target = now - timedelta(days=i * 30)
        month_start = target.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if target.month == 12:
            month_end = month_start.replace(year=target.year + 1, month=1)
        else:
            month_end = month_start.replace(month=target.month + 1)
        
        count_query = select(func.count(CustomerModel.id)).where(
            CustomerModel.tenant_id == tenant_id,
            CustomerModel.created_at >= month_start,
            CustomerModel.created_at < month_end
        )
        count = (await db.execute(count_query)).scalar() or 0
        
        result.append({
            "month": f"{month_start.strftime('%m/%Y')}",
            "count": count
        })
    
    return result


# ============ E7: CUSTOMER CONSUMPTION ANALYSIS ============

@router.get("/customers/{customer_id}/consumption")
async def get_customer_consumption(
    customer_id: UUID,
    months: int = 6,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    E7: Get top consumed items/ingredients for a customer.
    Traces orders → order_items → menu_items → recipes → inventory items.
    Reference: PRD-luong-nghiep-vu-kho-hang-v2.md (E7)
    """
    from datetime import datetime, timezone, timedelta
    from backend.modules.order.domain.models import OrderModel, OrderItemModel

    # Verify customer exists
    customer_result = await db.execute(
        select(CustomerModel).where(
            CustomerModel.id == customer_id,
            CustomerModel.tenant_id == tenant_id
        )
    )
    if not customer_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")

    now = datetime.now(timezone.utc)
    period_start = now - timedelta(days=months * 30)

    # Get customer's completed orders in period
    orders_result = await db.execute(
        select(OrderModel.id)
        .where(
            OrderModel.customer_id == customer_id,
            OrderModel.tenant_id == tenant_id,
            OrderModel.status.in_(['COMPLETED', 'CONFIRMED']),
            OrderModel.created_at >= period_start,
        )
    )
    order_ids = [row[0] for row in orders_result.all()]

    if not order_ids:
        return {
            "customer_id": str(customer_id),
            "period_months": months,
            "total_orders": 0,
            "top_items": [],
            "total_spend": 0,
        }

    # Get order items aggregated by menu item
    items_result = await db.execute(
        select(
            OrderItemModel.item_name,
            func.sum(OrderItemModel.quantity).label('total_qty'),
            func.sum(OrderItemModel.quantity * OrderItemModel.unit_price).label('total_spend'),
            func.count(func.distinct(OrderItemModel.order_id)).label('order_count'),
        )
        .where(OrderItemModel.order_id.in_(order_ids))
        .group_by(OrderItemModel.item_name)
        .order_by(desc('total_spend'))
        .limit(20)
    )

    top_items = []
    total_spend = 0.0
    for row in items_result.all():
        spend = float(row.total_spend or 0)
        total_spend += spend
        top_items.append({
            "item_name": row.item_name or "N/A",
            "total_quantity": float(row.total_qty or 0),
            "total_spend": spend,
            "order_count": int(row.order_count or 0),
        })

    return {
        "customer_id": str(customer_id),
        "period_months": months,
        "total_orders": len(order_ids),
        "top_items": top_items,
        "total_spend": total_spend,
    }
