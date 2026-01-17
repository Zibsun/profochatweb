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

### 0004_course_id_to_int.sql
**Описание:** Изменение типа `course_id` с TEXT на INT с автоинкрементом  
**Дата:** 2024-01-01  
**Статус:** Крупная миграция  
**Связано:** 
- [docs/reqs/course_id_migration_plan.md](../../docs/reqs/course_id_migration_plan.md)

**Что делает:**
- Переименовывает `course_id` (TEXT) → `course_code` (TEXT) в таблице `course`
- Добавляет новый `course_id` (INT) как PRIMARY KEY с автоинкрементом
- Обновляет все связанные таблицы для использования нового `course_id` (INT)
- Сохраняет обратную совместимость через `course_code`

**Внимание:** Требует обновления кода приложения для использования нового `course_id` (INT)

### 0005_introduce_groups.sql
**Описание:** Введение концепции Групп (Groups) — замена CourseDeployment на Group  
**Дата:** 2024-01-01  
**Статус:** Крупная миграция  
**Связано:** 
- [docs/reqs/groups_model.md](../../docs/reqs/groups_model.md)

**Что делает:**
- Создает таблицы: `group`, `invite_link`, `schedule`
- Добавляет `group_id` и `invite_link_id` в таблицу `run` (nullable для обратной совместимости)
- Создает индексы и foreign keys
- Обеспечивает обратную совместимость (не удаляет старые таблицы)

**Примечание:** Миграция данных из CourseDeployment в Group выполняется отдельно

### 0006_courseparticipants_invite_link_relation.sql
**Описание:** Добавление связей между `courseparticipants`, `invite_link` и `course_group`  
**Дата:** 2024-01-01  
**Статус:** Миграция  
**Связано:** 
- [docs/reqs/course_participants_invite_link_relation.md](../../docs/reqs/course_participants_invite_link_relation.md)

**Что делает:**
- Добавляет `invite_link_id` (INT4, nullable) в таблицу `courseparticipants`
- Добавляет `course_group_id` (INT4, nullable) в таблицу `courseparticipants`
- Автоматически заполняет `course_group_id` для существующих записей (где возможно)
- Создает foreign key constraints:
  - `invite_link_id` → `invite_link` (ON DELETE SET NULL)
  - `course_group_id` → `course_group` (ON DELETE CASCADE)
- Создает индексы для оптимизации запросов

**Примечание:** Оба поля nullable для обратной совместимости. Записи с несколькими группами требуют ручного обзора.

## Порядок применения

1. `0001_create_schema_migrations.sql` - сначала (создает систему отслеживания)
2. `0002_baseline_current_schema.sql` - baseline текущей схемы
3. `0003_migrate_to_saas.sql` - переход к SaaS
4. `0004_course_id_to_int.sql` - изменение типа course_id на INT
5. `0005_introduce_groups.sql` - введение концепции групп
6. `0006_courseparticipants_invite_link_relation.sql` - связь участников с invite links и группами

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

-- Проверить новые поля в courseparticipants (после миграции 0006)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'courseparticipants' 
  AND column_name IN ('invite_link_id', 'course_group_id')
ORDER BY column_name;
```
