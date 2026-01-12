"""Сервис для работы с прогрессом обучения"""
from sqlalchemy.orm import Session
from app.models.course_progress import CourseProgress
from app.models.lesson_step import LessonStep

def update_progress(
    db: Session,
    user_id: str,
    course_id: str,
    step_id: str
):
    """Обновление прогресса пользователя"""
    # Получение шага для определения урока
    step = db.query(LessonStep).filter(LessonStep.step_id == step_id).first()
    if not step:
        return None
    
    # Получение или создание прогресса
    progress = db.query(CourseProgress).filter(
        CourseProgress.user_id == user_id,
        CourseProgress.course_id == course_id
    ).first()
    
    if not progress:
        progress = CourseProgress(
            user_id=user_id,
            course_id=course_id,
            current_lesson_id=step.lesson_id,
            current_step_id=step_id
        )
        db.add(progress)
    else:
        progress.current_lesson_id = step.lesson_id
        progress.current_step_id = step_id
    
    db.commit()
    db.refresh(progress)
    
    return progress

