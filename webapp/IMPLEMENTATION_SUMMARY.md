# Сводка реализации MVP

## Что реализовано

### Backend (FastAPI)

1. **Упрощенный API роутер** (`webapp/backend/app/api/v1/mvp.py`)
   - `GET /api/mvp/courses/{course_id}` - проверка существования курса
   - `GET /api/mvp/courses/{course_id}/current` - получение текущего элемента
   - `POST /api/mvp/courses/{course_id}/start` - начало курса (создание run)
   - `POST /api/mvp/courses/{course_id}/next` - переход к следующему элементу

2. **Работа с базой данных**
   - Использует существующие функции из `db.py`:
     - `create_run()` - создание сессии
     - `get_run_id()` - получение активной сессии
     - `insert_element()` - сохранение в conversation
     - `get_current_element()` - получение текущего элемента
     - `set_course_ended()` - завершение курса

3. **Работа с курсами**
   - Использует класс `Course` из `course.py`
   - Загружает курсы из YAML файлов
   - Фильтрует только элементы типа `message`

4. **Идентификация пользователей**
   - Генерация `chat_id` для анонимных пользователей
   - Сохранение `chat_id` в cookies
   - Использование `chat_id` для всех операций с БД

### Frontend (Next.js)

1. **Страница курса** (`webapp/frontend/app/course/[courseId]/page.tsx`)
   - Прямой доступ по URL `/course/{courseId}`
   - Проверка существования курса
   - Загрузка и отображение текущего элемента
   - Обработка ошибок и завершения курса

2. **Компонент MessageStep** (`webapp/frontend/components/steps/MessageStepMVP.tsx`)
   - Отображение текста с поддержкой Markdown/HTML
   - Санитизация HTML через DOMPurify
   - Поддержка тега `tg-spoiler` (преобразуется в `<details>`)
   - Кнопка "Далее" или автоматический переход
   - Адаптивный дизайн

3. **Страница "Курс не найден"** (`webapp/frontend/app/course/page.tsx`)
   - Отображается при отсутствии courseId в URL

## Структура файлов

```
webapp/
├── backend/
│   └── app/
│       ├── main.py                    # Добавлен роутер mvp
│       └── api/
│           └── v1/
│               └── mvp.py            # MVP API роутер
│
├── frontend/
│   └── app/
│       └── course/
│           ├── [courseId]/
│           │   └── page.tsx          # Страница курса
│           ├── layout.tsx            # Layout для курсов
│           └── page.tsx              # Страница "курс не указан"
│   └── components/
│       └── steps/
│           └── MessageStepMVP.tsx    # Компонент элемента message
│
├── MVP_README.md                      # Документация MVP
└── QUICK_START_MVP.md                 # Инструкция по запуску
```

## Зависимости

### Backend
- Использует существующие зависимости из `requirements.txt`
- Импортирует модули Telegram бота (`db.py`, `course.py`, `globals.py`)

### Frontend
- `react-markdown` - для рендеринга Markdown
- `isomorphic-dompurify` - для санитизации HTML
- Остальные зависимости уже установлены

## Как запустить

1. **Backend:**
```bash
cd webapp/backend
export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."
uvicorn app.main:app --reload --port 8000
```

2. **Frontend:**
```bash
cd webapp/frontend
npm install react-markdown isomorphic-dompurify
npm run dev
```

3. **Открыть в браузере:**
```
http://localhost:3000/course/testmessages
```

## Тестирование

Тестовый курс `testmessages` содержит 3 элемента типа `message`:
- `Test_Message_01` - с кнопкой "Далее"
- `Test_Message_02` - с кнопкой "Продолжить"
- `Test_Message_03` - с кнопкой "Завершить"

Курс уже добавлен в `scripts/courses.yml`.

## Совместимость с Telegram ботом

✅ Использует те же таблицы БД (`run`, `conversation`)
✅ Тот же подход к сохранению прогресса
✅ Пользователь может начать курс в Telegram и продолжить в веб-версии
✅ Общая история взаимодействий

## Известные ограничения

- Работает только с элементами типа `message` (без медиа)
- Нет аутентификации (анонимный доступ)
- Нет списка курсов (только прямой доступ по URL)
- Простой UI без дополнительных функций

## Следующие шаги

1. Установить зависимости frontend: `npm install react-markdown isomorphic-dompurify`
2. Настроить `.env` файлы для backend и frontend
3. Запустить backend и frontend
4. Протестировать на курсе `testmessages`
