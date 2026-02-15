"""
FastAPI Router for Invoice Module
Endpoints for VAT Invoice management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import date

from backend.core.database import get_db
from backend.modules.invoice.domain.models import InvoiceModel, InvoiceItemModel
from backend.modules.invoice.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListResponse,
    InvoiceFromOrder, InvoiceStatsResponse, InvoiceItemCreate
)
from backend.modules.order.domain.models import OrderModel, OrderItemModel

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Default tenant for development (must match actual tenant in database)
DEFAULT_TENANT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"


def get_tenant_id() -> UUID:
    """Get current tenant ID (simplified for now)"""
    return UUID(DEFAULT_TENANT_ID)


@router.get("/stats", response_model=InvoiceStatsResponse)
async def get_invoice_stats(db: AsyncSession = Depends(get_db)):
    """Get invoice statistics"""
    tenant_id = get_tenant_id()
    
    # Total invoices
    total_result = await db.execute(
        select(func.count(InvoiceModel.id)).where(InvoiceModel.tenant_id == tenant_id)
    )
    total_invoices = total_result.scalar() or 0
    
    # Count by status
    draft_result = await db.execute(
        select(func.count(InvoiceModel.id)).where(
            and_(InvoiceModel.tenant_id == tenant_id, InvoiceModel.status == 'DRAFT')
        )
    )
    draft_count = draft_result.scalar() or 0
    
    issued_result = await db.execute(
        select(func.count(InvoiceModel.id)).where(
            and_(InvoiceModel.tenant_id == tenant_id, InvoiceModel.status == 'ISSUED')
        )
    )
    issued_count = issued_result.scalar() or 0
    
    paid_result = await db.execute(
        select(func.count(InvoiceModel.id)).where(
            and_(InvoiceModel.tenant_id == tenant_id, InvoiceModel.payment_status == 'PAID')
        )
    )
    paid_count = paid_result.scalar() or 0
    
    # Total revenue (issued invoices)
    revenue_result = await db.execute(
        select(func.sum(InvoiceModel.total_amount)).where(
            and_(InvoiceModel.tenant_id == tenant_id, InvoiceModel.status == 'ISSUED')
        )
    )
    total_revenue = revenue_result.scalar() or Decimal("0")
    
    # Outstanding (issued but not fully paid)
    outstanding_result = await db.execute(
        select(func.sum(InvoiceModel.total_amount - InvoiceModel.paid_amount)).where(
            and_(
                InvoiceModel.tenant_id == tenant_id,
                InvoiceModel.status == 'ISSUED',
                InvoiceModel.payment_status != 'PAID'
            )
        )
    )
    total_outstanding = outstanding_result.scalar() or Decimal("0")
    
    return InvoiceStatsResponse(
        total_invoices=total_invoices,
        draft_count=draft_count,
        issued_count=issued_count,
        paid_count=paid_count,
        total_revenue=total_revenue,
        total_outstanding=total_outstanding
    )


@router.get("", response_model=List[InvoiceListResponse])
async def list_invoices(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all invoices with filters"""
    tenant_id = get_tenant_id()
    
    query = select(InvoiceModel).where(InvoiceModel.tenant_id == tenant_id)
    
    if status:
        query = query.where(InvoiceModel.status == status)
    if payment_status:
        query = query.where(InvoiceModel.payment_status == payment_status)
    if from_date:
        query = query.where(InvoiceModel.invoice_date >= from_date)
    if to_date:
        query = query.where(InvoiceModel.invoice_date <= to_date)
    if search:
        query = query.where(
            InvoiceModel.code.ilike(f"%{search}%") | 
            InvoiceModel.customer_name.ilike(f"%{search}%")
        )
    
    query = query.order_by(InvoiceModel.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    invoices = result.scalars().all()
    
    return invoices


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get invoice by ID with items"""
    tenant_id = get_tenant_id()
    
    result = await db.execute(
        select(InvoiceModel)
        .options(selectinload(InvoiceModel.items))
        .where(
            and_(InvoiceModel.id == invoice_id, InvoiceModel.tenant_id == tenant_id)
        )
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice


@router.post("", response_model=InvoiceResponse)
async def create_invoice(data: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new invoice"""
    tenant_id = get_tenant_id()
    
    # Calculate totals
    subtotal = Decimal("0")
    items_to_create = []
    
    for item_data in data.items:
        item_subtotal = Decimal(str(item_data.quantity)) * item_data.unit_price
        discount = item_subtotal * (item_data.discount_percent / 100)
        item_total = item_subtotal - discount
        subtotal += item_total
        
        items_to_create.append({
            **item_data.model_dump(),
            "total_price": item_total,
            "tenant_id": tenant_id
        })
    
    vat_amount = subtotal * (data.vat_rate / 100)
    total_amount = subtotal + vat_amount
    
    # Create invoice
    invoice = InvoiceModel(
        tenant_id=tenant_id,
        order_id=data.order_id,
        customer_name=data.customer_name,
        customer_address=data.customer_address,
        customer_tax_code=data.customer_tax_code,
        customer_phone=data.customer_phone,
        invoice_date=data.invoice_date,
        due_date=data.due_date,
        subtotal=subtotal,
        vat_rate=data.vat_rate,
        vat_amount=vat_amount,
        total_amount=total_amount,
        notes=data.notes
    )
    
    db.add(invoice)
    await db.flush()
    
    # Create items
    for item_dict in items_to_create:
        item = InvoiceItemModel(invoice_id=invoice.id, **item_dict)
        db.add(item)
    
    await db.commit()
    await db.refresh(invoice)
    
    # Reload with items
    result = await db.execute(
        select(InvoiceModel)
        .options(selectinload(InvoiceModel.items))
        .where(InvoiceModel.id == invoice.id)
    )
    return result.scalar_one()


@router.post("/from-order/{order_id}", response_model=InvoiceResponse)
async def create_invoice_from_order(
    order_id: UUID,
    data: InvoiceFromOrder,
    db: AsyncSession = Depends(get_db)
):
    """Create invoice from an existing order"""
    tenant_id = get_tenant_id()
    
    # Get order with items
    result = await db.execute(
        select(OrderModel)
        .options(selectinload(OrderModel.items))
        .where(and_(OrderModel.id == order_id, OrderModel.tenant_id == tenant_id))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if invoice already exists for this order
    existing = await db.execute(
        select(InvoiceModel).where(InvoiceModel.order_id == order_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invoice already exists for this order")
    
    # Create invoice from order data
    invoice = InvoiceModel(
        tenant_id=tenant_id,
        order_id=order_id,
        customer_name=order.customer_name or "Khách lẻ",
        customer_phone=order.customer_phone,
        customer_tax_code=data.customer_tax_code,
        invoice_date=date.today(),
        due_date=data.due_date,
        subtotal=order.total_amount - order.vat_amount if order.vat_amount else order.total_amount,
        vat_rate=order.vat_rate or Decimal("10"),
        vat_amount=order.vat_amount or Decimal("0"),
        total_amount=order.final_amount or order.total_amount,
        notes=data.notes
    )
    
    db.add(invoice)
    await db.flush()
    
    # Create invoice items from order items
    for idx, order_item in enumerate(order.items):
        invoice_item = InvoiceItemModel(
            tenant_id=tenant_id,
            invoice_id=invoice.id,
            item_name=order_item.item_name,
            description=order_item.description,
            uom=order_item.uom or "Món",
            quantity=order_item.quantity,
            unit_price=order_item.unit_price,
            total_price=order_item.total_price,
            sort_order=idx
        )
        db.add(invoice_item)
    
    # Update order with invoice reference
    order.invoice_id = invoice.id
    
    await db.commit()
    await db.refresh(invoice)
    
    # Reload with items
    result = await db.execute(
        select(InvoiceModel)
        .options(selectinload(InvoiceModel.items))
        .where(InvoiceModel.id == invoice.id)
    )
    return result.scalar_one()


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: UUID,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update invoice"""
    tenant_id = get_tenant_id()
    
    result = await db.execute(
        select(InvoiceModel)
        .options(selectinload(InvoiceModel.items))
        .where(
            and_(InvoiceModel.id == invoice_id, InvoiceModel.tenant_id == tenant_id)
        )
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status == 'ISSUED' and data.status != 'CANCELLED':
        raise HTTPException(status_code=400, detail="Cannot modify issued invoice")
    
    # Update fields
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)
    
    await db.commit()
    await db.refresh(invoice)
    
    return invoice


@router.post("/{invoice_id}/issue", response_model=InvoiceResponse)
async def issue_invoice(invoice_id: UUID, db: AsyncSession = Depends(get_db)):
    """Issue invoice (change status from DRAFT to ISSUED)"""
    tenant_id = get_tenant_id()
    
    result = await db.execute(
        select(InvoiceModel)
        .options(selectinload(InvoiceModel.items))
        .where(
            and_(InvoiceModel.id == invoice_id, InvoiceModel.tenant_id == tenant_id)
        )
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != 'DRAFT':
        raise HTTPException(status_code=400, detail="Only DRAFT invoices can be issued")
    
    invoice.status = 'ISSUED'
    
    await db.commit()
    await db.refresh(invoice)
    
    return invoice


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete invoice (only DRAFT status)"""
    tenant_id = get_tenant_id()
    
    result = await db.execute(
        select(InvoiceModel).where(
            and_(InvoiceModel.id == invoice_id, InvoiceModel.tenant_id == tenant_id)
        )
    )
    invoice = result.scalar_one_or_none()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != 'DRAFT':
        raise HTTPException(status_code=400, detail="Only DRAFT invoices can be deleted")
    
    await db.delete(invoice)
    await db.commit()
    
    return {"message": "Invoice deleted successfully"}
