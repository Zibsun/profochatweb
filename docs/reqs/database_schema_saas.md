# Схема базы данных для SaaS архитектуры ProfoChatBot

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Предложение для реализации

## Обзор

Данный документ описывает схему базы данных для ProfoChatBot с multi-tenant SaaS архитектурой и моделью Групп. Схема обеспечивает:

- **Multi-tenancy** через таблицу `account`
- **Разделение курсов и ботов** через `group` (группы)
- **Управление доступом** через `invite_link` (пригласительные ссылки)
- **Управление расписанием** через `schedule` (опциональное расписание для групп)
- **Авторизацию создателей** через `account_member`
- **Обратную совместимость** с существующими данными

**Примечание:** Таблицы `course_deployment` и `enrollment_token` заменены на `group` и `invite_link` соответственно. Старые таблицы могут оставаться в базе для обратной совместимости во время миграции.

---

## Архитектурные принципы

### 1. Multi-Tenancy
- Каждый аккаунт (tenant) изолирован через `account_id`
- Все сущности привязаны к аккаунту
- По умолчанию `account_id = 1` для существующих данных

### 2. Разделение контента и развертывания через Группы
- **Course** — логический курс (контент и последовательность Tasks)
- **Bot** — Telegram-бот (канал доставки)
- **Group** — контейнер исполнения курса (связывает бота, курс, студентов и опциональное расписание)
- **InviteLink** — пригласительная ссылка для записи студентов в группу
- **Schedule** — опциональное расписание для управления временем выхода задач

### 3. Ограничения
- Один активный курс на студента на бота: `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`
- Пригласительные ссылки привязываются к группе, а не к курсу напрямую
- Связь Бот ↔ Курс осуществляется только через Группы (не напрямую)

---

## Схема таблиц

### 1. Account (Аккаунт/Тенант)

**Назначение:** Организация/тенант, владеющий ботами и курсами.

```sql
CREATE SEQUENCE IF NOT EXISTS account_account_id_seq;

CREATE TABLE public.account (
    account_id INT4 NOT NULL DEFAULT nextval('account_account_id_seq'::regclass),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,  -- URL-friendly идентификатор
    plan TEXT DEFAULT 'free',  -- free, basic, pro, enterprise
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,  -- дополнительные настройки аккаунта
    PRIMARY KEY (account_id)
);

CREATE INDEX idx_account_slug ON account (slug);
CREATE INDEX idx_account_active ON account (is_active);
```

**Поля:**
- `account_id` — уникальный идентификатор аккаунта
- `name` — название организации/аккаунта
- `slug` — URL-friendly идентификатор (для поддоменов в будущем)
- `plan` — тарифный план (free, basic, pro, enterprise)
- `created_at`, `updated_at` — временные метки
- `is_active` — активен ли аккаунт
- `settings` — JSON с дополнительными настройками

---

### 2. AccountMember (Участники аккаунта)

**Назначение:** Пользователи панели управления (создатели/админы).

```sql
CREATE SEQUENCE IF NOT EXISTS account_member_account_member_id_seq;

CREATE TABLE public.account_member (
    account_member_id INT4 NOT NULL DEFAULT nextval('account_member_account_member_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    telegram_user_id INT8 NOT NULL,  -- Telegram user ID
    telegram_username TEXT,
    role TEXT DEFAULT 'member',  -- owner, admin, member, viewer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (account_member_id),
    UNIQUE (account_id, telegram_user_id)
);

CREATE INDEX idx_account_member_account ON account_member (account_id);
CREATE INDEX idx_account_member_telegram ON account_member (telegram_user_id);
CREATE INDEX idx_account_member_active ON account_member (account_id, is_active);
```

**Поля:**
- `account_member_id` — уникальный идентификатор
- `account_id` — FK → account
- `telegram_user_id` — Telegram user ID для авторизации
- `telegram_username` — username в Telegram
- `role` — роль: owner, admin, member, viewer
- `created_at`, `last_login_at` — временные метки
- `is_active` — активен ли участник

**Роли:**
- `owner` — владелец аккаунта (полный доступ)
- `admin` — администратор (управление курсами и ботами)
- `member` — создатель (создание и редактирование курсов)
- `viewer` — просмотрщик (только чтение)

---

### 3. Bot (Telegram-бот)

**Назначение:** Telegram-бот, подключенный к аккаунту.

```sql
CREATE SEQUENCE IF NOT EXISTS bot_bot_id_seq;

CREATE TABLE public.bot (
    bot_id INT4 NOT NULL DEFAULT nextval('bot_bot_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_name TEXT NOT NULL,  -- username бота (без @)
    bot_token TEXT NOT NULL,  -- Telegram API token
    display_name TEXT,  -- отображаемое имя
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,  -- настройки бота
    PRIMARY KEY (bot_id),
    UNIQUE (account_id, bot_name),
    UNIQUE (bot_token)  -- токен уникален глобально
);

CREATE INDEX idx_bot_account ON bot (account_id);
CREATE INDEX idx_bot_name ON bot (bot_name);
CREATE INDEX idx_bot_active ON bot (account_id, is_active);
```

**Поля:**
- `bot_id` — уникальный идентификатор бота
- `account_id` — FK → account
- `bot_name` — username бота (без @)
- `bot_token` — Telegram API token
- `display_name` — отображаемое имя
- `description` — описание бота
- `created_at`, `updated_at` — временные метки
- `is_active` — активен ли бот
- `settings` — JSON с настройками бота

---

### 4. Course (Курс)

**Назначение:** Логический курс (контент), независимый от ботов.

```sql
CREATE TABLE public.course (
    course_id TEXT NOT NULL,
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    title TEXT,
    description TEXT,
    creator_id INT8,  -- Telegram user ID создателя (legacy, для совместимости)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    yaml TEXT,  -- YAML представление курса (опционально)
    metadata JSONB,  -- дополнительные метаданные
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (course_id, account_id)
);

CREATE INDEX idx_course_account ON course (account_id);
CREATE INDEX idx_course_active ON course (account_id, is_active);
CREATE INDEX idx_course_created ON course (account_id, created_at DESC);
```

**Изменения от текущей схемы:**
- Убран составной PK с `bot_name`
- Добавлен `account_id` в составной PK
- Добавлены поля `title`, `description`, `metadata`
- `yaml` остается для обратной совместимости

---

### 5. CourseElement (Элемент курса)

**Назначение:** Элементы курса (message, quiz, test, и т.д.).

```sql
CREATE SEQUENCE IF NOT EXISTS course_element_course_element_id_seq;

CREATE TABLE public.course_element (
    course_element_id INT8 NOT NULL DEFAULT nextval('course_element_course_element_id_seq'::regclass),
    course_id TEXT NOT NULL,
    account_id INT4 NOT NULL,
    element_id TEXT NOT NULL,  -- например, "Ex1_2"
    json TEXT NOT NULL,  -- JSON-строка с данными элемента
    element_type TEXT NOT NULL,  -- message, quiz, test, dialog, и т.д.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_element_id),
    FOREIGN KEY (course_id, account_id) REFERENCES course(course_id, account_id) ON DELETE CASCADE,
    UNIQUE (course_id, account_id, element_id)
);

CREATE INDEX idx_course_element_course ON course_element (course_id, account_id);
CREATE INDEX idx_course_element_type ON course_element (course_id, account_id, element_type);
CREATE INDEX idx_course_element_order ON course_element (course_id, account_id, course_element_id);
```

**Изменения от текущей схемы:**
- Убран `bot_name`
- Добавлен `account_id`
- Добавлен `UNIQUE` на `(course_id, account_id, element_id)`
- Добавлен `created_at` для упорядочивания

---

### 6. Group (Группа)

**Назначение:** Контейнер исполнения курса, объединяющий бота, курс, студентов и опциональное расписание.

```sql
CREATE SEQUENCE IF NOT EXISTS group_group_id_seq;

CREATE TABLE public.group (
    group_id INT4 NOT NULL DEFAULT nextval('group_group_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    course_id INT4 NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    PRIMARY KEY (group_id),
    UNIQUE (bot_id, course_id, name)
);

CREATE INDEX idx_group_account ON group (account_id);
CREATE INDEX idx_group_bot ON group (bot_id);
CREATE INDEX idx_group_course ON group (course_id);
CREATE INDEX idx_group_active ON group (bot_id, is_active);
```

**Поля:**
- `group_id` — уникальный идентификатор группы
- `account_id` — FK → account
- `bot_id` — FK → bot
- `course_id` — FK → course
- `name` — название группы
- `description` — описание группы
- `created_at`, `updated_at` — временные метки
- `is_active` — активна ли группа
- `settings` — JSON с дополнительными настройками

**Ограничения:**
- Группа связывает один Бот с одним Курсом
- Один бот может иметь несколько групп с разными курсами
- Один курс может быть в нескольких группах на одном боте
- Уникальность по `(bot_id, course_id, name)` — одна группа с таким именем на бота-курс

---

### 7. InviteLink (Пригласительная ссылка)

**Назначение:** Пригласительные ссылки для записи студентов в группы.

```sql
CREATE SEQUENCE IF NOT EXISTS invite_link_invite_link_id_seq;

CREATE TABLE public.invite_link (
    invite_link_id INT4 NOT NULL DEFAULT nextval('invite_link_invite_link_id_seq'::regclass),
    group_id INT4 NOT NULL REFERENCES group(group_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    max_uses INT4,
    current_uses INT4 DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT8,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,
    PRIMARY KEY (invite_link_id)
);

CREATE INDEX idx_invite_link_group ON invite_link (group_id);
CREATE INDEX idx_invite_link_token ON invite_link (token);
CREATE INDEX idx_invite_link_active ON invite_link (group_id, is_active);
CREATE INDEX idx_invite_link_expires ON invite_link (expires_at) WHERE expires_at IS NOT NULL;
```

**Поля:**
- `invite_link_id` — уникальный идентификатор
- `group_id` — FK → group
- `token` — уникальный токен (используется в deep link)
- `max_uses` — максимальное количество использований (NULL = без ограничений)
- `current_uses` — текущее количество использований
- `expires_at` — срок действия (NULL = без срока)
- `created_at` — дата создания
- `created_by` — Telegram user ID создателя
- `is_active` — активна ли ссылка
- `metadata` — JSON с дополнительными данными (UTM, источник, и т.д.)

**Формат deep link:**
```
https://t.me/<bot_username>?start=group_<group_id>_<token>
```

**Особенности:**
- Каждая группа может иметь одну или несколько пригласительных ссылок
- При переходе по ссылке пользователь автоматически записывается в группу
- Счетчик использований увеличивается автоматически

---

### 8. Schedule (Расписание)

**Назначение:** Опциональное расписание для управления временем выхода задач (Tasks) в группе.

```sql
CREATE SEQUENCE IF NOT EXISTS schedule_schedule_id_seq;

CREATE TABLE public.schedule (
    schedule_id INT4 NOT NULL DEFAULT nextval('schedule_schedule_id_seq'::regclass),
    group_id INT4 NOT NULL REFERENCES group(group_id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL,  -- weekly, daily, custom
    schedule_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (schedule_id),
    UNIQUE (group_id)
);

CREATE INDEX idx_schedule_group ON schedule (group_id);
CREATE INDEX idx_schedule_active ON schedule (group_id, is_active);
```

**Поля:**
- `schedule_id` — уникальный идентификатор
- `group_id` — FK → group (UNIQUE, одно расписание на группу)
- `schedule_type` — тип расписания: `weekly`, `daily`, `custom`
- `schedule_config` — JSON с конфигурацией расписания
- `created_at`, `updated_at` — временные метки
- `is_active` — активно ли расписание

**Примеры `schedule_config`:**

Еженедельное расписание:
```json
{
  "day_of_week": 1,  // Понедельник (0 = воскресенье)
  "time": "09:00",   // Время в формате HH:MM
  "timezone": "UTC"
}
```

Ежедневное расписание:
```json
{
  "time": "09:00",
  "timezone": "UTC"
}
```

Кастомное расписание:
```json
{
  "dates": [
    "2024-01-01T09:00:00Z",
    "2024-01-08T09:00:00Z",
    "2024-01-15T09:00:00Z"
  ]
}
```

**Особенности:**
- Расписание опционально — группа может существовать без расписания
- При отсутствии расписания Tasks идут последовательно без пауз
- При наличии расписания Tasks выходят в назначенное время

---

### 9. Run (Сессия прохождения курса)

**Назначение:** Сессия прохождения курса студентом в рамках группы.

```sql
CREATE SEQUENCE IF NOT EXISTS run_run_id_seq;

CREATE TABLE public.run (
    run_id INT4 NOT NULL DEFAULT nextval('run_run_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    group_id INT4 NOT NULL REFERENCES group(group_id) ON DELETE RESTRICT,
    chat_id INT8 NOT NULL,
    username TEXT,
    course_id INT4 NOT NULL,
    invite_link_id INT4 REFERENCES invite_link(invite_link_id),
    date_inserted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utm_source TEXT,
    utm_campaign TEXT,
    utm_medium TEXT,
    utm_term TEXT,
    utm_content TEXT,
    is_ended BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    ended_at TIMESTAMP,
    metadata JSONB,
    PRIMARY KEY (run_id),
    UNIQUE (bot_id, chat_id) WHERE is_active = TRUE
);

CREATE INDEX idx_run_account ON run (account_id);
CREATE INDEX idx_run_bot ON run (bot_id);
CREATE INDEX idx_run_group ON run (group_id);
CREATE INDEX idx_run_invite_link ON run (invite_link_id);
CREATE INDEX idx_run_chat ON run (bot_id, chat_id);
CREATE INDEX idx_run_course ON run (course_id, account_id);
CREATE INDEX idx_run_active ON run (bot_id, is_active);
CREATE INDEX idx_run_ended ON run (is_ended, ended_at);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- `botname` заменен на `bot_id` (FK → bot)
- `deployment_id` заменен на `group_id` (FK → group)
- `token_id` заменен на `invite_link_id` (FK → invite_link)
- Добавлены расширенные UTM поля
- Добавлен `is_active` для поддержки нескольких завершенных сессий
- Добавлен `ended_at` для отслеживания времени завершения
- Добавлен `metadata` для дополнительных данных
- Добавлено ограничение `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`

**Ограничение:**
- Один студент может иметь только одну активную сессию на одном боте в момент времени
- После завершения (`is_active = FALSE`) можно начать новую сессию
- Сессия привязана к группе, а не к развертыванию курса

---

### 9. Conversation (История взаимодействий)

**Назначение:** История взаимодействий пользователей с элементами курсов.

```sql
CREATE SEQUENCE IF NOT EXISTS conversation_conversation_id_seq;

CREATE TABLE public.conversation (
    conversation_id INT4 NOT NULL DEFAULT nextval('conversation_conversation_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    run_id INT4 NOT NULL REFERENCES run(run_id) ON DELETE CASCADE,
    chat_id INT8 NOT NULL,
    username TEXT,
    course_id TEXT NOT NULL,
    element_id TEXT NOT NULL,
    element_type TEXT NOT NULL,
    role TEXT NOT NULL,  -- user, assistant
    json TEXT NOT NULL,  -- JSON-строка с данными элемента
    report TEXT,  -- текст отчета/ответа пользователя
    score FLOAT4,  -- полученный балл
    maxscore FLOAT4,  -- максимальный балл
    date_inserted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id)
);

CREATE INDEX idx_conversation_account ON conversation (account_id);
CREATE INDEX idx_conversation_run ON conversation (run_id);
CREATE INDEX idx_conversation_chat ON conversation (chat_id);
CREATE INDEX idx_conversation_course ON conversation (course_id, account_id);
CREATE INDEX idx_conversation_element ON conversation (course_id, account_id, element_id);
CREATE INDEX idx_conversation_date ON conversation (date_inserted DESC);
CREATE INDEX idx_conversation_role ON conversation (run_id, role);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- Все остальные поля остаются без изменений для обратной совместимости

---

### 10. WaitingElement (Элементы с задержкой)

**Назначение:** Управление элементами с задержкой отправки (delay elements).

```sql
CREATE SEQUENCE IF NOT EXISTS waiting_element_waiting_element_id_seq;

CREATE TABLE public.waiting_element (
    waiting_element_id INT4 NOT NULL DEFAULT nextval('waiting_element_waiting_element_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    run_id INT4 NOT NULL REFERENCES run(run_id) ON DELETE CASCADE,
    chat_id INT8 NOT NULL,
    waiting_till_date TIMESTAMP NOT NULL,
    is_waiting BOOLEAN DEFAULT TRUE,
    element_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (waiting_element_id)
);

CREATE INDEX idx_waiting_account ON waiting_element (account_id);
CREATE INDEX idx_waiting_bot ON waiting_element (bot_id);
CREATE INDEX idx_waiting_run ON waiting_element (run_id);
CREATE INDEX idx_waiting_active ON waiting_element (is_waiting, waiting_till_date) WHERE is_waiting = TRUE;
CREATE INDEX idx_waiting_date ON waiting_element (waiting_till_date);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- `botname` заменен на `bot_id` (FK → bot)
- Добавлен `run_id` (FK → run) для связи с сессией
- Добавлен `created_at`
- Улучшены индексы для эффективного поиска активных элементов

---

### 11. BannedParticipants (Заблокированные пользователи)

**Назначение:** Управление заблокированными пользователями.

```sql
CREATE SEQUENCE IF NOT EXISTS bannedparticipant_bannedparticipant_id_seq;

CREATE TABLE public.bannedparticipants (
    bannedparticipant_id INT4 NOT NULL DEFAULT nextval('bannedparticipant_bannedparticipant_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    chat_id INT8 NOT NULL,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ban_reason TEXT,
    excluded SMALLINT DEFAULT 0,  -- 1 = исключен из блокировки
    metadata JSONB,  -- дополнительные данные (лимит сообщений, и т.д.)
    PRIMARY KEY (bannedparticipant_id),
    UNIQUE (bot_id, chat_id, excluded)
);

CREATE INDEX idx_banned_account ON bannedparticipants (account_id);
CREATE INDEX idx_banned_bot ON bannedparticipants (bot_id);
CREATE INDEX idx_banned_chat ON bannedparticipants (bot_id, chat_id, excluded);
CREATE INDEX idx_banned_active ON bannedparticipants (bot_id, excluded) WHERE excluded = 0;
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- `botname` заменен на `bot_id` (FK → bot)
- Добавлен `metadata` для дополнительных данных
- Улучшены индексы

---

### 12. CourseParticipants (Участники ограниченных курсов)

**Назначение:** Белые списки пользователей для ограниченных курсов (опционально).

```sql
CREATE SEQUENCE IF NOT EXISTS courseparticipant_courseparticipant_id_seq;

CREATE TABLE public.courseparticipants (
    courseparticipant_id INT4 NOT NULL DEFAULT nextval('courseparticipant_courseparticipant_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    course_id TEXT NOT NULL,
    chat_id INT8,  -- Telegram chat ID
    username TEXT,  -- Telegram username
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT8,  -- Telegram user ID добавившего
    PRIMARY KEY (courseparticipant_id),
    FOREIGN KEY (course_id, account_id) REFERENCES course(course_id, account_id) ON DELETE CASCADE,
    UNIQUE (course_id, account_id, COALESCE(chat_id, 0), COALESCE(username, ''))
);

CREATE INDEX idx_courseparticipants_account ON courseparticipants (account_id);
CREATE INDEX idx_courseparticipants_course ON courseparticipants (course_id, account_id);
CREATE INDEX idx_courseparticipants_chat ON courseparticipants (chat_id);
CREATE INDEX idx_courseparticipants_username ON courseparticipants (username);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- Добавлены `chat_id`, `added_at`, `added_by` для лучшего отслеживания
- Улучшены индексы
- Поддержка как `chat_id`, так и `username` (один из них может быть NULL)

**Примечание:** Эта таблица опциональна и используется только для курсов с `restricted: true`. В большинстве случаев доступ контролируется через `enrollment_token`.

---

### 13. GenSettings (Общие настройки)

**Назначение:** Общие настройки системы (legacy, для обратной совместимости).

```sql
CREATE TABLE public.gen_settings (
    id INT4 PRIMARY KEY,
    account_id INT4 REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 REFERENCES bot(bot_id) ON DELETE CASCADE,
    bot_name TEXT,  -- legacy, для обратной совместимости
    s_key TEXT NOT NULL,
    s_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gen_settings_account ON gen_settings (account_id);
CREATE INDEX idx_gen_settings_bot ON gen_settings (bot_id);
CREATE INDEX idx_gen_settings_key ON gen_settings (account_id, bot_id, s_key);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- Добавлен `bot_id` (FK → bot)
- `bot_name` остается для обратной совместимости
- Добавлены `created_at`, `updated_at`

---

## Диаграмма связей

```
Account
  ├─ AccountMember (1:N)
  ├─ Bot (1:N)
  ├─ Course (1:N)
  │   └─ CourseElement (1:N)  -- Tasks
  │   └─ Group (1:N)
  │        ├─ InviteLink (1:N)
  │        ├─ Schedule (1:1, опционально)
  │        └─ Run (1:N)
  │             └─ Conversation (1:N)
  ├─ Group (1:N)
  ├─ Run (1:N)
  ├─ Conversation (1:N)
  ├─ WaitingElement (1:N)
  ├─ BannedParticipants (1:N)
  └─ CourseParticipants (1:N)

Bot
  ├─ Group (1:N)
  ├─ Run (1:N)
  ├─ WaitingElement (1:N)
  └─ BannedParticipants (1:N)

Group
  ├─ InviteLink (1:N)
  ├─ Schedule (1:1, опционально)
  └─ Run (1:N)
```

---

## Ключевые ограничения и индексы

### Уникальные ограничения

1. **Один активный курс на студента на бота:**
   ```sql
   UNIQUE (bot_id, chat_id) WHERE is_active = TRUE
   ```
   В таблице `run`

2. **Одна группа с таким именем на бота-курс:**
   ```sql
   UNIQUE (bot_id, course_id, name)
   ```
   В таблице `group`

3. **Одно расписание на группу:**
   ```sql
   UNIQUE (group_id)
   ```
   В таблице `schedule`

4. **Уникальный токен пригласительной ссылки:**
   ```sql
   UNIQUE (token)
   ```
   В таблице `invite_link`

4. **Уникальный bot_token:**
   ```sql
   UNIQUE (bot_token)
   ```
   В таблице `bot`

### Важные индексы

1. **Поиск активных сессий:**
   ```sql
   CREATE INDEX idx_run_active ON run (bot_id, is_active);
   ```

2. **Поиск активных элементов ожидания:**
   ```sql
   CREATE INDEX idx_waiting_active ON waiting_element (is_waiting, waiting_till_date) WHERE is_waiting = TRUE;
   ```

3. **Поиск по токену пригласительной ссылки:**
   ```sql
   CREATE INDEX idx_invite_link_token ON invite_link (token);
   ```

4. **Поиск групп курса:**
   ```sql
   CREATE INDEX idx_group_course ON group (course_id);
   ```

5. **Поиск групп бота:**
   ```sql
   CREATE INDEX idx_group_bot ON group (bot_id);
   ```

---

## Миграционная стратегия

### Phase 0 — Подготовка (без изменения поведения)

1. Добавить `account_id` во все таблицы с `DEFAULT 1`
2. Создать таблицу `account` с записью `account_id = 1`
3. Обновить код для подстановки `account_id = 1` везде
4. Добавить индексы на `account_id`

### Phase 1 — Введение Account и AccountMember

1. Создать таблицы `account`, `account_member`
2. Добавить авторизацию через Telegram Web Login
3. Создавать новые аккаунты через панель

### Phase 2 — Разделение Course и Bot через Группы

1. Создать таблицы `bot`, `group`, `invite_link`, `schedule`
2. Мигрировать данные из `course` (убрать `bot_name` из PK)
3. Преобразовать существующие `course_deployment` в `group`
4. Преобразовать существующие `enrollment_token` в `invite_link`
5. Обновить код для работы с группами

### Phase 3 — Миграция Run на Groups

1. Добавить поля `group_id`, `invite_link_id` в таблицу `run` (nullable)
2. Обновить существующие записи `run` для ссылки на группы
3. Обновить формат deep link на `/start=group_<group_id>_<token>`
4. Добавить валидацию пригласительных ссылок перед созданием `run`
5. Сделать `group_id` NOT NULL после завершения миграции данных

### Phase 4 — Multi-Bot

1. Заменить `botname` на `bot_id` в `run`, `waiting_element`, `bannedparticipants`
2. Добавить ограничение `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`
3. Обновить код для работы с `bot_id`

### Phase 5 — Очистка

1. Удалить устаревшие поля (`botname` из `run`, `deployment_id`, `token_id`, и т.д.)
2. Удалить legacy таблицы (`course_deployment`, `enrollment_token`), если они больше не нужны
3. Оптимизировать индексы

---

## Примеры запросов

### Получение активных сессий для аккаунта

```sql
SELECT r.run_id, r.chat_id, r.username, c.title, b.bot_name, g.name as group_name, r.date_inserted
FROM run r
JOIN group g ON r.group_id = g.group_id
JOIN course c ON g.course_id = c.course_id AND g.account_id = c.account_id
JOIN bot b ON r.bot_id = b.bot_id
WHERE r.account_id = $1 AND r.is_active = TRUE
ORDER BY r.date_inserted DESC;
```

### Получение статистики по пригласительным ссылкам

```sql
SELECT 
    COUNT(*) as total_links,
    SUM(il.current_uses) as total_uses,
    AVG(il.current_uses) as avg_uses,
    COUNT(*) FILTER (WHERE il.max_uses IS NOT NULL AND il.current_uses >= il.max_uses) as exhausted_links
FROM invite_link il
JOIN group g ON il.group_id = g.group_id
WHERE g.account_id = $1 AND il.is_active = TRUE;
```

### Получение групп для курса

```sql
SELECT g.group_id, g.name, g.description, b.bot_name, COUNT(r.run_id) as student_count
FROM group g
JOIN bot b ON g.bot_id = b.bot_id
LEFT JOIN run r ON g.group_id = r.group_id AND r.is_active = TRUE
WHERE g.course_id = $1 AND g.account_id = $2 AND g.is_active = TRUE
GROUP BY g.group_id, g.name, g.description, b.bot_name
ORDER BY g.created_at DESC;
```

### Получение прогресса студента

```sql
SELECT 
    c.element_type,
    COUNT(*) as count,
    SUM(conv.score) as total_score,
    SUM(conv.maxscore) as max_score
FROM conversation conv
JOIN run r ON conv.run_id = r.run_id
JOIN course_element c ON conv.element_id = c.element_id 
    AND conv.course_id = c.course_id 
    AND conv.account_id = c.account_id
WHERE r.run_id = $1
GROUP BY c.element_type;
```

### Поиск активных элементов ожидания

```sql
SELECT we.*, r.chat_id, b.bot_name
FROM waiting_element we
JOIN run r ON we.run_id = r.run_id
JOIN bot b ON we.bot_id = b.bot_id
WHERE we.is_waiting = TRUE 
    AND we.waiting_till_date <= NOW()
    AND we.account_id = $1
ORDER BY we.waiting_till_date ASC;
```

---

## Рекомендации по производительности

1. **Партиционирование:** Рассмотреть партиционирование больших таблиц (`conversation`, `run`) по `account_id` или по дате
2. **Архивация:** Архивировать старые данные из `conversation` и `run` (например, старше 1 года)
3. **Кэширование:** Кэшировать часто запрашиваемые данные (курсы, элементы, токены)
4. **Connection Pooling:** Использовать пул подключений для эффективной работы с БД
5. **Read Replicas:** Использовать read replicas для аналитических запросов

---

## Обратная совместимость

### Сохранение совместимости

1. **Legacy поля:** Поля `botname`, `creator_id` остаются для обратной совместимости
2. **Legacy таблицы:** Таблицы `course_deployment` и `enrollment_token` могут оставаться для обратной совместимости во время миграции
3. **Default account:** По умолчанию `account_id = 1` для существующих данных
4. **YAML поддержка:** Поле `yaml` в `course` сохраняется для импорта/экспорта
5. **Nullable поля:** Поля `group_id` и `invite_link_id` в таблице `run` могут быть nullable во время миграции

### Постепенная миграция

1. Новые функции используют новую схему (Groups)
2. Старые функции продолжают работать с legacy полями и таблицами
3. Миграция данных происходит постепенно через скрипты
4. После завершения миграции можно удалить legacy таблицы и сделать поля NOT NULL

---

## Открытые вопросы

1. **Архивация данных:** Как долго хранить историю `conversation`? Нужна ли автоматическая архивация?
2. **Мягкое удаление:** Использовать `is_active = FALSE` или физическое удаление?
3. **Аудит:** Нужна ли таблица для аудита изменений (кто, когда, что изменил)?
4. **Версионирование курсов:** Нужна ли поддержка версий курсов для отката изменений?
5. **Лимиты:** Нужны ли лимиты на количество курсов/ботов/токенов на аккаунт в зависимости от плана?

---

## Заключение

Данная схема обеспечивает:

✅ **Multi-tenancy** через `account`  
✅ **Разделение контента и развертывания** через `group` (группы)  
✅ **Гибкое управление доступом** через `invite_link` (пригласительные ссылки)  
✅ **Управление расписанием** через `schedule` (опциональное расписание для групп)  
✅ **Масштабируемость** через правильные индексы и ограничения  
✅ **Обратную совместимость** с существующими данными  
✅ **Гибкость** для будущих расширений через JSONB поля

**Ключевые изменения:**
- Связь Бот ↔ Курс теперь только через Группы (не напрямую)
- Пригласительные ссылки привязаны к группам, а не к развертываниям
- Опциональное расписание для управления временем выхода задач
- Более понятная модель для образовательных сценариев

Схема готова к поэтапной миграции без нарушения работы существующей системы. Подробнее см. `docs/reqs/groups_model.md`.
