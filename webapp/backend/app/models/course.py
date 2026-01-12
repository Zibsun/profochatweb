from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class Course(Base):
    __tablename__ = "courses"
    
    course_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    is_restricted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    lessons = relationship("Lesson", back_populates="course")
    course_progresses = relationship("CourseProgress", back_populates="course")

