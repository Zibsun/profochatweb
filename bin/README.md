# Скрипты запуска проекта

Эта папка содержит все скрипты для запуска и управления проектом.

## Структура

```
bin/
├── telegram/          # Скрипты для Telegram бота
│   ├── run.sh        # Запуск Telegram бота
│   ├── run-api.sh    # Запуск API для Telegram бота
│   └── delete_webhook.py  # Удаление webhook перед запуском
│
├── webapp/           # Скрипты для веб-приложения
│   ├── dev-backend.sh      # Запуск backend для разработки
│   ├── dev-frontend.sh     # Запуск frontend для разработки
│   ├── dev-all.sh          # Запуск всего стека
│   ├── test-backend.sh     # Тестирование backend
│   ├── setup-backend.sh    # Настройка backend
│   ├── setup-frontend.sh   # Настройка frontend
│   ├── docker-start.sh     # Запуск через Docker
│   ├── docker-stop.sh      # Остановка Docker
│   └── docker-logs.sh      # Просмотр логов Docker
│
└── utils/            # Общие утилиты
    ├── check_db.py          # Проверка подключения к базе данных
    └── complete_courses.py  # Завершение курсов (для тестирования)
```

## Telegram бот

### Запуск бота
```bash
./bin/telegram/run.sh [BOT_FOLDER]
```

### Запуск API для бота
```bash
./bin/telegram/run-api.sh
```

## Webapp

### Разработка

**Запуск backend:**
```bash
./bin/webapp/dev-backend.sh
```

**Запуск frontend:**
```bash
./bin/webapp/dev-frontend.sh
```

**Запуск всего стека:**
```bash
./bin/webapp/dev-all.sh
```

### Настройка

**Настройка backend (создание venv, установка зависимостей):**
```bash
./bin/webapp/setup-backend.sh
```

**Настройка frontend (установка зависимостей):**
```bash
./bin/webapp/setup-frontend.sh
```

### Тестирование

**Тестирование backend:**
```bash
./bin/webapp/test-backend.sh
```

### Docker

**Запуск через Docker Compose:**
```bash
./bin/webapp/docker-start.sh
```

**Остановка Docker:**
```bash
./bin/webapp/docker-stop.sh
```

**Просмотр логов:**
```bash
./bin/webapp/docker-logs.sh [service]
# service может быть: backend, frontend, db или не указан (все)
```

## Утилиты

### Проверка подключения к базе данных

**Проверка подключения к PostgreSQL:**
```bash
python bin/utils/check_db.py
```

Эта утилита проверяет подключение к базе данных и выводит:
- Версию PostgreSQL
- Имя текущей базы данных
- Список всех таблиц в схеме `public`

### Завершение курсов (для тестирования)

**Быстрое завершение всех курсов:**
```bash
./bin/complete-courses.sh --all
```

**Завершение курсов конкретного пользователя:**
```bash
./bin/complete-courses.sh --chat-id 123456789
```

**Завершение конкретного курса:**
```bash
./bin/complete-courses.sh --course-id test_course
```

**Проверка без применения изменений (dry-run):**
```bash
./bin/complete-courses.sh --all --dry-run
```

**Автоматическое подтверждение без запроса:**
```bash
./bin/complete-courses.sh --all --yes
```

**С фильтром по имени бота:**
```bash
./bin/complete-courses.sh --all --bot-name my_bot
```

Эта утилита позволяет быстро пометить курсы как завершенные (установить `is_ended = TRUE` в таблице `run`), что полезно при тестировании. По умолчанию использует `BOT_NAME` из переменных окружения или `globals.BOT_NAME`.

## Обратная совместимость

Старые скрипты в корне проекта (`run.sh`, `run_api.sh`) остаются для обратной совместимости и перенаправляют на новые скрипты в `bin/`.

