# Руководство по созданию миграций

## Процесс создания миграции

### 1. Создание файла

```bash
./migrations/tools/create_migration.sh add_user_preferences
```

Это создаст файл `migrations/versions/0002_add_user_preferences.sql` (номер будет автоматически определен).

### 2. Редактирование миграции

Откройте созданный файл и добавьте SQL изменения:

```sql
BEGIN;

-- Ваши изменения здесь
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT8 NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value TEXT
);

-- Запись в историю (уже добавлена в шаблон)
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0002', 'Add user preferences table', current_user)
ON CONFLICT (version) DO NOTHING;

COMMIT;
```

### 3. Тестирование

```bash
# Проверить статус
./migrations/tools/status.sh

# Тестовый запуск
./migrations/tools/migrate.sh --dry-run

# Применить локально
./migrations/tools/migrate.sh
```

### 4. Создание rollback (опционально)

Если миграция может быть откачена, создайте файл отката:

```bash
# Создать файл вручную
vim migrations/rollbacks/0002_rollback_add_user_preferences.sql
```

Содержимое:

```sql
BEGIN;

DROP TABLE IF EXISTS user_preferences;

DELETE FROM schema_migrations WHERE version = '0002';

COMMIT;
```

### 5. Коммит в Git

```bash
git add migrations/versions/0002_add_user_preferences.sql
git add migrations/rollbacks/0002_rollback_add_user_preferences.sql  # если есть
git commit -m "Add user preferences table migration"
```

## Best Practices

### ✅ Делайте миграции идемпотентными

```sql
-- Хорошо
CREATE TABLE IF NOT EXISTS users (...);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Плохо
CREATE TABLE users (...);  -- Упадет если таблица существует
```

### ✅ Используйте транзакции

```sql
BEGIN;
-- изменения
COMMIT;
```

### ✅ Добавляйте валидацию

```sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Table users was not created';
    END IF;
END $$;
```

### ✅ Документируйте breaking changes

```sql
-- Migration: 0005_remove_old_column
-- Breaking: Yes
-- Description: Removes deprecated column 'old_field' from users table
-- Deprecation period: 30 days (announced 2024-01-01)
```

### ✅ Тестируйте на staging перед production

1. Применить на staging
2. Проверить работу приложения
3. Только потом применять на production

## Типичные ошибки

### ❌ Изменение существующих миграций

Не изменяйте уже примененные миграции! Создайте новую миграцию для исправления.

### ❌ Удаление данных без бэкапа

Всегда создавайте бэкап перед миграциями, которые удаляют данные.

### ❌ Блокирующие операции на больших таблицах

```sql
-- Плохо (блокирует таблицу)
CREATE INDEX idx_users_email ON users(email);

-- Хорошо (не блокирует)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
```

## Вопросы?

См. [docs/database_migrations.md](../docs/database_migrations.md) для подробной документации.
