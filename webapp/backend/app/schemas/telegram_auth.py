"""
Pydantic схемы для Telegram авторизации
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TelegramAuthData(BaseModel):
    """Данные от Telegram Login Widget"""
    id: int  # telegram_user_id
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class UserResponse(BaseModel):
    user_id: int
    telegram_user_id: int
    telegram_username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    is_super_admin: bool
    
    class Config:
        from_attributes = True

class AccountMemberResponse(BaseModel):
    account_member_id: int
    account_id: int
    user_id: int
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

class AccountInfo(BaseModel):
    account_id: int
    name: str
    role: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    account_id: int
    role: str
    available_accounts: List[AccountInfo]  # Список доступных аккаунтов
