"""
Loyalty Router - API endpoints for loyalty points system
"""
from typing import Optional
from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.modules.crm.application.loyalty_service import LoyaltyService


router = APIRouter(prefix="/api/v1/customers", tags=["Loyalty"])


# Request/Response Models
class EarnPointsRequest(BaseModel):
    amount: Decimal
    reference_type: str = "MANUAL"
    reference_id: Optional[UUID] = None
    description: Optional[str] = None


class RedeemPointsRequest(BaseModel):
    points: int
    description: Optional[str] = None


class RedeemPointsResponse(BaseModel):
    points_redeemed: int
    discount_amount: Decimal
    new_balance: int


# Hardcoded tenant for now (will be replaced with auth context)
DEFAULT_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")


@router.get("/{customer_id}/loyalty")
async def get_loyalty_summary(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get customer's loyalty summary including points, tier, and benefits"""
    service = LoyaltyService(db, DEFAULT_TENANT_ID)
    summary = await service.get_loyalty_summary(customer_id)
    
    if not summary:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return summary


@router.post("/{customer_id}/loyalty/earn")
async def earn_points(
    customer_id: UUID,
    request: EarnPointsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Manually add points to customer (admin action)"""
    service = LoyaltyService(db, DEFAULT_TENANT_ID)
    
    try:
        points_earned = await service.earn_points(
            customer_id=customer_id,
            amount=request.amount,
            reference_type=request.reference_type,
            reference_id=request.reference_id,
            description=request.description
        )
        
        # Get updated summary
        summary = await service.get_loyalty_summary(customer_id)
        
        return {
            "success": True,
            "points_earned": points_earned,
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{customer_id}/loyalty/redeem")
async def redeem_points(
    customer_id: UUID,
    request: RedeemPointsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Redeem points for discount"""
    service = LoyaltyService(db, DEFAULT_TENANT_ID)
    
    try:
        discount_amount = await service.redeem_points(
            customer_id=customer_id,
            points=request.points,
            description=request.description
        )
        
        # Get updated summary
        summary = await service.get_loyalty_summary(customer_id)
        
        return {
            "success": True,
            "points_redeemed": request.points,
            "discount_amount": float(discount_amount),
            "summary": summary
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{customer_id}/loyalty/history")
async def get_points_history(
    customer_id: UUID,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get customer's points transaction history"""
    service = LoyaltyService(db, DEFAULT_TENANT_ID)
    history = await service.get_points_history(
        customer_id=customer_id,
        limit=limit,
        offset=offset
    )
    
    return {
        "customer_id": str(customer_id),
        "history": history,
        "count": len(history)
    }


@router.get("/loyalty/tiers")
async def get_all_tiers(
    db: AsyncSession = Depends(get_db)
):
    """Get all loyalty tier definitions"""
    service = LoyaltyService(db, DEFAULT_TENANT_ID)
    tiers = await service.get_all_tiers()
    
    return {
        "tiers": tiers
    }
