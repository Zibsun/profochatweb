from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.session_id"), nullable=False)
    role = Column(String, nullable=False)  # user или assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False, default="sent")  # pending, sent, error
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")

