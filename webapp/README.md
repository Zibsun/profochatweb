# ProfoChatBot Web

Веб-версия платформы для интерактивных обучающих курсов.

## Структура проекта

- `frontend/` - Next.js 14 приложение (TypeScript)
- `backend/` - FastAPI приложение (Python)
- `docker-compose.yml` - Конфигурация для запуска всего стека

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 20+ (для локальной разработки frontend)
- Python 3.12+ (для локальной разработки backend)
- PostgreSQL 14+ (или использование Docker)

### Запуск через Docker Compose

**Рекомендуемый способ (используя скрипты из `bin/`):**
```bash
# Из корня проекта
./bin/webapp/docker-start.sh
```

**Или вручную:**

1. Скопируйте файлы с примерами переменных окружения:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Отредактируйте `backend/.env` и укажите необходимые значения:
   ```
   DATABASE_URL=postgresql://profochatbot:profochatbot@db:5432/profochatbot_web
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   FRONTEND_URL=http://localhost:3000
   ENVIRONMENT=development
   ```

3. Запустите все сервисы:
   ```bash
   docker-compose up -d
   ```

4. Примените миграции базы данных:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

5. Откройте приложение:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API документация: http://localhost:8000/docs

**Остановка Docker:**
```bash
./bin/webapp/docker-stop.sh
```

**Просмотр логов:**
```bash
./bin/webapp/docker-logs.sh [service]
```

### Локальная разработка

**Рекомендуемый способ (используя скрипты из `bin/`):**

**Настройка (первый раз):**
```bash
# Настройка backend (создание venv, установка зависимостей)
./bin/webapp/setup-backend.sh

# Настройка frontend (установка зависимостей)
./bin/webapp/setup-frontend.sh

# Или настройка всего сразу
make webapp-setup
```

**Запуск для разработки:**
```bash
# Запуск только backend
./bin/webapp/dev-backend.sh

# Запуск только frontend
./bin/webapp/dev-frontend.sh

# Запуск всего стека (backend + frontend)
./bin/webapp/dev-all.sh
```

**Или используя Makefile:**
```bash
make webapp-dev-backend   # Запуск backend
make webapp-dev-frontend  # Запуск frontend
make webapp-dev-all       # Запуск всего стека
```

**Тестирование:**
```bash
./bin/webapp/test-backend.sh
# или
make webapp-test
```

#### Backend (ручная настройка)

1. Перейдите в директорию backend:
   ```bash
   cd backend
   ```

2. Создайте виртуальное окружение:
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate  # На Windows: venv\Scripts\activate
   ```

3. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```

4. Настройте переменные окружения:
   ```bash
   cp .env.example .env
   # Отредактируйте .env
   ```

5. Инициализируйте Alembic (если еще не сделано):
   ```bash
   alembic init alembic
   ```

6. Примените миграции:
   ```bash
   alembic upgrade head
   ```

7. Запустите сервер:
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend (ручная настройка)

1. Перейдите в директорию frontend:
   ```bash
   cd frontend
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Настройте переменные окружения:
   ```bash
   cp .env.local.example .env.local
   # Отредактируйте .env.local если нужно
   ```

4. Запустите dev сервер:
   ```bash
   npm run dev
   ```

## API Endpoints

### Аутентификация
- `POST /api/v1/auth/register` - Регистрация
- `POST /api/v1/auth/login` - Вход
- `POST /api/v1/auth/logout` - Выход
- `GET /api/v1/auth/me` - Текущий пользователь

### Курсы
- `GET /api/v1/courses` - Список курсов
- `GET /api/v1/courses/{course_id}` - Информация о курсе
- `GET /api/v1/courses/{course_id}/progress` - Прогресс по курсу
- `POST /api/v1/courses/{course_id}/start` - Начать курс

### Уроки
- `GET /api/v1/courses/{course_id}/lessons` - Список уроков
- `GET /api/v1/lessons/{lesson_id}` - Информация об уроке
- `GET /api/v1/lessons/{lesson_id}/steps` - Список шагов урока

### Шаги
- `GET /api/v1/steps/{step_id}` - Информация о шаге
- `POST /api/v1/steps/{step_id}/complete` - Завершить шаг

### Чат
- `POST /api/v1/steps/{step_id}/chat/session` - Создать сессию чата
- `GET /api/v1/steps/{step_id}/chat/session` - Получить сессию чата
- `POST /api/v1/chat/sessions/{session_id}/messages` - Отправить сообщение
- `GET /api/v1/chat/sessions/{session_id}/messages` - История сообщений
- `POST /api/v1/chat/sessions/{session_id}/complete` - Завершить сессию

### Квизы
- `POST /api/v1/steps/{step_id}/quiz/attempt` - Отправить ответ на квиз
- `GET /api/v1/steps/{step_id}/quiz/attempt` - Получить предыдущую попытку

## Скрипты запуска

Все скрипты для запуска и управления проектом находятся в папке `bin/webapp/`. 
Подробнее см. [bin/README.md](../bin/README.md).

Основные команды:
- `./bin/webapp/setup-backend.sh` - Настройка backend
- `./bin/webapp/setup-frontend.sh` - Настройка frontend
- `./bin/webapp/dev-backend.sh` - Запуск backend для разработки
- `./bin/webapp/dev-frontend.sh` - Запуск frontend для разработки
- `./bin/webapp/dev-all.sh` - Запуск всего стека
- `./bin/webapp/test-backend.sh` - Тестирование backend
- `./bin/webapp/docker-start.sh` - Запуск через Docker
- `./bin/webapp/docker-stop.sh` - Остановка Docker
- `./bin/webapp/docker-logs.sh` - Просмотр логов Docker

Или используйте Makefile из корня проекта:
```bash
make help              # Показать все доступные команды
make webapp-setup      # Настройка всего webapp
make webapp-dev-backend # Запуск backend
make webapp-dev-frontend # Запуск frontend
make webapp-dev-all    # Запуск всего стека
make webapp-test       # Тестирование backend
make webapp-docker-up  # Запуск через Docker
```

## Разработка

### Миграции базы данных

Создание новой миграции:
```bash
alembic revision --autogenerate -m "Описание изменений"
```

Применение миграций:
```bash
alembic upgrade head
```

Откат миграции:
```bash
alembic downgrade -1
```

### Тестирование

TODO: Добавить инструкции по тестированию

## Структура базы данных

Основные таблицы:
- `users` - Пользователи
- `courses` - Курсы
- `lessons` - Уроки
- `lesson_steps` - Шаги уроков
- `course_progress` - Прогресс по курсам
- `chat_sessions` - Сессии чата
- `chat_messages` - Сообщения чата
- `quiz_attempts` - Попытки квизов

## Лицензия

TODO: Указать лицензию

