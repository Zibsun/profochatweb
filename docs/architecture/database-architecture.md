# Архитектура базы данных

Документ описывает архитектуру базы данных ProfoChat Web с мультитенантной SaaS моделью.

## Обзор

База данных использует PostgreSQL и реализует мультитенантную SaaS архитектуру, где все данные изолированы по аккаунтам (`account_id`). Каждый аккаунт может иметь несколько ботов, курсов, групп и пользователей.

## Мультитенантная архитектура (SaaS)

### Принцип изоляции

Все основные таблицы содержат поле `account_id` для изоляции данных между аккаунтами:

```sql
account_id INT4 DEFAULT 1 NOT NULL
CONSTRAINT table_account_id_fkey FOREIGN KEY (account_id) 
    REFERENCES public.account(account_id) ON DELETE CASCADE
```

**По умолчанию:** Существующие данные имеют `account_id = 1` (аккаунт по умолчанию).

### Иерархия сущностей

```
account (аккаунт/тенант)
├── account_member (участники аккаунта)
├── bot (Telegram боты)
├── course (курсы)
│   └── course_element (элементы курсов)
├── course_group (группы - связь бота и курса)
│   ├── invite_link (пригласительные ссылки)
│   └── schedule (расписание)
├── run (сессии прохождения курсов)
├── conversation (история взаимодействий)
├── waiting_element (отложенные элементы)
├── courseparticipants (контроль доступа)
└── bannedparticipants (блокировки)
```

## Основные таблицы

### account

**Назначение:** Центральная таблица для мультитенантной архитектуры. Представляет организацию или клиента.

**Структура:**
```sql
CREATE TABLE public.account (
    account_id serial4 NOT NULL PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    plan text DEFAULT 'free',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    is_active bool DEFAULT true,
    settings jsonb
);
```

**Индексы:**
- `idx_account_active` — по `is_active`
- `idx_account_slug` — по `slug` (уникальный)

**Особенности:**
- При миграции создается аккаунт по умолчанию с `account_id = 1`
- `slug` используется для URL-friendly идентификатора (для поддоменов в будущем)
- `plan` определяет тарифный план (free, basic, pro, enterprise)
- `settings` хранит дополнительные настройки аккаунта в JSONB

### account_member

**Назначение:** Управление участниками аккаунта (создатели курсов, администраторы).

**Структура:**
```sql
CREATE TABLE public.account_member (
    account_member_id serial4 NOT NULL PRIMARY KEY,
    account_id int4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    telegram_user_id int8 NOT NULL,
    telegram_username text,
    role text DEFAULT 'member',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp,
    is_active bool DEFAULT true,
    UNIQUE (account_id, telegram_user_id)
);
```

**Индексы:**
- `idx_account_member_account` — по `account_id`
- `idx_account_member_active` — по `(account_id, is_active)`
- `idx_account_member_telegram` — по `telegram_user_id`

**Роли:**
- `member` — обычный участник
- `admin` — администратор аккаунта
- `owner` — владелец аккаунта

### bot

**Назначение:** Управление Telegram ботами на уровне аккаунта.

**Структура:**
```sql
CREATE TABLE public.bot (
    bot_id serial4 NOT NULL PRIMARY KEY,
    account_id int4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_name text NOT NULL,
    bot_token text NOT NULL UNIQUE,
    display_name text,
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    is_active bool DEFAULT true,
    settings jsonb,
    UNIQUE (account_id, bot_name)
);
```

**Индексы:**
- `idx_bot_account` — по `account_id`
- `idx_bot_active` — по `(account_id, is_active)`
- `idx_bot_name` — по `bot_name`

**Особенности:**
- `bot_name` уникален в рамках аккаунта
- `bot_token` уникален глобально
- При миграции существующие боты из `run.botname` и `course.bot_name` автоматически создаются в этой таблице

### course

**Назначение:** Метаданные курсов. Курсы уникальны в рамках аккаунта.

**Структура:**
```sql
CREATE TABLE public.course (
    course_id serial4 NOT NULL PRIMARY KEY,
    course_code text NOT NULL,
    bot_name text NOT NULL,  -- legacy поле для совместимости
    account_id int4 DEFAULT 1 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    creator_id int8,
    date_created timestamp DEFAULT CURRENT_TIMESTAMP,
    yaml text,  -- YAML представление курса (legacy)
    title text,
    description text,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb,
    is_active bool DEFAULT true,
    UNIQUE (course_code, account_id)
);
```

**Индексы:**
- `idx_course_account` — по `account_id`
- `idx_course_active` — по `(account_id, is_active)`
- `idx_course_coursecode_botname` — по `(course_code, bot_name)`
- `idx_course_created` — по `(account_id, date_created DESC)`

**Особенности:**
- `course_code` уникален в рамках аккаунта
- `yaml` хранит YAML представление курса (legacy, для обратной совместимости)
- Курсы могут быть из YAML файлов или БД (определяется через `path` в `courses.yml`)

### course_element

**Назначение:** Элементы курсов из БД. Используется для динамически добавляемых курсов.

**Структура:**
```sql
CREATE TABLE public.course_element (
    course_element_id int8 DEFAULT nextval('course_element_id_seq') PRIMARY KEY,
    course_id int4 NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    element_id text,
    json text,  -- JSON представление элемента
    element_type text,
    course_code text,  -- legacy поля
    bot_name text,
    account_id int4 DEFAULT 1 NOT NULL
);
```

**Индексы:**
- `idx_course_element_course` — по `(course_id, account_id)`
- `idx_course_element_order` — по `(course_id, account_id, course_element_id)` — порядок элементов
- `idx_course_element_type` — по `(course_id, account_id, element_type)`

**Особенности:**
- Элементы хранятся последовательно по `course_element_id`
- Порядок элементов определяется порядком вставки
- `json` содержит полное JSON представление элемента

### course_group

**Назначение:** Группы — связь ботов с курсами. Контейнер исполнения курса.

**Структура:**
```sql
CREATE TABLE public.course_group (
    course_group_id int4 DEFAULT nextval('course_group_group_id_seq') PRIMARY KEY,
    account_id int4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id int4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    course_id int4 NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    is_active bool DEFAULT true,
    settings jsonb,
    UNIQUE (bot_id, course_id, name)
);
```

**Индексы:**
- `idx_course_group_account` — по `account_id`
- `idx_course_group_active` — по `(bot_id, is_active)`
- `idx_course_group_bot` — по `bot_id`
- `idx_course_group_course` — по `course_id`

**Особенности:**
- Группа связывает бота и курс
- Один курс может быть развернут на нескольких ботах через разные группы
- Один бот может иметь несколько курсов через разные группы
- `name` уникален в рамках `(bot_id, course_id)`

### invite_link

**Назначение:** Пригласительные ссылки для записи студентов в группы.

**Структура:**
```sql
CREATE TABLE public.invite_link (
    invite_link_id serial4 NOT NULL PRIMARY KEY,
    course_group_id int4 NOT NULL REFERENCES course_group(course_group_id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    max_uses int4,
    current_uses int4 DEFAULT 0,
    expires_at timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    created_by int8,
    is_active bool DEFAULT true,
    metadata jsonb
);
```

**Индексы:**
- `idx_invite_link_active` — по `(course_group_id, is_active)`
- `idx_invite_link_course_group` — по `course_group_id`
- `idx_invite_link_expires` — по `expires_at` (WHERE expires_at IS NOT NULL)
- `idx_invite_link_token` — по `token` (уникальный)

**Особенности:**
- `token` используется в URL пригласительной ссылки
- `max_uses` ограничивает количество использований (NULL = без ограничений)
- `expires_at` определяет срок действия ссылки (NULL = без срока)

### schedule

**Назначение:** Опциональное расписание для управления временем выдачи задач в группах.

**Структура:**
```sql
CREATE TABLE public.schedule (
    schedule_id serial4 NOT NULL PRIMARY KEY,
    course_group_id int4 NOT NULL UNIQUE REFERENCES course_group(course_group_id) ON DELETE CASCADE,
    schedule_type text NOT NULL,
    schedule_config jsonb NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    is_active bool DEFAULT true
);
```

**Индексы:**
- `idx_schedule_active` — по `(course_group_id, is_active)`
- `idx_schedule_course_group` — по `course_group_id`

**Особенности:**
- Один `schedule` на группу (UNIQUE `course_group_id`)
- `schedule_type` определяет тип расписания (daily, weekly, custom и т.д.)
- `schedule_config` содержит конфигурацию расписания в JSONB

### conversation

**Назначение:** История всех взаимодействий пользователей с курсами.

**Структура:**
```sql
CREATE TABLE public.conversation (
    conversation_id serial4 NOT NULL PRIMARY KEY,
    chat_id int8,
    username text,
    course_code text,  -- legacy
    element_id text,
    element_type text,
    role text,  -- 'user', 'assistant', 'system'
    json text,  -- JSON представление элемента
    report text,  -- текст сообщения/ответа
    score float4,
    maxscore float4,
    date_inserted timestamp DEFAULT CURRENT_TIMESTAMP,
    run_id int4,
    account_id int4 DEFAULT 1 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    course_id int4
);
```

**Индексы:**
- `idx_conversation_account` — по `account_id`
- `idx_conversation_chat` — по `chat_id`
- `idx_conversation_course` — по `(course_id, account_id)`
- `idx_conversation_date` — по `date_inserted DESC`
- `idx_conversation_element` — по `(course_id, account_id, element_id)`
- `idx_conversation_role` — по `(run_id, role)`
- `idx_conversation_run` — по `run_id`

**Особенности:**
- Хранит все сообщения системы и пользователя
- Содержит оценки для тестовых элементов (`score`, `maxscore`)
- Используется для генерации отчетов и повторения ошибок
- `role` определяет тип сообщения: 'user', 'assistant', 'system'

### run

**Назначение:** Сессии прохождения курсов. Отслеживает начало и завершение курса.

**Примечание:** Таблица `run` не показана в `setup.sql`, но используется в коде. Структура должна быть аналогичной с добавлением `account_id`.

**Основные поля (предположительно):**
- `run_id` — уникальный идентификатор сессии
- `chat_id` — идентификатор пользователя
- `course_id` — идентификатор курса
- `account_id` — идентификатор аккаунта
- `started_at` — время начала
- `ended_at` — время завершения
- `utm_source`, `utm_campaign` — UTM метки для аналитики

### waiting_element

**Назначение:** Отложенные элементы с задержкой отправки.

**Структура:**
```sql
CREATE TABLE public.waiting_element (
    waiting_element_id int4 DEFAULT nextval('waiting_element_id_seq') PRIMARY KEY,
    chat_id int8 NOT NULL,
    waiting_till_date timestamp,
    is_waiting bool,
    element_id text,
    course_code text,  -- legacy
    botname text,  -- legacy
    account_id int4 DEFAULT 1 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id int4 REFERENCES bot(bot_id) ON DELETE CASCADE,
    run_id int4,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    course_id int4
);
```

**Индексы:**
- `idx_waiting_account` — по `account_id`
- `idx_waiting_active` — по `(is_waiting, waiting_till_date)` WHERE `is_waiting = true`
- `idx_waiting_bot` — по `bot_id`
- `idx_waiting_date` — по `waiting_till_date`
- `idx_waiting_run` — по `run_id`

**Особенности:**
- Используется для элементов типа `delay`
- Планировщик (APScheduler) периодически проверяет элементы с `waiting_till_date < now()`
- После обработки `is_waiting` устанавливается в `false`

### courseparticipants

**Назначение:** Контроль доступа к ограниченным курсам и управление участниками групп.

**Структура:**
```sql
CREATE TABLE public.courseparticipants (
    courseparticipant_id int4 DEFAULT nextval('courseparticipant_id_seq') PRIMARY KEY,
    course_code text NOT NULL,  -- legacy
    username text NOT NULL,
    account_id int4 DEFAULT 1 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    chat_id int8,
    added_at timestamp DEFAULT CURRENT_TIMESTAMP,
    added_by int8,
    course_id int4 NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    invite_link_id int4 NULL REFERENCES invite_link(invite_link_id) ON DELETE SET NULL,  -- добавлено в миграции 0006
    course_group_id int4 NULL REFERENCES course_group(course_group_id) ON DELETE CASCADE,  -- добавлено в миграции 0006
    UNIQUE (course_id, account_id, COALESCE(chat_id, 0), COALESCE(username, ''))
);
```

**Индексы:**
- `idx_courseparticipants_account` — по `account_id`
- `idx_courseparticipants_chat` — по `chat_id`
- `idx_courseparticipants_course` — по `(course_id, account_id)`
- `idx_courseparticipants_coursecode` — по `(course_code, account_id)`
- `idx_courseparticipants_username` — по `username`
- `idx_courseparticipants_invite_link` — по `invite_link_id` (WHERE invite_link_id IS NOT NULL)
- `idx_courseparticipants_course_group` — по `course_group_id` (WHERE course_group_id IS NOT NULL)
- `idx_courseparticipants_group_account` — по `(course_group_id, account_id)` (WHERE course_group_id IS NOT NULL)

**Особенности:**
- Используется для курсов с `restricted: yes`
- Проверка доступа через `db.check_user_in_course()`
- Связана с `invite_link` для отслеживания источника присоединения
- Связана с `course_group` для определения конкретной группы участника
- Поля `invite_link_id` и `course_group_id` nullable для обратной совместимости
- При удалении invite link участник остается (ON DELETE SET NULL)
- При удалении группы все участники группы удаляются (ON DELETE CASCADE)

### bannedparticipants

**Назначение:** Заблокированные пользователи (автоматическая и ручная блокировка).

**Структура:**
```sql
CREATE TABLE public.bannedparticipants (
    bannedparticipant_id int4 DEFAULT nextval('bannedparticipant_id_seq') PRIMARY KEY,
    botname text NOT NULL,  -- legacy
    chat_id int8 NOT NULL,
    banned_at timestamp DEFAULT CURRENT_TIMESTAMP,
    ban_reason text,
    excluded int2,  -- 0 = активная блокировка, 1 = исключение из блокировки
    account_id int4 DEFAULT 1 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id int4 REFERENCES bot(bot_id) ON DELETE CASCADE,
    metadata jsonb,
    UNIQUE (bot_id, chat_id, excluded)
);
```

**Индексы:**
- `idx_banned_account` — по `account_id`
- `idx_banned_active` — по `(bot_id, excluded)` WHERE `excluded = 0`
- `idx_banned_bot` — по `bot_id`
- `idx_banned_chat` — по `(bot_id, chat_id, excluded)`

**Особенности:**
- Автоматическая блокировка через планировщик (`waiting.ban_users()`)
- Проверка через `db.check_user_banned()`
- `excluded = 1` означает исключение из блокировки

### gen_settings

**Назначение:** Общие настройки для ботов и аккаунтов.

**Структура:**
```sql
CREATE TABLE public.gen_settings (
    id int4 NOT NULL PRIMARY KEY,
    bot_name text NOT NULL,  -- legacy
    s_key text NOT NULL,
    s_value text,
    account_id int4 REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id int4 REFERENCES bot(bot_id) ON DELETE CASCADE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);
```

**Индексы:**
- `idx_gen_settings_account` — по `account_id`
- `idx_gen_settings_bot` — по `bot_id`
- `idx_gen_settings_key` — по `(account_id, bot_id, s_key)`

## Паттерны работы с БД

### Два подхода

1. **Прямые SQL запросы (`db.py`):**
   - Используются Core Logic модулями (`course.py`, `elements/`)
   - Каждая функция создает новое подключение через `get_connection()`
   - Используется для совместимости с существующей структурой БД

2. **SQLAlchemy ORM (`backend/app/models/`):**
   - Используется в FastAPI backend для новых функций
   - Сессии через dependency injection
   - Миграции через Alembic

### Изоляция по аккаунтам

Все запросы должны фильтроваться по `account_id`:

```python
# Пример из db.py
def get_courses(account_id=1):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT course_code, title FROM course WHERE account_id = %s AND is_active = true",
        (account_id,)
    )
    ...
```

### Каскадное удаление

Все внешние ключи используют `ON DELETE CASCADE`:

```sql
CONSTRAINT table_account_id_fkey FOREIGN KEY (account_id) 
    REFERENCES public.account(account_id) ON DELETE CASCADE
```

При удалении аккаунта автоматически удаляются все связанные данные.

## Миграции

Система миграций использует таблицу `schema_migrations`:

```sql
CREATE TABLE public.schema_migrations (
    version varchar(255) NOT NULL PRIMARY KEY,
    description text,
    applied_at timestamp DEFAULT CURRENT_TIMESTAMP,
    applied_by text,
    execution_time_ms int4
);
```

Миграции находятся в `migrations/versions/` и применяются через `migrations/tools/migrate.sh`.

## Известные ограничения

1. **Legacy поля:**
   - Многие таблицы содержат legacy поля (`bot_name`, `course_code`, `botname`) для обратной совместимости
   - Эти поля постепенно заменяются на связи через `bot_id` и `course_id`

2. **Управление подключениями:**
   - `db.py` создает новое подключение для каждой операции
   - Нет пула подключений
   - Может привести к проблемам при высокой нагрузке

3. **Два источника курсов:**
   - YAML файлы (`scripts/{BOT_FOLDER}/*.yml`)
   - База данных (таблицы `course` и `course_element`)
   - Логика загрузки различается в `course.py`
