from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Any

class LessonStepBase(BaseModel):
    step_type: str
    order_index: int
    content: dict[str, Any]

class LessonStepResponse(LessonStepBase):
    step_id: UUID
    lesson_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

