# 🔧 Исправление проблем с Backend

## Проблема 1: Отсутствует email-validator

### Решение

Установите недостающую зависимость:

```bash
cd webapp/backend
source venv/bin/activate
pip install 'pydantic[email]' email-validator
```

Или используйте скрипт:

```bash
cd webapp/backend
./fix_dependencies.sh
```

Или переустановите все зависимости:

```bash
cd webapp/backend
source venv/bin/activate
pip install -r requirements.txt
```

## Проблема 2: Отсутствует .env файл

### Решение

Создайте `.env` файл:

```bash
cd webapp/backend
cp .env.example .env
```

Затем отредактируйте `.env` и укажите реальные значения:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot_web
SECRET_KEY=ваш-случайный-секретный-ключ-здесь
OPENAI_API_KEY=ваш-openai-api-ключ
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

**Важно:**
- `SECRET_KEY` - любой случайный строковый ключ (минимум 32 символа)
- `OPENAI_API_KEY` - можно указать любой для теста, но для реальной работы нужен настоящий
- `DATABASE_URL` - строка подключения к PostgreSQL

## Быстрое исправление всех проблем

Выполните команды по порядку:

```bash
cd webapp/backend

# 1. Активируйте venv
source venv/bin/activate

# 2. Установите недостающие зависимости
pip install 'pydantic[email]' email-validator

# 3. Создайте .env файл
cp .env.example .env

# 4. Отредактируйте .env (минимум укажите SECRET_KEY)
# nano .env или vim .env

# 5. Запустите тест снова
python test_backend_safe.py
```

## После исправления

Если все исправлено, запустите сервер:

```bash
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверьте в браузере:
- http://localhost:8000 - должно показать `{"message": "ProfoChatBot Web API"}`
- http://localhost:8000/docs - документация API

