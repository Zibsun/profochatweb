"""
SQLAlchemy модель для таблицы courseparticipants (участники ограниченных курсов)
"""
from sqlalchemy import Column, String, Text
from app.database import Base


class CourseParticipant(Base):
    """Модель для участников ограниченных курсов"""
    __tablename__ = "courseparticipants"
    
    course_id = Column(String, nullable=False, primary_key=True)
    username = Column(Text, nullable=False, primary_key=True)
    botname = Column(String, nullable=False, primary_key=True)
