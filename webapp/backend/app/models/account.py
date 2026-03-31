"""
SQLAlchemy модель для таблицы account
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base

class Account(Base):
    __tablename__ = "account"
    
    account_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    plan = Column(String, default='free')
    is_active = Column(Boolean, default=True)
    settings = Column(JSONB)  # Хранит telegram_auth_bot_name и другие настройки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def get_telegram_auth_bot_name(self) -> str:
        """Получить имя бота для авторизации из настроек"""
        if self.settings and 'telegram_auth_bot_name' in self.settings:
            return self.settings['telegram_auth_bot_name']
        return 'enraidrobot'  # Значение по умолчанию
