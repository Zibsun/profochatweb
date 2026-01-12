"""
SQLAlchemy модель для таблицы waiting_element (отложенные элементы)
"""
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime
from app.database import Base


class WaitingElement(Base):
    """Модель для отложенных элементов (delay elements)"""
    __tablename__ = "waiting_element"
    
    waiting_element_id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(BigInteger, nullable=False, index=True)
    waiting_till_date = Column(DateTime(timezone=True), nullable=False, index=True)
    is_waiting = Column(Boolean, nullable=False, default=True, index=True)
    element_id = Column(String)
    course_id = Column(String)
    botname = Column(String, nullable=False)
