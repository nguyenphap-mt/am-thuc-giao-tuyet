"""
Loyalty Service - Business logic for loyalty points system
"""
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.crm.domain.models import (
    CustomerModel, 
    LoyaltyPointsHistoryModel, 
    LoyaltyTierModel
)


class LoyaltyService:
    """Service for managing customer loyalty points and tiers"""
    
    # Configuration
    POINTS_RATIO = 10000  # 1 point per 10,000 VND
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def get_loyalty_summary(self, customer_id: UUID) -> dict:
        """Get customer's loyalty summary including points, tier, and benefits"""
        # Get customer
        result = await self.db.execute(
            select(CustomerModel).where(CustomerModel.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        if not customer:
            return None
        
        # Get current tier info
        tier = await self._get_tier_for_points(customer.loyalty_points or 0)
        next_tier = await self._get_next_tier(customer.loyalty_points or 0)
        
        return {
            "customer_id": str(customer_id),
            "points": customer.loyalty_points or 0,
            "tier": {
                "name": tier.name if tier else "Bronze",
                "color": tier.color if tier else "#CD7F32",
                "icon": tier.icon if tier else "workspace_premium",
                "discount_percent": float(tier.discount_percent) if tier else 0,
                "benefits": tier.benefits if tier else []
            },
            "next_tier": {
                "name": next_tier.name,
                "min_points": next_tier.min_points,
                "points_needed": next_tier.min_points - (customer.loyalty_points or 0)
            } if next_tier else None
        }
    
    async def earn_points(
        self, 
        customer_id: UUID, 
        amount: Decimal,
        reference_type: str = "ORDER",
        reference_id: Optional[UUID] = None,
        description: Optional[str] = None
    ) -> int:
        """
        Add points to customer based on purchase amount
        Returns: points earned
        """
        points_earned = int(amount / self.POINTS_RATIO)
        if points_earned <= 0:
            return 0
        
        # Get current customer
        result = await self.db.execute(
            select(CustomerModel).where(CustomerModel.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")
        
        current_points = customer.loyalty_points or 0
        new_balance = current_points + points_earned
        
        # Update customer points
        await self.db.execute(
            update(CustomerModel)
            .where(CustomerModel.id == customer_id)
            .values(loyalty_points=new_balance)
        )
        
        # Create history record
        history = LoyaltyPointsHistoryModel(
            tenant_id=self.tenant_id,
            customer_id=customer_id,
            points=points_earned,
            type="EARN",
            reference_type=reference_type,
            reference_id=reference_id,
            description=description or f"Earned from {reference_type}",
            balance_after=new_balance
        )
        self.db.add(history)
        
        # Check and update tier
        await self._update_customer_tier(customer_id, new_balance)
        
        await self.db.commit()
        return points_earned
    
    async def redeem_points(
        self, 
        customer_id: UUID, 
        points: int,
        description: Optional[str] = None
    ) -> Decimal:
        """
        Redeem points for discount
        Returns: discount amount in VND
        """
        if points <= 0:
            raise ValueError("Points must be positive")
        
        # Get current customer
        result = await self.db.execute(
            select(CustomerModel).where(CustomerModel.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")
        
        current_points = customer.loyalty_points or 0
        if points > current_points:
            raise ValueError(f"Insufficient points. Available: {current_points}")
        
        new_balance = current_points - points
        discount_amount = Decimal(points * self.POINTS_RATIO)
        
        # Update customer points
        await self.db.execute(
            update(CustomerModel)
            .where(CustomerModel.id == customer_id)
            .values(loyalty_points=new_balance)
        )
        
        # Create history record
        history = LoyaltyPointsHistoryModel(
            tenant_id=self.tenant_id,
            customer_id=customer_id,
            points=-points,
            type="REDEEM",
            reference_type="REDEMPTION",
            description=description or f"Redeemed {points} points",
            balance_after=new_balance
        )
        self.db.add(history)
        
        # Check and update tier (tier shouldn't downgrade on redemption, but recalculate)
        await self._update_customer_tier(customer_id, new_balance)
        
        await self.db.commit()
        return discount_amount
    
    async def get_points_history(
        self, 
        customer_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[dict]:
        """Get customer's points transaction history"""
        result = await self.db.execute(
            select(LoyaltyPointsHistoryModel)
            .where(LoyaltyPointsHistoryModel.customer_id == customer_id)
            .order_by(desc(LoyaltyPointsHistoryModel.created_at))
            .offset(offset)
            .limit(limit)
        )
        history = result.scalars().all()
        
        return [
            {
                "id": str(h.id),
                "points": h.points,
                "type": h.type,
                "reference_type": h.reference_type,
                "reference_id": str(h.reference_id) if h.reference_id else None,
                "description": h.description,
                "balance_after": h.balance_after,
                "created_at": h.created_at.isoformat() if h.created_at else None
            }
            for h in history
        ]
    
    async def get_all_tiers(self) -> List[dict]:
        """Get all loyalty tiers for the tenant"""
        result = await self.db.execute(
            select(LoyaltyTierModel)
            .where(LoyaltyTierModel.tenant_id == self.tenant_id)
            .order_by(LoyaltyTierModel.sort_order)
        )
        tiers = result.scalars().all()
        
        return [
            {
                "id": str(t.id),
                "name": t.name,
                "min_points": t.min_points,
                "discount_percent": float(t.discount_percent),
                "color": t.color,
                "icon": t.icon,
                "benefits": t.benefits
            }
            for t in tiers
        ]
    
    async def _get_tier_for_points(self, points: int) -> Optional[LoyaltyTierModel]:
        """Get the appropriate tier for given points"""
        result = await self.db.execute(
            select(LoyaltyTierModel)
            .where(
                LoyaltyTierModel.tenant_id == self.tenant_id,
                LoyaltyTierModel.min_points <= points
            )
            .order_by(desc(LoyaltyTierModel.min_points))
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    async def _get_next_tier(self, points: int) -> Optional[LoyaltyTierModel]:
        """Get the next tier above current points"""
        result = await self.db.execute(
            select(LoyaltyTierModel)
            .where(
                LoyaltyTierModel.tenant_id == self.tenant_id,
                LoyaltyTierModel.min_points > points
            )
            .order_by(LoyaltyTierModel.min_points)
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    async def _update_customer_tier(self, customer_id: UUID, points: int):
        """Update customer's tier based on current points"""
        tier = await self._get_tier_for_points(points)
        if tier:
            await self.db.execute(
                update(CustomerModel)
                .where(CustomerModel.id == customer_id)
                .values(loyalty_tier=tier.name.upper())
            )
