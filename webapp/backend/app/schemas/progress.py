from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CourseProgressBase(BaseModel):
    course_id: str
    current_lesson_id: UUID | None = None
    current_step_id: UUID | None = None

class CourseProgressCreate(CourseProgressBase):
    pass

class CourseProgressUpdate(CourseProgressBase):
    pass

class CourseProgressResponse(CourseProgressBase):
    progress_id: UUID
    user_id: UUID
    completed_at: datetime | None = None
    started_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

