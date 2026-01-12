# Система миграций базы данных

Эта папка содержит все миграции базы данных для проекта ProfoChatBot.

## Структура

```
migrations/
├── versions/              # SQL файлы миграций
├── rollbacks/            # Скрипты отката (опционально)
├── seeds/                # Seed данные (опционально)
├── templates/            # Шаблоны для новых миграций
├── tools/                # Инструменты для работы с миграциями
│   ├── migrate.sh        # Применить миграции
│   ├── create_migration.sh  # Создать новую миграцию
│   └── status.sh         # Статус миграций
└── README.md             # Этот файл
```

## Быстрый старт

### Создать новую миграцию

```bash
./migrations/tools/create_migration.sh add_user_preferences
# Создает: migrations/versions/0001_add_user_preferences.sql
```

### Проверить статус

```bash
./migrations/tools/status.sh
```

### Применить миграции

```bash
./migrations/tools/migrate.sh
```

## Документация

Подробная документация: [docs/database_migrations.md](../docs/database_migrations.md)
