# Дизайн API

Документ описывает структуру API, версионирование и паттерны.

## Структура API

### Версионирование

API использует префиксы версий в URL:

- `/api/v1/` — стабильная версия API с аутентификацией
- `/api/mvp/` — MVP эндпоинты без аутентификации (для быстрого прототипирования)

### Основные роутеры

**Файлы в `webapp/backend/app/api/v1/`:**
- `auth.py` — аутентификация
- `courses.py` — курсы
- `lessons.py` — уроки
- `steps.py` — шаги
- `chat.py` — чат и диалоги
- `quiz.py` — квизы
- `mvp.py` — MVP эндпоинты

## Паттерны запросов/ответов

### Стандартный формат ответа

**Успешный ответ:**
```json
{
  "data": { ... },
  "message": "Success"
}
```

**Ошибка:**
```json
{
  "detail": "Error message",
  "status_code": 400
}
```

### Коды статусов

- `200` — успешный запрос
- `201` — создано
- `400` — ошибка валидации
- `401` — не авторизован
- `403` — запрещено
- `404` — не найдено
- `500` — внутренняя ошибка сервера

## Аутентификация

**Эндпоинты:**
- `POST /api/v1/auth/register` — регистрация
- `POST /api/v1/auth/login` — вход
- `POST /api/v1/auth/logout` — выход
- `GET /api/v1/auth/me` — текущий пользователь

**Механизм:** JWT токены или сессии (зависит от реализации)

## Курсы

**Эндпоинты:**
- `GET /api/v1/courses` — список курсов
- `GET /api/v1/courses/{course_id}` — информация о курсе
- `POST /api/v1/courses/{course_id}/start` — начать курс
- `GET /api/v1/courses/{course_id}/progress` — прогресс по курсу

## Чат

**Эндпоинты:**
- `POST /api/v1/steps/{step_id}/chat/session` — создать сессию чата
- `GET /api/v1/steps/{step_id}/chat/session` — получить сессию чата
- `POST /api/v1/chat/sessions/{session_id}/messages` — отправить сообщение
- `GET /api/v1/chat/sessions/{session_id}/messages` — история сообщений
- `POST /api/v1/chat/sessions/{session_id}/complete` — завершить сессию

## MVP эндпоинты

**Эндпоинты без аутентификации:**
- `GET /api/mvp/courses/{course_id}/current` — текущий элемент
- `POST /api/mvp/courses/{course_id}/dialog/message` — отправить сообщение в диалог

## Обработка ошибок

Все ошибки возвращаются в формате FastAPI:

```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="Course not found")
```

## Изоляция по аккаунтам

Все эндпоинты должны учитывать `account_id` для SaaS изоляции:

```python
from app.api.deps import get_current_account

@router.get("/courses")
async def get_courses(account: Account = Depends(get_current_account)):
    # Фильтрация по account.account_id
    ...
```
