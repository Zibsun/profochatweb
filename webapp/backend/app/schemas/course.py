from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CourseBase(BaseModel):
    course_id: str
    title: str
    description: str | None = None
    is_restricted: bool = False

class CourseResponse(CourseBase):
    creator_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

