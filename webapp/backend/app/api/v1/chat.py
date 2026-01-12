from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.chat import ChatSessionResponse, ChatMessageResponse, ChatMessageCreate
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.lesson_step import LessonStep
from app.models.user import User

router = APIRouter()

@router.post("/steps/{step_id}/chat/session", response_model=ChatSessionResponse)
def create_chat_session(
    step_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание сессии чата"""
    # Проверка существования шага
    step = db.query(LessonStep).filter(LessonStep.step_id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаг не найден"
        )
    
    # Проверка существующей сессии
    existing_session = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.user_id,
        ChatSession.step_id == step_id,
        ChatSession.status == "active"
    ).first()
    
    if existing_session:
        return existing_session
    
    # Создание новой сессии
    session = ChatSession(
        user_id=current_user.user_id,
        step_id=step_id,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session

@router.get("/steps/{step_id}/chat/session", response_model=ChatSessionResponse | None)
def get_chat_session(
    step_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение существующей сессии чата"""
    session = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.user_id,
        ChatSession.step_id == step_id
    ).first()
    return session

@router.post("/chat/sessions/{session_id}/messages", response_model=ChatMessageResponse)
def send_message(
    session_id: str,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отправка сообщения в чат"""
    # Проверка существования сессии
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сессия не найдена"
        )
    
    # Проверка принадлежности сессии пользователю
    if session.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой сессии"
        )
    
    # Создание сообщения пользователя
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=message_data.content,
        status="sent"
    )
    db.add(user_message)
    db.commit()
    
    # Сохранение сообщения пользователя
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Отправка запроса в LLM и создание ответа ассистента
    from app.services.chat_service import send_message_to_llm
    try:
        assistant_message = send_message_to_llm(db, session_id, message_data.content)
        return assistant_message
    except Exception as e:
        # В случае ошибки возвращаем сообщение пользователя
        return user_message

@router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение истории сообщений"""
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сессия не найдена"
        )
    
    if session.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой сессии"
        )
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()
    
    return messages

@router.post("/chat/sessions/{session_id}/complete")
def complete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Завершение сессии чата"""
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Сессия не найдена"
        )
    
    if session.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к этой сессии"
        )
    
    session.status = "completed"
    db.commit()
    
    return {"message": "Сессия завершена"}

