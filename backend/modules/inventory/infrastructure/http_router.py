from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


from backend.core.database import get_db
from backend.core.dependencies import get_current_tenant, CurrentTenant
from backend.modules.inventory.domain.models import InventoryItemModel, WarehouseModel, InventoryStockModel, InventoryTransactionModel
from backend.modules.inventory.domain.entities import InventoryItem, InventoryItemBase, Warehouse, WarehouseBase

router = APIRouter(tags=["Inventory Management"])


# --- Warehouse Endpoints ---
@router.get("/warehouses", response_model=List[Warehouse])
async def list_warehouses(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WarehouseModel).where(WarehouseModel.tenant_id == tenant_id))
    return result.scalars().all()

@router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(data: WarehouseBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    # Create
    item = WarehouseModel(tenant_id=tenant_id, **data.dict())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

# --- Item Endpoints ---
# --- Stats Endpoint ---
@router.get("/stats")
async def get_inventory_stats(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get inventory statistics"""
    # Use the same robust query logic as list_items to avoid CTE issues
    query = (
        select(
            InventoryItemModel,
            func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
        )
        .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
        .where(InventoryItemModel.tenant_id == tenant_id)
        .group_by(InventoryItemModel.id)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    total_sku = len(rows)
    out_of_stock = 0
    warning_items = 0
    total_value = 0
    
    for row in rows:
        item = row[0]
        stock = row[1] or 0
        
        # Calculate Counts
        min_stock = float(item.min_stock or 0)
        if stock <= 0:
            out_of_stock += 1
        elif min_stock > 0 and stock <= min_stock:
            warning_items += 1
            
        # Calculate Value
        # Ensure cost_price is float/decimal
        cost = item.cost_price or 0
        total_value += (stock * cost)
        
    return {
        "total_sku": total_sku,
        "warning_items": warning_items,
        "out_of_stock": out_of_stock,
        "total_value": total_value
    }

# --- Item Endpoints ---
@router.get("/items")
async def list_items(
    search: str = None,
    category: str = None,
    limit: int = None,
    offset: int = 0,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List items with real calculated current stock. Supports pagination via limit/offset."""
    base_filter = [InventoryItemModel.tenant_id == tenant_id]
    if search:
        base_filter.append(InventoryItemModel.name.ilike(f"%{search}%"))
    if category:
        base_filter.append(InventoryItemModel.category == category)
    
    # Count total matching items
    count_query = select(func.count(InventoryItemModel.id)).where(*base_filter)
    total = (await db.execute(count_query)).scalar() or 0
    
    # Main query with stock aggregation
    query = (
        select(
            InventoryItemModel,
            func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
        )
        .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
        .where(*base_filter)
        .group_by(InventoryItemModel.id)
        .order_by(InventoryItemModel.name)
    )
    
    if limit is not None:
        query = query.limit(limit).offset(offset)
    
    result = await db.execute(query)
    rows = result.all()
    
    # Convert to Pydantic
    items = []
    for row in rows:
        item_model = row[0]
        qty = row[1]
        item_dto = InventoryItem.from_orm(item_model)
        item_dto.current_stock = qty
        items.append(item_dto)
    
    return {"items": items, "total": total}

@router.post("/items", response_model=InventoryItem)
async def create_item(data: InventoryItemBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    new_item = InventoryItemModel(tenant_id=tenant_id, **data.dict())
    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)
    return new_item

@router.get("/items/{id}", response_model=InventoryItem)
async def get_item(id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InventoryItemModel).where(InventoryItemModel.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.put("/items/{id}", response_model=InventoryItem)
async def update_item(id: UUID, data: InventoryItemBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(InventoryItemModel).where(InventoryItemModel.id == id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for key, value in data.dict().items():
        setattr(item, key, value)
    
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/items/{id}")
async def delete_inventory_item(id: UUID, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InventoryItemModel)
        .where(InventoryItemModel.id == id)
        .where(InventoryItemModel.tenant_id == tenant_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    await db.delete(item)
    await db.commit()
    
    return {"message": "Deleted successfully"}

from backend.modules.inventory.domain.entities import InventoryTransactionBase, InventoryTransaction

@router.get("/warehouses/default", response_model=Warehouse)
async def get_default_warehouse(tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Get or create default warehouse"""
    result = await db.execute(select(WarehouseModel).where(WarehouseModel.tenant_id == tenant_id).limit(1))
    wh = result.scalar_one_or_none()
    if not wh:
        wh = WarehouseModel(
            tenant_id=tenant_id,
            name="Kho Tổng",
            location="Main Location"
        )
        db.add(wh)
        await db.commit()
        await db.refresh(wh)
    return wh

@router.post("/transactions", response_model=InventoryTransaction)
async def create_transaction(data: InventoryTransactionBase, tenant_id: UUID = Depends(get_current_tenant), db: AsyncSession = Depends(get_db)):
    """Process stock movement (Import/Export)"""
    from backend.modules.inventory.domain.services import InventoryService
    
    try:
        txn = await InventoryService.create_transaction(
            db=db, 
            data=data, 
            tenant_id=tenant_id,
            unit_price=data.unit_price
        )
        await db.commit()
        await db.refresh(txn)
        return txn
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transactions/{transaction_id}/reverse", response_model=InventoryTransaction)
async def reverse_transaction(
    transaction_id: UUID,
    reason: str = None,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Reverse a transaction by creating an opposite transaction.
    - IMPORT → Creates EXPORT reversal
    - EXPORT → Creates IMPORT reversal
    - Updates stock accordingly
    - Marks original transaction as reversed
    """
    # 1. Find original transaction
    result = await db.execute(
        select(InventoryTransactionModel).where(
            InventoryTransactionModel.id == transaction_id,
            InventoryTransactionModel.tenant_id == tenant_id
        )
    )
    original_txn = result.scalar_one_or_none()
    
    if not original_txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # 2. Check if already reversed
    if original_txn.is_reversed:
        raise HTTPException(
            status_code=400, 
            detail="Transaction has already been reversed"
        )
    
    # 3. Determine reversal type
    if original_txn.transaction_type == "IMPORT":
        reversal_type = "EXPORT"
    elif original_txn.transaction_type == "EXPORT":
        reversal_type = "IMPORT"
    else:
        # For ADJUST, just create opposite quantity
        reversal_type = "ADJUST"
    
    # 4. Create reversal transaction
    reversal_txn = InventoryTransactionModel(
        tenant_id=tenant_id,
        item_id=original_txn.item_id,
        warehouse_id=original_txn.warehouse_id,
        transaction_type=reversal_type,
        quantity=original_txn.quantity,  # Same quantity, opposite type
        unit_price=original_txn.unit_price,
        reference_doc=f"REVERSAL-{original_txn.reference_doc or str(transaction_id)[:8]}",
        notes=reason or f"Reversal of transaction {transaction_id}",
        reverses_txn_id=original_txn.id
    )
    db.add(reversal_txn)
    await db.flush()  # Get reversal ID
    
    # 5. Update stock
    from backend.modules.inventory.domain.services import InventoryService
    
    # Find stock record
    stock_result = await db.execute(
        select(InventoryStockModel).where(
            InventoryStockModel.item_id == original_txn.item_id,
            InventoryStockModel.warehouse_id == original_txn.warehouse_id,
            InventoryStockModel.tenant_id == tenant_id
        )
    )
    stock = stock_result.scalar_one_or_none()
    
    if stock:
        # Apply reversal (opposite of original)
        if original_txn.transaction_type == "IMPORT":
            stock.quantity -= original_txn.quantity  # Undo import
        elif original_txn.transaction_type == "EXPORT":
            stock.quantity += original_txn.quantity  # Undo export
        else:
            # For ADJUST, reverse the adjustment
            stock.quantity -= original_txn.quantity
    
    # 6. Mark original as reversed
    original_txn.is_reversed = True
    original_txn.reversed_by_txn_id = reversal_txn.id
    
    await db.commit()
    await db.refresh(reversal_txn)
    
    return reversal_txn


@router.get("/transactions")
async def list_transactions(
    item_id: UUID = None,
    limit: int = 50,
    offset: int = 0,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List recent transactions with optional filter by item. Includes item_name."""
    base_where = [InventoryTransactionModel.tenant_id == tenant_id]
    if item_id:
        base_where.append(InventoryTransactionModel.item_id == item_id)
    
    # Count total
    from sqlalchemy import func
    count_q = select(func.count(InventoryTransactionModel.id)).where(*base_where)
    total = (await db.execute(count_q)).scalar() or 0
    
    query = (
        select(
            InventoryTransactionModel,
            InventoryItemModel.name.label('item_name')
        )
        .outerjoin(InventoryItemModel, InventoryTransactionModel.item_id == InventoryItemModel.id)
        .where(*base_where)
    )
    
    query = query.order_by(InventoryTransactionModel.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    transactions = []
    for row in rows:
        txn = row[0]
        txn_dict = {
            "id": str(txn.id),
            "tenant_id": str(txn.tenant_id),
            "item_id": str(txn.item_id),
            "item_name": row[1] or f"Item {str(txn.item_id)[:8]}",
            "warehouse_id": str(txn.warehouse_id),
            "transaction_type": txn.transaction_type,
            "quantity": float(txn.quantity),
            "unit_price": float(txn.unit_price) if txn.unit_price else None,
            "reference_doc": txn.reference_doc,
            "notes": txn.notes,
            "is_reversed": txn.is_reversed,
            "reversed_by_txn_id": str(txn.reversed_by_txn_id) if txn.reversed_by_txn_id else None,
            "reverses_txn_id": str(txn.reverses_txn_id) if txn.reverses_txn_id else None,
            "lot_id": str(txn.lot_id) if txn.lot_id else None,
            "created_at": txn.created_at.isoformat() if txn.created_at else None,
        }
        transactions.append(txn_dict)
    
    return {"transactions": transactions, "total": total}


# ============ LOT TRACKING ============

from backend.modules.inventory.domain.models import InventoryLotModel
from backend.modules.inventory.domain.entities import InventoryLot, InventoryLotCreate, InventoryLotBase
from typing import Optional

@router.get("/lots")
async def list_lots(
    item_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    status: str = "ACTIVE",
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """List inventory lots with optional filters, including item name"""
    query = (
        select(InventoryLotModel, InventoryItemModel.name.label("item_name"))
        .join(InventoryItemModel, InventoryLotModel.item_id == InventoryItemModel.id)
        .where(
            InventoryLotModel.tenant_id == tenant_id,
            InventoryLotModel.status == status
        )
    )
    
    if item_id:
        query = query.where(InventoryLotModel.item_id == item_id)
    if warehouse_id:
        query = query.where(InventoryLotModel.warehouse_id == warehouse_id)
    
    query = query.order_by(InventoryLotModel.received_date.asc())  # FIFO order
    
    result = await db.execute(query)
    rows = result.all()
    
    # Build response with item_name included
    lots_response = []
    for lot, item_name in rows:
        lot_dict = {
            "id": str(lot.id),
            "tenant_id": str(lot.tenant_id),
            "item_id": str(lot.item_id),
            "warehouse_id": str(lot.warehouse_id),
            "lot_number": lot.lot_number,
            "batch_code": lot.batch_code,
            "manufacture_date": str(lot.manufacture_date) if lot.manufacture_date else None,
            "expiry_date": str(lot.expiry_date) if lot.expiry_date else None,
            "received_date": str(lot.received_date) if lot.received_date else None,
            "initial_quantity": float(lot.initial_quantity),
            "remaining_quantity": float(lot.remaining_quantity),
            "unit_cost": float(lot.unit_cost or 0),
            "status": lot.status,
            "reference_doc": lot.reference_doc,
            "supplier_id": str(lot.supplier_id) if lot.supplier_id else None,
            "notes": lot.notes,
            "created_at": str(lot.created_at) if lot.created_at else None,
            "updated_at": str(lot.updated_at) if lot.updated_at else None,
            "item_name": item_name,
        }
        lots_response.append(lot_dict)
    
    return lots_response


@router.post("/lots", response_model=InventoryLot)
async def create_lot(
    data: InventoryLotCreate,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Create a new inventory lot (for incoming stock)"""
    # Check if lot number already exists
    existing = await db.execute(
        select(InventoryLotModel).where(
            InventoryLotModel.tenant_id == tenant_id,
            InventoryLotModel.item_id == data.item_id,
            InventoryLotModel.lot_number == data.lot_number
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Lot number already exists for this item")
    
    lot = InventoryLotModel(
        tenant_id=tenant_id,
        item_id=data.item_id,
        warehouse_id=data.warehouse_id,
        lot_number=data.lot_number,
        batch_code=data.batch_code,
        manufacture_date=data.manufacture_date,
        expiry_date=data.expiry_date,
        initial_quantity=data.initial_quantity,
        remaining_quantity=data.initial_quantity,  # Initially same as initial
        unit_cost=data.unit_cost,
        reference_doc=data.reference_doc,
        notes=data.notes
    )
    
    db.add(lot)
    await db.commit()
    await db.refresh(lot)
    
    return lot


@router.get("/lots/{lot_id}", response_model=InventoryLot)
async def get_lot(
    lot_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get lot details"""
    result = await db.execute(
        select(InventoryLotModel).where(
            InventoryLotModel.id == lot_id,
            InventoryLotModel.tenant_id == tenant_id
        )
    )
    lot = result.scalar_one_or_none()
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return lot


@router.get("/items/{item_id}/lots/fifo")
async def get_fifo_lots(
    item_id: UUID,
    quantity_needed: Optional[float] = None,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get available lots for an item in FIFO order (oldest first).
    Optionally calculate which lots to use for a given quantity.
    """
    query = (
        select(InventoryLotModel)
        .where(
            InventoryLotModel.tenant_id == tenant_id,
            InventoryLotModel.item_id == item_id,
            InventoryLotModel.status == 'ACTIVE',
            InventoryLotModel.remaining_quantity > 0
        )
        .order_by(InventoryLotModel.received_date.asc())  # FIFO
    )
    
    result = await db.execute(query)
    lots = result.scalars().all()
    
    fifo_info = []
    total_available = 0
    
    for lot in lots:
        lot_info = {
            "lot_id": str(lot.id),
            "lot_number": lot.lot_number,
            "remaining_quantity": float(lot.remaining_quantity),
            "expiry_date": str(lot.expiry_date) if lot.expiry_date else None,
            "unit_cost": float(lot.unit_cost or 0),
            "received_date": str(lot.received_date)
        }
        fifo_info.append(lot_info)
        total_available += float(lot.remaining_quantity)
    
    response = {
        "item_id": str(item_id),
        "total_available": total_available,
        "lot_count": len(fifo_info),
        "lots": fifo_info
    }
    
    # Calculate allocation if quantity needed
    if quantity_needed:
        allocation = []
        remaining_needed = quantity_needed
        
        for lot in fifo_info:
            if remaining_needed <= 0:
                break
            
            take_qty = min(lot["remaining_quantity"], remaining_needed)
            if take_qty > 0:
                allocation.append({
                    "lot_id": lot["lot_id"],
                    "lot_number": lot["lot_number"],
                    "quantity": take_qty,
                    "quantity_to_use": take_qty,
                    "available": lot["remaining_quantity"],
                    "unit_cost": lot["unit_cost"]
                })
                remaining_needed -= take_qty
        
        response["allocation"] = {
            "quantity_needed": quantity_needed,
            "quantity_fulfilled": quantity_needed - remaining_needed,
            "shortfall": max(0, remaining_needed),
            "lots_to_use": allocation
        }
    
    return response


@router.get("/lots-expiring")
async def get_expiring_lots(
    days: int = 30,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Get lots expiring within specified days"""
    from datetime import datetime, timedelta
    
    expiry_threshold = datetime.utcnow().date() + timedelta(days=days)
    
    query = (
        select(InventoryLotModel, InventoryItemModel)
        .join(InventoryItemModel, InventoryLotModel.item_id == InventoryItemModel.id)
        .where(
            InventoryLotModel.tenant_id == tenant_id,
            InventoryLotModel.status == 'ACTIVE',
            InventoryLotModel.remaining_quantity > 0,
            InventoryLotModel.expiry_date != None,
            InventoryLotModel.expiry_date <= expiry_threshold
        )
        .order_by(InventoryLotModel.expiry_date.asc())
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    expiring = []
    for row in rows:
        lot, item = row
        days_until = (lot.expiry_date.date() - datetime.utcnow().date()).days if lot.expiry_date else None
        expiring.append({
            "lot_id": str(lot.id),
            "lot_number": lot.lot_number,
            "item_id": str(item.id),
            "item_name": item.name,
            "item_sku": item.sku,
            "remaining_quantity": float(lot.remaining_quantity),
            "expiry_date": str(lot.expiry_date) if lot.expiry_date else None,
            "days_until_expiry": days_until,
            "status": "CRITICAL" if days_until and days_until <= 7 else "WARNING"
        })
    
    return {
        "threshold_days": days,
        "total_expiring": len(expiring),
        "critical_count": len([e for e in expiring if e["status"] == "CRITICAL"]),
        "lots": expiring
    }


# ============ EXPORT WITH LOT DEDUCTION ============

from backend.modules.inventory.domain.entities import ExportWithLotsRequest

@router.post("/export-with-lots")
async def export_with_lots(
    data: ExportWithLotsRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Export stock with lot deduction (Hybrid: Auto-FIFO or Manual lot selection).
    - If lot_allocations is None/empty → auto FIFO deduction
    - If lot_allocations is provided → deduct from specified lots
    Returns transaction details and lot deduction summary.
    """
    from backend.modules.inventory.domain.services import InventoryService
    from backend.modules.inventory.domain.entities import InventoryTransactionBase
    from decimal import Decimal
    
    try:
        item = await db.get(InventoryItemModel, data.item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        reason_text = data.reason or "Xuất kho"
        notes_text = data.notes or f"{reason_text} thủ công"
        
        deducted_lots = []
        
        if data.lot_allocations and len(data.lot_allocations) > 0:
            # ===== MANUAL LOT ALLOCATION =====
            total_allocated = sum(a.quantity for a in data.lot_allocations)
            if total_allocated != data.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Tổng số lượng phân bổ ({total_allocated}) phải bằng số lượng xuất ({data.quantity})"
                )
            
            for alloc in data.lot_allocations:
                lot = await db.get(InventoryLotModel, alloc.lot_id)
                if not lot or lot.tenant_id != tenant_id:
                    raise HTTPException(status_code=404, detail=f"Lot {alloc.lot_id} not found")
                if lot.remaining_quantity < alloc.quantity:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Lot {lot.lot_number}: tồn {lot.remaining_quantity}, yêu cầu {alloc.quantity}"
                    )
                
                lot.remaining_quantity -= alloc.quantity
                if lot.remaining_quantity <= 0:
                    lot.status = "DEPLETED"
                
                deducted_lots.append({
                    "lot_id": str(lot.id),
                    "lot_number": lot.lot_number,
                    "quantity_deducted": float(alloc.quantity),
                    "remaining": float(lot.remaining_quantity)
                })
            
            # Create the EXPORT transaction
            txn_data = InventoryTransactionBase(
                item_id=data.item_id,
                warehouse_id=data.warehouse_id,
                transaction_type="EXPORT",
                quantity=data.quantity,
                reference_doc=f"EXPORT-MANUAL",
                notes=notes_text,
            )
            txn = await InventoryService.create_transaction(
                db=db, data=txn_data, tenant_id=tenant_id
            )
        else:
            # ===== AUTO FIFO DEDUCTION =====
            txn_data = InventoryTransactionBase(
                item_id=data.item_id,
                warehouse_id=data.warehouse_id,
                transaction_type="EXPORT",
                quantity=data.quantity,
                reference_doc=f"EXPORT-FIFO",
                notes=notes_text,
            )
            txn = await InventoryService.create_transaction(
                db=db, data=txn_data, tenant_id=tenant_id,
                auto_deduct_lots=True
            )
            
            # Query updated lots for response
            lots_q = select(InventoryLotModel).where(
                InventoryLotModel.item_id == data.item_id,
                InventoryLotModel.tenant_id == tenant_id,
            ).order_by(InventoryLotModel.created_at.asc())
            lots_result = await db.execute(lots_q)
            for lot in lots_result.scalars().all():
                deducted_lots.append({
                    "lot_id": str(lot.id),
                    "lot_number": lot.lot_number,
                    "remaining": float(lot.remaining_quantity),
                    "status": lot.status
                })
        
        await db.commit()
        
        return {
            "success": True,
            "transaction_id": str(txn.id),
            "item_name": item.name,
            "quantity_exported": float(data.quantity),
            "reason": reason_text,
            "method": "MANUAL" if data.lot_allocations else "FIFO",
            "lots": deducted_lots,
            "message": f"Xuất kho thành công: {float(data.quantity)} {item.uom} ({reason_text})"
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


# ============ MATERIAL PREPARATION (GAP-4.1) ============

from backend.modules.inventory.domain.entities import (
    MaterialPreparationRequest, MaterialPreparationResult, MaterialItemResult
)

@router.post("/prepare-materials", response_model=MaterialPreparationResult)
async def prepare_materials(
    data: MaterialPreparationRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Deduct materials from inventory for order preparation.
    Uses FIFO lot deduction and calculates actual COGS per item.
    Called by Order module during production workflow.
    """
    from backend.modules.inventory.domain.services import InventoryService
    from backend.modules.inventory.domain.entities import InventoryTransactionBase
    from decimal import Decimal
    
    results = []
    total_cogs = Decimal(0)
    items_fulfilled = 0
    items_with_shortfall = 0
    
    try:
        for mat_item in data.items:
            item = await db.get(InventoryItemModel, mat_item.item_id)
            if not item:
                results.append(MaterialItemResult(
                    item_id=str(mat_item.item_id),
                    item_name=f"Unknown ({str(mat_item.item_id)[:8]})",
                    requested_qty=float(mat_item.quantity),
                    deducted_qty=0,
                    shortfall=float(mat_item.quantity),
                    lots_used=[],
                    actual_cogs=0
                ))
                items_with_shortfall += 1
                continue
            
            # Check stock availability
            stock_result = await db.execute(
                select(InventoryStockModel).where(
                    InventoryStockModel.item_id == mat_item.item_id,
                    InventoryStockModel.warehouse_id == data.warehouse_id,
                    InventoryStockModel.tenant_id == tenant_id
                )
            )
            stock = stock_result.scalar_one_or_none()
            current_qty = Decimal(str(stock.quantity)) if stock else Decimal(0)
            
            # Calculate how much we can actually deduct
            deduct_qty = min(mat_item.quantity, current_qty)
            shortfall = max(Decimal(0), mat_item.quantity - current_qty)
            
            lots_used = []
            item_cogs = Decimal(0)
            
            if deduct_qty > 0:
                # Create EXPORT transaction with FIFO lot deduction
                txn_data = InventoryTransactionBase(
                    item_id=mat_item.item_id,
                    warehouse_id=data.warehouse_id,
                    transaction_type="EXPORT",
                    quantity=deduct_qty,
                    reference_doc=f"ORDER-{data.order_id}" if data.order_id else "MATERIAL-PREP",
                    notes=f"Chuẩn bị nguyên liệu cho đơn hàng {data.order_id or ''}"
                )
                
                txn = await InventoryService.create_transaction(
                    db=db,
                    data=txn_data,
                    tenant_id=tenant_id,
                    auto_deduct_lots=True
                )
                
                # Get actual COGS from the transaction
                item_cogs = Decimal(str(txn.unit_price or 0)) * deduct_qty
                
                # Collect lot deduction info
                # Query lots that were recently modified
                lots_q = select(InventoryLotModel).where(
                    InventoryLotModel.item_id == mat_item.item_id,
                    InventoryLotModel.tenant_id == tenant_id,
                    InventoryLotModel.warehouse_id == data.warehouse_id,
                ).order_by(InventoryLotModel.received_date.asc())
                lots_result = await db.execute(lots_q)
                for lot in lots_result.scalars().all():
                    lots_used.append({
                        "lot_id": str(lot.id),
                        "lot_number": lot.lot_number,
                        "remaining": float(lot.remaining_quantity),
                        "status": lot.status,
                    })
            
            total_cogs += item_cogs
            
            if shortfall > 0:
                items_with_shortfall += 1
            else:
                items_fulfilled += 1
            
            results.append(MaterialItemResult(
                item_id=str(mat_item.item_id),
                item_name=item.name,
                requested_qty=float(mat_item.quantity),
                deducted_qty=float(deduct_qty),
                shortfall=float(shortfall),
                lots_used=lots_used,
                actual_cogs=float(item_cogs)
            ))
        
        await db.commit()
        
        all_fulfilled = items_with_shortfall == 0
        
        return MaterialPreparationResult(
            success=all_fulfilled,
            order_id=data.order_id,
            total_items=len(data.items),
            items_fulfilled=items_fulfilled,
            items_with_shortfall=items_with_shortfall,
            results=results,
            total_cogs=float(total_cogs),
            message=f"{'Hoàn tất' if all_fulfilled else 'Một phần'}: {items_fulfilled}/{len(data.items)} nguyên liệu đã xuất kho"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Material preparation error: {str(e)}")


# ============ PHASE 12.3: LOW STOCK ALERTS & AUTO-REORDER ============

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LowStockItem(BaseModel):
    """Low stock item response model"""
    item_id: str
    sku: str
    name: str
    category: Optional[str]
    current_stock: float
    min_stock: float
    shortfall: float
    uom: str
    status: str  # CRITICAL (0 stock), WARNING (below min), LOW (approaching min)
    last_purchase_price: Optional[float]
    suggested_order_qty: float

class LowStockResponse(BaseModel):
    """Low stock check response"""
    checked_at: str
    total_items_checked: int
    critical_count: int
    warning_count: int
    low_count: int
    items: List[LowStockItem]

class AutoReorderRequest(BaseModel):
    """Request to auto-create purchase requisition"""
    item_ids: Optional[List[str]] = None  # None = all low stock items
    multiplier: float = 1.5  # Order qty = shortfall * multiplier

class AutoReorderResult(BaseModel):
    """Result of auto-reorder action"""
    success: bool
    pr_id: Optional[str]
    pr_code: Optional[str]
    items_count: int
    total_amount: float
    message: str


@router.get("/low-stock", response_model=LowStockResponse)
async def get_low_stock_items(
    include_zero: bool = True,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get inventory items with stock below minimum threshold.
    Used for Low Stock Alerts dashboard widget.
    
    Status levels:
    - CRITICAL: current_stock = 0
    - WARNING: current_stock < min_stock
    - LOW: current_stock <= min_stock * 1.2 (approaching minimum)
    """
    query = (
        select(
            InventoryItemModel,
            func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
        )
        .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
        .where(
            InventoryItemModel.tenant_id == tenant_id,
            InventoryItemModel.is_active == True
        )
        .group_by(InventoryItemModel.id)
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    low_stock_items = []
    critical_count = 0
    warning_count = 0
    low_count = 0
    
    for row in rows:
        item = row[0]
        current_stock = float(row[1] or 0)
        min_stock = float(item.min_stock or 0)
        
        # Skip if min_stock not configured
        if min_stock <= 0:
            continue
        
        # Determine status
        if current_stock <= 0:
            status = "CRITICAL"
            critical_count += 1
        elif current_stock < min_stock:
            status = "WARNING"
            warning_count += 1
        elif current_stock <= min_stock * 1.2:
            status = "LOW"
            low_count += 1
        else:
            continue  # Stock is OK
        
        # Skip zero stock items if not requested
        if current_stock <= 0 and not include_zero:
            continue
        
        shortfall = max(0, min_stock - current_stock)
        suggested_qty = shortfall * 1.5 if shortfall > 0 else min_stock
        
        low_stock_items.append(LowStockItem(
            item_id=str(item.id),
            sku=item.sku,
            name=item.name,
            category=item.category,
            current_stock=current_stock,
            min_stock=min_stock,
            shortfall=shortfall,
            uom=item.uom,
            status=status,
            last_purchase_price=float(item.latest_purchase_price or item.cost_price or 0),
            suggested_order_qty=suggested_qty
        ))
    
    # Sort by status priority (CRITICAL > WARNING > LOW)
    status_order = {"CRITICAL": 0, "WARNING": 1, "LOW": 2}
    low_stock_items.sort(key=lambda x: status_order.get(x.status, 3))
    
    return LowStockResponse(
        checked_at=datetime.utcnow().isoformat(),
        total_items_checked=len(rows),
        critical_count=critical_count,
        warning_count=warning_count,
        low_count=low_count,
        items=low_stock_items
    )


@router.post("/low-stock/auto-reorder", response_model=AutoReorderResult)
async def trigger_auto_reorder(
    request: AutoReorderRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Auto-create Purchase Requisition for low stock items.
    
    - If item_ids is None, process all low stock items
    - Creates a single PR with multiple lines
    - Quantity = shortfall * multiplier (default 1.5x)
    """
    # Get low stock items
    low_stock_resp = await get_low_stock_items(include_zero=True, tenant_id=tenant_id, db=db)
    
    if not low_stock_resp.items:
        return AutoReorderResult(
            success=False,
            pr_id=None,
            pr_code=None,
            items_count=0,
            total_amount=0,
            message="Không có item nào cần đặt hàng"
        )
    
    # Filter items if specific IDs provided
    items_to_order = low_stock_resp.items
    if request.item_ids:
        items_to_order = [i for i in items_to_order if i.item_id in request.item_ids]
    
    if not items_to_order:
        return AutoReorderResult(
            success=False,
            pr_id=None,
            pr_code=None,
            items_count=0,
            total_amount=0,
            message="Không có item nào trong danh sách cần đặt hàng"
        )
    
    # Create Purchase Requisition
    try:
        from backend.modules.procurement.domain.models import (
            PurchaseRequisitionModel, PurchaseRequisitionLineModel
        )
        
        # Generate PR code
        pr_code = f"PR-AUTO-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create PR header
        pr = PurchaseRequisitionModel(
            tenant_id=tenant_id,
            code=pr_code,
            title=f"Auto-Reorder - Low Stock Alert {datetime.now().strftime('%d/%m/%Y')}",
            status="PENDING",
            priority="HIGH",
            requested_by=None,  # System generated
            notes=f"Tự động tạo từ Low Stock Alert. {len(items_to_order)} items.",
        )
        db.add(pr)
        await db.flush()  # Get PR ID
        
        total_amount = 0
        
        # Create PR lines
        for idx, item in enumerate(items_to_order, 1):
            order_qty = item.shortfall * request.multiplier
            unit_price = item.last_purchase_price or 0
            line_total = order_qty * unit_price
            total_amount += line_total
            
            pr_line = PurchaseRequisitionLineModel(
                tenant_id=tenant_id,
                pr_id=pr.id,
                line_number=idx,
                item_id=UUID(item.item_id),
                item_name=item.name,
                item_sku=item.sku,
                quantity=order_qty,
                uom=item.uom,
                estimated_unit_price=unit_price,
                estimated_total=line_total,
                notes=f"Current: {item.current_stock}, Min: {item.min_stock}, Shortfall: {item.shortfall}"
            )
            db.add(pr_line)
        
        # Update PR total
        pr.total_amount = total_amount
        
        await db.commit()
        await db.refresh(pr)
        
        return AutoReorderResult(
            success=True,
            pr_id=str(pr.id),
            pr_code=pr.code,
            items_count=len(items_to_order),
            total_amount=total_amount,
            message=f"Đã tạo Purchase Requisition {pr.code} với {len(items_to_order)} items"
        )
        
    except ImportError as e:
        # Procurement module not available
        return AutoReorderResult(
            success=False,
            pr_id=None,
            pr_code=None,
            items_count=len(items_to_order),
            total_amount=0,
            message=f"Procurement module không khả dụng: {str(e)}"
        )
    except Exception as e:
        await db.rollback()
        return AutoReorderResult(
            success=False,
            pr_id=None,
            pr_code=None,
            items_count=0,
            total_amount=0,
            message=f"Lỗi tạo PR: {str(e)}"
        )


@router.get("/alerts/summary")
async def get_inventory_alerts_summary(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get combined inventory alerts summary for dashboard widget.
    Includes: Low Stock, Expiring Soon, Out of Stock
    """
    # Get low stock data
    low_stock = await get_low_stock_items(include_zero=True, tenant_id=tenant_id, db=db)
    
    # Get expiring lots (7 days)
    expiring = await get_expiring_lots(days=7, tenant_id=tenant_id, db=db)
    
    return {
        "checked_at": datetime.utcnow().isoformat(),
        "low_stock": {
            "critical": low_stock.critical_count,
            "warning": low_stock.warning_count,
            "low": low_stock.low_count,
            "total": low_stock.critical_count + low_stock.warning_count + low_stock.low_count
        },
        "expiring": {
            "critical": expiring["critical_count"],
            "total": expiring["total_expiring"]
        },
        "requires_attention": (
            low_stock.critical_count > 0 or 
            expiring["critical_count"] > 0
        ),
        "quick_actions": [
            {
                "action": "auto_reorder",
                "label": "Tự động đặt hàng",
                "enabled": low_stock.critical_count + low_stock.warning_count > 0,
                "endpoint": "/api/v1/inventory/low-stock/auto-reorder"
            },
            {
                "action": "view_expiring",
                "label": "Xem sắp hết hạn",
                "enabled": expiring["total_expiring"] > 0,
                "endpoint": "/api/v1/inventory/lots/expiring"
            }
        ]
    }


# ============ E5: STOCK AVAILABILITY CHECK (Quote Integration) ============

class StockCheckRequest(BaseModel):
    """Batch stock-check request"""
    item_ids: List[str]

class StockCheckItem(BaseModel):
    """Stock availability for a single item"""
    item_id: str
    item_name: str
    uom: str
    current_stock: float
    min_stock: float
    available: bool
    status: str  # IN_STOCK, LOW_STOCK, OUT_OF_STOCK


@router.post("/stock-check")
async def check_stock_availability(
    request: StockCheckRequest,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    E5: Batch stock availability check.
    Used by Quote module to verify stock when adding items.
    Reference: PRD-luong-nghiep-vu-kho-hang-v2.md (E5)
    """
    from uuid import UUID as UUIDType

    item_uuids = []
    for item_id_str in request.item_ids:
        try:
            item_uuids.append(UUIDType(item_id_str))
        except ValueError:
            continue

    if not item_uuids:
        return {"items": [], "total_checked": 0}

    result = await db.execute(
        select(
            InventoryItemModel,
            func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('current_stock')
        )
        .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
        .where(
            InventoryItemModel.tenant_id == tenant_id,
            InventoryItemModel.id.in_(item_uuids),
        )
        .group_by(InventoryItemModel.id)
    )
    rows = result.all()

    items = []
    for row in rows:
        item = row[0]
        stock = float(row.current_stock or 0)
        min_s = float(item.min_stock or 0)

        if stock <= 0:
            status = "OUT_OF_STOCK"
            available = False
        elif min_s > 0 and stock <= min_s:
            status = "LOW_STOCK"
            available = True
        else:
            status = "IN_STOCK"
            available = True

        items.append(StockCheckItem(
            item_id=str(item.id),
            item_name=item.name,
            uom=item.uom or "kg",
            current_stock=stock,
            min_stock=min_s,
            available=available,
            status=status,
        ))

    return {"items": items, "total_checked": len(items)}


# ============ E6: MATERIAL FORECAST (Calendar Integration) ============

@router.get("/forecast")
async def get_material_forecast(
    days: int = 7,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
):
    """
    E6: Forecast material needs from upcoming orders.
    Joins orders + recipes to predict inventory consumption.
    Reference: PRD-luong-nghiep-vu-kho-hang-v2.md (E6)
    """
    from backend.modules.order.domain.models import OrderModel, OrderItemModel
    
    now = datetime.now()
    forecast_end = now + timedelta(days=days)
    
    try:
        # Get upcoming orders (not completed/cancelled)
        orders_result = await db.execute(
            select(OrderModel)
            .where(
                OrderModel.tenant_id == tenant_id,
                OrderModel.status.in_(['CONFIRMED', 'IN_PROGRESS', 'PENDING']),
                OrderModel.event_date >= now,
                OrderModel.event_date <= forecast_end,
            )
            .order_by(OrderModel.event_date)
        )
        orders = orders_result.scalars().all()
        
        if not orders:
            return {
                "forecast_days": days,
                "total_orders": 0,
                "materials_needed": [],
                "message": "Không có đơn hàng sắp tới trong khoảng thời gian"
            }
        
        # Get order items for these orders
        order_ids = [o.id for o in orders]
        items_result = await db.execute(
            select(OrderItemModel)
            .where(OrderItemModel.order_id.in_(order_ids))
        )
        order_items = items_result.scalars().all()
        
        # Try to get recipe mappings
        try:
            from backend.modules.menu.domain.models import RecipeModel
            
            # Aggregate quantities by menu item
            menu_qty = {}
            for oi in order_items:
                mid = str(oi.menu_item_id) if oi.menu_item_id else None
                if mid:
                    menu_qty[mid] = menu_qty.get(mid, 0) + float(oi.quantity or 1)
            
            # Get recipes for these menu items
            if menu_qty:
                from uuid import UUID as UUIDType
                menu_uuids = [UUIDType(k) for k in menu_qty.keys()]
                recipes_result = await db.execute(
                    select(RecipeModel)
                    .where(RecipeModel.menu_item_id.in_(menu_uuids))
                )
                recipes = recipes_result.scalars().all()
                
                # Calculate required materials 
                material_needs = {}
                for r in recipes:
                    inv_id = str(r.ingredient_id)
                    order_multiplier = menu_qty.get(str(r.menu_item_id), 1)
                    qty_needed = float(r.quantity or 0) * order_multiplier
                    
                    if inv_id in material_needs:
                        material_needs[inv_id] += qty_needed
                    else:
                        material_needs[inv_id] = qty_needed
                
                # Get current stock for these materials
                if material_needs:
                    inv_uuids = [UUIDType(k) for k in material_needs.keys()]
                    stock_result = await db.execute(
                        select(
                            InventoryItemModel,
                            func.coalesce(func.sum(InventoryStockModel.quantity), 0).label('stock')
                        )
                        .outerjoin(InventoryStockModel, InventoryItemModel.id == InventoryStockModel.item_id)
                        .where(InventoryItemModel.id.in_(inv_uuids))
                        .group_by(InventoryItemModel.id)
                    )
                    
                    materials = []
                    for row in stock_result.all():
                        item = row[0]
                        current = float(row.stock or 0)
                        needed = material_needs.get(str(item.id), 0)
                        shortfall = max(0, needed - current)
                        
                        materials.append({
                            "item_id": str(item.id),
                            "item_name": item.name,
                            "uom": item.uom or "kg",
                            "needed": round(needed, 2),
                            "current_stock": round(current, 2),
                            "shortfall": round(shortfall, 2),
                            "status": "SUFFICIENT" if shortfall == 0 else "INSUFFICIENT"
                        })
                    
                    materials.sort(key=lambda x: x["shortfall"], reverse=True)
                    
                    return {
                        "forecast_days": days,
                        "total_orders": len(orders),
                        "materials_needed": materials,
                    }
        except ImportError:
            pass
        
        return {
            "forecast_days": days,
            "total_orders": len(orders),
            "materials_needed": [],
            "message": "Recipe data not available for forecast"
        }
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        return {"forecast_days": days, "total_orders": 0, "materials_needed": [], "error": str(e)}


# ============ E8: INVENTORY ANALYTICS (Turnover & Waste) ============

@router.get("/analytics")
async def get_inventory_analytics(
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
    months: int = 3,
):
    """
    E8: Inventory turnover and waste analytics.
    Reference: PRD-luong-nghiep-vu-kho-hang-v2.md (E8)
    """
    now = datetime.now()
    period_start = now - timedelta(days=months * 30)
    
    # Total imports in period
    imports_result = await db.execute(
        select(
            func.sum(InventoryTransactionModel.quantity * func.coalesce(InventoryTransactionModel.unit_price, 0)).label('import_value'),
            func.sum(InventoryTransactionModel.quantity).label('import_qty'),
        )
        .where(
            InventoryTransactionModel.tenant_id == tenant_id,
            InventoryTransactionModel.transaction_type == 'IMPORT',
            InventoryTransactionModel.is_reversed == False,
            InventoryTransactionModel.created_at >= period_start,
        )
    )
    imp = imports_result.one()
    
    # Total exports in period
    exports_result = await db.execute(
        select(
            func.sum(InventoryTransactionModel.quantity * func.coalesce(InventoryTransactionModel.unit_price, 0)).label('export_value'),
            func.sum(InventoryTransactionModel.quantity).label('export_qty'),
        )
        .where(
            InventoryTransactionModel.tenant_id == tenant_id,
            InventoryTransactionModel.transaction_type == 'EXPORT',
            InventoryTransactionModel.is_reversed == False,
            InventoryTransactionModel.created_at >= period_start,
        )
    )
    exp = exports_result.one()
    
    # Expired/damaged lots (waste)
    waste_result = await db.execute(
        select(
            func.count(InventoryLotModel.id).label('waste_lots'),
            func.sum(InventoryLotModel.remaining_quantity * InventoryLotModel.unit_cost).label('waste_value'),
        )
        .where(
            InventoryLotModel.tenant_id == tenant_id,
            InventoryLotModel.status.in_(['EXPIRED', 'DAMAGED']),
            InventoryLotModel.updated_at >= period_start,
        )
    )
    waste = waste_result.one()
    
    # Current stock value
    stock_val_result = await db.execute(
        select(
            func.sum(InventoryStockModel.quantity * func.coalesce(InventoryItemModel.cost_price, 0)).label('total_value')
        )
        .join(InventoryItemModel, InventoryStockModel.item_id == InventoryItemModel.id)
        .where(InventoryItemModel.tenant_id == tenant_id)
    )
    current_val = float(stock_val_result.scalar() or 0)
    
    # Turnover ratio = COGS / Average Inventory
    export_value = float(exp.export_value or 0)
    import_value = float(imp.import_value or 0)
    avg_inventory = (import_value + current_val) / 2 if (import_value + current_val) > 0 else 1
    turnover_ratio = export_value / avg_inventory if avg_inventory > 0 else 0
    
    waste_value = float(waste.waste_value or 0)
    waste_percent = (waste_value / import_value * 100) if import_value > 0 else 0
    
    return {
        "period_months": months,
        "imports": {
            "total_value": import_value,
            "total_qty": float(imp.import_qty or 0),
        },
        "exports": {
            "total_value": export_value,
            "total_qty": float(exp.export_qty or 0),
        },
        "waste": {
            "lots_count": int(waste.waste_lots or 0),
            "value": waste_value,
            "percent_of_imports": round(waste_percent, 2),
        },
        "turnover": {
            "ratio": round(turnover_ratio, 2),
            "avg_inventory_value": round(avg_inventory, 2),
            "current_stock_value": current_val,
        },
    }



# ============ PDF RECEIPT GENERATION ============


from fastapi.responses import Response

@router.get("/transactions/{txn_id}/receipt-pdf")
async def get_transaction_receipt_pdf(
    txn_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """Generate a PDF receipt for an inventory transaction."""
    from backend.modules.inventory.infrastructure.pdf_receipt import generate_receipt_pdf
    
    txn = await db.get(InventoryTransactionModel, txn_id)
    if not txn or txn.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    item = await db.get(InventoryItemModel, txn.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    warehouse_name = "Kho mặc định"
    wh_query = select(WarehouseModel).where(WarehouseModel.id == txn.warehouse_id)
    wh_result = await db.execute(wh_query)
    warehouse = wh_result.scalar_one_or_none()
    if warehouse:
        warehouse_name = warehouse.name
    
    lots_data = []
    if txn.transaction_type == "EXPORT":
        lots_q = select(InventoryLotModel).where(
            InventoryLotModel.item_id == txn.item_id,
            InventoryLotModel.tenant_id == tenant_id,
        ).order_by(InventoryLotModel.created_at.asc())
        lots_result = await db.execute(lots_q)
        for lot in lots_result.scalars().all():
            lots_data.append({
                "lot_id": str(lot.id),
                "lot_number": lot.lot_number,
                "remaining": float(lot.remaining_quantity),
                "status": lot.status,
            })
    
    reason = None
    if txn.notes:
        for r in ["Sản xuất", "Hao hụt", "Chuyển kho", "Trả hàng"]:
            if r in txn.notes:
                reason = r
                break
    
    method = None
    if txn.reference_doc:
        if "FIFO" in txn.reference_doc:
            method = "FIFO"
        elif "MANUAL" in txn.reference_doc:
            method = "MANUAL"
    
    try:
        pdf_bytes = generate_receipt_pdf(
            receipt_type=txn.transaction_type,
            item_name=item.name,
            item_sku=item.sku,
            item_uom=item.uom,
            quantity=float(txn.quantity),
            warehouse_name=warehouse_name,
            transaction_id=str(txn.id),
            created_at=str(txn.created_at),
            notes=txn.notes,
            reason=reason,
            reference_doc=txn.reference_doc,
            unit_price=float(txn.unit_price) if txn.unit_price else None,
            lots=lots_data if lots_data else None,
            method=method,
        )
        
        prefix = "phieu-xuat" if txn.transaction_type == "EXPORT" else "phieu-nhap"
        filename = f"{prefix}-{str(txn_id)[:8]}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")
