from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.lesson_step import LessonStepResponse
from app.models.lesson_step import LessonStep
from app.models.user import User

router = APIRouter()

@router.get("/{step_id}", response_model=LessonStepResponse)
def get_step(step_id: str, db: Session = Depends(get_db)):
    """Получение информации о шаге"""
    step = db.query(LessonStep).filter(LessonStep.step_id == step_id).first()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Шаг не найден"
        )
    return step

@router.post("/{step_id}/complete")
def complete_step(
    step_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Завершение шага (заглушка)"""
    # TODO: Реализовать логику обновления прогресса
    return {"message": "Шаг завершен"}

