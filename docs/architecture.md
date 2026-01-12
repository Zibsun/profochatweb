# Архитектура ProfoChat Web

Документ описывает архитектуру веб-приложения для интерактивных обучающих курсов.

> **Примечание:** Telegram бот был перенесен в отдельный репозиторий. Данный документ описывает только веб-приложение.

## Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура веб-приложения](#архитектура-веб-приложения)
3. [База данных](#база-данных)
4. [Система элементов курсов](#система-элементов-курсов)
5. [Интеграции](#интеграции)
6. [Планировщик задач](#планировщик-задач)

---

## Обзор системы

ProfoChat Web — это веб-приложение для создания и прохождения интерактивных обучающих курсов с поддержкой:
- Веб-интерфейса для прохождения курсов в браузере
- Системы управления курсами через YAML файлы и базу данных
- Интеграции с ИИ-моделями для диалоговых элементов
- Системы планирования отложенных элементов
- Редактора курсов с визуальным интерфейсом

### Основные компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                    ProfoChat Web Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────┐               │
│  │         Web Application                  │               │
│  │  ┌──────────────┐   ┌──────────────┐   │               │
│  │  │  Frontend    │   │   Backend    │   │               │
│  │  │  (Next.js)   │◄──┤  (FastAPI)   │   │               │
│  │  └──────────────┘   └──────┬───────┘   │               │
│  └────────────────────────────┼────────────┘               │
│                               │                             │
│         ┌──────────────────────▼──────────┐                │
│         │      Core Logic                 │                │
│         │  (course.py, elements/,        │                │
│         │   db.py, chat.py)              │                │
│         └──────────┬─────────────────────┘                │
│                    │                                         │
│         ┌──────────▼──────────┐                            │
│         │   PostgreSQL DB     │                            │
│         │   (conversation,     │                            │
│         │    run, course,      │                            │
│         │    waiting_element)  │                            │
│         └─────────────────────┘                            │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │  External Services                          │           │
│  │  - OpenAI API (GPT models)                 │           │
│  │  - Eleven Labs (TTS, STT)                 │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Архитектура веб-приложения

### Технологический стек

**Frontend:**
- **Фреймворк**: Next.js 14 (App Router)
- **Язык**: TypeScript
- **Стили**: Tailwind CSS
- **State Management**: Zustand
- **HTTP клиент**: Axios

**Backend:**
- **Фреймворк**: FastAPI
- **Язык**: Python 3.12+
- **ORM**: SQLAlchemy
- **Миграции**: Alembic
- **База данных**: PostgreSQL

### Структура проекта

```
profochatweb/
├── webapp/
│   ├── frontend/                    # Next.js приложение
│   │   ├── app/                    # App Router страницы
│   │   │   ├── (auth)/            # Страницы аутентификации
│   │   │   ├── course/            # Страницы курсов
│   │   │   ├── courses/           # Список курсов
│   │   │   └── page.tsx           # Главная страница
│   │   ├── components/            # React компоненты
│   │   │   ├── chat/             # Компоненты чата
│   │   │   ├── steps/            # Компоненты шагов
│   │   │   └── ui/               # UI компоненты
│   │   └── lib/                  # Утилиты и API клиенты
│   │       ├── api/              # API клиенты
│   │       └── types/           # TypeScript типы
│   │
│   └── backend/                    # FastAPI приложение
│       ├── app/
│       │   ├── main.py           # Точка входа FastAPI
│       │   ├── api/v1/          # API роутеры
│       │   │   ├── auth.py      # Аутентификация
│       │   │   ├── courses.py   # Курсы
│       │   │   ├── lessons.py   # Уроки
│       │   │   ├── steps.py     # Шаги
│       │   │   ├── chat.py      # Чат
│       │   │   └── quiz.py      # Квизы
│       │   ├── models/          # SQLAlchemy модели
│       │   ├── schemas/         # Pydantic схемы
│       │   └── services/        # Бизнес-логика
│       │       ├── chat_service.py
│       │       ├── llm_service.py
│       │       └── progress_service.py
│       └── alembic/              # Миграции БД
│
├── course.py                      # Логика работы с курсами
├── db.py                          # Функции работы с базой данных
├── chat.py                        # Интеграция с OpenAI/Eleven Labs API
├── waiting.py                     # Планировщик отложенных элементов
├── api.py                         # FastAPI обертка (legacy, используется частично)
├── elements/                      # Реализация типов элементов курсов
│   ├── __init__.py
│   ├── element.py                # Базовый класс Element
│   ├── message.py                # Элемент Message
│   ├── dialog.py                 # Элемент Dialog (ИИ-диалог)
│   ├── quiz.py                   # Элемент Quiz
│   ├── input.py                  # Элемент Input
│   └── ...                       # Другие типы элементов
├── scripts/                       # YAML файлы курсов
│   └── {bot_folder}/
│       ├── courses.yml            # Список курсов
│       └── *.yml                 # Файлы курсов
└── config.yaml                    # Конфигурация приложения
```

### Frontend архитектура

#### Структура страниц

**App Router (Next.js 14):**
- `app/page.tsx` — главная страница
- `app/(auth)/login/page.tsx` — страница входа
- `app/courses/page.tsx` — список курсов
- `app/course/[courseId]/page.tsx` — страница курса
- `app/test/page.tsx` — тестовая страница

#### Компоненты

**Компоненты чата:**
- `ChatView.tsx` — основной компонент чата
- `DialogView.tsx` — компонент диалога с ИИ
- `InputView.tsx` — компонент ввода текста
- `MultiChoiceView.tsx` — компонент множественного выбора
- `QuizView.tsx` — компонент квиза
- `AudioView.tsx` — компонент аудио

**Компоненты шагов:**
- `ChatStep.tsx` — шаг с чатом
- `MessageStep.tsx` — шаг с сообщением
- `QuizStep.tsx` — шаг с квизом
- `VideoStep.tsx` — шаг с видео
- `PdfStep.tsx` — шаг с PDF

#### API клиенты

**Структура:**
```typescript
lib/api/
├── client.ts        # Базовый Axios клиент
├── auth.ts          # API аутентификации
├── courses.ts       # API курсов
├── lessons.ts       # API уроков
├── steps.ts         # API шагов
├── chat.ts          # API чата
├── quiz.ts          # API квизов
└── dialog.ts        # API диалогов (MVP)
```

**Пример использования:**
```typescript
// lib/api/courses.ts
export const coursesApi = {
  getCourses: async (): Promise<Course[]> => {
    const response = await apiClient.get<Course[]>('/courses');
    return response.data;
  },
  startCourse: async (courseId: string): Promise<CourseProgress> => {
    const response = await apiClient.post<CourseProgress>(`/courses/${courseId}/start`);
    return response.data;
  },
};
```

### Backend архитектура

#### API роутеры

**Структура:**
```
/api/v1/
├── auth/           # Аутентификация
├── courses/        # Курсы
├── lessons/        # Уроки
├── steps/          # Шаги
├── chat/           # Чат
└── quiz/           # Квизы

/api/mvp/           # MVP эндпоинты (без аутентификации)
└── courses/        # Курсы для MVP
```

**Основные эндпоинты:**

**Аутентификация:**
- `POST /api/v1/auth/register` — регистрация
- `POST /api/v1/auth/login` — вход
- `POST /api/v1/auth/logout` — выход
- `GET /api/v1/auth/me` — текущий пользователь

**Курсы:**
- `GET /api/v1/courses` — список курсов
- `GET /api/v1/courses/{course_id}` — информация о курсе
- `POST /api/v1/courses/{course_id}/start` — начать курс
- `GET /api/v1/courses/{course_id}/progress` — прогресс по курсу

**Шаги:**
- `GET /api/v1/steps/{step_id}` — информация о шаге
- `POST /api/v1/steps/{step_id}/complete` — завершить шаг

**Чат:**
- `POST /api/v1/steps/{step_id}/chat/session` — создать сессию чата
- `POST /api/v1/chat/sessions/{session_id}/messages` — отправить сообщение
- `GET /api/v1/chat/sessions/{session_id}/messages` — история сообщений

**MVP (без аутентификации):**
- `GET /api/mvp/courses/{course_id}/current` — текущий элемент
- `POST /api/mvp/courses/{course_id}/dialog/message` — отправить сообщение в диалог

#### Сервисы

**Chat Service (`services/chat_service.py`):**
- Создание сессий чата
- Отправка сообщений в LLM
- Управление историей диалога

**LLM Service (`services/llm_service.py`):**
- Интеграция с OpenAI API
- Поддержка reasoning моделей
- Обработка ответов от ИИ

**Progress Service (`services/progress_service.py`):**
- Отслеживание прогресса пользователя
- Расчет завершенности курса

#### Модели данных

**SQLAlchemy модели:**
- `User` — пользователи
- `Course` — курсы
- `Lesson` — уроки
- `LessonStep` — шаги уроков
- `CourseProgress` — прогресс по курсам
- `ChatSession` — сессии чата
- `ChatMessage` — сообщения чата
- `QuizAttempt` — попытки квизов

### Core Logic (Общая логика)

Веб-приложение использует общую логику курсов из модулей в корне проекта:

1. **Модули Core Logic:**
   - `course.py` — логика работы с курсами (загрузка, навигация)
   - `elements/` — типы элементов курсов (message, dialog, quiz и т.д.)
   - `db.py` — функции работы с БД (прямые SQL запросы через psycopg2)
   - `chat.py` — интеграция с ИИ (OpenAI, Eleven Labs)
   - `waiting.py` — планировщик отложенных элементов

2. **Интеграция с Backend:**
   - Backend сервисы используют модули из корня через `sys.path`
   - SQLAlchemy модели в `backend/app/models/` для ORM работы с БД
   - Прямые SQL функции из `db.py` для совместимости с существующей БД

**Пример использования:**
```python
# backend/app/api/v1/mvp.py
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import course
from elements import element_registry

element = course.Course.get_current_element(chat_id)
```

### Поток данных в веб-приложении

```
Frontend (Next.js)
    ↓ HTTP Request
Backend API (FastAPI)
    ↓
Services (chat_service, llm_service)
    ↓
Core Logic (course.py, elements/)
    ↓
Database (PostgreSQL)
```

**Пример: прохождение диалога**

1. Frontend: пользователь отправляет сообщение
2. API: `POST /api/v1/chat/sessions/{session_id}/messages`
3. Chat Service: получение истории, формирование запроса к LLM
4. LLM Service: вызов OpenAI API
5. Chat Service: сохранение ответа в БД
6. API: возврат ответа клиенту
7. Frontend: отображение ответа в интерфейсе

---

## База данных

### Схема базы данных

**Основные таблицы:**

1. **`conversation`** — история взаимодействий
   - Хранит все сообщения и ответы пользователей
   - Связывает элементы курсов с пользователями
   - Содержит оценки для тестовых элементов

2. **`run`** — сессии прохождения курсов
   - Отслеживает начало и завершение курса
   - Хранит UTM метки для аналитики
   - Поддерживает мультиботовую архитектуру

3. **`waiting_element`** — отложенные элементы
   - Управление элементами с задержкой отправки
   - Интеграция с APScheduler

4. **`course`** — метаданные курсов
   - Хранит YAML представление курсов из БД
   - Отслеживает создателей курсов

5. **`course_element`** — элементы курсов из БД
   - Хранение элементов для динамически добавленных курсов
   - Последовательная навигация по элементам

6. **`bannedparticipants`** — заблокированные пользователи
   - Автоматическая и ручная блокировка

7. **`courseparticipants`** — участники ограниченных курсов
   - Контроль доступа к курсам

Подробнее см. [database.md](./database.md)

### Паттерны работы с БД

**Веб-приложение использует два подхода:**

1. **Прямые SQL запросы (`db.py`):**
   - Используются для совместимости с существующей структурой БД
   - Функции в `db.py` создают новое подключение для каждой операции
   - Используются модулями Core Logic (`course.py`, `elements/`)

2. **SQLAlchemy ORM (`backend/app/models/`):**
   - Используется в FastAPI backend для новых функций
   - Сессии через dependency injection
   - Миграции через Alembic
   - Используется для работы с пользователями, сессиями чата и прогрессом курсов

---

## Система элементов курсов

### Формат курсов

Курсы могут храниться в двух форматах:

1. **YAML файлы** (`scripts/{bot_folder}/*.yml`)
2. **База данных** (таблицы `course` и `course_element`)

### Структура элемента

```yaml
Element_ID:
  type: message  # Тип элемента
  text: "Текст сообщения"
  button: "Текст кнопки"  # Опционально
  parse_mode: HTML  # Опционально
  media:  # Опционально
    - https://example.com/image.jpg
```

### Типы элементов

Подробное описание всех типов элементов см. в [elements.md](./elements.md)

**Основные категории:**

1. **Информационные:**
   - `message` — текстовое сообщение
   - `audio` — аудиосообщение

2. **Интерактивные:**
   - `input` — ввод текста
   - `quiz` — викторина
   - `question` — опрос
   - `multi_choice` — множественный выбор

3. **ИИ-диалоги:**
   - `dialog` — диалог с ИИ-ассистентом

4. **Навигационные:**
   - `jump` — переход к элементу
   - `delay` — задержка перед элементом
   - `end` — завершение курса

5. **Аналитические:**
   - `test` — итоговый тест
   - `revision` — повторение ошибок

### Регистр элементов

Элементы регистрируются через `element_registry` в `elements/__init__.py`:

```python
element_registry = {
    "message": Message,
    "dialog": Dialog,
    "quiz": Quiz,
    # ...
}
```

При загрузке курса элемент создается через:
```python
element_type = element_data["element_data"]["type"]
element_class = element_registry.get(element_type)
element = element_class(element_id, course_id, element_data)
```

---

## Интеграции

### OpenAI API

**Использование:**
- GPT модели для диалогов
- Reasoning модели (gpt-5, o1) с параметром `reasoning`
- Responses API (альтернативный формат)

**Конфигурация:**
- API ключ через переменную окружения `OPENAI_API_KEY`
- Прокси через `config.yaml` (опционально)
- Базовая настройка в `config.yaml` → `openai`

**Функции (`chat.py`):**
- `get_reply()` — стандартный запрос к API
- `get_reply_sys()` — запрос с системным промптом
- Поддержка `temperature` и `reasoning` параметров

### Eleven Labs API

**Использование:**
- **Scribe API** — транскрибация голосовых сообщений
- **TTS API** — синтез речи для голосовых ответов

**Конфигурация:**
- API ключ через переменную окружения `ELEVENLABS_API_KEY`

**Поддержка в элементах:**
- `dialog` элемент поддерживает:
  - `transcription_language` — язык для транскрибации
  - `voice_response` — включение голосовых ответов
  - `tts_voice` — ID голоса для синтеза
  - `tts_model` — модель TTS
  - `tts_speed` — скорость речи

---

## Планировщик задач

### APScheduler

**Использование:**
- Планирование проверки отложенных элементов
- Автоматическая блокировка пользователей

**Инициализация (`waiting.py`):**

```python
scheduler = AsyncIOScheduler()

# Проверка отложенных элементов
init_waiting(scheduler)

# Проверка для блокировки
init_banning(scheduler)

scheduler.start()
```

**Примечание:** В веб-версии планировщик работает без зависимости от Telegram бота. Отложенные элементы обрабатываются через API endpoints.

### Отложенные элементы (Delay)

**Механизм работы:**

1. При создании `delay` элемента:
   ```python
   element.set_to_wait(wait_time)  # Добавляет в waiting_element
   ```

2. Планировщик периодически проверяет:
   ```python
   waiting_elements = db.get_active_waiting_elements()
   # Элементы с waiting_till_date < now()
   ```

3. Для каждого активного элемента:
   ```python
   # В веб-версии обработка происходит через API endpoints
   # или через фоновые задачи (Celery/APScheduler)
   continue_course_flow(chat_id, element_id, course_id)
   db.set_is_waiting_false(id)
   ```

**Конфигурация:**
- Интервал проверки в `config.yaml` → `settings.check_interval`
- Формат: `"10m"`, `"1h"`, `"1d"` и т.д.

### Автоматическая блокировка

**Механизм работы:**

1. Планировщик периодически вызывает `ban_users()`
2. Подсчитываются сообщения типа `*_chat*` для каждого пользователя
3. Если превышен лимит → добавление в `bannedparticipants`
4. При отправке сообщения проверяется статус блокировки

**Конфигурация:**
- В `config.yaml` → `ban_settings`:
  ```yaml
  ban_settings:
    check_interval: "10m"
    ban_limit: 50
    ban_reason: "Превышен лимит сообщений"
    exclude: []  # Список chat_id для исключения
  ```

---

## Особенности архитектуры

### Мультиботовая поддержка

Система поддерживает работу с несколькими конфигурациями на одной базе данных:
- Разделение через поле `botname` в таблицах (для совместимости с Telegram ботом)
- Отдельные папки для курсов: `scripts/{bot_folder}/`
- Настройки через переменные окружения `BOT_NAME` и `BOT_FOLDER`

### Два источника курсов

1. **YAML файлы** — статические курсы в файловой системе (`scripts/{bot_folder}/*.yml`)
2. **База данных** — динамически добавляемые курсы через API (таблицы `course` и `course_element`)

Курсы из БД имеют `path: "db"` в `courses.yml` и загружаются через `db.get_courses()`.

### Архитектура Core Logic

Веб-приложение использует модули Core Logic из корня проекта:
- `course.py` — логика курсов (загрузка, навигация, управление сессиями)
- `elements/` — типы элементов (message, dialog, quiz и т.д.)
- `db.py` — функции БД (прямые SQL запросы)
- `chat.py` — интеграция с ИИ (OpenAI, Eleven Labs)

Эти модули были очищены от зависимостей от Telegram бота (удалены методы `send(bot)`, импорты `aiogram`) и адаптированы для работы через API.

### Система отчетов

Все взаимодействия сохраняются в таблицу `conversation`:
- Сообщения системы (элементы курса) и пользователя
- Оценки для тестовых элементов
- История диалогов с ИИ

Данные используются для:
- Генерации отчетов (`report.py`)
- Подсчета результатов в `test` элементах
- Повторения ошибок в `revision` элементах
- Референсов в `dialog` элементах через `{{element_id}}`

---

## Развертывание

### Веб-приложение

**Требования:**
- Docker и Docker Compose
- Или локально: Node.js 20+, Python 3.12+

**Запуск через Docker:**
```bash
cd webapp
docker-compose up -d
```

**Локальная разработка:**
```bash
# Backend
cd webapp/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd webapp/frontend
npm install
npm run dev
```

---

## Заключение

Архитектура ProfoChat Web построена на принципах:
- **Модульности** — разделение на независимые компоненты (Frontend, Backend, Core Logic)
- **Переиспользования** — Core Logic модули используются через API
- **Расширяемости** — легко добавлять новые типы элементов
- **Гибкости** — поддержка разных источников курсов (YAML файлы и БД)
- **Независимости** — веб-приложение работает независимо от Telegram бота

Система позволяет создавать интерактивные обучающие курсы с поддержкой ИИ-диалогов, тестов, мультимедиа и отложенных элементов через веб-интерфейс.

> **Примечание:** Telegram бот находится в отдельном репозитории и использует те же Core Logic модули, но с адаптерами для Telegram Bot API.
