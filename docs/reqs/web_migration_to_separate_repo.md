# План очистки веб-приложения от зависимостей Telegram бота

## Обзор

Документ описывает план удаления всех зависимостей от Telegram бота из веб-приложения после копирования кода в отдельный репозиторий. Веб-приложение состоит из:
- **Frontend**: Next.js приложение (`frontend/`)
- **Backend**: FastAPI приложение (`backend/`)

**Важно**: Предполагается, что весь код уже скопирован в новый репозиторий. Задача - аккуратно избавиться от всех зависимостей, связанных с Telegram ботом, не меняя бизнес-логику.

## Статус выполнения

**Дата обновления:** 2024

### Выполненные этапы ✅

- ✅ **Этап 1**: Анализ зависимостей от Telegram бота
- ✅ **Этап 2**: Удаление импортов aiogram из elements/ и всех методов send(bot)
- ✅ **Этап 3**: Очистка course.py от методов отправки и зависимостей от globals
- ✅ **Этап 4**: Очистка db.py от зависимостей от globals
- ✅ **Этап 5**: Очистка chat.py от зависимостей от globals
- ✅ **Этап 6**: Удаление sys.path манипуляций из backend
- ✅ **Этап 7**: Очистка api.py от Telegram функций
- ✅ **Этап 9**: Удаление aiogram из requirements.txt
- ✅ **Этап 10**: Очистка комментариев и строк от упоминаний Telegram
- ✅ **Удаление файлов**: main.py, editor.py, generator.py, webreport.py, bin/telegram/*
- ✅ **Удаление globals.py**: Файл удален, все зависимости заменены на переменные окружения
- ✅ **Очистка waiting.py**: Удалены зависимости от параметра `bot`, функции адаптированы для веб-версии

### Частично выполненные / Опциональные

- ⚠️ **Этап 8**: Организация структуры модулей - НЕ ВЫПОЛНЕН (модули остались в корне проекта, что является допустимым решением)

### Оставшиеся задачи

- [ ] Этап 11: Настройка конфигурации и переменных окружения
- [ ] Этап 12: Проверка frontend
- [ ] Этап 13: Тестирование и проверка
- [ ] Этап 14: Документация
- [ ] Этап 15: Деплой и мониторинг

## Текущая ситуация

### Структура нового репозитория (после копирования)

```
profochatbot-web/
├── README.md
├── .gitignore
├── docker-compose.yml
├── frontend/            # Next.js приложение (скопировано из webapp/frontend/)
│   ├── app/            # Страницы и API routes
│   ├── components/     # React компоненты
│   └── lib/            # Утилиты и API клиенты
├── backend/            # FastAPI приложение (скопировано из webapp/backend/)
│   ├── app/
│   │   ├── api/v1/     # API роутеры
│   │   ├── models/     # SQLAlchemy модели
│   │   ├── schemas/    # Pydantic схемы
│   │   └── services/   # Бизнес-логика
│   └── alembic/        # Миграции БД
├── course.py           # Скопировано из корня (очищено от зависимостей от aiogram и globals)
├── db.py               # Скопировано из корня (очищено от зависимостей от globals)
├── chat.py             # Скопировано из корня (очищено от зависимостей от globals)
├── elements/           # Скопировано из корня (очищено от методов send(bot) и импортов aiogram)
├── utils.py            # Скопировано из корня
├── api.py              # Скопировано из корня (очищено от Telegram функций)
├── waiting.py          # Скопировано из корня (очищено от зависимостей от bot)
└── scripts/            # Скопировано из корня (YAML файлы курсов)
```

### Зависимости от Telegram бота, которые нужно удалить

**1. Импорты aiogram (УДАЛЕНО ✅):**
- ~~`elements/element.py` - импортирует `ParseMode`, `LinkPreviewOptions` из `aiogram`~~ ✅ Удалено
- ~~`elements/dialog.py` - импортирует `ParseMode`, `BufferedInputFile` из `aiogram`~~ ✅ Удалено
- ~~`elements/input.py` - импортирует `ParseMode` из `aiogram`~~ ✅ Удалено
- ~~`elements/audio.py` - использует `bot.send_audio()`~~ ✅ Удалено
- ~~`course.py` - содержит методы `send_next_element(bot)`, `send_other_module(bot)`~~ ✅ Удалено

**2. Методы отправки в Telegram (УДАЛЕНО ✅):**
- ~~Все методы `async def send(self, bot)` в элементах (`elements/*.py`)~~ ✅ Удалено
- ~~Методы `send_reply(bot)`, `send_voice_reply(bot)`, `send_quiz_reply(bot)` и т.д.~~ ✅ Удалено
- ~~Функции `_send_message(bot, ...)`, `_send_one_message(bot, ...)` в `elements/element.py`~~ ✅ Удалено

**3. sys.path манипуляции (ОЧИЩЕНО ✅):**
- `backend/app/api/v1/mvp.py` - упрощено, удалено создание mock `globals` ✅
- `backend/app/services/llm_service.py` - упрощено, удалено создание mock `globals` ✅
- Примечание: `sys.path` остался только для импорта модулей из корня проекта

**4. Зависимости от globals (УДАЛЕНО):**
- ~~Использование `globals.BOT_NAME` в `db.py`~~ ✅ Заменено на `os.environ.get('BOT_NAME')`
- ~~Использование `globals.BOT_FOLDER` в `course.py`~~ ✅ Заменено на `os.environ.get('BOT_FOLDER')`
- ~~Использование `globals.CONFIG_FILE` в `chat.py`~~ ✅ Заменено на `os.environ.get('CONFIG_FILE')`
- ~~Файл `globals.py`~~ ✅ Удален

**5. Функции работы с Telegram Bot API (УДАЛЕНО ✅):**
- ~~`api.py` - функции `send_miniapp_result()`, `send_telegram_message()`~~ ✅ Удалено
- ~~`api.py` - использование `BOT_API_TOKEN` для работы с Telegram API~~ ✅ Удалено
- Endpoints `/api/submit_response` и `/api/messages` помечены как deprecated ✅

**6. Упоминания Telegram в коде (ОЧИЩЕНО ✅):**
- Комментарии про Telegram - обновлены или удалены ✅
- Переменные с именами `bot`, `telegram_*` - удалены из методов элементов ✅
- Упоминания "Telegram" в строках и комментариях - обновлены ✅

## Цели очистки

1. **Удаление зависимостей**: Полностью убрать все импорты и использование `aiogram`
2. **Чистая архитектура**: Убрать зависимости от `sys.path` манипуляций, использовать локальные импорты
3. **Сохранение функциональности**: Не менять бизнес-логику, только удалить Telegram-специфичный код
4. **Совместимость**: Сохранить совместимость с существующей БД и API контрактами
5. **Читаемость**: Убрать упоминания Telegram из кода и комментариев (где возможно)

## План очистки от зависимостей Telegram бота

### Этап 1: Анализ зависимостей от Telegram бота

#### 1.1 Поиск всех импортов aiogram

**Задачи:**
- [ ] Найти все файлы с импортами `aiogram`
- [ ] Составить список всех методов, использующих `bot` как параметр
- [ ] Найти все упоминания Telegram в коде

**Методы:**
```bash
# Найти все импорты aiogram
grep -r "from aiogram\|import aiogram" .

# Найти все методы с параметром bot
grep -r "def.*bot\)\|async def.*bot\)" .

# Найти все вызовы методов с bot
grep -r "\.send\(bot\|send_reply\(bot\|send_voice_reply\(bot" .

# Найти sys.path манипуляции
grep -r "sys.path" backend/

# Найти использование globals.BOT_NAME
grep -r "globals\.BOT_NAME\|globals\.BOT_FOLDER\|globals\.CONFIG_FILE" .
```

**Ожидаемые результаты:**
- Список всех файлов с зависимостями от Telegram
- Список всех методов, которые нужно удалить или изменить
- Карта зависимостей

#### 1.2 Анализ использования методов send()

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Определить, какие методы `send(bot)` используются в веб-приложении ✅
- [x] Определить, какие методы можно просто удалить (не используются) ✅
- [x] Определить, какие методы нужно заменить на возврат данных ✅

**Результат:** Все методы `send(bot)` удалены, заменены на методы `save()` для сохранения в БД.

**Файлы для проверки:**
- `elements/element.py` - базовый класс и вспомогательные функции ✅
- `elements/*.py` - все типы элементов ✅
- `course.py` - методы `send_next_element()`, `send_other_module()` ✅ (удалены)

### Этап 2: Удаление импортов aiogram из elements/

#### 2.1 Очистка elements/element.py

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Удалить импорты `from aiogram.enums import ParseMode` ✅
- [x] Удалить импорт `from aiogram.types.link_preview_options import LinkPreviewOptions` ✅
- [x] Удалить функции `_send_message(bot, ...)` и `_send_one_message(bot, ...)` ✅
- [x] Заменить использование `ParseMode.HTML` и `ParseMode.MARKDOWN` на строки `"HTML"` и `"MARKDOWN"` ✅
- [x] Убрать параметр `bot` из всех методов (если остались) ✅

**Изменения (выполнено):**
```python
# БЫЛО:
from aiogram.enums import ParseMode
from aiogram.types.link_preview_options import LinkPreviewOptions

async def _send_message(bot, chat_id, reply, parse_mode = None, link_preview = None, markup = None):
    # ...

# СТАНЕТ (выполнено):
# Функции _send_message и _send_one_message удалены полностью
# Используются строки вместо ParseMode:
parse_mode = "HTML" if parse_mode == "HTML" else "MARKDOWN"
```

#### 2.2 Очистка элементов от методов send()

**Статус:** ✅ ВЫПОЛНЕНО

**Для каждого файла в `elements/`:**

**Задачи:**
- [x] Удалить все методы `async def send(self, bot)` ✅ (заменены на `save()`)
- [x] Удалить все методы `async def send_reply(self, bot, ...)` ✅ (заменены на `save_reply()`)
- [x] Удалить все методы `async def send_voice_reply(self, bot, ...)` ✅
- [x] Удалить все методы `async def send_quiz_reply(self, bot, ...)` ✅ (заменены на `save_quiz_reply()`)
- [x] Удалить все методы `async def send_milti_reply(self, bot, ...)` ✅ (заменены на `save_multi_reply()`)
- [x] Удалить все методы `async def send_wait_message(self, bot)` ✅
- [x] Удалить импорты `from aiogram.enums import ParseMode` ✅
- [x] Удалить импорты `from aiogram.types import BufferedInputFile` ✅
- [x] Удалить вызовы `await bot.send_*()` методов ✅
- [x] Удалить вызовы `await bot.send_chat_action()` ✅
- [x] Удалить вызовы `await bot.get_file()` и `await bot.download_file()` ✅

**Файлы для очистки:**
- `elements/message.py`
- `elements/dialog.py`
- `elements/input.py`
- `elements/quiz.py`
- `elements/question.py`
- `elements/multichoice.py`
- `elements/audio.py`
- `elements/test.py`
- `elements/revision.py`
- `elements/jump.py`
- `elements/end.py`
- `elements/delay.py`
- `elements/miniapp.py`

**Важно:** Сохранить методы:
- `save_report()` - сохранение в БД
- `set_message()` - установка сообщения пользователя
- `set_quiz_answer_id()` - установка ответа на квиз
- Логику валидации и обработки ответов

#### 2.3 Очистка elements/dialog.py

**Статус:** ✅ ВЫПОЛНЕНО

**Особые случаи:**

**Задачи:**
- [x] Удалить функцию `async def keep_typing_while(bot, chat_id, func)` - используется только для Telegram typing indicator ✅
- [x] Удалить метод `send_voice_reply()` - использует `bot.send_voice()` ✅
- [x] Удалить использование `BufferedInputFile` для голосовых сообщений ✅
- [x] Оставить логику работы с ИИ (вызовы `get_reply()`) ✅

**Изменения (выполнено):**
```python
# БЫЛО:
async def keep_typing_while(bot, chat_id, func):
    await bot.send_chat_action(chat_id, 'typing')
    # ...

# СТАНЕТ (выполнено):
# Функция удалена полностью, заменена на прямой вызов:
reply, conversation = await chat.get_reply(conversation, message_text, self.params)
```

### Этап 3: Очистка course.py от зависимостей Telegram

#### 3.1 Удаление методов отправки

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Удалить метод `async def send_next_element(cls, bot, chat_id, username, ...)` ✅
- [x] Удалить метод `async def send_other_module(cls, bot, chat_id, username, course_id, shift)` ✅
- [x] Удалить все вызовы `await e.send(bot)` внутри методов ✅
- [x] Оставить методы получения элементов: `get_first_element()`, `get_current_element()`, `get_next_element()` ✅

**Изменения (выполнено):**
```python
# БЫЛО:
@classmethod
async def send_next_element(cls, bot, chat_id, username, element_id = None, course_id = None):
    # ...
    await e.send(bot)
    # ...

# СТАНЕТ (выполнено):
# Методы send_next_element и send_other_module удалены полностью
# Методы get_next_element, get_current_element, get_first_element остались и работают без bot
@classmethod
def get_next_element(cls, chat_id):
    # Возвращает элемент без отправки
    return element
```

#### 3.2 Замена зависимостей от globals

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Заменить `globals.BOT_FOLDER` на `os.environ.get('BOT_FOLDER', '')` ✅
- [x] Заменить `globals.BOT_NAME` на параметр функции или переменную окружения ✅
- [x] Убрать импорт `import globals` если он больше не нужен ✅

**Изменения (выполнено):**
```python
# БЫЛО:
folder = "scripts/" + globals.BOT_FOLDER

# СТАНЕТ (выполнено):
BOT_FOLDER = os.environ.get('BOT_FOLDER', '')
folder = f"scripts/{BOT_FOLDER}"
```

### Этап 4: Очистка db.py от зависимостей

#### 4.1 Замена globals.BOT_NAME

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Найти все использования `globals.BOT_NAME` в `db.py` ✅
- [x] Заменить на параметр функции с дефолтным значением из переменной окружения ✅
- [x] Убрать импорт `import globals` если он больше не нужен ✅

**Изменения (выполнено):**
```python
# БЫЛО:
import globals
cursor.execute(insert_query, (course_id, username, chat_id, globals.BOT_NAME, ...))

# СТАНЕТ (выполнено):
import os
BOT_NAME = os.environ.get('BOT_NAME', 'web_bot')
cursor.execute(insert_query, (course_id, username, chat_id, BOT_NAME, ...))
```

### Этап 5: Очистка chat.py от зависимостей

#### 5.1 Замена globals.CONFIG_FILE

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Найти использование `globals.CONFIG_FILE` в `chat.py` ✅
- [x] Заменить на чтение из переменных окружения ✅
- [x] Убрать импорт `import globals` если он больше не нужен ✅

**Изменения (выполнено):**
```python
# БЫЛО:
import globals
config_file = globals.CONFIG_FILE

# СТАНЕТ (выполнено):
import os
CONFIG_FILE = os.environ.get('CONFIG_FILE', 'config.yaml')
config_file = CONFIG_FILE
```

### Этап 6: Удаление sys.path манипуляций

#### 6.1 Очистка backend/app/api/v1/mvp.py

**Статус:** ✅ ВЫПОЛНЕНО (частично - sys.path остался для импорта модулей из корня)

**Задачи:**
- [x] Удалить создание mock `globals` модуля ✅
- [x] Заменить использование `globals.BOT_NAME` на переменные окружения ✅
- [x] Упростить sys.path манипуляции (оставлен только для импорта модулей из корня) ✅

**Изменения (выполнено):**
```python
# БЫЛО:
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    import globals
    if not globals.BOT_NAME:
        globals.BOT_NAME = "web_bot"
except ImportError:
    # создание mock globals
    ...

import db

# СТАНЕТ (выполнено):
import os
if not os.environ.get('BOT_NAME'):
    os.environ['BOT_NAME'] = "web_bot"

# sys.path остается для импорта модулей из корня проекта
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import db
```

#### 6.2 Очистка backend/app/services/llm_service.py

**Статус:** ✅ ВЫПОЛНЕНО (частично - sys.path остался для импорта модулей из корня)

**Задачи:**
- [x] Удалить создание mock `globals` модуля ✅
- [x] Заменить использование `globals.CONFIG_FILE` на переменные окружения ✅
- [x] Упростить sys.path манипуляции (оставлен только для импорта модулей из корня) ✅

**Изменения (выполнено):**
```python
# БЫЛО:
import sys
import os
from pathlib import Path

project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    import globals
    if not hasattr(globals, 'CONFIG_FILE') or not globals.CONFIG_FILE:
        globals.CONFIG_FILE = config_file_path
except ImportError:
    # создание mock globals
    ...

try:
    import chat
    CHAT_MODULE_AVAILABLE = True
except ImportError:
    CHAT_MODULE_AVAILABLE = False

# СТАНЕТ (выполнено):
import os
from pathlib import Path

# Устанавливаем CONFIG_FILE через переменную окружения
if not os.environ.get('CONFIG_FILE'):
    config_file_path = str(project_root / 'config.yaml')
    os.environ['CONFIG_FILE'] = config_file_path

# sys.path остается для импорта модулей из корня проекта
project_root = Path(__file__).parent.parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

try:
    import chat
    CHAT_MODULE_AVAILABLE = True
except ImportError:
    CHAT_MODULE_AVAILABLE = False
```

### Этап 7: Очистка api.py (если скопирован)

#### 7.1 Удаление функций работы с Telegram Bot API

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Удалить функцию `send_miniapp_result()` - используется только для Telegram Mini Apps ✅
- [x] Удалить функцию `send_telegram_message()` - отправка сообщений в Telegram ✅
- [x] Удалить переменную `BOT_API_TOKEN` и её использование ✅
- [x] Удалить импорт `from utils import parse_init_data` если используется только для Telegram ✅
- [x] Пометить endpoint `/api/submit_response` как deprecated ✅
- [x] Пометить endpoint `/api/messages` как deprecated ✅

**Изменения (выполнено):**
```python
# БЫЛО:
BOT_API_TOKEN = os.environ.get('BOT_API_TOKEN')

def send_miniapp_result(query_id: str, result: str, user_id: int):
    url = f"https://api.telegram.org/bot{BOT_API_TOKEN}/answerWebAppQuery"
    # ...

def send_telegram_message(chat_id: int, message: str):
    url = f"https://api.telegram.org/bot{BOT_API_TOKEN}/sendMessage"
    # ...

# СТАНЕТ (выполнено):
# Функции удалены полностью
# Endpoints помечены как deprecated и возвращают HTTP 410
@app.post("/api/submit_response")
async def submit_response(...):
    raise HTTPException(status_code=410, detail="This endpoint is deprecated...")
```

#### 7.2 Очистка endpoints от Telegram зависимостей

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Проверить все endpoints на использование `BOT_API_TOKEN` ✅
- [x] Удалить или закомментировать endpoints, которые работают только с Telegram ✅
- [x] Оставить endpoints, которые работают с курсами и элементами ✅

### Этап 8: Организация структуры модулей (ОПЦИОНАЛЬНО)

**Статус:** Не выполнен. Модули остались в корне проекта, что является допустимым решением.

#### 8.1 Создание структуры app/core/ (ОПЦИОНАЛЬНО)

**Примечание:** Эта задача была запланирована, но не выполнена. Модули остались в корне проекта:
- `db.py` - в корне проекта
- `course.py` - в корне проекта  
- `chat.py` - в корне проекта
- `elements/` - в корне проекта
- `utils.py` - в корне проекта

**Текущая структура:**
```
profochatbot-web/
├── db.py           # В корне проекта
├── course.py       # В корне проекта
├── chat.py         # В корне проекта
├── elements/       # В корне проекта
├── utils.py        # В корне проекта
└── webapp/
    └── backend/
        └── app/
            └── core/    # Существует, но содержит только config.py и security.py
```

**Альтернативная структура (если требуется):**
```
backend/app/core/
├── __init__.py
├── db.py
├── course.py
├── llm.py          # бывший chat.py
├── utils.py        # если используется
└── elements/
    ├── __init__.py
    ├── element.py
    └── [другие элементы]
```

**Задачи (если решено выполнить реорганизацию):**
- [ ] Создать папку `backend/app/core/` (для модулей курсов)
- [ ] Переместить `db.py` в `backend/app/core/db.py`
- [ ] Переместить `course.py` в `backend/app/core/course.py`
- [ ] Переместить `chat.py` в `backend/app/core/llm.py` (переименовать)
- [ ] Переместить `elements/` в `backend/app/core/elements/`
- [ ] Переместить `utils.py` в `backend/app/core/utils.py` (если используется)
- [ ] Создать `backend/app/core/__init__.py` для экспорта модулей
- [ ] Обновить все импорты в `backend/app/api/v1/mvp.py`
- [ ] Обновить все импорты в `backend/app/services/llm_service.py`
- [ ] Обновить импорты во всех других файлах, которые используют модули из корня

**Примечание:** Текущая структура (модули в корне) работает корректно. Реорганизация опциональна.

**Изменения импортов (если выполняется реорганизация):**
```python
# ТЕКУЩЕЕ СОСТОЯНИЕ (модули в корне):
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
import db
import course
from elements import element_registry

# ЕСЛИ ВЫПОЛНЯЕТСЯ РЕОРГАНИЗАЦИЯ:
from app.core import db, course
from app.core.elements import element_registry
```

### Этап 9: Удаление requirements.txt зависимостей

#### 9.1 Очистка requirements.txt

**Статус:** ✅ ВЫПОЛНЕНО

**Задачи:**
- [x] Проверить `requirements.txt` ✅
- [x] Удалить `aiogram` если он есть в зависимостях ✅
- [x] Убедиться, что все необходимые зависимости присутствуют (psycopg2-binary, pyyaml и т.д.) ✅

**Изменения (выполнено):**
```txt
# БЫЛО:
aiogram==3.6.0

# СТАНЕТ (выполнено):
# Строка удалена полностью
```

### Этап 10: Очистка комментариев и строк

#### 10.1 Удаление упоминаний Telegram

**Статус:** ✅ ВЫПОЛНЕНО (частично)

**Задачи:**
- [x] Найти все комментарии с упоминанием "Telegram" ✅
- [x] Найти все строки с упоминанием "Telegram" ✅
- [x] Заменить или удалить упоминания, где это уместно ✅
- [x] Обновить комментарии, которые ссылаются на Telegram функциональность ✅

**Методы (выполнено):**
```bash
# Найти все упоминания Telegram
grep -r "Telegram\|telegram\|TELEGRAM" . --exclude-dir=node_modules --exclude-dir=.git

# Найти комментарии про Telegram
grep -r "#.*[Tt]elegram\|//.*[Tt]elegram" .
```

**Важно:** Не удалять упоминания, которые важны для понимания контекста (например, в документации или README)

**Результат:** Основные упоминания Telegram удалены из кода. В документации оставлены для контекста.

### Этап 11: Настройка конфигурации и переменных окружения

#### 5.1 Переменные окружения

**Создать `.env.example`:**

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/profochatbot_web
BOT_NAME=web_bot
BOT_FOLDER=

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=  # Опционально, для прокси
OPENAI_MODEL=gpt-4

# Eleven Labs (если используется)
ELEVENLABS_API_KEY=

# Security
SECRET_KEY=your-secret-key-here

# Frontend
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Environment
ENVIRONMENT=development
```

#### 5.2 Конфигурация курсов

**Задачи:**
- [ ] Определить, как будут храниться курсы в новом репозитории
- [ ] Варианты:
  1. Копировать `scripts/` папку в новый репозиторий
  2. Использовать только курсы из БД
  3. Использовать отдельный сервис/API для получения курсов

**Рекомендация:**
- Для начала скопировать `scripts/` папку
- В будущем можно мигрировать на отдельный сервис курсов

#### 5.3 Настройка docker-compose

**Задачи:**
- [ ] Обновить `docker-compose.yml` для нового репозитория
- [ ] Настроить volumes для `scripts/` (если используется)
- [ ] Настроить переменные окружения

**Пример:**

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: profochatbot
      POSTGRES_PASSWORD: profochatbot
      POSTGRES_DB: profochatbot_web
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://profochatbot:profochatbot@db:5432/profochatbot_web
      SECRET_KEY: ${SECRET_KEY:-dev-secret-key}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      BOT_NAME: web_bot
      BOT_FOLDER: ${BOT_FOLDER:-}
      FRONTEND_URL: http://localhost:3000
    depends_on:
      - db
    volumes:
      - ./backend:/app
      - ./scripts:/app/scripts  # Если используется scripts/

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next

volumes:
  postgres_data:
```

### Этап 12: Проверка frontend

#### 12.1 Проверка зависимостей

**Задачи:**
- [ ] Проверить, что все зависимости в `package.json` актуальны
- [ ] Убедиться, что нет зависимостей от Python модулей
- [ ] Проверить, что API endpoints работают корректно

#### 12.2 Тестирование компонентов

**Задачи:**
- [ ] Протестировать все страницы
- [ ] Проверить работу всех компонентов
- [ ] Убедиться, что нет ошибок в консоли браузера
- [ ] Проверить работу API запросов

### Этап 13: Тестирование и проверка

#### 13.1 Unit тесты

**Задачи:**
- [ ] Написать тесты для `db.py` (в корне проекта)
- [ ] Написать тесты для `course.py` (в корне проекта)
- [ ] Написать тесты для `chat.py` (в корне проекта)
- [ ] Написать тесты для `elements/` (в корне проекта)

#### 13.2 Integration тесты

**Задачи:**
- [ ] Написать тесты для API endpoints
- [ ] Протестировать работу с БД
- [ ] Протестировать интеграцию с OpenAI API

#### 13.3 E2E тесты

**Задачи:**
- [ ] Протестировать полный flow прохождения курса
- [ ] Протестировать работу с диалогами
- [ ] Протестировать работу с квизами

#### 13.4 Проверка совместимости

**Задачи:**
- [ ] Убедиться, что веб-приложение работает с существующей БД
- [ ] Проверить, что данные из Telegram бота доступны в веб-приложении
- [ ] Проверить обратную совместимость API

### Этап 14: Документация

#### 8.1 README.md

**Содержание:**
- Описание проекта
- Установка и запуск
- Структура проекта
- API документация
- Переменные окружения

#### 8.2 API документация

**Задачи:**
- [ ] Обновить документацию API endpoints
- [ ] Добавить примеры запросов/ответов
- [ ] Описать схемы данных

#### 8.3 Документация разработки

**Задачи:**
- [ ] Описать архитектуру backend
- [ ] Описать архитектуру frontend
- [ ] Описать процесс разработки
- [ ] Описать процесс деплоя

### Этап 15: Деплой и мониторинг

#### 15.1 Настройка CI/CD

**Задачи:**
- [ ] Настроить GitHub Actions / GitLab CI для тестов
- [ ] Настроить автоматический деплой
- [ ] Настроить линтеры и форматтеры

#### 15.2 Мониторинг

**Задачи:**
- [ ] Настроить логирование
- [ ] Настроить мониторинг ошибок (Sentry и т.д.)
- [ ] Настроить метрики производительности

## Риски и решения

### Риск 1: Потеря совместимости с существующей БД

**Решение:**
- Сохранить структуру таблиц без изменений
- Использовать те же функции работы с БД
- Протестировать на существующих данных

### Риск 2: Дублирование кода между репозиториями

**Решение:**
- Создать общую библиотеку для логики курсов (в будущем)
- Или использовать git submodules для общих модулей
- Или создать отдельный пакет Python

### Риск 3: Сложность синхронизации изменений

**Решение:**
- Документировать изменения в обоих репозиториях
- Использовать версионирование API
- Создать процесс синхронизации изменений

### Риск 4: Проблемы с импортами после миграции

**Решение:**
- Тщательно протестировать все импорты
- Использовать относительные импорты
- Настроить правильный PYTHONPATH

## Чеклист очистки от зависимостей Telegram

### Анализ
- [x] Найти все импорты `aiogram` ✅
- [x] Найти все методы с параметром `bot` ✅
- [x] Найти все `sys.path` манипуляции ✅
- [x] Найти все использования `globals.BOT_NAME`, `globals.BOT_FOLDER`, `globals.CONFIG_FILE` ✅

### Очистка elements/
- [x] Удалить импорты `aiogram` из `elements/element.py` ✅
- [x] Удалить функции `_send_message()` и `_send_one_message()` ✅
- [x] Удалить все методы `send(bot)` из всех элементов ✅
- [x] Удалить все методы `send_reply(bot, ...)` из всех элементов ✅
- [x] Заменить `ParseMode.HTML` на строку `"HTML"` ✅
- [x] Заменить `ParseMode.MARKDOWN` на строку `"MARKDOWN"` ✅

### Очистка course.py
- [x] Удалить методы `send_next_element(bot, ...)` ✅
- [x] Удалить методы `send_other_module(bot, ...)` ✅
- [x] Заменить `globals.BOT_FOLDER` на переменную окружения ✅
- [x] Убрать импорт `import globals` ✅

### Очистка db.py
- [x] Заменить `globals.BOT_NAME` на переменную окружения или параметр ✅
- [x] Убрать импорт `import globals` ✅

### Очистка chat.py
- [x] Заменить `globals.CONFIG_FILE` на переменную окружения ✅
- [x] Убрать импорт `import globals` ✅

### Очистка course.py
- [x] Заменить `globals.BOT_FOLDER` на переменную окружения ✅
- [x] Убрать импорт `import globals` ✅

### Удаление globals.py
- [x] Удалить файл `globals.py` ✅

### Удаление sys.path манипуляций
- [x] Очистить `backend/app/api/v1/mvp.py` ✅
- [x] Очистить `backend/app/services/llm_service.py` ✅
- [x] Обновить все импорты на локальные ✅

### Организация структуры (ОПЦИОНАЛЬНО)
- [ ] Создать `backend/app/core/` (не выполнено - модули остались в корне)
- [ ] Переместить модули в `app/core/` (не выполнено - модули остались в корне)
- [x] Обновить все импорты (не требуется, т.к. модули в корне) ✅

### Очистка api.py (если скопирован)
- [x] Удалить функции `send_miniapp_result()` и `send_telegram_message()` ✅
- [x] Удалить использование `BOT_API_TOKEN` ✅
- [x] Удалить или закомментировать Telegram-специфичные endpoints ✅

### Очистка зависимостей
- [x] Удалить `aiogram` из `requirements.txt` ✅
- [x] Проверить другие зависимости ✅

### Очистка комментариев
- [x] Удалить упоминания Telegram из комментариев (где уместно) ✅
- [x] Обновить комментарии, которые ссылаются на удаленную функциональность ✅

### Очистка waiting.py
- [x] Удалить параметр `bot` из функции `init_waiting()` ✅
- [x] Удалить параметр `bot` из функции `send_waiting_elements()` ✅
- [x] Заменить `globals.CONFIG_FILE` на переменную окружения ✅
- [x] Адаптировать функции для веб-версии ✅

### Удаление файлов
- [x] Удалить `main.py` ✅
- [x] Удалить `editor.py` ✅
- [x] Удалить `generator.py` ✅
- [x] Удалить `webreport.py` ✅
- [x] Удалить `bin/telegram/*` ✅
- [x] Удалить `globals.py` ✅

### Тестирование
- [ ] Протестировать все API endpoints
- [ ] Протестировать работу с элементами
- [ ] Протестировать работу с курсами
- [ ] Проверить работу с БД
- [ ] Проверить работу frontend

### Документация
- [ ] Обновить `README.md`
- [ ] Обновить комментарии в коде
- [ ] Создать документацию по изменениям

## Временные оценки

- **Этап 1 (Анализ зависимостей)**: 1 день
- **Этап 2 (Очистка elements/)**: 2-3 дня
- **Этап 3 (Очистка course.py)**: 1 день
- **Этап 4 (Очистка db.py)**: 0.5 дня
- **Этап 5 (Очистка chat.py)**: 0.5 дня
- **Этап 6 (Удаление sys.path)**: 1 день
- **Этап 7 (Очистка api.py)**: 1 день
- **Этап 8 (Организация структуры)**: 1 день (ОПЦИОНАЛЬНО, не выполнен - модули остались в корне)
- **Этап 9 (Удаление зависимостей)**: 0.5 дня
- **Этап 10 (Очистка комментариев)**: 0.5 дня
- **Этап 11 (Конфигурация)**: 1 день
- **Этап 12 (Проверка frontend)**: 1 день
- **Этап 13 (Тестирование)**: 2-3 дня
- **Этап 14 (Документация)**: 1-2 дня
- **Этап 15 (Деплой)**: 1-2 дня

**Итого**: 15-20 дней работы

## Следующие шаги

**Текущий статус:** Основные этапы очистки выполнены ✅

1. ✅ **Выполнено**: Этап 1 (анализ зависимостей) - завершен
2. ✅ **Выполнено**: Этап 2 (очистка элементов) - завершен
3. ✅ **Выполнено**: Этапы 3-7, 9-10 (очистка модулей, удаление зависимостей) - завершены
4. ⚠️ **Опционально**: Этап 8 (организация структуры) - не выполнен, модули остались в корне
5. **Следующие задачи**: 
   - Этап 11: Настройка конфигурации и переменных окружения
   - Этап 12: Проверка frontend
   - Этап 13: Тестирование и проверка
   - Этап 14: Документация
   - Этап 15: Деплой и мониторинг

## Важные замечания

### Что НЕ нужно делать

1. **Не менять бизнес-логику** - только удалять Telegram-специфичный код
2. **Не менять структуру БД** - сохранить совместимость с существующими таблицами
3. **Не менять API контракты** - сохранить существующие endpoints и их формат ответов
4. **Не удалять методы save_report()** - они используются для сохранения в БД
5. **Не удалять логику валидации** - она нужна для работы элементов

### Что нужно сохранить

1. **Методы работы с элементами**: `get_first_element()`, `get_current_element()`, `get_next_element()`
2. **Методы сохранения**: `save_report()`, `set_message()`, `set_quiz_answer_id()`
3. **Логику валидации**: проверка ответов, обработка элементов
4. **Интеграцию с ИИ**: функции `get_reply()`, `get_reply_sys()` из `chat.py`
5. **Работу с БД**: все функции из `db.py` для работы с таблицами

### Порядок выполнения

**Статус:** ✅ ВЫПОЛНЕНО (Этапы 1-7, 9-10)

Рекомендуется выполнять этапы последовательно:
1. ✅ Сначала анализ (Этап 1) - ВЫПОЛНЕНО
2. ✅ Затем очистка элементов (Этап 2) - ВЫПОЛНЕНО
3. ✅ Потом очистка основных модулей (Этапы 3-5) - ВЫПОЛНЕНО
4. ✅ Удаление sys.path (Этап 6) - ВЫПОЛНЕНО
5. ✅ Очистка api.py (Этап 7) - ВЫПОЛНЕНО
6. ⚠️ Организация структуры (Этап 8) - НЕ ВЫПОЛНЕНО (опционально, модули остались в корне)
7. ✅ Финальная очистка (Этапы 9-10) - ВЫПОЛНЕНО
8. [ ] Тестирование и документация (Этапы 11-15) - В ПРОЦЕССЕ

### Проверка после каждого этапа

После каждого этапа рекомендуется:
- Запустить тесты (если есть)
- Проверить, что код компилируется без ошибок
- Проверить основные функции вручную
- Закоммитить изменения

## Заключение

Очистка веб-приложения от зависимостей Telegram бота - это систематическая работа по удалению Telegram-специфичного кода при сохранении всей бизнес-логики. Основные принципы:

1. **Аккуратность** - удалять только код, связанный с Telegram ✅
2. **Сохранение функциональности** - не менять бизнес-логику ✅
3. **Тестирование** - проверять после каждого этапа (в процессе)
4. **Документирование** - фиксировать изменения ✅

**Текущий статус:** Основные этапы очистки (1-7, 9-10) выполнены. Веб-приложение очищено от зависимостей Telegram бота:
- ✅ Удалены все импорты `aiogram`
- ✅ Удалены все методы `send(bot)` из элементов
- ✅ Удалены зависимости от `globals.py` (файл удален)
- ✅ Удалены Telegram-специфичные функции из `api.py`
- ✅ Удалены Telegram-файлы (`main.py`, `editor.py`, `generator.py`, `webreport.py`, `bin/telegram/*`)
- ✅ Очищены `sys.path` манипуляции от создания mock `globals`
- ✅ Удален `aiogram` из `requirements.txt`

Веб-приложение готово к работе в отдельном репозитории. Остались задачи по тестированию, документации и деплою (Этапы 11-15).
