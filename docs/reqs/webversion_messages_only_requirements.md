# Требования для Web-версии чатбота (MVP - только элементы Message)

**Версия:** 2.0 (MVP)  
**Дата:** 2024  
**Статус:** Проектирование MVP  
**Базовые документы:** 
- `docs/telegram_progress_saving.md` - документация о сохранении прогресса в Telegram боте

---

## ⚠️ Важное примечание о совместимости

**Веб-версия полностью совместима с Telegram ботом по структуре данных:**

- ✅ Использует те же таблицы: `run` и `conversation`
- ✅ Тот же подход к сохранению прогресса: текущий элемент = последняя запись в `conversation`
- ✅ Пользователь может начать курс в Telegram и продолжить в веб-версии (и наоборот)
- ✅ Общая история взаимодействий для обеих платформ

**См. документацию:** `docs/telegram_progress_saving.md`

---

## 1. Цель MVP

Создать максимально простую веб-версию чатбота для прохождения курсов с элементами типа `message` (только текст, без медиа). MVP должен быть простым, быстрым в реализации и полностью совместимым с Telegram ботом по структуре данных.

---

## 2. Ограничения MVP

**Что поддерживается:**
- ✅ Элементы типа `message` с текстом (Markdown/HTML форматирование)
- ✅ Кнопка "Далее" для перехода к следующему элементу
- ✅ Автоматический переход, если кнопка не указана
- ✅ Сохранение прогресса через таблицы `run` и `conversation` (как в Telegram боте)
- ✅ Прямой доступ по URL с `course_id`

**Что НЕ поддерживается в MVP:**
- ❌ Медиа файлы (изображения, видео)
- ❌ Навигация по списку курсов
- ❌ Аутентификация пользователей
- ❌ Регистрация/вход
- ❌ Поиск курсов
- ❌ Другие типы элементов (quiz, input, dialog и т.д.)

---

## 3. Функциональные требования

### 3.1 Доступ к курсу

#### FR-1: Прямой доступ по URL
**Приоритет:** Критический

**Описание:** Пользователь получает доступ к курсу через URL с указанием `course_id`.

**Требования:**
- URL формат: `/course/{course_id}`
- Если `course_id` не указан или не существует → отображается страница с сообщением:
  ```
  Для доступа к курсу необходим специальный URL.
  Обратитесь к организатору курса для получения ссылки.
  ```
- Если курс существует → отображение курса

**UI:**
- Простая страница с текстом сообщения (если курс не найден)
- Страница курса с отображением элементов (если курс найден)

**API endpoints:**
- `GET /api/courses/{course_id}` - проверка существования курса
- `GET /api/courses/{course_id}/current` - получение текущего элемента

---

### 3.2 Отображение элементов Message

#### FR-2: Отображение элемента Message
**Приоритет:** Критический

**Описание:** Отображение текстового сообщения с опциональной кнопкой.

**Требования:**

**Отображение текста:**
- Поддержка Markdown форматирования (по умолчанию)
- Поддержка HTML форматирования (если указан `parse_mode: HTML`)
- Рендеринг HTML тегов: `<b>`, `<i>`, `<u>`, `<code>`, `<pre>`, `<p>`, `<br>`, `<tg-spoiler>`, `<a>`
- Санитизация HTML для безопасности (DOMPurify)

**Кнопка продолжения:**
- Если указан `button`, отображать кнопку с указанным текстом
- При клике на кнопку → переход к следующему элементу
- Если `button` не указан → автоматический переход через 2-3 секунды

**UI компоненты:**
- Компонент `MessageStep` для отображения сообщения
- Компонент `MessageText` для рендеринга текста (Markdown/HTML)
- Компонент `ContinueButton` для кнопки продолжения

**API endpoints:**
- `GET /api/courses/{course_id}/current` - получение текущего элемента
- `POST /api/courses/{course_id}/next` - переход к следующему элементу

**Backend логика:**
- Получение текущего элемента из `conversation` (последняя запись)
- Сохранение взаимодействия в `conversation` при нажатии кнопки
- Сохранение следующего элемента в `conversation` при переходе

---

### 3.3 Сохранение прогресса

#### FR-3: Сохранение прогресса (как в Telegram боте)
**Приоритет:** Критический

**Описание:** Сохранение прогресса через таблицы `run` и `conversation` (полная совместимость с Telegram ботом).

**Требования:**
- Использование таблицы `run` для сессий прохождения курса
- Использование таблицы `conversation` для истории взаимодействий
- Текущий элемент определяется как последняя запись в `conversation`
- Каждое взаимодействие сохраняется как отдельная запись
- Идентификация пользователя через `chat_id` (используется session ID или IP-based ID для анонимных пользователей)

**Backend логика:**
- При первом открытии курса: создание записи в `run` (если нет активной сессии)
- При отправке элемента ботом: сохранение в `conversation` с `role='bot'`
- При действии пользователя: сохранение в `conversation` с `role='user'`
- Получение текущего элемента: `SELECT * FROM conversation WHERE chat_id=? AND course_id=? ORDER BY conversation_id DESC LIMIT 1`

**Идентификация пользователя:**
- Для MVP используется `chat_id` (BIGINT)
- Генерируется на основе session ID или IP-адреса
- Хранится в cookies или localStorage браузера

---

## 4. User Flow

### 4.1 Прохождение курса

```
1. Пользователь открывает URL: /course/{course_id}
   ↓
2. Система проверяет существование курса
   - Если курс не найден → страница с сообщением об ошибке
   - Если курс найден → продолжение
   ↓
3. Система получает или создает идентификатор пользователя (chat_id)
   - Генерация на основе session ID или IP
   - Сохранение в cookies/localStorage
   ↓
4. Система проверяет наличие активной сессии (run):
   - Если есть активная сессия (is_ended=FALSE) → получает текущий элемент из conversation
   - Если нет активной сессии → создает новую (run) и получает первый элемент курса
   ↓
5. Система получает текущий элемент:
   - SELECT * FROM conversation WHERE chat_id=? AND course_id=? AND run_id=?
     ORDER BY conversation_id DESC LIMIT 1
   - Если записей нет → получает первый элемент курса из YAML
   ↓
6. Отображение элемента:
   - Текст с форматированием (Markdown/HTML)
   - Кнопка "Далее" (если указана) или авто-переход через 2-3 сек
   ↓
7. Пользователь взаимодействует (нажимает кнопку или происходит авто-переход)
   ↓
8. Система сохраняет взаимодействие в conversation:
   - INSERT INTO conversation (chat_id, course_id, element_id, role='user',
                              report='Нажата кнопка', run_id, ...)
   ↓
9. Система получает следующий элемент курса из YAML
   ↓
10. Система отправляет элемент и сохраняет в conversation:
    - INSERT INTO conversation (chat_id, course_id, element_id, role='bot',
                               report=text, json=element_data, run_id, ...)
    ↓
11. Автоматический переход к следующему элементу (отображение следующего элемента)
    ↓
12. Повтор шагов 7-11 для следующих элементов
    ↓
13. Когда курс завершен (нет следующего элемента):
    - UPDATE run SET is_ended = TRUE WHERE run_id = ?
    - Отображение сообщения о завершении курса
```

---

## 5. UI/UX

### 5.1 Структура страницы

**Страница: Курс не найден (`/course` или неверный `course_id`)**

**Компоненты:**
- Простой текст: "Для доступа к курсу необходим специальный URL. Обратитесь к организатору курса для получения ссылки."

**Страница: Курс (`/course/{course_id}`)**

**Компоненты:**
- `MessageStep` - основной компонент для отображения элемента
- `MessageText` - текст сообщения с форматированием
- `ContinueButton` - кнопка "Далее" (если требуется)

**Layout:**
- Простой одностраничный layout
- Центрированный контент
- Адаптивный дизайн (mobile-first)

### 5.2 Компонент MessageStep

**Структура:**
- Контейнер сообщения
- Текст сообщения с поддержкой Markdown/HTML
- Кнопка "Далее" (если указана)

**Поведение:**
- Рендеринг Markdown/HTML контента с санитизацией
- При клике на "Далее" → отправка запроса на переход к следующему элементу
- Если кнопка не требуется → автоматический переход через 2-3 секунды

**Состояния:**
- `loading` - загрузка элемента
- `ready` - элемент готов к отображению
- `transitioning` - переход к следующему элементу

### 5.3 Адаптивность

**Mobile-first подход:**
- Простой одностраничный layout
- Читаемый текст на всех устройствах
- Кнопка удобного размера для touch-взаимодействия

---

## 6. Технические требования

### 6.1 Архитектура

**Frontend (Next.js 14 + TypeScript):**
- **Framework:** Next.js 14 с App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS или простой CSS
- **Markdown Renderer:** react-markdown
- **HTML Renderer:** DOMPurify для санитизации HTML

**Backend (Python + FastAPI):**
- **Framework:** FastAPI
- **Language:** Python 3.12+
- **Database:** PostgreSQL
- **YAML Parser:** PyYAML

**Database (PostgreSQL):**
- Использует существующие таблицы из Telegram бота:
  - `run` - сессии прохождения курса
  - `conversation` - история взаимодействий

### 6.2 API Endpoints

**Курсы:**
- `GET /api/courses/{course_id}` - проверка существования курса
- `GET /api/courses/{course_id}/current` - получение текущего элемента
- `POST /api/courses/{course_id}/start` - начать курс (создать run)
- `POST /api/courses/{course_id}/next` - перейти к следующему элементу

### 6.3 Database Schema

**Используются существующие таблицы из Telegram бота:**

#### Run (Сессия прохождения курса)
- `run_id` (SERIAL, PK)
- `chat_id` (BIGINT) - идентификатор пользователя (генерируется для веб-версии)
- `username` (TEXT) - имя пользователя (опционально)
- `botname` (TEXT) - имя бота
- `course_id` (VARCHAR) - курс
- `date_inserted` (TIMESTAMP)
- `is_ended` (BOOLEAN)

#### Conversation (История взаимодействий)
- `conversation_id` (SERIAL, PK)
- `chat_id` (BIGINT) - идентификатор пользователя
- `username` (TEXT)
- `course_id` (VARCHAR)
- `element_id` (VARCHAR) - идентификатор элемента
- `element_type` (VARCHAR) - тип элемента ('message')
- `role` (VARCHAR) - 'bot' или 'user'
- `json` (TEXT) - JSON-строка с данными элемента
- `report` (TEXT) - текст сообщения или действия
- `score` (FLOAT, NULL)
- `maxscore` (FLOAT, NULL)
- `date_inserted` (TIMESTAMP)
- `run_id` (INTEGER, FK → Run)

**Индексы:**
```sql
CREATE INDEX idx_conversation_chat_course_run ON conversation(chat_id, course_id, run_id);
CREATE INDEX idx_conversation_conversation_id_desc ON conversation(conversation_id DESC);
CREATE INDEX idx_run_chat_course ON run(chat_id, course_id) WHERE is_ended = FALSE;
```

### 6.4 Идентификация пользователя

**Для MVP (без аутентификации):**

**Вариант 1: Session-based ID**
- Генерация уникального `chat_id` при первом посещении
- Сохранение в cookies или localStorage
- Использование этого ID для всех запросов

**Вариант 2: IP-based ID**
- Генерация `chat_id` на основе IP-адреса и User-Agent
- Хеширование для конфиденциальности
- Менее надежно, но проще

**Рекомендация:** Использовать Session-based ID с сохранением в cookies.

### 6.5 Загрузка курсов

**Курсы загружаются из YAML файлов:**
- Путь к файлам: `scripts/{BOT_FOLDER}/{course_id}.yml`
- Парсинг через PyYAML
- Валидация: проверка, что все элементы имеют тип `message`
- Если найдены элементы других типов → курс не загружается или пропускаются такие элементы

---

## 7. Примеры реализации

### 7.1 Получение текущего элемента

```python
# Backend (FastAPI)
@router.get("/courses/{course_id}/current")
async def get_current_element(course_id: str, chat_id: int):
    # Получение активной сессии
    run = db.get_active_run(chat_id, course_id)
    if not run:
        # Создание новой сессии
        run_id = db.create_run(course_id, chat_id, username=None)
        # Получение первого элемента курса
        element = get_first_element(course_id)
        # Сохранение в conversation
        db.insert_conversation(chat_id, course_id, element.id, 'bot', 
                              element.text, element.data, run_id)
        return element
    
    # Получение последней записи из conversation
    last_conversation = db.get_last_conversation(chat_id, course_id, run.run_id)
    if last_conversation:
        element_data = json.loads(last_conversation['json'])
        return {
            'element_id': last_conversation['element_id'],
            'text': element_data['element_data']['text'],
            'button': element_data['element_data'].get('button'),
            'parse_mode': element_data['element_data'].get('parse_mode', 'MARKDOWN')
        }
    
    # Если записей нет, получить первый элемент
    element = get_first_element(course_id)
    return element
```

### 7.2 Переход к следующему элементу

```python
# Backend (FastAPI)
@router.post("/courses/{course_id}/next")
async def next_element(course_id: str, chat_id: int):
    # Получение активной сессии
    run = db.get_active_run(chat_id, course_id)
    if not run:
        return {"error": "No active session"}
    
    # Сохранение действия пользователя
    db.insert_conversation(chat_id, course_id, 'current', 'user', 
                          'Нажата кнопка', None, run.run_id)
    
    # Получение текущего элемента
    current = db.get_last_conversation(chat_id, course_id, run.run_id)
    current_element_id = current['element_id']
    
    # Получение следующего элемента из YAML
    next_element = get_next_element(course_id, current_element_id)
    if not next_element:
        # Курс завершен
        db.set_course_ended(run.run_id)
        return {"completed": True}
    
    # Сохранение следующего элемента
    db.insert_conversation(chat_id, course_id, next_element.id, 'bot',
                          next_element.text, next_element.data, run.run_id)
    
    return {
        'element_id': next_element.id,
        'text': next_element.text,
        'button': next_element.button,
        'parse_mode': next_element.parse_mode
    }
```

---

## 8. Ограничения MVP

### 8.1 Что НЕ входит в MVP

- ❌ Аутентификация и регистрация пользователей
- ❌ Список курсов и навигация
- ❌ Медиа файлы (изображения, видео)
- ❌ Поиск курсов
- ❌ Профиль пользователя
- ❌ Статистика и аналитика
- ❌ Адаптация для разных устройств (только базовый responsive)

### 8.2 Будущие улучшения

**Фаза 2:**
- Добавление медиа файлов
- Улучшение UI/UX

**Фаза 3:**
- Аутентификация пользователей
- Список курсов

**Фаза 4:**
- Другие типы элементов (quiz, input и т.д.)

---

## 9. Связанные документы

- `docs/telegram_progress_saving.md` - документация о сохранении прогресса в Telegram боте
- `docs/elements.md` - документация по типам элементов
- `docs/database.md` - документация по базе данных

---

**Конец документа**
