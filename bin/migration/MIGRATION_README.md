# Миграция к SaaS архитектуре

## Описание

Скрипт `migration_to_saas.sql` выполняет миграцию базы данных ProfoChatBot от монолитной архитектуры к multi-tenant SaaS архитектуре.

## Быстрый старт

**Рекомендуемый способ** - использовать автоматический bash скрипт:

```bash
# Простой запуск (автоматически создаст бэкап и запустит миграцию)
./bin/migration/migrate-simple.sh
```

Скрипт автоматически:
- ✅ Создаст резервную копию БД
- ✅ Запустит миграцию
- ✅ Валидирует результат
- ✅ Покажет следующие шаги

Для более детального контроля используйте:
```bash
./bin/migration/migrate.sh --help
```

## Структура файлов

Все файлы миграции находятся в `bin/migration/`:
- **SQL файлы миграции**: `migration_to_saas.sql`, `validate_migration.sql`
- **Bash скрипты**: `migrate.sh`, `migrate-simple.sh`
- **Документация**: `README.md`, `MIGRATION_README.md`, `MIGRATION_QUICKSTART.md`

## Что делает миграция

### Фазы миграции:

1. **Phase 0**: Создает таблицу `account` и добавляет `account_id` во все существующие таблицы (значение по умолчанию = 1)
2. **Phase 1**: Создает новые таблицы (`account_member`, `bot`, `course_deployment`, `enrollment_token`)
3. **Phase 2**: Мигрирует существующие данные (боты, курсы, связи)
4. **Phase 3**: Добавляет новые колонки (`bot_id`, `deployment_id`, `token_id`) и мигрирует связи
5. **Phase 4**: Добавляет foreign key constraints
6. **Phase 5**: Создает индексы для производительности
7. **Phase 7**: Валидация данных и установка NOT NULL constraints

## Подготовка

### 1. Резервное копирование

**ОБЯЗАТЕЛЬНО** создайте резервную копию базы данных перед запуском миграции:

```bash
# PostgreSQL backup
pg_dump -h localhost -U username -d profochatbot -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Или SQL dump
pg_dump -h localhost -U username -d profochatbot > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Проверка версии PostgreSQL

Миграция требует PostgreSQL 9.5+ (для поддержки `ON CONFLICT` и `JSONB`).

Проверьте версию:
```sql
SELECT version();
```

### 3. Проверка текущей схемы

Убедитесь, что у вас есть все необходимые таблицы:
- `conversation`
- `run`
- `waiting_element`
- `course`
- `course_element`
- `courseparticipants`
- `bannedparticipants`
- `gen_settings`

## Запуск миграции

### ⭐ Рекомендуемый способ: Автоматический скрипт

Самый простой и безопасный способ - использовать автоматический bash скрипт:

```bash
# Простой запуск (загружает .env автоматически)
./bin/migration/migrate-simple.sh

# Или полная версия с опциями
./bin/migration/migrate.sh
```

**Что делает скрипт:**
- ✅ Автоматически создает резервную копию БД
- ✅ Парсит DATABASE_URL из переменных окружения
- ✅ Проверяет подключение к БД
- ✅ Запускает миграцию
- ✅ Валидирует результат
- ✅ Предоставляет возможность отката

**Опции скрипта:**

```bash
# Показать что будет сделано без реальных изменений
./bin/migration/migrate.sh --dry-run

# Пропустить создание бэкапа (не рекомендуется!)
./bin/migration/migrate.sh --skip-backup

# Откатить миграцию из бэкапа
./bin/migration/migrate.sh --rollback backups/profochatbot_backup_20240101_120000.dump

# Показать список доступных бэкапов
./bin/migration/migrate.sh --list-backups

# Показать справку
./bin/migration/migrate.sh --help
```

**Требования:**
- PostgreSQL клиентские утилиты (`psql`, `pg_dump`, `pg_restore`)
- Переменная `DATABASE_URL` в окружении или `.env` файле

### Альтернативные способы

### Вариант 1: Через psql (ручной запуск)

```bash
# Сначала создайте бэкап вручную!
pg_dump -h localhost -U username -d profochatbot -F c -f backup.dump

# Затем запустите миграцию
psql -h localhost -U username -d profochatbot -f scripts/migration_to_saas.sql
```

### Вариант 2: Через Python

```python
import psycopg2
from psycopg2 import sql

conn = psycopg2.connect("postgresql://user:password@localhost/profochatbot")
conn.autocommit = False

try:
    with open('scripts/migration_to_saas.sql', 'r') as f:
        migration_sql = f.read()
    
    cursor = conn.cursor()
    cursor.execute(migration_sql)
    conn.commit()
    print("Migration completed successfully!")
except Exception as e:
    conn.rollback()
    print(f"Migration failed: {e}")
finally:
    conn.close()
```

### Вариант 3: Через Docker

```bash
# Создать бэкап
docker exec postgres_container pg_dump -U username -d profochatbot -F c -f /backup.dump

# Запустить миграцию
docker exec -i postgres_container psql -U username -d profochatbot < scripts/migration_to_saas.sql
```

## Проверка после миграции

### 1. Проверка данных

```sql
-- Проверка количества записей
SELECT 'account' as table_name, COUNT(*) as count FROM account
UNION ALL
SELECT 'bot', COUNT(*) FROM bot
UNION ALL
SELECT 'course', COUNT(*) FROM course
UNION ALL
SELECT 'course_deployment', COUNT(*) FROM course_deployment
UNION ALL
SELECT 'run', COUNT(*) FROM run;

-- Проверка, что все runs имеют bot_id
SELECT COUNT(*) as runs_without_bot_id 
FROM run 
WHERE bot_id IS NULL;

-- Проверка, что все runs имеют deployment_id
SELECT COUNT(*) as runs_without_deployment_id 
FROM run 
WHERE deployment_id IS NULL;

-- Проверка активных сессий
SELECT bot_id, COUNT(*) as active_runs
FROM run
WHERE is_active = TRUE
GROUP BY bot_id;
```

### 2. Проверка ограничений

```sql
-- Проверка уникальности активных runs
SELECT bot_id, chat_id, COUNT(*) as count
FROM run
WHERE is_active = TRUE
GROUP BY bot_id, chat_id
HAVING COUNT(*) > 1;
-- Должно вернуть 0 строк

-- Проверка foreign keys
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 3. Проверка индексов

```sql
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Ручные действия после миграции

### 1. Обновление bot tokens

Скрипт создает записи ботов, но не заполняет `bot_token`. Необходимо обновить токены вручную:

```sql
-- Для каждого бота обновите токен
UPDATE bot 
SET bot_token = 'YOUR_BOT_TOKEN_HERE' 
WHERE bot_name = 'your_bot_name';
```

Или через переменные окружения:

```python
import os
import psycopg2

BOT_TOKEN = os.environ.get('BOT_API_TOKEN')
BOT_NAME = os.environ.get('BOT_NAME')

conn = psycopg2.connect(os.environ.get('DATABASE_URL'))
cursor = conn.cursor()
cursor.execute(
    "UPDATE bot SET bot_token = %s WHERE bot_name = %s",
    (BOT_TOKEN, BOT_NAME)
)
conn.commit()
```

### 2. Создание account_member

После миграции создайте первого участника аккаунта:

```sql
INSERT INTO account_member (account_id, telegram_user_id, telegram_username, role)
VALUES (1, YOUR_TELEGRAM_USER_ID, 'your_username', 'owner');
```

### 3. Создание enrollment tokens (опционально)

Для существующих развертываний можно создать публичные токены:

```sql
INSERT INTO enrollment_token (
    deployment_id, 
    token, 
    token_type, 
    is_active
)
SELECT 
    deployment_id,
    'public_' || deployment_id::text,
    'public',
    TRUE
FROM course_deployment;
```

## Откат миграции (Rollback)

⚠️ **ВНИМАНИЕ**: Откат миграции может привести к потере данных. Используйте только если миграция прошла неудачно.

### Скрипт отката

```sql
BEGIN;

-- Удаление foreign key constraints
ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_account_id_fkey;
ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_run_id_fkey;
ALTER TABLE run DROP CONSTRAINT IF EXISTS run_account_id_fkey;
ALTER TABLE run DROP CONSTRAINT IF EXISTS run_bot_id_fkey;
ALTER TABLE run DROP CONSTRAINT IF EXISTS run_deployment_id_fkey;
-- ... (добавьте остальные constraints)

-- Удаление новых колонок
ALTER TABLE conversation DROP COLUMN IF EXISTS account_id;
ALTER TABLE run DROP COLUMN IF EXISTS account_id, DROP COLUMN IF EXISTS bot_id, DROP COLUMN IF EXISTS deployment_id;
-- ... (добавьте остальные колонки)

-- Удаление новых таблиц
DROP TABLE IF EXISTS enrollment_token CASCADE;
DROP TABLE IF EXISTS course_deployment CASCADE;
DROP TABLE IF EXISTS bot CASCADE;
DROP TABLE IF EXISTS account_member CASCADE;
DROP TABLE IF EXISTS account CASCADE;

COMMIT;
```

**Лучший способ отката**: Восстановить базу данных из резервной копии.

## Возможные проблемы и решения

### Проблема: Ошибка "duplicate key value violates unique constraint"

**Причина**: Попытка создать дублирующиеся записи.

**Решение**: Скрипт использует `ON CONFLICT DO NOTHING`, но если проблема сохраняется, проверьте данные:

```sql
-- Проверка дубликатов ботов
SELECT bot_name, account_id, COUNT(*) 
FROM bot 
GROUP BY bot_name, account_id 
HAVING COUNT(*) > 1;
```

### Проблема: NULL значения в обязательных полях

**Причина**: Не все данные были мигрированы корректно.

**Решение**: Запустите валидацию и исправьте вручную:

```sql
-- Найти runs без bot_id
SELECT * FROM run WHERE bot_id IS NULL;

-- Найти runs без deployment_id
SELECT * FROM run WHERE deployment_id IS NULL;
```

### Проблема: Foreign key constraint fails

**Причина**: Ссылки на несуществующие записи.

**Решение**: Проверьте целостность данных:

```sql
-- Найти runs с несуществующими bot_id
SELECT r.* FROM run r
LEFT JOIN bot b ON r.bot_id = b.bot_id
WHERE r.bot_id IS NOT NULL AND b.bot_id IS NULL;
```

## Производительность

Миграция может занять время в зависимости от объема данных:

- **Малые БД** (< 10K записей): ~1-5 минут
- **Средние БД** (10K-100K записей): ~5-15 минут
- **Большие БД** (> 100K записей): ~15-60 минут

Для больших БД рекомендуется:
1. Запускать миграцию в период низкой нагрузки
2. Использовать `VACUUM ANALYZE` после миграции
3. Мониторить использование дискового пространства

## Обновление приложения

После успешной миграции необходимо обновить код приложения:

1. **Заменить `botname` на `bot_id`** во всех запросах
2. **Добавить `account_id`** во все запросы
3. **Использовать `deployment_id`** вместо прямых связей курс-бот
4. **Обновить создание runs** для использования `enrollment_token`

Примеры изменений в коде:

```python
# Старый код
run_id = db.create_run(course_id, username, chat_id, botname=botname)

# Новый код
deployment = db.get_deployment_by_course_and_bot(course_id, bot_id, account_id)
run_id = db.create_run(deployment_id=deployment.deployment_id, chat_id=chat_id, ...)
```

## Поддержка

При возникновении проблем:
1. Проверьте логи PostgreSQL
2. Проверьте резервную копию
3. Запустите скрипты валидации из раздела "Проверка после миграции"
4. Обратитесь к документации в `docs/reqs/database_schema_saas.md`

## Дополнительные ресурсы

- [Схема базы данных SaaS](./../docs/reqs/database_schema_saas.md)
- [План перехода к SaaS](./../docs/reqs/transition_to_saas.md)
- [Документация по БД](./../docs/database.md)
