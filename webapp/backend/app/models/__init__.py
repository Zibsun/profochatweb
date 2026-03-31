# Модель User (универсальная, поддерживает email/password и Telegram авторизацию)
from app.models.user import User
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.lesson_step import LessonStep
from app.models.course_progress import CourseProgress
from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.quiz_attempt import QuizAttempt

# Модели для старой схемы БД (из db.py)
from app.models.run import Run
from app.models.conversation import Conversation
from app.models.waiting_element import WaitingElement
from app.models.course_db import CourseDB
from app.models.course_element_db import CourseElementDB
from app.models.banned_participant import BannedParticipant
from app.models.course_participant import CourseParticipant
from app.models.course_deployment_db import CourseDeploymentDB

# Модели для Telegram авторизации и мультитенантности
# UserTelegram - алиас для User (обратная совместимость)
from app.models.user_telegram import UserTelegram
from app.models.account import Account
from app.models.account_member import AccountMember

__all__ = [
    'User',  # Email/password авторизация
    'Course',
    'Lesson',
    'LessonStep',
    'CourseProgress',
    'ChatSession',
    'ChatMessage',
    'QuizAttempt',
    # Старая схема БД
    'Run',
    'Conversation',
    'WaitingElement',
    'CourseDB',
    'CourseElementDB',
    'BannedParticipant',
    'CourseParticipant',
    # Telegram auth и мультитенантность
    'UserTelegram',
    'Account',
    'AccountMember',
]

