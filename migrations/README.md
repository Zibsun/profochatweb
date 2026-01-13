# Система миграций базы данных

Эта папка содержит все миграции базы данных для проекта ProfoChatBot.

## Структура

```
migrations/
├── versions/              # SQL файлы миграций
│   ├── 0001_create_schema_migrations.sql
│   └── ...
├── rollbacks/            # Скрипты отката (опционально)
├── seeds/                # Seed данные (опционально)
│   └── 0001_default_account.sql
├── templates/            # Шаблоны для новых миграций
│   └── migration_template.sql
├── tools/                # Инструменты для работы с миграциями
│   ├── migrate.sh        # Применить миграции
│   ├── create_migration.sh  # Создать новую миграцию
│   ├── status.sh         # Статус миграций
│   ├── rollback.sh       # Откатить миграции
│   ├── seed.sh           # Применить seed данные
│   └── init_history.sh   # Инициализировать таблицу истории
└── README.md             # Этот файл
```

## Быстрый старт

### 1. Инициализация (один раз)

```bash
# Создать таблицу истории миграций
./migrations/tools/init_history.sh

# Или применить первую миграцию
./migrations/tools/migrate.sh
```

### 2. Создать новую миграцию

```bash
./migrations/tools/create_migration.sh add_user_preferences
# Создает: migrations/versions/0002_add_user_preferences.sql
```

### 3. Проверить статус

```bash
./migrations/tools/status.sh
```

### 4. Применить миграции

```bash
# Применить все непримененные миграции
./migrations/tools/migrate.sh

# Тестовый запуск (без изменений)
./migrations/tools/migrate.sh --dry-run

# Применить до определенной версии
./migrations/tools/migrate.sh --to 0005
```

### 5. Откатить миграции

```bash
# Откатить последнюю миграцию
./migrations/tools/rollback.sh

# Откатить до определенной версии
./migrations/tools/rollback.sh 0005

# Тестовый запуск
./migrations/tools/rollback.sh --dry-run
```

### 6. Применить seed данные

```bash
./migrations/tools/seed.sh
```

## Рабочий процесс

1. **Создать миграцию:**
   ```bash
   ./migrations/tools/create_migration.sh add_feature_name
   ```

2. **Редактировать файл миграции:**
   ```bash
   # Откроется автоматически или отредактируйте вручную
   vim migrations/versions/0002_add_feature_name.sql
   ```

3. **Проверить статус:**
   ```bash
   ./migrations/tools/status.sh
   ```

4. **Протестировать локально:**
   ```bash
   ./migrations/tools/migrate.sh --dry-run
   ```

5. **Применить миграцию:**
   ```bash
   ./migrations/tools/migrate.sh
   ```

6. **Закоммитить в Git:**
   ```bash
   git add migrations/versions/0002_add_feature_name.sql
   git commit -m "Add feature_name migration"
   ```

## Документация

Подробная документация: [docs/database_migrations.md](../docs/database_migrations.md)

## Важные замечания

- ✅ Всегда создавайте бэкап перед применением миграций в production
- ✅ Тестируйте миграции на staging окружении
- ✅ Используйте транзакции (BEGIN/COMMIT) в миграциях
- ✅ Делайте миграции идемпотентными (IF NOT EXISTS, IF EXISTS)
- ✅ Документируйте breaking changes
