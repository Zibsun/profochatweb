# Быстрый старт миграции

## Самый простой способ

```bash
./bin/migration/migrate-simple.sh
```

Этот скрипт автоматически:
1. Загрузит `DATABASE_URL` из `.env`
2. Создаст бэкап БД
3. Запустит миграцию
4. Валидирует результат

## Требования

1. **PostgreSQL клиентские утилиты** должны быть установлены:
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # Проверка
   psql --version
   ```

2. **DATABASE_URL** должен быть настроен:
   ```bash
   # В .env файле или экспортирован
   export DATABASE_URL='postgresql://user:password@localhost:5432/profochatbot'
   ```

## Примеры использования

### Обычная миграция
```bash
./bin/migration/migrate.sh
```

### Тестовый запуск (без изменений)
```bash
./bin/migration/migrate.sh --dry-run
```

### Откат миграции
```bash
# Сначала посмотрите список бэкапов
./bin/migration/migrate.sh --list-backups

# Затем восстановите из нужного бэкапа
./bin/migration/migrate.sh --rollback backups/profochatbot_backup_20240101_120000.dump
```

## Что делать после миграции

1. **Обновить bot tokens** (вручную):
   ```sql
   UPDATE bot SET bot_token = 'YOUR_TOKEN' WHERE bot_name = 'your_bot';
   ```

2. **Создать первого участника аккаунта**:
   ```sql
   INSERT INTO account_member (account_id, telegram_user_id, telegram_username, role)
   VALUES (1, YOUR_TELEGRAM_ID, 'your_username', 'owner');
   ```

3. **Проверить валидацию**:
   ```bash
   psql $DATABASE_URL -f scripts/validate_migration.sql
   ```

4. **Обновить код приложения** для использования новой схемы

## Помощь

```bash
./bin/migration/migrate.sh --help
```

Подробная документация: [MIGRATION_README.md](./MIGRATION_README.md)
