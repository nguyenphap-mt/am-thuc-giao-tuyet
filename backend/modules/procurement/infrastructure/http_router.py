from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.core.database import get_db, set_tenant_context
from backend.modules.procurement.domain.entities import (
    Supplier, SupplierBase, 
    PurchaseOrder, PurchaseOrderCreate, 
    PurchaseOrderBase, ReceiveOrderRequest
)
from backend.modules.procurement.domain.models import (
    SupplierModel, 
    PurchaseOrderModel, 
    PurchaseOrderItemModel
)

router = APIRouter(tags=["Procurement"])

# Default Tenant for Dev
DEFAULT_TENANT_ID = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")

# --- SUPPLIERS ---

@router.get("/suppliers/stats")
async def get_supplier_stats(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """E4: Get supplier statistics"""
    try:
        await set_tenant_context(db, str(tenant_id))
        from sqlalchemy import func as sqlfunc, case, text
        
        # Supplier counts
        supplier_query = select(
            sqlfunc.count(SupplierModel.id).label('total'),
            sqlfunc.sum(case((SupplierModel.is_active == True, 1), else_=0)).label('active'),
            sqlfunc.sum(case((SupplierModel.is_active != True, 1), else_=0)).label('inactive'),
            sqlfunc.coalesce(sqlfunc.sum(SupplierModel.balance), 0).label('total_balance'),
        ).where(SupplierModel.tenant_id == tenant_id)
        
        result = await db.execute(supplier_query)
        stats = result.one()
        
        # Category breakdown
        cat_query = select(
            SupplierModel.category,
            sqlfunc.count(SupplierModel.id).label('count')
        ).where(SupplierModel.tenant_id == tenant_id).group_by(SupplierModel.category)
        
        cat_result = await db.execute(cat_query)
        categories = {row.category or 'OTHER': int(row.count) for row in cat_result.all()}
        
        return {
            "total": int(stats.total or 0),
            "active": int(stats.active or 0),
            "inactive": int(stats.inactive or 0),
            "total_balance": float(stats.total_balance or 0),
            "categories": categories
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Supplier Stats Error: {str(e)}")


@router.get("/suppliers")
async def list_suppliers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """E6: Enhanced list with server-side search, filters and pagination"""
    try:
        await set_tenant_context(db, str(tenant_id))
        from sqlalchemy import func as sqlfunc
        
        base_filter = SupplierModel.tenant_id == tenant_id
        query = select(SupplierModel).where(base_filter)
        count_query = select(sqlfunc.count(SupplierModel.id)).where(base_filter)
        
        # Server-side search
        if search:
            search_pattern = f"%{search}%"
            search_cond = (
                (SupplierModel.name.ilike(search_pattern)) |
                (SupplierModel.contact_person.ilike(search_pattern)) |
                (SupplierModel.phone.ilike(search_pattern)) |
                (SupplierModel.email.ilike(search_pattern))
            )
            query = query.where(search_cond)
            count_query = count_query.where(search_cond)
        
        # Category filter
        if category:
            query = query.where(SupplierModel.category == category)
            count_query = count_query.where(SupplierModel.category == category)
        
        # Active filter
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            query = query.where(SupplierModel.is_active == active_bool)
            count_query = count_query.where(SupplierModel.is_active == active_bool)
        
        # Get total count
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Apply pagination
        query = query.order_by(SupplierModel.name).offset(skip).limit(limit)
        result = await db.execute(query)
        items = result.scalars().all()
        
        return {
            "items": [Supplier.model_validate(item) for item in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"List Suppliers Error: {str(e)}")


@router.get("/suppliers/{id}")
async def get_supplier_detail(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """E5: Supplier detail with PO history and financial stats"""
    try:
        await set_tenant_context(db, str(tenant_id))
        from sqlalchemy import func as sqlfunc
        
        # Get supplier
        query = select(SupplierModel).where(
            SupplierModel.id == id,
            SupplierModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        supplier = result.scalar_one_or_none()
        
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        # Get PO history
        po_query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.supplier_id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        ).order_by(desc(PurchaseOrderModel.created_at)).limit(20)
        
        po_result = await db.execute(po_query)
        pos = po_result.scalars().all()
        
        # Calculate PO stats
        po_stats_query = select(
            sqlfunc.count(PurchaseOrderModel.id).label('total_po'),
            sqlfunc.coalesce(sqlfunc.sum(PurchaseOrderModel.total_amount), 0).label('total_amount'),
            sqlfunc.coalesce(sqlfunc.sum(PurchaseOrderModel.paid_amount), 0).label('paid_amount'),
        ).where(
            PurchaseOrderModel.supplier_id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        )
        po_stats_result = await db.execute(po_stats_query)
        po_stats = po_stats_result.one()
        
        return {
            "supplier": {
                "id": str(supplier.id),
                "name": supplier.name,
                "contact_person": supplier.contact_person,
                "phone": supplier.phone,
                "email": supplier.email,
                "address": supplier.address,
                "tax_id": supplier.tax_id,
                "category": supplier.category or "OTHER",
                "website": supplier.website,
                "notes": supplier.notes,
                "is_active": bool(supplier.is_active) if supplier.is_active is not None else True,
                "payment_terms": supplier.payment_terms or "NET30",
                "bank_account": supplier.bank_account,
                "bank_name": supplier.bank_name,
                "balance": float(supplier.balance or 0),
                "created_at": supplier.created_at.isoformat() if supplier.created_at else None,
                "updated_at": supplier.updated_at.isoformat() if supplier.updated_at else None,
            },
            "purchase_orders": [
                {
                    "id": str(po.id),
                    "code": po.code,
                    "status": po.status,
                    "total_amount": float(po.total_amount or 0),
                    "paid_amount": float(po.paid_amount or 0),
                    "expected_delivery": po.expected_delivery.isoformat() if po.expected_delivery else None,
                    "created_at": po.created_at.isoformat() if po.created_at else None,
                }
                for po in pos
            ],
            "stats": {
                "total_po_count": int(po_stats.total_po or 0),
                "total_po_amount": float(po_stats.total_amount or 0),
                "paid_amount": float(po_stats.paid_amount or 0),
                "outstanding": float((po_stats.total_amount or 0) - (po_stats.paid_amount or 0)),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Supplier Detail Error: {str(e)}")


@router.post("/suppliers", response_model=Supplier)
async def create_supplier(
    data: SupplierBase,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        new_supplier = SupplierModel(
            tenant_id=tenant_id,
            **data.model_dump()
        )
        db.add(new_supplier)
        await db.commit()
        await db.refresh(new_supplier)
        return new_supplier
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Supplier Error: {str(e)}")

@router.put("/suppliers/{id}", response_model=Supplier)
async def update_supplier(
    id: UUID,
    data: SupplierBase,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(SupplierModel).where(
            SupplierModel.id == id,
            SupplierModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        supplier = result.scalar_one_or_none()
        
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
            
        # Update fields
        for key, value in data.model_dump().items():
            setattr(supplier, key, value)
            
        await db.commit()
        await db.refresh(supplier)
        return supplier
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update Supplier Error: {str(e)}")

@router.delete("/suppliers/{id}")
async def delete_supplier(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(SupplierModel).where(
            SupplierModel.id == id,
            SupplierModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        supplier = result.scalar_one_or_none()
        
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
            
        await db.delete(supplier)
        await db.commit()
        return {"message": "Supplier deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Handle foreign key violation explicitly if possible, nicely wrap generic error
        if "foreign key constraint" in str(e).lower():
             raise HTTPException(status_code=400, detail="Cannot delete supplier because they have existing orders.")
        raise HTTPException(status_code=500, detail=f"Delete Supplier Error: {str(e)}")

# --- PURCHASE ORDERS ---


@router.get("/orders", response_model=List[PurchaseOrder])
async def list_orders(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseOrderModel).where(PurchaseOrderModel.tenant_id == tenant_id)
        
        if status:
            query = query.where(PurchaseOrderModel.status == status)
            
        query = query.order_by(desc(PurchaseOrderModel.created_at))
        # Eager load supplier and items
        query = query.options(selectinload(PurchaseOrderModel.supplier), selectinload(PurchaseOrderModel.items))
        
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"List Orders Error: {str(e)}")

@router.get("/orders/{id}", response_model=PurchaseOrder)
async def get_order(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        ).options(selectinload(PurchaseOrderModel.supplier), selectinload(PurchaseOrderModel.items))
        
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
            
        return order
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Get Order Error: {str(e)}")

@router.post("/orders", response_model=PurchaseOrder)
async def create_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        # 1. Create Order
        new_order = PurchaseOrderModel(
            tenant_id=tenant_id,
            supplier_id=data.supplier_id,
            event_id=data.event_id,
            code=data.code or f"PO-{int(datetime.now().timestamp())}",
            total_amount=data.total_amount,
            status=data.status,
            expected_delivery=datetime.fromisoformat(data.expected_delivery) if (data.expected_delivery and isinstance(data.expected_delivery, str)) else data.expected_delivery,
            note=data.note
        )
        db.add(new_order)
        await db.flush() # flush to get order ID
        
        # 2. Create Items
        for item in data.items:
            new_item = PurchaseOrderItemModel(
                tenant_id=tenant_id,
                purchase_order_id=new_order.id,
                item_id=item.item_id,
                item_name=item.item_name,
                quantity=item.quantity,
                uom=item.uom,
                unit_price=item.unit_price,
                total_price=item.total_price or (item.quantity * item.unit_price)
            )
            db.add(new_item)
            
        await db.commit()
        
        # 3. Reload with relationships
        query = select(PurchaseOrderModel).where(PurchaseOrderModel.id == new_order.id).options(
            selectinload(PurchaseOrderModel.supplier),
            selectinload(PurchaseOrderModel.items)
        )
        result = await db.execute(query)
        return result.scalar_one()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.put("/orders/{id}/status", response_model=PurchaseOrder)
async def update_order_status(
    id: UUID,
    status: str,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        ).options(selectinload(PurchaseOrderModel.items))
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
        
        old_status = order.status
        
        # BE-2: PO State Machine Validation
        ALLOWED_TRANSITIONS = {
            'DRAFT': ['SENT', 'CANCELLED'],
            'SENT': ['RECEIVED', 'CANCELLED'],
            'RECEIVED': ['PAID'],
            'PAID': [],  # Terminal state
            'CANCELLED': [],  # Terminal state
        }
        allowed = ALLOWED_TRANSITIONS.get(old_status, [])
        if status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Không thể chuyển từ {old_status} sang {status}. Cho phép: {', '.join(allowed) if allowed else 'không có (trạng thái cuối)'}"
            )
        
        order.status = status
        
        # ========================================
        # SPRINT 19.1: AUTO-IMPORT FROM PO
        # ========================================
        # When status changes to APPROVED or SENT, check if auto-import is enabled
        auto_import_triggered = False
        if status in ('APPROVED', 'SENT') and old_status not in ('APPROVED', 'SENT', 'RECEIVED'):
            from backend.modules.settings.services.settings_service import SettingsService
            
            settings_service = SettingsService(db, tenant_id)
            auto_import_enabled = await settings_service.is_auto_import_po_enabled()
            
            if auto_import_enabled and order.items:
                from backend.modules.inventory.domain.services import InventoryService
                from backend.modules.inventory.domain.entities import InventoryTransactionBase
                from backend.modules.inventory.domain.models import WarehouseModel
                
                # Get Default Warehouse (direct query, not via router)
                wh_result = await db.execute(
                    select(WarehouseModel).where(WarehouseModel.tenant_id == tenant_id).limit(1)
                )
                warehouse = wh_result.scalar_one_or_none()
                
                if not warehouse:
                    # Create default warehouse
                    warehouse = WarehouseModel(
                        tenant_id=tenant_id,
                        name="Kho Tổng",
                        location="Main Location"
                    )
                    db.add(warehouse)
                    await db.flush()
                
                for idx, item in enumerate(order.items):
                    # Skip items without inventory mapping (free-text items)
                    if not item.item_id:
                        continue
                    
                    txn_dto = InventoryTransactionBase(
                        item_id=item.item_id,
                        warehouse_id=warehouse.id,
                        transaction_type="IMPORT",
                        quantity=item.quantity,
                        unit_price=item.unit_price or Decimal(0),
                        reference_doc=f"PO_AUTO:{order.code}:{order.id}",
                        notes=f"Auto-import from PO #{order.code}"
                    )
                    
                    await InventoryService.create_transaction(
                        db=db,
                        data=txn_dto,
                        tenant_id=tenant_id,
                        unit_price=item.unit_price or Decimal(0),
                        auto_create_lot=True,
                        lot_number=f"LOT-{order.code}-{idx+1:02d}",
                        batch_code=order.code
                    )
                
                auto_import_triggered = True
        
        # ========================================
        # FINANCE INTEGRATION: Auto-create Journal when PAID
        # ========================================
        finance_journal_created = False
        if status == 'PAID' and old_status != 'PAID':
            try:
                from backend.modules.finance.services.journal_service import JournalService
                
                journal_service = JournalService(db, tenant_id=tenant_id)
                
                # Get supplier name for description
                supplier_name = ""
                if order.supplier_id:
                    from backend.modules.procurement.domain.models import SupplierModel
                    sup_result = await db.execute(
                        select(SupplierModel).where(SupplierModel.id == order.supplier_id)
                    )
                    supplier = sup_result.scalar_one_or_none()
                    if supplier:
                        supplier_name = supplier.name
                
                po_total = order.total_amount or Decimal(0)
                
                await journal_service.create_journal_from_po_payment(
                    po_id=order.id,
                    po_code=order.code,
                    total_amount=po_total,
                    supplier_name=supplier_name,
                    payment_method=order.payment_terms or "TRANSFER"
                )
                
                # Update paid_amount on PO
                order.paid_amount = po_total
                
                finance_journal_created = True
                print(f"[FINANCE] PO {order.code} payment journal created: {po_total}")
            except Exception as finance_err:
                import traceback
                traceback.print_exc()
                print(f"[FINANCE-WARNING] Failed to create journal for PO {order.code}: {finance_err}")
                # Don't block the status update if finance integration fails
        
        await db.commit()
        await db.refresh(order)
        
        # Re-fetch with relationships
        result_order = await get_order(id, db, tenant_id)
        
        # Add auto-import info to response
        if auto_import_triggered:
            print(f"[AUTO-IMPORT] PO {order.code} automatically imported to inventory")
        
        return result_order
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update Status Error: {str(e)}")

@router.post("/orders/{id}/receive")
async def receive_order(
    id: UUID,
    data: ReceiveOrderRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """
    Process Goods Receipt:
    1. Update PO Status -> RECEIVED
    2. Create Inventory Transactions (Import)
    """
    from backend.modules.inventory.domain.services import InventoryService
    from backend.modules.inventory.domain.entities import InventoryTransactionBase
    
    try:
        await set_tenant_context(db, str(tenant_id))
        
        # 1. Get Order
        query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
            
        if order.status != 'SENT':
            raise HTTPException(status_code=400, detail=f"Order status must be SENT to receive (Current: {order.status})")
        
        # BE-5: Validate received items against PO items
        # Load PO items to build valid item_id set
        po_items_query = select(PurchaseOrderItemModel).where(
            PurchaseOrderItemModel.purchase_order_id == id
        )
        po_items_result = await db.execute(po_items_query)
        po_items = po_items_result.scalars().all()
        valid_item_ids = {item.item_id for item in po_items if item.item_id}
        
        for recv_item in data.items:
            if recv_item.item_id and recv_item.item_id not in valid_item_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Item {recv_item.item_id} không thuộc đơn hàng này"
                )
            
        # 2. Process Transactions
        
        # Get Default Warehouse (inline query — avoid DI mismatch from importing route handler)
        from backend.modules.inventory.domain.models import WarehouseModel
        wh_result = await db.execute(
            select(WarehouseModel).where(WarehouseModel.tenant_id == tenant_id).limit(1)
        )
        warehouse = wh_result.scalar_one_or_none()
        if not warehouse:
            warehouse = WarehouseModel(tenant_id=tenant_id, name="Kho Tổng", location="Main Location")
            db.add(warehouse)
            await db.flush()
        
        for idx, item in enumerate(data.items):
            # Skip items without valid inventory item_id
            if not item.item_id:
                continue
            
            # Create Transaction DTO
            txn_dto = InventoryTransactionBase(
                item_id=item.item_id,
                warehouse_id=warehouse.id,
                transaction_type="IMPORT",
                quantity=item.quantity,
                unit_price=item.unit_price,
                reference_id=str(order.id),
                reference_type="PURCHASE_ORDER",
                note=f"Receive PO #{order.code}"
            )
            
            # Call Service — auto-create lot for traceability
            await InventoryService.create_transaction(
                db=db,
                data=txn_dto,
                tenant_id=tenant_id,
                unit_price=item.unit_price,
                auto_create_lot=True,
                lot_number=f"LOT-{order.code}-{idx+1:02d}",
                batch_code=order.code
            )
            
        # 3. Update Order Status
        order.status = 'RECEIVED'
        
        await db.commit()
        
        return {"message": "Order received and inventory updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Receive Order Error: {str(e)}")


@router.delete("/orders/{id}")
async def delete_order(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    try:
        await set_tenant_context(db, str(tenant_id))
        
        # 1. Get Order
        query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.id == id,
            PurchaseOrderModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        order = result.scalar_one_or_none()
        
        if not order:
            raise HTTPException(status_code=404, detail="Purchase Order not found")
            
        # 2. Delete Items (Explicitly if needed, but ORM might handle it)
        # Check for relationships in domain/models.py if needed, but manual delete is safer
        # Delete items first
        delete_items_query = select(PurchaseOrderItemModel).where(PurchaseOrderItemModel.purchase_order_id == id)
        items_result = await db.execute(delete_items_query)
        items = items_result.scalars().all()
        for item in items:
            await db.delete(item)
            
        # 3. Delete Order
        await db.delete(order)
        await db.commit()
        
        return {"message": "Order deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete Order Error: {str(e)}")


# --- PURCHASE REQUISITIONS ---

from backend.modules.procurement.domain.models import (
    PurchaseRequisitionModel, 
    PurchaseRequisitionLineModel
)
from pydantic import BaseModel
from typing import List as ListType

class PurchaseRequisitionLineOut(BaseModel):
    id: str
    item_id: Optional[str] = None
    item_name: str
    item_sku: Optional[str] = None
    quantity: float
    uom: Optional[str] = None
    estimated_unit_price: float
    estimated_total: float
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class PurchaseRequisitionOut(BaseModel):
    id: str
    code: str
    title: str
    status: str
    priority: str
    total_amount: float
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    lines: ListType[PurchaseRequisitionLineOut] = []
    
    class Config:
        from_attributes = True


@router.get("/requisitions", response_model=List[PurchaseRequisitionOut])
async def list_requisitions(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """List all Purchase Requisitions (Phiếu yêu cầu mua hàng)"""
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.tenant_id == tenant_id
        )
        
        if status:
            query = query.where(PurchaseRequisitionModel.status == status)
            
        query = query.order_by(desc(PurchaseRequisitionModel.created_at))
        query = query.options(selectinload(PurchaseRequisitionModel.lines))
        
        result = await db.execute(query)
        prs = result.scalars().all()
        
        # Convert to response model
        response = []
        for pr in prs:
            lines = []
            for line in pr.lines:
                lines.append(PurchaseRequisitionLineOut(
                    id=str(line.id),
                    item_id=str(line.item_id) if line.item_id else None,
                    item_name=line.item_name,
                    item_sku=line.item_sku,
                    quantity=float(line.quantity or 0),
                    uom=line.uom,
                    estimated_unit_price=float(line.estimated_unit_price or 0),
                    estimated_total=float(line.estimated_total or 0),
                    notes=line.notes
                ))
            
            response.append(PurchaseRequisitionOut(
                id=str(pr.id),
                code=pr.code,
                title=pr.title,
                status=pr.status,
                priority=pr.priority,
                total_amount=float(pr.total_amount or 0),
                notes=pr.notes,
                created_at=pr.created_at,
                lines=lines
            ))
        
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"List Requisitions Error: {str(e)}")


@router.put("/requisitions/{id}/approve")
async def approve_requisition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Approve a Purchase Requisition (chuyển từ PENDING -> APPROVED)"""
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == id,
            PurchaseRequisitionModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        pr = result.scalar_one_or_none()
        
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found")
            
        if pr.status != 'PENDING':
            raise HTTPException(status_code=400, detail=f"Cannot approve PR with status: {pr.status}")
            
        pr.status = 'APPROVED'
        pr.approved_at = datetime.utcnow()
        
        await db.commit()
        return {"message": f"PR {pr.code} approved successfully", "status": "APPROVED"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Approve PR Error: {str(e)}")


@router.post("/requisitions/{id}/convert-to-po", response_model=PurchaseOrder)
async def convert_pr_to_po(
    id: UUID,
    supplier_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Convert approved PR to Purchase Order"""
    try:
        await set_tenant_context(db, str(tenant_id))
        
        # Get PR with lines
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == id,
            PurchaseRequisitionModel.tenant_id == tenant_id
        ).options(selectinload(PurchaseRequisitionModel.lines))
        
        result = await db.execute(query)
        pr = result.scalar_one_or_none()
        
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found")
            
        if pr.status not in ('PENDING', 'APPROVED'):
            raise HTTPException(status_code=400, detail=f"Cannot convert PR with status: {pr.status}")
        
        # Get first supplier if none provided
        if not supplier_id:
            supplier_q = select(SupplierModel).where(SupplierModel.tenant_id == tenant_id).limit(1)
            supplier_r = await db.execute(supplier_q)
            supplier = supplier_r.scalar_one_or_none()
            if supplier:
                supplier_id = supplier.id
        
        # Create PO
        po_code = f"PO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        new_po = PurchaseOrderModel(
            tenant_id=tenant_id,
            supplier_id=supplier_id,
            code=po_code,
            total_amount=pr.total_amount,
            status='DRAFT',
            note=f"Converted from {pr.code}"
        )
        db.add(new_po)
        await db.flush()
        
        # Create PO Items from PR Lines
        for line in pr.lines:
            po_item = PurchaseOrderItemModel(
                tenant_id=tenant_id,
                purchase_order_id=new_po.id,
                item_id=line.item_id,
                item_name=line.item_name,
                quantity=line.quantity,
                uom=line.uom,
                unit_price=line.estimated_unit_price,
                total_price=line.estimated_total
            )
            db.add(po_item)
        
        # Update PR status
        pr.status = 'CONVERTED'
        pr.converted_to_po_id = new_po.id
        pr.converted_at = datetime.utcnow()
        
        await db.commit()
        
        # Return PO with relationships
        po_query = select(PurchaseOrderModel).where(
            PurchaseOrderModel.id == new_po.id
        ).options(
            selectinload(PurchaseOrderModel.supplier),
            selectinload(PurchaseOrderModel.items)
        )
        po_result = await db.execute(po_query)
        return po_result.scalar_one()
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Convert PR to PO Error: {str(e)}")


@router.get("/stats")
async def get_procurement_stats(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Get aggregated procurement statistics"""
    try:
        await set_tenant_context(db, str(tenant_id))
        from sqlalchemy import func as sqlfunc, case
        
        # PO stats
        po_query = select(
            sqlfunc.count(PurchaseOrderModel.id).label('total_orders'),
            sqlfunc.coalesce(sqlfunc.sum(PurchaseOrderModel.total_amount), 0).label('total_amount'),
            sqlfunc.sum(case((PurchaseOrderModel.status == 'DRAFT', 1), else_=0)).label('draft_count'),
            sqlfunc.sum(case((PurchaseOrderModel.status == 'SENT', 1), else_=0)).label('sent_count'),
            sqlfunc.sum(case((PurchaseOrderModel.status == 'RECEIVED', 1), else_=0)).label('received_count'),
            sqlfunc.sum(case((PurchaseOrderModel.status == 'PAID', 1), else_=0)).label('paid_count'),
            sqlfunc.coalesce(sqlfunc.sum(PurchaseOrderModel.paid_amount), 0).label('total_paid'),
        ).where(PurchaseOrderModel.tenant_id == tenant_id)
        
        po_result = await db.execute(po_query)
        po_stats = po_result.one()
        
        # PR stats
        pr_query = select(
            sqlfunc.count(PurchaseRequisitionModel.id).label('total_requisitions'),
            sqlfunc.sum(case((PurchaseRequisitionModel.status == 'PENDING', 1), else_=0)).label('pending_prs'),
            sqlfunc.sum(case((PurchaseRequisitionModel.status == 'APPROVED', 1), else_=0)).label('approved_prs'),
        ).where(PurchaseRequisitionModel.tenant_id == tenant_id)
        
        pr_result = await db.execute(pr_query)
        pr_stats = pr_result.one()
        
        # Supplier count
        supplier_query = select(sqlfunc.count(SupplierModel.id)).where(SupplierModel.tenant_id == tenant_id)
        supplier_result = await db.execute(supplier_query)
        supplier_count = supplier_result.scalar() or 0
        
        return {
            "total_orders": int(po_stats.total_orders or 0),
            "total_amount": float(po_stats.total_amount or 0),
            "draft_count": int(po_stats.draft_count or 0),
            "sent_count": int(po_stats.sent_count or 0),
            "received_count": int(po_stats.received_count or 0),
            "paid_count": int(po_stats.paid_count or 0),
            "total_paid": float(po_stats.total_paid or 0),
            "total_requisitions": int(pr_stats.total_requisitions or 0),
            "pending_prs": int(pr_stats.pending_prs or 0),
            "approved_prs": int(pr_stats.approved_prs or 0),
            "supplier_count": int(supplier_count),
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Stats Error: {str(e)}")


class PurchaseRequisitionLineCreate(BaseModel):
    item_id: Optional[str] = None
    item_name: str
    item_sku: Optional[str] = None
    quantity: float = 1
    uom: Optional[str] = None
    estimated_unit_price: float = 0
    notes: Optional[str] = None


class PurchaseRequisitionCreate(BaseModel):
    title: str
    priority: str = 'NORMAL'
    notes: Optional[str] = None
    lines: ListType[PurchaseRequisitionLineCreate] = []


@router.post("/requisitions", response_model=PurchaseRequisitionOut)
async def create_requisition(
    data: PurchaseRequisitionCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Create a new Purchase Requisition"""
    try:
        await set_tenant_context(db, str(tenant_id))
        
        # Generate code
        pr_code = f"PR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Calculate total
        total = sum(line.quantity * line.estimated_unit_price for line in data.lines)
        
        new_pr = PurchaseRequisitionModel(
            tenant_id=tenant_id,
            code=pr_code,
            title=data.title,
            priority=data.priority,
            notes=data.notes,
            total_amount=total,
            status='PENDING'
        )
        db.add(new_pr)
        await db.flush()
        
        # Create lines
        for i, line in enumerate(data.lines):
            pr_line = PurchaseRequisitionLineModel(
                tenant_id=tenant_id,
                pr_id=new_pr.id,
                line_number=i + 1,
                item_id=UUID(line.item_id) if line.item_id else None,
                item_name=line.item_name,
                item_sku=line.item_sku,
                quantity=line.quantity,
                uom=line.uom,
                estimated_unit_price=line.estimated_unit_price,
                estimated_total=line.quantity * line.estimated_unit_price,
                notes=line.notes
            )
            db.add(pr_line)
        
        await db.commit()
        
        # Reload with lines
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == new_pr.id
        ).options(selectinload(PurchaseRequisitionModel.lines))
        result = await db.execute(query)
        pr = result.scalar_one()
        
        lines_out = [PurchaseRequisitionLineOut(
            id=str(l.id), item_id=str(l.item_id) if l.item_id else None,
            item_name=l.item_name, item_sku=l.item_sku,
            quantity=float(l.quantity or 0), uom=l.uom,
            estimated_unit_price=float(l.estimated_unit_price or 0),
            estimated_total=float(l.estimated_total or 0), notes=l.notes
        ) for l in pr.lines]
        
        return PurchaseRequisitionOut(
            id=str(pr.id), code=pr.code, title=pr.title,
            status=pr.status, priority=pr.priority,
            total_amount=float(pr.total_amount or 0),
            notes=pr.notes, created_at=pr.created_at, lines=lines_out
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Create PR Error: {str(e)}")


@router.put("/requisitions/{id}", response_model=PurchaseRequisitionOut)
async def update_requisition(
    id: UUID,
    data: PurchaseRequisitionCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Edit a Purchase Requisition (only if PENDING)"""
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == id,
            PurchaseRequisitionModel.tenant_id == tenant_id
        ).options(selectinload(PurchaseRequisitionModel.lines))
        result = await db.execute(query)
        pr = result.scalar_one_or_none()
        
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found")
        if pr.status != 'PENDING':
            raise HTTPException(status_code=400, detail=f"Cannot edit PR with status: {pr.status}")
        
        pr.title = data.title
        pr.priority = data.priority
        pr.notes = data.notes
        
        # Delete existing lines
        for line in pr.lines:
            await db.delete(line)
        await db.flush()
        
        # Recreate lines
        total = 0
        for i, line in enumerate(data.lines):
            est_total = line.quantity * line.estimated_unit_price
            total += est_total
            pr_line = PurchaseRequisitionLineModel(
                tenant_id=tenant_id,
                pr_id=pr.id,
                line_number=i + 1,
                item_id=UUID(line.item_id) if line.item_id else None,
                item_name=line.item_name,
                item_sku=line.item_sku,
                quantity=line.quantity,
                uom=line.uom,
                estimated_unit_price=line.estimated_unit_price,
                estimated_total=est_total,
                notes=line.notes
            )
            db.add(pr_line)
        
        pr.total_amount = total
        await db.commit()
        
        # Reload
        query2 = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == pr.id
        ).options(selectinload(PurchaseRequisitionModel.lines))
        result2 = await db.execute(query2)
        pr = result2.scalar_one()
        
        lines_out = [PurchaseRequisitionLineOut(
            id=str(l.id), item_id=str(l.item_id) if l.item_id else None,
            item_name=l.item_name, item_sku=l.item_sku,
            quantity=float(l.quantity or 0), uom=l.uom,
            estimated_unit_price=float(l.estimated_unit_price or 0),
            estimated_total=float(l.estimated_total or 0), notes=l.notes
        ) for l in pr.lines]
        
        return PurchaseRequisitionOut(
            id=str(pr.id), code=pr.code, title=pr.title,
            status=pr.status, priority=pr.priority,
            total_amount=float(pr.total_amount or 0),
            notes=pr.notes, created_at=pr.created_at, lines=lines_out
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Update PR Error: {str(e)}")


@router.put("/requisitions/{id}/reject")
async def reject_requisition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Reject a Purchase Requisition"""
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == id,
            PurchaseRequisitionModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        pr = result.scalar_one_or_none()
        
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found")
        if pr.status != 'PENDING':
            raise HTTPException(status_code=400, detail=f"Cannot reject PR with status: {pr.status}")
        
        pr.status = 'REJECTED'
        await db.commit()
        return {"message": f"PR {pr.code} rejected", "status": "REJECTED"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Reject PR Error: {str(e)}")


@router.delete("/requisitions/{id}")
async def delete_requisition(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = DEFAULT_TENANT_ID
):
    """Delete a Purchase Requisition"""
    try:
        await set_tenant_context(db, str(tenant_id))
        query = select(PurchaseRequisitionModel).where(
            PurchaseRequisitionModel.id == id,
            PurchaseRequisitionModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        pr = result.scalar_one_or_none()
        
        if not pr:
            raise HTTPException(status_code=404, detail="Purchase Requisition not found")
        
        if pr.status == 'CONVERTED':
            raise HTTPException(status_code=400, detail="Cannot delete converted PR")
            
        await db.delete(pr)
        await db.commit()
        
        return {"message": f"PR {pr.code} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete PR Error: {str(e)}")
