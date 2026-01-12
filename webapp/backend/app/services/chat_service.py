"""Сервис для работы с чатом"""
from sqlalchemy.orm import Session
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.lesson_step import LessonStep
from app.services.llm_service import generate_chat_response

def create_chat_session(
    db: Session,
    user_id: str,
    step_id: str
) -> ChatSession:
    """Создание новой сессии чата"""
    session = ChatSession(
        user_id=user_id,
        step_id=step_id,
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def send_message_to_llm(
    db: Session,
    session_id: str,
    user_message_content: str
) -> ChatMessage:
    """Отправка сообщения в LLM и получение ответа"""
    # Получение сессии
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise ValueError("Сессия не найдена")
    
    # Получение шага для конфигурации
    step = db.query(LessonStep).filter(LessonStep.step_id == session.step_id).first()
    if not step:
        raise ValueError("Шаг не найден")
    
    content = step.content
    system_prompt = content.get("system_prompt", "")
    model = content.get("model", "gpt-4")
    temperature = content.get("temperature", 0.7)
    reasoning = content.get("reasoning")  # Новый параметр для reasoning моделей
    
    # Получение истории сообщений
    messages_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()
    
    # Формирование сообщений для LLM
    messages = [{"role": "system", "content": system_prompt}]
    for msg in messages_history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message_content})
    
    # Генерация ответа с поддержкой reasoning
    assistant_response = generate_chat_response(
        messages, 
        model, 
        temperature, 
        reasoning=reasoning  # Передаем reasoning если есть
    )
    
    # Сохранение сообщения ассистента
    assistant_message = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=assistant_response,
        status="sent"
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(assistant_message)
    
    return assistant_message

