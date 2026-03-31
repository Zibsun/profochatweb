"""
Алиас для обратной совместимости.
Используйте app.models.user.User вместо UserTelegram.
"""
from app.models.user import User

# Алиас для обратной совместимости
UserTelegram = User
