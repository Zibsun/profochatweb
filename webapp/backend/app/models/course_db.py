"""
SQLAlchemy модель для таблицы course (метаданные курсов из БД)
Отличается от app.models.course, которая используется для новой схемы
"""
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base
import uuid


class CourseDB(Base):
    """Модель для метаданных курсов из БД (старая схема)"""
    __tablename__ = "course"
    
    course_id = Column(String, primary_key=True)
    bot_name = Column(String, nullable=False, index=True)
    creator_id = Column(UUID(as_uuid=True))
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    yaml = Column(Text)  # YAML представление курса
