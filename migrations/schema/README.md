# Database Schema Files

Эта папка содержит файлы со схемой базы данных.

## Файлы

- **`current_schema.sql`** - Текущая схема БД (для справки)
- **`saas_schema.sql`** - Схема SaaS архитектуры (если нужно)

## Обновление схемы

Чтобы обновить файл текущей схемы:

```bash
# Экспортировать только схему (без данных)
pg_dump --schema-only -d profochatbot > migrations/schema/current_schema.sql

# Или с форматированием
pg_dump --schema-only --no-owner --no-privileges -d profochatbot | \
  sed 's/^--.*$//' | \
  grep -v '^$' > migrations/schema/current_schema.sql
```

## Использование

Эти файлы используются как справочные при создании миграций. Они помогают:

- Понять текущее состояние схемы
- Создать baseline миграцию
- Проверить соответствие схемы миграциям

## Примечание

Эти файлы не являются миграциями. Для создания миграций используйте:

```bash
./migrations/tools/create_migration.sh <description>
```
