from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    attempt_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    step_id = Column(UUID(as_uuid=True), ForeignKey("lesson_steps.step_id"), nullable=False)
    selected_option_id = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Numeric(10, 2), nullable=False)
    max_score = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="quiz_attempts")
    step = relationship("LessonStep", back_populates="quiz_attempts")

