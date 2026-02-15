from sqlalchemy import Column, String, Text, ForeignKey, TIMESTAMP, JSON, Numeric, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from backend.core.database import Base

class CustomerModel(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    source = Column(String(50))
    notes = Column(Text)
    customer_type = Column(String(20), default='REGULAR')
    preferences = Column(JSONB, default={})
    birthday = Column(Date, nullable=True)
    
    # Statistics (RFM)
    total_spent = Column(Numeric(15, 2), default=0)
    order_count = Column(Integer, default=0)
    last_order_at = Column(TIMESTAMP(timezone=True))
    
    # Loyalty Program
    loyalty_points = Column(Integer, default=0)
    loyalty_tier = Column(String(20), default='BRONZE')
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    interaction_logs = relationship("InteractionLogModel", back_populates="customer", cascade="all, delete-orphan")

class InteractionLogModel(Base):
    __tablename__ = "interaction_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"))
    
    type = Column(String(50), nullable=False) # CALL, ZALO, MEETING
    content = Column(Text)
    sentiment = Column(String(50))
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    customer = relationship("CustomerModel", back_populates="interaction_logs")


class LoyaltyPointsHistoryModel(Base):
    """Tracks all loyalty points transactions"""
    __tablename__ = "loyalty_points_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"))
    
    # Points info
    points = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # EARN, REDEEM, EXPIRE, ADJUST
    
    # Reference to source
    reference_type = Column(String(50))  # ORDER, MANUAL, PROMOTION
    reference_id = Column(UUID(as_uuid=True))
    
    # Details
    description = Column(Text)
    balance_after = Column(Integer, nullable=False)
    
    # Audit
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True))

    # Relationships
    customer = relationship("CustomerModel")


class LoyaltyTierModel(Base):
    """Loyalty tier definitions"""
    __tablename__ = "loyalty_tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    
    name = Column(String(50), nullable=False)
    min_points = Column(Integer, nullable=False)
    discount_percent = Column(Numeric(5, 2), default=0)
    benefits = Column(JSONB, default=[])
    color = Column(String(20))
    icon = Column(String(50))
    sort_order = Column(Integer, default=0)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

