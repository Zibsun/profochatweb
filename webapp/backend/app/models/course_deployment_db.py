"""
SQLAlchemy модель для таблицы course_deployment (развертывания курсов)
После миграции 0004: course_id теперь INT (FK на course.course_id)
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class CourseDeploymentDB(Base):
    """Модель для развертываний курсов (новая схема после миграции 0004)"""
    __tablename__ = "course_deployment"
    
    deployment_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("course.course_id"), nullable=False, index=True)  # Теперь INT
    course_code = Column(String, nullable=True, index=True)  # Старое значение для обратной совместимости
    account_id = Column(Integer, nullable=False, index=True)
    bot_id = Column(Integer, ForeignKey("bot.bot_id"), nullable=False, index=True)
    environment = Column(String, default="prod")
    is_active = Column(String, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    settings = Column(JSONB)
    
    # Relationships
    course = relationship("CourseDB", back_populates="deployments")
