"""
Dependencies для Telegram авторизации
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User as UserTelegram  # Алиас для обратной совместимости
from app.models.account_member import AccountMember

security = HTTPBearer()

def get_current_user_telegram(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserTelegram:
    """Получение текущего пользователя из JWT токена"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
        )
    
    user = db.query(UserTelegram).filter(
        UserTelegram.user_id == int(user_id)
    ).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    return user

def get_current_account_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> int:
    """Получение account_id из JWT токена"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
        )
    
    account_id = payload.get("account_id")
    if account_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не содержит account_id",
        )
    
    return int(account_id)

def get_current_user_and_account(
    user: UserTelegram = Depends(get_current_user_telegram),
    account_id: int = Depends(get_current_account_id),
    db: Session = Depends(get_db)
) -> tuple[UserTelegram, AccountMember]:
    """Получение пользователя и его членства в аккаунте"""
    account_member = db.query(AccountMember).filter(
        AccountMember.user_id == user.user_id,
        AccountMember.account_id == account_id,
        AccountMember.is_active == True
    ).first()
    
    if not account_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к аккаунту"
        )
    
    return user, account_member
