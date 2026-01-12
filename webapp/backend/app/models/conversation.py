"""
SQLAlchemy модель для таблицы conversation (история взаимодействий)
"""
from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Conversation(Base):
    """Модель для истории взаимодействий пользователей с элементами курсов"""
    __tablename__ = "conversation"
    
    conversation_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(BigInteger, nullable=False, index=True)
    username = Column(Text)
    course_id = Column(String, nullable=False, index=True)
    element_id = Column(String, nullable=False, index=True)
    element_type = Column(String, nullable=False)
    run_id = Column(Integer, ForeignKey("run.run_id"), nullable=False, index=True)
    json = Column(Text)  # JSON строка с данными элемента
    role = Column(String, nullable=False)  # "user" или "bot"
    report = Column(Text)  # Текст отчета/ответа
    score = Column(Float)
    maxscore = Column(Float)
    date_inserted = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    run = relationship("Run", backref="conversations")
    
    # Примечание: botname не хранится в conversation, он берется из связанной таблицы run
