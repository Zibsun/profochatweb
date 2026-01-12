from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.course import CourseResponse
from app.schemas.progress import CourseProgressResponse, CourseProgressCreate
from app.models.course import Course
from app.models.course_progress import CourseProgress
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    """Получение списка всех курсов"""
    courses = db.query(Course).all()
    return courses

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: str, db: Session = Depends(get_db)):
    """Получение информации о курсе"""
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    return course

@router.get("/{course_id}/progress", response_model=CourseProgressResponse | None)
def get_course_progress(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение прогресса по курсу"""
    progress = db.query(CourseProgress).filter(
        CourseProgress.user_id == current_user.user_id,
        CourseProgress.course_id == course_id
    ).first()
    return progress

@router.post("/{course_id}/start", response_model=CourseProgressResponse)
def start_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Начало прохождения курса"""
    # Проверка существования курса
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    # Проверка существующего прогресса
    existing_progress = db.query(CourseProgress).filter(
        CourseProgress.user_id == current_user.user_id,
        CourseProgress.course_id == course_id
    ).first()
    
    if existing_progress:
        return existing_progress
    
    # Создание нового прогресса
    progress = CourseProgress(
        user_id=current_user.user_id,
        course_id=course_id
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)
    
    return progress

