# Связь участников курсов с пригласительными ссылками и группами

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Требования к реализации  
**Основано на:** `groups_model.md`, `database_schema_saas.md`

---

## Обзор

Таблица `courseparticipants` должна быть связана с таблицей `invite_link` и таблицей `course_group`. Это позволит отслеживать, через какую пригласительную ссылку участник присоединился к группе курса, и к какой конкретной группе он относится.

### Назначение изменений

- Отслеживание источника присоединения участника (через какую invite link)
- Связь участника с конкретной группой курса (`course_group`)
- Улучшение аналитики и отчетности по группам и пригласительным ссылкам
- Поддержка модели, где участники присоединяются к группам через invite links

---

## Текущая структура

### Таблица `courseparticipants`

**Текущие поля:**
- `courseparticipant_id` (PK)
- `course_code` (legacy)
- `username`
- `account_id` (FK → account)
- `chat_id`
- `added_at`
- `added_by`
- `course_id` (FK → course)

**Текущие связи:**
- С `account` через `account_id`
- С `course` через `course_id`

**Ограничения:**
- Нет связи с `invite_link` — невозможно узнать, через какую ссылку присоединился участник
- Нет связи с `course_group` — невозможно определить, к какой группе относится участник

---

## Предлагаемые изменения

### 1. Добавление связи с `invite_link`

**Новое поле:**
- `invite_link_id` (INT4, FK → invite_link.invite_link_id, NULLABLE)

**Назначение:**
- Хранит идентификатор пригласительной ссылки, через которую участник присоединился к группе
- Может быть NULL для участников, добавленных вручную или через другие механизмы

**Ограничения:**
- FOREIGN KEY с `ON DELETE SET NULL` (если ссылка удаляется, участник остается, но связь теряется)
- Или `ON DELETE RESTRICT` (запрет удаления ссылки, если есть участники)

### 2. Добавление связи с `course_group`

**Новое поле:**
- `course_group_id` (INT4, FK → course_group.course_group_id, NULLABLE или NOT NULL)

**Назначение:**
- Хранит идентификатор группы курса, к которой относится участник
- Позволяет определить конкретную группу, а не только курс

**Ограничения:**
- FOREIGN KEY с `ON DELETE CASCADE` (если группа удаляется, участники также удаляются)
- Или `ON DELETE RESTRICT` (запрет удаления группы с участниками)

**Вопрос для обсуждения:**
- Должно ли поле быть обязательным (NOT NULL) или опциональным (NULLABLE)?
- Если участник может быть добавлен без группы, то NULLABLE
- Если каждый участник должен быть в группе, то NOT NULL

---

## Новая структура таблицы

```sql
CREATE TABLE public.courseparticipants (
    courseparticipant_id INT4 DEFAULT nextval('courseparticipant_id_seq'::regclass) NOT NULL,
    course_code TEXT NOT NULL,  -- legacy
    username TEXT NOT NULL,
    account_id INT4 DEFAULT 1 NOT NULL,
    chat_id INT8 NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    added_by INT8 NULL,
    course_id INT4 NOT NULL,
    invite_link_id INT4 NULL,  -- NEW: связь с invite_link
    course_group_id INT4 NULL,  -- NEW: связь с course_group
    CONSTRAINT courseparticipants_pkey PRIMARY KEY (courseparticipant_id),
    CONSTRAINT courseparticipants_account_id_fkey 
        FOREIGN KEY (account_id) REFERENCES public.account(account_id) ON DELETE CASCADE,
    CONSTRAINT courseparticipants_course_fkey 
        FOREIGN KEY (course_id) REFERENCES public.course(course_id) ON DELETE CASCADE,
    CONSTRAINT courseparticipants_invite_link_fkey 
        FOREIGN KEY (invite_link_id) REFERENCES public.invite_link(invite_link_id) ON DELETE SET NULL,  -- NEW
    CONSTRAINT courseparticipants_course_group_fkey 
        FOREIGN KEY (course_group_id) REFERENCES public.course_group(course_group_id) ON DELETE CASCADE  -- NEW
);
```

### Новые индексы

```sql
CREATE INDEX idx_courseparticipants_invite_link 
    ON public.courseparticipants (invite_link_id);

CREATE INDEX idx_courseparticipants_course_group 
    ON public.courseparticipants (course_group_id);

CREATE INDEX idx_courseparticipants_group_account 
    ON public.courseparticipants (course_group_id, account_id);
```

---

## Логика работы

### Сценарий 1: Присоединение через invite link

1. Пользователь переходит по invite link: `https://t.me/<bot_username>?start=group_<group_id>_<token>`
2. Система определяет `invite_link_id` по токену
3. Система определяет `course_group_id` из `invite_link.course_group_id`
4. Система определяет `course_id` из `course_group.course_id`
5. Создается запись в `courseparticipants`:
   - `invite_link_id` = найденный ID ссылки
   - `course_group_id` = ID группы из ссылки
   - `course_id` = ID курса из группы
   - `account_id` = ID аккаунта из группы
   - `chat_id` = Telegram chat ID пользователя
   - `username` = Telegram username пользователя
   - `added_at` = текущее время
   - `added_by` = NULL (автоматическое добавление)

### Сценарий 2: Ручное добавление участника

1. Администратор добавляет участника вручную через веб-интерфейс
2. Выбирается группа (`course_group_id`)
3. Создается запись в `courseparticipants`:
   - `invite_link_id` = NULL (не через ссылку)
   - `course_group_id` = выбранная группа
   - `course_id` = ID курса из группы
   - `account_id` = ID аккаунта из группы
   - `chat_id` = Telegram chat ID пользователя (если известен)
   - `username` = Telegram username пользователя
   - `added_at` = текущее время
   - `added_by` = Telegram user ID администратора

### Сценарий 3: Миграция существующих данных

1. Существующие записи в `courseparticipants` имеют `course_id`, но не имеют `course_group_id`
2. Необходимо определить соответствующие группы:
   - Найти группы, где `course_group.course_id = courseparticipants.course_id`
   - Если группа одна — установить `course_group_id`
   - Если групп несколько — требуется ручное определение или установка NULL
   - `invite_link_id` остается NULL для существующих записей

---

## API изменения

### Создание участника через invite link

**Endpoint:** `POST /api/groups/[groupId]/participants` (через invite link)

**Логика:**
```typescript
// При обработке invite link
async function addParticipantViaInviteLink(
  inviteLinkId: number,
  chatId: number,
  username: string
) {
  // 1. Получить invite_link
  const inviteLink = await db.getInviteLink(inviteLinkId);
  
  // 2. Получить course_group из invite_link
  const courseGroup = await db.getCourseGroup(inviteLink.course_group_id);
  
  // 3. Создать участника
  const participant = await db.createCourseParticipant({
    invite_link_id: inviteLinkId,
    course_group_id: inviteLink.course_group_id,
    course_id: courseGroup.course_id,
    account_id: courseGroup.account_id,
    chat_id: chatId,
    username: username,
    added_at: new Date(),
    added_by: null
  });
  
  // 4. Увеличить счетчик использований ссылки
  await db.incrementInviteLinkUses(inviteLinkId);
  
  return participant;
}
```

### Получение участников группы

**Endpoint:** `GET /api/groups/[groupId]/participants`

**Ответ:**
```typescript
interface CourseParticipant {
  courseparticipant_id: number;
  course_id: number;
  course_group_id: number;
  invite_link_id: number | null;
  account_id: number;
  chat_id: number | null;
  username: string | null;
  added_at: string;
  added_by: number | null;
  invite_link?: {
    invite_link_id: number;
    token: string;
    created_at: string;
  } | null;
}
```

### Получение статистики по invite link

**Endpoint:** `GET /api/invite-links/[inviteLinkId]/stats`

**Ответ:**
```typescript
interface InviteLinkStats {
  invite_link_id: number;
  token: string;
  current_uses: number;
  max_uses: number | null;
  participants: {
    courseparticipant_id: number;
    username: string | null;
    chat_id: number | null;
    added_at: string;
  }[];
}
```

---

## Миграция базы данных

### Шаг 1: Добавление новых полей

```sql
-- Добавить поле invite_link_id
ALTER TABLE public.courseparticipants 
    ADD COLUMN invite_link_id INT4 NULL;

-- Добавить поле course_group_id
ALTER TABLE public.courseparticipants 
    ADD COLUMN course_group_id INT4 NULL;
```

### Шаг 2: Заполнение course_group_id для существующих записей

```sql
-- Обновить course_group_id для записей, где можно однозначно определить группу
UPDATE public.courseparticipants cp
SET course_group_id = (
    SELECT cg.course_group_id
    FROM public.course_group cg
    WHERE cg.course_id = cp.course_id
      AND cg.account_id = cp.account_id
    LIMIT 1  -- Если несколько групп, берем первую
)
WHERE cp.course_group_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM public.course_group cg
      WHERE cg.course_id = cp.course_id
        AND cg.account_id = cp.account_id
  );
```

**Примечание:** Если для одного курса есть несколько групп, требуется ручное определение или установка NULL.

### Шаг 3: Добавление внешних ключей

```sql
-- Добавить FK для invite_link_id
ALTER TABLE public.courseparticipants
    ADD CONSTRAINT courseparticipants_invite_link_fkey 
    FOREIGN KEY (invite_link_id) 
    REFERENCES public.invite_link(invite_link_id) 
    ON DELETE SET NULL;

-- Добавить FK для course_group_id
ALTER TABLE public.courseparticipants
    ADD CONSTRAINT courseparticipants_course_group_fkey 
    FOREIGN KEY (course_group_id) 
    REFERENCES public.course_group(course_group_id) 
    ON DELETE CASCADE;
```

### Шаг 4: Создание индексов

```sql
-- Индекс для invite_link_id
CREATE INDEX idx_courseparticipants_invite_link 
    ON public.courseparticipants (invite_link_id);

-- Индекс для course_group_id
CREATE INDEX idx_courseparticipants_course_group 
    ON public.courseparticipants (course_group_id);

-- Составной индекс для запросов по группе и аккаунту
CREATE INDEX idx_courseparticipants_group_account 
    ON public.courseparticipants (course_group_id, account_id);
```

### Шаг 5: Обновление уникального индекса (опционально)

Если требуется уникальность участника в рамках группы, а не курса:

```sql
-- Удалить старый уникальный индекс
DROP INDEX IF EXISTS courseparticipants_unique;

-- Создать новый уникальный индекс с учетом группы
CREATE UNIQUE INDEX courseparticipants_unique_group 
    ON public.courseparticipants (
        course_group_id, 
        account_id, 
        COALESCE(chat_id, 0), 
        COALESCE(username, '')
    );
```

**Вопрос для обсуждения:** Должен ли участник быть уникальным в рамках группы или в рамках курса?

---

## Вопросы для обсуждения

1. **Обязательность `course_group_id`:**
   - Должно ли поле быть NOT NULL или NULLABLE?
   - Могут ли быть участники без группы?

2. **Обязательность `invite_link_id`:**
   - Должно ли поле быть NULLABLE (для ручного добавления)?
   - Или всегда должно быть заполнено?

3. **Уникальность участника:**
   - В рамках группы или в рамках курса?
   - Нужно ли обновить уникальный индекс?

4. **Поведение при удалении:**
   - `invite_link`: SET NULL или RESTRICT?
   - `course_group`: CASCADE или RESTRICT?

5. **Миграция существующих данных:**
   - Как обработать случаи, когда для курса есть несколько групп?
   - Нужна ли ручная миграция или автоматическая?

---

## Преимущества изменений

1. **Отслеживание источника:** Можно узнать, через какую invite link присоединился участник
2. **Аналитика:** Статистика по использованию invite links
3. **Группировка:** Участники связаны с конкретными группами, а не только с курсами
4. **Гибкость:** Поддержка как автоматического (через ссылку), так и ручного добавления
5. **Целостность данных:** Связи через внешние ключи обеспечивают целостность данных

---

## Риски и ограничения

1. **Миграция данных:** Существующие записи могут не иметь связи с группой
2. **Производительность:** Дополнительные индексы и JOIN'ы могут замедлить запросы
3. **Сложность:** Увеличение сложности модели данных
4. **Обратная совместимость:** Необходимо обновить код, работающий с `courseparticipants`

---

## Чеклист реализации

- [ ] Создать миграцию для добавления полей `invite_link_id` и `course_group_id`
- [ ] Заполнить `course_group_id` для существующих записей (где возможно)
- [ ] Добавить внешние ключи
- [ ] Создать индексы
- [ ] Обновить модель SQLAlchemy `CourseParticipant`
- [ ] Обновить логику создания участника через invite link
- [ ] Обновить API endpoints для работы с участниками
- [ ] Добавить API для статистики по invite links
- [ ] Обновить фронтенд для отображения информации о invite link
- [ ] Обновить документацию
- [ ] Протестировать миграцию на тестовых данных
- [ ] Протестировать создание участника через invite link
- [ ] Протестировать ручное добавление участника

---

## Связанные документы

- [Groups Model](groups_model.md) — модель данных групп
- [Database Schema SaaS](database_schema_saas.md) — схема базы данных SaaS
- [Groups Schedule Tab](groups_schedule_tab.md) — требования к расписанию групп

---

**Дата создания:** 2024  
**Статус:** Требования к реализации  
**Следующие шаги:**
1. Обсуждение вопросов из раздела "Вопросы для обсуждения"
2. Создание миграции базы данных
3. Обновление моделей и API
4. Тестирование изменений
