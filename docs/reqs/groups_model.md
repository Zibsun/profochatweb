# Введение концепции Групп в ProfoChatBot

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Требования к реализации  
**Основано на:** `PRD.md`, `database_schema_saas.md`

---

## Обзор изменений

В продукт вводится понятие **Группы** (Group) — центральной сущности, которая объединяет студентов, проходящих конкретный Курс через конкретного Бота. Это изменение делает модель более понятной для реальных образовательных сценариев и устраняет дублирование логики между ботами и курсами.

### Ключевые изменения

1. **Введение концепции Группы** — контейнер исполнения курса
2. **Удаление прямой связи Бот ↔ Курс** — связь теперь только через Группы
3. **Переименование Section → Task** — более точное отражение смысла учебной единицы
4. **Пригласительные ссылки для групп** — замена токенов развертывания
5. **Опциональное расписание для групп** — управление временем выхода задач

---

## Новая модель данных

### Концептуальная схема

```
Course (Курс)
  └─ Описывает содержание (контент и последовательность Tasks)

Bot (Бот)
  └─ Канал доставки в Telegram

Group (Группа)
  ├─ Связывает: Bot + Course + Students + Schedule (опционально)
  ├─ Invite Link (пригласительная ссылка)
  └─ Контейнер исполнения курса

Task (Задача)
  └─ Минимальная учебная единица (бывшая Section)

Run (Сессия)
  └─ Привязана к Group, а не к Deployment
```

### Логика работы

**До изменений:**
- Бот ↔ Курс связывались напрямую через `CourseDeployment`
- Токены привязывались к `CourseDeployment`
- Учебные единицы назывались `Section`

**После изменений:**
- Бот ↔ Курс связываются только через `Group`
- Пригласительные ссылки привязываются к `Group`
- Учебные единицы называются `Task`
- Группа может иметь опциональное расписание для управления временем выхода задач

---

## Детальное описание изменений

### 1. Группа (Group)

**Назначение:** Контейнер исполнения курса, объединяющий бота, курс, студентов и опциональное расписание.

**Ключевые характеристики:**
- Группа связывает один Бот с одним Курсом
- В группе может быть множество студентов
- У группы может быть одно или несколько пригласительных ссылок
- У группы может быть опциональное расписание для управления временем выхода задач
- Один бот может иметь несколько групп с разными курсами

**Примеры использования:**
- Группа "Python Basics - Group A" на боте @learnbot с курсом "Python Basics"
- Группа "English Advanced - Evening" на том же боте с курсом "English Advanced"
- Группа "Math 101 - Spring 2024" на боте @mathbot с курсом "Math 101"

### 2. Пригласительная ссылка (Invite Link)

**Назначение:** Способ набора студентов в группу.

**Ключевые характеристики:**
- Каждая группа имеет одну или несколько пригласительных ссылок
- Ссылка имеет опциональный лимит использования (`max_uses`)
- При переходе по ссылке пользователь автоматически записывается в группу
- Формат ссылки: `https://t.me/<bot_username>?start=group_<group_id>_<invite_token>`

**Отличия от EnrollmentToken:**
- Привязывается к `Group`, а не к `CourseDeployment`
- Проще логика: одна ссылка = одна группа
- Может быть несколько ссылок для одной группы (например, для разных источников)

### 3. Расписание (Schedule)

**Назначение:** Опциональное расписание для управления временем выхода задач (Tasks).

**Ключевые характеристики:**
- Расписание привязано к группе
- Управляет временем выхода отдельных учебных единиц (Tasks)
- При отсутствии расписания Tasks идут последовательно без пауз
- Расписание может быть:
  - Еженедельным (например, новая задача каждый понедельник)
  - Ежедневным (например, новая задача каждый день в 9:00)
  - Кастомным (например, задачи выходят в определенные даты)

**Примеры:**
- Группа без расписания: задачи идут последовательно, как только студент завершает предыдущую
- Группа с еженедельным расписанием: новая задача выходит каждый понедельник в 9:00
- Группа с кастомным расписанием: задачи выходят 1, 8, 15, 22 числа каждого месяца

### 4. Задача (Task)

**Назначение:** Минимальная учебная единица, которую студент выполняет внутри группы.

**Изменения:**
- Переименование `Section` → `Task` для лучшего отражения смысла
- Task остается той же сущностью, что и Section (элемент курса)
- Изменение касается только терминологии в документации и интерфейсах

---

## Изменения в схеме базы данных

### Новые таблицы

#### 1. Group (Группа)

```sql
CREATE SEQUENCE IF NOT EXISTS group_group_id_seq;

CREATE TABLE public.group (
    group_id INT4 NOT NULL DEFAULT nextval('group_group_id_seq'::regclass),
    account_id INT4 NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
    bot_id INT4 NOT NULL REFERENCES bot(bot_id) ON DELETE CASCADE,
    course_id INT4 NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
    name TEXT NOT NULL,  -- Название группы (например, "Python Basics - Group A")
    description TEXT,  -- Описание группы
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,  -- Дополнительные настройки группы
    PRIMARY KEY (group_id),
    UNIQUE (bot_id, course_id, name)  -- Одна группа с таким именем на бота-курс
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

#### 2. InviteLink (Пригласительная ссылка)

```sql
CREATE SEQUENCE IF NOT EXISTS invite_link_invite_link_id_seq;

CREATE TABLE public.invite_link (
    invite_link_id INT4 NOT NULL DEFAULT nextval('invite_link_invite_link_id_seq'::regclass),
    group_id INT4 NOT NULL REFERENCES group(group_id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,  -- Уникальный токен для ссылки
    max_uses INT4,  -- Максимальное количество использований (NULL = без ограничений)
    current_uses INT4 DEFAULT 0,  -- Текущее количество использований
    expires_at TIMESTAMP,  -- Срок действия (NULL = без срока)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT8,  -- Telegram user ID создателя
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB,  -- Дополнительные данные (UTM, источник, и т.д.)
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
- `max_uses` — максимальное количество использований
- `current_uses` — текущее количество использований
- `expires_at` — срок действия
- `created_at` — дата создания
- `created_by` — Telegram user ID создателя
- `is_active` — активна ли ссылка
- `metadata` — JSON с дополнительными данными (UTM, источник, и т.д.)

**Формат deep link:**
```
https://t.me/<bot_username>?start=group_<group_id>_<token>
```

#### 3. Schedule (Расписание)

```sql
CREATE SEQUENCE IF NOT EXISTS schedule_schedule_id_seq;

CREATE TABLE public.schedule (
    schedule_id INT4 NOT NULL DEFAULT nextval('schedule_schedule_id_seq'::regclass),
    group_id INT4 NOT NULL REFERENCES group(group_id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL,  -- weekly, daily, custom
    schedule_config JSONB NOT NULL,  -- Конфигурация расписания
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (schedule_id),
    UNIQUE (group_id)  -- Одно расписание на группу
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

### Изменения существующих таблиц

#### 1. Run (Сессия прохождения курса)

**Изменения:**
- Удалить `deployment_id` (FK → course_deployment)
- Добавить `group_id` (FK → group)
- Удалить `token_id` (FK → enrollment_token)
- Добавить `invite_link_id` (FK → invite_link)

```sql
-- Удалить старые поля
ALTER TABLE run DROP COLUMN IF EXISTS deployment_id;
ALTER TABLE run DROP COLUMN IF EXISTS token_id;

-- Добавить новые поля
ALTER TABLE run ADD COLUMN group_id INT4 REFERENCES group(group_id) ON DELETE RESTRICT;
ALTER TABLE run ADD COLUMN invite_link_id INT4 REFERENCES invite_link(invite_link_id);

-- Обновить индексы
CREATE INDEX idx_run_group ON run (group_id);
CREATE INDEX idx_run_invite_link ON run (invite_link_id);
DROP INDEX IF EXISTS idx_run_deployment;
```

**Ограничение остается:**
- `UNIQUE (bot_id, chat_id) WHERE is_active = TRUE` — один активный курс на студента на бота

#### 2. CourseElement (Элемент курса)

**Изменения:**
- Переименование терминологии: `Section` → `Task` (только в документации и интерфейсах)
- Структура таблицы не меняется
- Поле `element_id` остается без изменений

**Примечание:** Переименование касается только терминологии. В базе данных структура остается прежней, но в документации, интерфейсах и API используется термин "Task" вместо "Section".

### Удаляемые таблицы

#### 1. CourseDeployment (Развертывание курса)

**Статус:** Удаляется, заменяется на `Group`

**Миграция:**
- Существующие `CourseDeployment` преобразуются в `Group`
- Для каждого `CourseDeployment` создается соответствующая `Group`
- Данные из `CourseDeployment` переносятся в `Group`

#### 2. EnrollmentToken (Токен приглашения)

**Статус:** Удаляется, заменяется на `InviteLink`

**Миграция:**
- Существующие `EnrollmentToken` преобразуются в `InviteLink`
- Для каждого `EnrollmentToken` создается соответствующий `InviteLink`
- Данные из `EnrollmentToken` переносятся в `InviteLink`

---

## Изменения в логике приложения

### 1. Создание группы

**Процесс:**
1. Пользователь выбирает Бота и Курс
2. Создается Группа с указанным названием
3. Автоматически создается первая пригласительная ссылка (опционально)
4. Можно добавить расписание (опционально)

**API:**
```
POST /api/v1/groups
{
  "bot_id": 1,
  "course_id": 1,
  "name": "Python Basics - Group A",
  "description": "Группа для изучения основ Python",
  "create_default_invite": true,
  "schedule": {
    "type": "weekly",
    "config": {
      "day_of_week": 1,
      "time": "09:00",
      "timezone": "UTC"
    }
  }
}
```

### 2. Начало курса через пригласительную ссылку

**Процесс:**
1. Пользователь переходит по ссылке `https://t.me/<bot>?start=group_<group_id>_<token>`
2. Бот получает команду `/start group_<group_id>_<token>`
3. Система проверяет:
   - Существует ли группа
   - Активна ли группа
   - Валидна ли пригласительная ссылка
   - Не превышен ли лимит использований (`max_uses`)
   - Не истекла ли ссылка (`expires_at`)
4. Если все проверки пройдены:
   - Увеличивается `current_uses` у пригласительной ссылки
   - Создается `Run` с привязкой к `Group` и `InviteLink`
   - Студент начинает прохождение курса

**Изменения в обработчике `/start`:**
- Старый формат: `/start cd_<deployment_id>_<token>`
- Новый формат: `/start group_<group_id>_<token>`

### 3. Управление расписанием

**Процесс:**
1. Если у группы есть расписание:
   - Система проверяет расписание через планировщик (APScheduler)
   - В назначенное время отправляется следующая Task студентам группы
   - Студенты не могут перейти к следующей Task до назначенного времени
2. Если у группы нет расписания:
   - Tasks идут последовательно без пауз
   - Студент может перейти к следующей Task сразу после завершения предыдущей

**Реализация:**
- Использовать APScheduler для проверки расписания
- Хранить состояние "ожидание следующей Task" в таблице `waiting_element` или новой таблице `scheduled_task`

### 4. Переименование Section → Task

**Изменения:**
- В документации: все упоминания `Section` заменяются на `Task`
- В API: endpoints `/sections` → `/tasks`
- В интерфейсах: "Section" → "Task"
- В базе данных: структура не меняется, только терминология

---

## Изменения в документации

### 1. PRD.md

**Секция 2.1.3 Структура курса:**
- Заменить упоминания "Section" на "Task"
- Обновить описание: "Курс состоит из последовательности задач (Tasks)"

**Секция 2.3.1 Регистрация и начало курса:**
- Обновить формат команды `/start`: `group_<group_id>_<token>` вместо `cd_<deployment_id>_<token>`
- Обновить описание процесса: упоминать группы вместо развертываний

**Секция 2.7 Мультиботовая архитектура:**
- Добавить описание концепции групп
- Объяснить, что связь Бот ↔ Курс теперь только через группы

**Новая секция 2.8 Группы:**
- Описание концепции групп
- Процесс создания группы
- Управление пригласительными ссылками
- Управление расписанием

**Секция 4.3 База данных:**
- Обновить схему: добавить таблицы `group`, `invite_link`, `schedule`
- Удалить упоминания `course_deployment`, `enrollment_token`
- Обновить описание таблицы `run`: привязка к группе вместо развертывания

**Секция 10. Глоссарий:**
- Добавить определения:
  - **Group** — контейнер исполнения курса, объединяющий бота, курс, студентов и опциональное расписание
  - **Invite Link** — пригласительная ссылка для записи студентов в группу
  - **Schedule** — расписание для управления временем выхода задач
  - **Task** — минимальная учебная единица (бывшая Section)
- Обновить определение:
  - **Run** — сессия прохождения курса пользователем в рамках группы

### 2. database_schema_saas.md

**Изменения:**
- Удалить секции про `CourseDeployment` и `EnrollmentToken`
- Добавить секции про `Group`, `InviteLink`, `Schedule`
- Обновить диаграмму связей
- Обновить примеры запросов

### 3. courses_page_redesign.md

**Секция 2.1.1 Колонка "Подключенные боты":**
- Обновить описание: вместо "развертывания" использовать "группы"
- Текст: "Отображает список ботов, на которых курс развернут через группы"

**Секция 3.2 Удаление курса:**
- Обновить проверку зависимостей: проверять наличие групп вместо развертываний
- Текст ошибки: "Cannot delete course. This course is connected to one or more groups. Please remove all groups before deleting the course."

### 4. multiple_telegram_bots.md

**Обновления:**
- Добавить описание концепции групп
- Объяснить, как группы работают в мультиботовой архитектуре

---

## План миграции

### Phase 1: Подготовка (без изменения поведения)

1. Создать новые таблицы: `group`, `invite_link`, `schedule`
2. Добавить поля `group_id`, `invite_link_id` в таблицу `run` (nullable)
3. Обновить код для поддержки обеих моделей (legacy и новая)

### Phase 2: Миграция данных

1. Преобразовать существующие `CourseDeployment` в `Group`:
   ```sql
   INSERT INTO group (account_id, bot_id, course_id, name, created_at, is_active)
   SELECT 
     cd.account_id,
     cd.bot_id,
     cd.course_id,
     CONCAT(c.title, ' - Deployment ', cd.deployment_id) as name,
     cd.created_at,
     cd.is_active
   FROM course_deployment cd
   JOIN course c ON cd.course_id = c.course_id AND cd.account_id = c.account_id;
   ```

2. Преобразовать существующие `EnrollmentToken` в `InviteLink`:
   ```sql
   INSERT INTO invite_link (group_id, token, max_uses, current_uses, expires_at, created_at, created_by, is_active, metadata)
   SELECT 
     g.group_id,
     et.token,
     et.max_uses,
     et.current_uses,
     et.expires_at,
     et.created_at,
     et.created_by,
     et.is_active,
     et.metadata
   FROM enrollment_token et
   JOIN course_deployment cd ON et.deployment_id = cd.deployment_id
   JOIN group g ON cd.bot_id = g.bot_id AND cd.course_id = g.course_id AND cd.account_id = g.account_id;
   ```

3. Обновить существующие `Run`:
   ```sql
   UPDATE run r
   SET group_id = g.group_id,
       invite_link_id = il.invite_link_id
   FROM course_deployment cd
   JOIN group g ON cd.bot_id = g.bot_id AND cd.course_id = g.course_id AND cd.account_id = g.account_id
   LEFT JOIN enrollment_token et ON r.token_id = et.token_id
   LEFT JOIN invite_link il ON et.token = il.token AND il.group_id = g.group_id
   WHERE r.deployment_id = cd.deployment_id;
   ```

### Phase 3: Обновление кода

1. Обновить обработчик `/start` для поддержки нового формата `group_<group_id>_<token>`
2. Обновить API endpoints для работы с группами
3. Обновить веб-интерфейс для управления группами
4. Обновить логику расписания

### Phase 4: Переименование Section → Task

1. Обновить документацию
2. Обновить API endpoints
3. Обновить интерфейсы
4. Обновить код (переменные, функции, классы)

### Phase 5: Очистка

1. Удалить таблицы `course_deployment`, `enrollment_token`
2. Удалить поля `deployment_id`, `token_id` из таблицы `run`
3. Удалить legacy код

---

## Примеры использования

### Пример 1: Создание группы без расписания

```python
# Создание группы
group = create_group(
    account_id=1,
    bot_id=1,
    course_id=1,
    name="Python Basics - Group A",
    description="Группа для изучения основ Python"
)

# Создание пригласительной ссылки
invite_link = create_invite_link(
    group_id=group.group_id,
    max_uses=50,  # Лимит 50 студентов
    expires_at=None  # Без срока действия
)

# Формирование ссылки
link = f"https://t.me/{bot.username}?start=group_{group.group_id}_{invite_link.token}"
```

### Пример 2: Создание группы с еженедельным расписанием

```python
# Создание группы
group = create_group(
    account_id=1,
    bot_id=1,
    course_id=1,
    name="Python Basics - Weekly",
    description="Группа с еженедельным расписанием"
)

# Создание расписания
schedule = create_schedule(
    group_id=group.group_id,
    schedule_type="weekly",
    schedule_config={
        "day_of_week": 1,  # Понедельник
        "time": "09:00",
        "timezone": "UTC"
    }
)

# Создание пригласительной ссылки
invite_link = create_invite_link(
    group_id=group.group_id,
    max_uses=None,  # Без ограничений
    expires_at=None
)
```

### Пример 3: Начало курса через пригласительную ссылку

```python
# Обработчик команды /start group_123_abc123
async def handle_start_group(message: Message, group_id: int, token: str):
    # Проверка группы
    group = get_group(group_id)
    if not group or not group.is_active:
        await message.answer("Группа не найдена или неактивна")
        return
    
    # Проверка пригласительной ссылки
    invite_link = get_invite_link_by_token(token)
    if not invite_link or invite_link.group_id != group_id:
        await message.answer("Неверная пригласительная ссылка")
        return
    
    if invite_link.expires_at and invite_link.expires_at < datetime.now():
        await message.answer("Срок действия ссылки истек")
        return
    
    if invite_link.max_uses and invite_link.current_uses >= invite_link.max_uses:
        await message.answer("Достигнут лимит использований ссылки")
        return
    
    # Создание сессии
    run = create_run(
        account_id=group.account_id,
        bot_id=group.bot_id,
        group_id=group.group_id,
        course_id=group.course_id,
        chat_id=message.chat.id,
        username=message.from_user.username,
        invite_link_id=invite_link.invite_link_id
    )
    
    # Увеличение счетчика использований
    increment_invite_link_uses(invite_link.invite_link_id)
    
    # Отправка первого элемента курса
    await send_first_element(message, run)
```

---

## Преимущества новой модели

1. **Понятность для образовательных сценариев:**
   - Группы — естественная концепция для образовательных процессов
   - Расписание — стандартная функция для курсов с дедлайнами
   - Пригласительные ссылки — простой способ набора студентов

2. **Гибкость:**
   - Один бот может иметь несколько групп с разными курсами
   - Один курс может быть в нескольких группах на одном боте
   - Гибкое управление расписанием

3. **Упрощение логики:**
   - Устранение дублирования между ботами и курсами
   - Прямая связь между группой и студентами
   - Простая модель пригласительных ссылок

4. **Масштабируемость:**
   - Легко добавлять новые функции для групп
   - Простое управление расписанием
   - Гибкая система пригласительных ссылок

---

## Риски и митигация

### Риск 1: Сложность миграции данных

**Вероятность:** Средняя  
**Влияние:** Высокое  
**Митигация:**
- Поэтапная миграция с поддержкой обеих моделей
- Тщательное тестирование миграционных скриптов
- Резервное копирование данных перед миграцией

### Риск 2: Изменение формата deep links

**Вероятность:** Высокая  
**Влияние:** Среднее  
**Митигация:**
- Поддержка старого формата в течение переходного периода
- Автоматическое перенаправление со старого формата на новый
- Уведомление пользователей о новом формате ссылок

### Риск 3: Переименование Section → Task

**Вероятность:** Низкая  
**Влияние:** Низкое  
**Митигация:**
- Постепенное переименование в документации и интерфейсах
- Сохранение обратной совместимости в API (поддержка обоих терминов)

---

## Заключение

Введение концепции Групп делает модель данных более понятной и соответствующей реальным образовательным сценариям. Изменения устраняют дублирование логики между ботами и курсами и предоставляют гибкие инструменты для управления образовательными процессами.

**Ключевые преимущества:**
- ✅ Понятная модель для образовательных сценариев
- ✅ Гибкое управление расписанием
- ✅ Простая система пригласительных ссылок
- ✅ Устранение дублирования логики

**Следующие шаги:**
1. Обсуждение и утверждение требований
2. Разработка детального плана миграции
3. Реализация новых таблиц и миграционных скриптов
4. Обновление кода и API
5. Тестирование и развертывание

---

**Дата создания:** 2024  
**Статус:** Требования готовы к обсуждению  
**Следующие шаги:** 
1. Обсуждение и утверждение требований
2. Разработка детального плана миграции
3. Реализация новых таблиц
4. Обновление кода и API
5. Тестирование всех сценариев использования
