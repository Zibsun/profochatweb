from sqlalchemy import Column, String, DateTime, Integer, BigInteger, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base

class User(Base):
    """
    Универсальная модель пользователя, поддерживающая:
    - Email/password авторизацию
    - Telegram авторизацию
    """
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Telegram авторизация поля
    telegram_user_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_username = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    language_code = Column(String)
    photo_url = Column(String)
    last_login_at = Column(DateTime(timezone=True))
    is_super_admin = Column(Boolean, nullable=False, default=False)
    
    # Email/password авторизация поля
    email = Column(String, unique=True, nullable=True, index=True)
    username = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    
    # Общие поля
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    course_progresses = relationship("CourseProgress", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")

