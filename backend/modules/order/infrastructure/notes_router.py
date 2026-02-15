"""
HTTP Router for Order Internal Notes
Feature: Internal notes visible only to staff
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from uuid import UUID
import uuid
import logging

from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant
from backend.modules.order.domain.models import OrderModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Order Notes"])


# ============ SCHEMAS ============

class OrderNoteCreate(BaseModel):
    """Schema for creating order note"""
    content: str

class OrderNoteResponse(BaseModel):
    """Schema for order note response"""
    id: str
    order_id: str
    content: str
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ ENDPOINTS ============

@router.get("/{order_id}/notes", response_model=List[OrderNoteResponse])
async def get_order_notes(
    order_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all internal notes for an order.
    Returns notes sorted by created_at desc (newest first).
    """
    result = await db.execute(
        text("""
            SELECT id, order_id, content, created_by, created_at
            FROM order_notes
            WHERE order_id = :order_id AND tenant_id = :tenant_id
            ORDER BY created_at DESC
        """),
        {"order_id": str(order_id), "tenant_id": str(tenant_id)}
    )
    
    notes = result.fetchall()
    return [
        OrderNoteResponse(
            id=str(n.id),
            order_id=str(n.order_id),
            content=n.content,
            created_by=n.created_by,
            created_at=n.created_at
        )
        for n in notes
    ]


@router.post("/{order_id}/notes", response_model=OrderNoteResponse)
async def add_order_note(
    order_id: UUID,
    data: OrderNoteCreate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Add an internal note to an order.
    Notes are visible only to staff, not customers.
    """
    # Verify order belongs to tenant
    order_result = await db.execute(
        select(OrderModel).where(
            OrderModel.id == order_id,
            OrderModel.tenant_id == tenant_id
        )
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Validate content
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Note content cannot be empty")
    
    # Insert note
    note_id = str(uuid.uuid4())
    now = datetime.now()
    
    await db.execute(
        text("""
            INSERT INTO order_notes (id, tenant_id, order_id, content, created_by, created_at)
            VALUES (:id, :tenant_id, :order_id, :content, :created_by, :created_at)
        """),
        {
            "id": note_id,
            "tenant_id": str(tenant_id),
            "order_id": str(order_id),
            "content": data.content.strip(),
            "created_by": "Nhân viên",  # TODO: Get from auth context
            "created_at": now
        }
    )
    await db.commit()
    
    logger.info(f"Added internal note to order {order.code}")
    
    return OrderNoteResponse(
        id=note_id,
        order_id=str(order_id),
        content=data.content.strip(),
        created_by="Nhân viên",
        created_at=now
    )


@router.delete("/{order_id}/notes/{note_id}")
async def delete_order_note(
    order_id: UUID,
    note_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Delete an internal note from an order."""
    result = await db.execute(
        text("""
            SELECT id FROM order_notes 
            WHERE id = :note_id AND order_id = :order_id AND tenant_id = :tenant_id
        """),
        {"note_id": str(note_id), "order_id": str(order_id), "tenant_id": str(tenant_id)}
    )
    
    if not result.scalar():
        raise HTTPException(status_code=404, detail="Note not found")
    
    await db.execute(
        text("DELETE FROM order_notes WHERE id = :note_id"),
        {"note_id": str(note_id)}
    )
    await db.commit()
    
    logger.info(f"Deleted internal note {note_id} from order {order_id}")
    
    return {"success": True, "message": "Đã xóa ghi chú"}
