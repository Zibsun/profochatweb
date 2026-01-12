"""
SQLAlchemy модель для таблицы bannedparticipants (заблокированные пользователи)
"""
from sqlalchemy import Column, BigInteger, String, Text, Integer
from app.database import Base


class BannedParticipant(Base):
    """Модель для заблокированных пользователей"""
    __tablename__ = "bannedparticipants"
    
    botname = Column(String, nullable=False, primary_key=True)
    chat_id = Column(BigInteger, nullable=False, primary_key=True)
    ban_reason = Column(Text)
    excluded = Column(Integer, default=0)  # Флаг исключения из блокировки
