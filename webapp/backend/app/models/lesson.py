from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class Lesson(Base):
    __tablename__ = "lessons"
    
    lesson_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(String, ForeignKey("courses.course_id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String)
    order_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course = relationship("Course", back_populates="lessons")
    lesson_steps = relationship("LessonStep", back_populates="lesson", order_by="LessonStep.order_index")
    current_progresses = relationship("CourseProgress", foreign_keys="CourseProgress.current_lesson_id")
