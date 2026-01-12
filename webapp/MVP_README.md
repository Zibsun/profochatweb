# MVP Веб-версия чатбота

Упрощенная веб-версия для прохождения курсов с элементами типа `message` (только текст, без медиа).

## Особенности MVP

- ✅ Прямой доступ по URL: `/course/{course_id}`
- ✅ Только элементы типа `message` (текст с Markdown/HTML)
- ✅ Без аутентификации (анонимный доступ)
- ✅ Без медиа файлов
- ✅ Полная совместимость с Telegram ботом (использует те же таблицы `run` и `conversation`)

## Установка зависимостей

### Backend

```bash
cd webapp/backend
pip install -r requirements.txt
```

### Frontend

```bash
cd webapp/frontend
npm install
```

**Дополнительные зависимости для MVP:**
- `react-markdown` - для рендеринга Markdown
- `isomorphic-dompurify` - для санитизации HTML

Установка:
```bash
npm install react-markdown isomorphic-dompurify
```

## Настройка

### Backend

1. Убедитесь, что переменные окружения настроены в `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot
FRONTEND_URL=http://localhost:3000
```

2. Убедитесь, что модули Telegram бота доступны (db.py, course.py, globals.py находятся в корне проекта)

### Frontend

Настройка API URL в `app/course/[courseId]/page.tsx`:
- По умолчанию: `http://localhost:8000`
- Для production: изменить на соответствующий URL

## Запуск

### Backend

```bash
cd webapp/backend
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd webapp/frontend
npm run dev
```

## Использование

1. Откройте браузер и перейдите на: `http://localhost:3000/course/{course_id}`
   Например: `http://localhost:3000/course/testmessages`

2. Если курс не найден, отобразится сообщение об ошибке

3. Если курс найден:
   - Автоматически создается сессия (`run`)
   - Отображается первый элемент курса
   - При нажатии кнопки "Далее" или автоматически (если кнопка не указана) происходит переход к следующему элементу

## API Endpoints

### `GET /api/mvp/courses/{course_id}`
Проверка существования курса

### `GET /api/mvp/courses/{course_id}/current`
Получение текущего элемента курса

### `POST /api/mvp/courses/{course_id}/start`
Начало курса (создание сессии)

### `POST /api/mvp/courses/{course_id}/next`
Переход к следующему элементу

## Структура файлов

### Backend
- `webapp/backend/app/api/v1/mvp.py` - упрощенный API роутер для MVP

### Frontend
- `webapp/frontend/app/course/[courseId]/page.tsx` - страница курса
- `webapp/frontend/app/course/layout.tsx` - layout для страниц курса
- `webapp/frontend/components/steps/MessageStepMVP.tsx` - компонент для отображения элементов message

## Идентификация пользователей

Для MVP используется `chat_id` (BIGINT), который:
- Генерируется автоматически при первом посещении
- Сохраняется в cookies браузера
- Используется для всех запросов к API

## База данных

Используются существующие таблицы из Telegram бота:
- `run` - сессии прохождения курса
- `conversation` - история взаимодействий

Текущий элемент определяется как последняя запись в `conversation` для пользователя и курса.

## Ограничения MVP

- ❌ Нет аутентификации
- ❌ Нет списка курсов
- ❌ Нет медиа файлов
- ❌ Только элементы типа `message`
- ❌ Нет навигации назад

## Тестирование

Для тестирования используйте тестовый курс `testmessages`:
```
http://localhost:3000/course/testmessages
```

Убедитесь, что курс существует в `scripts/courses.yml` и файл `scripts/test_messages.yml` содержит элементы типа `message`.
