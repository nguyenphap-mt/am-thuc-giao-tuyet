from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from backend.core.database import get_db
from backend.modules.crm.domain.models import CustomerModel, InteractionLogModel
from backend.modules.crm.application.services import CrmIntegrationService

router = APIRouter(tags=["CRM Marketing"])

# Default Tenant (same as other modules)
DEFAULT_TENANT_ID = UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")

# --- Schemas ---

class CampaignSendRequest(BaseModel):
    customer_ids: List[UUID]
    template_id: str # MISS_YOU, COME_BACK, DISCOUNT
    channel: str # ZALO, EMAIL

class RetentionStats(BaseModel):
    churn_risk_count: int
    lost_count: int
    total_at_risk: int

# --- Endpoints ---

@router.get("/retention-stats", response_model=RetentionStats)
async def get_retention_stats(db: AsyncSession = Depends(get_db)):
    """
    Get counts of customers who are at risk or lost.
    """
    # Count Churn Risk
    curr_churn_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == DEFAULT_TENANT_ID,
        CustomerModel.customer_type == 'CHURN_RISK'
    )
    churn_count = (await db.execute(curr_churn_query)).scalar() or 0
    
    # Count Lost
    lost_query = select(func.count(CustomerModel.id)).where(
        CustomerModel.tenant_id == DEFAULT_TENANT_ID,
        CustomerModel.customer_type == 'LOST'
    )
    lost_count = (await db.execute(lost_query)).scalar() or 0
    
    return {
        "churn_risk_count": churn_count,
        "lost_count": lost_count,
        "total_at_risk": churn_count + lost_count
    }

@router.post("/campaigns/send")
async def send_campaign(request: CampaignSendRequest, db: AsyncSession = Depends(get_db)):
    """
    Simulate sending a marketing campaign/offer to a list of customers.
    Logs the interaction for each customer.
    """
    success_count = 0
    
    # Mapping template ID to human readable content
    templates = {
        "MISS_YOU": "Gửi ưu đãi 'We Miss You' (Voucher 10%)",
        "COME_BACK": "Gửi lời mời quay lại (Món tráng miệng miễn phí)",
        "DISCOUNT": "Gửi mã giảm giá đặc biệt"
    }
    
    content_prefix = templates.get(request.template_id, f"Gửi ưu đãi {request.template_id}")
    content = f"{content_prefix} qua kênh {request.channel}"
    
    for customer_id in request.customer_ids:
        # Check if customer exists (optional, but good for safety)
        cust = await db.execute(select(CustomerModel).where(CustomerModel.id == customer_id))
        if not cust.scalar_one_or_none():
            continue
            
        # Log Interaction
        await CrmIntegrationService.log_interaction(
            db, 
            DEFAULT_TENANT_ID, 
            customer_id, 
            "CAMPAIGN_SENT", 
            content
        )
        success_count += 1
        
    await db.commit()
    
    return {
        "success": True, 
        "sent_count": success_count,
        "message": f"Đã gửi ưu đãi thành công tới {success_count} khách hàng."
    }
