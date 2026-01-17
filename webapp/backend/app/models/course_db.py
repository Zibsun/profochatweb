"""
SQLAlchemy модель для таблицы course (метаданные курсов из БД)
После миграции 0004: course_id теперь INT (PK), course_code TEXT
"""
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class CourseDB(Base):
    """Модель для метаданных курсов из БД (новая схема после миграции 0004)"""
    __tablename__ = "course"
    
    course_id = Column(Integer, primary_key=True, autoincrement=True)
    course_code = Column(String, nullable=False, index=True)  # Старый course_id (TEXT)
    bot_name = Column(String, nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("account.account_id"), nullable=False, default=1, index=True)
    creator_id = Column(Integer)  # Изменил с UUID на Integer согласно setup.sql
    date_created = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    yaml = Column(Text)  # YAML представление курса
    title = Column(Text)
    description = Column(Text)
    course_metadata = Column('metadata', JSONB)  # Renamed to avoid SQLAlchemy reserved name
    is_active = Column(String, default=True)
    
    # Relationships
    elements = relationship("CourseElementDB", back_populates="course", cascade="all, delete-orphan")
    deployments = relationship("CourseDeploymentDB", back_populates="course", cascade="all, delete-orphan")
