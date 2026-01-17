# Core Logic модули

Документ описывает модули Core Logic в корне проекта, которые содержат бизнес-логику, независимую от интерфейса.

## Обзор

Core Logic модули находятся в корне проекта и используются как веб-приложением, так и Telegram ботом (в отдельном репозитории). Эти модули содержат всю бизнес-логику работы с курсами, элементами и базой данных.

## Структура модулей

```
profochatweb/
├── course.py              # Логика работы с курсами
├── db.py                  # Функции работы с БД (прямые SQL)
├── chat.py                # Интеграция с OpenAI/Eleven Labs
├── waiting.py             # Планировщик отложенных элементов
└── elements/              # Типы элементов курсов
    ├── __init__.py        # Регистр элементов
    ├── element.py         # Базовый класс Element
    ├── message.py         # Элемент Message
    ├── dialog.py          # Элемент Dialog
    └── ...                # Другие элементы
```

## course.py

**Файл:** `course.py`

**Назначение:** Логика работы с курсами - загрузка, навигация, управление сессиями.

### Основные классы и функции

#### `load_courses()`

Загружает список курсов из `courses.yml`.

**Логика:**
- Читает `scripts/{BOT_FOLDER}/courses.yml`
- Если есть `ext_courses` с `path: "db"`, добавляет курсы из БД через `db.get_courses()`
- Может также загружать курсы из другого YAML файла

**Возвращает:** словарь `{course_id: {path, element, settings, ...}}`

#### `Course` класс

**Инициализация:**
```python
course = Course(command)  # command может содержать course_id и UTM параметры
```

**Основные методы:**

- `set_user(chat_id, username)` — установка пользователя
- `start_run()` — создание сессии прохождения курса (run)
- `get_element(element_id)` — получение элемента по ID
- `get_first_element()` — получение первого элемента курса
- `get_user_ban_text(chat_id)` — проверка блокировки пользователя
- `validatedUser(username)` — проверка доступа к курсу

**Статические методы:**

- `get_current_element(chat_id)` — получение текущего элемента пользователя
- `get_next_element(chat_id)` — получение следующего элемента
- `get_element_by_id(chat_id, element_id, course_id)` — получение элемента по ID

**Внутренние методы:**

- `_get_element_from_course(course_id, element_id)` — загрузка элемента из курса
- `_get_next_element_from_course(course_id, element_id)` — получение следующего элемента
- `_get_element_from_data(element_key, course_id, element_data)` — создание экземпляра элемента

### Поддержка двух источников курсов

1. **YAML файлы** (`scripts/{BOT_FOLDER}/*.yml`)
   - Статические курсы в файловой системе
   - Загружаются через `get_course_data()` → `yaml.safe_load()`

2. **База данных** (таблицы `course` и `course_element`)
   - Динамически добавляемые курсы
   - Определяются через `path: "db"` в `courses.yml`
   - Загружаются через функции `db.get_element_from_course_by_id()`, `db.get_next_course_element_by_id()`

### Интеграция с элементами

Элементы создаются через регистр элементов:

```python
from elements import element_registry

element_type = element_data["element_data"]['type']
element_class = element_registry.get(element_type)
element = element_class(element_key, course_id, element_data)
```

## db.py

**Файл:** `db.py`

**Назначение:** Функции работы с базой данных через прямые SQL запросы.

### Подключение к БД

```python
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_connection():
    return psycopg2.connect(DATABASE_URL)
```

**Особенность:** Каждая функция создает новое подключение и закрывает его после выполнения. Это неэффективно для высоконагруженных приложений.

### Основные функции

**Работа с курсами:**
- `get_courses()` — получение списка курсов из БД
- `get_course_as_json(course_id)` — получение курса в формате JSON
- `get_element_from_course_by_id(course_id, element_id)` — получение элемента по ID
- `get_first_element_from_course(course_id)` — получение первого элемента
- `get_next_course_element_by_id(course_id, element_id)` — получение следующего элемента

**Работа с сессиями:**
- `create_run(course_id, username, chat_id, utms, utmc)` — создание сессии прохождения
- `get_run_id(chat_id, course_id)` — получение ID сессии
- `get_current_element(chat_id)` — получение текущего элемента пользователя
- `get_current_element_id(chat_id)` — получение ID текущего элемента
- `get_current_element_ids(chat_id)` — получение ID элемента, курса и сессии

**Работа с conversation:**
- `insert_element(chat_id, course_id, username, element_id, element_type, run_id, data, role, report, score, maxscore)` — сохранение взаимодействия

**Проверки:**
- `check_user_in_course(course_id, username)` — проверка доступа к курсу
- `check_user_banned(chat_id)` — проверка блокировки пользователя
- `is_course_ended(chat_id, course_id)` — проверка завершения курса

## chat.py

**Файл:** `chat.py`

**Назначение:** Интеграция с OpenAI API и Eleven Labs API.

### Конфигурация

```python
CONFIG_FILE = os.environ.get('CONFIG_FILE', 'config.yaml')
CONFIG = yaml.safe_load(file)["openai"]
API_KEY = os.getenv('OPENAI_API_KEY', CONFIG.get("api_key"))
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
```

### Основные функции

#### `get_reply(conversation, new_prompt, params)`

Стандартный запрос к OpenAI API.

**Параметры:**
- `conversation` — список сообщений в формате `[{"role": "user/assistant", "content": "..."}]`
- `new_prompt` — новое сообщение пользователя
- `params` — словарь параметров (model, temperature, reasoning и т.д.)

**Возвращает:** `(reply, conversation)` — ответ и обновленная conversation

**Логика:**
1. Добавляет новое сообщение пользователя в conversation
2. Вызывает `get_reply_impl()`
3. Добавляет ответ ассистента в conversation
4. Возвращает ответ и обновленную conversation

#### `get_reply_sys(conversation, sys_prompt, params)`

Запрос с системным промптом.

**Параметры:**
- `conversation` — список сообщений (не изменяется)
- `sys_prompt` — системный промпт
- `params` — параметры запроса

**Возвращает:** `(reply, conversation)` — ответ и conversation с системным промптом

**Использование:** Для Flows (админских функций), где нужен системный промпт.

#### `get_reply_impl(conversation, params)`

Внутренняя реализация запроса к API.

**Поддержка двух API:**

1. **Responses API** (`CONFIG.get("api") == "responses"`)
   - Использует `client.responses.create()`
   - Системные сообщения преобразуются в `instructions`
   - Поддержка reasoning моделей через `reasoning_effort`

2. **Completions API** (стандартный)
   - Использует `requests.post()` к `/chat/completions`
   - Стандартный формат conversation

**Поддержка моделей:**

- **Reasoning модели** (o1, gpt-5): используют `reasoning`/`reasoning_effort` вместо `temperature`
- **Обычные модели**: используют `temperature` (по умолчанию 0.0)

**Прокси:**
- В production (`CURRENT_ENV == 'heroku'`): `https://api.openai.com/v1`
- В development: `CONFIG.get("proxy")` или `https://api.proxyapi.ru/openai/v1`

## elements/

**Папка:** `elements/`

**Назначение:** Реализация типов элементов курсов.

### Регистр элементов

**Файл:** `elements/__init__.py`

```python
element_registry: Dict[str, Type[Element]] = {
    "message": Message,
    "audio": Audio,
    "input": Input,
    "quiz": Quiz,
    "question": Question,
    "multi_choice": MultiChoice,
    "dialog": Dialog,
    "miniapp": Miniapp,
    "test": Test,
    "jump": Jump,
    "revision": Revision,
    "delay": Delay,
    "end": End
}
```

### Базовый класс Element

**Файл:** `elements/element.py`

```python
class Element:
    def __init__(self, id, course_id, data):
        self.id = id
        self.course_id = course_id
        self.data = data
        self.type = data["element_data"]["type"]
        self.wait_for_callback = True
        self.parse_mode = data["element_data"].get("parse_mode", "MARKDOWN")
        self.link_preview = data["element_data"].get("link_preview")
    
    def set_user(self, chat_id, username):
        self.chat_id = chat_id
        self.username = username
    
    def set_run_id(self, run_id):
        self.run_id = run_id
    
    def set_conversation_id(self, conversation_id):
        self.conversation_id = conversation_id
    
    def save_report(self, role, report, score=None, maxscore=None):
        return db.insert_element(...)
```

**Особенности:**
- Все элементы наследуются от `Element`
- Каждый элемент имеет свой тип и данные из YAML/БД
- Элементы могут сохранять взаимодействия через `save_report()`

## Интеграция с веб-приложением

Backend использует Core Logic модули через `sys.path`:

```python
# backend/app/api/v1/mvp.py
import sys
import os
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import course
from elements import element_registry

element = course.Course.get_current_element(chat_id)
```

**Два подхода к работе с БД:**

1. **Прямые SQL (`db.py`)** — используется Core Logic модулями
2. **SQLAlchemy ORM (`backend/app/models/`)** — используется в FastAPI для новых функций

## Зависимости

- `psycopg2` — подключение к PostgreSQL
- `pyyaml` — работа с YAML файлами
- `openai` — клиент OpenAI API
- `requests` — HTTP запросы (для Completions API)
- `python-dotenv` — загрузка переменных окружения

## Известные ограничения

1. **Управление подключениями к БД:**
   - Каждая функция создает новое подключение
   - Нет пула подключений
   - Может привести к проблемам при высокой нагрузке

2. **Дублирование логики:**
   - Частичное дублирование между `db.py` и SQLAlchemy моделями
   - Два разных подхода к работе с одной БД

3. **Зависимость от глобального состояния:**
   - Использование переменных окружения напрямую
   - Нет dependency injection
