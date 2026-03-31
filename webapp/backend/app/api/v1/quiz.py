from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from app.database import get_db
# Старая функция отключена - используем get_current_user_telegram
# from app.api.deps import get_current_user
from app.schemas.quiz import QuizAttemptResponse, QuizAttemptCreate
from app.models.quiz_attempt import QuizAttempt
from app.models.lesson_step import LessonStep
# Старая модель User отключена - используем UserTelegram
# from app.models.user import User

router = APIRouter()

# Старые endpoints отключены - нужно обновить для UserTelegram
# @router.post("/{step_id}/quiz/attempt")
# def submit_quiz_attempt(
#     step_id: str,
#     attempt_data: QuizAttemptCreate,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Отправка ответа на квиз"""
#     ...

# @router.get("/{step_id}/quiz/attempt", response_model=QuizAttemptResponse | None)
# def get_quiz_attempt(
#     step_id: str,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db)
# ):
#     """Получение предыдущей попытки квиза"""
#     ...
