# Архитектура веб-приложения

Документ описывает архитектуру frontend и backend веб-приложения.

## Технологический стек

### Frontend

- **Фреймворк**: Next.js 14 (App Router)
- **Язык**: TypeScript
- **Стили**: Tailwind CSS
- **State Management**: Zustand
- **HTTP клиент**: Axios

### Backend

- **Фреймворк**: FastAPI
- **Язык**: Python 3.12+
- **ORM**: SQLAlchemy
- **Миграции**: Alembic
- **База данных**: PostgreSQL

## Структура Frontend

### App Router (Next.js 14)

**Страницы:**
- `app/page.tsx` — главная страница
- `app/(auth)/login/page.tsx` — страница входа
- `app/(auth)/register/page.tsx` — регистрация
- `app/courses/page.tsx` — список курсов
- `app/courses/[courseId]/page.tsx` — страница курса
- `app/course/[courseId]/page.tsx` — прохождение курса
- `app/course-editor/page.tsx` — редактор курсов
- `app/bots/page.tsx` — управление ботами
- `app/groups/page.tsx` — управление группами

### Компоненты

**Компоненты чата (`components/chat/`):**
- `ChatView.tsx` — основной компонент чата
- `DialogView.tsx` — компонент диалога с ИИ
- `InputView.tsx` — компонент ввода текста
- `MultiChoiceView.tsx` — компонент множественного выбора
- `QuizView.tsx` — компонент квиза
- `AudioView.tsx` — компонент аудио

**Компоненты шагов (`components/steps/`):**
- `ChatStep.tsx` — шаг с чатом
- `MessageStep.tsx` — шаг с сообщением
- `QuizStep.tsx` — шаг с квизом

**UI компоненты (`components/ui/`):**
- Базовые компоненты (Button, Input, Card и т.д.)

### API клиенты

**Структура (`lib/api/`):**
```typescript
lib/api/
├── client.ts        # Базовый Axios клиент
├── auth.ts          # API аутентификации
├── courses.ts       # API курсов
├── lessons.ts       # API уроков
├── steps.ts         # API шагов
├── chat.ts          # API чата
└── quiz.ts          # API квизов
```

**Пример использования:**
```typescript
import { coursesApi } from '@/lib/api/courses';

const courses = await coursesApi.getCourses();
```

## Структура Backend

### API роутеры

**Файлы в `app/api/v1/`:**
- `auth.py` — аутентификация
- `courses.py` — курсы
- `lessons.py` — уроки
- `steps.py` — шаги
- `chat.py` — чат
- `quiz.py` — квизы
- `mvp.py` — MVP эндпоинты

### Сервисы

**Файлы в `app/services/`:**
- `auth_service.py` — логика аутентификации
- `chat_service.py` — создание сессий чата, отправка сообщений в LLM
- `llm_service.py` — интеграция с OpenAI API
- `progress_service.py` — отслеживание прогресса пользователя

### Модели данных

**Файлы в `app/models/`:**
- `user.py` — пользователи
- `course.py` — курсы (SQLAlchemy)
- `course_db.py` — курсы из БД
- `course_element_db.py` — элементы курсов из БД
- `chat_session.py` — сессии чата
- `chat_message.py` — сообщения чата
- `quiz_attempt.py` — попытки квизов

### Схемы (Pydantic)

**Файлы в `app/schemas/`:**
- `user.py` — схемы пользователей
- `course.py` — схемы курсов
- `chat.py` — схемы чата
- `quiz.py` — схемы квизов

## Интеграция Frontend ↔ Backend

### Поток данных

```
Frontend (Next.js)
    ↓ HTTP Request (Axios)
Backend API (FastAPI)
    ↓
Services (chat_service, llm_service)
    ↓
Core Logic (course.py, elements/)
    ↓
Database (PostgreSQL)
```

### Пример: прохождение диалога

1. **Frontend:** Пользователь отправляет сообщение через `DialogView.tsx`
2. **API клиент:** `chatApi.sendMessage(sessionId, message)`
3. **Backend API:** `POST /api/v1/chat/sessions/{session_id}/messages`
4. **Chat Service:** Получение истории, формирование запроса к LLM
5. **LLM Service:** Вызов OpenAI API через `chat.py`
6. **Chat Service:** Сохранение ответа в БД
7. **Backend API:** Возврат ответа клиенту
8. **Frontend:** Отображение ответа в `DialogView.tsx`

## Dependency Injection

Backend использует dependency injection для сессий БД:

```python
from app.database import get_db
from fastapi import Depends

@router.get("/courses")
async def get_courses(db: Session = Depends(get_db)):
    # Использование сессии БД
    ...
```

## CORS и безопасность

**CORS настройки:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Окружения

**Переменные окружения:**
- `DATABASE_URL` — строка подключения к PostgreSQL
- `SECRET_KEY` — секретный ключ для JWT
- `FRONTEND_URL` — URL frontend приложения
- `ENVIRONMENT` — окружение (development, production)
