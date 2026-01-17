# Документация по базе данных

## Обзор

Приложение использует PostgreSQL в качестве базы данных для хранения информации о курсах, пользователях, сессиях прохождения курсов и истории взаимодействий.

**Архитектура:** База данных использует мультитенантную SaaS архитектуру, где все данные изолированы по аккаунтам (`account_id`). Каждый аккаунт может иметь несколько ботов, курсов и пользователей.

## Мультитенантная архитектура (SaaS)

База данных поддерживает мультитенантность через систему аккаунтов:

- **Аккаунты (`account`)** - верхний уровень изоляции данных
- **Участники аккаунта (`account_member`)** - пользователи, принадлежащие аккаунту
- **Боты (`bot`)** - Telegram боты, принадлежащие аккаунту
- **Курсы (`course`)** - уникальны в рамках аккаунта (`course_id`, `account_id`)
- **Деплойменты (`course_deployment`)** - связь курсов с ботами в рамках аккаунта

Все основные таблицы содержат поле `account_id` для изоляции данных между аккаунтами.

## Подключение к базе данных

### Конфигурация

Подключение к базе данных настраивается через переменную окружения `DATABASE_URL`, которая должна быть определена в файле `.env` или в системных переменных окружения.

**Формат DATABASE_URL:**
```
postgresql://username:password@host:port/database_name
```

**Пример файла `.env`:**
```env
# Подключение к базе данных PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot

# Токен Telegram бота
BOT_API_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Имя бота (опционально, используется для мультиботовой архитектуры)
# Если не указано, определяется автоматически из BOT_API_TOKEN
BOT_NAME=my_bot_name
```

**Важные переменные окружения:**
- `DATABASE_URL` (обязательно) - строка подключения к PostgreSQL
- `BOT_API_TOKEN` (обязательно) - токен Telegram бота
- `BOT_NAME` (опционально) - имя бота для мультиботовой архитектуры

**Загрузка переменных окружения:**
Приложение использует библиотеку `python-dotenv` для загрузки переменных из файла `.env`:

```python
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
```

Если файл `.env` отсутствует, используются системные переменные окружения.

### Инициализация подключения

В модуле `db.py` определены функции для работы с базой данных:

```python
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_connection():
    return psycopg2.connect(DATABASE_URL)
```

Каждая функция, работающая с БД, создает новое подключение через `get_connection()` и закрывает его после выполнения операции. Это простое, но не самое эффективное решение для высоконагруженных приложений.

**Альтернативные подключения:**
- В `api.py` используется функция `get_db_connection()` для FastAPI endpoints
- В `webreport.py` также есть своя реализация `get_db_connection()` для Flask приложения

## Структура базы данных

### Таблица `account`

Центральная таблица для мультитенантной архитектуры. Представляет организацию или клиента.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `account_id` | int4 (PK, AUTO) | Уникальный идентификатор аккаунта |
| `name` | text | Название аккаунта |
| `slug` | text (UNIQUE) | URL-friendly идентификатор аккаунта |
| `plan` | text | Тарифный план (по умолчанию 'free') |
| `created_at` | timestamp | Дата создания аккаунта |
| `updated_at` | timestamp | Дата последнего обновления |
| `is_active` | boolean | Флаг активности аккаунта |
| `settings` | jsonb | Дополнительные настройки аккаунта |

**Назначение:**
- Изоляция данных между клиентами
- Управление тарифными планами
- Хранение настроек на уровне аккаунта

**Особенности:**
- При миграции создается аккаунт по умолчанию с `account_id = 1`
- Все существующие данные автоматически привязываются к аккаунту по умолчанию

### Таблица `account_member`

Таблица для управления участниками аккаунта.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `account_member_id` | int4 (PK, AUTO) | Уникальный идентификатор |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта |
| `telegram_user_id` | int8 | Telegram user ID участника |
| `telegram_username` | text | Telegram username участника |
| `role` | text | Роль участника (по умолчанию 'member') |
| `created_at` | timestamp | Дата добавления участника |
| `last_login_at` | timestamp | Дата последнего входа |
| `is_active` | boolean | Флаг активности участника |

**Уникальные ограничения:**
- `(account_id, telegram_user_id)` - один пользователь может быть участником аккаунта только один раз

**Назначение:**
- Управление доступом пользователей к аккаунту
- Контроль ролей и прав доступа
- Отслеживание активности участников

### Таблица `bot`

Таблица для управления Telegram ботами на уровне аккаунта.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `bot_id` | int4 (PK, AUTO) | Уникальный идентификатор бота |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта |
| `bot_name` | text | Имя бота (уникально в рамках аккаунта) |
| `bot_token` | text (UNIQUE) | Telegram bot token |
| `display_name` | text | Отображаемое имя бота |
| `description` | text | Описание бота |
| `created_at` | timestamp | Дата создания записи |
| `updated_at` | timestamp | Дата последнего обновления |
| `is_active` | boolean | Флаг активности бота |
| `settings` | jsonb | Дополнительные настройки бота |

**Уникальные ограничения:**
- `(account_id, bot_name)` - имя бота уникально в рамках аккаунта
- `bot_token` - токен бота уникален глобально

**Назначение:**
- Централизованное управление ботами
- Изоляция ботов по аккаунтам
- Хранение токенов и настроек ботов

**Миграция:**
- При миграции существующие боты из `run.botname` и `course.bot_name` автоматически создаются в этой таблице
- Токены ботов устанавливаются как временные (`temp_<bot_name>_<hash>`) и требуют ручного обновления

### Таблица `course_deployment`

Таблица для связи курсов с ботами (деплойменты).

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `deployment_id` | int4 (PK, AUTO) | Уникальный идентификатор деплоймента |
| `course_id` | text | Идентификатор курса |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта |
| `bot_id` | int4 (FK → bot) | Идентификатор бота |
| `environment` | text | Окружение (по умолчанию 'prod') |
| `is_active` | boolean | Флаг активности деплоймента |
| `created_at` | timestamp | Дата создания деплоймента |
| `updated_at` | timestamp | Дата последнего обновления |
| `settings` | jsonb | Дополнительные настройки деплоймента |

**Уникальные ограничения:**
- `(bot_id, course_id, account_id, environment)` - один курс может быть развернут на одном боте в одном окружении только один раз

**Назначение:**
- Связь курсов с ботами
- Поддержка разных окружений (prod, staging, dev)
- Управление активностью деплойментов

**Особенности:**
- Один курс может быть развернут на нескольких ботах
- Один бот может иметь несколько курсов
- Поддержка разных окружений позволяет тестировать курсы перед продакшеном

### Таблица `enrollment_token`

Таблица для управления токенами доступа к курсам.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `token_id` | int4 (PK, AUTO) | Уникальный идентификатор токена |
| `deployment_id` | int4 (FK → course_deployment) | Идентификатор деплоймента |
| `token` | text (UNIQUE) | Токен доступа (уникален глобально) |
| `token_type` | text | Тип токена (по умолчанию 'public') |
| `max_uses` | int4 | Максимальное количество использований (NULL = без ограничений) |
| `current_uses` | int4 | Текущее количество использований |
| `expires_at` | timestamp | Дата истечения токена (NULL = без ограничений) |
| `created_at` | timestamp | Дата создания токена |
| `created_by` | int8 | Telegram user ID создателя токена |
| `is_active` | boolean | Флаг активности токена |
| `metadata` | jsonb | Дополнительные метаданные |

**Назначение:**
- Управление доступом к курсам через токены
- Ограничение количества использований
- Контроль срока действия токенов
- Поддержка приватных и публичных курсов

### Таблица `conversation`

Основная таблица для хранения истории взаимодействий пользователей с элементами курсов.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `conversation_id` | int4 (PK, AUTO) | Уникальный идентификатор записи |
| `chat_id` | int8 | Telegram chat ID пользователя |
| `username` | text | Имя пользователя в Telegram |
| `course_id` | text | Идентификатор курса |
| `element_id` | text | Идентификатор элемента курса (например, "Ex1_2") |
| `element_type` | text | Тип элемента (message, question, quiz, test, и т.д.) |
| `role` | text | Роль в диалоге: "user" или "assistant" |
| `json` | text | JSON-строка с данными элемента |
| `report` | text | Текст отчета/ответа пользователя |
| `score` | float4 | Полученный балл (NULL если не оценивается) |
| `maxscore` | float4 | Максимальный балл (NULL если не оценивается) |
| `date_inserted` | timestamp | Дата и время создания записи (по умолчанию CURRENT_TIMESTAMP) |
| `run_id` | int4 | Ссылка на сессию прохождения курса (FK → run.run_id) |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |

**Назначение:**
- Хранение всех сообщений и ответов пользователей
- Сохранение состояния элементов курса
- Отслеживание прогресса пользователя
- Хранение результатов тестов и квизов

**Ключевые операции:**
- `insert_element()` - добавление нового элемента в историю
- `get_current_element()` - получение текущего элемента для пользователя
- `get_last_element_of()` - получение последнего вхождения конкретного элемента
- `get_revision_mistakes()` - получение ошибок для повторения
- `get_revision_elements()` - получение элементов для повторения

### Таблица `run`

Таблица для отслеживания сессий прохождения курсов пользователями.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `run_id` | int4 (PK, AUTO) | Уникальный идентификатор сессии |
| `chat_id` | int8 | Telegram chat ID пользователя |
| `username` | text | Имя пользователя в Telegram |
| `botname` | text | Имя бота (устаревшее, используйте `bot_id`) |
| `bot_id` | int4 (FK → bot) | Идентификатор бота (добавлено в SaaS миграции) |
| `course_id` | text | Идентификатор курса |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |
| `deployment_id` | int4 (FK → course_deployment) | Идентификатор деплоймента (добавлено в SaaS миграции) |
| `token_id` | int4 (FK → enrollment_token) | Идентификатор токена доступа (добавлено в SaaS миграции) |
| `date_inserted` | timestamp | Дата и время начала сессии (по умолчанию CURRENT_TIMESTAMP) |
| `utm_source` | text | UTM метка источника (опционально) |
| `utm_medium` | text | UTM метка медиума (опционально, добавлено в SaaS миграции) |
| `utm_campaign` | text | UTM метка кампании (опционально) |
| `is_ended` | bool | Флаг завершения курса (NULL по умолчанию) |
| `ended_at` | timestamp | Дата и время завершения курса (добавлено в SaaS миграции) |
| `is_active` | boolean | Флаг активности сессии (добавлено в SaaS миграции) |

**Назначение:**
- Отслеживание начала и завершения прохождения курса
- Связывание всех взаимодействий в рамках одной сессии
- Хранение UTM меток для аналитики
- Поддержка мультиботовой архитектуры через поле `botname`

**Ключевые операции:**
- `create_run()` - создание новой сессии прохождения курса
- `get_run_id()` - получение ID сессии по chat_id и course_id
- `set_course_ended()` - отметка курса как завершенного
- `is_course_ended()` - проверка завершения курса

### Таблица `waiting_element`

Таблица для управления элементами с задержкой (delay elements).

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `waiting_element_id` | int4 (PK, AUTO) | Уникальный идентификатор |
| `chat_id` | int8 | Telegram chat ID пользователя |
| `waiting_till_date` | timestamp | Дата и время, до которого нужно ждать |
| `is_waiting` | bool | Флаг активности ожидания |
| `element_id` | text | Идентификатор элемента, который ожидается |
| `course_id` | text | Идентификатор курса |
| `botname` | text | Имя бота (устаревшее, используйте `bot_id`) |
| `bot_id` | int4 (FK → bot) | Идентификатор бота (добавлено в SaaS миграции) |
| `run_id` | int4 (FK → run) | Идентификатор сессии (добавлено в SaaS миграции) |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |

**Назначение:**
- Управление элементами с задержкой отправки
- Планирование отправки сообщений в будущем
- Интеграция с APScheduler для проверки активных ожиданий

**Ключевые операции:**
- `add_waiting_element()` - добавление элемента в очередь ожидания
- `get_active_waiting_elements()` - получение элементов, время ожидания которых истекло
- `set_is_waiting_false()` - деактивация элемента ожидания

**Механизм работы:**
1. При создании delay-элемента вызывается `add_waiting_element()`
2. Планировщик (APScheduler) периодически вызывает `get_active_waiting_elements()`
3. Для каждого активного элемента вызывается `continue_chat()` для продолжения диалога
4. После обработки элемент деактивируется через `set_is_waiting_false()`

### Таблица `course`

Таблица для хранения метаданных курсов.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `course_id` | text (PK) | Идентификатор курса |
| `bot_name` | text | Имя бота (устаревшее, используйте `course_deployment`) |
| `account_id` | int4 (FK → account, PK) | Идентификатор аккаунта (составной первичный ключ) |
| `creator_id` | int8 | Telegram chat ID создателя курса |
| `date_created` | timestamp | Дата создания курса (по умолчанию CURRENT_TIMESTAMP) |
| `yaml` | text | YAML-представление курса (опционально) |
| `title` | text | Название курса (добавлено в SaaS миграции) |
| `description` | text | Описание курса (добавлено в SaaS миграции) |
| `updated_at` | timestamp | Дата последнего обновления (добавлено в SaaS миграции) |
| `metadata` | jsonb | Дополнительные метаданные курса (добавлено в SaaS миграции) |
| `is_active` | boolean | Флаг активности курса (добавлено в SaaS миграции) |

**Уникальные ограничения:**
- `(course_id, account_id)` - курс уникален в рамках аккаунта

**Индексы:**
- `idx_course_account` на `(account_id)`
- `idx_course_active` на `(account_id, is_active)`
- `idx_course_created` на `(account_id, date_created DESC)`

**Назначение:**
- Хранение метаданных курсов
- Поддержка курсов, хранящихся в БД (в отличие от YAML файлов)
- Отслеживание создателей курсов

**Ключевые операции:**
- `get_course_info()` - получение информации о курсе
- `add_replace_course()` - добавление или замена курса

### Таблица `course_element`

Таблица для хранения элементов курсов, хранящихся в базе данных.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `course_element_id` | int8 (PK, AUTO) | Уникальный идентификатор элемента |
| `element_id` | text | Идентификатор элемента (например, "Ex1_2") |
| `json` | text | JSON-строка с данными элемента |
| `element_type` | text | Тип элемента |
| `course_id` | text | Идентификатор курса |
| `bot_name` | text | Имя бота (устаревшее, используйте `account_id`) |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |

**Назначение:**
- Хранение элементов курсов, загруженных в БД
- Поддержка динамического добавления курсов через API
- Последовательное хранение элементов для навигации по курсу

**Ключевые операции:**
- `insert_course_element()` - добавление элемента курса
- `get_element_from_course_by_id()` - получение элемента по ID
- `get_first_element_from_course()` - получение первого элемента курса
- `get_next_course_element_by_id()` - получение следующего элемента
- `get_other_module_course_element_id()` - навигация между модулями

**Особенности:**
- Элементы упорядочены по `course_element_id` для последовательной навигации
- Поддержка модульной структуры курсов (элементы вида "Ex8_2", где "Ex8" - модуль)

**Процесс заполнения таблицы:**

Заполнение таблицы `course_element` происходит через функцию `add_replace_course()`, которая выполняет следующие шаги:

1. **Удаление старых данных:**
   - Удаляются все существующие элементы курса из таблицы `course_element`
   - Удаляются метаданные курса из таблицы `course`

2. **Добавление метаданных курса:**
   - Создается запись в таблице `course` с информацией о курсе (`course_id`, `bot_name`, `creator_id`, `yaml`)

3. **Добавление элементов курса:**
   - Для каждого элемента из `course_data` вызывается `insert_course_element()`
   - Элементы обрабатываются последовательно в порядке их появления в словаре `course_data`
   - Каждый элемент сохраняется с данными:
     - `element_id` - идентификатор элемента (ключ из словаря)
     - `json` - JSON-строка с данными элемента в формате `{"element_data": {...}}`
     - `element_type` - тип элемента (извлекается из `json_data.get("type")`)
     - `course_id` - идентификатор курса
     - `bot_name` - имя бота

**Формат данных JSON:**
- При сохранении из YAML (`course_script`): используется `ensure_ascii=False` для сохранения кириллицы
- При сохранении из Google Sheets (`course_data` без `course_script`): используется стандартная сериализация (может содержать `\u` escape-последовательности)

**Важные детали реализации:**
- Каждый вызов `insert_course_element()` создает отдельное подключение к БД
- Порядок элементов определяется порядком ключей в словаре `course_data`
- При ошибке вставки одного элемента остальные элементы уже могут быть вставлены (нет общей транзакции для всех элементов)
- Функция `insert_course_element()` возвращает `course_element_id` или `None` при ошибке

**Пример использования:**
```python
course_data = {
    "Ex1_1": {"type": "message", "text": "Привет!"},
    "Ex1_2": {"type": "question", "text": "Как дела?"},
    "Ex2_1": {"type": "quiz", "questions": [...]}
}

db.add_replace_course(
    course_id="my_course",
    course_data=course_data,
    bot_name="my_bot",
    creator_id=123456789,
    course_script=yaml_string  # опционально
)
```

### Таблица `courseparticipants`

Таблица для управления доступом пользователей к курсам.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `courseparticipant_id` | int4 (PK, AUTO) | Уникальный идентификатор |
| `course_code` | text | Идентификатор курса (legacy, для обратной совместимости) |
| `course_id` | int4 (FK → course) | Идентификатор курса (INT, добавлено в миграции 0004) |
| `username` | text | Имя пользователя в Telegram |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |
| `chat_id` | int8 | Telegram chat ID пользователя (добавлено в SaaS миграции) |
| `added_at` | timestamp | Дата добавления участника (добавлено в SaaS миграции) |
| `added_by` | int8 | Telegram user ID пользователя, добавившего участника (добавлено в SaaS миграции) |
| `invite_link_id` | int4 (FK → invite_link, NULLABLE) | Идентификатор пригласительной ссылки, через которую присоединился участник (добавлено в миграции 0006) |
| `course_group_id` | int4 (FK → course_group, NULLABLE) | Идентификатор группы курса, к которой относится участник (добавлено в миграции 0006) |

**Внешние ключи:**
- `courseparticipants_account_id_fkey` → `account(account_id)` ON DELETE CASCADE
- `courseparticipants_course_fkey` → `course(course_id)` ON DELETE CASCADE
- `courseparticipants_invite_link_fkey` → `invite_link(invite_link_id)` ON DELETE SET NULL
- `courseparticipants_course_group_fkey` → `course_group(course_group_id)` ON DELETE CASCADE

**Индексы:**
- `idx_courseparticipants_account` на `account_id`
- `idx_courseparticipants_chat` на `chat_id`
- `idx_courseparticipants_course` на `(course_id, account_id)`
- `idx_courseparticipants_coursecode` на `(course_code, account_id)`
- `idx_courseparticipants_username` на `username`
- `idx_courseparticipants_invite_link` на `invite_link_id` (WHERE invite_link_id IS NOT NULL)
- `idx_courseparticipants_course_group` на `course_group_id` (WHERE course_group_id IS NOT NULL)
- `idx_courseparticipants_group_account` на `(course_group_id, account_id)` (WHERE course_group_id IS NOT NULL)

**Уникальные ограничения:**
- `courseparticipants_unique` на `(course_id, account_id, COALESCE(chat_id, 0), COALESCE(username, ''))`

**Назначение:**
- Контроль доступа к ограниченным курсам
- Белые списки пользователей для конкретных курсов
- Отслеживание участников групп курсов
- Отслеживание источника присоединения через invite links

**Ключевые операции:**
- `check_user_in_course()` - проверка доступа пользователя к курсу

**Использование:**
- Если курс помечен как `restricted: yes` в `courses.yml`, система проверяет наличие пользователя в этой таблице
- При отсутствии доступа пользователь получает сообщение `decline_text`
- Участники могут присоединяться к группам через invite links (поле `invite_link_id`)
- Каждый участник может быть связан с конкретной группой курса (поле `course_group_id`)

**Особенности:**
- Поля `invite_link_id` и `course_group_id` являются nullable для обратной совместимости
- При удалении invite link участник остается, но связь теряется (ON DELETE SET NULL)
- При удалении группы курса все участники этой группы также удаляются (ON DELETE CASCADE)

### Таблица `bannedparticipants`

Таблица для управления заблокированными пользователями.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `bannedparticipant_id` | int4 (PK, AUTO) | Уникальный идентификатор |
| `botname` | text | Имя бота (устаревшее, используйте `account_id`) |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции) |
| `chat_id` | int8 | Telegram chat ID пользователя |
| `banned_at` | timestamp | Дата блокировки (по умолчанию CURRENT_TIMESTAMP) |
| `ban_reason` | text | Причина блокировки |
| `excluded` | smallint | Флаг исключения из блокировки (1 = исключен) |

**Индексы:**
- `idx_bannedparticipants_3` на `(botname, chat_id, excluded)`

**Назначение:**
- Хранение списка заблокированных пользователей
- Автоматическая блокировка при превышении лимита сообщений
- Ручное управление блокировками через поле `excluded`

**Ключевые операции:**
- `ban_users()` - автоматическое добавление пользователей в список заблокированных
- `check_user_banned()` - проверка статуса блокировки пользователя

**Механизм автоматической блокировки:**
1. Планировщик периодически вызывает `ban_users()`
2. Функция подсчитывает количество сообщений типа `*_chat*` для каждого пользователя
3. Если количество превышает `ban_limit` из конфигурации, пользователь добавляется в таблицу
4. При попытке отправить сообщение проверяется статус через `check_user_banned()`

### Таблица `gen_settings`

Таблица для хранения общих настроек системы.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | int4 (PK) | Уникальный идентификатор |
| `bot_name` | text | Имя бота (устаревшее, используйте `account_id`) |
| `account_id` | int4 (FK → account) | Идентификатор аккаунта (добавлено в SaaS миграции, может быть NULL) |
| `s_key` | text | Ключ настройки |
| `s_value` | text | Значение настройки |

**Назначение:**
- Хранение общих настроек приложения
- Конфигурация прав доступа (например, список создателей курсов)

**Ключевые операции:**
- `get_creators()` - получение списка chat_id пользователей с правами создателя

**Пример использования:**
- Хранение списка разрешенных создателей в записи с `s_key = 'allowed'`

## Связи между таблицами (ER диаграмма)

```
account (1) ──< (N) account_member
account (1) ──< (N) bot
account (1) ──< (N) course
account (1) ──< (N) course_element
account (1) ──< (N) courseparticipants
account (1) ──< (N) bannedparticipants
account (1) ──< (N) gen_settings
account (1) ──< (N) conversation
account (1) ──< (N) run
account (1) ──< (N) waiting_element

bot (1) ──< (N) course_deployment
bot (1) ──< (N) run

course (1) ──< (N) course_deployment
course (1) ──< (N) course_element
course (1) ──< (N) courseparticipants
course (1) ──< (N) conversation
course (1) ──< (N) run

course_deployment (1) ──< (N) enrollment_token
course_deployment (1) ──< (N) run

enrollment_token (1) ──< (N) run

run (1) ──< (N) conversation
run (1) ──< (N) waiting_element
```

## Паттерны взаимодействия с базой данных

### 1. Создание сессии прохождения курса

```python
# В course.py
def start_run(self):
    run_id = db.create_run(
        self.course_id, 
        self.username, 
        self.chat_id, 
        self.params.get('utms'), 
        self.params.get('utmc')
    )
    self.run_id = run_id
    return run_id
```

**Процесс:**
1. Пользователь запускает курс командой `/start` или через API
2. Создается запись в таблице `run`
3. Возвращается `run_id`, который используется для всех последующих взаимодействий

### 2. Сохранение элемента в историю

```python
# В elements/element.py
def save_report(self, role, report, score=None, maxscore=None):
    username = "--empty--" if self.username is None else self.username
    return db.insert_element(
        self.chat_id, 
        self.course_id, 
        username, 
        self.id, 
        self.type, 
        self.run_id, 
        self.data, 
        role, 
        report, 
        score=score, 
        maxscore=maxscore
    )
```

**Процесс:**
1. Элемент отправляется пользователю или пользователь отвечает на элемент
2. Вызывается `save_report()` с указанием роли ("user" или "assistant")
3. Данные сохраняются в таблицу `conversation`
4. Возвращается `conversation_id` для дальнейших операций

### 3. Получение текущего элемента

```python
# В course.py
@classmethod
def get_current_element(cls, chat_id):
    conversation_id, element_id, element_type, course_id, run_id, element_data = db.get_current_element(chat_id)
    
    if db.is_course_ended(chat_id, course_id):
        return None
        
    element = Course._get_element_from_data(element_id, course_id, element_data)
    element.set_run_id(run_id)
    element.set_conversation_id(conversation_id)
    return element
```

**Процесс:**
1. Запрос последней записи из `conversation` для данного `chat_id`
2. Проверка статуса завершения курса
3. Восстановление объекта элемента из JSON данных
4. Возврат элемента с установленными `run_id` и `conversation_id`

### 4. Навигация по курсу

**Для курсов из YAML файлов:**
- Курс загружается из файла через `yaml.safe_load()`
- Навигация происходит по порядку ключей в словаре
- Следующий элемент определяется как следующий ключ после текущего

**Для курсов из БД:**
```python
def get_next_course_element_by_id(course_id, element_id):
    query = """
    SELECT element_id, json
    FROM course_element
    WHERE course_element_id > (
        SELECT course_element_id
        FROM course_element
        WHERE element_id = %s
        AND course_id = %s AND bot_name = %s
    ) AND course_id = %s AND bot_name = %s
    ORDER BY course_element_id
    LIMIT 1;
    """
```

**Процесс:**
1. Находится `course_element_id` текущего элемента
2. Выбирается следующий элемент с большим `course_element_id`
3. Элементы упорядочены по `course_element_id` для последовательной навигации

### 5. Работа с элементами задержки (Delay)

```python
# В waiting.py
async def send_waiting_elements(bot):
    waiting_elements = db.get_active_waiting_elements()
    for id, chat_id, element_id, course_id in waiting_elements:
        await continue_chat(bot, chat_id, element_id, course_id)
        db.set_is_waiting_false(id)
```

**Процесс:**
1. Delay-элемент создает запись в `waiting_element` через `add_waiting_element()`
2. APScheduler периодически вызывает `send_waiting_elements()`
3. Для каждого элемента с истекшим `waiting_till_date` продолжается диалог
4. Элемент деактивируется через `set_is_waiting_false()`

### 6. Система блокировок

```python
# В waiting.py
async def ban_users():
    result = db.ban_users(
        ban['ban_limit'], 
        ban['ban_reason'], 
        ban['exclude']
    )
```

**Процесс:**
1. Планировщик периодически вызывает `ban_users()`
2. Подсчитываются сообщения типа `*_chat*` для каждого пользователя
3. Пользователи с превышением лимита добавляются в `bannedparticipants`
4. При отправке сообщения проверяется статус через `check_user_banned()`

### 7. Работа с курсами из БД

**Загрузка курса:**
```python
def get_course_info(course_id):
    query = """
    SELECT creator_id, date_created, yaml FROM course
    WHERE course_id = %s AND bot_name = %s
    LIMIT 1;
    """
```

**Добавление/замена курса:**
```python
def add_replace_course(course_id, course_data, bot_name=None, creator_id=None, course_script=None):
    # Удаление старых данных
    delete_course(conn, "course_element", course_id, bot_name)
    delete_course(conn, "course", course_id, bot_name)
    
    # Добавление метаданных курса
    INSERT INTO course (course_id, bot_name, creator_id, yaml)
    
    # Добавление элементов курса
    for element_id, json_data in course_data.items():
        insert_course_element(course_id, element_id, json_string, element_type, bot_name)
```

## Особенности реализации

### Управление подключениями

**Текущий подход:**
- Каждая функция создает новое подключение через `get_connection()`
- Подключение закрывается после выполнения операции
- Нет пула подключений или переиспользования

**Преимущества:**
- Простота реализации
- Отсутствие проблем с утечками подключений
- Изоляция транзакций

**Недостатки:**
- Низкая производительность при высокой нагрузке
- Отсутствие переиспользования подключений
- Нет управления транзакциями на уровне приложения

### Обработка ошибок

Большинство функций не имеют явной обработки ошибок. Исключения:
- `get_run_id()` - использует try/except с логированием
- `set_course_ended()` - использует try/except с rollback
- `add_waiting_element()` - использует try/except с rollback
- `insert_course_element()` - использует try/except с rollback

### Транзакции

Транзакции используются только в нескольких местах:
- `ban_users()` - использует `conn.commit()`
- `add_replace_course()` - использует `conn.commit()` и `conn.rollback()`
- Большинство операций выполняются в режиме автокоммита

### JSON хранение данных

Элементы курсов хранятся в виде JSON-строк в полях `json`:
- В `conversation.json` - полные данные элемента с метаданными
- В `course_element.json` - данные элемента в формате `{"element_data": {...}}`

При чтении JSON парсится через `json.loads()`, при записи - сериализуется через `json.dumps()`.

## Миграция на SaaS архитектуру

База данных была мигрирована на мультитенантную SaaS архитектуру через миграцию `0003_migrate_to_saas.sql`.

### Основные изменения:

1. **Добавлены новые таблицы:**
   - `account` - управление аккаунтами
   - `account_member` - участники аккаунтов
   - `bot` - централизованное управление ботами
   - `course_deployment` - связь курсов с ботами
   - `enrollment_token` - токены доступа к курсам

2. **Добавлено поле `account_id` во все основные таблицы:**
   - `conversation`, `run`, `waiting_element`, `course`, `course_element`, `courseparticipants`, `bannedparticipants`, `gen_settings`

3. **Добавлены новые поля:**
   - `bot_id` в `run` и `waiting_element` - ссылка на таблицу `bot`
   - `deployment_id` в `run` - ссылка на `course_deployment`
   - `token_id` в `run` - ссылка на `enrollment_token`
   - Дополнительные поля в `course` (title, description, metadata, is_active)
   - Дополнительные поля в `run` (is_active, ended_at, utm_medium)

4. **Изменена уникальность курсов:**
   - Было: `(course_id, bot_name)` - составной первичный ключ
   - Стало: `(course_id, account_id)` - курс уникален в рамках аккаунта

5. **Созданы внешние ключи:**
   - Все таблицы связаны через `account_id` с таблицей `account`
   - `run` связана с `bot`, `course_deployment`, `enrollment_token`
   - `course_element` и `courseparticipants` связаны с `course` через `(course_id, account_id)`

### Обратная совместимость:

- Поле `bot_name` сохранено в таблицах `course`, `run`, `waiting_element` для обратной совместимости
- Все существующие данные автоматически привязаны к аккаунту по умолчанию (`account_id = 1`)
- Существующие боты автоматически созданы в таблице `bot` с временными токенами

### Важные замечания:

- **Токены ботов:** После миграции необходимо обновить токены ботов в таблице `bot`:
  ```sql
  UPDATE bot SET bot_token = '<actual_token>' WHERE bot_name = '<name>';
  ```

- **Деплойменты:** Курсы автоматически связаны с ботами через `course_deployment` на основе существующих данных

- **Запросы:** Все запросы должны включать фильтрацию по `account_id` для изоляции данных между аккаунтами

## Рекомендации по улучшению

1. **Пул подключений:** Использовать `psycopg2.pool.ThreadedConnectionPool` для переиспользования подключений
2. **Контекстные менеджеры:** Использовать `with conn:` для автоматического управления транзакциями
3. **Обработка ошибок:** Добавить единообразную обработку ошибок во все функции
4. **Индексы:** Индексы добавлены в миграции на часто используемые поля (`account_id`, `bot_id`, `deployment_id`, `chat_id`, `run_id`)
5. **Миграции:** Используется система миграций в `migrations/versions/` для управления схемой БД
6. **Мониторинг:** Добавить логирование медленных запросов
7. **Кэширование:** Рассмотреть кэширование часто запрашиваемых данных (курсы, элементы)
8. **Изоляция данных:** Все запросы должны фильтроваться по `account_id` для обеспечения мультитенантности

## Примеры использования

### Получение статистики по курсу (с учетом account_id)

```python
def get_course_statistics(account_id, course_id, run_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Количество элементов каждого типа
    query = """
    SELECT element_type, COUNT(*) 
    FROM conversation 
    WHERE account_id = %s AND course_id = %s AND run_id = %s
    GROUP BY element_type;
    """
    cursor.execute(query, (account_id, course_id, run_id))
    stats = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return stats
```

### Получение прогресса пользователя (с учетом account_id)

```python
def get_user_progress(account_id, chat_id, course_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    # Общий балл и максимальный балл
    query = """
    SELECT SUM(score) AS total_score, SUM(maxscore) AS max_score
    FROM conversation
    WHERE account_id = %s AND chat_id = %s AND course_id = %s AND score IS NOT NULL;
    """
    cursor.execute(query, (account_id, chat_id, course_id))
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    return result
```

### Получение ботов аккаунта

```python
def get_account_bots(account_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT bot_id, bot_name, display_name, is_active
    FROM bot
    WHERE account_id = %s AND is_active = TRUE
    ORDER BY created_at DESC;
    """
    cursor.execute(query, (account_id,))
    bots = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return bots
```

### Получение деплойментов курса

```python
def get_course_deployments(account_id, course_id):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT cd.deployment_id, cd.bot_id, b.bot_name, b.display_name, cd.environment, cd.is_active
    FROM course_deployment cd
    JOIN bot b ON cd.bot_id = b.bot_id
    WHERE cd.account_id = %s AND cd.course_id = %s
    ORDER BY cd.created_at DESC;
    """
    cursor.execute(query, (account_id, course_id))
    deployments = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return deployments
```

### Создание нового деплоймента

```python
def create_course_deployment(account_id, course_id, bot_id, environment='prod'):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    INSERT INTO course_deployment (course_id, account_id, bot_id, environment, is_active)
    VALUES (%s, %s, %s, %s, TRUE)
    ON CONFLICT (bot_id, course_id, account_id, environment) DO NOTHING
    RETURNING deployment_id;
    """
    cursor.execute(query, (course_id, account_id, bot_id, environment))
    result = cursor.fetchone()
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return result[0] if result else None
```

### Получение активных токенов доступа

```python
def get_active_enrollment_tokens(account_id, deployment_id=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT et.token_id, et.token, et.token_type, et.max_uses, et.current_uses, 
           et.expires_at, cd.course_id, b.bot_name
    FROM enrollment_token et
    JOIN course_deployment cd ON et.deployment_id = cd.deployment_id
    JOIN bot b ON cd.bot_id = b.bot_id
    WHERE cd.account_id = %s 
      AND et.is_active = TRUE
      AND (et.expires_at IS NULL OR et.expires_at > NOW())
      AND (et.max_uses IS NULL OR et.current_uses < et.max_uses)
      AND (%s IS NULL OR et.deployment_id = %s)
    ORDER BY et.created_at DESC;
    """
    cursor.execute(query, (account_id, deployment_id, deployment_id))
    tokens = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return tokens
```

## Важные замечания по использованию SaaS архитектуры

### Изоляция данных

**Всегда фильтруйте запросы по `account_id`:**

```python
# ✅ Правильно
query = "SELECT * FROM course WHERE account_id = %s AND course_id = %s"

# ❌ Неправильно (может вернуть данные других аккаунтов)
query = "SELECT * FROM course WHERE course_id = %s"
```

### Работа с ботами

**Используйте `bot_id` вместо `bot_name`:**

```python
# ✅ Правильно (новый подход)
query = """
SELECT r.* FROM run r
WHERE r.account_id = %s AND r.bot_id = %s
"""

# ⚠️ Устаревший подход (работает, но не рекомендуется)
query = """
SELECT r.* FROM run r
WHERE r.account_id = %s AND r.botname = %s
"""
```

### Работа с курсами

**Курсы уникальны в рамках аккаунта:**

```python
# ✅ Правильно
query = """
SELECT * FROM course 
WHERE account_id = %s AND course_id = %s
"""

# ❌ Неправильно (старый подход с bot_name)
query = """
SELECT * FROM course 
WHERE course_id = %s AND bot_name = %s
"""
```

### Деплойменты

**Используйте `deployment_id` для связи курсов с ботами:**

```python
# Получение деплоймента для курса и бота
query = """
SELECT deployment_id FROM course_deployment
WHERE account_id = %s AND course_id = %s AND bot_id = %s AND environment = 'prod'
"""
```

## Заключение

База данных играет центральную роль в приложении, обеспечивая:
- **Мультитенантность** - изоляция данных между аккаунтами
- Хранение истории взаимодействий
- Управление курсами и элементами
- Контроль доступа и блокировок
- Планирование отложенных действий
- Аналитику и отчетность
- Централизованное управление ботами
- Гибкое развертывание курсов на разных ботах

Текущая реализация поддерживает мультитенантную SaaS архитектуру и может быть улучшена для повышения производительности и надежности в условиях высокой нагрузки.

**Миграция на SaaS архитектуру завершена.** Все существующие данные сохранены и автоматически привязаны к аккаунту по умолчанию. Для использования новых возможностей необходимо обновить код приложения для работы с новыми таблицами и полями.

