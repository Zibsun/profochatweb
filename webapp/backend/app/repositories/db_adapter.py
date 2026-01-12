"""
Адаптер для обратной совместимости с db.py
Предоставляет тот же интерфейс, что и db.py, но использует репозиторий внутри
Если репозиторий не установлен, использует оригинальный db_old.py
"""
from typing import Optional, List, Dict, Tuple, Any
import json
import os
from datetime import datetime

# Экспортируем константы для обратной совместимости
DATABASE_URL = os.environ.get('DATABASE_URL')
BOT_NAME = os.environ.get('BOT_NAME', 'web_bot')

# Глобальная переменная для хранения репозитория (для обратной совместимости)
_current_repo: Optional[Any] = None

# Импортируем оригинальный db_old для fallback
try:
    import sys
    import os as os_module
    # Добавляем корень проекта в sys.path для импорта db_old
    project_root = os_module.path.abspath(os_module.path.join(os_module.path.dirname(__file__), '../../../../..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    import db_old as _original_db
except ImportError:
    _original_db = None


def set_repository(repo):
    """Установка репозитория для использования в адаптере"""
    global _current_repo
    _current_repo = repo


def get_repository():
    """Получение текущего репозитория"""
    return _current_repo


def _get_repo_or_db():
    """Получение репозитория или оригинального db"""
    if _current_repo is not None:
        return _current_repo
    elif _original_db is not None:
        return _original_db
    else:
        raise RuntimeError("Neither repository nor db module is available.")


# Функции, совместимые с db.py API

def create_run(course_id: str, username: Optional[str], chat_id: int, 
               utm_source: Optional[str] = None, utm_campaign: Optional[str] = None) -> int:
    """Создание новой сессии прохождения курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'create_run'):
        return repo_or_db.create_run(course_id, username, chat_id, utm_source, utm_campaign)
    else:
        return _original_db.create_run(course_id, username, chat_id, utm_source, utm_campaign)


def get_run_id(chat_id: int, course_id: str) -> Optional[int]:
    """Получение ID сессии по chat_id и course_id"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_run_id'):
        return repo_or_db.get_run_id(chat_id, course_id)
    else:
        return _original_db.get_run_id(chat_id, course_id)


def set_course_ended(chat_id: int, course_id: Optional[str] = None) -> None:
    """Отметка курса как завершенного"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'set_course_ended'):
        repo_or_db.set_course_ended(chat_id, course_id)
    else:
        _original_db.set_course_ended(chat_id, course_id)


def is_course_ended(chat_id: int, course_id: Optional[str] = None) -> bool:
    """Проверка завершения курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'is_course_ended'):
        return repo_or_db.is_course_ended(chat_id, course_id)
    else:
        return _original_db.is_course_ended(chat_id, course_id)


def get_username_by_chat_id(chat_id: int) -> Optional[str]:
    """Получение username по chat_id"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_username_by_chat_id'):
        return repo_or_db.get_username_by_chat_id(chat_id)
    else:
        return _original_db.get_username_by_chat_id(chat_id)


def insert_element(chat_id: int, course_id: str, username: Optional[str],
                  element_id: str, element_type: str, run_id: int,
                  json_data: Dict[str, Any], role: str, report: Optional[str],
                  score: Optional[float] = None, maxscore: Optional[float] = None) -> int:
    """Сохранение элемента в историю"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'insert_element'):
        return repo_or_db.insert_element(chat_id, course_id, username, element_id, element_type,
                                        run_id, json_data, role, report, score, maxscore)
    else:
        return _original_db.insert_element(chat_id, course_id, username, element_id, element_type,
                                          run_id, json_data, role, report, score, maxscore)


def get_current_element(chat_id: int) -> Optional[Tuple[int, str, str, str, int, Dict[str, Any]]]:
    """Получение текущего элемента пользователя"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_current_element'):
        return repo_or_db.get_current_element(chat_id)
    else:
        return _original_db.get_current_element(chat_id)


def get_current_element_id(chat_id: int) -> Optional[str]:
    """Получение ID текущего элемента"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_current_element_id'):
        return repo_or_db.get_current_element_id(chat_id)
    else:
        return _original_db.get_current_element_id(chat_id)


def get_current_element_ids(chat_id: int) -> Optional[Tuple[str, str, int]]:
    """Получение ID текущего элемента, курса и сессии"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_current_element_ids'):
        return repo_or_db.get_current_element_ids(chat_id)
    else:
        return _original_db.get_current_element_ids(chat_id)


def get_last_element_of(chat_id: int, element_id: str) -> Optional[Tuple[int, str, str, str, int, Dict[str, Any]]]:
    """Получение последнего вхождения конкретного элемента"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_last_element_of'):
        return repo_or_db.get_last_element_of(chat_id, element_id)
    else:
        return _original_db.get_last_element_of(chat_id, element_id)


def get_element_type_count(element_type: str, run_id: int) -> int:
    """Подсчет элементов определенного типа в сессии"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_element_type_count'):
        return repo_or_db.get_element_type_count(element_type, run_id)
    else:
        return _original_db.get_element_type_count(element_type, run_id)


def get_revision_mistakes(run_id: int, prefix: str) -> List[Dict[str, Any]]:
    """Получение ошибок для повторения"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_revision_mistakes'):
        return repo_or_db.get_revision_mistakes(run_id, prefix)
    else:
        return _original_db.get_revision_mistakes(run_id, prefix)


def get_revision_elements(run_id: int, prefix: str, limit: int = 2) -> List[Dict[str, Any]]:
    """Получение элементов для повторения"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_revision_elements'):
        return repo_or_db.get_revision_elements(run_id, prefix, limit)
    else:
        return _original_db.get_revision_elements(run_id, prefix, limit)


def get_total_score(run_id: int, prefix: str) -> Tuple[float, float]:
    """Подсчет общего балла"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_total_score'):
        return repo_or_db.get_total_score(run_id, prefix)
    else:
        return _original_db.get_total_score(run_id, prefix)


def add_waiting_element(chat_id: int, waiting_till_date: Optional[datetime] = None,
                       is_waiting: bool = True, element_id: Optional[str] = None,
                       course_id: Optional[str] = None) -> int:
    """Добавление элемента в очередь ожидания"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'add_waiting_element'):
        return repo_or_db.add_waiting_element(chat_id, waiting_till_date, is_waiting, element_id, course_id)
    else:
        return _original_db.add_waiting_element(chat_id, waiting_till_date, is_waiting, element_id, course_id)


def get_active_waiting_elements() -> List[Tuple[int, int, Optional[str], Optional[str]]]:
    """Получение активных отложенных элементов"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_active_waiting_elements'):
        return repo_or_db.get_active_waiting_elements()
    else:
        return _original_db.get_active_waiting_elements()


def set_is_waiting_false(waiting_element_id: int) -> None:
    """Деактивация элемента ожидания"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'set_is_waiting_false'):
        repo_or_db.set_is_waiting_false(waiting_element_id)
    else:
        _original_db.set_is_waiting_false(waiting_element_id)


def get_courses() -> Dict[str, Dict[str, Any]]:
    """Получение списка курсов из БД"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_courses'):
        return repo_or_db.get_courses()
    else:
        return _original_db.get_courses()


def get_course_info(course_id: str) -> Optional[Dict[str, Any]]:
    """Получение информации о курсе"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_course_info'):
        return repo_or_db.get_course_info(course_id)
    else:
        return _original_db.get_course_info(course_id)


def get_course_as_json(course_id: str) -> Dict[str, Any]:
    """Получение курса в формате JSON"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_course_as_json'):
        return repo_or_db.get_course_as_json(course_id)
    else:
        return _original_db.get_course_as_json(course_id)


def add_replace_course(course_id: str, course_data: Optional[Dict[str, Any]] = None,
                      bot_name: Optional[str] = None, creator_id: Optional[str] = None,
                      course_script: Optional[str] = None) -> None:
    """Добавление или замена курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'add_replace_course'):
        repo_or_db.add_replace_course(course_id, course_data, bot_name, creator_id, course_script)
    else:
        _original_db.add_replace_course(course_id, course_data, bot_name, creator_id, course_script)


def insert_course_element(course_id: str, element_id: str, json_data: Dict[str, Any],
                          element_type: str, bot_name: Optional[str] = None) -> Optional[int]:
    """Добавление элемента курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'insert_course_element'):
        return repo_or_db.insert_course_element(course_id, element_id, json_data, element_type, bot_name)
    else:
        return _original_db.insert_course_element(course_id, element_id, json_data, element_type, bot_name)


def get_element_from_course_by_id(course_id: str, element_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Получение элемента курса по ID (возвращает (element_id, json_data))"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_element_from_course_by_id'):
        return repo_or_db.get_element_from_course_by_id(course_id, element_id)
    else:
        return _original_db.get_element_from_course_by_id(course_id, element_id)


def get_first_element_from_course(course_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Получение первого элемента курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_first_element_from_course'):
        return repo_or_db.get_first_element_from_course(course_id)
    else:
        return _original_db.get_first_element_from_course(course_id)


def get_next_course_element_by_id(course_id: str, element_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Получение следующего элемента курса"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_next_course_element_by_id'):
        return repo_or_db.get_next_course_element_by_id(course_id, element_id)
    else:
        return _original_db.get_next_course_element_by_id(course_id, element_id)


def get_other_module_course_element_id(course_id: str, element_id: str,
                                      module: str, shift: int) -> Optional[str]:
    """Получение ID элемента из другого модуля"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_other_module_course_element_id'):
        return repo_or_db.get_other_module_course_element_id(course_id, element_id, module, shift)
    else:
        return _original_db.get_other_module_course_element_id(course_id, element_id, module, shift)


def ban_users(ban_limit: int, ban_reason: str, exclude_users: List[int]) -> int:
    """Автоматическая блокировка пользователей"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'ban_users'):
        return repo_or_db.ban_users(ban_limit, ban_reason, exclude_users)
    else:
        return _original_db.ban_users(ban_limit, ban_reason, exclude_users)


def check_user_banned(chat_id: int) -> bool:
    """Проверка блокировки пользователя"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'check_user_banned'):
        return repo_or_db.check_user_banned(chat_id)
    else:
        return _original_db.check_user_banned(chat_id)


def check_user_in_course(course_id: str, username: str) -> bool:
    """Проверка доступа пользователя к курсу"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'check_user_in_course'):
        return repo_or_db.check_user_in_course(course_id, username)
    else:
        return _original_db.check_user_in_course(course_id, username)


def delete_course(conn, table_name: str, course_id: str, bot_name: Optional[str] = None) -> int:
    """Удаление курса (совместимость с db.py API)"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'delete_course'):
        return repo_or_db.delete_course(course_id, bot_name, table_name)
    else:
        return _original_db.delete_course(conn, table_name, course_id, bot_name)


def get_creators() -> List[int]:
    """Получение списка создателей курсов"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_creators'):
        return repo_or_db.get_creators()
    else:
        return _original_db.get_creators()


# Функция для получения подключения (для обратной совместимости)
def get_connection():
    """Получение подключения к БД (для обратной совместимости)"""
    repo_or_db = _get_repo_or_db()
    if hasattr(repo_or_db, 'get_connection'):
        return repo_or_db.get_connection()
    else:
        return _original_db.get_connection()
