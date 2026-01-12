from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class CourseProgress(Base):
    __tablename__ = "course_progress"
    
    progress_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    current_lesson_id = Column(UUID(as_uuid=True), ForeignKey("lessons.lesson_id"), nullable=True)
    current_step_id = Column(UUID(as_uuid=True), ForeignKey("lesson_steps.step_id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="course_progresses")
    course = relationship("Course", back_populates="course_progresses")
    current_lesson = relationship("Lesson", foreign_keys=[current_lesson_id])
    current_step = relationship("LessonStep", foreign_keys=[current_step_id])

