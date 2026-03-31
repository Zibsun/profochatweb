from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    email: Optional[str] = None
    username: Optional[str] = None
    telegram_user_id: Optional[int] = None
    telegram_username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    is_super_admin: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

