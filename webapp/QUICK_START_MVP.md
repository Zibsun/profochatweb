# Быстрый старт MVP

## Предварительные требования

1. PostgreSQL база данных с таблицами `run` и `conversation` (из Telegram бота)
2. Python 3.12+
3. Node.js 18+

## Установка

### 1. Backend

```bash
cd webapp/backend
pip install -r requirements.txt
```

### 2. Frontend

```bash
cd webapp/frontend
npm install
npm install react-markdown isomorphic-dompurify
```

## Настройка

### Backend (.env)

Создайте файл `webapp/backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot
FRONTEND_URL=http://localhost:3000
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=not-needed-for-mvp
ENVIRONMENT=development
```

**Важно:** Убедитесь, что модули `db.py`, `course.py`, `globals.py` доступны из backend. Они должны находиться в корне проекта `profochatbot/`.

### Frontend

Создайте файл `webapp/frontend/.env.local` (опционально):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Запуск

### Terminal 1: Backend

```bash
cd webapp/backend
# Убедитесь, что PYTHONPATH включает корневую директорию проекта
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend

```bash
cd webapp/frontend
npm run dev
```

## Использование

Откройте браузер: `http://localhost:3000/course/testmessages`

Тестовый курс `testmessages` содержит 3 элемента типа `message` и уже добавлен в `scripts/courses.yml`.

## Проверка работы

1. Откройте `http://localhost:3000/course/testmessages`
2. Должно отобразиться первое сообщение с кнопкой "Далее"
3. При нажатии кнопки должен появиться следующий элемент
4. После третьего элемента курс завершается

## Отладка

### Backend логи

Проверьте логи backend для ошибок импорта или работы с БД.

### Frontend консоль

Откройте DevTools (F12) и проверьте консоль на ошибки.

### Проверка API

```bash
# Проверка существования курса
curl http://localhost:8000/api/mvp/courses/testmessages

# Получение текущего элемента (требует cookie с chat_id)
curl -v http://localhost:8000/api/mvp/courses/testmessages/current
```

## Структура файлов

```
webapp/
├── backend/
│   └── app/
│       └── api/
│           └── v1/
│               └── mvp.py          # MVP API роутер
├── frontend/
│   └── app/
│       └── course/
│           ├── [courseId]/
│           │   └── page.tsx        # Страница курса
│           ├── layout.tsx          # Layout для курсов
│           └── page.tsx            # Страница "курс не указан"
│   └── components/
│       └── steps/
│           └── MessageStepMVP.tsx  # Компонент элемента message
```

## Известные проблемы

1. **Импорт модулей Telegram бота:** Если возникают ошибки импорта `db`, `course`, `globals`, убедитесь, что:
   - Модули находятся в корне проекта
   - PYTHONPATH включает корневую директорию проекта
   - Или используйте абсолютные пути в `mvp.py`

2. **CORS ошибки:** Убедитесь, что `FRONTEND_URL` в `.env` соответствует URL frontend приложения

3. **Cookies не работают:** Убедитесь, что используется `credentials: 'include'` в fetch запросах
