# Организация миграций базы данных

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Рекомендации для внедрения

## Обзор

Данный документ описывает подход к организации и управлению миграциями базы данных в проекте ProfoChatBot. Правильная организация миграций критически важна для:

- **Надежности** - возможность отката изменений
- **Воспроизводимости** - одинаковое состояние БД на всех окружениях
- **Командной работы** - координация изменений схемы
- **Истории изменений** - отслеживание эволюции схемы БД

---

## Принципы организации миграций

### 1. Версионирование
- Каждая миграция имеет уникальный номер версии
- Миграции применяются последовательно
- Невозможно пропустить миграцию

### 2. Идемпотентность
- Миграции можно запускать несколько раз безопасно
- Использование `IF NOT EXISTS`, `IF EXISTS` для проверок
- Транзакции для атомарности

### 3. Обратная совместимость
- Изменения должны быть обратно совместимыми где возможно
- Поэтапное внедрение breaking changes
- Deprecation период для удаляемых полей

### 4. Документирование
- Каждая миграция должна иметь описание
- Изменения должны быть задокументированы
- Связь с задачами/тикетами

---

## Структура папок

### Рекомендуемая структура

```
profochatweb/
├── migrations/
│   ├── versions/                    # SQL файлы миграций
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_add_accounts.sql
│   │   ├── 0003_add_bots.sql
│   │   ├── 0004_add_deployments.sql
│   │   └── ...
│   ├── rollbacks/                   # Скрипты отката (опционально)
│   │   ├── 0002_rollback_accounts.sql
│   │   └── ...
│   ├── seeds/                        # Seed данные (опционально)
│   │   ├── 0001_default_account.sql
│   │   └── ...
│   ├── templates/                    # Шаблоны для новых миграций
│   │   └── migration_template.sql
│   ├── tools/                       # Инструменты для работы с миграциями
│   │   ├── migrate.sh               # Основной скрипт миграции
│   │   ├── create_migration.sh      # Создание новой миграции
│   │   ├── rollback.sh              # Откат миграции
│   │   └── status.sh                # Статус миграций
│   ├── README.md                     # Документация по миграциям
│   └── .migrations_history           # История примененных миграций (git ignored)
│
└── bin/migration/                    # Существующие одноразовые миграции
    └── migration_to_saas.sql         # Миграция к SaaS (legacy)
```

### Альтернативная структура (для Alembic)

Если используется Alembic:

```
profochatweb/
├── alembic/
│   ├── versions/                    # Python миграции Alembic
│   │   ├── 0001_initial_schema.py
│   │   ├── 0002_add_accounts.py
│   │   └── ...
│   ├── env.py                       # Конфигурация Alembic
│   └── script.py.mako               # Шаблон миграций
│
└── migrations/                       # SQL миграции (если нужны)
    └── ...
```

---

## Нумерация миграций

### Формат имени файла

```
<номер>_<описание>.<расширение>
```

**Примеры:**
- `0001_initial_schema.sql`
- `0002_add_accounts_table.sql`
- `0003_add_bot_id_to_runs.sql`
- `0004_create_indexes.sql`

### Правила нумерации

1. **Последовательные номера**: 0001, 0002, 0003...
2. **Минимальная длина**: 4 цифры (для сортировки)
3. **Описание**: краткое, понятное, на английском или транслите
4. **Без пробелов**: использовать подчеркивания
5. **Нижний регистр**: для описания

### Нумерация при параллельной разработке

Если несколько разработчиков создают миграции параллельно:

**Вариант 1: Резервирование номеров**
- Разработчик A: создает `0005_add_feature_a.sql`
- Разработчик B: создает `0006_add_feature_b.sql`
- При merge конфликте: переименовать одну из миграций

**Вариант 2: Использование timestamp**
```
20240115_143022_add_accounts.sql
20240115_143045_add_bots.sql
```

**Вариант 3: Git-based нумерация**
- Использовать инструменты для автоматической нумерации
- Скрипт `create_migration.sh` резервирует номер

---

## Создание новой миграции

### Процесс

1. **Создать файл миграции**
   ```bash
   ./migrations/tools/create_migration.sh add_user_preferences
   # Создает: migrations/versions/0005_add_user_preferences.sql
   ```

2. **Написать SQL**
   ```sql
   -- Migration: 0005_add_user_preferences
   -- Description: Add user preferences table
   -- Author: Your Name
   -- Date: 2024-01-15
   -- Related: Issue #123

   BEGIN;

   CREATE TABLE IF NOT EXISTS user_preferences (
       user_preference_id SERIAL PRIMARY KEY,
       user_id INT8 NOT NULL,
       preference_key TEXT NOT NULL,
       preference_value TEXT,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       UNIQUE (user_id, preference_key)
   );

   CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);

   COMMIT;
   ```

3. **Протестировать локально**
   ```bash
   ./migrations/tools/migrate.sh --dry-run
   ```

4. **Применить миграцию**
   ```bash
   ./migrations/tools/migrate.sh
   ```

5. **Закоммитить в Git**
   ```bash
   git add migrations/versions/0005_add_user_preferences.sql
   git commit -m "Add user preferences table migration"
   ```

### Шаблон миграции

```sql
-- ============================================================================
-- Migration: <номер>_<описание>
-- ============================================================================
-- Description: <Подробное описание изменений>
-- Author: <Имя автора>
-- Date: <YYYY-MM-DD>
-- Related: <Issue/Ticket номер или ссылка>
-- ============================================================================

BEGIN;

-- ============================================================================
-- Changes
-- ============================================================================

-- TODO: Добавить SQL изменения здесь

-- ============================================================================
-- Validation (optional)
-- ============================================================================

-- TODO: Добавить проверки если нужно

COMMIT;

-- ============================================================================
-- Rollback (optional)
-- ============================================================================
-- Для отката выполнить:
-- BEGIN;
-- <SQL для отката>
-- COMMIT;
```

---

## Инструменты для работы с миграциями

### 1. Основной скрипт миграции

**`migrations/tools/migrate.sh`**

```bash
#!/bin/bash
# Применяет все непримененные миграции

# Функции:
# - Проверяет какие миграции уже применены
# - Применяет миграции последовательно
# - Логирует результаты
# - Создает бэкап перед применением
```

**Использование:**
```bash
./migrations/tools/migrate.sh              # Применить все миграции
./migrations/tools/migrate.sh --dry-run    # Показать что будет сделано
./migrations/tools/migrate.sh --to 0005    # Применить до определенной миграции
```

### 2. Создание миграции

**`migrations/tools/create_migration.sh`**

```bash
#!/bin/bash
# Создает новый файл миграции с правильным номером

# Функции:
# - Определяет следующий номер миграции
# - Создает файл из шаблона
# - Открывает в редакторе
```

**Использование:**
```bash
./migrations/tools/create_migration.sh add_user_preferences
# Создает: migrations/versions/0005_add_user_preferences.sql
```

### 3. Статус миграций

**`migrations/tools/status.sh`**

```bash
#!/bin/bash
# Показывает статус миграций

# Выводит:
# - Список примененных миграций
# - Список непримененных миграций
# - Текущую версию БД
```

**Использование:**
```bash
./migrations/tools/status.sh
```

### 4. Откат миграции

**`migrations/tools/rollback.sh`**

```bash
#!/bin/bash
# Откатывает последнюю или указанную миграцию

# Функции:
# - Создает бэкап перед откатом
# - Выполняет SQL отката
# - Обновляет историю миграций
```

**Использование:**
```bash
./migrations/tools/rollback.sh              # Откатить последнюю миграцию
./migrations/tools/rollback.sh 0005        # Откатить до определенной миграции
```

---

## Отслеживание примененных миграций

### Таблица истории миграций

Создать таблицу для отслеживания примененных миграций:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT,
    execution_time_ms INT
);

CREATE INDEX idx_schema_migrations_applied_at ON schema_migrations(applied_at);
```

### Использование

При применении миграции:

```sql
BEGIN;

-- Применить изменения миграции
-- ...

-- Записать в историю
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0005', 'Add user preferences table', current_user);

COMMIT;
```

---

## Best Practices

### 1. Размер миграций

✅ **Хорошо:**
- Одна миграция = одно логическое изменение
- Небольшие, атомарные миграции
- Легко откатываемые

❌ **Плохо:**
- Огромные миграции со множеством изменений
- Смешивание разных типов изменений
- Невозможность частичного отката

### 2. Именование

✅ **Хорошо:**
- `0005_add_user_preferences.sql`
- `0010_add_indexes_to_runs.sql`
- `0015_migrate_botname_to_bot_id.sql`

❌ **Плохо:**
- `migration.sql`
- `changes.sql`
- `fix.sql`

### 3. Обратная совместимость

✅ **Хорошо:**
```sql
-- Добавление новой колонки с DEFAULT
ALTER TABLE users ADD COLUMN new_field TEXT DEFAULT 'default_value';

-- Добавление новой таблицы
CREATE TABLE new_table (...);
```

❌ **Плохо:**
```sql
-- Удаление колонки без deprecation
ALTER TABLE users DROP COLUMN old_field;

-- Изменение типа без миграции данных
ALTER TABLE users ALTER COLUMN email TYPE INT;
```

### 4. Производительность

✅ **Хорошо:**
```sql
-- Создание индекса CONCURRENTLY (для больших таблиц)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Использование временных таблиц для больших изменений
CREATE TEMP TABLE users_new AS SELECT ...;
```

❌ **Плохо:**
```sql
-- Блокирующие операции на больших таблицах
CREATE INDEX idx_users_email ON users(email);  -- Блокирует таблицу

-- Обновление всех строк сразу
UPDATE users SET status = 'active';  -- Может быть медленным
```

### 5. Валидация

✅ **Хорошо:**
```sql
-- Проверка перед применением
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Table users does not exist';
    END IF;
END $$;

-- Проверка после применения
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        RAISE EXCEPTION 'Column email was not added';
    END IF;
END $$;
```

### 6. Документация

✅ **Хорошо:**
```sql
-- Migration: 0005_add_user_preferences
-- Description: Add user preferences table to store user settings
-- Author: John Doe
-- Date: 2024-01-15
-- Related: Issue #123, PR #456
-- Breaking: No
```

❌ **Плохо:**
```sql
-- Migration
-- Some changes
```

---

## Типы миграций

### 1. Структурные изменения

**Создание таблиц:**
```sql
CREATE TABLE IF NOT EXISTS table_name (
    id SERIAL PRIMARY KEY,
    ...
);
```

**Изменение таблиц:**
```sql
ALTER TABLE table_name ADD COLUMN new_column TEXT;
ALTER TABLE table_name DROP COLUMN old_column;
ALTER TABLE table_name ALTER COLUMN column_name TYPE NEW_TYPE;
```

**Создание индексов:**
```sql
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);
```

### 2. Миграция данных

**Перемещение данных:**
```sql
-- Создать новую структуру
CREATE TABLE new_table (...);

-- Мигрировать данные
INSERT INTO new_table SELECT ... FROM old_table;

-- Обновить ссылки
UPDATE other_table SET ref_id = ... WHERE ...;
```

**Трансформация данных:**
```sql
-- Обновить формат данных
UPDATE table_name SET column_name = transform(column_name);
```

### 3. Откат изменений

**Deprecation:**
```sql
-- Пометить как deprecated
ALTER TABLE table_name ADD COLUMN deprecated_at TIMESTAMP;

-- Позже удалить
ALTER TABLE table_name DROP COLUMN deprecated_column;
```

---

## Тестирование миграций

### 1. Локальное тестирование

```bash
# Создать тестовую БД
createdb profochatbot_test

# Применить миграции
./migrations/tools/migrate.sh --database profochatbot_test

# Проверить результат
psql profochatbot_test -c "\d"
```

### 2. Dry-run режим

```bash
# Показать что будет сделано без реальных изменений
./migrations/tools/migrate.sh --dry-run
```

### 3. Валидация SQL

```bash
# Проверить синтаксис SQL
psql --dry-run -f migrations/versions/0005_add_user_preferences.sql
```

### 4. Тестирование отката

```bash
# Применить миграцию
./migrations/tools/migrate.sh

# Откатить
./migrations/tools/rollback.sh

# Проверить что все вернулось
./migrations/tools/status.sh
```

---

## Автоматизация

### CI/CD интеграция

**GitHub Actions пример:**

```yaml
name: Run Migrations

on:
  push:
    branches: [main]
    paths:
      - 'migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup PostgreSQL
        uses: actions/setup-postgres@v1
        with:
          postgresql-version: '14'
          
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          ./migrations/tools/migrate.sh
```

### Pre-commit hook

**`.git/hooks/pre-commit`:**

```bash
#!/bin/bash
# Проверка что миграции имеют правильный формат

for file in $(git diff --cached --name-only | grep migrations/versions/); do
    if ! [[ $file =~ ^migrations/versions/[0-9]{4}_.*\.sql$ ]]; then
        echo "Error: Migration file must match pattern: migrations/versions/####_description.sql"
        exit 1
    fi
done
```

---

## Работа с окружениями

### Разные окружения

1. **Development** - локальная разработка
2. **Staging** - тестовое окружение
3. **Production** - продакшн

### Стратегия применения

1. **Разработка**: применять миграции сразу
2. **Staging**: применять перед деплоем
3. **Production**: применять в окно обслуживания с бэкапом

### Скрипт для разных окружений

```bash
#!/bin/bash
# migrations/tools/migrate_env.sh

ENV=${1:-development}

case $ENV in
    development)
        DATABASE_URL="postgresql://user:pass@localhost/profochatbot_dev"
        ;;
    staging)
        DATABASE_URL="postgresql://user:pass@staging-db/profochatbot_staging"
        ;;
    production)
        DATABASE_URL="postgresql://user:pass@prod-db/profochatbot"
        ;;
esac

export DATABASE_URL
./migrations/tools/migrate.sh
```

---

## Миграция существующих изменений

### Если уже есть изменения без миграций

1. **Создать baseline миграцию:**
   ```bash
   # Экспортировать текущую схему
   pg_dump --schema-only -d profochatbot > migrations/versions/0001_baseline_schema.sql
   ```

2. **Создать миграцию для каждого изменения:**
   - Документировать каждое изменение
   - Создать отдельную миграцию
   - Пронумеровать последовательно

3. **Применить на чистой БД:**
   - Проверить что все миграции применяются
   - Убедиться что результат совпадает с текущей схемой

---

## Интеграция с Alembic (опционально)

Если проект использует SQLAlchemy и Alembic:

### Настройка Alembic

```python
# alembic/env.py
from sqlalchemy import engine_from_config
from alembic import context

config = context.config
engine = engine_from_config(config.get_section(config.config_ini_section))

# Использовать существующие модели
from app.models import Base
target_metadata = Base.metadata
```

### Создание миграции

```bash
# Автоматическая генерация из моделей
alembic revision --autogenerate -m "add user preferences"

# Ручное создание
alembic revision -m "add user preferences"
```

### Применение миграций

```bash
# Применить все
alembic upgrade head

# Откатить одну
alembic downgrade -1

# Применить до версии
alembic upgrade 0005
```

---

## Рекомендации для ProfoChatBot

### Текущее состояние

- Есть одноразовая миграция к SaaS в `bin/migration/`
- Нет системы версионирования миграций
- Нет отслеживания примененных миграций

### План внедрения

1. **Создать структуру папок:**
   ```bash
   mkdir -p migrations/{versions,rollbacks,seeds,tools}
   ```

2. **Создать baseline миграцию:**
   - Экспортировать текущую схему SaaS
   - Создать `0001_baseline_saas_schema.sql`

3. **Создать инструменты:**
   - `migrations/tools/migrate.sh`
   - `migrations/tools/create_migration.sh`
   - `migrations/tools/status.sh`

4. **Создать таблицу истории:**
   - Добавить `schema_migrations` таблицу
   - Записать baseline как примененную

5. **Документировать процесс:**
   - Обновить этот документ
   - Создать README в `migrations/`

### Миграция существующей БД

```sql
-- Создать таблицу истории
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by TEXT
);

-- Записать baseline
INSERT INTO schema_migrations (version, description, applied_by)
VALUES ('0001', 'Baseline SaaS schema', current_user);
```

---

## Чеклист для новой миграции

- [ ] Создан файл с правильным номером и именем
- [ ] Добавлено описание в комментариях
- [ ] SQL проверен на синтаксис
- [ ] Миграция протестирована локально
- [ ] Проверена обратная совместимость
- [ ] Создан скрипт отката (если нужен)
- [ ] Документация обновлена
- [ ] Миграция закоммичена в Git
- [ ] Применена на staging перед production

---

## Полезные ссылки

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Database Migration Best Practices](https://www.red-gate.com/simple-talk/databases/database-devops/database-migration-best-practices/)

---

## Заключение

Правильная организация миграций - это инвестиция в будущее проекта. Она позволяет:

- ✅ Безопасно изменять схему БД
- ✅ Отслеживать историю изменений
- ✅ Координировать работу команды
- ✅ Легко откатывать изменения
- ✅ Автоматизировать деплой

Начните с простой структуры и постепенно добавляйте инструменты по мере необходимости.
