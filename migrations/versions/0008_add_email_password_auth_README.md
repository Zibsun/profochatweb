# Миграция 0008: Поддержка авторизации через email/password

**Версия:** 0008  
**Дата:** 2026-01-18  
**Статус:** Готова к применению  
**Breaking:** Нет (обратно совместима)

---

## Описание

Эта миграция добавляет поддержку авторизации через email и пароль в существующую таблицу `users`, которая уже используется для Telegram авторизации.

## Изменения

### 1. Добавлено поле `username`
- Тип: `TEXT` (nullable)
- Назначение: Имя пользователя для email/password авторизации
- Опционально, но рекомендуется для email/password пользователей

### 2. Уникальность email
- Добавлен UNIQUE constraint на поле `email`
- Важно: PostgreSQL позволяет несколько NULL значений в UNIQUE колонке
- Это означает, что Telegram пользователи (без email) не конфликтуют друг с другом
- Email/password пользователи должны иметь уникальный email

### 3. Индекс на email
- Создан индекс `idx_users_email` для быстрого поиска по email
- Индекс создается только для не-NULL значений (partial index)

### 4. Constraint для целостности данных
- Добавлен CHECK constraint: `users_email_password_check`
- Правило: если `email` указан, то `password_hash` также должен быть указан (и наоборот)
- Это гарантирует, что email/password пользователи имеют оба поля

### 5. Документация
- Добавлены комментарии к колонкам для ясности

## Структура после миграции

Таблица `users` теперь поддерживает два типа авторизации:

### Telegram авторизация
```sql
INSERT INTO users (telegram_user_id, telegram_username, first_name)
VALUES (123456789, 'username', 'John');
-- email и password_hash могут быть NULL
```

### Email/password авторизация
```sql
INSERT INTO users (email, username, password_hash)
VALUES ('user@example.com', 'username', '$2b$12$...');
-- telegram_user_id может быть NULL (но это не рекомендуется для текущей архитектуры)
```

## Важные замечания

⚠️ **Критическое несоответствие:** 

Модель `User` в `webapp/backend/app/models/user.py` использует `UUID` для `user_id`, но:
- Таблица `users` после миграции 0007 использует `SERIAL` (INT)
- Активная модель `UserTelegram` использует `Integer` (соответствует БД)
- Другие модели (`quiz_attempt`, `chat_session`, `course_progress`) все еще используют `UUID` в ForeignKey

**Это нужно решить перед использованием email/password авторизации:**

1. **Вариант 1 (рекомендуемый):** Обновить модель `User` для использования `Integer` вместо `UUID`:
   ```python
   user_id = Column(Integer, primary_key=True, autoincrement=True)
   ```

2. **Вариант 2:** Создать универсальную модель, которая поддерживает оба типа авторизации (Telegram и email/password)

3. **Вариант 3:** Изменить структуру таблицы для использования UUID (требует миграции данных и обновления всех ForeignKey)

**Также необходимо обновить ForeignKey в других моделях:**
- `quiz_attempt.user_id` → `Integer` вместо `UUID`
- `chat_session.user_id` → `Integer` вместо `UUID`
- `course_progress.user_id` → `Integer` вместо `UUID`

## Применение

```bash
# Проверить статус
./migrations/tools/status.sh

# Применить миграцию
./migrations/tools/migrate.sh

# Или вручную
psql -d profochatbot -f migrations/versions/0008_add_email_password_auth.sql
```

## Откат

Для отката этой миграции:

```sql
BEGIN;

-- Удалить constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_password_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Удалить индекс
DROP INDEX IF EXISTS idx_users_email;

-- Удалить колонку username (опционально, если нужно полностью откатить)
-- ALTER TABLE users DROP COLUMN IF EXISTS username;

-- Удалить комментарии
COMMENT ON COLUMN users.email IS NULL;
COMMENT ON COLUMN users.password_hash IS NULL;
COMMENT ON COLUMN users.username IS NULL;
COMMENT ON COLUMN users.telegram_user_id IS NULL;

-- Удалить запись о миграции
DELETE FROM schema_migrations WHERE version = '0008';

COMMIT;
```

## Связанные документы

- [Документация по авторизации через логин/пароль](../../docs/reference/api/authentication.md)
- [План реализации Telegram авторизации](../../docs/reqs/multitenancy_telegram_auth_implementation_plan.md)

## Тестирование

После применения миграции можно протестировать:

```sql
-- Проверить структуру таблицы
\d users

-- Проверить constraints
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- Проверить индексы
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';

-- Тест: создать email/password пользователя
INSERT INTO users (email, username, password_hash)
VALUES ('test@example.com', 'testuser', '$2b$12$testhash');

-- Тест: попытка создать дубликат email должна упасть
INSERT INTO users (email, username, password_hash)
VALUES ('test@example.com', 'testuser2', '$2b$12$testhash2');
-- Ожидается ошибка: duplicate key value violates unique constraint

-- Тест: Telegram пользователь без email (должен работать)
INSERT INTO users (telegram_user_id, telegram_username)
VALUES (987654321, 'telegramuser');
-- Должно работать, так как email NULL не нарушает unique constraint
```

---

**Последнее обновление:** 2026-01-18
