from fastapi import APIRouter, Depends, HTTPException, status, Request  # Added Request for rate limiting
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

# ISS-002: Rate Limiting
from backend.core.rate_limiting import limiter

from backend.core.database import get_db
from backend.core.dependencies import (
    get_current_tenant, 
    CurrentTenant,
    require_permission  # ISS-003: RBAC
)
from backend.modules.quote.domain.entities import Quote, QuoteBase, QuoteItemBase, QuoteNotePreset, QuoteNotePresetCreate, QuoteTemplate, QuoteTemplateCreate, QuoteTemplateUpdate
from backend.modules.quote.domain.models import QuoteModel, QuoteItemModel, QuoteServiceModel, QuoteNotePresetModel, QuoteTemplateModel
from backend.modules.order.domain.models import OrderModel, OrderItemModel, OrderPaymentModel
from backend.modules.crm.application.services import CrmIntegrationService
from backend.common.utils.code_generator import generate_quote_code, generate_order_code


router = APIRouter(tags=["Quote Management"])



@router.get("", response_model=List[Quote])
async def list_quotes(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None
):
    """Get all quotes from PostgreSQL"""
    query = select(QuoteModel).where(QuoteModel.tenant_id == tenant_id)
    
    if status:
        query = query.where(QuoteModel.status == status)
        
    query = query.order_by(desc(QuoteModel.created_at)).offset(skip).limit(limit)
    
    # Eager load items and services to prevent N+1 issues
    query = query.options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    
    result = await db.execute(query)
    quotes = result.scalars().all()
    return quotes

@router.get("/expiring-soon")
async def get_expiring_quotes(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db), 
    days: int = 3
):
    """
    Get quotes expiring within N days.
    Used for sidebar badge notification.
    """
    now = datetime.now()
    threshold = now + timedelta(days=days)
    
    query = select(QuoteModel).where(
        QuoteModel.tenant_id == tenant_id,
        QuoteModel.status.in_(['DRAFT', 'PENDING', 'APPROVED']),  # Not converted/rejected
        QuoteModel.valid_until != None,
        QuoteModel.valid_until <= threshold,
        QuoteModel.valid_until > now  # Not yet expired
    ).order_by(QuoteModel.valid_until).options(
        selectinload(QuoteModel.items), 
        selectinload(QuoteModel.services)
    )
    
    result = await db.execute(query)
    quotes = result.scalars().all()
    
    return {
        "count": len(quotes),
        "quotes": quotes,
        "threshold_days": days
    }

# ============ QUOTE TEMPLATES - Early registration to avoid route conflict ============
# These routes MUST be defined BEFORE /{quote_id} to prevent FastAPI from 
# matching /quote-templates as a UUID parameter

@router.get("/quote-templates", response_model=List[QuoteTemplate])
async def list_templates_early(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    event_type: Optional[str] = None,
    active_only: bool = True
):
    """List all quote templates - EARLY ROUTE to avoid /{quote_id} conflict"""
    query = select(QuoteTemplateModel).where(QuoteTemplateModel.tenant_id == tenant_id)
    
    if active_only:
        query = query.where(QuoteTemplateModel.is_active == True)
    if event_type:
        query = query.where(QuoteTemplateModel.event_type == event_type)
    
    query = query.order_by(desc(QuoteTemplateModel.created_at))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/quote-templates/{template_id}", response_model=QuoteTemplate)
async def get_template_early(
    template_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get a single template by ID - EARLY ROUTE"""
    result = await db.execute(
        select(QuoteTemplateModel).where(
            QuoteTemplateModel.id == template_id,
            QuoteTemplateModel.tenant_id == tenant_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.get("/{quote_id}", response_model=Quote)
async def get_quote(quote_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get specific quote by ID"""
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Quote not found"
        )
    return quote

@router.post("", response_model=Quote)
async def create_quote(data: QuoteBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Create new quote in PostgreSQL"""
    
    # Note: BR002 removed - allow draft quotes without items (items added in Step 2)
    
    try:
        # CRM Integration: Auto-Sync Customer
        # resolves customer_id from phone number
        resolved_customer_id = await CrmIntegrationService.sync_customer(
            db, tenant_id,
            data.customer_name,
            data.customer_phone,
            data.customer_email,
            source="QUOTE"
        )
        
        # BUGFIX: BUG-20260202-004 - Use centralized code generator
        # Generate unique quote code: BG-YYYYNNNNNNN
        quote_code = generate_quote_code()
        
        new_quote = QuoteModel(
            tenant_id=tenant_id,
            code=quote_code,
            # Use resolved ID if available, otherwise fallback to frontend ID (if any)
            customer_id=resolved_customer_id or data.customer_id,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
            customer_email=data.customer_email,
            event_type=data.event_type,
            event_date=data.event_date,
            event_time=data.event_time,  # Fixed: Added event_time mapping
            event_address=data.event_address,
            guest_count=data.guest_count,
            table_count=data.table_count,
            staff_count=data.staff_count,
            notes=data.notes,
            total_amount=data.total_amount,
            
            # New fields
            discount_furniture_percent=data.discount_furniture_percent,
            discount_staff_percent=data.discount_staff_percent,
            discount_total_percent=data.discount_total_percent,
            is_vat_inclusive=data.is_vat_inclusive,
            vat_rate=data.vat_rate,
            vat_amount=data.vat_amount,
            
            status=data.status,
            valid_until=data.valid_until
        )
        
        db.add(new_quote)
        await db.flush()  # Get quote ID before adding items
        
        # Log Interaction
        if resolved_customer_id:
            await CrmIntegrationService.log_interaction(
                db, tenant_id, resolved_customer_id,
                "QUOTE_CREATED",
                f"Tạo báo giá mới: {quote_code}"
            )
        
        # Save Quote Items
        for item in data.items:
            quote_item = QuoteItemModel(
                tenant_id=tenant_id,
                quote_id=new_quote.id,
                menu_item_id=item.menu_item_id,
                item_name=item.item_name,
                unit_price=item.unit_price,
                quantity=item.quantity or 1,
                total_price=item.total_price or item.unit_price
            )
            db.add(quote_item)
        
        # Save Quote Services
        for service in data.services:
            quote_service = QuoteServiceModel(
                tenant_id=tenant_id,
                quote_id=new_quote.id,
                # service_id field does not exist in model, using service_name for mapping
                service_type="FURNITURE", # Default type for now
                service_name=service.service_name,
                unit_price=service.unit_price,
                quantity=service.quantity or 1,
                total_price=service.total_price or service.unit_price
            )
            db.add(quote_service)
        
        await db.commit()
        
        # Re-query with eager loading to properly serialize items and services
        query = select(QuoteModel).where(
            QuoteModel.id == new_quote.id
        ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
        result = await db.execute(query)
        created_quote = result.scalar_one()
        
        return created_quote
    except Exception as e:
        await db.rollback()
        import traceback
        import logging
        logging.error(f"CREATE QUOTE ERROR: {type(e).__name__}: {str(e)}\n{traceback.format_exc()}")
        # Sanitized error response - don't expose internal details
        user_message = "Không thể tạo báo giá. Vui lòng thử lại sau."
        if "UNIQUE constraint" in str(e) or "duplicate key" in str(e).lower():
            user_message = "Mã báo giá đã tồn tại. Vui lòng thử lại."
        elif "violates foreign key" in str(e).lower():
            user_message = "Dữ liệu tham chiếu không hợp lệ."
        raise HTTPException(status_code=500, detail=user_message)

@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")  # ISS-002: Rate limiting for delete
async def delete_quote(
    request: Request,  # Required for rate limiting
    quote_id: UUID, 
    tenant_id: UUID = Depends(get_current_tenant), 
    db: AsyncSession = Depends(get_db),
    _rbac: None = Depends(require_permission("quote:delete"))  # ISS-003: RBAC
):
    """Delete a quote. Requires quote:delete permission (admin, manager only). Rate limited: 10/minute."""
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    try:
        await db.delete(quote)
        await db.commit()
    except Exception as e:
        await db.rollback()
        # Check for Foreign Key violation (Quote referenced by Order)
        if "violates foreign key constraint" in str(e).lower() or "update or delete on table" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Không thể xóa báo giá đã được chuyển thành đơn hàng hoặc đang được sử dụng."
            )
        # Re-raise other errors
        import logging
        import traceback
        logging.error(f"DELETE QUOTE ERROR: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xóa báo giá")

@router.put("/{quote_id}", response_model=Quote)
async def update_quote(quote_id: UUID, data: QuoteBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Update existing quote (Full Update)"""
    # 1. Get Quote
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # 2. Update basic fields
    quote.customer_name = data.customer_name
    quote.customer_phone = data.customer_phone
    quote.event_type = data.event_type
    quote.event_date = data.event_date
    quote.event_time = data.event_time  # ISS-009: Added missing event_time update
    quote.event_address = data.event_address
    quote.guest_count = data.guest_count
    quote.table_count = data.table_count
    quote.total_amount = data.total_amount
    quote.status = data.status
    quote.notes = data.notes
    quote.staff_count = data.staff_count
    
    quote.discount_furniture_percent = data.discount_furniture_percent
    quote.discount_staff_percent = data.discount_staff_percent
    quote.discount_total_percent = data.discount_total_percent
    quote.is_vat_inclusive = data.is_vat_inclusive
    quote.vat_rate = data.vat_rate
    quote.vat_amount = data.vat_amount

    # 3. Replace Items & Services (Cascade Delete will handle cleanup)
    quote.items = []
    quote.services = []
    
    for item in data.items:
        quote.items.append(QuoteItemModel(
            tenant_id=tenant_id,
            menu_item_id=item.menu_item_id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            note=item.note
        ))

    for service in data.services:
        quote.services.append(QuoteServiceModel(
            tenant_id=tenant_id,
            service_type="FURNITURE", # Default type
            service_name=service.service_name,
            unit_price=service.unit_price,
            quantity=service.quantity or 1,
            total_price=service.total_price or service.unit_price
        ))

    await db.commit()
    await db.refresh(quote)
    
    # CRM Hook: Recalculate Stats (For Potential/Lost logic based on quotes)
    if quote.customer_id:
        await CrmIntegrationService.recalculate_stats(db, tenant_id, quote.customer_id)
        
    return quote


# --- Mark Quote as Lost (PRD-QUOTE-LOST-001) ---

from pydantic import BaseModel as PydanticBaseModel

class MarkLostRequest(PydanticBaseModel):
    reason: Optional[str] = None

@router.post("/{quote_id}/mark-lost")
async def mark_quote_as_lost(
    quote_id: UUID,
    data: MarkLostRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a quote as LOST (declined by customer).
    - Sets status to LOST
    - Records lost_reason and lost_at timestamp
    - Only allowed for quotes in NEW, APPROVED, or PENDING status
    """
    # 1. Get the quote
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    )
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # 2. Validate current status - can only mark as lost from certain states
    allowed_statuses = ['NEW', 'APPROVED', 'PENDING', 'DRAFT']
    if quote.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể đánh dấu 'không chốt' cho báo giá với trạng thái: {quote.status}"
        )
    
    # 3. Update quote status to LOST
    quote.status = 'LOST'
    quote.lost_reason = data.reason
    quote.lost_at = datetime.now()
    
    await db.commit()
    await db.refresh(quote)
    
    # 4. CRM Hook: Update customer stats for Lost opportunity
    if quote.customer_id:
        await CrmIntegrationService.log_interaction(
            db, tenant_id, quote.customer_id,
            "QUOTE_LOST",
            f"Báo giá {quote.code} không chốt" + (f": {data.reason}" if data.reason else "")
        )
        await CrmIntegrationService.recalculate_stats(db, tenant_id, quote.customer_id)
    
    return {
        "success": True,
        "message": f"Đã đánh dấu báo giá {quote.code} là 'Không chốt'",
        "quote_id": str(quote.id),
        "quote_code": quote.code,
        "status": quote.status,
        "lost_reason": quote.lost_reason
    }


# --- Convert Quote to Order ---

# ============ CLONE QUOTE (Phase 14.2) ============

@router.post("/{quote_id}/clone")
async def clone_quote(quote_id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """
    Clone an existing quote.
    - Copies all items and services
    - Clears customer info
    - Resets status to DRAFT
    - Generates new quote code
    """
    import random
    
    # 1. Get the source quote with items and services
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    
    result = await db.execute(query)
    source_quote = result.scalar_one_or_none()
    
    if not source_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    try:
        # BUGFIX: BUG-20260202-004 - Use centralized code generator
        # 2. Generate new quote code
        new_code = generate_quote_code()
        
        # 3. Create cloned quote - clear customer info, reset status
        cloned_quote = QuoteModel(
            tenant_id=tenant_id,
            code=new_code,
            
            # Clear customer info
            customer_id=None,
            customer_name="",
            customer_phone="",
            customer_email="",
            
            # Copy event details
            event_type=source_quote.event_type,
            event_date=None,  # Clear date - needs to be set for new event
            event_address="",
            guest_count=source_quote.guest_count,
            table_count=source_quote.table_count,
            staff_count=source_quote.staff_count,
            
            # Copy pricing structure
            total_amount=source_quote.total_amount,
            discount_furniture_percent=source_quote.discount_furniture_percent,
            discount_staff_percent=source_quote.discount_staff_percent,
            discount_total_percent=source_quote.discount_total_percent,
            is_vat_inclusive=source_quote.is_vat_inclusive,
            vat_rate=source_quote.vat_rate,
            vat_amount=source_quote.vat_amount,
            
            # Reset status
            status="DRAFT",
            notes=f"Sao chép từ {source_quote.code}",
            valid_until=None
        )
        
        db.add(cloned_quote)
        await db.flush()  # Get cloned quote ID
        
        # 4. Copy items
        for item in source_quote.items:
            cloned_item = QuoteItemModel(
                tenant_id=tenant_id,
                quote_id=cloned_quote.id,
                menu_item_id=item.menu_item_id,
                item_name=item.item_name,
                unit_price=item.unit_price,
                quantity=item.quantity,
                total_price=item.total_price,
                note=item.note
            )
            db.add(cloned_item)
        
        # 5. Copy services
        for service in source_quote.services:
            cloned_service = QuoteServiceModel(
                tenant_id=tenant_id,
                quote_id=cloned_quote.id,
                service_type=service.service_type,
                service_name=service.service_name,
                unit_price=service.unit_price,
                quantity=service.quantity,
                total_price=service.total_price,
                note=service.note
            )
            db.add(cloned_service)
        
        await db.commit()
        
        # 6. Return cloned quote with items
        query = select(QuoteModel).where(
            QuoteModel.id == cloned_quote.id
        ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
        result = await db.execute(query)
        final_quote = result.scalar_one()
        
        return {
            "success": True,
            "message": f"Đã sao chép báo giá {source_quote.code} thành {new_code}",
            "quote_id": str(final_quote.id),
            "quote_code": new_code,
            "source_code": source_quote.code,
            "items_count": len(source_quote.items),
            "services_count": len(source_quote.services)
        }
        
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"CLONE ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Lỗi sao chép: {str(e)}")

@router.post("/{quote_id}/convert-to-order")
async def convert_quote_to_order(
    quote_id: UUID, 
    tenant_id: UUID = Depends(get_current_tenant), 
    db: AsyncSession = Depends(get_db),
    _rbac: None = Depends(require_permission("quote:convert"))  # ISS-003: RBAC
):
    """
    Convert an APPROVED quote to an Order.
    - Creates new Order with quote data
    - Copies quote items to order items  
    - Updates quote status to CONVERTED
    - If quote.replaces_order_id is set: Transfer deposits + Cancel old order
    - Returns created Order ID and code
    """
    import random
    import logging
    logger = logging.getLogger(__name__)
    
    # 1. Get the quote with items
    query = select(QuoteModel).where(
        QuoteModel.id == quote_id,
        QuoteModel.tenant_id == tenant_id
    ).options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    
    result = await db.execute(query)
    quote = result.scalar_one_or_none()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # 2. Validate quote status - allow APPROVED, PENDING, NEW, or DRAFT quotes to be converted
    allowed_statuses = ['APPROVED', 'pending', 'PENDING', 'NEW', 'DRAFT']
    if quote.status not in allowed_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Chỉ có thể chuyển đổi báo giá đã duyệt hoặc mới lập. Trạng thái hiện tại: {quote.status}"
        )
    
    # 3. Check if already converted
    existing_order_query = select(OrderModel).where(OrderModel.quote_id == quote_id)
    existing_result = await db.execute(existing_order_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Báo giá này đã được chuyển thành đơn hàng trước đó")
    
    # 4. Check if this is a REVISION quote (replaces an existing order)
    old_order = None
    deposit_amount = Decimal(0)
    if quote.replaces_order_id:
        old_order_result = await db.execute(
            select(OrderModel).where(
                OrderModel.id == quote.replaces_order_id,
                OrderModel.tenant_id == tenant_id
            ).options(selectinload(OrderModel.payments))
        )
        old_order = old_order_result.scalar_one_or_none()
        if old_order:
            deposit_amount = old_order.paid_amount or Decimal(0)
            logger.info(f"Revision quote detected. Old order: {old_order.code}, Deposit: {deposit_amount}")
    
    try:
        # BUGFIX: BUG-20260202-004 - Use centralized code generator
        # 5. Generate order code: DH-YYYYNNNNNN
        order_code = generate_order_code()
        
        # BUGFIX: BUG-20260203-002 - Lookup cost_price from menu_items
        # Batch fetch cost prices for all quote items that have menu_item_id
        from backend.modules.menu.domain.models import MenuItemModel
        
        menu_item_ids = [qi.menu_item_id for qi in quote.items if qi.menu_item_id]
        cost_prices_map = {}
        if menu_item_ids:
            cost_result = await db.execute(
                select(MenuItemModel.id, MenuItemModel.cost_price)
                .where(MenuItemModel.id.in_(menu_item_ids))
            )
            cost_prices_map = {row.id: row.cost_price or Decimal(0) for row in cost_result}
        
        # Track total cost for order.cost_amount
        total_cost_amount = Decimal(0)
        
        # 5. Create new Order from Quote
        new_order = OrderModel(
            tenant_id=tenant_id,
            code=order_code,
            quote_id=quote.id,
            
            # Customer info
            customer_id=quote.customer_id,
            customer_name=quote.customer_name,
            customer_phone=quote.customer_phone,
            
            # Event info
            event_type=quote.event_type,
            event_date=quote.event_date,
            event_time=quote.event_time,
            event_address=quote.event_address,
            
            # Pricing
            total_amount=quote.total_amount or 0,
            discount_amount=0,  # Calculate from quote discounts if needed
            vat_rate=quote.vat_rate or 10,
            vat_amount=quote.vat_amount or 0,
            final_amount=quote.total_amount or 0,  # Same as total for now
            
            # Payment tracking
            paid_amount=0,
            balance_amount=quote.total_amount or 0,
            
            # Status - set to CONFIRMED when converting from quote
            status='CONFIRMED',
            note=quote.notes
        )
        
        db.add(new_order)
        await db.flush()  # Get the order ID
        
        # 6. Copy quote items to order items - ENHANCED with cost_price lookup
        for quote_item in quote.items:
            # Get cost_price from menu_items lookup (BUG-20260203-002 fix)
            item_cost_price = cost_prices_map.get(quote_item.menu_item_id, Decimal(0))
            item_quantity = quote_item.quantity or 1
            total_cost_amount += item_cost_price * item_quantity
            
            order_item = OrderItemModel(
                tenant_id=tenant_id,
                order_id=new_order.id,
                menu_item_id=quote_item.menu_item_id,
                item_name=quote_item.item_name,
                category=None,  # Could derive from category_id
                description=quote_item.description,
                uom=quote_item.uom or 'bàn',
                quantity=item_quantity,
                unit_price=quote_item.unit_price or 0,
                cost_price=item_cost_price,  # BUG-20260203-002: Set cost_price from menu item
                total_price=quote_item.total_price or 0,
                note=quote_item.note
            )
            db.add(order_item)
        
        # 6b. Copy quote SERVICES to order items (as SERVICE category)
        for quote_service in quote.services:
            order_service_item = OrderItemModel(
                tenant_id=tenant_id,
                order_id=new_order.id,
                menu_item_id=None,  # Services don't have menu_item_id
                item_name=quote_service.service_name,
                category="SERVICE",  # Special category to distinguish from food
                description=f"Dịch vụ: {quote_service.service_type}",
                uom="cái",  # Furniture items
                quantity=quote_service.quantity or 1,
                unit_price=quote_service.unit_price or 0,
                cost_price=Decimal(0),  # BUG-20260203-002: Services don't have cost tracking
                total_price=quote_service.total_price or 0,
                note=quote_service.note
            )
            db.add(order_service_item)
        
        # BUG-20260203-002: Set total cost_amount on order for profit calculation
        new_order.cost_amount = total_cost_amount
        logger.info(f"Order {order_code} created with cost_amount={total_cost_amount}")
        
        # ============ DEPOSIT TRANSFER (Order Revision Feature) ============
        # 7. If this is a revision, transfer deposits from old order to new order
        if old_order and deposit_amount > 0:
            logger.info(f"Transferring {deposit_amount} from {old_order.code} to {order_code}")
            
            # Create new payment records in new order
            for old_payment in old_order.payments:
                if not old_payment.is_transferred:  # Only transfer non-transferred payments
                    new_payment = OrderPaymentModel(
                        tenant_id=tenant_id,
                        order_id=new_order.id,
                        amount=old_payment.amount,
                        payment_method=old_payment.payment_method,
                        payment_date=old_payment.payment_date,
                        reference_no=old_payment.reference_no,
                        note=f"Chuyển từ {old_order.code}",
                        transfer_from_order_id=old_order.id
                    )
                    db.add(new_payment)
                    
                    # Mark old payment as transferred
                    old_payment.is_transferred = True
            
            # Update new order payment totals
            new_order.paid_amount = deposit_amount
            new_order.balance_amount = (new_order.final_amount or Decimal(0)) - deposit_amount
            
            # Link new order to old order
            new_order.replaces_order_id = old_order.id
            
            # Cancel old order
            old_order.status = 'CANCELLED'
            old_order.cancel_reason = f"Thay thế bởi {order_code}"
            old_order.replaced_by_order_id = new_order.id
            
            logger.info(f"Old order {old_order.code} cancelled. New order {order_code} has {deposit_amount} deposit.")
        
        # 8. Update quote status to CONVERTED + Audit Trail
        quote.status = 'CONVERTED'
        quote.converted_at = datetime.now()
        # Note: converted_by should be set from current_user when auth is implemented
        # quote.converted_by = current_user.id
        
        await db.commit()
        
        # Build response
        response = {
            "success": True,
            "message": f"Đã chuyển đổi báo giá {quote.code} thành đơn hàng {order_code}",
            "order_id": str(new_order.id),
            "order_code": order_code,
            "quote_code": quote.code
        }
        
        # Add deposit transfer info if applicable
        if old_order and deposit_amount > 0:
            response["deposit_transferred"] = float(deposit_amount)
            response["old_order_code"] = old_order.code
            response["old_order_cancelled"] = True
        
        return response
        
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"CONVERT ERROR: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Lỗi chuyển đổi: {str(e)}")


# --- Note Presets Endpoints ---

@router.get("/notes/presets", response_model=List[QuoteNotePreset])
async def list_note_presets(db: AsyncSession = Depends(get_db)):
    """Get all note presets"""
    query = select(QuoteNotePresetModel).order_by(desc(QuoteNotePresetModel.created_at))
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/notes/presets", response_model=QuoteNotePreset)
async def create_note_preset(data: QuoteNotePresetCreate, db: AsyncSession = Depends(get_db)):
    """Create a new note preset"""
    # Check if exists
    query = select(QuoteNotePresetModel).where(QuoteNotePresetModel.content == data.content)
    result = await db.execute(query)
    if result.scalar_one_or_none():
         raise HTTPException(status_code=400, detail="Note preset already exists")
         
    new_preset = QuoteNotePresetModel(content=data.content)
    db.add(new_preset)
    await db.commit()
    await db.refresh(new_preset)
    return new_preset


@router.delete("/notes/presets/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note_preset(
    note_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a note preset (super_admin only in production).
    Note: Role check should be added via Depends(get_current_user) when auth is fully integrated.
    """
    # Find the preset
    query = select(QuoteNotePresetModel).where(QuoteNotePresetModel.id == note_id)
    result = await db.execute(query)
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=404, detail="Note preset not found")
    
    # Delete the preset
    await db.delete(preset)
    await db.commit()


# ============ PHASE 14.1: QUOTE TEMPLATES ============
# NOTE: GET /quote-templates and GET /quote-templates/{template_id} are defined 
# EARLY in this file (before /{quote_id}) to avoid FastAPI route priority conflict.
# Only POST/PUT/DELETE routes are defined here.

@router.post("/quote-templates", response_model=QuoteTemplate)
async def create_template(
    data: QuoteTemplateCreate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create a new quote template"""
    # Convert items/services to dict for JSONB storage
    items_json = [item.dict() for item in data.items] if data.items else []
    services_json = [svc.dict() for svc in data.services] if data.services else []
    
    template = QuoteTemplateModel(
        tenant_id=tenant_id,
        name=data.name,
        event_type=data.event_type,
        description=data.description,
        items=items_json,
        services=services_json,
        default_table_count=data.default_table_count,
        default_guests_per_table=data.default_guests_per_table,
        default_notes=data.default_notes
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.put("/quote-templates/{template_id}", response_model=QuoteTemplate)
async def update_template(
    template_id: UUID,
    data: QuoteTemplateUpdate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing template"""
    result = await db.execute(
        select(QuoteTemplateModel).where(
            QuoteTemplateModel.id == template_id,
            QuoteTemplateModel.tenant_id == tenant_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update fields
    if data.name is not None:
        template.name = data.name
    if data.event_type is not None:
        template.event_type = data.event_type
    if data.description is not None:
        template.description = data.description
    if data.is_active is not None:
        template.is_active = data.is_active
    if data.items is not None:
        template.items = [item.dict() for item in data.items]
    if data.services is not None:
        template.services = [svc.dict() for svc in data.services]
    if data.default_table_count is not None:
        template.default_table_count = data.default_table_count
    if data.default_guests_per_table is not None:
        template.default_guests_per_table = data.default_guests_per_table
    if data.default_notes is not None:
        template.default_notes = data.default_notes
    
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/quote-templates/{template_id}")
async def delete_template(
    template_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Delete a template (soft delete - set inactive)"""
    result = await db.execute(
        select(QuoteTemplateModel).where(
            QuoteTemplateModel.id == template_id,
            QuoteTemplateModel.tenant_id == tenant_id
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Soft delete
    template.is_active = False
    await db.commit()
    
    return {"message": "Template deleted successfully"}


@router.post("/quote-templates/{template_id}/apply", response_model=Quote)
async def apply_template(
    template_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Apply a template to create a new draft quote"""
    # Get template
    result = await db.execute(
        select(QuoteTemplateModel).where(
            QuoteTemplateModel.id == template_id,
            QuoteTemplateModel.tenant_id == tenant_id,
            QuoteTemplateModel.is_active == True
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Generate quote code
    from datetime import datetime
    code = f"BG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Create quote from template
    new_quote = QuoteModel(
        tenant_id=tenant_id,
        code=code,
        event_type=template.event_type,
        table_count=template.default_table_count or 0,
        guest_count=(template.default_table_count or 0) * (template.default_guests_per_table or 10),
        notes=template.default_notes,
        status="DRAFT"
    )
    db.add(new_quote)
    await db.flush()
    
    # Add items from template
    subtotal = 0
    for item in (template.items or []):
        qty = item.get("quantity", 1)
        price = item.get("unit_price", 0)
        total = qty * price
        subtotal += total
        
        quote_item = QuoteItemModel(
            tenant_id=tenant_id,
            quote_id=new_quote.id,
            item_name=item.get("name", ""),
            quantity=qty,
            unit_price=price,
            total_price=total
        )
        db.add(quote_item)
    
    # Add services from template
    for svc in (template.services or []):
        qty = svc.get("quantity", 1)
        price = svc.get("unit_price", 0)
        total = qty * price
        subtotal += total
        
        quote_svc = QuoteServiceModel(
            tenant_id=tenant_id,
            quote_id=new_quote.id,
            service_type=svc.get("service_type", "OTHER"),
            service_name=svc.get("name", ""),
            quantity=qty,
            unit_price=price,
            total_price=total
        )
        db.add(quote_svc)
    
    new_quote.subtotal = subtotal
    new_quote.total_amount = subtotal
    
    await db.commit()
    await db.refresh(new_quote)
    
    # Reload with items and services
    result = await db.execute(
        select(QuoteModel)
        .where(QuoteModel.id == new_quote.id)
        .options(selectinload(QuoteModel.items), selectinload(QuoteModel.services))
    )
    quote = result.scalar_one()
    
    return quote


