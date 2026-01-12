# Схема базы данных для SaaS архитектуры ProfoChatBot

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Предложение для реализации

## Обзор

Данный документ описывает новую схему базы данных для перехода ProfoChatBot к multi-tenant SaaS архитектуре. Схема обеспечивает:

- **Multi-tenancy** через таблицу `account`
- **Разделение курсов и ботов** через `course_deployment`
- **Управление доступом** через `enrollment_token`
- **Авторизацию создателей** через `account_member`
- **Обратную совместимость** с существующими данными

---

## Архитектурные принципы

### 1. Multi-Tenancy
- Каждый аккаунт (tenant) изолирован через `account_id`
- Все сущности привязаны к аккаунту
- По умолчанию `account_id = 1` для существующих данных

### 2. Разделение контента и развертывания
- **Course** — логический курс (контент)
- **Bot** — Telegram-бот (инфраструктура)
- **CourseDeployment** — связь курса с ботом в конкретном окружении

### 3. Ограничения
- Один активный курс на студента на бота: `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`
- Токены привязываются к deployment, а не к курсу напрямую

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

### 6. CourseDeployment (Развертывание курса)

**Назначение:** Связь курса с ботом в конкретном окружении (prod/test).

```sql
CREATE SEQUENCE IF NOT EXISTS course_deployment_deployment_id_seq;

CREATE TABLE public.course_deployment (
    deployment_id INT4 NOT NULL DEFAULT nextval('course_deployment_deployment_id_seq'::regclass),
    course_id TEXT NOT NULL,
    account_id INT4 NOT NULL,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    environment TEXT DEFAULT 'prod',  -- prod, test, staging
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB,  -- environment-specific настройки
    PRIMARY KEY (deployment_id),
    FOREIGN KEY (course_id, account_id) REFERENCES course(course_id, account_id) ON DELETE CASCADE,
    UNIQUE (bot_id, course_id, account_id, environment)  -- один курс на бота в окружении
);

CREATE INDEX idx_deployment_course ON course_deployment (course_id, account_id);
CREATE INDEX idx_deployment_bot ON course_deployment (bot_id);
CREATE INDEX idx_deployment_active ON course_deployment (bot_id, is_active);
```

**Поля:**
- `deployment_id` — уникальный идентификатор развертывания
- `course_id`, `account_id` — FK → course
- `bot_id` — FK → bot
- `environment` — окружение: prod, test, staging
- `is_active` — активно ли развертывание
- `created_at`, `updated_at` — временные метки
- `settings` — JSON с настройками развертывания

**Ограничения:**
- Один курс может быть развернут на одном боте в одном окружении
- Один курс может быть развернут на разных ботах или в разных окружениях

---

### 7. EnrollmentToken (Токен приглашения)

**Назначение:** Токены для приглашения студентов в курсы.

```sql
CREATE SEQUENCE IF NOT EXISTS enrollment_token_token_id_seq;

CREATE TABLE public.enrollment_token (
    token_id INT4 NOT NULL DEFAULT nextval('enrollment_token_token_id_seq'::regclass),
    deployment_id INT4 NOT NULL REFERENCES course_deployment(deployment_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,  -- уникальный токен
    token_type TEXT DEFAULT 'public',  -- public, group, personal, external
    max_uses INT4,  -- максимальное количество использований (NULL = без ограничений)
    current_uses INT4 DEFAULT 0,
    expires_at TIMESTAMP,  -- срок действия (NULL = без срока)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT8,  -- Telegram user ID создателя
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,  -- дополнительные данные (UTM, группа, и т.д.)
    PRIMARY KEY (token_id)
);

CREATE INDEX idx_token_deployment ON enrollment_token (deployment_id);
CREATE INDEX idx_token_token ON enrollment_token (token);
CREATE INDEX idx_token_active ON enrollment_token (deployment_id, is_active);
CREATE INDEX idx_token_expires ON enrollment_token (expires_at) WHERE expires_at IS NOT NULL;
```

**Поля:**
- `token_id` — уникальный идентификатор
- `deployment_id` — FK → course_deployment
- `token` — уникальный токен (используется в deep link)
- `token_type` — тип: public, group, personal, external
- `max_uses` — максимальное количество использований
- `current_uses` — текущее количество использований
- `expires_at` — срок действия
- `created_at` — дата создания
- `created_by` — Telegram user ID создателя
- `is_active` — активен ли токен
- `metadata` — JSON с дополнительными данными (UTM, группа, и т.д.)

**Формат deep link:**
```
https://t.me/<bot_username>?start=cd_<deployment_id>_<token>
```

**Типы токенов:**
- `public` — открытая ссылка, без ограничений
- `group` — групповая ссылка, ограничение по `max_uses`
- `personal` — персональная ссылка (одноразовая или многоразовая)
- `external` — для интеграций с LMS/CRM/SSO

---

### 8. Run (Сессия прохождения курса)

**Назначение:** Сессия прохождения курса студентом.

```sql
CREATE SEQUENCE IF NOT EXISTS run_run_id_seq;

CREATE TABLE public.run (
    run_id INT4 NOT NULL DEFAULT nextval('run_run_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    deployment_id INT4 NOT NULL REFERENCES course_deployment(deployment_id) ON DELETE RESTRICT,
    chat_id INT8 NOT NULL,
    username TEXT,
    course_id TEXT NOT NULL,
    token_id INT4 REFERENCES enrollment_token(token_id),  -- через какой токен зашел
    date_inserted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utm_source TEXT,
    utm_campaign TEXT,
    utm_medium TEXT,
    utm_term TEXT,
    utm_content TEXT,
    is_ended BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,  -- активна ли сессия
    ended_at TIMESTAMP,
    metadata JSONB,  -- дополнительные данные
    PRIMARY KEY (run_id),
    UNIQUE (bot_id, chat_id) WHERE is_active = TRUE  -- один активный курс на студента на бота
);

CREATE INDEX idx_run_account ON run (account_id);
CREATE INDEX idx_run_bot ON run (bot_id);
CREATE INDEX idx_run_deployment ON run (deployment_id);
CREATE INDEX idx_run_chat ON run (bot_id, chat_id);
CREATE INDEX idx_run_course ON run (course_id, account_id);
CREATE INDEX idx_run_active ON run (bot_id, is_active);
CREATE INDEX idx_run_ended ON run (is_ended, ended_at);
```

**Изменения от текущей схемы:**
- Добавлен `account_id`
- `botname` заменен на `bot_id` (FK → bot)
- Добавлен `deployment_id` (FK → course_deployment)
- Добавлен `token_id` (FK → enrollment_token)
- Добавлены расширенные UTM поля
- Добавлен `is_active` для поддержки нескольких завершенных сессий
- Добавлен `ended_at` для отслеживания времени завершения
- Добавлен `metadata` для дополнительных данных
- Добавлено ограничение `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`

**Ограничение:**
- Один студент может иметь только одну активную сессию на одном боте в момент времени
- После завершения (`is_active = FALSE`) можно начать новую сессию

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
  │   └─ CourseElement (1:N)
  │   └─ CourseDeployment (1:N)
  │        ├─ EnrollmentToken (1:N)
  │        └─ Run (1:N)
  │             └─ Conversation (1:N)
  ├─ Run (1:N)
  ├─ Conversation (1:N)
  ├─ WaitingElement (1:N)
  ├─ BannedParticipants (1:N)
  └─ CourseParticipants (1:N)

Bot
  ├─ CourseDeployment (1:N)
  ├─ Run (1:N)
  ├─ WaitingElement (1:N)
  └─ BannedParticipants (1:N)

CourseDeployment
  ├─ EnrollmentToken (1:N)
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

2. **Один курс на бота в окружении:**
   ```sql
   UNIQUE (bot_id, course_id, account_id, environment)
   ```
   В таблице `course_deployment`

3. **Уникальный токен:**
   ```sql
   UNIQUE (token)
   ```
   В таблице `enrollment_token`

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

3. **Поиск по токену:**
   ```sql
   CREATE INDEX idx_token_token ON enrollment_token (token);
   ```

4. **Поиск развертываний курса:**
   ```sql
   CREATE INDEX idx_deployment_course ON course_deployment (course_id, account_id);
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

### Phase 2 — Разделение Course и Bot

1. Создать таблицы `bot`, `course_deployment`
2. Мигрировать данные из `course` (убрать `bot_name` из PK)
3. Создать `course_deployment` для существующих связей курс-бот
4. Обновить код для работы с `course_deployment`

### Phase 3 — EnrollmentToken

1. Создать таблицу `enrollment_token`
2. Обновить формат deep link на `/start=cd_<deployment>_<token>`
3. Добавить валидацию токенов перед созданием `run`

### Phase 4 — Multi-Bot

1. Заменить `botname` на `bot_id` в `run`, `waiting_element`, `bannedparticipants`
2. Добавить ограничение `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE`
3. Обновить код для работы с `bot_id`

### Phase 5 — Очистка

1. Удалить устаревшие поля (`botname` из `run`, и т.д.)
2. Удалить legacy таблицы, если они больше не нужны
3. Оптимизировать индексы

---

## Примеры запросов

### Получение активных сессий для аккаунта

```sql
SELECT r.run_id, r.chat_id, r.username, c.title, b.bot_name, r.date_inserted
FROM run r
JOIN course_deployment cd ON r.deployment_id = cd.deployment_id
JOIN course c ON cd.course_id = c.course_id AND cd.account_id = c.account_id
JOIN bot b ON r.bot_id = b.bot_id
WHERE r.account_id = $1 AND r.is_active = TRUE
ORDER BY r.date_inserted DESC;
```

### Получение статистики по токенам

```sql
SELECT 
    et.token_type,
    COUNT(*) as total_tokens,
    SUM(et.current_uses) as total_uses,
    AVG(et.current_uses) as avg_uses
FROM enrollment_token et
JOIN course_deployment cd ON et.deployment_id = cd.deployment_id
WHERE cd.account_id = $1 AND et.is_active = TRUE
GROUP BY et.token_type;
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
2. **Default account:** По умолчанию `account_id = 1` для существующих данных
3. **YAML поддержка:** Поле `yaml` в `course` сохраняется для импорта/экспорта

### Постепенная миграция

1. Новые функции используют новую схему
2. Старые функции продолжают работать с legacy полями
3. Миграция данных происходит постепенно через скрипты

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
✅ **Разделение контента и развертывания** через `course_deployment`  
✅ **Гибкое управление доступом** через `enrollment_token`  
✅ **Масштабируемость** через правильные индексы и ограничения  
✅ **Обратную совместимость** с существующими данными  
✅ **Гибкость** для будущих расширений через JSONB поля

Схема готова к поэтапной миграции без нарушения работы существующей системы.
