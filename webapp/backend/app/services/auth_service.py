"""Сервис для работы с аутентификацией"""
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import timedelta

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return get_password_hash(password)

def verify_user_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля пользователя"""
    return verify_password(plain_password, hashed_password)

def create_user_token(user_id: str) -> str:
    """Создание JWT токена для пользователя"""
    access_token_expires = timedelta(minutes=30)
    return create_access_token(
        data={"sub": user_id},
        expires_delta=access_token_expires
    )

