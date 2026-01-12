from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.lesson import LessonResponse
from app.schemas.lesson_step import LessonStepResponse
from app.models.lesson import Lesson
from app.models.lesson_step import LessonStep

router = APIRouter()

@router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
def get_lessons(course_id: str, db: Session = Depends(get_db)):
    """Получение списка уроков курса"""
    lessons = db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.order_index).all()
    return lessons

@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: str, db: Session = Depends(get_db)):
    """Получение информации об уроке"""
    lesson = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Урок не найден"
        )
    return lesson

@router.get("/{lesson_id}/steps", response_model=List[LessonStepResponse])
def get_steps(lesson_id: str, db: Session = Depends(get_db)):
    """Получение списка шагов урока"""
    steps = db.query(LessonStep).filter(LessonStep.lesson_id == lesson_id).order_by(LessonStep.order_index).all()
    return steps

