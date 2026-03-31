# План реализации: Multitenancy + Telegram Auth + Роли

**Версия:** 1.1  
**Дата:** 2026-01-18  
**Обновлено:** 2026-01-18  
**Статус:** План реализации (обновлен после уточнений)  
**Основано на:** `multitenancy_telegram_auth.md`  
**Контекст:** Продукт работает локально, деплоя на сервер нет

**Уточнения:**
- Пользователей нет, миграция не требуется - начинаем с чистой таблицы `users`
- Бот для авторизации: `enraidrobot` (настраивается в `account.settings`)
- Переменные окружения хранятся в `.env`
- `super_admin` назначается вручную в БД
- Общая страница аккаунтов не нужна

---

## Содержание

1. [Обзор и текущее состояние](#1-обзор-и-текущее-состояние)
2. [Архитектурные решения](#2-архитектурные-решения)
3. [Этапы реализации](#3-этапы-реализации)
4. [Детальный план по этапам](#4-детальный-план-по-этапам)
5. [Вопросы для уточнения](#5-вопросы-для-уточнения)
6. [Риски и митигация](#6-риски-и-митигация)
7. [Тестирование](#7-тестирование)
8. [Чеклист готовности](#8-чеклист-готовности)

---

## 1. Обзор и текущее состояние

### 1.1 Текущая архитектура

**База данных:**
- ✅ Таблица `account` существует (миграция 0003)
- ✅ Таблица `account_member` существует, но использует `telegram_user_id` напрямую (без связи с `users`)
- ⚠️ Таблица `users` существует, но использует UUID и email/password модель
- ✅ Все бизнес-таблицы имеют `account_id` с default=1

**Backend (FastAPI):**
- ✅ JWT токены реализованы (`app/core/security.py`)
- ✅ Dependency для получения текущего пользователя (`app/api/deps.py`)
- ⚠️ Авторизация через email/password (`app/api/v1/auth.py`)
- ⚠️ Модель `User` использует UUID, не соответствует требованиям

**Frontend (Next.js 14 App Router):**
- ✅ Страница логина существует (`app/(auth)/login/page.tsx`)
- ✅ API клиент с JWT interceptors (`lib/api/client.ts`)
- ⚠️ `getAccountId()` возвращает жестко закодированное значение `1`
- ⚠️ Нет Telegram Login Widget

### 1.2 Что нужно изменить

1. **База данных:**
   - Создать новую таблицу `users` с правильной структурой (INT, Telegram поля)
   - Изменить `account_member` для связи с `users.user_id` вместо `telegram_user_id`
   - Добавить конфигурацию Telegram бота в `account.settings` (или отдельное поле)

2. **Backend:**
   - Создать новые модели для `users` и `account_member`
   - Реализовать Telegram авторизацию (валидация данных от Telegram)
   - Обновить JWT токены для включения `account_id` и `role`
   - Создать middleware/dependencies для проверки прав доступа
   - Обновить все endpoints для использования `account_id` из токена

3. **Frontend:**
   - Интегрировать Telegram Login Widget
   - Обновить `getAccountId()` для получения из сессии/токена
   - Добавить компонент переключения аккаунтов (для мультитенантности)
   - Обновить все API routes для передачи `account_id`
   - Добавить проверки прав доступа на уровне UI

---

## 2. Архитектурные решения

### 2.1 Структура JWT токена

```json
{
  "sub": "user_id (INT)",
  "account_id": 1,
  "role": "owner|admin|teacher|instructional_designer|member",
  "is_super_admin": false,
  "telegram_user_id": 123456789,
  "exp": 1234567890
}
```

**Важно:** При переключении аккаунта пользователь должен перелогиниться или токен должен быть обновлен.

### 2.2 Telegram Login Widget

**Вариант 1 (рекомендуемый):** Использовать официальный Telegram Login Widget  
**Вариант 2:** Использовать Telegram Web App SDK (если планируется интеграция с Telegram Web Apps)

**Параметры виджета:**
- `bot_name` - имя бота для авторизации (по умолчанию `enraidrobot`, настраивается в `account.settings`)
- `request_access` - запрашивать доступ к контактам (опционально)
- `callback_url` - URL для обработки callback

**Конфигурация бота:**
- Бот настраивается на уровне аккаунта в `account.settings.telegram_auth_bot_name`
- По умолчанию используется `enraidrobot`
- Owner аккаунта может изменить имя бота в настройках аккаунта

### 2.3 Валидация данных Telegram

Telegram Login Widget возвращает данные в формате:
```json
{
  "id": 123456789,
  "first_name": "John",
  "last_name": "Doe",
  "username": "johndoe",
  "photo_url": "https://...",
  "auth_date": 1234567890,
  "hash": "abc123..."
}
```

**Безопасность:** Необходимо валидировать `hash` используя секретный ключ бота.

### 2.4 Управление сессией и переключение аккаунтов

**Подход:**
- JWT токен содержит один `account_id`
- При переключении аккаунта:
  - Пользователь выбирает аккаунт из списка
  - Backend выдает новый JWT токен с новым `account_id`
  - Frontend обновляет токен в localStorage

**Альтернатива:** Хранить список доступных аккаунтов в токене (увеличит размер токена).

---

## 3. Этапы реализации

### Этап 1: Миграция базы данных
**Цель:** Привести структуру БД в соответствие с требованиями

### Этап 2: Backend - Модели и схемы
**Цель:** Создать новые модели и схемы для работы с Telegram auth

### Этап 3: Backend - Авторизация через Telegram
**Цель:** Реализовать endpoints для Telegram авторизации

### Этап 4: Backend - Система прав доступа
**Цель:** Создать middleware и dependencies для проверки прав

### Этап 5: Backend - Обновление существующих endpoints
**Цель:** Обновить все endpoints для использования account_id из токена

### Этап 6: Frontend - Telegram Login Widget
**Цель:** Интегрировать Telegram авторизацию на фронтенде

### Этап 7: Frontend - Управление сессией и аккаунтами
**Цель:** Реализовать переключение аккаунтов и обновить getAccountId()

### Этап 8: Frontend - Проверки прав доступа
**Цель:** Добавить проверки прав на уровне UI

### Этап 9: Тестирование и документация
**Цель:** Протестировать все сценарии и обновить документацию

---

## 4. Детальный план по этапам

### Этап 1: Миграция базы данных

#### 1.1 Создать миграцию для таблицы `users`

**Файл:** `migrations/versions/0007_telegram_auth_users.sql`

**Действия:**
1. Удалить старую таблицу `users` (если существует) и создать новую с правильной структурой:
   ```sql
   -- Удаляем старую таблицу (пользователей нет, данные не нужны)
   DROP TABLE IF EXISTS users CASCADE;
   
   -- Создаем новую таблицу users
   CREATE TABLE users (
       user_id SERIAL PRIMARY KEY,
       telegram_user_id BIGINT UNIQUE NOT NULL,
       telegram_username TEXT,
       first_name TEXT,
       last_name TEXT,
       language_code TEXT,
       photo_url TEXT,
       last_login_at TIMESTAMPTZ,
       is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
       email TEXT,  -- Legacy поле (опционально)
       password_hash TEXT,  -- Legacy поле (опционально)
       created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Создать индексы:
   ```sql
   CREATE INDEX idx_users_telegram_user_id ON users(telegram_user_id);
   CREATE INDEX idx_users_is_super_admin ON users(is_super_admin);
   ```

**Примечание:** Так как пользователей нет, миграция данных не требуется.

#### 1.2 Обновить таблицу `account_member`

**Файл:** `migrations/versions/0007_telegram_auth_users.sql` (продолжение)

**Действия:**
1. Добавить колонку `user_id` (если её нет):
   ```sql
   ALTER TABLE account_member 
   ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(user_id);
   ```

2. Если есть существующие записи в `account_member`, заполнить `user_id` на основе `telegram_user_id`:
   ```sql
   -- Заполняем user_id для существующих записей (если есть)
   UPDATE account_member am
   SET user_id = u.user_id
   FROM users u
   WHERE am.telegram_user_id = u.telegram_user_id
   AND am.user_id IS NULL;
   ```

3. Для новых записей `user_id` будет обязательным. Для существующих можно оставить NULL временно:
   ```sql
   -- Пока оставляем user_id как nullable для существующих записей
   -- После полной миграции можно сделать NOT NULL
   ```

4. Обновить уникальное ограничение (добавить новое, если нужно):
   ```sql
   -- Удаляем старое ограничение по telegram_user_id (если существует)
   ALTER TABLE account_member 
   DROP CONSTRAINT IF EXISTS account_member_account_id_telegram_user_id_key;
   
   -- Добавляем новое ограничение по user_id
   ALTER TABLE account_member 
   ADD CONSTRAINT account_member_account_id_user_id_key 
   UNIQUE (account_id, user_id);
   ```

5. Добавить CHECK для ролей:
   ```sql
   ALTER TABLE account_member 
   DROP CONSTRAINT IF EXISTS account_member_role_check;
   
   ALTER TABLE account_member 
   ADD CONSTRAINT account_member_role_check 
   CHECK (role IN ('owner', 'admin', 'teacher', 'instructional_designer', 'member'));
   ```

**Примечание:** 
- Колонку `telegram_user_id` можно оставить для обратной совместимости или удалить после проверки
- Если есть существующие записи в `account_member`, их нужно будет связать с новыми пользователями вручную

#### 1.3 Добавить конфигурацию Telegram бота в account.settings

**Файл:** `migrations/versions/0007_telegram_auth_users.sql` (продолжение)

**Действия:**
1. Установить значение по умолчанию для существующих аккаунтов:
   ```sql
   -- Устанавливаем значение по умолчанию для существующих аккаунтов
   UPDATE account
   SET settings = COALESCE(settings, '{}'::jsonb) || 
       jsonb_build_object('telegram_auth_bot_name', 'enraidrobot')
   WHERE settings->>'telegram_auth_bot_name' IS NULL;
   ```

**Примечание:** Имя бота хранится в `account.settings.telegram_auth_bot_name`, по умолчанию `enraidrobot`.

#### 1.4 Создать тестовые данные (опционально)

**Файл:** `migrations/seeds/0002_telegram_auth_test_data.sql`

**Действия:**
1. Создать тестового пользователя (super_admin) - вручную в БД:
   ```sql
   -- Выполнить вручную для создания super_admin
   -- INSERT INTO users (telegram_user_id, telegram_username, first_name, is_super_admin)
   -- VALUES (YOUR_TELEGRAM_ID, 'your_username', 'Your Name', TRUE);
   ```

2. Создать тестового пользователя для аккаунта:
   ```sql
   -- Выполнить вручную для создания owner аккаунта
   -- INSERT INTO users (telegram_user_id, telegram_username, first_name)
   -- VALUES (YOUR_TELEGRAM_ID, 'your_username', 'Your Name');
   -- 
   -- INSERT INTO account_member (account_id, user_id, role)
   -- VALUES (
   --     1, 
   --     (SELECT user_id FROM users WHERE telegram_user_id = YOUR_TELEGRAM_ID),
   --     'owner'
   -- );
   ```

**Примечание:** Тестовые данные создаются вручную через SQL или через UI после реализации авторизации.

---

### Этап 2: Backend - Модели и схемы

#### 2.1 Создать модель `User` (новая)

**Файл:** `webapp/backend/app/models/user_telegram.py`

```python
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class UserTelegram(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    telegram_user_id = Column(BigInteger, unique=True, nullable=False, index=True)
    telegram_username = Column(String)
    first_name = Column(String)
    last_name = Column(String)
    language_code = Column(String)
    photo_url = Column(String)
    last_login_at = Column(DateTime(timezone=True))
    is_super_admin = Column(Boolean, nullable=False, default=False)
    # Legacy поля
    email = Column(String)
    password_hash = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

#### 2.2 Создать модель `AccountMember`

**Файл:** `webapp/backend/app/models/account_member.py`

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AccountMember(Base):
    __tablename__ = "account_member"
    
    account_member_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("account.account_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'admin', 'teacher', 'instructional_designer', 'member')",
            name="account_member_role_check"
        ),
    )
    
    # Relationships
    user = relationship("UserTelegram", backref="account_memberships")
    account = relationship("Account", backref="members")
```

#### 2.3 Создать модель `Account`

**Файл:** `webapp/backend/app/models/account.py`

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base

class Account(Base):
    __tablename__ = "account"
    
    account_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    plan = Column(String, default='free')
    is_active = Column(Boolean, default=True)
    settings = Column(JSONB)  # Хранит telegram_auth_bot_name и другие настройки
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def get_telegram_auth_bot_name(self) -> str:
        """Получить имя бота для авторизации из настроек"""
        if self.settings and 'telegram_auth_bot_name' in self.settings:
            return self.settings['telegram_auth_bot_name']
        return 'enraidrobot'  # Значение по умолчанию
```

#### 2.4 Создать Pydantic схемы

**Файл:** `webapp/backend/app/schemas/telegram_auth.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TelegramAuthData(BaseModel):
    """Данные от Telegram Login Widget"""
    id: int  # telegram_user_id
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class UserResponse(BaseModel):
    user_id: int
    telegram_user_id: int
    telegram_username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    is_super_admin: bool
    
    class Config:
        from_attributes = True

class AccountMemberResponse(BaseModel):
    account_member_id: int
    account_id: int
    user_id: int
    role: str
    is_active: bool
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    account_id: int
    role: str
    available_accounts: list[dict]  # Список доступных аккаунтов
```

---

### Этап 3: Backend - Авторизация через Telegram

#### 3.1 Создать утилиту для валидации Telegram данных

**Файл:** `webapp/backend/app/core/telegram_auth.py`

```python
import hashlib
import hmac
import time
from typing import Optional
from app.config import settings

def validate_telegram_auth(
    auth_data: dict,
    bot_token: str
) -> bool:
    """
    Валидация данных от Telegram Login Widget
    
    Проверяет hash используя секретный ключ бота
    """
    # Извлекаем hash
    received_hash = auth_data.pop('hash', None)
    if not received_hash:
        return False
    
    # Проверяем время (данные не должны быть старше 24 часов)
    auth_date = auth_data.get('auth_date', 0)
    if time.time() - auth_date > 86400:
        return False
    
    # Создаем строку для проверки
    data_check_string = '\n'.join(
        f"{k}={v}" for k, v in sorted(auth_data.items())
    )
    
    # Вычисляем секретный ключ
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    # Вычисляем hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == received_hash
```

**Примечание:** 
- Токен бота хранится в переменной окружения `TELEGRAM_AUTH_BOT_TOKEN` в `.env`
- Имя бота настраивается в `account.settings.telegram_auth_bot_name` (по умолчанию `enraidrobot`)
- Для валидации используется глобальный токен из `TELEGRAM_AUTH_BOT_TOKEN` (один токен для всех аккаунтов)
- Имя бота используется только для отображения виджета на фронтенде, валидация происходит по токену

#### 3.2 Создать endpoint для Telegram авторизации

**Файл:** `webapp/backend/app/api/v1/auth_telegram.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.telegram_auth import TelegramAuthData, AuthResponse
from app.models.user_telegram import UserTelegram
from app.models.account_member import AccountMember
from app.core.security import create_access_token
from app.core.telegram_auth import validate_telegram_auth
from app.config import settings

router = APIRouter()

@router.post("/telegram/login", response_model=AuthResponse)
async def telegram_login(
    auth_data: TelegramAuthData,
    account_id: Optional[int] = None,  # Опционально: для выбора аккаунта
    db: Session = Depends(get_db)
):
    """
    Авторизация через Telegram Login Widget
    
    1. Валидирует данные от Telegram
    2. Создает или обновляет пользователя в БД
    3. Находит доступные аккаунты пользователя
    4. Возвращает JWT токен с account_id и role
    
    Примечание: Имя бота для валидации берется из account.settings.telegram_auth_bot_name
    или используется глобальный токен из TELEGRAM_AUTH_BOT_TOKEN
    """
    # Валидация данных Telegram
    # Используем глобальный токен из переменных окружения
    bot_token = settings.TELEGRAM_AUTH_BOT_TOKEN
    if not validate_telegram_auth(auth_data.dict(), bot_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные данные авторизации Telegram"
        )
    
    # Поиск или создание пользователя
    user = db.query(UserTelegram).filter(
        UserTelegram.telegram_user_id == auth_data.id
    ).first()
    
    if not user:
        # Создание нового пользователя
        user = UserTelegram(
            telegram_user_id=auth_data.id,
            telegram_username=auth_data.username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            photo_url=auth_data.photo_url,
            last_login_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Обновление данных пользователя
        user.telegram_username = auth_data.username
        user.first_name = auth_data.first_name
        user.last_name = auth_data.last_name
        user.photo_url = auth_data.photo_url
        user.last_login_at = datetime.utcnow()
        db.commit()
    
    # Поиск доступных аккаунтов
    account_members = db.query(AccountMember).filter(
        AccountMember.user_id == user.user_id,
        AccountMember.is_active == True
    ).all()
    
    if not account_members:
        # Если нет аккаунтов, создаем дефолтный (для MVP)
        # Или возвращаем ошибку
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь не является участником ни одного аккаунта"
        )
    
    # Выбор аккаунта
    if account_id:
        selected_member = next(
            (m for m in account_members if m.account_id == account_id),
            None
        )
        if not selected_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет доступа к указанному аккаунту"
            )
    else:
        # Выбираем первый доступный аккаунт (или аккаунт с ролью owner)
        selected_member = next(
            (m for m in account_members if m.role == 'owner'),
            account_members[0]
        )
    
    # Обновление last_login_at для account_member
    selected_member.last_login_at = datetime.utcnow()
    db.commit()
    
    # Создание JWT токена
    token_data = {
        "sub": str(user.user_id),
        "account_id": selected_member.account_id,
        "role": selected_member.role,
        "is_super_admin": user.is_super_admin,
        "telegram_user_id": user.telegram_user_id
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(days=7)  # Токен на 7 дней
    )
    
    # Формирование списка доступных аккаунтов
    available_accounts = [
        {
            "account_id": m.account_id,
            "role": m.role,
            "name": m.account.name  # Нужно добавить relationship
        }
        for m in account_members
    ]
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user),
        account_id=selected_member.account_id,
        role=selected_member.role,
        available_accounts=available_accounts
    )
```

**Примечания:**
- Срок жизни токена: 7 дней (можно настроить)
- Refresh токена: не требуется на MVP
- Если пользователь не является участником аккаунта: возвращается ошибка 403

#### 3.3 Создать endpoint для переключения аккаунта

**Файл:** `webapp/backend/app/api/v1/auth_telegram.py` (продолжение)

```python
@router.post("/telegram/switch-account", response_model=AuthResponse)
async def switch_account(
    account_id: int,
    current_user: UserTelegram = Depends(get_current_user_telegram),
    db: Session = Depends(get_db)
):
    """
    Переключение на другой аккаунт
    
    Выдает новый JWT токен с новым account_id
    """
    # Проверка доступа к аккаунту
    account_member = db.query(AccountMember).filter(
        AccountMember.user_id == current_user.user_id,
        AccountMember.account_id == account_id,
        AccountMember.is_active == True
    ).first()
    
    if not account_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к указанному аккаунту"
        )
    
    # Создание нового токена
    token_data = {
        "sub": str(current_user.user_id),
        "account_id": account_member.account_id,
        "role": account_member.role,
        "is_super_admin": current_user.is_super_admin,
        "telegram_user_id": current_user.telegram_user_id
    }
    
    access_token = create_access_token(
        token_data,
        expires_delta=timedelta(days=7)
    )
    
    # Получение списка доступных аккаунтов
    account_members = db.query(AccountMember).filter(
        AccountMember.user_id == current_user.user_id,
        AccountMember.is_active == True
    ).all()
    
    available_accounts = [
        {
            "account_id": m.account_id,
            "role": m.role,
            "name": m.account.name
        }
        for m in account_members
    ]
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.from_orm(current_user),
        account_id=account_member.account_id,
        role=account_member.role,
        available_accounts=available_accounts
    )
```

---

### Этап 4: Backend - Система прав доступа

#### 4.1 Создать dependency для получения текущего пользователя и аккаунта

**Файл:** `webapp/backend/app/api/deps_telegram.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user_telegram import UserTelegram
from app.models.account_member import AccountMember

security = HTTPBearer()

def get_current_user_telegram(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserTelegram:
    """Получение текущего пользователя из JWT токена"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
        )
    
    user = db.query(UserTelegram).filter(
        UserTelegram.user_id == int(user_id)
    ).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    
    return user

def get_current_account_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> int:
    """Получение account_id из JWT токена"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен аутентификации",
        )
    
    account_id = payload.get("account_id")
    if account_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен не содержит account_id",
        )
    
    return int(account_id)

def get_current_user_and_account(
    user: UserTelegram = Depends(get_current_user_telegram),
    account_id: int = Depends(get_current_account_id),
    db: Session = Depends(get_db)
) -> tuple[UserTelegram, AccountMember]:
    """Получение пользователя и его членства в аккаунте"""
    account_member = db.query(AccountMember).filter(
        AccountMember.user_id == user.user_id,
        AccountMember.account_id == account_id,
        AccountMember.is_active == True
    ).first()
    
    if not account_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа к аккаунту"
        )
    
    return user, account_member
```

#### 4.2 Создать функции проверки прав доступа

**Файл:** `webapp/backend/app/core/permissions.py`

```python
from typing import List
from app.models.user_telegram import UserTelegram
from app.models.account_member import AccountMember

# Роли в порядке убывания привилегий
ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'instructional_designer': 2,
    'teacher': 2,
    'member': 1
}

def check_permission(
    user: UserTelegram,
    account_member: AccountMember,
    required_roles: List[str],
    allow_super_admin: bool = True
) -> bool:
    """
    Проверка прав доступа
    
    Args:
        user: Пользователь
        account_member: Членство в аккаунте
        required_roles: Список ролей, которые имеют доступ
        allow_super_admin: Разрешить доступ super_admin без проверки роли
    
    Returns:
        True если доступ разрешен
    """
    # Super admin имеет доступ ко всему
    if allow_super_admin and user.is_super_admin:
        return True
    
    # Проверка роли
    return account_member.role in required_roles

def require_role(
    required_roles: List[str],
    allow_super_admin: bool = True
):
    """
    Dependency для проверки роли в endpoint
    
    Usage:
        @router.get("/admin-only")
        def admin_endpoint(
            user_and_account: tuple = Depends(require_role(['admin', 'owner']))
        ):
            ...
    """
    def check(user_and_account: tuple):
        user, account_member = user_and_account
        if not check_permission(user, account_member, required_roles, allow_super_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join(required_roles)}"
            )
        return user_and_account
    return check

# Конкретные проверки для разных разделов
def can_manage_account(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять настройками аккаунта"""
    return check_permission(user, account_member, ['owner'])

def can_manage_members(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять участниками аккаунта"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_manage_bots(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять ботами"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_manage_courses(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять курсами"""
    return check_permission(
        user, account_member, 
        ['owner', 'admin', 'instructional_designer']
    )

def can_manage_groups(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять группами"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_view_groups(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может просматривать группы"""
    return check_permission(
        user, account_member, 
        ['owner', 'admin', 'teacher']
    )

def can_view_analytics(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может просматривать аналитику"""
    return check_permission(
        user, account_member,
        ['owner', 'admin', 'teacher', 'instructional_designer']
    )
```

---

### Этап 5: Backend - Обновление существующих endpoints

#### 5.1 Обновить все endpoints для использования account_id из токена

**Принцип:** Все endpoints должны:
1. Получать `account_id` из токена через `get_current_account_id()`
2. Фильтровать данные по `account_id`
3. Проверять права доступа перед операциями

**Примеры:**

**Файл:** `webapp/backend/app/api/v1/bots.py` (пример)

```python
from app.api.deps_telegram import get_current_account_id, get_current_user_and_account
from app.core.permissions import can_manage_bots, require_role

@router.get("/bots")
def get_bots(
    account_id: int = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    """Получение списка ботов для текущего аккаунта"""
    bots = db.query(Bot).filter(
        Bot.account_id == account_id,
        Bot.is_active == True
    ).all()
    return bots

@router.post("/bots")
def create_bot(
    bot_data: BotCreate,
    user_and_account: tuple = Depends(require_role(['owner', 'admin'])),
    account_id: int = Depends(get_current_account_id),
    db: Session = Depends(get_db)
):
    """Создание нового бота"""
    # Проверка прав уже выполнена в require_role
    bot = Bot(
        account_id=account_id,
        **bot_data.dict()
    )
    db.add(bot)
    db.commit()
    return bot
```

**Список файлов для обновления:**
- `app/api/v1/bots.py` (если существует)
- `app/api/v1/courses.py`
- `app/api/v1/groups.py` (если существует)
- Все другие endpoints, работающие с данными

**Примечание:** 
- Список существующих endpoints нужно определить при анализе кодовой базы
- Критичные endpoints для MVP: авторизация, курсы, группы, боты

---

### Этап 6: Frontend - Telegram Login Widget

#### 6.1 Установить зависимости

```bash
# Telegram Login Widget не требует дополнительных пакетов,
# используется через script тег или npm пакет @twa-dev/sdk (для Web Apps)
```

#### 6.2 Создать компонент Telegram Login Widget

**Файл:** `webapp/frontend/components/auth/TelegramLogin.tsx`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginProps {
  botName: string
  onAuth: (user: TelegramUser) => void
  onError?: (error: string) => void
}

declare global {
  interface Window {
    Telegram?: {
      Login: {
        auth: (options: {
          bot_id: string
          request_access?: boolean
          callback?: (user: TelegramUser) => void
        }) => void
      }
    }
  }
}

export function TelegramLogin({ botName, onAuth, onError }: TelegramLoginProps) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Загрузка Telegram Login Widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', botName)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-userpic', 'true')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    
    // Глобальная функция для callback
    ;(window as any).onTelegramAuth = (user: TelegramUser) => {
      try {
        onAuth(user)
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Unknown error')
      }
    }

    if (containerRef.current) {
      containerRef.current.appendChild(script)
    }

    return () => {
      // Cleanup
      if ((window as any).onTelegramAuth) {
        delete (window as any).onTelegramAuth
      }
    }
  }, [botName, onAuth, onError])

  return <div ref={containerRef} />
}
```

#### 6.3 Обновить страницу логина

**Файл:** `webapp/frontend/app/(auth)/login/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TelegramLogin } from '@/components/auth/TelegramLogin'
import { authApi } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTelegramAuth = async (user: any) => {
    setError('')
    setLoading(true)

    try {
      const response = await authApi.telegramLogin(user)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('account_id', String(response.account_id))
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  // Имя бота по умолчанию - enraidrobot
  // Можно получать из настроек аккаунта через API перед авторизацией
  // Или использовать значение из account.settings после авторизации
  const botName = process.env.NEXT_PUBLIC_TELEGRAM_AUTH_BOT_NAME || 'enraidrobot'
  
  // TODO: Загрузить имя бота из API перед отображением виджета
  // useEffect(() => {
  //   fetch('/api/account/settings').then(...)
  // }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Вход через Telegram
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Используйте Telegram для входа в систему
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <TelegramLogin
            botName={botName}
            onAuth={handleTelegramAuth}
            onError={(err) => setError(err)}
          />
        </div>

        {loading && (
          <div className="text-center text-gray-600">
            Обработка авторизации...
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 6.4 Обновить API клиент

**Файл:** `webapp/frontend/lib/api/auth.ts`

```typescript
// Добавить метод для Telegram авторизации
export const authApi = {
  // ... существующие методы

  telegramLogin: async (telegramData: any): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      '/auth/telegram/login',
      telegramData
    )
    return response.data
  },

  switchAccount: async (accountId: number): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      '/auth/telegram/switch-account',
      { account_id: accountId }
    )
    return response.data
  },
}
```

**Вопросы:**
- Какой bot_name использовать для Telegram Login Widget?
- Нужно ли создать отдельного бота для авторизации или использовать существующего?

---

### Этап 7: Frontend - Управление сессией и аккаунтами

#### 7.1 Обновить `getAccountId()`

**Файл:** `webapp/frontend/lib/db.ts`

```typescript
/**
 * Получает account_id из JWT токена или localStorage
 */
export function getAccountId(request?: Request): number {
  // Server-side: извлекаем из токена в заголовках
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      try {
        // Декодируем JWT (без проверки подписи на клиенте)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        )
        return payload.account_id || 1
      } catch {
        return 1
      }
    }
  }

  // Client-side: из localStorage или из токена
  if (typeof window !== 'undefined') {
    const accountId = localStorage.getItem('account_id')
    if (accountId) {
      return parseInt(accountId, 10)
    }

    // Пытаемся извлечь из токена
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        )
        const accountId = payload.account_id || 1
        localStorage.setItem('account_id', String(accountId))
        return accountId
      } catch {
        return 1
      }
    }
  }

  return 1
}
```

#### 7.2 Создать компонент переключения аккаунтов

**Файл:** `webapp/frontend/components/auth/AccountSwitcher.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'
import { useRouter } from 'next/navigation'

interface Account {
  account_id: number
  name: string
  role: string
}

export function AccountSwitcher() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccountId, setCurrentAccountId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Загружаем список аккаунтов из токена или API
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        )
        setCurrentAccountId(payload.account_id)
        // available_accounts должен быть в токене или загружаться отдельно
      } catch {
        // Ошибка декодирования
      }
    }
  }, [])

  const handleSwitchAccount = async (accountId: number) => {
    if (accountId === currentAccountId) return

    setLoading(true)
    try {
      const response = await authApi.switchAccount(accountId)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('account_id', String(response.account_id))
      setCurrentAccountId(response.account_id)
      router.refresh() // Обновить страницу для применения нового account_id
    } catch (error) {
      console.error('Ошибка переключения аккаунта:', error)
    } finally {
      setLoading(false)
    }
  }

  if (accounts.length <= 1) {
    return null // Не показывать, если только один аккаунт
  }

  return (
    <div className="account-switcher">
      <select
        value={currentAccountId || ''}
        onChange={(e) => handleSwitchAccount(Number(e.target.value))}
        disabled={loading}
      >
        {accounts.map((account) => (
          <option key={account.account_id} value={account.account_id}>
            {account.name} ({account.role})
          </option>
        ))}
      </select>
    </div>
  )
}
```

#### 7.3 Создать хук для работы с сессией

**Файл:** `webapp/frontend/hooks/useAuth.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/auth'

interface User {
  user_id: number
  telegram_user_id: number
  telegram_username?: string
  first_name?: string
  is_super_admin: boolean
}

interface AuthState {
  user: User | null
  accountId: number | null
  role: string | null
  loading: boolean
}

export function useAuth(): AuthState & {
  logout: () => void
  switchAccount: (accountId: number) => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    accountId: null,
    role: null,
    loading: true,
  })

  useEffect(() => {
    // Загрузка данных из токена
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString()
        )
        setState({
          user: {
            user_id: payload.sub,
            telegram_user_id: payload.telegram_user_id,
            is_super_admin: payload.is_super_admin || false,
          },
          accountId: payload.account_id,
          role: payload.role,
          loading: false,
        })
      } catch {
        setState({ ...state, loading: false })
      }
    } else {
      setState({ ...state, loading: false })
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('account_id')
    setState({
      user: null,
      accountId: null,
      role: null,
      loading: false,
    })
    window.location.href = '/login'
  }

  const switchAccount = async (accountId: number) => {
    try {
      const response = await authApi.switchAccount(accountId)
      localStorage.setItem('auth_token', response.access_token)
      localStorage.setItem('account_id', String(response.account_id))
      setState({
        ...state,
        accountId: response.account_id,
        role: response.role,
      })
    } catch (error) {
      console.error('Ошибка переключения аккаунта:', error)
      throw error
    }
  }

  return {
    ...state,
    logout,
    switchAccount,
  }
}
```

---

### Этап 8: Frontend - Проверки прав доступа

#### 8.1 Создать компоненты для проверки прав

**Файл:** `webapp/frontend/components/auth/RequireRole.tsx`

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import { ReactNode } from 'react'

interface RequireRoleProps {
  roles: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { role, is_super_admin } = useAuth()

  if (is_super_admin || (role && roles.includes(role))) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
```

#### 8.2 Обновить навигацию для скрытия недоступных разделов

**Файл:** `webapp/frontend/components/layout/Navigation.tsx` (пример)

```typescript
'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export function Navigation() {
  const { role, is_super_admin } = useAuth()

  return (
    <nav>
      <Link href="/">Главная</Link>
      
      {(is_super_admin || ['owner', 'admin', 'instructional_designer'].includes(role || '')) && (
        <Link href="/courses">Курсы</Link>
      )}
      
      {(is_super_admin || ['owner', 'admin'].includes(role || '')) && (
        <Link href="/bots">Боты</Link>
      )}
      
      {(is_super_admin || ['owner', 'admin', 'teacher'].includes(role || '')) && (
        <Link href="/groups">Группы</Link>
      )}
      
      {(is_super_admin || ['owner', 'admin'].includes(role || '')) && (
        <Link href="/settings">Настройки</Link>
      )}
    </nav>
  )
}
```

---

### Этап 9: Тестирование и документация

#### 9.1 Тестовые сценарии

1. **Авторизация через Telegram:**
   - Успешная авторизация нового пользователя
   - Авторизация существующего пользователя
   - Валидация данных Telegram (проверка hash)
   - Обработка ошибок (неверный hash, истекшие данные)

2. **Переключение аккаунтов:**
   - Переключение между доступными аккаунтами
   - Попытка переключения на недоступный аккаунт
   - Сохранение состояния после переключения

3. **Проверка прав доступа:**
   - Доступ owner ко всем разделам
   - Ограничения для разных ролей
   - Super admin имеет доступ ко всему

4. **Мультитенантность:**
   - Изоляция данных по account_id
   - Правильная фильтрация во всех endpoints
   - Невозможность доступа к данным другого аккаунта

#### 9.2 Обновление документации

- Обновить `README.md` с инструкциями по настройке Telegram авторизации
- Создать документацию по ролям и правам доступа
- Обновить API документацию

---

## 5. Ответы на вопросы (обновлено)

### 5.1 Конфигурация ✅

1. **Telegram Bot для авторизации:** ✅
   - Bot name: `enraidrobot` (по умолчанию)
   - Настраивается в `account.settings.telegram_auth_bot_name`
   - Токен хранится в переменной окружения `TELEGRAM_AUTH_BOT_TOKEN` в `.env`

2. **JWT токены:** ✅
   - Срок жизни: 7 дней (можно настроить)
   - Refresh токена: не требуется на MVP
   - SECRET_KEY хранится в `.env`

### 5.2 Миграция данных ✅

3. **Существующие пользователи:** ✅
   - Пользователей нет, миграция не требуется
   - Начинаем с чистой таблицы `users`

4. **Account Member:** ✅
   - Колонку `telegram_user_id` можно оставить для обратной совместимости
   - Новые записи будут использовать `user_id`

### 5.3 Бизнес-логика

5. **Создание аккаунтов:**
   - Если пользователь не является участником аккаунта: возвращается ошибка 403
   - Автоматическое создание аккаунта: не требуется на MVP
   - Создание аккаунтов: через super_admin или вручную в БД

6. **Роли:**
   - Owner может передать ownership другому пользователю (требует реализации)
   - Owner не может удалить себя без передачи ownership (требует проверки)
   - Admin не может повысить себя до owner (бизнес-правило)

7. **Super Admin:** ✅
   - Назначается вручную в БД (изменение `users.is_super_admin = TRUE`)
   - Отдельная страница для управления super_admin не требуется

### 5.4 UI/UX ✅

8. **Переключение аккаунтов:** ✅
   - Компонент переключения размещается в header/sidebar
   - Страница со списком всех доступных аккаунтов не нужна

9. **Обработка ошибок:**
   - При истечении токена: редирект на `/login`
   - Автоматическая переавторизация: не требуется на MVP

### 5.5 Безопасность

10. **Валидация Telegram данных:**
    - Проверка hash обязательна
    - Проверка времени жизни данных (auth_date) реализована (24 часа)

11. **Защита endpoints:**
    - Rate limiting: можно добавить в будущем
    - CSRF защита: не требуется для API (используется JWT)

---

## 6. Риски и митигация

### 6.1 Риски

1. **Миграция данных:**
   - **Риск:** Потеря данных при миграции таблицы `users` (не актуально, пользователей нет)
   - **Митигация:** Так как пользователей нет, можно безопасно удалить старую таблицу и создать новую

2. **Обратная совместимость:**
   - **Риск:** Существующий код может сломаться после изменений
   - **Митигация:** Постепенная миграция, сохранение старых endpoints на время перехода

3. **Безопасность:**
   - **Риск:** Неправильная валидация данных Telegram
   - **Митигация:** Тщательное тестирование валидации, использование официальной документации Telegram

4. **Производительность:**
   - **Риск:** Дополнительные запросы к БД для проверки прав
   - **Митигация:** Кэширование данных пользователя, оптимизация запросов

### 6.2 План отката

Если что-то пойдет не так:
1. Откатить миграцию БД (если возможно)
2. Вернуться к старой системе авторизации
3. Восстановить данные из резервной копии

---

## 7. Тестирование

### 7.1 Unit тесты

- Валидация данных Telegram
- Проверка прав доступа
- Декодирование JWT токенов

### 7.2 Integration тесты

- Полный цикл авторизации через Telegram
- Переключение аккаунтов
- Проверка изоляции данных по account_id

### 7.3 E2E тесты

- Авторизация пользователя
- Работа с разными ролями
- Переключение между аккаунтами

---

## 8. Чеклист готовности

### Backend
- [ ] Миграция БД создана и протестирована
- [ ] Модели созданы и соответствуют схеме
- [ ] Endpoints авторизации реализованы
- [ ] Система прав доступа реализована
- [ ] Все существующие endpoints обновлены
- [ ] Unit тесты написаны
- [ ] Integration тесты написаны

### Frontend
- [ ] Telegram Login Widget интегрирован
- [ ] Страница логина обновлена
- [ ] `getAccountId()` обновлена
- [ ] Компонент переключения аккаунтов создан
- [ ] Проверки прав доступа на UI реализованы
- [ ] Навигация обновлена
- [ ] E2E тесты написаны

### Документация
- [ ] README обновлен
- [ ] API документация обновлена
- [ ] Документация по ролям создана
- [ ] Инструкции по настройке созданы

### Безопасность
- [ ] Валидация Telegram данных протестирована
- [ ] JWT токены правильно подписываются
- [ ] Проверка прав доступа работает корректно
- [ ] Rate limiting настроен (если требуется)

---

## Приложения

### A. Пример конфигурации

**`.env` (Backend):**
```env
# Telegram Bot для авторизации
TELEGRAM_AUTH_BOT_TOKEN=your_bot_token_here

# JWT Secret Key
SECRET_KEY=your_secret_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost/dbname
```

**`.env.local` (Frontend):**
```env
# Telegram Bot для авторизации (по умолчанию enraidrobot)
NEXT_PUBLIC_TELEGRAM_AUTH_BOT_NAME=enraidrobot

# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Примечание:** Имя бота также настраивается в `account.settings.telegram_auth_bot_name` на уровне аккаунта. Owner может изменить его в настройках аккаунта.

### B. Структура JWT токена (детально)

```json
{
  "sub": "123",
  "account_id": 1,
  "role": "owner",
  "is_super_admin": false,
  "telegram_user_id": 123456789,
  "exp": 1704067200,
  "iat": 1703462400
}
```

### C. Список файлов для изменения

**Backend:**
- `migrations/versions/0007_telegram_auth_users.sql` (новый)
- `migrations/seeds/0002_telegram_auth_test_data.sql` (новый)
- `app/models/user_telegram.py` (новый)
- `app/models/account_member.py` (новый)
- `app/models/account.py` (новый или обновить)
- `app/schemas/telegram_auth.py` (новый)
- `app/core/telegram_auth.py` (новый)
- `app/core/permissions.py` (новый)
- `app/api/deps_telegram.py` (новый)
- `app/api/v1/auth_telegram.py` (новый)
- Все существующие endpoints (обновить)

**Frontend:**
- `components/auth/TelegramLogin.tsx` (новый)
- `components/auth/AccountSwitcher.tsx` (новый)
- `components/auth/RequireRole.tsx` (новый)
- `hooks/useAuth.ts` (новый)
- `app/(auth)/login/page.tsx` (обновить)
- `lib/api/auth.ts` (обновить)
- `lib/db.ts` (обновить)
- Все страницы с проверками прав (обновить)

---

**Конец документа**
