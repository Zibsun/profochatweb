# Как работает страница /courses

Документ описывает фактическое поведение текущей реализации страницы `GET /courses` во фронтенде (`webapp/frontend`) и связанных API роутов Next.js (`webapp/frontend/app/api/...`).

## Назначение страницы
Страница **Courses** — это список курсов аккаунта и базовые операции над ними:
- открыть курс в course editor;
- создать новый курс (через course editor);
- дублировать курс (создать копию со всеми элементами);
- удалить курс (с проверкой зависимостей);

## URL и навигация
- Основная страница: `GET /courses` (рендерит компонент `CoursesList`)
- Переход на редактирование курса: `GET /course-editor/<course_code>`
- Кнопка создания курса ведёт на: `GET /course-editor`
- Роут `GET /courses/[courseId]` **не открывает детали**: он делает redirect на MVP‑маршрут `GET /course/<courseId>` (см. `webapp/frontend/app/courses/[courseId]/page.tsx`).

## Источник данных (что именно загружается)
Компонент `CoursesList` (`webapp/frontend/components/courses/CoursesList.tsx`) при загрузке делает запрос:
- `GET /api/v1/courses`

Ответ содержит массив курсов в формате:
- `course_id` (INT) — внутренний id из БД
- `course_code` (TEXT) — внешний идентификатор (используется в URL)
- `title`, `description` (опционально)
- `bots: [{ bot_id, bot_name, display_name? }, ...]`

### Откуда берётся “Connected Bots”
`GET /api/v1/courses` для каждого курса получает список “подключённых ботов” через таблицу **`course_deployment`** (legacy‑модель): выбирает уникальные `bot` из `course_deployment` по `course_id` и `account_id`.

> Примечание: в документах требований есть план показывать ботов через **Groups**, но текущая реализация страницы `/courses` использует именно `course_deployment`.

## UI структура страницы
Страница рендерится как таблица (или пустое состояние) с хедером.

### Header
- Заголовок: **Courses**
- Подзаголовок: **Manage your courses**
- Кнопки справа:
  - **Refresh** — повторно загружает список (`GET /api/v1/courses`)
  - **Create Course** — ссылка на `/course-editor`

### Таблица курсов
Колонки:
- **Course Title**
  - кликабельная ссылка на `/course-editor/<course_code>`
  - tooltip: “Click to edit course”
- **Actions**
  - **Duplicate** (иконка Copy)
  - **Delete** (иконка Trash)

### Пустое состояние
Если курсов нет:
- текст “No courses yet. Create your first course to get started.”
- кнопка **Create Course** → `/course-editor`

## Сценарии и поведение

### 1) Загрузка списка
При открытии `/courses`:
1. UI показывает “Loading courses…”
2. Выполняется `GET /api/v1/courses`
3. На успех — отображается таблица/пустое состояние.
4. На ошибку — показывается экран ошибки с кнопкой **Retry** (повторный запрос).

### 2) Дублирование курса (Duplicate)
При нажатии на Duplicate:
- `POST /api/v1/courses/<course_code>/duplicate`

На успех:
- toast “Course duplicated”
- редирект на `/course-editor/<new_course_code>` (приходит из ответа `data.course_code`)

Что делает сервер:
- берёт курс из БД по `course_code`
- читает все элементы курса
- создаёт новый курс с суффиксом:
  - `<course_code> (Copy)` или `<course_code> (Copy N)` если занято
- копирует метаданные/элементы
- возвращает `201` с новым `course_code`

### 3) Удаление курса (Delete)
Нажатие на Delete сначала открывает модалку подтверждения:
- Заголовок: “Delete Course”
- Текст: “Are you sure you want to delete this course? This action cannot be undone.”
- Кнопки: Cancel / Delete

При подтверждении:
- `DELETE /api/v1/courses/<course_code>`

Если сервер отвечает **400** (курс нельзя удалить из-за подключений):
- UI показывает модалку ошибки “Cannot Delete Course”
- в тексте — сообщение сервера

Если удаление успешно:
- toast “Course deleted”
- список перезагружается (`GET /api/v1/courses`)

Что проверяет сервер перед удалением:
- наличие записей в **`course_deployment`** для курса (deployments).
  - если deployments есть — удаление запрещается и возвращается список имён ботов
  - если нет — удаляются `course_element`, затем `course`

## Список задействованных API endpoints
- `GET /api/v1/courses` — список курсов + подключенные боты (через `course_deployment`)
- `DELETE /api/v1/courses/<course_code>` — удалить курс (с проверкой deployments)
- `POST /api/v1/courses/<course_code>/duplicate` — создать копию курса со всеми элементами

## Связанные файлы реализации
- `webapp/frontend/app/courses/page.tsx` — страница `/courses`
- `webapp/frontend/components/courses/CoursesList.tsx` — UI и логика
- `webapp/frontend/app/api/v1/courses/route.ts` — выдача списка курсов
- `webapp/frontend/app/api/v1/courses/[courseId]/route.ts` — удаление курса
- `webapp/frontend/app/api/v1/courses/[courseId]/duplicate/route.ts` — дублирование курса

