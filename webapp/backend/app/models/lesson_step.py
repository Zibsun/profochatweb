from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class LessonStep(Base):
    __tablename__ = "lesson_steps"
    
    step_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.lesson_id"), nullable=False)
    step_type = Column(String, nullable=False)  # message, video, pdf, quiz_single_choice, chat
    order_index = Column(Integer, nullable=False)
    content = Column(JSON, nullable=False)  # JSONB в PostgreSQL
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lesson = relationship("Lesson", back_populates="lesson_steps")
    chat_sessions = relationship("ChatSession", back_populates="step")
    quiz_attempts = relationship("QuizAttempt", back_populates="step")

