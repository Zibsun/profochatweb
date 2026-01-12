"""
SQLAlchemy модель для таблицы course_element (элементы курсов из БД)
"""
from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class CourseElementDB(Base):
    """Модель для элементов курсов из БД (старая схема)"""
    __tablename__ = "course_element"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bot_name = Column(String, nullable=False, index=True)
    course_id = Column(String, nullable=False, index=True)
    element_id = Column(String, nullable=False, index=True)
    json = Column(Text)  # JSON данные элемента
    element_type = Column(String, nullable=False)
