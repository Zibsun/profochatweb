"""
SQLAlchemy модель для таблицы course_element (элементы курсов из БД)
После миграции 0004: course_id теперь INT (FK на course.course_id)
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base


class CourseElementDB(Base):
    """Модель для элементов курсов из БД (новая схема после миграции 0004)"""
    __tablename__ = "course_element"
    
    course_element_id = Column(Integer, primary_key=True, autoincrement=True)  # serial4 в setup.sql
    course_id = Column(Integer, ForeignKey("course.course_id"), nullable=False, index=True)  # Теперь INT
    course_code = Column(String, nullable=True, index=True)  # Старое значение для обратной совместимости
    account_id = Column(Integer, nullable=False, default=1, index=True)
    element_id = Column(String, nullable=True, index=True)  # Может быть NULL согласно setup.sql
    json = Column(Text)  # JSON данные элемента
    element_type = Column(String, nullable=True)  # Может быть NULL согласно setup.sql
    bot_name = Column(String, nullable=True, index=True)  # Оставляем для обратной совместимости
    
    # Relationships
    course = relationship("CourseDB", back_populates="elements")
