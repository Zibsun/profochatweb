from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.quiz import QuizAttemptResponse, QuizAttemptCreate
from app.models.quiz_attempt import QuizAttempt
from app.models.lesson_step import LessonStep
from app.models.user import User

router = APIRouter()

@router.post("/{step_id}/quiz/attempt")
def submit_quiz_attempt(
    step_id: str,
    attempt_data: QuizAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отправка ответа на квиз"""
    # Проверка существования шага
    step = db.query(LessonStep).filter(LessonStep.step_id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаг не найден"
        )
    
    if step.step_type != "quiz_single_choice":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Этот шаг не является квизом"
        )
    
    # Получение контента шага
    content = step.content
    options = content.get("options", [])
    
    # Поиск правильного ответа
    correct_option = next((opt for opt in options if opt.get("correct")), None)
    is_correct = correct_option and correct_option.get("id") == attempt_data.selected_option_id
    
    # Создание попытки
    attempt = QuizAttempt(
        user_id=current_user.user_id,
        step_id=step_id,
        selected_option_id=attempt_data.selected_option_id,
        is_correct=is_correct,
        score=Decimal("1.0") if is_correct else Decimal("0.0"),
        max_score=Decimal("1.0")
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    # Формирование ответа
    feedback = content.get("feedback_correct" if is_correct else "feedback_incorrect", "")
    
    return {
        "is_correct": is_correct,
        "feedback": feedback,
        "score": float(attempt.score),
        "max_score": float(attempt.max_score)
    }

@router.get("/{step_id}/quiz/attempt", response_model=QuizAttemptResponse | None)
def get_quiz_attempt(
    step_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение предыдущей попытки квиза"""
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.user_id,
        QuizAttempt.step_id == step_id
    ).first()
    return attempt

