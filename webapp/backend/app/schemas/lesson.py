from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class LessonBase(BaseModel):
    title: str
    description: str | None = None
    order_index: int

class LessonResponse(LessonBase):
    lesson_id: UUID
    course_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

