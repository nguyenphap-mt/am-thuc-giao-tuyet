from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from uuid import UUID
from datetime import datetime
from backend.modules.crm.domain.models import CustomerModel, InteractionLogModel
from backend.modules.order.domain.models import OrderModel
from backend.modules.quote.domain.models import QuoteModel
from sqlalchemy import select, func, desc, Integer

class CrmIntegrationService:
    """
    Service for integrating CRM with other modules (Quote, Order).
    """

    @staticmethod
    async def sync_customer(
        db: AsyncSession,
        tenant_id: UUID,
        customer_name: str,
        customer_phone: str,
        customer_email: str = None,
        source: str = "SYSTEM"
    ) -> UUID:
        """
        Finds existing customer by phone or creates a new one.
        Returns the resolved customer_id.
        """
        if not customer_phone:
            return None # Cannot resolve without phone
            
        # 1. Normalize Phone (Simple for now)
        phone = customer_phone.strip()
        
        # 2. Lookup by Phone
        query = select(CustomerModel).where(
            CustomerModel.phone == phone,
            CustomerModel.tenant_id == tenant_id
        )
        result = await db.execute(query)
        customer = result.scalar_one_or_none()
        
        if customer:
            # Update latest info if needed (optional strategy)
            # For now, we prefer existing data in CRM over new input unless empty
            if not customer.email and customer_email:
                customer.email = customer_email
                
            # Log interaction? Maybe later to avoid noise.
            return customer.id
        else:
            # 3. Create New Customer
            new_customer = CustomerModel(
                tenant_id=tenant_id,
                full_name=customer_name,
                phone=phone,
                email=customer_email,
                source=source,
                customer_type="POTENTIAL", # Default for auto-created
                notes=f"Auto-created from {source}"
            )
            db.add(new_customer)
            await db.flush() # Get ID
            
            return new_customer.id

    @staticmethod
    async def log_interaction(
        db: AsyncSession,
        tenant_id: UUID,
        customer_id: UUID,
        interaction_type: str,
        content: str
    ):
        """
        Logs an interaction (e.g. Created Quote)
        """
        if not customer_id:
            return

        log = InteractionLogModel(
            tenant_id=tenant_id,
            customer_id=customer_id,
            type=interaction_type,
            content=content,
            sentiment="NEUTRAL"
        )
        db.add(log)

    @staticmethod
    async def recalculate_stats(
        db: AsyncSession,
        tenant_id: UUID,
        customer_id: UUID
    ):
        """
        RFM Calculation:
        - Recalculates Total Spent, Order Count.
        - Updates Customer Tier (VIP, LOYAL, REGULAR).
        """
        if not customer_id:
            return

        # 1. Aggregate Order Stats
        query = select(
            func.count(OrderModel.id).label('count'),
            func.sum(OrderModel.final_amount).label('total'),
            func.max(OrderModel.created_at).label('last_order')
        ).where(
            OrderModel.customer_id == customer_id,
            OrderModel.tenant_id == tenant_id,
            OrderModel.status.in_(['COMPLETED', 'CONFIRMED']) # Only count confirmed/completed
        )
        
        result = await db.execute(query)
        stats = result.one()
        
        order_count = stats.count or 0
        total_spent = stats.total or 0
        last_order_at = stats.last_order
        
        # 2. Determine Tier
        # Strategies:
        # - VIP: > 100M VND OR > 5 Orders
        # - LOYAL: > 2 Orders AND Last Order < 6 months
        # - CHURN_RISK: Order > 1 but Last Order > 1 year
        # - POTENTIAL: Order = 0 (managed by default or Quote count)
        # - LOST: Order = 0 AND Rejected Quotes > 3 (Need to query quotes)
        # - REGULAR: The rest
        
        now = datetime.now(last_order_at.tzinfo) if last_order_at else datetime.now()
        days_since_order = (now - last_order_at).days if last_order_at else 9999
        
        # Check Quote Stats for LOST/POTENTIAL
        quote_query = select(
            func.count(QuoteModel.id).label('total_quotes'),
            func.sum(func.cast(QuoteModel.status == 'REJECTED', Integer)).label('rejected_quotes')
        ).where(
             QuoteModel.customer_id == customer_id,
             QuoteModel.tenant_id == tenant_id
        )
        quote_result = await db.execute(quote_query)
        quote_stats = quote_result.one()
        quote_count = quote_stats.total_quotes or 0
        rejected_count = quote_stats.rejected_quotes or 0

        new_tier = "REGULAR"
        
        if total_spent > 100000000 or order_count >= 5:
            new_tier = "VIP"
        elif order_count > 1 and days_since_order > 365:
            new_tier = "CHURN_RISK"
        elif order_count >= 2 and days_since_order < 180: # 6 months
            new_tier = "LOYAL"
        elif order_count == 0:
             if rejected_count > 3:
                 new_tier = "LOST"
             else:
                 new_tier = "POTENTIAL"
        else:
            new_tier = "REGULAR"

        # 3. Update Customer Record
        customer_query = select(CustomerModel).where(CustomerModel.id == customer_id)
        cust_result = await db.execute(customer_query)
        customer = cust_result.scalar_one_or_none()
        
        if customer:
            customer.total_spent = total_spent
            customer.order_count = order_count
            customer.last_order_at = last_order_at
            
            # Only upgrade tier, never downgrade automatically? 
            # Strategy: Let's allow dynamic up/down for now to reflect reality.
            if customer.customer_type != "CORPORATE": # Don't touch corporate manual tag
                customer.customer_type = new_tier
                
            await db.commit()
