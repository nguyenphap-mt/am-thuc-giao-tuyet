from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc
from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime
from fastapi import HTTPException

from backend.modules.inventory.domain.models import (
    InventoryItemModel, InventoryStockModel, InventoryTransactionModel, InventoryLotModel
)
from backend.modules.inventory.domain.entities import InventoryTransactionBase


class InventoryService:
    @staticmethod
    async def create_transaction(
        db: AsyncSession, 
        data: InventoryTransactionBase, 
        tenant_id: UUID,
        unit_price: Optional[Decimal] = None,
        # Lot auto-creation params (for IMPORT)
        auto_create_lot: bool = False,
        lot_number: Optional[str] = None,
        batch_code: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        supplier_id: Optional[UUID] = None,
        # FIFO auto-deduct (for EXPORT)
        auto_deduct_lots: bool = False,
    ) -> InventoryTransactionModel:
        """
        Process stock movement (Import/Export) and create transaction record.
        Reusable by both Inventory Router and Procurement Router.
        
        NEW: Auto-creates InventoryLotModel on IMPORT when auto_create_lot=True.
        NEW: Auto-deducts lots in FIFO order on EXPORT when auto_deduct_lots=True.
        """
        # 1. Check Item
        item = await db.get(InventoryItemModel, data.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Item not found: {data.item_id}")

        # 2. Update Stock (Upsert)
        stmt = select(InventoryStockModel).where(
            InventoryStockModel.item_id == data.item_id,
            InventoryStockModel.warehouse_id == data.warehouse_id
        )
        result = await db.execute(stmt)
        stock = result.scalar_one_or_none()
        
        if not stock:
            stock = InventoryStockModel(
                tenant_id=tenant_id,
                item_id=data.item_id,
                warehouse_id=data.warehouse_id,
                quantity=0
            )
            db.add(stock)
        
        # Track lot_id for linking transaction to lot
        linked_lot_id = None
        
        # Calculate new quantity
        if data.transaction_type == "IMPORT":
            stock.quantity += data.quantity
            # Update latest price if provided (either from DTO or explicit arg)
            price_to_update = unit_price or (data.unit_price if hasattr(data, 'unit_price') else None)
            
            if price_to_update and price_to_update > 0:
                item.latest_purchase_price = price_to_update
                item.cost_price = price_to_update

            # ========================================
            # AUTO-CREATE LOT ON IMPORT
            # ========================================
            if auto_create_lot:
                # Generate lot number if not provided
                if not lot_number:
                    lot_number = f"LOT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                
                effective_price = price_to_update or Decimal(0)
                
                new_lot = InventoryLotModel(
                    tenant_id=tenant_id,
                    item_id=data.item_id,
                    warehouse_id=data.warehouse_id,
                    lot_number=lot_number,
                    batch_code=batch_code,
                    expiry_date=expiry_date,
                    initial_quantity=data.quantity,
                    remaining_quantity=data.quantity,
                    unit_cost=effective_price,
                    reference_doc=data.reference_doc if hasattr(data, 'reference_doc') else None,
                    supplier_id=supplier_id,
                    notes=data.notes if hasattr(data, 'notes') else None,
                    status='ACTIVE'
                )
                db.add(new_lot)
                await db.flush()  # Get lot.id for transaction linkage
                linked_lot_id = new_lot.id
                
        elif data.transaction_type == "EXPORT":
            if stock.quantity < data.quantity:
                 raise HTTPException(status_code=400, detail=f"Insufficient stock for item {item.name}. Current: {stock.quantity}")
            stock.quantity -= data.quantity

            # ========================================
            # AUTO-DEDUCT LOTS (FIFO) ON EXPORT
            # ========================================
            if auto_deduct_lots:
                remaining_to_deduct = data.quantity
                
                # Get active lots ordered by received_date ASC (FIFO)
                fifo_stmt = select(InventoryLotModel).where(
                    InventoryLotModel.tenant_id == tenant_id,
                    InventoryLotModel.item_id == data.item_id,
                    InventoryLotModel.warehouse_id == data.warehouse_id,
                    InventoryLotModel.status == 'ACTIVE',
                    InventoryLotModel.remaining_quantity > 0
                ).order_by(asc(InventoryLotModel.received_date))
                
                fifo_result = await db.execute(fifo_stmt)
                lots = fifo_result.scalars().all()
                
                # Track cost for weighted average COGS (FIX-2: GAP-5.1)
                total_cost = Decimal(0)
                total_qty_deducted = Decimal(0)
                
                for lot in lots:
                    if remaining_to_deduct <= 0:
                        break
                    
                    deduct_from_lot = min(lot.remaining_quantity, remaining_to_deduct)
                    lot.remaining_quantity -= deduct_from_lot
                    remaining_to_deduct -= deduct_from_lot
                    
                    # Accumulate actual lot cost for COGS
                    lot_unit_cost = Decimal(str(lot.unit_cost or 0))
                    total_cost += lot_unit_cost * deduct_from_lot
                    total_qty_deducted += deduct_from_lot
                    
                    # Mark as DEPLETED if fully consumed
                    if lot.remaining_quantity <= 0:
                        lot.status = 'DEPLETED'
                    
                    # Link transaction to the first lot used
                    if linked_lot_id is None:
                        linked_lot_id = lot.id
                
                # Calculate weighted average COGS from actual lot costs
                if total_qty_deducted > 0:
                    weighted_avg_cost = total_cost / total_qty_deducted
                    # Use actual lot cost instead of static item.cost_price
                    unit_price = weighted_avg_cost
        
        # 3. Create Transaction Record
        # Create dict from Pydantic model
        txn_data = data.dict(exclude={'unit_price'}) if hasattr(data, 'dict') else data.model_dump(exclude={'unit_price'})
        
        txn = InventoryTransactionModel(
            tenant_id=tenant_id,
            lot_id=linked_lot_id,  # Link to auto-created/deducted lot
            unit_price=unit_price,  # Store actual cost (weighted avg for EXPORT)
            **txn_data
        )
        db.add(txn)
        
        # Note: We rely on the caller to commit/refresh
        return txn
