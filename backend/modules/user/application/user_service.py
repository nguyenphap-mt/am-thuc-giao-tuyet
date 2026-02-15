from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from backend.core.auth.models import User
from backend.core.auth.schemas import UserCreate, UserUpdate, User as UserSchema
from backend.core.auth.security import get_password_hash

class UserService:
    def __init__(self, db: Session):
        self.db = db

    async def get_users(self, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[User]:
        # Filter by tenant_id explicitly as a safeguard, though RLS should handle it in real context
        # But User table is a bit special. RLS policies often use current_setting.
        # Here we trust the router passed tenant_id or user context.
        query = select(User).where(User.tenant_id == tenant_id).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, user: UserCreate, current_user_tenant_id: UUID) -> User:
        db_user = await self.get_user_by_email(user.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = get_password_hash(user.password)
        
        # Determine Role logic
        # Ideally, we should validate role against permission matrix or enum
        # For now, we trust the input string but ensure it is lowercase
        
        new_user = User(
            tenant_id=current_user_tenant_id,
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name or user.email.split('@')[0],
            role=user.role_code.lower(),
            is_active=user.is_active
        )
        
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        return new_user

    async def update_user(self, user_id: UUID, user_update: UserUpdate, current_user_tenant_id: UUID) -> User:
        db_user = await self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if db_user.tenant_id != current_user_tenant_id:
             raise HTTPException(status_code=403, detail="Not authorized to update this user")

        if user_update.password:
             db_user.hashed_password = get_password_hash(user_update.password)
             
        if user_update.full_name:
            db_user.full_name = user_update.full_name
            
        if user_update.role_code:
            db_user.role = user_update.role_code.lower()
            
        if user_update.is_active is not None:
            db_user.is_active = user_update.is_active
        
        await self.db.commit()
        await self.db.refresh(db_user)
        return db_user

    async def delete_user(self, user_id: UUID, current_user_tenant_id: UUID, current_user: User = None):
        """
        Delete a user with BR052 protection
        
        BR052: Super Admin không thể tự xóa mình
        """
        db_user = await self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if db_user.tenant_id != current_user_tenant_id:
             raise HTTPException(status_code=403, detail="Not authorized to delete this user")
        
        # BR052: Super admin cannot delete themselves
        if current_user:
            is_self_delete = str(current_user.id) == str(user_id)
            is_super_admin = getattr(current_user.role, 'code', current_user.role) == 'super_admin'
            
            if is_self_delete and is_super_admin:
                raise HTTPException(
                    status_code=400, 
                    detail="Super Admin không thể tự xóa mình. Vui lòng nhờ Super Admin khác thực hiện."
                )
             
        await self.db.delete(db_user)
        await self.db.commit()

    async def change_password(
        self, 
        user_id: UUID, 
        current_password: str, 
        new_password: str
    ) -> bool:
        """
        Change user password
        
        Returns True if successful, raises HTTPException otherwise
        """
        from backend.core.auth.security import verify_password
        
        db_user = await self.get_user_by_id(user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(current_password, db_user.hashed_password):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
        
        # Update password
        db_user.hashed_password = get_password_hash(new_password)
        
        await self.db.commit()
        return True
