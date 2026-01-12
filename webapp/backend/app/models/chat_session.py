from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    step_id = Column(UUID(as_uuid=True), ForeignKey("lesson_steps.step_id"), nullable=False)
    status = Column(String, nullable=False, default="active")  # active, completed, stopped
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    step = relationship("LessonStep", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")

