# Задание: Создание структуры веб-приложения ProfoChatBot Web

## Цель

Создать полную структуру отдельного веб-приложения для реализации веб-версии обучающей платформы на основе PRD (`docs/webversion_prd.md`).

## Структура проекта

Создать новую директорию `webapp/` в корне проекта со следующей структурой:

```
webapp/
├── frontend/                 # Next.js 14 приложение
│   ├── app/                  # App Router (Next.js 14)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   └── courses/
│   │       ├── [courseId]/
│   │       │   ├── page.tsx
│   │       │   └── lessons/
│   │       │       └── [lessonId]/
│   │       │           └── steps/
│   │       │               └── [stepId]/
│   │       │                   └── page.tsx
│   ├── components/           # React компоненты
│   │   ├── ui/               # Базовые UI компоненты
│   │   ├── courses/          # Компоненты курсов
│   │   ├── lessons/          # Компоненты уроков
│   │   ├── steps/            # Компоненты шагов
│   │   │   ├── MessageStep.tsx
│   │   │   ├── VideoStep.tsx
│   │   │   ├── PdfStep.tsx
│   │   │   ├── QuizStep.tsx
│   │   │   └── ChatStep.tsx
│   │   └── layout/           # Layout компоненты
│   ├── lib/                  # Утилиты и хелперы
│   │   ├── api/              # API клиент
│   │   ├── types/            # TypeScript типы
│   │   ├── utils/            # Утилиты
│   │   └── hooks/            # React hooks
│   ├── styles/               # Стили
│   ├── public/               # Статические файлы
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js    # Если используется Tailwind
│   └── .env.local.example
│
├── backend/                  # FastAPI приложение
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # Точка входа FastAPI
│   │   ├── config.py         # Конфигурация
│   │   ├── database.py       # Подключение к БД
│   │   ├── models/           # SQLAlchemy модели
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── lesson.py
│   │   │   ├── lesson_step.py
│   │   │   ├── course_progress.py
│   │   │   ├── chat_session.py
│   │   │   ├── chat_message.py
│   │   │   └── quiz_attempt.py
│   │   ├── schemas/          # Pydantic схемы
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── course.py
│   │   │   ├── lesson.py
│   │   │   ├── lesson_step.py
│   │   │   ├── progress.py
│   │   │   ├── chat.py
│   │   │   └── quiz.py
│   │   ├── api/              # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── deps.py       # Зависимости (auth, db)
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── courses.py
│   │   │       ├── lessons.py
│   │   │       ├── steps.py
│   │   │       ├── chat.py
│   │   │       └── quiz.py
│   │   ├── services/         # Бизнес-логика
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── course_service.py
│   │   │   ├── progress_service.py
│   │   │   ├── chat_service.py
│   │   │   └── llm_service.py
│   │   └── core/             # Ядро приложения
│   │       ├── __init__.py
│   │       ├── security.py   # JWT, хеширование паролей
│   │       └── config.py
│   ├── alembic/              # Миграции БД
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
│
├── docker-compose.yml        # Docker Compose конфигурация
├── .gitignore
└── README.md
```

## Задачи

### 1. Frontend (Next.js 14 + TypeScript)

#### 1.1 Инициализация проекта

- [ ] Создать Next.js 14 проект с TypeScript в `webapp/frontend/`
- [ ] Настроить App Router (не Pages Router)
- [ ] Установить зависимости:
  - `next@14`
  - `react@latest`
  - `react-dom@latest`
  - `typescript`
  - `tailwindcss` (опционально, но рекомендуется)
  - `axios` или использовать встроенный `fetch`
  - `react-hook-form`
  - `react-pdf` или `pdfjs-dist` для PDF просмотра
  - `react-player` для видео
  - `zustand` для state management (опционально)

#### 1.2 Структура типов TypeScript

Создать файлы типов в `webapp/frontend/lib/types/`:

**`types.ts`:**
```typescript
// Базовые типы из PRD
export type StepType = 'message' | 'video' | 'pdf' | 'quiz_single_choice' | 'chat';

export interface User {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Course {
  course_id: string;
  title: string;
  description: string;
  creator_id: string;
  is_restricted: boolean;
  created_at: string;
}

export interface Lesson {
  lesson_id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

export interface LessonStep {
  step_id: string;
  lesson_id: string;
  step_type: StepType;
  order_index: number;
  content: StepContent;
}

export type StepContent = 
  | MessageStepContent
  | VideoStepContent
  | PdfStepContent
  | QuizStepContent
  | ChatStepContent;

export interface MessageStepContent {
  text: string;
  parse_mode?: 'markdown' | 'html';
  media?: string[];
}

export interface VideoStepContent {
  video_url: string;
  title: string;
  description?: string;
}

export interface PdfStepContent {
  pdf_url: string;
  title: string;
}

export interface QuizStepContent {
  question: string;
  options: QuizOption[];
  feedback_correct?: string;
  feedback_incorrect?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface ChatStepContent {
  initial_message: string;
  system_prompt: string;
  model?: string;
  temperature?: number;
  max_messages?: number;
}

export interface CourseProgress {
  progress_id: string;
  user_id: string;
  course_id: string;
  current_lesson_id?: string;
  current_step_id?: string;
  completed_at?: string;
  started_at: string;
  updated_at: string;
}

export interface ChatSession {
  session_id: string;
  user_id: string;
  step_id: string;
  status: 'active' | 'completed' | 'stopped';
  created_at: string;
}

export interface ChatMessage {
  message_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  status: 'pending' | 'sent' | 'error';
}

export interface QuizAttempt {
  attempt_id: string;
  user_id: string;
  step_id: string;
  selected_option_id: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  created_at: string;
}
```

#### 1.3 API клиент

Создать `webapp/frontend/lib/api/client.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Перенаправление на страницу входа
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

Создать API функции в `webapp/frontend/lib/api/`:
- `auth.ts` - функции для аутентификации
- `courses.ts` - функции для работы с курсами
- `lessons.ts` - функции для работы с уроками
- `steps.ts` - функции для работы с шагами
- `chat.ts` - функции для работы с чатом
- `quiz.ts` - функции для работы с квизами

#### 1.4 Базовые компоненты

Создать базовые UI компоненты в `webapp/frontend/components/ui/`:
- `Button.tsx` - кнопка
- `Input.tsx` - поле ввода
- `Card.tsx` - карточка
- `ProgressBar.tsx` - прогресс-бар
- `LoadingSpinner.tsx` - индикатор загрузки

#### 1.5 Layout компоненты

Создать в `webapp/frontend/components/layout/`:
- `Header.tsx` - шапка сайта
- `Sidebar.tsx` - боковая панель навигации
- `Breadcrumbs.tsx` - хлебные крошки
- `Footer.tsx` - подвал

#### 1.6 Страницы

Создать страницы согласно routing из PRD:

**`app/page.tsx`** - главная страница (редирект на `/courses`)

**`app/(auth)/login/page.tsx`** - страница входа

**`app/(auth)/register/page.tsx`** - страница регистрации

**`app/courses/page.tsx`** - список курсов

**`app/courses/[courseId]/page.tsx`** - страница курса со списком уроков

**`app/courses/[courseId]/lessons/[lessonId]/steps/[stepId]/page.tsx`** - страница шага урока

#### 1.7 Компоненты шагов

Создать компоненты для каждого типа шага в `webapp/frontend/components/steps/`:
- `MessageStep.tsx`
- `VideoStep.tsx`
- `PdfStep.tsx`
- `QuizStep.tsx`
- `ChatStep.tsx`

Каждый компонент должен принимать `step: LessonStep` и обрабатывать соответствующий тип контента.

#### 1.8 Конфигурационные файлы

**`next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Добавить домены для изображений
  },
}

module.exports = nextConfig
```

**`tsconfig.json`** - стандартная конфигурация Next.js с TypeScript

**`.env.local.example`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. Backend (FastAPI + Python)

#### 2.1 Инициализация проекта

- [ ] Создать структуру папок в `webapp/backend/`
- [ ] Создать `requirements.txt` с зависимостями:
  ```
  fastapi==0.104.1
  uvicorn[standard]==0.24.0
  sqlalchemy==2.0.23
  alembic==1.12.1
  psycopg2-binary==2.9.9
  pydantic==2.5.0
  pydantic-settings==2.1.0
  python-jose[cryptography]==3.3.0
  passlib[bcrypt]==1.7.4
  python-multipart==0.0.6
  openai==1.3.0
  python-dotenv==1.0.0
  ```

#### 2.2 SQLAlchemy модели

Создать модели в `webapp/backend/app/models/` согласно схемам из PRD:

**`user.py`:**
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    course_progresses = relationship("CourseProgress", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
```

Аналогично создать модели для:
- `course.py`
- `lesson.py`
- `lesson_step.py`
- `course_progress.py`
- `chat_session.py`
- `chat_message.py`
- `quiz_attempt.py`

#### 2.3 Pydantic схемы

Создать схемы в `webapp/backend/app/schemas/` для валидации запросов и ответов:

**Пример `user.py`:**
```python
from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    user_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True
```

Создать схемы для всех сущностей.

#### 2.4 API Endpoints

Создать endpoints согласно PRD в `webapp/backend/app/api/v1/`:

**`auth.py`:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

**`courses.py`:**
- `GET /api/v1/courses`
- `GET /api/v1/courses/{course_id}`
- `GET /api/v1/courses/{course_id}/progress`
- `POST /api/v1/courses/{course_id}/start`

**`lessons.py`:**
- `GET /api/v1/courses/{course_id}/lessons`
- `GET /api/v1/lessons/{lesson_id}`
- `GET /api/v1/lessons/{lesson_id}/steps`

**`steps.py`:**
- `GET /api/v1/steps/{step_id}`
- `POST /api/v1/steps/{step_id}/complete`

**`chat.py`:**
- `POST /api/v1/steps/{step_id}/chat/session`
- `GET /api/v1/steps/{step_id}/chat/session`
- `POST /api/v1/chat/sessions/{session_id}/messages`
- `GET /api/v1/chat/sessions/{session_id}/messages`
- `POST /api/v1/chat/sessions/{session_id}/complete`

**`quiz.py`:**
- `POST /api/v1/steps/{step_id}/quiz/attempt`
- `GET /api/v1/steps/{step_id}/quiz/attempt`

#### 2.5 Сервисы

Создать сервисы в `webapp/backend/app/services/`:

**`auth_service.py`** - логика аутентификации (хеширование паролей, генерация JWT)

**`llm_service.py`** - интеграция с OpenAI API для чата

**`progress_service.py`** - логика обновления прогресса

**`chat_service.py`** - логика работы с чатом

#### 2.6 Конфигурация

**`app/config.py`:**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    OPENAI_API_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

**`app/database.py`:**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**`app/main.py`:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, courses, lessons, steps, chat, quiz
from app.config import settings

app = FastAPI(title="ProfoChatBot Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["courses"])
app.include_router(lessons.router, prefix="/api/v1/lessons", tags=["lessons"])
app.include_router(steps.router, prefix="/api/v1/steps", tags=["steps"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(quiz.router, prefix="/api/v1/steps", tags=["quiz"])

@app.get("/")
def root():
    return {"message": "ProfoChatBot Web API"}
```

#### 2.7 Alembic миграции

- [ ] Инициализировать Alembic: `alembic init alembic`
- [ ] Настроить `alembic/env.py` для подключения к БД
- [ ] Создать начальную миграцию: `alembic revision --autogenerate -m "Initial migration"`

**`.env.example`:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot_web
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

### 3. Docker Compose

Создать `webapp/docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: profochatbot
      POSTGRES_PASSWORD: profochatbot
      POSTGRES_DB: profochatbot_web
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://profochatbot:profochatbot@db:5432/profochatbot_web
      SECRET_KEY: ${SECRET_KEY:-dev-secret-key}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      FRONTEND_URL: http://localhost:3000
      ENVIRONMENT: development
    depends_on:
      - db
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### 4. Dockerfile'ы

**`webapp/backend/Dockerfile`:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**`webapp/frontend/Dockerfile`:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### 5. Дополнительные файлы

#### 5.1 `.gitignore`

Создать `webapp/.gitignore`:
```
# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python

# Environment
.env
.env.local
.venv
venv/

# Build
.next/
dist/
build/
*.egg-info/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

#### 5.2 README.md

Создать `webapp/README.md` с инструкциями по запуску проекта.

## Проверка

После выполнения задания проверить:

1. ✅ Структура папок создана согласно спецификации
2. ✅ Все конфигурационные файлы созданы
3. ✅ TypeScript типы определены
4. ✅ SQLAlchemy модели созданы для всех сущностей
5. ✅ Pydantic схемы созданы для всех API endpoints
6. ✅ Docker Compose конфигурация готова
7. ✅ `.env.example` файлы созданы для frontend и backend
8. ✅ README.md с инструкциями по запуску

## Примечания

- Все файлы должны быть созданы с базовой структурой, даже если реализация будет минимальной
- Комментарии в коде должны быть на русском языке (или английском, если команда предпочитает)
- Следовать best practices для Next.js 14 и FastAPI
- Использовать TypeScript строгий режим
- Все API endpoints должны иметь базовую структуру с заглушками

## Следующие шаги

После создания структуры:
1. Настроить подключение к базе данных
2. Реализовать аутентификацию
3. Реализовать базовые CRUD операции
4. Реализовать интеграцию с OpenAI API
5. Реализовать UI компоненты
6. Добавить обработку ошибок
7. Написать тесты

