"""
Activity Log Service - Track user activities for audit trail
"""

from uuid import UUID
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.modules.user.domain.activity_log_model import ActivityLogModel


class ActivityService:
    """Service for logging user activities"""
    
    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
    
    async def log(
        self,
        user_id: UUID,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> ActivityLogModel:
        """
        Log a user activity
        
        Args:
            user_id: ID of the user performing the action
            action: Action type (LOGIN, LOGOUT, CREATE_USER, etc.)
            entity_type: Type of entity affected (User, Order, Quote, etc.)
            entity_id: ID of the entity affected
            metadata: Additional context as JSON
            ip_address: Client IP address
            user_agent: Client user agent string
        """
        log_entry = ActivityLogModel(
            tenant_id=self.tenant_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            extra_data=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(log_entry)
        await self.db.commit()
        await self.db.refresh(log_entry)
        
        return log_entry
    
    async def get_user_activities(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ):
        """Get activity logs for a specific user"""
        stmt = (
            select(ActivityLogModel)
            .where(ActivityLogModel.tenant_id == self.tenant_id)
            .where(ActivityLogModel.user_id == user_id)
            .order_by(ActivityLogModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_entity_activities(
        self,
        entity_type: str,
        entity_id: UUID,
        limit: int = 50
    ):
        """Get activity logs for a specific entity"""
        stmt = (
            select(ActivityLogModel)
            .where(ActivityLogModel.tenant_id == self.tenant_id)
            .where(ActivityLogModel.entity_type == entity_type)
            .where(ActivityLogModel.entity_id == entity_id)
            .order_by(ActivityLogModel.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_recent_activities(
        self,
        limit: int = 100,
        action_filter: Optional[str] = None
    ):
        """Get recent activities across all users"""
        stmt = (
            select(ActivityLogModel)
            .where(ActivityLogModel.tenant_id == self.tenant_id)
            .order_by(ActivityLogModel.created_at.desc())
            .limit(limit)
        )
        
        if action_filter:
            stmt = stmt.where(ActivityLogModel.action == action_filter)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()


# Predefined action constants
class ActivityAction:
    # Authentication
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    LOGIN_FAILED = "LOGIN_FAILED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    
    # User Management
    CREATE_USER = "CREATE_USER"
    UPDATE_USER = "UPDATE_USER"
    DELETE_USER = "DELETE_USER"
    ACTIVATE_USER = "ACTIVATE_USER"
    DEACTIVATE_USER = "DEACTIVATE_USER"
    
    # Role & Permission
    CREATE_ROLE = "CREATE_ROLE"
    UPDATE_ROLE = "UPDATE_ROLE"
    DELETE_ROLE = "DELETE_ROLE"
    UPDATE_PERMISSIONS = "UPDATE_PERMISSIONS"
    ASSIGN_ROLE = "ASSIGN_ROLE"
    
    # Orders
    CREATE_ORDER = "CREATE_ORDER"
    UPDATE_ORDER = "UPDATE_ORDER"
    CANCEL_ORDER = "CANCEL_ORDER"
    COMPLETE_ORDER = "COMPLETE_ORDER"
    
    # Quotes
    CREATE_QUOTE = "CREATE_QUOTE"
    APPROVE_QUOTE = "APPROVE_QUOTE"
    CONVERT_QUOTE = "CONVERT_QUOTE"
