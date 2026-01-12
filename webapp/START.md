# Быстрый запуск ProfoChatBot Web

## Вариант 1: Запуск через Docker Compose (рекомендуется)

### Шаг 1: Настройка переменных окружения

```bash
cd webapp
cp backend/.env.example backend/.env
```

Отредактируйте `backend/.env` и укажите:
- `OPENAI_API_KEY` - ваш ключ OpenAI (можно оставить пустым для теста)
- `SECRET_KEY` - любой случайный секретный ключ

### Шаг 2: Запуск всех сервисов

```bash
cd webapp
docker-compose up -d
```

Это запустит:
- PostgreSQL на порту 5433
- Backend API на порту 8000
- Frontend на порту 3000

### Шаг 3: Применение миграций БД

```bash
docker-compose exec backend alembic upgrade head
```

Если миграций еще нет, создайте их:
```bash
docker-compose exec backend alembic revision --autogenerate -m "Initial migration"
docker-compose exec backend alembic upgrade head
```

### Шаг 4: Откройте в браузере

- Frontend: http://localhost:3000
- Тестовая страница: http://localhost:3000/test
- Backend API: http://localhost:8000
- API документация: http://localhost:8000/docs

---

## Вариант 2: Локальный запуск (для разработки)

### Backend

```bash
cd webapp/backend

# Создайте виртуальное окружение
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate

# Установите зависимости
pip install -r requirements.txt

# Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env

# Запустите сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

В новом терминале:

```bash
cd webapp/frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

---

## Проверка работы

1. Откройте http://localhost:3000/test - должна открыться тестовая страница
2. Откройте http://localhost:8000/docs - должна открыться документация API
3. На тестовой странице нажмите "Проверить Backend API" - должно появиться сообщение

---

## Остановка Docker Compose

```bash
cd webapp
docker-compose down
```

Для полной очистки (включая данные БД):
```bash
docker-compose down -v
```

---

## Решение проблем

### Порт уже занят
Если порт 3000 или 8000 занят, измените порты в `docker-compose.yml`

### Ошибка подключения к БД
Убедитесь, что PostgreSQL запущен и переменная `DATABASE_URL` правильная

### Ошибки при установке зависимостей
- Frontend: удалите `node_modules` и `package-lock.json`, затем `npm install`
- Backend: пересоздайте виртуальное окружение

