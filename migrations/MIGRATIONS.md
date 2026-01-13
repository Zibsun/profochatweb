# Список миграций

## Примененные миграции

### 0001_create_schema_migrations.sql
**Описание:** Создание таблицы `schema_migrations` для отслеживания примененных миграций  
**Дата:** 2024-01-01  
**Статус:** Базовая миграция

### 0002_baseline_current_schema.sql
**Описание:** Baseline миграция текущей схемы БД (до SaaS)  
**Дата:** 2024-01-01  
**Статус:** Baseline  
**Примечание:** Содержит текущую схему перед переходом к SaaS

### 0003_migrate_to_saas.sql
**Описание:** Миграция к SaaS архитектуре (multi-tenant)  
**Дата:** 2024-01-01  
**Статус:** Крупная миграция  
**Связано:** 
- [docs/reqs/transition_to_saas.md](../../docs/reqs/transition_to_saas.md)
- [docs/reqs/database_schema_saas.md](../../docs/reqs/database_schema_saas.md)

**Что делает:**
- Создает таблицы: `account`, `account_member`, `bot`, `course_deployment`, `enrollment_token`
- Добавляет `account_id` во все существующие таблицы
- Мигрирует данные из старых структур в новые
- Создает foreign keys и индексы
- Обеспечивает обратную совместимость

**Откат:** [0003_rollback_migrate_to_saas.sql](../rollbacks/0003_rollback_migrate_to_saas.sql)  
**Внимание:** Откат частичный, для полного отката используйте бэкап

## Порядок применения

1. `0001_create_schema_migrations.sql` - сначала (создает систему отслеживания)
2. `0002_baseline_current_schema.sql` - baseline текущей схемы
3. `0003_migrate_to_saas.sql` - переход к SaaS

## Проверка

После применения миграций проверьте:

```sql
-- Проверить примененные миграции
SELECT * FROM schema_migrations ORDER BY version;

-- Проверить новые таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('account', 'bot', 'course_deployment', 'enrollment_token')
ORDER BY table_name;

-- Проверить account_id в существующих таблицах
SELECT column_name, table_name 
FROM information_schema.columns 
WHERE column_name = 'account_id' 
  AND table_schema = 'public'
ORDER BY table_name;
```
