"""
Утилиты для валидации данных от Telegram Login Widget
"""
import hashlib
import hmac
import time
from typing import Dict

def validate_telegram_auth(
    auth_data: Dict,
    bot_token: str
) -> bool:
    """
    Валидация данных от Telegram Login Widget
    
    Проверяет hash используя секретный ключ бота
    
    Args:
        auth_data: Словарь с данными от Telegram (id, first_name, auth_date, hash и т.д.)
        bot_token: Токен бота для проверки подписи
    
    Returns:
        True если данные валидны, False иначе
    """
    # Создаем копию, чтобы не изменять оригинал
    data = auth_data.copy()
    
    # Извлекаем hash
    received_hash = data.pop('hash', None)
    if not received_hash:
        return False
    
    # Проверяем время (данные не должны быть старше 24 часов)
    auth_date = data.get('auth_date', 0)
    if time.time() - auth_date > 86400:
        return False
    
    # Создаем строку для проверки
    # Важно: сортируем ключи и используем формат "key=value"
    data_check_string = '\n'.join(
        f"{k}={v}" for k, v in sorted(data.items())
    )
    
    # Вычисляем секретный ключ из токена бота
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Вычисляем hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == received_hash
