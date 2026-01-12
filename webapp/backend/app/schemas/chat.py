from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class ChatSessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    step_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    message_id: UUID
    session_id: UUID
    role: str
    created_at: datetime
    status: str
    
    class Config:
        from_attributes = True

