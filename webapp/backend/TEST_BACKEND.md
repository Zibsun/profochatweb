# 🧪 Тестирование Backend

## Быстрый тест

Выполните один из скриптов:

### Вариант 1: Полный тест (требует .env файл)

```bash
cd webapp/backend
source venv/bin/activate
python test_backend.py
```

### Вариант 2: Безопасный тест (работает без .env)

```bash
cd webapp/backend
source venv/bin/activate
python test_backend_safe.py
```

### Вариант 3: Использовать bash скрипт

```bash
cd webapp/backend
./test_server.sh
```

## Ручной тест запуска сервера

### Шаг 1: Создайте .env файл (если еще не создан)

```bash
cd webapp/backend
cp .env.example .env
```

Отредактируйте `.env` и укажите минимум:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot_web
SECRET_KEY=ваш-секретный-ключ-здесь
OPENAI_API_KEY=ваш-openai-ключ
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

### Шаг 2: Запустите сервер

```bash
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Шаг 3: Проверьте работу

Откройте в браузере:

1. **Главная страница API**: http://localhost:8000
   - Должно показать: `{"message": "ProfoChatBot Web API"}`

2. **Документация Swagger**: http://localhost:8000/docs
   - Должна открыться интерактивная документация API

3. **Альтернативная документация**: http://localhost:8000/redoc
   - Альтернативный формат документации

## Проверка endpoints

### Тест корневого endpoint

```bash
curl http://localhost:8000/
```

Ожидаемый ответ:
```json
{"message": "ProfoChatBot Web API"}
```

### Тест регистрации (требует БД)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123"
  }'
```

## Решение проблем

### Ошибка "Settings validation error"

Создайте `.env` файл с необходимыми переменными (см. выше).

### Ошибка подключения к БД

1. Убедитесь, что PostgreSQL запущен
2. Проверьте `DATABASE_URL` в `.env`
3. Для теста можно использовать SQLite (измените DATABASE_URL)

### Ошибка импорта модулей

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Порт 8000 занят

Измените порт:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

## Успешный запуск

Если все работает, вы увидите:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

И сможете открыть http://localhost:8000/docs для просмотра API документации.

