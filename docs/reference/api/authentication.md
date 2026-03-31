# Авторизация через логин и пароль

**Версия:** 1.0  
**Дата:** 2026-01-18  
**Статус:** Документация (реализация отключена в пользу Telegram авторизации)

---

## Содержание

1. [Обзор](#1-обзор)
2. [Архитектура](#2-архитектура)
3. [API Endpoints](#3-api-endpoints)
4. [Структура данных](#4-структура-данных)
5. [Процесс аутентификации](#5-процесс-аутентификации)
6. [Безопасность](#6-безопасность)
7. [Примеры использования](#7-примеры-использования)
8. [Обработка ошибок](#8-обработка-ошибок)

---

## 1. Обзор

Система авторизации через логин и пароль использует классическую схему email/password с JWT токенами для аутентификации пользователей.

### Основные компоненты

- **Регистрация** — создание нового пользователя с email и паролем
- **Вход** — аутентификация существующего пользователя
- **JWT токены** — для авторизации последующих запросов
- **Хеширование паролей** — использование bcrypt для безопасного хранения паролей

### Текущий статус

⚠️ **Примечание:** В текущей версии системы авторизация через логин и пароль отключена в пользу Telegram авторизации. Код сохранен в `webapp/backend/app/api/v1/auth.py`, но роутер не подключен в `app/main.py`.

---

## 2. Архитектура

### 2.1 Компоненты системы

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ HTTP/HTTPS
       │ JWT Token
       ▼
┌─────────────────┐
│   FastAPI       │
│   Backend       │
└──────┬──────────┘
       │
       ├──► /api/v1/auth/register
       ├──► /api/v1/auth/login
       ├──► /api/v1/auth/logout
       └──► /api/v1/auth/me
       │
       ▼
┌─────────────────┐
│   PostgreSQL    │
│   Database      │
│   (users table) │
└─────────────────┘
```

### 2.2 Поток аутентификации

```
1. Регистрация:
   User → POST /register → Hash Password → Save to DB → Return User

2. Вход:
   User → POST /login → Verify Password → Generate JWT → Return Token

3. Защищенные запросы:
   Client → Request + JWT Token → Verify Token → Process Request
```

---

## 3. API Endpoints

### 3.1 Регистрация

**POST** `/api/v1/auth/register`

Создает нового пользователя в системе.

#### Запрос

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "secure_password123"
}
```

#### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `email` | string (EmailStr) | Да | Email пользователя (уникальный) |
| `username` | string | Да | Имя пользователя |
| `password` | string | Да | Пароль пользователя |

#### Успешный ответ (201 Created)

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "username",
  "created_at": "2026-01-18T10:00:00Z"
}
```

#### Ошибки

- **400 Bad Request** — Пользователь с таким email уже существует
  ```json
  {
    "detail": "Пользователь с таким email уже существует"
  }
  ```

- **422 Unprocessable Entity** — Невалидные данные запроса

### 3.2 Вход

**POST** `/api/v1/auth/login`

Аутентифицирует пользователя и возвращает JWT токен.

#### Запрос

**Form Data:**
```
email: user@example.com
password: secure_password123
```

**Или JSON:**
```json
{
  "email": "user@example.com",
  "password": "secure_password123"
}
```

#### Параметры

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `email` | string | Да | Email пользователя |
| `password` | string | Да | Пароль пользователя |

#### Успешный ответ (200 OK)

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "username",
    "created_at": "2026-01-18T10:00:00Z"
  }
}
```

#### Ошибки

- **401 Unauthorized** — Неверный email или пароль
  ```json
  {
    "detail": "Неверный email или пароль"
  }
  ```

### 3.3 Выход

**POST** `/api/v1/auth/logout`

Выход пользователя из системы (заглушка).

#### Успешный ответ (200 OK)

```json
{
  "message": "Выход выполнен"
}
```

**Примечание:** В текущей реализации это заглушка. Для полноценного выхода необходимо:
- Удалить токен на клиенте
- Добавить blacklist токенов на сервере (опционально)

### 3.4 Информация о текущем пользователе

**GET** `/api/v1/auth/me`

Возвращает информацию о текущем аутентифицированном пользователе.

#### Заголовки

```
Authorization: Bearer <access_token>
```

#### Успешный ответ (200 OK)

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "username",
  "created_at": "2026-01-18T10:00:00Z"
}
```

#### Ошибки

- **401 Unauthorized** — Токен отсутствует или невалиден
  ```json
  {
    "detail": "Неверный токен аутентификации"
  }
  ```

---

## 4. Структура данных

### 4.1 Модель User (База данных)

```python
class User(Base):
    __tablename__ = "users"
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
```

### 4.2 Схемы Pydantic

#### UserCreate (для регистрации)

```python
class UserCreate(UserBase):
    password: str
```

#### UserResponse (ответ API)

```python
class UserResponse(UserBase):
    user_id: UUID
    created_at: datetime
```

### 4.3 JWT Токен

Структура payload JWT токена:

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1705665600
}
```

- `sub` — user_id пользователя (UUID в строковом формате)
- `exp` — время истечения токена (Unix timestamp)

**Время жизни токена:** 30 минут (настраивается в коде)

---

## 5. Процесс аутентификации

### 5.1 Регистрация

1. Клиент отправляет POST запрос на `/api/v1/auth/register` с данными пользователя
2. Сервер проверяет уникальность email
3. Пароль хешируется с помощью bcrypt
4. Создается запись в таблице `users`
5. Возвращается информация о пользователе (без пароля)

### 5.2 Вход

1. Клиент отправляет POST запрос на `/api/v1/auth/login` с email и паролем
2. Сервер находит пользователя по email
3. Проверяется соответствие пароля с помощью `verify_password()`
4. Генерируется JWT токен с user_id
5. Возвращается токен и информация о пользователе

### 5.3 Использование токена

1. Клиент сохраняет токен (обычно в localStorage или cookie)
2. При каждом запросе к защищенным endpoints токен отправляется в заголовке:
   ```
   Authorization: Bearer <access_token>
   ```
3. Сервер проверяет токен через dependency `get_current_user()`
4. Если токен валиден, запрос обрабатывается

---

## 6. Безопасность

### 6.1 Хеширование паролей

- **Алгоритм:** bcrypt
- **Библиотека:** passlib
- **Контекст:** `CryptContext(schemes=["bcrypt"], deprecated="auto")`

Пароли никогда не хранятся в открытом виде. При регистрации пароль хешируется:

```python
hashed_password = get_password_hash(password)
```

При входе пароль проверяется:

```python
verify_password(plain_password, hashed_password)
```

### 6.2 JWT Токены

- **Алгоритм:** HS256
- **Секретный ключ:** `SECRET_KEY` из переменных окружения
- **Время жизни:** 30 минут (по умолчанию)

**Важно:** Секретный ключ должен быть:
- Случайным и уникальным
- Минимум 32 символа
- Храниться в переменных окружения (`.env`)

### 6.3 Защита endpoints

Защищенные endpoints используют dependency injection:

```python
from app.api.deps import get_current_user

@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_user)):
    # Текущий пользователь доступен через current_user
    return {"user_id": current_user.user_id}
```

### 6.4 Рекомендации по безопасности

1. **HTTPS:** Всегда используйте HTTPS в production
2. **Валидация паролей:** Реализуйте требования к сложности пароля
3. **Rate limiting:** Добавьте ограничение на количество попыток входа
4. **Refresh tokens:** Рассмотрите использование refresh токенов для продления сессии
5. **Token blacklist:** Реализуйте blacklist для отозванных токенов

---

## 7. Примеры использования

### 7.1 Регистрация (cURL)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "secure_password123"
  }'
```

### 7.2 Вход (cURL)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=user@example.com&password=secure_password123"
```

### 7.3 Защищенный запрос (cURL)

```bash
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 7.4 Frontend (TypeScript/React)

#### Регистрация

```typescript
import { authApi } from '@/lib/api/auth'

const registerUser = async () => {
  try {
    const response = await authApi.register({
      email: 'user@example.com',
      username: 'username',
      password: 'secure_password123'
    })
    console.log('User registered:', response.user)
  } catch (error) {
    console.error('Registration failed:', error)
  }
}
```

#### Вход

```typescript
import { authApi } from '@/lib/api/auth'

const loginUser = async () => {
  try {
    const response = await authApi.login({
      email: 'user@example.com',
      password: 'secure_password123'
    })
    
    // Сохранение токена
    localStorage.setItem('auth_token', response.access_token)
    console.log('Logged in:', response.user)
  } catch (error) {
    console.error('Login failed:', error)
  }
}
```

#### Защищенный запрос

```typescript
import { apiClient } from '@/lib/api/client'

const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/auth/me')
    console.log('Current user:', response.data)
  } catch (error) {
    console.error('Failed to get user:', error)
  }
}
```

---

## 8. Обработка ошибок

### 8.1 Коды состояния HTTP

| Код | Описание | Когда возникает |
|-----|----------|-----------------|
| 200 | OK | Успешный запрос |
| 201 | Created | Успешная регистрация |
| 400 | Bad Request | Невалидные данные или пользователь уже существует |
| 401 | Unauthorized | Неверные учетные данные или невалидный токен |
| 422 | Unprocessable Entity | Ошибка валидации данных |

### 8.2 Формат ошибок

Все ошибки возвращаются в формате:

```json
{
  "detail": "Описание ошибки"
}
```

### 8.3 Типичные ошибки

#### Пользователь уже существует

```json
{
  "detail": "Пользователь с таким email уже существует"
}
```

#### Неверные учетные данные

```json
{
  "detail": "Неверный email или пароль"
}
```

#### Невалидный токен

```json
{
  "detail": "Неверный токен аутентификации",
  "headers": {
    "WWW-Authenticate": "Bearer"
  }
}
```

---

## Приложение A: Конфигурация

### Переменные окружения

```bash
# .env
SECRET_KEY=your-secret-key-minimum-32-characters-long
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Зависимости

Основные библиотеки для работы авторизации:

```txt
fastapi
python-jose[cryptography]  # Для JWT
passlib[bcrypt]              # Для хеширования паролей
python-multipart            # Для form data
```

---

## Приложение B: Файлы реализации

### Backend

- `webapp/backend/app/api/v1/auth.py` — API endpoints
- `webapp/backend/app/core/security.py` — Функции безопасности (JWT, хеширование)
- `webapp/backend/app/models/user.py` — Модель User
- `webapp/backend/app/schemas/user.py` — Pydantic схемы
- `webapp/backend/app/api/deps.py` — Dependencies для аутентификации

### Frontend

- `webapp/frontend/lib/api/auth.ts` — API клиент для авторизации
- `webapp/frontend/lib/api/client.ts` — HTTP клиент с JWT interceptors
- `webapp/frontend/app/(auth)/login/page.tsx` — Страница входа (текущая версия для Telegram)

---

## Приложение C: Включение авторизации через логин/пароль

Если необходимо включить авторизацию через логин и пароль:

1. Раскомментировать импорт в `webapp/backend/app/main.py`:
   ```python
   from app.api.v1 import auth
   ```

2. Раскомментировать регистрацию роутера:
   ```python
   app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
   ```

3. Раскомментировать импорт модели User в `webapp/backend/app/api/v1/auth.py`:
   ```python
   from app.models.user import User
   ```

4. Раскомментировать функцию `get_current_user` в `webapp/backend/app/api/deps.py`

5. Убедиться, что таблица `users` существует в базе данных

---

**Последнее обновление:** 2026-01-18
