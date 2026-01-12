from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class QuizAttemptCreate(BaseModel):
    selected_option_id: str

class QuizAttemptResponse(BaseModel):
    attempt_id: UUID
    user_id: UUID
    step_id: UUID
    selected_option_id: str
    is_correct: bool
    score: Decimal
    max_score: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True

