from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
# Старая функция отключена - используем get_current_user_telegram
# from app.api.deps import get_current_user
from app.schemas.chat import ChatSessionResponse, ChatMessageResponse, ChatMessageCreate
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.lesson_step import LessonStep
# Старая модель User отключена - используем UserTelegram
# from app.models.user import User

router = APIRouter()

# Старые endpoints отключены - нужно обновить для UserTelegram
# @router.post("/steps/{step_id}/chat/session", response_model=ChatSessionResponse)
# def create_chat_session(...):
#     ...

# @router.get("/steps/{step_id}/chat/session", response_model=ChatSessionResponse | None)
# def get_chat_session(...):
#     ...

# @router.post("/chat/sessions/{session_id}/messages", response_model=ChatMessageResponse)
# def send_message(...):
#     ...

# @router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
# def get_messages(...):
#     ...

# @router.post("/chat/sessions/{session_id}/complete")
# def complete_session(...):
#     ...
