# Перенос Telegram приложения в отдельную папку

## Обзор

Данный документ анализирует сложность переноса Telegram бота из корня проекта в отдельную папку (например, `telegram/` или `telegram_bot/`).

## Текущая структура

Telegram приложение в настоящее время находится в корне проекта и состоит из следующих файлов:

```
profochatbot/
├── main.py              # Точка входа Telegram бота
├── course.py            # Логика работы с курсами
├── db.py                # Функции работы с базой данных
├── chat.py              # Интеграция с OpenAI/Eleven Labs API
├── waiting.py            # Планировщик отложенных элементов
├── generator.py          # Генератор курсов (admin flow)
├── editor.py             # Редактор курсов (admin flow)
├── globals.py            # Глобальные переменные (BOT_NAME, BOT_FOLDER, CONFIG_FILE)
├── api.py                # FastAPI обертка для веб-приложения
├── elements/             # Реализация типов элементов курсов
│   ├── __init__.py
│   ├── element.py
│   ├── message.py
│   ├── dialog.py
│   └── ... (другие элементы)
├── scripts/              # YAML файлы курсов
│   └── {bot_folder}/
│       └── courses.yml
├── static/               # Статические файлы
├── templates/            # HTML шаблоны
└── bin/telegram/         # Скрипты запуска
    ├── run.sh
    ├── run-api.sh
    └── delete_webhook.py
```

## Оценка сложности: **СРЕДНЯЯ-ВЫСОКАЯ** ⚠️

### Причины сложности

1. **Множественные взаимозависимости** между модулями
2. **Относительные пути** к ресурсам (scripts/, static/, templates/)
3. **Использование модулей webapp'ом** из корня проекта
4. **Скрипты запуска** используют PROJECT_ROOT и запускают main.py из корня
5. **Глобальные переменные** (globals.py) используются многими модулями

## Детальный анализ зависимостей

### 1. Импорты между модулями Telegram бота

Все модули используют относительные импорты друг друга:

**main.py** импортирует:
- `waiting` (init_waiting, init_banning)
- `course` (Course, load_courses)
- `generator` (CreateFlow)
- `editor` (init_flow, EditFlow)
- `globals`
- `db`
- `chat`

**course.py** импортирует:
- `db`
- `elements` (element_registry)
- `globals`

**db.py** импортирует:
- `globals`

**chat.py** импортирует:
- `globals`

**waiting.py** импортирует:
- `course` (Course)
- `globals`
- `elements.element`
- `db`

**api.py** импортирует:
- `db`
- `course` (Course, load_courses)
- `globals`
- `utils` (parse_init_data)

### 2. Пути к ресурсам

Модули используют относительные пути к ресурсам:

**course.py:25**
```python
folder = "scripts/" + globals.BOT_FOLDER
```

**course.py:54**
```python
if self.course_path != "db" and not self.course_path.startswith("scripts/"):
    folder = "scripts/" + globals.BOT_FOLDER
```

**globals.py:3**
```python
CONFIG_FILE = os.getenv('CONFIG_DIR', '')+'config.yaml'
```

### 3. Использование модулей webapp'ом

**webapp/backend/app/api/v1/mvp.py** использует модули из корня:

```python
# Добавляем корневую директорию проекта в путь для импорта модулей Telegram бота
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import globals
import db
```

**webapp/MVP_README.md:48** упоминает:
> Убедитесь, что модули Telegram бота доступны (db.py, course.py, globals.py находятся в корне проекта)

### 4. Скрипты запуска

**bin/telegram/run.sh:13-14**
```bash
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
cd "$PROJECT_ROOT"
```

**bin/telegram/run.sh:71**
```bash
python main.py "$BOT_FOLDER_ARG"
```

**bin/telegram/run-api.sh:62**
```bash
uvicorn api:app --host 0.0.0.0 --port $PORT --reload
```

## План переноса

### Вариант 1: Полный перенос в `telegram/` (рекомендуется)

**Структура после переноса:**
```
profochatbot/
├── telegram/              # Telegram приложение
│   ├── main.py
│   ├── course.py
│   ├── db.py
│   ├── chat.py
│   ├── waiting.py
│   ├── generator.py
│   ├── editor.py
│   ├── globals.py
│   ├── api.py
│   ├── elements/
│   ├── scripts/           # Перенести или оставить ссылку?
│   ├── static/            # Перенести или оставить ссылку?
│   └── templates/         # Перенести или оставить ссылку?
├── webapp/
└── bin/telegram/          # Обновить скрипты
```

**Шаги:**

1. **Создать папку `telegram/`**
   ```bash
   mkdir telegram
   ```

2. **Перенести файлы**
   ```bash
   mv main.py course.py db.py chat.py waiting.py generator.py editor.py globals.py api.py telegram/
   mv elements telegram/
   ```

3. **Обновить импорты во всех файлах**
   - Заменить относительные импорты на абсолютные или использовать `sys.path`
   - Пример: `from course import Course` → `from telegram.course import Course`
   - Или добавить `sys.path.insert(0, os.path.dirname(__file__))` в начало каждого файла

4. **Обновить пути к ресурсам**
   - В `course.py`: изменить `"scripts/"` на `"../scripts/"` или использовать абсолютные пути
   - В `globals.py`: обновить `CONFIG_FILE` путь
   - Проверить все места, где используются `scripts/`, `static/`, `templates/`

5. **Обновить скрипты запуска**
   - `bin/telegram/run.sh`: изменить `python main.py` на `python telegram/main.py`
   - `bin/telegram/run-api.sh`: изменить `uvicorn api:app` на `uvicorn telegram.api:app`
   - Обновить `PROJECT_ROOT` логику если нужно

6. **Обновить webapp для использования модулей из `telegram/`**
   - В `webapp/backend/app/api/v1/mvp.py`: изменить путь импорта
   - Обновить `sys.path.insert` для указания на `telegram/` папку

7. **Обновить Makefile**
   - Обновить команды для запуска из новой локации

8. **Обновить документацию**
   - Обновить пути в README файлах
   - Обновить архитектурную документацию

### Вариант 2: Частичный перенос (только точка входа)

Перенести только `main.py` и создать обертку, которая импортирует модули из корня.

**Плюсы:** Минимальные изменения  
**Минусы:** Не решает проблему организации кода

### Вариант 3: Оставить общие модули в корне

Перенести только Telegram-специфичные файлы (`main.py`, обработчики), оставив общие модули (`db.py`, `course.py`, `elements/`) в корне.

**Структура:**
```
profochatbot/
├── telegram/              # Только Telegram-специфичный код
│   ├── main.py
│   └── handlers/          # Обработчики команд и сообщений
├── course.py              # Общий модуль
├── db.py                  # Общий модуль
├── elements/              # Общий модуль
└── ...
```

**Плюсы:** Меньше изменений, общие модули доступны и webapp'у  
**Минусы:** Неполное разделение ответственности

## Рекомендации

### Рекомендуется: Вариант 1 (полный перенос)

**Преимущества:**
- ✅ Четкое разделение ответственности
- ✅ Улучшенная организация кода
- ✅ Легче поддерживать и тестировать
- ✅ Соответствует принципам чистой архитектуры

**Недостатки:**
- ⚠️ Требует больше работы
- ⚠️ Нужно обновить множество файлов
- ⚠️ Риск пропустить некоторые зависимости

### Критические моменты

1. **scripts/ папка**
   - Решение: Оставить в корне и использовать относительный путь `../scripts/` из `telegram/`
   - Или: Перенести в `telegram/scripts/` и обновить все пути

2. **static/ и templates/ папки**
   - Решение: Аналогично scripts/ - оставить в корне или перенести

3. **config.yaml**
   - Решение: Обновить `CONFIG_FILE` в `globals.py` для работы из новой локации

4. **Общие модули с webapp**
   - Решение: Создать общий пакет `core/` для общих модулей (`db.py`, `course.py`, `elements/`)
   - Или: Использовать симлинки
   - Или: Дублировать импорты через `sys.path`

## Оценка трудозатрат

- **Время:** 4-8 часов работы
- **Риски:** Средние (много мест для ошибок)
- **Тестирование:** Требуется полное тестирование всех функций бота и webapp

## Чеклист переноса

- [ ] Создать папку `telegram/`
- [ ] Перенести все файлы Telegram бота
- [ ] Обновить все импорты в модулях
- [ ] Обновить пути к `scripts/`, `static/`, `templates/`
- [ ] Обновить `CONFIG_FILE` путь в `globals.py`
- [ ] Обновить скрипты запуска (`bin/telegram/*.sh`)
- [ ] Обновить `Makefile`
- [ ] Обновить webapp для импорта из новой локации
- [ ] Обновить документацию
- [ ] Протестировать запуск бота
- [ ] Протестировать все команды бота
- [ ] Протестировать webapp интеграцию
- [ ] Проверить работу с курсами
- [ ] Проверить работу с базой данных

## Альтернативные решения

### Использование Python пакетов

Создать структуру пакетов:
```
profochatbot/
├── telegram_bot/
│   ├── __init__.py
│   ├── main.py
│   └── ...
├── core/                  # Общие модули
│   ├── __init__.py
│   ├── db.py
│   ├── course.py
│   └── elements/
└── webapp/
```

Это позволит использовать импорты вида:
```python
from core import db, course
from telegram_bot import main
```

### Использование PYTHONPATH

Настроить `PYTHONPATH` в скриптах запуска для указания корня проекта, что позволит использовать абсолютные импорты без изменения кода.

## Заключение

Перенос Telegram приложения в отдельную папку **возможен**, но требует **тщательного планирования** и **систематического подхода**. Рекомендуется:

1. Начать с создания резервной копии
2. Выполнить перенос поэтапно
3. Тестировать после каждого этапа
4. Документировать все изменения

**Рекомендуемый подход:** Вариант 1 (полный перенос) с созданием общего пакета `core/` для модулей, используемых и webapp'ом, и telegram ботом.
