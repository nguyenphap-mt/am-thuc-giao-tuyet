from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, model_validator

class Tenant(BaseModel):
    id: UUID
    name: str
    plan: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Role(BaseModel):
    id: UUID
    code: str
    name: str
    permissions: List[str] = []

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str
    role_code: str # e.g. 'admin'

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_code: Optional[str] = None
    is_active: Optional[bool] = None

class User(UserBase):
    id: UUID
    tenant_id: UUID
    role: Optional[Role] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def convert_role_str_to_object(cls, data: Any) -> Any:
        # Check if role is a string in the input data (ORM object or dict)
        role = None
        if hasattr(data, 'role'):
            role = data.role
        elif isinstance(data, dict):
            role = data.get('role')
        
        if role and isinstance(role, str):
            # It's a string code, we need to mock the Role object
            user_id = getattr(data, 'id', None)
            if not user_id and isinstance(data, dict):
                user_id = data.get('id')
            
            # Use a dummy ID if user_id is unavailable (though it should be)
            role_id = user_id if user_id else UUID('00000000-0000-0000-0000-000000000000')
            
            role_obj = Role(
                id=role_id,
                code=role,
                name=role.upper(),
                permissions=[]
            )
            
            # If it's an ORM object, we can't easily modify it. 
            # We convert to dict to proceed.
            if hasattr(data, '__dict__'):
                # SQLAlchemy objects can be converted to dict via __dict__ but simplified
                # Using Pydantic's from_attributes logic, we might need to return a dict override
                # NOTE: Validation with from_attributes=True and returning a dict usually works
                try:
                    # Create a dict from the ORM object columns
                    # This is slightly expensive but safe
                    res = {c.name: getattr(data, c.name) for c in data.__table__.columns}
                    # Also include any properties if needed, but basic columns are enough
                    res['role'] = role_obj
                    return res
                except Exception:
                    # Fallback
                    pass
            elif isinstance(data, dict):
                data['role'] = role_obj
                return data
                
        return data

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User


class ChangePasswordRequest(BaseModel):
    """Request schema for changing password"""
    current_password: str
    new_password: str
    confirm_password: str

    @model_validator(mode='after')
    def validate_passwords(self):
        if len(self.new_password) < 8:
            raise ValueError('Mật khẩu mới phải có ít nhất 8 ký tự')
        if self.new_password != self.confirm_password:
            raise ValueError('Mật khẩu xác nhận không khớp')
        if self.current_password == self.new_password:
            raise ValueError('Mật khẩu mới phải khác mật khẩu hiện tại')
        return self

