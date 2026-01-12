# 🔧 Исправление проблемы с установкой зависимостей

## Проблема
`pip install -r requirements.txt` не работает

## Решение

### Вариант 1: Использовать скрипт установки (рекомендуется)

```bash
cd webapp/backend
chmod +x install.sh
./install.sh
```

### Вариант 2: Ручная установка

```bash
cd webapp/backend

# 1. Активируйте виртуальное окружение
source venv/bin/activate  # На Windows: venv\Scripts\activate

# 2. Обновите pip
pip install --upgrade pip setuptools wheel

# 3. Установите зависимости
pip install -r requirements.txt
```

### Вариант 3: Если есть ошибки совместимости

Если возникают ошибки с конкретными пакетами, попробуйте установить их по одному:

```bash
source venv/bin/activate

# Установите основные пакеты
pip install fastapi uvicorn[standard]
pip install sqlalchemy alembic
pip install pydantic pydantic-settings
pip install psycopg2-binary
pip install python-jose[cryptography] passlib[bcrypt]
pip install python-multipart
pip install openai python-dotenv
```

## Проверка установки

После установки проверьте:

```bash
source venv/bin/activate
python -c "import fastapi; print('FastAPI установлен:', fastapi.__version__)"
python -c "import sqlalchemy; print('SQLAlchemy установлен:', sqlalchemy.__version__)"
```

## Запуск backend

После успешной установки:

```bash
source venv/bin/activate

# Создайте .env файл если еще не создан
cp .env.example .env
# Отредактируйте .env

# Запустите сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend будет доступен на: **http://localhost:8000**

API документация: **http://localhost:8000/docs**

## Частые проблемы

### Ошибка "No module named 'pip'"
```bash
python3 -m ensurepip --upgrade
```

### Ошибка с psycopg2-binary
```bash
# Установите системные зависимости (macOS)
brew install postgresql

# Или попробуйте без binary версии
pip install psycopg2
```

### Ошибка с cryptography
```bash
# macOS
brew install openssl

# Затем установите заново
pip install --upgrade cryptography
```

### Python 3.13 совместимость
Если используете Python 3.13 и есть проблемы, попробуйте установить пакеты без строгих версий (уже исправлено в requirements.txt)

