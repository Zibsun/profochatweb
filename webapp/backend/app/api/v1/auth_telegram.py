"""
Endpoints для Telegram авторизации
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.database import get_db
from app.schemas.telegram_auth import TelegramAuthData, AuthResponse, UserResponse, AccountInfo
from app.models.user import User as UserTelegram  # Алиас для обратной совместимости
from app.models.account_member import AccountMember
from app.models.account import Account
from app.core.security import create_access_token
from app.core.telegram_auth import validate_telegram_auth
from app.config import settings
from app.api.deps_telegram import get_current_user_telegram

router = APIRouter()

@router.post("/telegram/login", response_model=AuthResponse)
async def telegram_login(
    auth_data: TelegramAuthData,
    account_id: Optional[int] = None,  # Опционально: для выбора аккаунта
    db: Session = Depends(get_db)
):
    """
    Авторизация через Telegram Login Widget
    
    1. Валидирует данные от Telegram
    2. Создает или обновляет пользователя в БД
    3. Находит доступные аккаунты пользователя
    4. Возвращает JWT токен с account_id и role
    
    Примечание: Имя бота для валидации берется из account.settings.telegram_auth_bot_name
    или используется глобальный токен из TELEGRAM_AUTH_BOT_TOKEN
    """
    # Валидация данных Telegram
    # Используем глобальный токен из переменных окружения
    bot_token = settings.TELEGRAM_AUTH_BOT_TOKEN
    if not bot_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token не настроен"
        )
    
    if not validate_telegram_auth(auth_data.dict(), bot_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные данные авторизации Telegram"
        )
    
    # Поиск или создание пользователя
    user = db.query(UserTelegram).filter(
        UserTelegram.telegram_user_id == auth_data.id
    ).first()
    
    if not user:
        # Создание нового пользователя
        user = UserTelegram(
            telegram_user_id=auth_data.id,
            telegram_username=auth_data.username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            photo_url=auth_data.photo_url,
            last_login_at=datetime.now(timezone.utc)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Обновление данных пользователя
        user.telegram_username = auth_data.username
        user.first_name = auth_data.first_name
        user.last_name = auth_data.last_name
        user.photo_url = auth_data.photo_url
        user.last_login_at = datetime.utcnow()
        db.commit()
    
    # Поиск доступных аккаунтов
    account_members = db.query(AccountMember).filter(
        AccountMember.user_id == user.user_id,
        AccountMember.is_active == True
    ).all()
    
    if not account_members:
        # Если нет аккаунтов, возвращаем ошибку
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь не является участником ни одного аккаунта"
        )
    
    # Выбор аккаунта
    if account_id:
        selected_member = next(
            (m for m in account_members if m.account_id == account_id),
            None
        )
        if not selected_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к указанному аккаунту"
            )
    else:
        # Выбираем первый доступный аккаунт (или аккаунт с ролью owner)
        selected_member = next(
            (m for m in account_members if m.role == 'owner'),
            account_members[0]
        )
    
    # Обновление last_login_at для account_member
    selected_member.last_login_at = datetime.utcnow()
    db.commit()
    
    # Загружаем информацию об аккаунте для имени
    account = db.query(Account).filter(
        Account.account_id == selected_member.account_id
    ).first()
    
    # Создание JWT токена
    token_data = {
        "sub": str(user.user_id),
        "account_id": selected_member.account_id,
        "role": selected_member.role,
        "is_super_admin": user.is_super_admin,
        "telegram_user_id": user.telegram_user_id
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(days=7)  # Токен на 7 дней
    )
    
    # Формирование списка доступных аккаунтов
    available_accounts = [
        AccountInfo(
            account_id=m.account_id,
            name=m.account.name if m.account else f"Account {m.account_id}",
            role=m.role
        )
        for m in account_members
    ]
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
        account_id=selected_member.account_id,
        role=selected_member.role,
        available_accounts=available_accounts
    )

@router.post("/telegram/switch-account", response_model=AuthResponse)
async def switch_account(
    account_id: int,
    current_user: UserTelegram = Depends(get_current_user_telegram),
    db: Session = Depends(get_db)
):
    """
    Переключение на другой аккаунт
    
    Выдает новый JWT токен с новым account_id
    """
    # Проверка доступа к аккаунту
    account_member = db.query(AccountMember).filter(
        AccountMember.user_id == current_user.user_id,
        AccountMember.account_id == account_id,
        AccountMember.is_active == True
    ).first()
    
    if not account_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к указанному аккаунту"
        )
    
    # Загружаем информацию об аккаунте
    account = db.query(Account).filter(
        Account.account_id == account_id
    ).first()
    
    # Создание нового токена
    token_data = {
        "sub": str(current_user.user_id),
        "account_id": account_member.account_id,
        "role": account_member.role,
        "is_super_admin": current_user.is_super_admin,
        "telegram_user_id": current_user.telegram_user_id
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(days=7)
    )
    
    # Получение списка доступных аккаунтов
    account_members = db.query(AccountMember).filter(
        AccountMember.user_id == current_user.user_id,
        AccountMember.is_active == True
    ).all()
    
    available_accounts = [
        AccountInfo(
            account_id=m.account_id,
            name=m.account.name if m.account else f"Account {m.account_id}",
            role=m.role
        )
        for m in account_members
    ]
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(current_user),
        account_id=account_member.account_id,
        role=account_member.role,
        available_accounts=available_accounts
    )
