"""
SQLAlchemy модель для таблицы run (сессии прохождения курсов)
"""
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base


class Run(Base):
    """Модель для сессий прохождения курсов"""
    __tablename__ = "run"
    
    run_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(BigInteger, nullable=False, index=True)
    username = Column(Text)
    botname = Column(String, nullable=False, index=True)
    course_id = Column(String, nullable=False, index=True)
    date_inserted = Column(DateTime(timezone=True), server_default=func.now())
    utm_source = Column(Text)
    utm_campaign = Column(Text)
    is_ended = Column(Boolean, default=False)
