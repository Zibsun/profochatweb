# Миграция к SaaS архитектуре

Все файлы миграции находятся в этой папке.

## Быстрый старт

```bash
# Простой запуск (автоматически создаст бэкап и запустит миграцию)
./bin/migration/migrate-simple.sh
```

## Структура файлов

```
bin/migration/
├── migrate.sh                    # Основной скрипт миграции
├── migrate-simple.sh             # Упрощенная версия (загружает .env)
├── migration_to_saas.sql         # SQL скрипт миграции
├── validate_migration.sql       # SQL скрипт валидации
├── README.md                     # Этот файл
├── MIGRATION_README.md           # Подробная документация
└── MIGRATION_QUICKSTART.md      # Быстрый старт
```

## Использование

### Простой запуск
```bash
./bin/migration/migrate-simple.sh
```

### С опциями
```bash
# Тестовый запуск (без изменений)
./bin/migration/migrate.sh --dry-run

# Показать список бэкапов
./bin/migration/migrate.sh --list-backups

# Откат из бэкапа
./bin/migration/migrate.sh --rollback backups/profochatbot_backup_20240101_120000.dump

# Пропустить бэкап (не рекомендуется!)
./bin/migration/migrate.sh --skip-backup
```

## Требования

1. **PostgreSQL клиентские утилиты** (`psql`, `pg_dump`, `pg_restore`)
2. **DATABASE_URL** в переменных окружения или `.env` файле

## Документация

- [MIGRATION_README.md](./MIGRATION_README.md) - Подробная документация
- [MIGRATION_QUICKSTART.md](./MIGRATION_QUICKSTART.md) - Быстрый старт
