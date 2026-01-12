"""
Упрощенный API для MVP веб-версии
Работает без аутентификации, использует chat_id из cookies
"""
import sys
import os
import json
import yaml
import re
import logging
import httpx
from fastapi import APIRouter, HTTPException, status, Cookie, Response, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Tuple
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Настройка logging сначала
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Устанавливаем переменные окружения перед импортом db
# db.py читает DATABASE_URL из os.environ при импорте
from app.config import settings
if not os.environ.get('DATABASE_URL'):
    os.environ['DATABASE_URL'] = settings.DATABASE_URL

# Устанавливаем BOT_NAME для db.py (использует переменную окружения)
if not os.environ.get('BOT_NAME'):
    os.environ['BOT_NAME'] = "web_bot"

# Импортируем репозиторий для работы с БД через SQLAlchemy
from app.database import get_db
from app.repositories.course_repository import CourseRepository
from app.models.conversation import Conversation
from sqlalchemy import and_, desc

router = APIRouter()

# Получаем project_root для работы с файлами
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))


# Dependency для получения репозитория курсов
def get_course_repository(db: Session = Depends(get_db)) -> CourseRepository:
    """Dependency для получения репозитория курсов"""
    return CourseRepository(db)

# Путь к файлу courses.yml
COURSES_FILE = os.path.join(project_root, "scripts", "courses.yml")


def get_direct_download_link(url: str) -> str:
    """Преобразование Google Drive URL в прямую ссылку для скачивания"""
    # Если URL уже в формате uc?export=download, возвращаем как есть
    if 'uc?export=download' in url or 'uc?export=view' in url:
        return url
    
    # Регулярное выражение для поиска ID файла в различных форматах Google Drive URL
    pattern = r'(?:id=|\/d\/|download\?id=)([-\w]+)'
    
    match = re.search(pattern, url)
    if match:
        file_id = match.group(1)
        # Используем формат uc?export=download для лучшей совместимости
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        return url
    else:
        return url


def extract_file_id_from_drive_url(url: str) -> Optional[str]:
    """Извлечение file_id из Google Drive URL"""
    # Поддерживаем различные форматы Google Drive URL
    # 1. uc?export=download&id=FILE_ID
    # 2. /d/FILE_ID
    # 3. id=FILE_ID
    # 4. download?id=FILE_ID
    pattern = r'(?:id=|\/d\/|download\?id=)([-\w]+)'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    return None


@router.get("/media/proxy")
async def proxy_media(url: str, request: Request):
    """Проксирование медиа файлов для обхода CORS с поддержкой range requests"""
    try:
        logger.info(f"Proxying media URL: {url}")
        
        # Получаем заголовок Range из запроса (для потокового воспроизведения аудио/видео)
        range_header = request.headers.get("range")
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            headers = {}
            if range_header:
                headers["Range"] = range_header
                logger.info(f"Requesting range: {range_header}")
            
            response = await client.get(url, headers=headers)
            
            # Для range requests может быть 206 Partial Content
            if response.status_code not in (200, 206):
                logger.error(f"Failed to fetch media: {response.status_code} for URL: {url}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to fetch media: {response.status_code}"
                )
            
            # Определяем content-type
            content_type = response.headers.get("content-type", "application/octet-stream")
            
            # Если это аудио файл, убеждаемся что content-type правильный
            if url.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.aac')) or 'audio' in content_type.lower():
                if 'audio' not in content_type.lower():
                    # Пытаемся определить по расширению
                    if url.endswith('.mp3'):
                        content_type = 'audio/mpeg'
                    elif url.endswith('.wav'):
                        content_type = 'audio/wav'
                    elif url.endswith('.ogg'):
                        content_type = 'audio/ogg'
                    elif url.endswith('.m4a'):
                        content_type = 'audio/mp4'
                    elif url.endswith('.aac'):
                        content_type = 'audio/aac'
            
            response_headers = {
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            }
            
            # Передаем заголовки для range requests
            if response.status_code == 206:
                content_range = response.headers.get("content-range")
                content_length = response.headers.get("content-length")
                accept_ranges = response.headers.get("accept-ranges", "bytes")
                
                if content_range:
                    response_headers["Content-Range"] = content_range
                if content_length:
                    response_headers["Content-Length"] = content_length
                response_headers["Accept-Ranges"] = accept_ranges
                logger.info(f"Returning partial content: {content_range}")
            
            return StreamingResponse(
                iter([response.content]),
                media_type=content_type,
                status_code=response.status_code,
                headers=response_headers
            )
    except httpx.TimeoutException:
        logger.error(f"Timeout while proxying media: {url}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout while fetching media"
        )
    except Exception as e:
        logger.error(f"Error proxying media {url}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error proxying media: {str(e)}"
        )


class MessageElement(BaseModel):
    element_id: str
    text: str
    button: Optional[str] = None
    options: Optional[list] = None  # Для inline кнопок: [{"text": "...", "goto": "..."}]
    parse_mode: Optional[str] = "MARKDOWN"
    media: Optional[List[str]] = None  # Массив URL медиафайлов (изображения, видео)
    link_preview: Optional[bool] = None  # Показывать ли превью ссылок


class QuizAnswer(BaseModel):
    text: str
    correct: Optional[str] = None  # "yes" для правильного ответа
    feedback: Optional[str] = None


class QuizElement(BaseModel):
    element_id: str
    type: str = Field(default="quiz", exclude=False)  # Всегда включать в JSON
    text: str
    answers: List[QuizAnswer]
    media: Optional[List[str]] = None


class AudioElement(BaseModel):
    element_id: str
    type: str = Field(default="audio", exclude=False)  # Всегда включать в JSON
    text: Optional[str] = None
    media: List[str]  # Обязательный массив URL аудиофайлов
    parse_mode: Optional[str] = "MARKDOWN"
    link_preview: Optional[bool] = None


class InputElement(BaseModel):
    element_id: str
    type: str = Field(default="input", exclude=False)  # Всегда включать в JSON
    text: str
    correct_answer: Optional[str] = None
    feedback_correct: Optional[str] = None
    feedback_incorrect: Optional[str] = None
    input_type: Optional[str] = "text"  # "text" или "sequence"


class QuestionAnswer(BaseModel):
    text: str
    feedback: Optional[str] = None


class QuestionElement(BaseModel):
    element_id: str
    type: str = Field(default="question", exclude=False)  # Всегда включать в JSON
    text: str
    answers: List[QuestionAnswer]


class QuizAnswerRequest(BaseModel):
    element_id: str
    selected_answer_index: int


class QuizAnswerResponse(BaseModel):
    is_correct: bool
    feedback: str
    score: int  # 1 или 0


class InputAnswerRequest(BaseModel):
    element_id: str
    user_answer: str  # Ответ пользователя


class InputAnswerResponse(BaseModel):
    is_correct: bool
    feedback: str
    score: int  # 1 или 0


class QuestionAnswerRequest(BaseModel):
    element_id: str
    selected_answer_index: int


class QuestionAnswerResponse(BaseModel):
    feedback: str  # Feedback для выбранного варианта (может быть пустым)
    score: int = 0  # Всегда 0, так как question не оценивается


class MultiChoiceAnswer(BaseModel):
    text: str
    correct: Optional[str] = None  # "yes" для правильного, "no" для неправильного
    feedback: Optional[str] = None


class MultiChoiceElement(BaseModel):
    element_id: str
    type: str = Field(default="multi_choice", exclude=False)  # Всегда включать в JSON
    text: str
    answers: List[MultiChoiceAnswer]
    feedback_correct: str
    feedback_partial: str
    feedback_incorrect: str


class IndividualFeedback(BaseModel):
    answer_index: int
    answer_text: str
    feedback: Optional[str] = None


class MultiChoiceAnswerRequest(BaseModel):
    element_id: str
    selected_answer_indices: List[int]  # Массив индексов выбранных ответов


class MultiChoiceAnswerResponse(BaseModel):
    is_correct: bool  # True если полностью правильно
    feedback: str  # Итоговое сообщение (correct/partial/incorrect)
    individual_feedbacks: List[IndividualFeedback]  # Feedback для каждого выбранного варианта
    score: float  # 1.0, 0.5 или 0.0


class TestElement(BaseModel):
    element_id: str
    type: str = Field(default="test", exclude=False)  # Всегда включать в JSON
    text: str
    prefix: str
    score: Dict[int, str]  # Ключ - процент ошибок, значение - сообщение
    button: Optional[str] = None


class EndElement(BaseModel):
    element_id: str
    type: str = Field(default="end", exclude=False)
    text: Optional[str] = None


class RevisionElement(BaseModel):
    element_id: str
    type: str = Field(default="revision", exclude=False)
    text: str
    prefix: str
    no_mistakes: str
    button: Optional[str] = None


class DialogElement(BaseModel):
    element_id: str
    type: str = Field(default="dialog", exclude=False)
    text: str  # Начальное сообщение
    prompt: str  # Системный промпт для AI
    model: Optional[str] = None
    temperature: Optional[float] = None
    reasoning: Optional[str] = None
    parse_mode: Optional[str] = "MARKDOWN"
    link_preview: Optional[bool] = None
    auto_start: Optional[bool] = False
    voice_response: Optional[bool] = False
    transcription_language: Optional[str] = None
    tts_voice: Optional[str] = None
    tts_model: Optional[str] = None
    tts_speed: Optional[float] = 1.0
    conversation: Optional[List[Dict[str, str]]] = []  # История диалога
    
    class Config:
        extra = "allow"  # Для обратной совместимости


class DialogMessageRequest(BaseModel):
    element_id: str
    message: str


class DialogMessageResponse(BaseModel):
    reply: str
    stop: bool
    conversation: List[Dict[str, str]]


class RevisionResultResponse(BaseModel):
    has_mistakes: bool
    message: str  # text или no_mistakes в зависимости от наличия ошибок
    mistakes_count: int  # Количество элементов с ошибками
    revision_chain: List[dict] = []  # Список элементов для повторения (если есть ошибки)


class TestResultResponse(BaseModel):
    total_score: float
    total_max_score: float
    error_percentage: float
    result_text: str  # Текст с подставленными переменными
    feedback_message: str  # Выбранное сообщение из score


class CourseNotFoundResponse(BaseModel):
    error: str
    message: str


def generate_chat_id() -> int:
    """Генерация chat_id для анонимного пользователя"""
    import random
    # Генерируем случайный chat_id в диапазоне, который не пересекается с реальными Telegram ID
    # Telegram ID обычно начинаются с 1, используем диапазон 1000000000-9999999999
    return random.randint(1000000000, 9999999999)


def get_or_create_chat_id(chat_id_cookie: Optional[int] = None) -> int:
    """Получение или создание chat_id"""
    if chat_id_cookie:
        return chat_id_cookie
    return generate_chat_id()


def get_active_run(chat_id: int, course_id: str, repo: CourseRepository) -> Optional[int]:
    """Получение активной сессии (run_id) для пользователя и курса"""
    run_id = repo.get_run_id(chat_id, course_id)
    if run_id:
        # Проверяем, что сессия не завершена
        if repo.is_course_ended(chat_id, course_id):
            return None  # Сессия завершена
        return run_id
    return None


def get_current_element_from_conversation(chat_id: int, course_id: str, run_id: int, repo: CourseRepository) -> Optional[dict]:
    """Получение текущего элемента из conversation"""
    from app.models.conversation import Conversation
    from sqlalchemy import func as sql_func
    
    # Сначала проверяем наличие активной цепочки повторения
    # Ищем последнюю запись с revision данными
    revision_conv = repo.db.query(Conversation).filter(
        and_(
            Conversation.chat_id == chat_id,
            Conversation.course_id == course_id,
            Conversation.run_id == run_id,
            Conversation.role == 'bot',
            Conversation.json.like('%"revision"%')
        )
    ).order_by(desc(Conversation.date_inserted)).first()
    
    if revision_conv:
        revision_result = (
            revision_conv.element_id,
            revision_conv.element_type,
            revision_conv.json,
            revision_conv.report
        )
        
        if revision_result:
            revision_element_id, revision_element_type, revision_json_data, revision_report = revision_result
            revision_element_data = json.loads(revision_json_data)
            
            # Проверяем наличие активной цепочки повторения
            if "revision" in revision_element_data:
                revision_info = revision_element_data["revision"]
                revision_chain = revision_info.get("data", [])
                
                if len(revision_chain) > 0:
                    # Берем первый элемент из цепочки
                    first_chain_item = revision_chain[0]
                    first_element_id = list(first_chain_item.keys())[0]
                    first_element_data = first_chain_item[first_element_id]["element_data"]
                    
                    element_type = first_element_data.get("type", "message")
                    
                    # Обрабатываем элемент в зависимости от типа
                    if element_type == "quiz":
                        answers = first_element_data.get("answers", [])
                        normalized_answers = []
                        for answer in answers:
                            normalized_answer = answer.copy()
                            if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                                normalized_answer["text"] = str(normalized_answer["text"])
                            correct_value = answer.get("correct")
                            if correct_value is True or correct_value == "yes":
                                normalized_answer["correct"] = "yes"
                            elif correct_value is False or correct_value == "no":
                                normalized_answer.pop("correct", None)
                            normalized_answers.append(normalized_answer)
                        
                        media = first_element_data.get("media")
                        if media and isinstance(media, list):
                            from urllib.parse import quote
                            media = [
                                f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                                if extract_file_id_from_drive_url(url) else url
                                for url in media
                            ]
                        
                        result = {
                            "element_id": first_element_id,
                            "type": "quiz",
                            "text": first_element_data.get("text", ""),
                            "answers": normalized_answers,
                            "media": media,
                        }
                        logger.info(f"get_current_element_from_conversation: revision chain quiz element_id={first_element_id}")
                        return result
                    
                    elif element_type == "input":
                        result = {
                            "element_id": first_element_id,
                            "type": "input",
                            "text": first_element_data.get("text", ""),
                            "correct_answer": first_element_data.get("correct_answer"),
                            "feedback_correct": first_element_data.get("feedback_correct"),
                            "feedback_incorrect": first_element_data.get("feedback_incorrect"),
                            "input_type": first_element_data.get("input_type", "text"),
                        }
                        logger.info(f"get_current_element_from_conversation: revision chain input element_id={first_element_id}")
                        return result
                    
                    elif element_type == "multi_choice":
                        answers = first_element_data.get("answers", [])
                        normalized_answers = []
                        for answer in answers:
                            normalized_answer = answer.copy()
                            correct_value = answer.get("correct")
                            if correct_value is True or correct_value == "yes":
                                normalized_answer["correct"] = "yes"
                            elif correct_value is False or correct_value == "no":
                                normalized_answer["correct"] = "no"
                            normalized_answers.append(normalized_answer)
                        
                        result = {
                            "element_id": first_element_id,
                            "type": "multi_choice",
                            "text": first_element_data.get("text", ""),
                            "answers": normalized_answers,
                            "feedback_correct": first_element_data.get("feedback_correct", ""),
                            "feedback_partial": first_element_data.get("feedback_partial", ""),
                            "feedback_incorrect": first_element_data.get("feedback_incorrect", ""),
                        }
                        logger.info(f"get_current_element_from_conversation: revision chain multi_choice element_id={first_element_id}")
                        return result
        
        # Если нет активной цепочки повторения, ищем последний элемент с role='bot'
        conv = repo.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.course_id == course_id,
                Conversation.run_id == run_id,
                Conversation.role == 'bot'
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if conv:
            element_id = conv.element_id
            element_type = conv.element_type
            json_data = conv.json
            report = conv.report
            element_data = json.loads(json_data) if json_data else {}
            
            # Обработка audio элементов
            if element_type == "audio":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "audio",
                    "text": element_info.get("text"),
                    "media": element_info.get("media", []),
                    "parse_mode": element_info.get("parse_mode", "MARKDOWN"),
                    "link_preview": element_info.get("link_preview"),
                }
                logger.info(f"get_current_element_from_conversation: audio element_id={element_id}")
                return result
            
            # Обработка quiz элементов
            if element_type == "quiz":
                element_info = element_data.get("element_data", {})
                
                # Нормализуем answers: преобразуем correct из boolean в строку "yes"
                # и text в строку (на случай если это число из YAML)
                answers = element_info.get("answers", [])
                normalized_answers = []
                for answer in answers:
                    normalized_answer = answer.copy()
                    # Преобразуем text в строку, если это не строка
                    if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                        normalized_answer["text"] = str(normalized_answer["text"])
                    correct_value = answer.get("correct")
                    if correct_value is True or correct_value == "yes":
                        normalized_answer["correct"] = "yes"
                    elif correct_value is False or correct_value == "no":
                        # Удаляем поле correct для неправильных ответов
                        normalized_answer.pop("correct", None)
                    normalized_answers.append(normalized_answer)
                
                result = {
                    "element_id": element_id,
                    "type": "quiz",
                    "text": element_info.get("text", ""),
                    "answers": normalized_answers,
                    "media": element_info.get("media"),
                }
                logger.info(f"get_current_element_from_conversation: quiz element_id={element_id}")
                return result
            
            # Обработка input элементов
            if element_type == "input":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "input",
                    "text": element_info.get("text", ""),
                    "correct_answer": element_info.get("correct_answer"),
                    "feedback_correct": element_info.get("feedback_correct"),
                    "feedback_incorrect": element_info.get("feedback_incorrect"),
                    "input_type": element_info.get("input_type", "text"),
                }
                logger.info(f"get_current_element_from_conversation: input element_id={element_id}")
                return result
            
            # Обработка question элементов
            if element_type == "question":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "question",
                    "text": element_info.get("text", ""),
                    "answers": element_info.get("answers", []),
                }
                logger.info(f"get_current_element_from_conversation: question element_id={element_id}")
                return result
            
            # Обработка multi_choice элементов
            if element_type == "multi_choice":
                element_info = element_data.get("element_data", {})
                
                # Нормализуем answers: преобразуем correct из boolean в строку "yes"/"no"
                answers = element_info.get("answers", [])
                normalized_answers = []
                for answer in answers:
                    normalized_answer = answer.copy()
                    correct_value = answer.get("correct")
                    if correct_value is True or correct_value == "yes":
                        normalized_answer["correct"] = "yes"
                    elif correct_value is False or correct_value == "no":
                        normalized_answer["correct"] = "no"
                    normalized_answers.append(normalized_answer)
                
                result = {
                    "element_id": element_id,
                    "type": "multi_choice",
                    "text": element_info.get("text", ""),
                    "answers": normalized_answers,
                    "feedback_correct": element_info.get("feedback_correct", ""),
                    "feedback_partial": element_info.get("feedback_partial", ""),
                    "feedback_incorrect": element_info.get("feedback_incorrect", ""),
                }
                logger.info(f"get_current_element_from_conversation: multi_choice element_id={element_id}")
                return result
            
            # Обработка test элементов
            if element_type == "test":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "test",
                    "text": element_info.get("text", ""),
                    "prefix": element_info.get("prefix", ""),
                    "score": element_info.get("score", {}),
                    "button": element_info.get("button"),
                }
                logger.info(f"get_current_element_from_conversation: test element_id={element_id}")
                return result
            
            # Обработка end элементов
            if element_type == "end":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "end",
                    "text": element_info.get("text"),
                }
                logger.info(f"get_current_element_from_conversation: end element_id={element_id}")
                return result
            
            # Обработка revision элементов
            if element_type == "revision":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "type": "revision",
                    "text": element_info.get("text", ""),
                    "prefix": element_info.get("prefix", ""),
                    "no_mistakes": element_info.get("no_mistakes", ""),
                    "button": element_info.get("button"),
                }
                logger.info(f"get_current_element_from_conversation: revision element_id={element_id}")
                return result
            
            # Обработка dialog элементов
            if element_type == "dialog":
                element_info = element_data.get("element_data", {})
                text_value = element_info.get("text", "")
                logger.info(f"get_current_element_from_conversation: dialog element_id={element_id}, text={text_value[:50] if text_value else 'EMPTY'}, element_info keys={list(element_info.keys())}")
                result = {
                    "element_id": element_id,
                    "type": "dialog",
                    "text": text_value,
                    "prompt": element_info.get("prompt", ""),
                    "model": element_info.get("model"),
                    "temperature": element_info.get("temperature"),
                    "reasoning": element_info.get("reasoning"),
                    "parse_mode": element_info.get("parse_mode", "MARKDOWN"),
                    "link_preview": element_info.get("link_preview"),
                    "auto_start": element_info.get("auto_start", False),
                    "voice_response": element_info.get("voice_response", False),
                    "transcription_language": element_info.get("transcription_language"),
                    "tts_voice": element_info.get("tts_voice"),
                    "tts_model": element_info.get("tts_model"),
                    "tts_speed": element_info.get("tts_speed", 1.0),
                    "conversation": element_info.get("conversation", [])
                }
                logger.info(f"get_current_element_from_conversation: dialog result text={result['text'][:50] if result['text'] else 'EMPTY'}")
                return result
            
            # Обработка message элементов
            if element_type == "message":
                element_info = element_data.get("element_data", {})
                result = {
                    "element_id": element_id,
                    "text": element_info.get("text", ""),
                    "button": element_info.get("button"),
                    "options": element_info.get("options"),  # Поддержка inline кнопок
                    "parse_mode": element_info.get("parse_mode", "MARKDOWN"),
                    "media": element_info.get("media"),  # Поддержка медиа файлов
                    "link_preview": element_info.get("link_preview")  # Поддержка link_preview
                }
                logger.info(f"get_current_element_from_conversation: element_id={element_id}, options={result.get('options')}, media={result.get('media')}, json_data keys={list(element_info.keys())}")
                return result
    
    return None


def load_courses_yml() -> dict:
    """Загрузка courses.yml"""
    try:
        with open(COURSES_FILE, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading courses.yml: {e}", exc_info=True)
        return {}


def normalize_answer(answer: str, input_type: str) -> str:
    """Нормализация ответа в зависимости от типа input"""
    if input_type == "sequence":
        # Убираем все нецифровые символы
        import re
        return re.sub(r'\D', '', answer)
    else:  # input_type == "text"
        # Регистронезависимое сравнение, убираем пробелы в начале и конце
        return answer.strip().lower()


def compare_answers(user_answer: str, correct_answer: str, input_type: str) -> bool:
    """Сравнение ответов с учетом типа нормализации"""
    normalized_user = normalize_answer(user_answer, input_type)
    normalized_correct = normalize_answer(correct_answer, input_type)
    return normalized_user == normalized_correct


def calculate_multichoice_result(selected_indices: List[int], answers: List[dict]) -> tuple:
    """
    Вычисляет результат multi_choice ответа
    
    Возвращает:
    - (is_correct, result_type, score)
    - result_type: "correct", "partial" или "incorrect"
    """
    # Находим все правильные и неправильные ответы
    correct_indices = [i for i, ans in enumerate(answers) if ans.get("correct") == "yes"]
    incorrect_indices = [i for i, ans in enumerate(answers) if ans.get("correct") == "no"]
    
    selected_correct = [i for i in selected_indices if i in correct_indices]
    selected_incorrect = [i for i in selected_indices if i in incorrect_indices]
    
    # Определяем результат
    all_correct_selected = len(selected_correct) == len(correct_indices)
    no_incorrect_selected = len(selected_incorrect) == 0
    
    if all_correct_selected and no_incorrect_selected:
        return (True, "correct", 1.0)
    elif len(selected_correct) > 0 or len(selected_incorrect) < len(incorrect_indices):
        return (False, "partial", 0.5)
    else:
        return (False, "incorrect", 0.0)


def find_revision_mistakes(chat_id: int, course_id: str, run_id: int, prefix: str, repo: CourseRepository) -> Tuple[List[dict], List[dict]]:
    """
    Находит элементы с ошибками и правильные элементы для повторения
    
    Возвращает:
    - (mistakes_list, correct_elements_list)
    - mistakes_list: список элементов с ошибками [{element_id: {element_data: {...}}}, ...]
    - correct_elements_list: список правильных элементов для разнообразия
    """
    # Загружаем курс и находим элементы с префиксом
    course_data = get_course_data(course_id)
    if not course_data:
        logger.warning(f"Revision mistakes: course {course_id} not found")
        return ([], [])
    
    # Находим все элементы с префиксом (только те, которые могут иметь оценки)
    scored_element_types = ["quiz", "input", "multi_choice"]
    elements_with_prefix = []
    
    for element_id, element_data in course_data.items():
        if element_id.startswith(prefix):
            element_type = element_data.get("type", "message")
            if element_type in scored_element_types:
                elements_with_prefix.append((element_id, element_type, element_data))
                logger.info(f"Revision mistakes: found element {element_id} ({element_type}) with prefix {prefix}")
    
    if not elements_with_prefix:
        logger.warning(f"Revision mistakes: no elements found with prefix {prefix}")
        return ([], [])
    
    logger.info(f"Revision mistakes: found {len(elements_with_prefix)} elements with prefix {prefix}")
    
    # Собираем результаты из БД через репозиторий
    mistakes_list = []
    correct_elements_list = []
    
    # Получаем ответы пользователя для всех элементов
    user_responses = repo.get_user_responses_for_elements(chat_id, course_id, run_id, elements_with_prefix)
    
    for response in user_responses:
        element_id = response["element_id"]
        json_str = response["json"]
        db_score = response["score"]
        db_maxscore = response["maxscore"]
        
        # Находим соответствующий элемент из elements_with_prefix
        element_data = None
        element_type = None
        for eid, etype, edata in elements_with_prefix:
            if eid == element_id:
                element_data = edata
                element_type = etype
                break
        
        if not element_data:
            continue
        
        score = None
        max_score = None
        
        # Приоритет 1: используем колонки score и maxscore
        if db_score is not None and db_maxscore is not None:
            score = float(db_score)
            max_score = float(db_maxscore)
        # Приоритет 2: если колонки NULL, но есть JSON - используем JSON
        elif json_str:
            try:
                json_data = json.loads(json_str) if isinstance(json_str, str) else json_str
                user_answer = json_data.get("user_answer", {})
                score = user_answer.get("score", 0)
                max_score = user_answer.get("max_score", 0)
                
                if isinstance(score, (int, float)):
                    score = float(score)
                if isinstance(max_score, (int, float)):
                    max_score = float(max_score)
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Error parsing JSON for element {element_id}: {e}")
                continue
        
        # Проверяем, является ли ответ ошибкой
        if score is not None and max_score is not None and max_score > 0:
            is_mistake = False
            
            if element_type == "quiz" or element_type == "input":
                # Для quiz и input ошибка если score != 1
                is_mistake = (score != 1.0)
            elif element_type == "multi_choice":
                # Для multi_choice ошибка если score < 1.0
                is_mistake = (score < 1.0)
            
            # Получаем данные элемента из YAML
            element_dict = {element_id: {"element_data": element_data}}
            
            if is_mistake:
                mistakes_list.append(element_dict)
                logger.info(f"Revision mistakes: element {element_id} is a mistake (score={score}, max_score={max_score})")
            else:
                correct_elements_list.append(element_dict)
                logger.info(f"Revision mistakes: element {element_id} is correct (score={score}, max_score={max_score})")
        else:
            logger.info(f"Revision mistakes: element {element_id} - no valid score found, skipping")
    
    # Выбираем случайные правильные элементы для разнообразия (по умолчанию 2)
    import random
    if len(correct_elements_list) > 2:
        correct_elements_list = random.sample(correct_elements_list, 2)
    
    logger.info(f"Revision mistakes: found {len(mistakes_list)} mistakes and {len(correct_elements_list)} correct elements")
    return (mistakes_list, correct_elements_list)


def calculate_test_score(chat_id: int, course_id: str, run_id: int, prefix: str, repo: CourseRepository) -> Tuple[float, float]:
    """
    Подсчитывает сумму баллов по всем элементам с префиксом
    
    Возвращает:
    - (total_score, total_max_score)
    """
    # Загружаем курс и находим элементы с префиксом
    course_data = get_course_data(course_id)
    if not course_data:
        logger.warning(f"Test score: course {course_id} not found")
        return (0.0, 0.0)
    
    # Находим все элементы с префиксом (только те, которые могут иметь оценки)
    scored_element_types = ["quiz", "input", "multi_choice"]
    elements_with_prefix = []
    
    for element_id, element_data in course_data.items():
        if element_id.startswith(prefix):
            element_type = element_data.get("type", "message")
            if element_type in scored_element_types:
                elements_with_prefix.append((element_id, element_type, element_data))
                logger.info(f"Test score: found element {element_id} ({element_type}) with prefix {prefix}")
    
    if not elements_with_prefix:
        logger.warning(f"Test score: no elements found with prefix {prefix}")
        return (0.0, 0.0)
    
    logger.info(f"Test score: found {len(elements_with_prefix)} elements with prefix {prefix}")
    logger.info(f"Test score: calculating for chat_id={chat_id}, course_id={course_id}, run_id={run_id}, prefix={prefix}")
    
    # Собираем результаты из БД через репозиторий
    total_score, total_max_score = repo.get_test_scores(chat_id, course_id, run_id, elements_with_prefix)
    
    # Избегаем деления на ноль
    if total_max_score == 0:
        total_max_score = 1.0
    
    logger.info(f"Test score: final result - total_score={total_score}, total_max_score={total_max_score} for prefix {prefix}")
    return (total_score, total_max_score)


def select_test_feedback(error_percentage: float, score_dict: Dict[int, str]) -> str:
    """
    Выбирает сообщение из словаря score по проценту ошибок
    
    Args:
        error_percentage: Процент ошибок (0-100)
        score_dict: Словарь {процент_ошибок: сообщение}
    
    Returns:
        Выбранное сообщение
    """
    if not score_dict:
        return "Результат получен."
    
    # Сортируем ключи по возрастанию
    sorted_keys = sorted(score_dict.keys())
    
    # Находим первый ключ, где error_percentage <= key
    for key in sorted_keys:
        if error_percentage <= key:
            return score_dict[key]
    
    # Если не нашли, возвращаем сообщение с максимальным ключом
    return score_dict[sorted_keys[-1]]


def substitute_test_variables(text: str, score: float, max_score: float) -> str:
    """
    Подставляет переменные {score} и {maxscore} в текст
    
    Args:
        text: Текст с переменными
        score: Набранные баллы
        max_score: Максимальные баллы
    
    Returns:
        Текст с подставленными переменными
    """
    # Округляем до 1 знака после запятой
    score_str = f"{score:.1f}".rstrip('0').rstrip('.')
    max_score_str = f"{max_score:.1f}".rstrip('0').rstrip('.')
    
    # Подставляем переменные
    result = text.replace("{score}", score_str)
    result = result.replace("{maxscore}", max_score_str)
    
    return result


def get_course_path(course_id: str) -> Optional[str]:
    """Получение пути к файлу курса из courses.yml"""
    courses = load_courses_yml()
    if course_id not in courses:
        return None
    
    course_info = courses[course_id]
    if not isinstance(course_info, dict):
        return None
    
    path = course_info.get("path")
    if not path:
        return None
    
    # Если путь начинается с "scripts/", используем его как есть
    if path.startswith("scripts/"):
        return os.path.join(project_root, path)
    
    # Если путь относительный, добавляем "scripts/"
    if not os.path.isabs(path):
        return os.path.join(project_root, "scripts", path)
    
    return path


def load_course_yaml(course_path: str) -> Optional[dict]:
    """Загрузка YAML файла курса"""
    try:
        if not os.path.exists(course_path):
            logger.error(f"Course file not found: {course_path}")
            return None
        
        with open(course_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        logger.error(f"Error loading course YAML {course_path}: {e}", exc_info=True)
        return None


def get_course_data(course_id: str) -> Optional[dict]:
    """Получение данных курса (все элементы, включая нереализованные)"""
    course_path = get_course_path(course_id)
    if not course_path:
        return None
    
    course_data = load_course_yaml(course_path)
    if not course_data:
        return None
    
    # Возвращаем все элементы (включая нереализованные для обработки)
    return course_data


def get_first_element_from_course(course_id: str) -> Optional[dict]:
    """Получение первого элемента курса из YAML"""
    try:
        course_data = get_course_data(course_id)
        if not course_data:
            return None
        
        # Получаем первый элемент
        for element_id, element_data in course_data.items():
            element_type = element_data.get("type", "message")
            
            # Обработка audio элементов
            if element_type == "audio":
                # Обработка link_preview: может быть "yes"/"no" или True/False
                link_preview = element_data.get("link_preview")
                if isinstance(link_preview, str):
                    link_preview = link_preview.lower() == "yes"
                elif link_preview is None:
                    link_preview = None
                else:
                    link_preview = bool(link_preview)
                
                # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
                media = element_data.get("media", [])
                if media and isinstance(media, list):
                    from urllib.parse import quote
                    media = [
                        f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                        if extract_file_id_from_drive_url(url) else url
                        for url in media
                    ]
                
                result = {
                    "element_id": element_id,
                    "type": "audio",
                    "text": element_data.get("text"),
                    "media": media,
                    "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                    "link_preview": link_preview,
                }
                logger.info(f"get_first_element_from_course: audio element_id={element_id}")
                return result
            
            # Обработка input элементов
            if element_type == "input":
                result = {
                    "element_id": element_id,
                    "type": "input",
                    "text": element_data.get("text", ""),
                    "correct_answer": element_data.get("correct_answer"),
                    "feedback_correct": element_data.get("feedback_correct"),
                    "feedback_incorrect": element_data.get("feedback_incorrect"),
                    "input_type": element_data.get("input_type", "text"),
                }
                logger.info(f"get_first_element_from_course: input element_id={element_id}")
                return result
            
            # Обработка question элементов
            if element_type == "question":
                result = {
                    "element_id": element_id,
                    "type": "question",
                    "text": element_data.get("text", ""),
                    "answers": element_data.get("answers", []),
                }
                logger.info(f"get_first_element_from_course: question element_id={element_id}")
                return result
            
            # Обработка multi_choice элементов
            if element_type == "multi_choice":
                # Нормализуем answers: преобразуем correct из boolean в строку "yes"/"no"
                answers = element_data.get("answers", [])
                normalized_answers = []
                for answer in answers:
                    normalized_answer = answer.copy()
                    correct_value = answer.get("correct")
                    if correct_value is True or correct_value == "yes":
                        normalized_answer["correct"] = "yes"
                    elif correct_value is False or correct_value == "no":
                        normalized_answer["correct"] = "no"
                    normalized_answers.append(normalized_answer)
                
                result = {
                    "element_id": element_id,
                    "type": "multi_choice",
                    "text": element_data.get("text", ""),
                    "answers": normalized_answers,
                    "feedback_correct": element_data.get("feedback_correct", ""),
                    "feedback_partial": element_data.get("feedback_partial", ""),
                    "feedback_incorrect": element_data.get("feedback_incorrect", ""),
                }
                logger.info(f"get_first_element_from_course: multi_choice element_id={element_id}")
                return result
            
            # Обработка quiz элементов
            if element_type == "quiz":
                # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
                media = element_data.get("media")
                if media and isinstance(media, list):
                    from urllib.parse import quote
                    media = [
                        f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                        if extract_file_id_from_drive_url(url) else url
                        for url in media
                    ]
                
                # Нормализуем answers: преобразуем correct из boolean в строку "yes"
                # и text в строку (на случай если это число из YAML)
                answers = element_data.get("answers", [])
                normalized_answers = []
                for answer in answers:
                    normalized_answer = answer.copy()
                    # Преобразуем text в строку, если это не строка
                    if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                        normalized_answer["text"] = str(normalized_answer["text"])
                    correct_value = answer.get("correct")
                    if correct_value is True or correct_value == "yes":
                        normalized_answer["correct"] = "yes"
                    elif correct_value is False or correct_value == "no":
                        # Удаляем поле correct для неправильных ответов
                        normalized_answer.pop("correct", None)
                    normalized_answers.append(normalized_answer)
                
                result = {
                    "element_id": element_id,
                    "type": "quiz",
                    "text": element_data.get("text", ""),
                    "answers": normalized_answers,
                    "media": media,
                }
                logger.info(f"get_first_element_from_course: quiz element_id={element_id}")
                return result
            
            # Обработка test элементов
            if element_type == "test":
                result = {
                    "element_id": element_id,
                    "type": "test",
                    "text": element_data.get("text", ""),
                    "prefix": element_data.get("prefix", ""),
                    "score": element_data.get("score", {}),
                    "button": element_data.get("button"),
                }
                logger.info(f"get_first_element_from_course: test element_id={element_id}")
                return result
            
            # Обработка end элементов
            if element_type == "end":
                result = {
                    "element_id": element_id,
                    "type": "end",
                    "text": element_data.get("text"),
                }
                logger.info(f"get_first_element_from_course: end element_id={element_id}")
                return result
            
            # Обработка revision элементов
            if element_type == "revision":
                result = {
                    "element_id": element_id,
                    "type": "revision",
                    "text": element_data.get("text", ""),
                    "prefix": element_data.get("prefix", ""),
                    "no_mistakes": element_data.get("no_mistakes", ""),
                    "button": element_data.get("button"),
                }
                logger.info(f"get_first_element_from_course: revision element_id={element_id}")
                return result
            
            # Обработка dialog элементов
            if element_type == "dialog":
                # Обработка auto_start: может быть "yes"/"no", True/False или строка
                auto_start = element_data.get("auto_start", False)
                if isinstance(auto_start, str):
                    auto_start = auto_start.lower() in ("true", "yes", "1")
                else:
                    auto_start = bool(auto_start)
                
                # Обработка voice_response: может быть "yes"/"no", True/False или строка
                voice_response = element_data.get("voice_response", False)
                if isinstance(voice_response, str):
                    voice_response = voice_response.lower() in ("true", "yes", "1")
                else:
                    voice_response = bool(voice_response)
                
                text_value = element_data.get("text", "")
                logger.info(f"get_first_element_from_course: dialog element_id={element_id}, text length={len(text_value)}, text preview={text_value[:50] if text_value else 'EMPTY'}, element_data keys={list(element_data.keys())}")
                
                result = {
                    "element_id": element_id,
                    "type": "dialog",
                    "text": text_value,
                    "prompt": element_data.get("prompt", ""),
                    "model": element_data.get("model"),
                    "temperature": element_data.get("temperature"),
                    "reasoning": element_data.get("reasoning"),
                    "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                    "link_preview": element_data.get("link_preview"),
                    "auto_start": auto_start,
                    "voice_response": voice_response,
                    "transcription_language": element_data.get("transcription_language"),
                    "tts_voice": element_data.get("tts_voice"),
                    "tts_model": element_data.get("tts_model"),
                    "tts_speed": element_data.get("tts_speed", 1.0),
                    "conversation": element_data.get("conversation", [])
                }
                logger.info(f"get_first_element_from_course: dialog result text length={len(result['text'])}, text preview={result['text'][:50] if result['text'] else 'EMPTY'}")
                return result
            
            # Обработка нереализованных элементов
            unimplemented_types = {
                "miniapp": "Telegram Mini App",
                "jump": "Навигация с опциями",
                "revision": "Повторение ошибок",
                "delay": "Задержка перед следующим элементом",
                "end": "Завершение курса"
            }
            
            if element_type in unimplemented_types:
                element_text = element_data.get("text", "")
                element_name = unimplemented_types[element_type]
                result = {
                    "element_id": element_id,
                    "type": "unimplemented",
                    "original_type": element_type,
                    "element_name": element_name,
                    "text": f"⚠️ Элемент '{element_name}' (тип: {element_type}) еще не реализован в MVP версии.\n\n"
                           f"Оригинальный текст элемента:\n{element_text}\n\n"
                           f"Этот элемент будет пропущен, и курс продолжит выполнение со следующего элемента.",
                    "button": "Продолжить"
                }
                logger.warning(f"get_first_element_from_course: unimplemented element type={element_type}, element_id={element_id}")
                return result
            
            # Обработка message элементов
            # Обработка link_preview: может быть "yes"/"no" или True/False
            link_preview = element_data.get("link_preview")
            if isinstance(link_preview, str):
                link_preview = link_preview.lower() == "yes"
            elif link_preview is None:
                link_preview = None
            else:
                link_preview = bool(link_preview)
            
            # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
            media = element_data.get("media")
            if media and isinstance(media, list):
                # Преобразуем в прокси URL через backend
                from urllib.parse import quote
                media = [
                    f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                    if extract_file_id_from_drive_url(url) else url
                    for url in media
                ]
                logger.info(f"Converted media URLs: {media}")
            
            result = {
                "element_id": element_id,
                "text": element_data.get("text", ""),
                "button": element_data.get("button"),
                "options": element_data.get("options"),  # Поддержка inline кнопок
                "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                "media": media,  # Поддержка медиа файлов (с проксированием через backend)
                "link_preview": link_preview  # Поддержка link_preview
            }
            logger.info(f"get_first_element_from_course: element_id={element_id}, options={result.get('options')}, media={result.get('media')}")
            return result
    except Exception as e:
        logger.error(f"Error loading course {course_id}: {e}", exc_info=True)
    return None


def get_next_element_from_course(course_id: str, current_element_id: str) -> Optional[dict]:
    """Получение следующего элемента курса из YAML"""
    try:
        course_data = get_course_data(course_id)
        if not course_data:
            return None
        
        logger.info(f"get_next_element_from_course: searching for next element after {current_element_id}")
        # Ищем следующий элемент после current_element_id
        # Пропускаем нереализованные элементы автоматически
        next_element = False
        unimplemented_types = {
            "miniapp": "Telegram Mini App",
            "jump": "Навигация с опциями",
            "delay": "Задержка перед следующим элементом"
        }
        
        for element_id, element_data in course_data.items():
            if element_id == current_element_id:
                logger.info(f"get_next_element_from_course: found current element {element_id}, next element will be returned")
                next_element = True
                continue
            if next_element:
                element_type = element_data.get("type", "message")
                
                # Обработка audio элементов
                if element_type == "audio":
                    # Обработка link_preview: может быть "yes"/"no" или True/False
                    link_preview = element_data.get("link_preview")
                    if isinstance(link_preview, str):
                        link_preview = link_preview.lower() == "yes"
                    elif link_preview is None:
                        link_preview = None
                    else:
                        link_preview = bool(link_preview)
                    
                    # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
                    media = element_data.get("media", [])
                    if media and isinstance(media, list):
                        from urllib.parse import quote
                        media = [
                            f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                            if extract_file_id_from_drive_url(url) else url
                            for url in media
                        ]
                    
                    result = {
                        "element_id": element_id,
                        "type": "audio",
                        "text": element_data.get("text"),
                        "media": media,
                        "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                        "link_preview": link_preview,
                    }
                    logger.info(f"get_next_element_from_course: audio element_id={element_id}")
                    return result
                
                # Обработка input элементов
                if element_type == "input":
                    result = {
                        "element_id": element_id,
                        "type": "input",
                        "text": element_data.get("text", ""),
                        "correct_answer": element_data.get("correct_answer"),
                        "feedback_correct": element_data.get("feedback_correct"),
                        "feedback_incorrect": element_data.get("feedback_incorrect"),
                        "input_type": element_data.get("input_type", "text"),
                    }
                    logger.info(f"get_next_element_from_course: input element_id={element_id}")
                    return result
                
                # Обработка question элементов
                if element_type == "question":
                    result = {
                        "element_id": element_id,
                        "type": "question",
                        "text": element_data.get("text", ""),
                        "answers": element_data.get("answers", []),
                    }
                    logger.info(f"get_next_element_from_course: question element_id={element_id}")
                    return result
                
                # Обработка multi_choice элементов
                if element_type == "multi_choice":
                    # Нормализуем answers: преобразуем correct из boolean в строку "yes"/"no"
                    answers = element_data.get("answers", [])
                    normalized_answers = []
                    for answer in answers:
                        normalized_answer = answer.copy()
                        correct_value = answer.get("correct")
                        if correct_value is True or correct_value == "yes":
                            normalized_answer["correct"] = "yes"
                        elif correct_value is False or correct_value == "no":
                            normalized_answer["correct"] = "no"
                        normalized_answers.append(normalized_answer)
                    
                    result = {
                        "element_id": element_id,
                        "type": "multi_choice",
                        "text": element_data.get("text", ""),
                        "answers": normalized_answers,
                        "feedback_correct": element_data.get("feedback_correct", ""),
                        "feedback_partial": element_data.get("feedback_partial", ""),
                        "feedback_incorrect": element_data.get("feedback_incorrect", ""),
                    }
                    logger.info(f"get_next_element_from_course: multi_choice element_id={element_id}")
                    return result
                
                # Обработка quiz элементов
                if element_type == "quiz":
                    # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
                    media = element_data.get("media")
                    if media and isinstance(media, list):
                        from urllib.parse import quote
                        media = [
                            f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                            if extract_file_id_from_drive_url(url) else url
                            for url in media
                        ]
                    
                    # Нормализуем answers: преобразуем correct из boolean в строку "yes"
                    # и text в строку (на случай если это число из YAML)
                    answers = element_data.get("answers", [])
                    normalized_answers = []
                    for answer in answers:
                        normalized_answer = answer.copy()
                        # Преобразуем text в строку, если это не строка
                        if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                            normalized_answer["text"] = str(normalized_answer["text"])
                        correct_value = answer.get("correct")
                        if correct_value is True or correct_value == "yes":
                            normalized_answer["correct"] = "yes"
                        elif correct_value is False or correct_value == "no":
                            # Удаляем поле correct для неправильных ответов
                            normalized_answer.pop("correct", None)
                        normalized_answers.append(normalized_answer)
                    
                    result = {
                        "element_id": element_id,
                        "type": "quiz",
                        "text": element_data.get("text", ""),
                        "answers": normalized_answers,
                        "media": media,
                    }
                    logger.info(f"get_next_element_from_course: quiz element_id={element_id}")
                    return result
                
                # Обработка test элементов
                if element_type == "test":
                    result = {
                        "element_id": element_id,
                        "type": "test",
                        "text": element_data.get("text", ""),
                        "prefix": element_data.get("prefix", ""),
                        "score": element_data.get("score", {}),
                        "button": element_data.get("button"),
                    }
                    logger.info(f"get_next_element_from_course: test element_id={element_id}")
                    return result
                
                # Обработка end элементов
                if element_type == "end":
                    result = {
                        "element_id": element_id,
                        "type": "end",
                        "text": element_data.get("text"),
                    }
                    logger.info(f"get_next_element_from_course: end element_id={element_id}")
                    return result
                
                # Обработка revision элементов
                if element_type == "revision":
                    result = {
                        "element_id": element_id,
                        "type": "revision",
                        "text": element_data.get("text", ""),
                        "prefix": element_data.get("prefix", ""),
                        "no_mistakes": element_data.get("no_mistakes", ""),
                        "button": element_data.get("button"),
                    }
                    logger.info(f"get_next_element_from_course: revision element_id={element_id}")
                    return result
                
                # Обработка dialog элементов
                if element_type == "dialog":
                    # Обработка auto_start: может быть "yes"/"no", True/False или строка
                    auto_start = element_data.get("auto_start", False)
                    if isinstance(auto_start, str):
                        auto_start = auto_start.lower() in ("true", "yes", "1")
                    else:
                        auto_start = bool(auto_start)
                    
                    # Обработка voice_response: может быть "yes"/"no", True/False или строка
                    voice_response = element_data.get("voice_response", False)
                    if isinstance(voice_response, str):
                        voice_response = voice_response.lower() in ("true", "yes", "1")
                    else:
                        voice_response = bool(voice_response)
                    
                    result = {
                        "element_id": element_id,
                        "type": "dialog",
                        "text": element_data.get("text", ""),
                        "prompt": element_data.get("prompt", ""),
                        "model": element_data.get("model"),
                        "temperature": element_data.get("temperature"),
                        "reasoning": element_data.get("reasoning"),
                        "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                        "link_preview": element_data.get("link_preview"),
                        "auto_start": auto_start,
                        "voice_response": voice_response,
                        "transcription_language": element_data.get("transcription_language"),
                        "tts_voice": element_data.get("tts_voice"),
                        "tts_model": element_data.get("tts_model"),
                        "tts_speed": element_data.get("tts_speed", 1.0),
                        "conversation": element_data.get("conversation", [])
                    }
                    logger.info(f"get_next_element_from_course: dialog element_id={element_id}, auto_start={auto_start}")
                    return result
                
                # Обработка нереализованных элементов
                unimplemented_types = {
                    "miniapp": "Telegram Mini App",
                    "jump": "Навигация с опциями",
                    "delay": "Задержка перед следующим элементом"
                }
                
                if element_type in unimplemented_types:
                    element_text = element_data.get("text", "")
                    element_name = unimplemented_types[element_type]
                    result = {
                        "element_id": element_id,
                        "type": "unimplemented",
                        "original_type": element_type,
                        "element_name": element_name,
                        "text": f"⚠️ Элемент '{element_name}' (тип: {element_type}) еще не реализован в MVP версии.\n\n"
                               f"Оригинальный текст элемента:\n{element_text}\n\n"
                               f"Этот элемент будет пропущен, и курс продолжит выполнение со следующего элемента.",
                        "button": "Продолжить"
                    }
                    logger.warning(f"get_next_element_from_course: unimplemented element type={element_type}, element_id={element_id}")
                    return result
                
                # Обработка message элементов
                # Обработка link_preview: может быть "yes"/"no" или True/False
                link_preview = element_data.get("link_preview")
                if isinstance(link_preview, str):
                    link_preview = link_preview.lower() == "yes"
                elif link_preview is None:
                    link_preview = None
                else:
                    link_preview = bool(link_preview)
                
                # Преобразуем Google Drive ссылки в прокси URL для обхода CORS
                media = element_data.get("media")
                if media and isinstance(media, list):
                    # Преобразуем в прокси URL через backend
                    from urllib.parse import quote
                    media = [
                        f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                        if extract_file_id_from_drive_url(url) else url
                        for url in media
                    ]
                
                result = {
                    "element_id": element_id,
                    "text": element_data.get("text", ""),
                    "button": element_data.get("button"),
                    "options": element_data.get("options"),  # Поддержка inline кнопок
                    "parse_mode": element_data.get("parse_mode", "MARKDOWN"),
                    "media": media,  # Поддержка медиа файлов (с проксированием через backend)
                    "link_preview": link_preview  # Поддержка link_preview
                }
                logger.info(f"get_next_element_from_course: element_id={element_id}, options={result.get('options')}, media={result.get('media')}")
                return result
            
            # Пропускаем нереализованные элементы автоматически
            if element_id == current_element_id:
                next_element = True
            elif next_element:
                # Если следующий элемент нереализованный, пропускаем его и продолжаем поиск
                element_type = element_data.get("type", "message")
                if element_type in unimplemented_types:
                    logger.info(f"get_next_element_from_course: skipping unimplemented element type={element_type}, element_id={element_id}")
                    continue  # Пропускаем нереализованный элемент и продолжаем поиск
        
        return None  # Курс завершен
    except Exception as e:
        logger.error(f"Error getting next element for {course_id}: {e}", exc_info=True)
    return None


@router.get("/courses/{course_id}", response_model=dict)
def check_course_exists(course_id: str):
    """Проверка существования курса"""
    try:
        course_path = get_course_path(course_id)
        if not course_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Курс не найден"
            )
        
        course_data = get_course_data(course_id)
        if not course_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Курс пуст или не содержит элементов"
            )
        
        return {"course_id": course_id, "exists": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking course {course_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при проверке курса"
        )


@router.get("/courses/{course_id}/current", response_model=None)
def get_current_element(
    course_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Получение текущего элемента курса (может быть message или quiz)"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        # Устанавливаем cookie с chat_id
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)  # 1 год
    
    # Проверяем существование курса
    course_path = get_course_path(course_id)
    if not course_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    
    if run_id:
        # Получаем текущий элемент из conversation
        element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
        if element:
            element_type = element.get("type", "message")
            if element_type == "audio":
                logger.info(f"get_current_element from DB: audio element_id={element.get('element_id')}")
                audio_element = AudioElement(**element)
                result_dict = audio_element.dict()
                result_dict['type'] = 'audio'
                return result_dict
            elif element_type == "quiz":
                logger.info(f"get_current_element from DB: quiz element_id={element.get('element_id')}")
                quiz_element = QuizElement(**element)
                result_dict = quiz_element.dict()
                result_dict['type'] = 'quiz'
                return result_dict
            elif element_type == "input":
                logger.info(f"get_current_element from DB: input element_id={element.get('element_id')}")
                input_element = InputElement(**element)
                result_dict = input_element.dict()
                result_dict['type'] = 'input'
                return result_dict
            elif element_type == "question":
                logger.info(f"get_current_element from DB: question element_id={element.get('element_id')}")
                question_element = QuestionElement(**element)
                result_dict = question_element.dict()
                result_dict['type'] = 'question'
                return result_dict
            elif element_type == "multi_choice":
                logger.info(f"get_current_element from DB: multi_choice element_id={element.get('element_id')}")
                multichoice_element = MultiChoiceElement(**element)
                result_dict = multichoice_element.dict()
                result_dict['type'] = 'multi_choice'
                return result_dict
            elif element_type == "test":
                logger.info(f"get_current_element from DB: test element_id={element.get('element_id')}")
                test_element = TestElement(**element)
                result_dict = test_element.dict()
                result_dict['type'] = 'test'
                return result_dict
            elif element_type == "end":
                logger.info(f"get_current_element from DB: end element_id={element.get('element_id')}")
                end_element = EndElement(**element)
                result_dict = end_element.dict()
                result_dict['type'] = 'end'
                return result_dict
            elif element_type == "revision":
                logger.info(f"get_current_element from DB: revision element_id={element.get('element_id')}")
                revision_element = RevisionElement(**element)
                result_dict = revision_element.dict()
                result_dict['type'] = 'revision'
                return result_dict
            elif element_type == "dialog":
                logger.info(f"get_current_element from DB: dialog element_id={element.get('element_id')}")
                dialog_element = DialogElement(**element)
                result_dict = dialog_element.dict()
                result_dict['type'] = 'dialog'
                return result_dict
            elif element_type == "unimplemented":
                logger.info(f"get_current_element from DB: unimplemented element_id={element.get('element_id')}")
                return element  # Возвращаем как есть для нереализованных элементов
            else:
                logger.info(f"get_current_element from DB: options={element.get('options')}")
                return MessageElement(**element).dict()
    
    # Если нет активной сессии или текущего элемента, получаем первый элемент курса
    element = get_first_element_from_course(course_id)
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не содержит элементов"
        )
    
    element_type = element.get("type", "message")
    if element_type == "audio":
        logger.info(f"get_current_element from YAML: audio element_id={element.get('element_id')}")
        audio_element = AudioElement(**element)
        result_dict = audio_element.dict()
        result_dict['type'] = 'audio'
        return result_dict
    elif element_type == "quiz":
        logger.info(f"get_current_element from YAML: quiz element_id={element.get('element_id')}")
        quiz_element = QuizElement(**element)
        result_dict = quiz_element.dict()
        result_dict['type'] = 'quiz'
        return result_dict
    elif element_type == "input":
        logger.info(f"get_current_element from YAML: input element_id={element.get('element_id')}")
        input_element = InputElement(**element)
        result_dict = input_element.dict()
        result_dict['type'] = 'input'
        return result_dict
    elif element_type == "question":
        logger.info(f"get_current_element from YAML: question element_id={element.get('element_id')}")
        question_element = QuestionElement(**element)
        result_dict = question_element.dict()
        result_dict['type'] = 'question'
        return result_dict
    elif element_type == "multi_choice":
        logger.info(f"get_current_element from YAML: multi_choice element_id={element.get('element_id')}")
        multichoice_element = MultiChoiceElement(**element)
        result_dict = multichoice_element.dict()
        result_dict['type'] = 'multi_choice'
        return result_dict
    elif element_type == "test":
        logger.info(f"get_current_element from YAML: test element_id={element.get('element_id')}")
        test_element = TestElement(**element)
        result_dict = test_element.dict()
        result_dict['type'] = 'test'
        return result_dict
    elif element_type == "end":
        logger.info(f"get_current_element from YAML: end element_id={element.get('element_id')}")
        end_element = EndElement(**element)
        result_dict = end_element.dict()
        result_dict['type'] = 'end'
        return result_dict
    elif element_type == "revision":
        logger.info(f"get_current_element from YAML: revision element_id={element.get('element_id')}")
        revision_element = RevisionElement(**element)
        result_dict = revision_element.dict()
        result_dict['type'] = 'revision'
        return result_dict
    elif element_type == "dialog":
        logger.info(f"get_current_element from YAML: dialog element_id={element.get('element_id')}")
        dialog_element = DialogElement(**element)
        result_dict = dialog_element.dict()
        result_dict['type'] = 'dialog'
        return result_dict
    elif element_type == "unimplemented":
        logger.info(f"get_current_element from YAML: unimplemented element_id={element.get('element_id')}")
        return element  # Возвращаем как есть для нереализованных элементов
    else:
        logger.info(f"get_current_element from YAML: options={element.get('options')}")
        return MessageElement(**element).dict()


@router.post("/courses/{course_id}/start")
def start_course(
    course_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Начало курса (создание сессии run)"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Проверяем существование курса
    course_path = get_course_path(course_id)
    if not course_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    # Проверяем, есть ли уже активная сессия
    existing_run_id = get_active_run(current_chat_id, course_id, repo)
    if existing_run_id:
        return {"run_id": existing_run_id, "message": "Сессия уже существует"}
    
    # Создаем новую сессию
    run_id = repo.create_run(course_id, None, current_chat_id, None, None)
    
    # Получаем первый элемент и сохраняем его в conversation
    element = get_first_element_from_course(course_id)
    if element:
        element_type = element.get("type", "message")
        logger.info(f"start_course: saving element type={element_type}, element_id={element.get('element_id')}")
        
        if element_type == "audio":
            element_data = {
                "element_data": {
                    "type": "audio",
                    "text": element.get("text"),
                    "media": element.get("media", []),
                    "parse_mode": element.get("parse_mode", "MARKDOWN"),
                    "link_preview": element.get("link_preview"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="audio",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element.get("text", "Audio element")
            )
        elif element_type == "quiz":
            # Нормализуем answers перед сохранением: преобразуем correct из boolean в строку "yes"
            # и text в строку (на случай если это число из YAML)
            answers = element.get("answers", [])
            normalized_answers = []
            for answer in answers:
                normalized_answer = answer.copy()
                # Преобразуем text в строку, если это не строка
                if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                    normalized_answer["text"] = str(normalized_answer["text"])
                correct_value = answer.get("correct")
                if correct_value is True or correct_value == "yes":
                    normalized_answer["correct"] = "yes"
                elif correct_value is False or correct_value == "no":
                    # Удаляем поле correct для неправильных ответов
                    normalized_answer.pop("correct", None)
                normalized_answers.append(normalized_answer)
            
            element_data = {
                "element_data": {
                    "type": "quiz",
                    "text": element["text"],
                    "answers": normalized_answers,
                    "media": element.get("media"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="quiz",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element["text"]
            )
        elif element_type == "input":
            element_data = {
                "element_data": {
                    "type": "input",
                    "text": element.get("text", ""),
                    "correct_answer": element.get("correct_answer"),
                    "feedback_correct": element.get("feedback_correct"),
                    "feedback_incorrect": element.get("feedback_incorrect"),
                    "input_type": element.get("input_type", "text"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="input",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element.get("text", "Input element")
            )
        elif element_type == "question":
            element_data = {
                "element_data": {
                    "type": "question",
                    "text": element.get("text", ""),
                    "answers": element.get("answers", []),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="question",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element.get("text", "Question element")
            )
        elif element_type == "multi_choice":
            # Нормализуем answers перед сохранением: преобразуем correct из boolean в строку "yes"/"no"
            answers = element.get("answers", [])
            normalized_answers = []
            for answer in answers:
                normalized_answer = answer.copy()
                correct_value = answer.get("correct")
                if correct_value is True or correct_value == "yes":
                    normalized_answer["correct"] = "yes"
                elif correct_value is False or correct_value == "no":
                    normalized_answer["correct"] = "no"
                normalized_answers.append(normalized_answer)
            
            element_data = {
                "element_data": {
                    "type": "multi_choice",
                    "text": element.get("text", ""),
                    "answers": normalized_answers,
                    "feedback_correct": element.get("feedback_correct", ""),
                    "feedback_partial": element.get("feedback_partial", ""),
                    "feedback_incorrect": element.get("feedback_incorrect", ""),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="multi_choice",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element.get("text", "MultiChoice element")
            )
        elif element_type == "test":
            element_data = {
                "element_data": {
                    "type": "test",
                    "text": element.get("text", ""),
                    "prefix": element.get("prefix", ""),
                    "score": element.get("score", {}),
                    "button": element.get("button"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="test",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=f"Test элемент: {element.get('prefix', '')}"
            )
        elif element_type == "end":
            element_data = {
                "element_data": {
                    "type": "end",
                    "text": element.get("text"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="end",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element.get("text", "Курс завершен")
            )
            # Помечаем курс как завершенный
            repo.set_course_ended(current_chat_id, course_id)
        elif element_type == "revision":
            element_data = {
                "element_data": {
                    "type": "revision",
                    "text": element.get("text", ""),
                    "prefix": element.get("prefix", ""),
                    "no_mistakes": element.get("no_mistakes", ""),
                    "button": element.get("button"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="revision",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=f"Revision элемент: {element.get('prefix', '')}"
            )
        elif element_type == "dialog":
            text_value = element.get("text", "")
            logger.info(f"start_course: Saving dialog element_id={element['element_id']}, text length={len(text_value)}, text preview={text_value[:50] if text_value else 'EMPTY'}")
            element_data = {
                "element_data": {
                    "type": "dialog",
                    "text": text_value,
                    "prompt": element.get("prompt", ""),
                    "model": element.get("model"),
                    "temperature": element.get("temperature"),
                    "reasoning": element.get("reasoning"),
                    "parse_mode": element.get("parse_mode", "MARKDOWN"),
                    "link_preview": element.get("link_preview"),
                    "auto_start": element.get("auto_start", False),
                    "voice_response": element.get("voice_response", False),
                    "transcription_language": element.get("transcription_language"),
                    "tts_voice": element.get("tts_voice"),
                    "tts_model": element.get("tts_model"),
                    "tts_speed": element.get("tts_speed", 1.0),
                    "conversation": element.get("conversation", [])
                }
            }
            logger.info(f"start_course: element_data text={element_data['element_data']['text'][:50] if element_data['element_data']['text'] else 'EMPTY'}")
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="dialog",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=text_value[:100] if text_value else "Dialog element"
            )
        elif element_type == "unimplemented":
            # Сохраняем нереализованные элементы как обычные сообщения для отображения
            element_data = {
                "element_data": {
                    "type": "unimplemented",
                    "original_type": element.get("original_type"),
                    "element_name": element.get("element_name"),
                    "text": element.get("text", ""),
                    "button": element.get("button"),
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="unimplemented",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=f"Нереализованный элемент: {element.get('element_name', element.get('original_type', 'unknown'))}"
            )
        else:
            element_data = {
                "element_data": {
                    "type": "message",
                    "text": element["text"],
                    "button": element.get("button"),
                    "options": element.get("options"),  # Сохраняем options
                    "parse_mode": element.get("parse_mode", "MARKDOWN"),
                    "media": element.get("media"),  # Сохраняем media
                    "link_preview": element.get("link_preview")  # Сохраняем link_preview
                }
            }
            repo.insert_element(
                chat_id=current_chat_id,
                course_id=course_id,
                username=None,
                element_id=element["element_id"],
                element_type="message",
                run_id=run_id,
                json_data=element_data,
                role="bot",
                report=element["text"]
            )
    
    return {"run_id": run_id, "message": "Курс начат"}


@router.post("/courses/{course_id}/next", response_model=None)
def next_element(
    course_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """Переход к следующему элементу"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        # Создаем новую сессию
        run_id = repo.create_run(course_id, None, current_chat_id, None, None)
    
    # Получаем текущий элемент из conversation
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
    if not current_element:
        # Если нет текущего элемента, получаем первый
        current_element = get_first_element_from_course(course_id)
        if not current_element:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Курс не содержит элементов"
            )
    
    # Сохраняем действие пользователя
    current_element_type = current_element.get("type", "message")
    report_messages = {
        "message": "Нажата кнопка 'Далее'",
        "quiz": "Ответ на quiz",
        "audio": "Прослушан audio элемент",
        "input": "Ответ на input",
        "question": "Ответ на question",
        "multi_choice": "Ответ на multi_choice",
        "test": "Просмотрен результат Test",
        "revision": "Просмотрен результат Revision",
        "dialog": "Сообщение в dialog",
        "end": "Курс завершен",
        "unimplemented": "Продолжение после нереализованного элемента"
    }
    repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=current_element["element_id"],
        element_type=current_element_type,
        run_id=run_id,
        json_data={},
        role="user",
        report=report_messages.get(current_element_type, "Переход к следующему элементу")
    )
    
    # Если текущий элемент - end, курс уже завершен
    if current_element_type == "end":
        repo.set_course_ended(current_chat_id, course_id)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=200,
            content={"completed": True, "message": "Курс завершен"}
        )
    
    # Проверяем наличие активной цепочки повторения
    try:
        revision_result = repo.get_revision_conversation(current_chat_id, course_id, run_id)
        next_element_data = None
        
        if revision_result:
            revision_element_id, revision_element_type, revision_json_data, revision_report, revision_conversation_id = revision_result
            revision_element_data = json.loads(revision_json_data)
            
            # Проверяем наличие активной цепочки повторения
            if "revision" in revision_element_data:
                revision_info = revision_element_data["revision"]
                revision_chain = revision_info.get("data", [])
                
                if len(revision_chain) > 0:
                    # Удаляем первый элемент из цепочки (он уже был пройден)
                    revision_chain.pop(0)
                    
                    # Обновляем цепочку в БД
                    updated_revision_data = {
                        "revision": {
                            "revision_element": revision_info.get("revision_element"),
                            "data": revision_chain
                        }
                    }
                    
                    # Обновляем запись в БД по conversation_id
                    repo.update_conversation_json(revision_conversation_id, updated_revision_data)
                    
                    # Если цепочка не пуста, берем следующий элемент из цепочки
                    if len(revision_chain) > 0:
                            next_chain_item = revision_chain[0]
                            next_element_id = list(next_chain_item.keys())[0]
                            next_element_data_dict = next_chain_item[next_element_id]["element_data"]
                            
                            element_type = next_element_data_dict.get("type", "message")
                            
                            # Обрабатываем элемент в зависимости от типа
                            if element_type == "quiz":
                                answers = next_element_data_dict.get("answers", [])
                                normalized_answers = []
                                for answer in answers:
                                    normalized_answer = answer.copy()
                                    if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                                        normalized_answer["text"] = str(normalized_answer["text"])
                                    correct_value = answer.get("correct")
                                    if correct_value is True or correct_value == "yes":
                                        normalized_answer["correct"] = "yes"
                                    elif correct_value is False or correct_value == "no":
                                        normalized_answer.pop("correct", None)
                                    normalized_answers.append(normalized_answer)
                                
                                media = next_element_data_dict.get("media")
                                if media and isinstance(media, list):
                                    from urllib.parse import quote
                                    media = [
                                        f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                                        if extract_file_id_from_drive_url(url) else url
                                        for url in media
                                    ]
                                
                                element_data = {
                                    "element_data": {
                                        "type": "quiz",
                                        "text": next_element_data_dict.get("text", ""),
                                        "answers": normalized_answers,
                                        "media": media,
                                    }
                                }
                                repo.insert_element(
                                    chat_id=current_chat_id,
                                    course_id=course_id,
                                    username=None,
                                    element_id=next_element_id,
                                    element_type="quiz",
                                    run_id=run_id,
                                    json_data=element_data,
                                    role="bot",
                                    report=next_element_data_dict.get("text", "Quiz element")
                                )
                                quiz_element = QuizElement(
                                    element_id=next_element_id,
                                    type="quiz",
                                    text=next_element_data_dict.get("text", ""),
                                    answers=normalized_answers,
                                    media=media
                                )
                                result_dict = quiz_element.dict()
                                result_dict['type'] = 'quiz'
                                return result_dict
                            
                            elif element_type == "input":
                                element_data = {
                                    "element_data": {
                                        "type": "input",
                                        "text": next_element_data_dict.get("text", ""),
                                        "correct_answer": next_element_data_dict.get("correct_answer"),
                                        "feedback_correct": next_element_data_dict.get("feedback_correct"),
                                        "feedback_incorrect": next_element_data_dict.get("feedback_incorrect"),
                                        "input_type": next_element_data_dict.get("input_type", "text"),
                                    }
                                }
                                repo.insert_element(
                                    chat_id=current_chat_id,
                                    course_id=course_id,
                                    username=None,
                                    element_id=next_element_id,
                                    element_type="input",
                                    run_id=run_id,
                                    json_data=element_data,
                                    role="bot",
                                    report=next_element_data_dict.get("text", "Input element")
                                )
                                input_element = InputElement(
                                    element_id=next_element_id,
                                    type="input",
                                    text=next_element_data_dict.get("text", ""),
                                    correct_answer=next_element_data_dict.get("correct_answer"),
                                    feedback_correct=next_element_data_dict.get("feedback_correct"),
                                    feedback_incorrect=next_element_data_dict.get("feedback_incorrect"),
                                    input_type=next_element_data_dict.get("input_type", "text")
                                )
                                result_dict = input_element.dict()
                                result_dict['type'] = 'input'
                                return result_dict
                            
                            elif element_type == "multi_choice":
                                answers = next_element_data_dict.get("answers", [])
                                normalized_answers = []
                                for answer in answers:
                                    normalized_answer = answer.copy()
                                    correct_value = answer.get("correct")
                                    if correct_value is True or correct_value == "yes":
                                        normalized_answer["correct"] = "yes"
                                    elif correct_value is False or correct_value == "no":
                                        normalized_answer["correct"] = "no"
                                    normalized_answers.append(normalized_answer)
                                
                                element_data = {
                                    "element_data": {
                                        "type": "multi_choice",
                                        "text": next_element_data_dict.get("text", ""),
                                        "answers": normalized_answers,
                                        "feedback_correct": next_element_data_dict.get("feedback_correct", ""),
                                        "feedback_partial": next_element_data_dict.get("feedback_partial", ""),
                                        "feedback_incorrect": next_element_data_dict.get("feedback_incorrect", ""),
                                    }
                                }
                                repo.insert_element(
                                    chat_id=current_chat_id,
                                    course_id=course_id,
                                    username=None,
                                    element_id=next_element_id,
                                    element_type="multi_choice",
                                    run_id=run_id,
                                    json_data=element_data,
                                    role="bot",
                                    report=next_element_data_dict.get("text", "MultiChoice element")
                                )
                                multichoice_element = MultiChoiceElement(
                                    element_id=next_element_id,
                                    type="multi_choice",
                                    text=next_element_data_dict.get("text", ""),
                                    answers=normalized_answers,
                                    feedback_correct=next_element_data_dict.get("feedback_correct", ""),
                                    feedback_partial=next_element_data_dict.get("feedback_partial", ""),
                                    feedback_incorrect=next_element_data_dict.get("feedback_incorrect", "")
                                )
                                result_dict = multichoice_element.dict()
                                result_dict['type'] = 'multi_choice'
                                return result_dict
                            
                            # Если цепочка пуста, возвращаемся к следующему элементу после Revision
                            else:
                                # Удаляем запись о цепочке повторения
                                repo.db.query(Conversation).filter(
                                    Conversation.conversation_id == revision_conversation_id
                                ).delete()
                                repo.db.commit()
                                # Продолжаем обычную логику - получаем следующий элемент после Revision
                                next_element_data = get_next_element_from_course(course_id, revision_element_id)
                    else:
                        # Цепочка пуста, продолжаем обычную логику
                        next_element_data = get_next_element_from_course(course_id, current_element["element_id"])
                else:
                    # Нет активной цепочки, продолжаем обычную логику
                    next_element_data = get_next_element_from_course(course_id, current_element["element_id"])
            else:
                # Нет активной цепочки, продолжаем обычную логику
                next_element_data = get_next_element_from_course(course_id, current_element["element_id"])
    except Exception as e:
        logger.error(f"Error checking revision chain: {e}", exc_info=True)
        # В случае ошибки продолжаем обычную логику
        next_element_data = get_next_element_from_course(course_id, current_element["element_id"])
    
    # Получаем следующий элемент (если не было активной цепочки или цепочка закончилась)
    if not next_element_data:
        # Курс завершен
        repo.set_course_ended(current_chat_id, course_id)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=200,
            content={"completed": True, "message": "Курс завершен"}
        )
    
    # Сохраняем следующий элемент в conversation
    element_type = next_element_data.get("type", "message")
    logger.info(f"next_element: saving element type={element_type}, element_id={next_element_data.get('element_id')}")
    
    # Если следующий элемент - end, помечаем курс как завершенный после сохранения
    if element_type == "end":
        # Курс будет помечен как завершенный в обработке элемента end
        pass
    
    if element_type == "audio":
        element_data = {
            "element_data": {
                "type": "audio",
                "text": next_element_data.get("text"),
                "media": next_element_data.get("media", []),
                "parse_mode": next_element_data.get("parse_mode", "MARKDOWN"),
                "link_preview": next_element_data.get("link_preview"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="audio",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "Audio element")
        )
        audio_element = AudioElement(**next_element_data)
        result_dict = audio_element.dict()
        result_dict['type'] = 'audio'
        return result_dict
    elif element_type == "quiz":
        # Нормализуем answers перед сохранением: преобразуем correct из boolean в строку "yes"
        answers = next_element_data.get("answers", [])
        normalized_answers = []
        for answer in answers:
            normalized_answer = answer.copy()
            correct_value = answer.get("correct")
            if correct_value is True or correct_value == "yes":
                normalized_answer["correct"] = "yes"
            elif correct_value is False or correct_value == "no":
                # Удаляем поле correct для неправильных ответов
                normalized_answer.pop("correct", None)
            normalized_answers.append(normalized_answer)
        
        element_data = {
            "element_data": {
                "type": "quiz",
                "text": next_element_data["text"],
                "answers": normalized_answers,
                "media": next_element_data.get("media"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="quiz",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data["text"]
        )
        quiz_element = QuizElement(**next_element_data)
        # Убеждаемся, что type всегда присутствует в ответе
        result_dict = quiz_element.dict()
        result_dict['type'] = 'quiz'
        return result_dict
    elif element_type == "input":
        element_data = {
            "element_data": {
                "type": "input",
                "text": next_element_data.get("text", ""),
                "correct_answer": next_element_data.get("correct_answer"),
                "feedback_correct": next_element_data.get("feedback_correct"),
                "feedback_incorrect": next_element_data.get("feedback_incorrect"),
                "input_type": next_element_data.get("input_type", "text"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="input",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "Input element")
        )
        input_element = InputElement(**next_element_data)
        result_dict = input_element.dict()
        result_dict['type'] = 'input'
        return result_dict
    elif element_type == "question":
        element_data = {
            "element_data": {
                "type": "question",
                "text": next_element_data.get("text", ""),
                "answers": next_element_data.get("answers", []),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="question",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "Question element")
        )
        question_element = QuestionElement(**next_element_data)
        result_dict = question_element.dict()
        result_dict['type'] = 'question'
        return result_dict
    elif element_type == "multi_choice":
        # Нормализуем answers перед сохранением: преобразуем correct из boolean в строку "yes"/"no"
        answers = next_element_data.get("answers", [])
        normalized_answers = []
        for answer in answers:
            normalized_answer = answer.copy()
            correct_value = answer.get("correct")
            if correct_value is True or correct_value == "yes":
                normalized_answer["correct"] = "yes"
            elif correct_value is False or correct_value == "no":
                normalized_answer["correct"] = "no"
            normalized_answers.append(normalized_answer)
        
        element_data = {
            "element_data": {
                "type": "multi_choice",
                "text": next_element_data.get("text", ""),
                "answers": normalized_answers,
                "feedback_correct": next_element_data.get("feedback_correct", ""),
                "feedback_partial": next_element_data.get("feedback_partial", ""),
                "feedback_incorrect": next_element_data.get("feedback_incorrect", ""),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="multi_choice",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "MultiChoice element")
        )
        multichoice_element = MultiChoiceElement(**next_element_data)
        result_dict = multichoice_element.dict()
        result_dict['type'] = 'multi_choice'
        return result_dict
    elif element_type == "test":
        element_data = {
            "element_data": {
                "type": "test",
                "text": next_element_data.get("text", ""),
                "prefix": next_element_data.get("prefix", ""),
                "score": next_element_data.get("score", {}),
                "button": next_element_data.get("button"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="test",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=f"Test элемент: {next_element_data.get('prefix', '')}"
        )
        test_element = TestElement(**next_element_data)
        result_dict = test_element.dict()
        result_dict['type'] = 'test'
        return result_dict
    elif element_type == "end":
        element_data = {
            "element_data": {
                "type": "end",
                "text": next_element_data.get("text"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="end",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "Курс завершен")
        )
        # Помечаем курс как завершенный
        repo.set_course_ended(current_chat_id, course_id)
        end_element = EndElement(**next_element_data)
        result_dict = end_element.dict()
        result_dict['type'] = 'end'
        return result_dict
    elif element_type == "revision":
        element_data = {
            "element_data": {
                "type": "revision",
                "text": next_element_data.get("text", ""),
                "prefix": next_element_data.get("prefix", ""),
                "no_mistakes": next_element_data.get("no_mistakes", ""),
                "button": next_element_data.get("button"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="revision",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=f"Revision элемент: {next_element_data.get('prefix', '')}"
        )
        revision_element = RevisionElement(**next_element_data)
        result_dict = revision_element.dict()
        result_dict['type'] = 'revision'
        return result_dict
    elif element_type == "dialog":
        element_data = {
            "element_data": {
                "type": "dialog",
                "text": next_element_data.get("text", ""),
                "prompt": next_element_data.get("prompt", ""),
                "model": next_element_data.get("model"),
                "temperature": next_element_data.get("temperature"),
                "reasoning": next_element_data.get("reasoning"),
                "parse_mode": next_element_data.get("parse_mode", "MARKDOWN"),
                "link_preview": next_element_data.get("link_preview"),
                "auto_start": next_element_data.get("auto_start", False),
                "voice_response": next_element_data.get("voice_response", False),
                "transcription_language": next_element_data.get("transcription_language"),
                "tts_voice": next_element_data.get("tts_voice"),
                "tts_model": next_element_data.get("tts_model"),
                "tts_speed": next_element_data.get("tts_speed", 1.0),
                "conversation": next_element_data.get("conversation", [])
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="dialog",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data.get("text", "Dialog element")
        )
        dialog_element = DialogElement(**next_element_data)
        result_dict = dialog_element.dict()
        result_dict['type'] = 'dialog'
        return result_dict
    elif element_type == "unimplemented":
        # Сохраняем нереализованные элементы как обычные сообщения для отображения
        element_data = {
            "element_data": {
                "type": "unimplemented",
                "original_type": next_element_data.get("original_type"),
                "element_name": next_element_data.get("element_name"),
                "text": next_element_data.get("text", ""),
                "button": next_element_data.get("button"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="unimplemented",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=f"Нереализованный элемент: {next_element_data.get('element_name', next_element_data.get('original_type', 'unknown'))}"
        )
        return next_element_data  # Возвращаем как есть
    else:
        element_data = {
            "element_data": {
                "type": "message",
                "text": next_element_data["text"],
                "button": next_element_data.get("button"),
                "options": next_element_data.get("options"),  # Сохраняем options
                "parse_mode": next_element_data.get("parse_mode", "MARKDOWN"),
                "media": next_element_data.get("media"),  # Сохраняем media
                "link_preview": next_element_data.get("link_preview")  # Сохраняем link_preview
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=next_element_data["element_id"],
            element_type="message",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=next_element_data["text"]
        )
        return MessageElement(**next_element_data).dict()


@router.post("/courses/{course_id}/quiz/answer", response_model=QuizAnswerResponse)
def submit_quiz_answer(
    course_id: str,
    answer_data: QuizAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Обработка ответа пользователя на quiz элемент"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Получаем текущий элемент из conversation
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
    if not current_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Текущий элемент не найден"
        )
    
    # Проверяем, что элемент является quiz
    if current_element.get("type") != "quiz":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий элемент не является quiz"
        )
    
    # Проверяем, что element_id совпадает
    if current_element.get("element_id") != answer_data.element_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный element_id"
        )
    
    # Получаем ответы
    answers = current_element.get("answers", [])
    if answer_data.selected_answer_index < 0 or answer_data.selected_answer_index >= len(answers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный индекс ответа"
        )
    
    # Находим правильный ответ
    correct_answer_index = None
    for i, answer in enumerate(answers):
        if answer.get("correct") == "yes":
            correct_answer_index = i
            break
    
    if correct_answer_index is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="В quiz не найден правильный ответ"
        )
    
    # Проверяем правильность ответа
    is_correct = answer_data.selected_answer_index == correct_answer_index
    selected_answer = answers[answer_data.selected_answer_index]
    feedback = selected_answer.get("feedback", "Ответ принят")
    score = 1 if is_correct else 0
    
    # Сохраняем ответ пользователя в conversation
    json_data_to_save = {
        "user_answer": {
            "selected_index": answer_data.selected_answer_index,
            "selected_text": selected_answer.get("text", ""),
            "is_correct": is_correct,
            "score": score,
            "max_score": 1
        }
    }
    logger.info(f"Quiz answer: saving with chat_id={current_chat_id}, course_id={course_id}, run_id={run_id}, element_id={answer_data.element_id}, score={score}, maxscore=1")
    logger.info(f"Quiz answer: JSON data to save: {json.dumps(json_data_to_save)}")
    conversation_id = repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=answer_data.element_id,
        element_type="quiz",
        run_id=run_id,
        json_data=json_data_to_save,
        role="user",
        report=f"Ответ: {selected_answer.get('text', '')}",
        score=score,
        maxscore=1
    )
    logger.info(f"Quiz answer: saved with conversation_id={conversation_id}")
    
    # Проверяем, что данные сохранились правильно
    check_result = repo.get_conversation_by_id(conversation_id)
    if check_result:
        logger.info(f"Quiz answer: verification - conversation_id={check_result['conversation_id']}, role={check_result['role']}, score={check_result['score']}, maxscore={check_result['maxscore']}, json_preview={str(check_result['json'])[:200] if check_result['json'] else 'None'}")
    
    # Сохраняем результат в report (для статистики)
    repo.update_conversation_report(
        current_chat_id,
        course_id,
        run_id,
        answer_data.element_id,
        f"{current_element.get('text', '')} | Score: {score}/1"
    )
    
    logger.info(f"Quiz answer submitted: element_id={answer_data.element_id}, is_correct={is_correct}, score={score}")
    
    return QuizAnswerResponse(
        is_correct=is_correct,
        feedback=feedback,
        score=score
    )


@router.post("/courses/{course_id}/input/answer", response_model=InputAnswerResponse)
def submit_input_answer(
    course_id: str,
    answer_data: InputAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Обработка ответа пользователя на input элемент"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Получаем текущий элемент из conversation
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
    if not current_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Текущий элемент не найден"
        )
    
    # Проверяем, что элемент является input
    if current_element.get("type") != "input":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий элемент не является input"
        )
    
    # Проверяем, что element_id совпадает
    if current_element.get("element_id") != answer_data.element_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный element_id"
        )
    
    # Проверяем наличие ответа пользователя
    if not answer_data.user_answer or not answer_data.user_answer.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ответ не может быть пустым"
        )
    
    # Получаем параметры input элемента
    correct_answer = current_element.get("correct_answer")
    input_type = current_element.get("input_type", "text")
    feedback_correct = current_element.get("feedback_correct", "Правильно!")
    feedback_incorrect = current_element.get("feedback_incorrect", "Неправильно.")
    
    # Проверяем правильность ответа (если указан correct_answer)
    is_correct = False
    feedback = ""
    score = 0
    
    if correct_answer:
        is_correct = compare_answers(answer_data.user_answer, correct_answer, input_type)
        feedback = feedback_correct if is_correct else feedback_incorrect
        score = 1 if is_correct else 0
    else:
        # Если correct_answer не указан, просто принимаем ответ без проверки
        feedback = "Ответ принят"
        score = 0
    
    # Сохраняем ответ пользователя в conversation
    max_score_value = 1 if correct_answer else 0
    repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=answer_data.element_id,
        element_type="input",
        run_id=run_id,
        json_data={
            "user_answer": {
                "text": answer_data.user_answer,
                "is_correct": is_correct,
                "score": score,
                "max_score": max_score_value,
                "input_type": input_type
            }
        },
        role="user",
        report=f"Ответ: {answer_data.user_answer}",
        score=score,
        maxscore=max_score_value
    )
    
    # Сохраняем результат в report (для статистики)
    repo.update_conversation_report(
        current_chat_id,
        course_id,
        run_id,
        answer_data.element_id,
        f"{current_element.get('text', '')} | Score: {score}/1"
    )
    
    logger.info(f"Input answer submitted: element_id={answer_data.element_id}, is_correct={is_correct}, score={score}")
    
    return InputAnswerResponse(
        is_correct=is_correct,
        feedback=feedback,
        score=score
    )


@router.post("/courses/{course_id}/question/answer", response_model=QuestionAnswerResponse)
def submit_question_answer(
    course_id: str,
    answer_data: QuestionAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """Обработка ответа пользователя на question элемент"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Получаем текущий элемент из conversation
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
    if not current_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Текущий элемент не найден"
        )
    
    # Проверяем, что элемент является question
    if current_element.get("type") != "question":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий элемент не является question"
        )
    
    # Проверяем, что element_id совпадает
    if current_element.get("element_id") != answer_data.element_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный element_id"
        )
    
    # Получаем ответы
    answers = current_element.get("answers", [])
    if answer_data.selected_answer_index < 0 or answer_data.selected_answer_index >= len(answers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный индекс ответа"
        )
    
    # Получаем feedback для выбранного варианта (если указан)
    selected_answer = answers[answer_data.selected_answer_index]
    feedback = selected_answer.get("feedback", "Ответ принят")
    
    # Сохраняем ответ пользователя в conversation
    repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=answer_data.element_id,
        element_type="question",
        run_id=run_id,
        json_data={
            "user_answer": {
                "selected_index": answer_data.selected_answer_index,
                "selected_text": selected_answer.get("text", ""),
                "score": 0,
                "max_score": 0
            }
        },
        role="user",
        report=f"Ответ: {selected_answer.get('text', '')}"
    )
    
    # Сохраняем результат в report (для статистики)
    repo.update_conversation_report(
        current_chat_id,
        course_id,
        run_id,
        answer_data.element_id,
        f"{current_element.get('text', '')} | Ответ: {selected_answer.get('text', '')}"
    )
    
    logger.info(f"Question answer submitted: element_id={answer_data.element_id}, selected_index={answer_data.selected_answer_index}")
    
    return QuestionAnswerResponse(
        feedback=feedback,
        score=0
    )


@router.post("/courses/{course_id}/multichoice/answer", response_model=MultiChoiceAnswerResponse)
def submit_multichoice_answer(
    course_id: str,
    answer_data: MultiChoiceAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Обработка ответа пользователя на multi_choice элемент"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Получаем текущий элемент из conversation
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id, repo)
    if not current_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Текущий элемент не найден"
        )
    
    # Проверяем, что элемент является multi_choice
    if current_element.get("type") != "multi_choice":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий элемент не является multi_choice"
        )
    
    # Проверяем, что element_id совпадает
    if current_element.get("element_id") != answer_data.element_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный element_id"
        )
    
    # Проверяем наличие выбранных ответов
    if not answer_data.selected_answer_indices or len(answer_data.selected_answer_indices) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Необходимо выбрать хотя бы один вариант ответа"
        )
    
    # Получаем ответы
    answers = current_element.get("answers", [])
    
    # Проверяем валидность индексов
    for index in answer_data.selected_answer_indices:
        if index < 0 or index >= len(answers):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Неверный индекс ответа: {index}"
            )
    
    # Вычисляем результат
    is_correct, result_type, score = calculate_multichoice_result(answer_data.selected_answer_indices, answers)
    
    # Получаем итоговое сообщение в зависимости от результата
    if result_type == "correct":
        feedback = current_element.get("feedback_correct", "Правильно!")
    elif result_type == "partial":
        feedback = current_element.get("feedback_partial", "Частично правильно.")
    else:
        feedback = current_element.get("feedback_incorrect", "Неправильно.")
    
    # Формируем детальный feedback для каждого выбранного варианта
    individual_feedbacks = []
    for index in answer_data.selected_answer_indices:
        selected_answer = answers[index]
        individual_feedbacks.append(IndividualFeedback(
            answer_index=index,
            answer_text=selected_answer.get("text", ""),
            feedback=selected_answer.get("feedback")
        ))
    
    # Сохраняем ответ пользователя в conversation
    selected_texts = [answers[i].get("text", "") for i in answer_data.selected_answer_indices]
    repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=answer_data.element_id,
        element_type="multi_choice",
        run_id=run_id,
        json_data={
            "user_answer": {
                "selected_indices": answer_data.selected_answer_indices,
                "selected_texts": selected_texts,
                "is_correct": is_correct,
                "result_type": result_type,
                "score": score,
                "max_score": 1.0
            }
        },
        role="user",
        report=f"Ответы: {', '.join(selected_texts)}",
        score=score,
        maxscore=1.0
    )
    
    # Сохраняем результат в report (для статистики)
    repo.update_conversation_report(
        current_chat_id,
        course_id,
        run_id,
        answer_data.element_id,
        f"{current_element.get('text', '')} | Score: {score}/1.0"
    )
    
    logger.info(f"MultiChoice answer submitted: element_id={answer_data.element_id}, selected_indices={answer_data.selected_answer_indices}, is_correct={is_correct}, score={score}")
    
    return MultiChoiceAnswerResponse(
        is_correct=is_correct,
        feedback=feedback,
        individual_feedbacks=individual_feedbacks,
        score=score
    )


def get_conversation_text_for_var(chat_id: int, course_id: str, run_id: int, element_id: str, limit: int = 0, repo: Optional[CourseRepository] = None) -> str:
    """
    Получает текст разговора из элемента для подстановки в переменные промпта.
    
    Args:
        chat_id: ID чата
        course_id: ID курса
        run_id: ID сессии
        element_id: ID элемента для получения разговора
        limit: Лимит сообщений (0 = все, >0 = первые N, <0 = последние M)
        repo: Репозиторий для работы с БД (опционально, для обратной совместимости)
    
    Returns:
        Текст разговора или "NOT_FOUND" если элемент не найден
    """
    # Используем репозиторий если доступен, иначе используем прямой SQL (для обратной совместимости)
    if repo:
        conv = repo.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.course_id == course_id,
                Conversation.run_id == run_id,
                Conversation.element_id == element_id,
                Conversation.role == 'bot'
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return "NOT_FOUND"
        
        element_data = json.loads(conv.json) if conv.json else {}
        element_info = element_data.get("element_data", {})
        text = element_info.get("text", "")
        
        # Если есть conversation, добавляем его
        conversation = element_info.get("conversation", [])
        if conversation:
            text = "### assistant:\n" + text + "\n"
            i = 1
            n = len(conversation) + limit if limit < 0 else len(conversation)
            
            for message in conversation:
                if message.get("role") != "system":
                    if limit < 0 and i == n:
                        text = ""
                    text = text + "### " + message.get("role", "user") + ":\n" + message.get("content", "") + "\n\n"
                    i += 1
                    if limit > 0 and i >= limit:
                        break
        
        return text
    else:
        # Fallback на старый способ для обратной совместимости
        import db
        conn = db.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT json
                FROM conversation
                WHERE chat_id = %s AND course_id = %s AND run_id = %s 
                AND element_id = %s AND role = 'bot'
                ORDER BY conversation_id DESC
                LIMIT 1
            """, (chat_id, course_id, run_id, element_id))
            
            result = cursor.fetchone()
            if not result:
                return "NOT_FOUND"
            
            element_data = json.loads(result[0])
            element_info = element_data.get("element_data", {})
            text = element_info.get("text", "")
            
            # Если есть conversation, добавляем его
            conversation = element_info.get("conversation", [])
            if conversation:
                text = "### assistant:\n" + text + "\n"
                i = 1
                n = len(conversation) + limit if limit < 0 else len(conversation)
                
                for message in conversation:
                    if message.get("role") != "system":
                        if limit < 0 and i == n:
                            text = ""
                        text = text + "### " + message.get("role", "user") + ":\n" + message.get("content", "") + "\n\n"
                        i += 1
                        if limit > 0 and i >= limit:
                            break
            
            return text
        finally:
            conn.close()


def replace_vars_in_prompt(prompt: str, chat_id: int, course_id: str, run_id: int, repo: Optional[CourseRepository] = None) -> str:
    """
    Заменяет переменные в промпте на текст из предыдущих элементов.
    
    Поддерживает форматы:
    - {{element_id}} - все сообщения из элемента
    - {{N]element_id}} - первые N сообщений
    - {{element_id[M}} - последние M сообщений
    
    Args:
        prompt: Промпт с переменными
        chat_id: ID чата
        course_id: ID курса
        run_id: ID сессии
    
    Returns:
        Промпт с замененными переменными
    """
    import re
    
    # Удаляем HTML комментарии
    prompt = re.sub(r'<!--.*?-->', '', prompt, flags=re.DOTALL)
    
    # Находим все переменные
    pattern = re.compile(r"\{\{(.*?)\}\}")
    var_names = pattern.findall(prompt)
    
    # Создаем карту значений переменных
    vars_map = {}
    for original_var_name in var_names:
        limit = 0
        var_name = original_var_name
        try:
            # Парсим формат "N]name" или "name[M"
            i = var_name.find("]")
            if i > 0:
                limit = int(var_name[0:i])
                var_name = var_name[i+1:]
            else:
                i = var_name.find("[")
                if i > 0:
                    limit = -int(var_name[i+1:])
                    var_name = var_name[0:i]
        except ValueError:
            pass
        
        var_value = get_conversation_text_for_var(chat_id, course_id, run_id, var_name, limit, repo)
        # Используем оригинальное имя переменной как ключ для правильной замены
        vars_map[original_var_name] = var_value
    
    # Заменяем переменные в промпте
    def replacer(match):
        original_var = match.group(1)
        var_value = vars_map.get(original_var, "NOT_FOUND")
        if var_value == "NOT_FOUND":
            logger.warning(f"Variable {original_var} is not found among previous element keys")
        return var_value
    
    prompt = pattern.sub(replacer, prompt)
    
    return prompt


def update_element_conversation(chat_id: int, course_id: str, run_id: int, element_id: str, conversation: List[Dict[str, str]], repo: CourseRepository):
    """
    Обновляет conversation в указанном dialog элементе в базе данных.
    
    Args:
        chat_id: ID чата
        course_id: ID курса
        run_id: ID сессии
        element_id: ID dialog элемента для обновления
        conversation: Обновленная история диалога
        repo: Репозиторий для работы с БД
    """
    dialog_data = repo.get_dialog_conversation(chat_id, course_id, run_id, element_id)
    if dialog_data:
        conversation_id = dialog_data["conversation_id"]
        element_data = json.loads(dialog_data["json"]) if dialog_data["json"] else {}
        
        logger.info(f"update_element_conversation: Found element, json_data keys={list(element_data.keys())}")
        
        # Проверяем структуру данных
        if "element_data" not in element_data:
            logger.warning(f"update_element_conversation: element_data not found in json_data, keys={list(element_data.keys())}")
            # Пытаемся создать правильную структуру
            element_data = {"element_data": element_data}
        
        if "element_data" in element_data:
            element_data["element_data"]["conversation"] = conversation
            repo.update_dialog_conversation(conversation_id, conversation)
            logger.info(f"Updated conversation for element_id={element_id}, chat_id={chat_id}, course_id={course_id}, run_id={run_id}, conversation_length={len(conversation)}")
        else:
            logger.error(f"update_element_conversation: Could not find element_data structure, json_data keys={list(element_data.keys())}")
    else:
        logger.warning(f"update_element_conversation: No dialog element found for element_id={element_id}, chat_id={chat_id}, course_id={course_id}, run_id={run_id}")


@router.post("/courses/{course_id}/dialog/message", response_model=DialogMessageResponse)
def send_dialog_message(
    course_id: str,
    message_data: DialogMessageRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Отправка сообщения в dialog элемент"""
    try:
        current_chat_id = get_or_create_chat_id(chat_id)
        if not chat_id:
            response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
        
        run_id = get_active_run(current_chat_id, course_id, repo)
        if not run_id:
            raise HTTPException(status_code=404, detail="Активная сессия не найдена")
        
        # Получаем текущий dialog элемент напрямую из БД по element_id
        # Это гарантирует, что мы получаем правильный элемент с актуальной conversation
        dialog_data = repo.get_dialog_conversation(current_chat_id, course_id, run_id, message_data.element_id)
        if not dialog_data:
            raise HTTPException(status_code=404, detail=f"Dialog элемент {message_data.element_id} не найден")
        
        element_data = json.loads(dialog_data["json"]) if dialog_data["json"] else {}
        element_info = element_data.get("element_data", {})
        
        # Формируем current_element из данных БД
        current_element = {
            "element_id": message_data.element_id,
            "type": "dialog",
            "text": element_info.get("text", ""),
            "prompt": element_info.get("prompt", ""),
            "model": element_info.get("model"),
            "temperature": element_info.get("temperature"),
            "reasoning": element_info.get("reasoning"),
            "conversation": element_info.get("conversation", [])
        }
        
        logger.info(f"send_dialog_message: Loaded dialog element_id={message_data.element_id}, conversation_length={len(current_element.get('conversation', []))}")
        
        # Получаем conversation из элемента
        conversation = current_element.get("conversation", [])
        
        logger.info(f"send_dialog_message: Current conversation length={len(conversation)}, conversation={conversation}")
        
        # Инициализируем промпт если conversation пуст
        if not conversation:
            prompt = replace_vars_in_prompt(
                current_element.get("prompt", ""), 
                current_chat_id, 
                course_id, 
                run_id,
                repo
            )
            conversation = [{"role": "system", "content": prompt}]
            logger.info(f"send_dialog_message: Initialized conversation with system prompt, length={len(conversation)}")
        else:
            # Проверяем, есть ли system message в conversation
            has_system = any(msg.get("role") == "system" for msg in conversation)
            if not has_system:
                # Если нет system message, добавляем его в начало
                prompt = replace_vars_in_prompt(
                    current_element.get("prompt", ""), 
                    current_chat_id, 
                    course_id, 
                    run_id
                )
                conversation = [{"role": "system", "content": prompt}] + conversation
                logger.info(f"send_dialog_message: Added system prompt to existing conversation, new length={len(conversation)}")
        
        # Добавляем сообщение пользователя
        conversation.append({"role": "user", "content": message_data.message})
        logger.info(f"send_dialog_message: Added user message, conversation length={len(conversation)}")
        
        # Сохраняем сообщение пользователя в БД
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=message_data.element_id,
            element_type="dialog",
            run_id=run_id,
            json_data={"user_message": message_data.message},
            role="user",
            report=message_data.message
        )
        
        # Генерируем ответ через llm_service
        from app.services.llm_service import generate_chat_response
        
        # Получаем параметры модели с дефолтными значениями
        model = current_element.get("model") or "gpt-4"
        temperature = current_element.get("temperature")
        reasoning = current_element.get("reasoning")
        
        logger.info(f"send_dialog_message: Generating response with model={model}, temperature={temperature}, reasoning={reasoning}")
        
        try:
            reply = generate_chat_response(
                messages=conversation,
                model=model,
                temperature=temperature,
                reasoning=reasoning
            )
        except Exception as e:
            logger.error(f"Error generating dialog response: {e}", exc_info=True)
            # Используем HTTPException, который обрабатывается CORS middleware
            raise HTTPException(status_code=500, detail=f"Ошибка генерации ответа: {str(e)}")
        
        # Проверяем условия остановки (как в Telegram версии)
        import re
        stop_detected = False
        original_reply = reply
        
        # Проверяем {STOP} маркер (точное совпадение)
        if "{STOP}" in reply:
            reply = reply.replace("{STOP}", "")
            stop_detected = True
            logger.info("send_dialog_message: Detected {STOP} marker, stop_detected=True")
        
        # Проверяем #конецдиалога маркер с помощью регулярного выражения
        # Это обрабатывает все варианты: с пробелами, переносами строк, в начале/конце
        if not stop_detected:
            # Паттерн для поиска маркера с возможными пробелами и переносами строк вокруг
            pattern = r'\s*#конецдиалога\s*'
            if re.search(pattern, reply):
                reply = re.sub(pattern, '', reply)
                stop_detected = True
                logger.warning(f"send_dialog_message: Detected '#конецдиалога' marker (via regex), stop_detected=True")
        
        # Удаляем лишние пробелы после удаления маркера (как в Telegram версии)
        reply = reply.strip()
        
        # Финальная проверка: убеждаемся, что маркер действительно удален
        if re.search(r'#конецдиалога|{STOP}', reply):
            logger.error(f"send_dialog_message: ERROR! Stop marker still present after removal! original={original_reply[:200]}, current={reply[:200]}")
            # Принудительно удаляем все варианты через regex
            reply = re.sub(r'\s*#конецдиалога\s*', '', reply)
            reply = reply.replace("{STOP}", "")
            reply = reply.strip()
            logger.warning(f"send_dialog_message: Force-removed stop marker via regex, final reply={reply[:200]}")
        
        logger.info(f"send_dialog_message: After stop marker removal, reply_length={len(reply)}, stop_detected={stop_detected}, reply_preview={reply[:100] if reply else 'EMPTY'}")
        
        # Проверяем, пустой ли ответ после удаления маркера (как в Telegram версии)
        # Если ответ пустой и диалог завершен, не добавляем пустое сообщение
        if reply.strip() != "":
            # Добавляем ответ ассистента (без маркера) - это важно для сохранения в БД
            conversation.append({"role": "assistant", "content": reply})
            logger.info(f"send_dialog_message: Added assistant reply, conversation length={len(conversation)}")
        else:
            # Если ответ пустой после удаления маркера, не добавляем его в conversation
            logger.info(f"send_dialog_message: Reply is empty after marker removal, skipping empty message (stop_detected={stop_detected})")
            # Если диалог завершен, reply будет пустым в ответе
            reply = ""  # Убеждаемся, что reply пустой
        
        # Сохраняем обновленную conversation в элемент (обновляем существующий dialog элемент)
        update_element_conversation(current_chat_id, course_id, run_id, message_data.element_id, conversation, repo)
        
        # НЕ сохраняем ответ ассистента как отдельную запись - conversation уже обновлен в элементе
        # Это позволяет сохранить весь контекст в одном месте
        
        # Если диалог завершен, автоматически переходим к следующему элементу
        if stop_detected:
            # Обновляем текущий элемент на следующий
            next_element_data = get_next_element_from_course(course_id, message_data.element_id)
            if next_element_data:
                next_element_type = next_element_data.get("type", "message")
                # Сохраняем следующий элемент
                if next_element_type == "dialog":
                    element_data = {
                        "element_data": {
                            "type": "dialog",
                            "text": next_element_data.get("text", ""),
                            "prompt": next_element_data.get("prompt", ""),
                            "model": next_element_data.get("model"),
                            "temperature": next_element_data.get("temperature"),
                            "reasoning": next_element_data.get("reasoning"),
                            "parse_mode": next_element_data.get("parse_mode", "MARKDOWN"),
                            "link_preview": next_element_data.get("link_preview"),
                            "auto_start": next_element_data.get("auto_start", False),
                            "voice_response": next_element_data.get("voice_response", False),
                            "transcription_language": next_element_data.get("transcription_language"),
                            "tts_voice": next_element_data.get("tts_voice"),
                            "tts_model": next_element_data.get("tts_model"),
                            "tts_speed": next_element_data.get("tts_speed", 1.0),
                            "conversation": next_element_data.get("conversation", [])
                        }
                    }
                else:
                    # Для других типов элементов используем стандартную логику
                    element_data = {"element_data": next_element_data}
                
                repo.insert_element(
                    chat_id=current_chat_id,
                    course_id=course_id,
                    username=None,
                    element_id=next_element_data["element_id"],
                    element_type=next_element_type,
                    run_id=run_id,
                    json_data=element_data,
                    role="bot",
                    report=next_element_data.get("text", "Next element")
                )
        
        return DialogMessageResponse(
            reply=reply,
            stop=stop_detected,
            conversation=conversation
        )
    except HTTPException:
        # Пробрасываем HTTPException как есть (CORS middleware обработает)
        raise
    except Exception as e:
        # Обрабатываем все остальные ошибки
        logger.error(f"Unexpected error in send_dialog_message: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")


@router.get("/courses/{course_id}/test/result/{element_id}", response_model=TestResultResponse)
def get_test_result(
    course_id: str,
    element_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Получает результат Test элемента"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Загружаем курс и находим Test элемент
    course_data = get_course_data(course_id)
    if not course_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    test_element_data = course_data.get(element_id)
    if not test_element_data or test_element_data.get("type") != "test":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test элемент не найден"
        )
    
    # Получаем параметры Test элемента
    prefix = test_element_data.get("prefix")
    text = test_element_data.get("text", "")
    score_dict = test_element_data.get("score", {})
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test элемент не содержит prefix"
        )
    
    # Вычисляем баллы
    logger.info(f"Test result: calculating score for chat_id={current_chat_id}, course_id={course_id}, run_id={run_id}, prefix={prefix}")
    total_score, total_max_score = calculate_test_score(current_chat_id, course_id, run_id, prefix, repo)
    
    logger.info(f"Test result: prefix={prefix}, total_score={total_score}, total_max_score={total_max_score}")
    
    # Вычисляем процент ошибок
    if total_max_score == 0:
        error_percentage = 100.0
    else:
        error_percentage = ((total_max_score - total_score) / total_max_score) * 100.0
        error_percentage = round(error_percentage, 2)
    
    logger.info(f"Test result: error_percentage={error_percentage}")
    
    # Выбираем сообщение
    feedback_message = select_test_feedback(error_percentage, score_dict)
    logger.info(f"Test result: selected feedback_message={feedback_message} for error_percentage={error_percentage}")
    
    # Подставляем переменные в текст
    result_text = substitute_test_variables(text, total_score, total_max_score)
    
    logger.info(f"Test result calculated: element_id={element_id}, total_score={total_score}, total_max_score={total_max_score}, error_percentage={error_percentage}, result_text={result_text}")
    
    return TestResultResponse(
        total_score=total_score,
        total_max_score=total_max_score,
        error_percentage=error_percentage,
        result_text=result_text,
        feedback_message=feedback_message
    )


@router.get("/courses/{course_id}/revision/result/{element_id}", response_model=RevisionResultResponse)
def get_revision_result(
    course_id: str,
    element_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Получает результат Revision элемента"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Загружаем курс и находим Revision элемент
    course_data = get_course_data(course_id)
    if not course_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    revision_element_data = course_data.get(element_id)
    if not revision_element_data or revision_element_data.get("type") != "revision":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision элемент не найден"
        )
    
    # Получаем параметры Revision элемента
    prefix = revision_element_data.get("prefix")
    text = revision_element_data.get("text", "")
    no_mistakes = revision_element_data.get("no_mistakes", "")
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Revision элемент не содержит prefix"
        )
    
    # Ищем ошибки
    logger.info(f"Revision result: finding mistakes for chat_id={current_chat_id}, course_id={course_id}, run_id={run_id}, prefix={prefix}")
    mistakes_list, correct_elements_list = find_revision_mistakes(current_chat_id, course_id, run_id, prefix, repo)
    
    has_mistakes = len(mistakes_list) > 0
    mistakes_count = len(mistakes_list)
    
    # Формируем цепочку для повторения (только ошибки)
    revision_chain = []
    if has_mistakes:
        # Добавляем только элементы с ошибками
        revision_chain.extend(mistakes_list)
        message = text
        # Подставляем переменную {mistakes_count} если она есть в тексте
        if "{mistakes_count}" in message:
            message = message.replace("{mistakes_count}", str(mistakes_count))
    else:
        message = no_mistakes
    
    logger.info(f"Revision result: has_mistakes={has_mistakes}, mistakes_count={mistakes_count}, chain_length={len(revision_chain)}")
    
    return RevisionResultResponse(
        has_mistakes=has_mistakes,
        message=message,
        mistakes_count=mistakes_count,
        revision_chain=revision_chain
    )


@router.post("/courses/{course_id}/revision/start/{element_id}", response_model=None)
def start_revision(
    course_id: str,
    element_id: str,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None,
    repo: CourseRepository = Depends(get_course_repository)
):
    """Начинает повторение - сохраняет цепочку и возвращает первый элемент"""
    # Получаем или создаем chat_id
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    # Получаем активную сессию
    run_id = get_active_run(current_chat_id, course_id, repo)
    if not run_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Активная сессия не найдена. Начните курс сначала."
        )
    
    # Загружаем курс и находим Revision элемент
    course_data = get_course_data(course_id)
    if not course_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Курс не найден"
        )
    
    revision_element_data = course_data.get(element_id)
    if not revision_element_data or revision_element_data.get("type") != "revision":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Revision элемент не найден"
        )
    
    # Получаем параметры Revision элемента
    prefix = revision_element_data.get("prefix")
    text = revision_element_data.get("text", "")
    no_mistakes = revision_element_data.get("no_mistakes", "")
    
    if not prefix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Revision элемент не содержит prefix"
        )
    
    # Ищем ошибки
    logger.info(f"Revision start: finding mistakes for chat_id={current_chat_id}, course_id={course_id}, run_id={run_id}, prefix={prefix}")
    mistakes_list, correct_elements_list = find_revision_mistakes(current_chat_id, course_id, run_id, prefix, repo)
    
    has_mistakes = len(mistakes_list) > 0
    mistakes_count = len(mistakes_list)
    
    # Формируем цепочку для повторения (только ошибки)
    revision_chain = []
    if has_mistakes:
        # Добавляем только элементы с ошибками
        revision_chain.extend(mistakes_list)
        message = text
        # Подставляем переменную {mistakes_count} если она есть в тексте
        if "{mistakes_count}" in message:
            message = message.replace("{mistakes_count}", str(mistakes_count))
    else:
        message = no_mistakes
    
    if not has_mistakes or len(revision_chain) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет элементов для повторения"
        )
    
    logger.info(f"Revision start: has_mistakes={has_mistakes}, mistakes_count={mistakes_count}, chain_length={len(revision_chain)}")
    
    # Сохраняем информацию о цепочке повторения в БД
    # Используем специальный формат, аналогичный Telegram-версии
    revision_data = {
        "revision": {
            "revision_element": {
                "type": "revision",
                "element_id": element_id,
                "prefix": revision_element_data.get("prefix", ""),
            },
            "data": revision_chain  # Список элементов для повторения
        }
    }
    
    # Сохраняем маркер начала повторения в conversation
    repo.insert_element(
        chat_id=current_chat_id,
        course_id=course_id,
        username=None,
        element_id=element_id,
        element_type="revision",
        run_id=run_id,
        json_data=revision_data,
        role="bot",
        report="Начато повторение ошибок"
    )
    
    # Берем первый элемент из цепочки
    if len(revision_chain) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Цепочка повторения пуста"
        )
    
    first_chain_item = revision_chain[0]
    first_element_id = list(first_chain_item.keys())[0]
    first_element_data = first_chain_item[first_element_id]["element_data"]
    
    # Обрабатываем первый элемент из цепочки
    element_type = first_element_data.get("type", "message")
    
    # Нормализуем и возвращаем элемент в зависимости от типа
    if element_type == "quiz":
        # Нормализуем answers
        answers = first_element_data.get("answers", [])
        normalized_answers = []
        for answer in answers:
            normalized_answer = answer.copy()
            if "text" in normalized_answer and not isinstance(normalized_answer["text"], str):
                normalized_answer["text"] = str(normalized_answer["text"])
            correct_value = answer.get("correct")
            if correct_value is True or correct_value == "yes":
                normalized_answer["correct"] = "yes"
            elif correct_value is False or correct_value == "no":
                normalized_answer.pop("correct", None)
            normalized_answers.append(normalized_answer)
        
        # Преобразуем Google Drive ссылки в прокси URL
        media = first_element_data.get("media")
        if media and isinstance(media, list):
            from urllib.parse import quote
            media = [
                f"/api/mvp/media/proxy?url={quote(get_direct_download_link(url), safe='')}"
                if extract_file_id_from_drive_url(url) else url
                for url in media
            ]
        
        element_data = {
            "element_data": {
                "type": "quiz",
                "text": first_element_data.get("text", ""),
                "answers": normalized_answers,
                "media": media,
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=first_element_id,
            element_type="quiz",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=first_element_data.get("text", "Quiz element")
        )
        quiz_element = QuizElement(
            element_id=first_element_id,
            type="quiz",
            text=first_element_data.get("text", ""),
            answers=normalized_answers,
            media=media
        )
        result_dict = quiz_element.dict()
        result_dict['type'] = 'quiz'
        return result_dict
    
    elif element_type == "input":
        element_data = {
            "element_data": {
                "type": "input",
                "text": first_element_data.get("text", ""),
                "correct_answer": first_element_data.get("correct_answer"),
                "feedback_correct": first_element_data.get("feedback_correct"),
                "feedback_incorrect": first_element_data.get("feedback_incorrect"),
                "input_type": first_element_data.get("input_type", "text"),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=first_element_id,
            element_type="input",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=first_element_data.get("text", "Input element")
        )
        input_element = InputElement(
            element_id=first_element_id,
            type="input",
            text=first_element_data.get("text", ""),
            correct_answer=first_element_data.get("correct_answer"),
            feedback_correct=first_element_data.get("feedback_correct"),
            feedback_incorrect=first_element_data.get("feedback_incorrect"),
            input_type=first_element_data.get("input_type", "text")
        )
        result_dict = input_element.dict()
        result_dict['type'] = 'input'
        return result_dict
    
    elif element_type == "multi_choice":
        # Нормализуем answers
        answers = first_element_data.get("answers", [])
        normalized_answers = []
        for answer in answers:
            normalized_answer = answer.copy()
            correct_value = answer.get("correct")
            if correct_value is True or correct_value == "yes":
                normalized_answer["correct"] = "yes"
            elif correct_value is False or correct_value == "no":
                normalized_answer["correct"] = "no"
            normalized_answers.append(normalized_answer)
        
        element_data = {
            "element_data": {
                "type": "multi_choice",
                "text": first_element_data.get("text", ""),
                "answers": normalized_answers,
                "feedback_correct": first_element_data.get("feedback_correct", ""),
                "feedback_partial": first_element_data.get("feedback_partial", ""),
                "feedback_incorrect": first_element_data.get("feedback_incorrect", ""),
            }
        }
        repo.insert_element(
            chat_id=current_chat_id,
            course_id=course_id,
            username=None,
            element_id=first_element_id,
            element_type="multi_choice",
            run_id=run_id,
            json_data=element_data,
            role="bot",
            report=first_element_data.get("text", "MultiChoice element")
        )
        multichoice_element = MultiChoiceElement(
            element_id=first_element_id,
            type="multi_choice",
            text=first_element_data.get("text", ""),
            answers=normalized_answers,
            feedback_correct=first_element_data.get("feedback_correct", ""),
            feedback_partial=first_element_data.get("feedback_partial", ""),
            feedback_incorrect=first_element_data.get("feedback_incorrect", "")
        )
        result_dict = multichoice_element.dict()
        result_dict['type'] = 'multi_choice'
        return result_dict
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый тип элемента в цепочке повторения: {element_type}"
        )
