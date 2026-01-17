# Предложения по построению автоматизации тестирования Telegram бота

## Содержание

1. [Обзор](#обзор)
2. [Текущее состояние тестирования](#текущее-состояние-тестирования)
3. [Архитектура тестирования](#архитектура-тестирования)
4. [Уровни тестирования](#уровни-тестирования)
5. [Инструменты и библиотеки](#инструменты-и-библиотеки)
6. [Стратегия тестирования компонентов](#стратегия-тестирования-компонентов)
7. [Интеграционное тестирование](#интеграционное-тестирование)
8. [E2E тестирование](#e2e-тестирование)
9. [Моки и стабы](#моки-и-стабы)
10. [Тестовая инфраструктура](#тестовая-инфраструктура)
11. [CI/CD интеграция](#cicd-интеграция)
12. [План внедрения](#план-внедрения)
13. [Метрики и отчетность](#метрики-и-отчетность)

---

## Обзор

Данный документ описывает стратегию построения автоматизированного тестирования для Telegram бота ProfoChatBot. Бот построен на базе aiogram 3.x и включает сложную логику работы с курсами, элементами, интеграциями с внешними API (OpenAI, Eleven Labs) и базой данных PostgreSQL.

### Цели автоматизации тестирования

- **Надежность**: Обеспечить стабильность работы бота при изменениях кода
- **Качество**: Выявить ошибки на ранних этапах разработки
- **Документация**: Тесты как живая документация поведения системы
- **Рефакторинг**: Безопасное улучшение кода с уверенностью в отсутствии регрессий
- **Скорость разработки**: Быстрая обратная связь при разработке новых функций

---

## Текущее состояние тестирования

### Существующая инфраструктура

1. **Веб-приложение (Backend)**:
   - Базовые тесты импортов (`test_backend.py`, `test_backend_safe.py`)
   - Проверка конфигурации FastAPI приложения
   - Проверка модуля безопасности

2. **Telegram бот**:
   - Отсутствует автоматизированное тестирование
   - Ручное тестирование через реального бота

### Проблемы текущего подхода

- ❌ Нет автоматических тестов для логики бота
- ❌ Нет тестов для элементов курсов
- ❌ Нет тестов для интеграций с внешними API
- ❌ Нет тестов для работы с базой данных
- ❌ Ручное тестирование медленное и подвержено ошибкам
- ❌ Нет покрытия кода метриками

---

## Архитектура тестирования

### Структура тестов

```
profochatbot/
├── tests/                          # Корневая директория тестов
│   ├── unit/                       # Юнит-тесты
│   │   ├── test_elements/          # Тесты элементов курсов
│   │   │   ├── test_message.py
│   │   │   ├── test_dialog.py
│   │   │   ├── test_quiz.py
│   │   │   └── test_input.py
│   │   ├── test_course.py          # Тесты класса Course
│   │   ├── test_db.py              # Тесты функций БД
│   │   └── test_chat.py             # Тесты интеграции с ИИ
│   │
│   ├── integration/                # Интеграционные тесты
│   │   ├── test_course_flow.py     # Тесты потока прохождения курса
│   │   ├── test_database.py        # Тесты работы с БД
│   │   └── test_api_integration.py # Тесты внешних API
│   │
│   ├── e2e/                        # End-to-end тесты
│   │   ├── test_bot_commands.py    # Тесты команд бота
│   │   ├── test_course_completion.py # Полное прохождение курса
│   │   └── test_admin_flows.py     # Тесты админских функций
│   │
│   ├── fixtures/                   # Тестовые данные
│   │   ├── courses/                # Примеры курсов для тестов
│   │   ├── elements/               # Примеры элементов
│   │   └── database/               # SQL фикстуры
│   │
│   ├── mocks/                      # Моки и стабы
│   │   ├── mock_bot.py             # Мок Telegram Bot API
│   │   ├── mock_openai.py          # Мок OpenAI API
│   │   └── mock_elevenlabs.py      # Мок Eleven Labs API
│   │
│   ├── conftest.py                 # Pytest конфигурация и фикстуры
│   └── utils/                      # Утилиты для тестов
│       ├── db_helpers.py           # Хелперы для работы с БД
│       └── bot_helpers.py           # Хелперы для работы с ботом
│
├── pytest.ini                      # Конфигурация pytest
└── requirements-test.txt           # Зависимости для тестирования
```

---

## Уровни тестирования

### 1. Юнит-тесты (Unit Tests)

**Цель**: Тестирование отдельных функций и классов в изоляции.

**Области покрытия**:
- Логика элементов курсов (`elements/`)
- Методы класса `Course`
- Функции работы с БД (`db.py`)
- Утилиты и хелперы

**Примеры тестов**:

```python
# tests/unit/test_elements/test_message.py
import pytest
from elements.message import Message
from unittest.mock import Mock, AsyncMock

@pytest.mark.asyncio
async def test_message_send():
    """Тест отправки сообщения"""
    bot = AsyncMock()
    element_data = {
        "element_data": {
            "type": "message",
            "text": "Привет, мир!",
            "button": "Продолжить"
        }
    }
    
    message = Message("msg_1", "course_1", element_data)
    message.set_user(12345, "test_user")
    
    await message.send(bot)
    
    bot.send_message.assert_called_once()
    assert "Привет, мир!" in str(bot.send_message.call_args)

@pytest.mark.asyncio
async def test_message_without_button():
    """Тест сообщения без кнопки"""
    bot = AsyncMock()
    element_data = {
        "element_data": {
            "type": "message",
            "text": "Просто текст"
        }
    }
    
    message = Message("msg_1", "course_1", element_data)
    message.set_user(12345, "test_user")
    
    await message.send(bot)
    
    # Проверяем, что кнопка не добавлена
    call_kwargs = bot.send_message.call_args[1]
    assert call_kwargs.get("reply_markup") is None
```

### 2. Интеграционные тесты (Integration Tests)

**Цель**: Тестирование взаимодействия между компонентами.

**Области покрытия**:
- Взаимодействие Course ↔ Elements
- Взаимодействие с базой данных
- Интеграция с внешними API (с моками)
- Поток прохождения курса

**Примеры тестов**:

```python
# tests/integration/test_course_flow.py
import pytest
from course import Course
from unittest.mock import Mock, AsyncMock, patch
import db

@pytest.mark.asyncio
async def test_course_start_flow():
    """Тест полного потока запуска курса"""
    # Мокируем БД
    with patch('db.create_run', return_value=1):
        with patch('db.insert_element'):
            course = Course("test_course")
            course.set_user(12345, "test_user")
            run_id = course.start_run()
            
            assert run_id == 1
            assert course.run_id == 1
            
            # Получаем первый элемент
            first_element = course.get_first_element()
            assert first_element is not None
            assert first_element.course_id == "test_course"
```

### 3. End-to-End тесты (E2E Tests)

**Цель**: Тестирование полных пользовательских сценариев.

**Области покрытия**:
- Команды бота (`/start`, `/create`, `/edit`)
- Полное прохождение курса
- Обработка различных типов сообщений
- Админские функции

**Примеры тестов**:

```python
# tests/e2e/test_bot_commands.py
import pytest
from aiogram import Bot, Dispatcher
from aiogram.types import Message, User, Chat
from unittest.mock import AsyncMock
import main

@pytest.mark.asyncio
async def test_start_command():
    """Тест команды /start"""
    # Создаем мок бота
    bot = AsyncMock(spec=Bot)
    bot.get_me = AsyncMock(return_value=User(id=1, is_bot=True, first_name="TestBot"))
    
    # Создаем мок сообщения
    message = Message(
        message_id=1,
        date=None,
        chat=Chat(id=12345, type="private"),
        from_user=User(id=12345, is_bot=False, username="test_user"),
        text="/start test_course"
    )
    
    # Мокируем зависимости
    with patch('main.init_course') as mock_init:
        mock_course = Mock()
        mock_course.get_first_element.return_value = Mock()
        mock_init.return_value = mock_course
        
        # Вызываем обработчик
        from main import start_command_handler
        await start_command_handler(message, Mock(args="test_course"))
        
        # Проверяем вызовы
        mock_init.assert_called_once()
```

---

## Инструменты и библиотеки

### Основные инструменты

1. **pytest** — основной фреймворк для тестирования
   ```bash
   pip install pytest pytest-asyncio pytest-cov pytest-mock
   ```

2. **pytest-asyncio** — поддержка асинхронных тестов
   ```python
   pytest.ini:
   [pytest]
   asyncio_mode = auto
   ```

3. **pytest-mock** — расширенные возможности моков
   ```python
   def test_with_mock(mocker):
       mock_func = mocker.patch('module.function')
   ```

4. **pytest-cov** — покрытие кода
   ```bash
   pytest --cov=. --cov-report=html
   ```

5. **aiogram-test** или **aiogram-mock** — моки для aiogram
   ```bash
   pip install aiogram-mock  # Если доступен
   # Или создаем собственные моки
   ```

6. **faker** — генерация тестовых данных
   ```bash
   pip install faker
   ```

7. **freezegun** — мокирование времени для тестов планировщика
   ```bash
   pip install freezegun
   ```

### Дополнительные инструменты

- **httpx** — для тестирования HTTP запросов (уже в зависимостях)
- **pytest-timeout** — таймауты для тестов
- **pytest-xdist** — параллельный запуск тестов
- **factory-boy** — фабрики для создания тестовых объектов

### requirements-test.txt

```txt
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
pytest-mock==3.12.0
pytest-timeout==2.2.0
pytest-xdist==3.5.0
faker==20.1.0
freezegun==1.2.2
factory-boy==3.3.0
httpx==0.27.0
```

---

## Стратегия тестирования компонентов

### 1. Тестирование элементов курсов (`elements/`)

#### Message Element

```python
# tests/unit/test_elements/test_message.py
import pytest
from elements.message import Message
from unittest.mock import AsyncMock, Mock

@pytest.fixture
def message_element_data():
    return {
        "element_data": {
            "type": "message",
            "text": "Тестовое сообщение",
            "button": "Продолжить"
        }
    }

@pytest.fixture
def bot_mock():
    bot = AsyncMock()
    bot.send_message = AsyncMock()
    return bot

@pytest.mark.asyncio
async def test_message_send_with_button(bot_mock, message_element_data):
    """Тест отправки сообщения с кнопкой"""
    message = Message("msg_1", "course_1", message_element_data)
    message.set_user(12345, "test_user")
    
    await message.send(bot_mock)
    
    bot_mock.send_message.assert_called_once()
    call_args = bot_mock.send_message.call_args
    assert call_args[0][0] == 12345  # chat_id
    assert "Тестовое сообщение" in call_args[0][1]  # text
    assert call_args[1]["reply_markup"] is not None  # button exists

@pytest.mark.asyncio
async def test_message_save_report(message_element_data):
    """Тест сохранения отчета в БД"""
    with patch('db.insert_element') as mock_insert:
        message = Message("msg_1", "course_1", message_element_data)
        message.set_user(12345, "test_user")
        message.set_run_id(1)
        
        message.save_report(role="bot", report="Тестовое сообщение")
        
        mock_insert.assert_called_once()
        call_args = mock_insert.call_args
        assert call_args[1]["role"] == "bot"
        assert call_args[1]["report"] == "Тестовое сообщение"
```

#### Dialog Element

```python
# tests/unit/test_elements/test_dialog.py
import pytest
from elements.dialog import Dialog
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_dialog_chat_reply():
    """Тест ответа в диалоге"""
    bot = AsyncMock()
    element_data = {
        "element_data": {
            "type": "dialog",
            "system_prompt": "Ты помощник",
            "user_prompt": "Привет"
        }
    }
    
    dialog = Dialog("dialog_1", "course_1", element_data)
    dialog.set_user(12345, "test_user")
    
    # Мокируем вызов OpenAI API
    with patch('chat.get_reply', return_value="Привет! Как дела?"):
        await dialog.chat_reply(bot, "Привет", ban_text=None)
        
        # Проверяем, что ответ отправлен
        bot.send_message.assert_called()
```

#### Quiz Element

```python
# tests/unit/test_elements/test_quiz.py
import pytest
from elements.quiz import Quiz
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_quiz_send():
    """Тест отправки квиза"""
    bot = AsyncMock()
    element_data = {
        "element_data": {
            "type": "quiz",
            "question": "Сколько будет 2+2?",
            "options": ["3", "4", "5"],
            "correct": 1
        }
    }
    
    quiz = Quiz("quiz_1", "course_1", element_data)
    quiz.set_user(12345, "test_user")
    
    await quiz.send(bot)
    
    # Проверяем отправку опроса
    bot.send_poll.assert_called_once()
    call_args = bot.send_poll.call_args
    assert call_args[0][0] == 12345  # chat_id
    assert "Сколько будет 2+2?" in call_args[0][1]  # question

@pytest.mark.asyncio
async def test_quiz_answer_validation():
    """Тест проверки правильности ответа"""
    element_data = {
        "element_data": {
            "type": "quiz",
            "question": "Сколько будет 2+2?",
            "options": ["3", "4", "5"],
            "correct": 1
        }
    }
    
    quiz = Quiz("quiz_1", "course_1", element_data)
    quiz.set_quiz_answer_id(1)  # Правильный ответ
    
    await quiz.send_quiz_reply(AsyncMock())
    
    assert quiz.score == 1.0  # Правильный ответ
```

### 2. Тестирование класса Course

```python
# tests/unit/test_course.py
import pytest
from course import Course, load_courses
from unittest.mock import patch, Mock

@pytest.fixture
def sample_course_data():
    return {
        "test_course": {
            "path": "test_course.yml",
            "element": None
        }
    }

def test_course_initialization(sample_course_data):
    """Тест инициализации курса"""
    with patch('course.load_courses', return_value=sample_course_data):
        course = Course("test_course")
        
        assert course.course_id == "test_course"
        assert not course.not_found
        assert course.course_path == "scripts/test/test_course.yml"

def test_course_not_found():
    """Тест обработки несуществующего курса"""
    with patch('course.load_courses', return_value={}):
        course = Course("nonexistent")
        
        assert course.not_found

def test_course_extract_params():
    """Тест извлечения параметров из команды"""
    course = Course("")
    params = course.extract_params("course_id__utmsIItg__utmcIIcampaign")
    
    assert params == "course_id"
    assert course.params["utms"] == "tg"
    assert course.params["utmc"] == "campaign"

@pytest.mark.asyncio
async def test_course_start_run():
    """Тест создания run"""
    with patch('db.create_run', return_value=42):
        course = Course("test_course")
        course.set_user(12345, "test_user")
        course.params = {"utms": "tg", "utmc": "test"}
        
        run_id = course.start_run()
        
        assert run_id == 42
        assert course.run_id == 42
```

### 3. Тестирование функций БД

```python
# tests/unit/test_db.py
import pytest
from unittest.mock import patch, Mock
import db

@pytest.fixture
def mock_db_connection():
    """Мок подключения к БД"""
    with patch('db.get_connection') as mock_conn:
        mock_cursor = Mock()
        mock_conn.return_value.cursor.return_value = mock_cursor
        mock_conn.return_value.__enter__ = Mock(return_value=mock_conn.return_value)
        mock_conn.return_value.__exit__ = Mock(return_value=False)
        yield mock_conn, mock_cursor

def test_create_run(mock_db_connection):
    """Тест создания run"""
    mock_conn, mock_cursor = mock_db_connection
    mock_cursor.fetchone.return_value = [123]
    
    run_id = db.create_run("course_1", "user_1", 12345, "utm_s", "utm_c")
    
    assert run_id == 123
    mock_cursor.execute.assert_called_once()
    mock_conn.return_value.commit.assert_called_once()

def test_get_current_element(mock_db_connection):
    """Тест получения текущего элемента"""
    mock_conn, mock_cursor = mock_db_connection
    mock_cursor.fetchone.return_value = (
        1,  # conversation_id
        "element_1",  # element_id
        "message",  # element_type
        "course_1",  # course_id
        1,  # run_id
        '{"element_data": {"type": "message", "text": "Test"}}'  # element_data
    )
    
    result = db.get_current_element(12345)
    
    assert result is not None
    assert result[1] == "element_1"
```

---

## Интеграционное тестирование

### Тестирование потока прохождения курса

```python
# tests/integration/test_course_flow.py
import pytest
from course import Course
from unittest.mock import AsyncMock, patch, Mock
import db

@pytest.mark.asyncio
async def test_full_course_flow():
    """Тест полного потока прохождения курса"""
    bot = AsyncMock()
    
    # Мокируем БД
    with patch('db.create_run', return_value=1):
        with patch('db.insert_element'):
            with patch('db.get_current_element', return_value=None):
                with patch('db.get_next_course_element_by_id') as mock_next:
                    # Настраиваем последовательность элементов
                    mock_next.side_effect = [
                        ("element_1", "message", '{"element_data": {"type": "message", "text": "Шаг 1"}}'),
                        ("element_2", "quiz", '{"element_data": {"type": "quiz", "question": "Вопрос"}}'),
                        None  # Конец курса
                    ]
                    
                    # Запускаем курс
                    course = Course("test_course")
                    course.set_user(12345, "test_user")
                    course.start_run()
                    
                    # Получаем первый элемент
                    first_element = course.get_first_element()
                    assert first_element is not None
                    
                    # Отправляем элемент
                    await first_element.send(bot)
                    bot.send_message.assert_called()
                    
                    # Переходим к следующему
                    await Course.send_next_element(bot, 12345, "test_user")
                    assert mock_next.call_count >= 1
```

### Тестирование работы с базой данных

```python
# tests/integration/test_database.py
import pytest
import psycopg2
from psycopg2.extras import RealDictCursor
import db

@pytest.fixture(scope="module")
def test_db():
    """Создание тестовой БД"""
    # Используем отдельную тестовую БД
    test_db_url = os.environ.get('TEST_DATABASE_URL', 'postgresql://test:test@localhost/test_db')
    
    # Создаем схему
    conn = psycopg2.connect(test_db_url)
    cursor = conn.cursor()
    cursor.execute(open('tests/fixtures/database/schema.sql').read())
    conn.commit()
    cursor.close()
    conn.close()
    
    yield test_db_url
    
    # Очистка после тестов
    conn = psycopg2.connect(test_db_url)
    cursor = conn.cursor()
    cursor.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    conn.commit()
    cursor.close()
    conn.close()

@pytest.mark.integration
def test_create_run_integration(test_db):
    """Интеграционный тест создания run"""
    with patch('db.DATABASE_URL', test_db):
        run_id = db.create_run("test_course", "test_user", 12345)
        
        assert run_id is not None
        
        # Проверяем, что run создан
        conn = psycopg2.connect(test_db)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM run WHERE run_id = %s", (run_id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        assert result is not None
        assert result[3] == "test_course"  # course_id
```

---

## E2E тестирование

### Тестирование команд бота

```python
# tests/e2e/test_bot_commands.py
import pytest
from aiogram import Bot, Dispatcher
from aiogram.types import Message, User, Chat, CallbackQuery
from unittest.mock import AsyncMock, patch
import asyncio

@pytest.fixture
def bot_mock():
    """Мок бота для E2E тестов"""
    bot = AsyncMock(spec=Bot)
    bot.get_me = AsyncMock(return_value=User(
        id=1, is_bot=True, first_name="TestBot", username="testbot"
    ))
    bot.send_message = AsyncMock()
    bot.send_poll = AsyncMock()
    return bot

@pytest.fixture
def dispatcher_mock(bot_mock):
    """Мок диспетчера"""
    dp = Dispatcher()
    return dp

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_start_command_e2e(bot_mock):
    """E2E тест команды /start"""
    from main import start_command_handler
    from aiogram.types import CommandObject
    
    # Создаем мок сообщения
    message = Message(
        message_id=1,
        date=None,
        chat=Chat(id=12345, type="private"),
        from_user=User(id=12345, is_bot=False, username="test_user"),
        text="/start test_course"
    )
    
    command = CommandObject(command="start", args="test_course")
    
    # Мокируем зависимости
    with patch('main.init_course') as mock_init:
        mock_course = Mock()
        mock_element = AsyncMock()
        mock_course.get_first_element.return_value = mock_element
        mock_init.return_value = mock_course
        
        # Вызываем обработчик
        await start_command_handler(message, command)
        
        # Проверяем результаты
        mock_init.assert_called_once_with("test_course", 12345, "test_user")
        mock_element.send.assert_called_once_with(bot_mock)

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_text_message_handling(bot_mock):
    """E2E тест обработки текстового сообщения"""
    from main import reply_user
    
    message = Message(
        message_id=2,
        date=None,
        chat=Chat(id=12345, type="private"),
        from_user=User(id=12345, is_bot=False, username="test_user"),
        text="Привет, бот!"
    )
    
    # Мокируем текущий элемент
    with patch('main.Course.get_current_element') as mock_get:
        mock_element = Mock()
        mock_element.type = "dialog"
        mock_element.set_user = Mock()
        mock_get.return_value = mock_element
        
        with patch('main.Course.send_next_element', new_callable=AsyncMock):
            await reply_user(message)
            
            mock_element.set_user.assert_called_once_with(12345, "test_user")
```

### Тестирование полного прохождения курса

```python
# tests/e2e/test_course_completion.py
import pytest
from unittest.mock import AsyncMock, patch, Mock
import main

@pytest.mark.e2e
@pytest.mark.asyncio
async def test_full_course_completion():
    """E2E тест полного прохождения курса"""
    bot = AsyncMock()
    
    # Определяем последовательность элементов курса
    course_elements = [
        {
            "id": "msg_1",
            "type": "message",
            "data": {"element_data": {"type": "message", "text": "Добро пожаловать!"}}
        },
        {
            "id": "quiz_1",
            "type": "quiz",
            "data": {"element_data": {"type": "quiz", "question": "Вопрос?", "options": ["A", "B"], "correct": 0}}
        },
        {
            "id": "end_1",
            "type": "end",
            "data": {"element_data": {"type": "end"}}
        }
    ]
    
    # Мокируем БД и курс
    with patch('db.create_run', return_value=1):
        with patch('db.insert_element'):
            with patch('db.get_current_element') as mock_current:
                with patch('db.get_next_course_element_by_id') as mock_next:
                    # Настраиваем последовательность
                    def get_next_side_effect(*args):
                        if len(course_elements) > 0:
                            elem = course_elements.pop(0)
                            return (
                                elem["id"],
                                elem["type"],
                                str(elem["data"])
                            )
                        return None
                    
                    mock_next.side_effect = get_next_side_effect
                    mock_current.return_value = None
                    
                    # Симулируем прохождение курса
                    from course import Course
                    course = Course("test_course")
                    course.set_user(12345, "test_user")
                    course.start_run()
                    
                    # Отправляем элементы по очереди
                    element = course.get_first_element()
                    while element:
                        await element.send(bot)
                        element = course.get_next_element(12345)
                    
                    # Проверяем, что все элементы отправлены
                    assert bot.send_message.call_count >= 1
```

---

## Моки и стабы

### Мок Telegram Bot API

```python
# tests/mocks/mock_bot.py
from unittest.mock import AsyncMock, Mock
from aiogram import Bot
from aiogram.types import Message as TelegramMessage

class MockBot:
    """Мок для Telegram Bot API"""
    
    def __init__(self):
        self.send_message = AsyncMock()
        self.send_poll = AsyncMock()
        self.send_voice = AsyncMock()
        self.send_photo = AsyncMock()
        self.send_video = AsyncMock()
        self.get_file = AsyncMock()
        self.download_file = AsyncMock()
        self.get_me = AsyncMock()
        self.send_chat_action = AsyncMock()
        
        # Настройка дефолтных ответов
        self.get_me.return_value = Mock(
            id=1,
            is_bot=True,
            first_name="TestBot",
            username="testbot"
        )
    
    def reset(self):
        """Сброс всех моков"""
        self.send_message.reset_mock()
        self.send_poll.reset_mock()
        self.send_voice.reset_mock()
        self.send_photo.reset_mock()
        self.send_video.reset_mock()

@pytest.fixture
def mock_bot():
    """Фикстура для мока бота"""
    return MockBot()
```

### Мок OpenAI API

```python
# tests/mocks/mock_openai.py
from unittest.mock import AsyncMock, patch
import openai

class MockOpenAI:
    """Мок для OpenAI API"""
    
    def __init__(self):
        self.responses = []
        self.call_count = 0
    
    def add_response(self, text: str):
        """Добавить ответ для следующего запроса"""
        self.responses.append(text)
    
    def get_reply(self, *args, **kwargs):
        """Мок функции get_reply"""
        if self.responses:
            response = self.responses.pop(0)
        else:
            response = "Default mock response"
        
        self.call_count += 1
        return response

@pytest.fixture
def mock_openai():
    """Фикстура для мока OpenAI"""
    mock = MockOpenAI()
    with patch('chat.get_reply', side_effect=mock.get_reply):
        yield mock
```

### Мок Eleven Labs API

```python
# tests/mocks/mock_elevenlabs.py
from unittest.mock import AsyncMock, patch
import requests

class MockElevenLabs:
    """Мок для Eleven Labs API"""
    
    def __init__(self):
        self.transcription_responses = []
        self.tts_responses = []
    
    def add_transcription(self, text: str):
        """Добавить транскрипцию"""
        self.transcription_responses.append(text)
    
    def transcribe(self, *args, **kwargs):
        """Мок транскрибации"""
        if self.transcription_responses:
            return {"text": self.transcription_responses.pop(0)}
        return {"text": "Mock transcription"}

@pytest.fixture
def mock_elevenlabs():
    """Фикстура для мока Eleven Labs"""
    mock = MockElevenLabs()
    with patch('requests.post') as mock_post:
        def post_side_effect(url, *args, **kwargs):
            if 'speech-to-text' in url:
                response = Mock()
                response.status_code = 200
                response.json.return_value = mock.transcribe()
                return response
            return Mock(status_code=200, json=lambda: {})
        
        mock_post.side_effect = post_side_effect
        yield mock
```

---

## Тестовая инфраструктура

### pytest.ini

```ini
[pytest]
# Режим асинхронности
asyncio_mode = auto

# Пути для поиска тестов
testpaths = tests

# Маркеры
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
    db: Tests requiring database

# Опции
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=.
    --cov-report=term-missing
    --cov-report=html
    --cov-exclude=venv/*
    --cov-exclude=tests/*
    --cov-exclude=*/migrations/*

# Фильтры предупреждений
filterwarnings =
    ignore::DeprecationWarning
    ignore::PendingDeprecationWarning

# Таймауты (если установлен pytest-timeout)
timeout = 300
timeout_method = thread
```

### conftest.py

```python
# tests/conftest.py
import pytest
import os
import sys
from unittest.mock import Mock, patch, AsyncMock

# Добавляем корневую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Устанавливаем переменные окружения для тестов
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test_db")
os.environ.setdefault("BOT_API_TOKEN", "test_token")
os.environ.setdefault("OPENAI_API_KEY", "test_key")
os.environ.setdefault("ELEVENLABS_API_KEY", "test_key")

@pytest.fixture(scope="session")
def test_config():
    """Конфигурация для тестов"""
    return {
        "database_url": os.environ.get("TEST_DATABASE_URL"),
        "bot_token": os.environ.get("BOT_API_TOKEN"),
        "openai_key": os.environ.get("OPENAI_API_KEY"),
    }

@pytest.fixture
def sample_course_yaml():
    """Пример YAML курса для тестов"""
    return """
test_course:
  path: test_course.yml
  element: null

Element_1:
  type: message
  text: "Добро пожаловать!"
  button: "Продолжить"

Element_2:
  type: quiz
  question: "Тестовый вопрос?"
  options:
    - "Вариант 1"
    - "Вариант 2"
  correct: 0

Element_3:
  type: end
"""

@pytest.fixture
def mock_db_connection():
    """Мок подключения к БД"""
    with patch('db.get_connection') as mock_conn:
        mock_cursor = Mock()
        mock_conn.return_value.cursor.return_value = mock_cursor
        mock_conn.return_value.commit = Mock()
        mock_conn.return_value.close = Mock()
        yield mock_conn, mock_cursor

@pytest.fixture(autouse=True)
def reset_globals():
    """Сброс глобальных переменных перед каждым тестом"""
    import globals
    original_bot_name = getattr(globals, 'BOT_NAME', None)
    original_bot_folder = getattr(globals, 'BOT_FOLDER', None)
    
    yield
    
    # Восстанавливаем после теста
    if original_bot_name:
        globals.BOT_NAME = original_bot_name
    if original_bot_folder:
        globals.BOT_FOLDER = original_bot_folder
```

### Утилиты для тестов

```python
# tests/utils/db_helpers.py
import psycopg2
from psycopg2.extras import RealDictCursor

def create_test_db(db_url: str):
    """Создание тестовой БД"""
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Создаем схему
    cursor.execute(open('tests/fixtures/database/schema.sql').read())
    
    cursor.close()
    conn.close()

def cleanup_test_db(db_url: str):
    """Очистка тестовой БД"""
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Удаляем все данные
    tables = ['conversation', 'run', 'waiting_element', 'course', 'course_element']
    for table in tables:
        cursor.execute(f"TRUNCATE TABLE {table} CASCADE")
    
    cursor.close()
    conn.close()

def insert_test_run(db_url: str, course_id: str, chat_id: int, username: str):
    """Вставка тестового run"""
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO run (course_id, chat_id, username, botname) VALUES (%s, %s, %s, %s) RETURNING run_id",
        (course_id, chat_id, username, "test_bot")
    )
    run_id = cursor.fetchone()[0]
    conn.commit()
    cursor.close()
    conn.close()
    return run_id
```

```python
# tests/utils/bot_helpers.py
from aiogram.types import Message, User, Chat
from datetime import datetime

def create_test_message(text: str, chat_id: int = 12345, username: str = "test_user"):
    """Создание тестового сообщения"""
    return Message(
        message_id=1,
        date=datetime.now(),
        chat=Chat(id=chat_id, type="private"),
        from_user=User(id=chat_id, is_bot=False, username=username, first_name="Test"),
        text=text
    )

def create_test_callback_query(data: str, chat_id: int = 12345):
    """Создание тестового callback query"""
    from aiogram.types import CallbackQuery, Message, User, Chat
    
    return CallbackQuery(
        id="test_callback_id",
        from_user=User(id=chat_id, is_bot=False, username="test_user"),
        chat_instance="test_instance",
        message=Message(
            message_id=1,
            date=datetime.now(),
            chat=Chat(id=chat_id, type="private"),
            from_user=User(id=1, is_bot=True, first_name="Bot")
        ),
        data=data
    )
```

---

## CI/CD интеграция

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.12'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-test.txt
    
    - name: Run unit tests
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        BOT_API_TOKEN: ${{ secrets.TEST_BOT_TOKEN }}
        OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_KEY }}
      run: |
        pytest tests/unit -v --cov=. --cov-report=xml
    
    - name: Run integration tests
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        TEST_DATABASE_URL: postgresql://test:test@localhost:5432/test_db
        BOT_API_TOKEN: ${{ secrets.TEST_BOT_TOKEN }}
        OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_KEY }}
      run: |
        pytest tests/integration -v
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

variables:
  POSTGRES_DB: test_db
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test

test:
  stage: test
  image: python:3.12
  services:
    - postgres:15
  before_script:
    - pip install -r requirements.txt
    - pip install -r requirements-test.txt
  script:
    - pytest tests/unit -v --cov=. --cov-report=term
    - pytest tests/integration -v
  coverage: '/TOTAL.*\s+(\d+%)$/'
```

---

## План внедрения

### Этап 1: Базовая инфраструктура (1-2 недели)

1. **Настройка окружения**:
   - Установка pytest и зависимостей
   - Создание структуры директорий тестов
   - Настройка pytest.ini и conftest.py

2. **Создание базовых моков**:
   - Мок Telegram Bot API
   - Мок OpenAI API
   - Мок Eleven Labs API

3. **Первые тесты**:
   - Тесты для простых элементов (Message, Audio)
   - Тесты для базовых функций db.py

**Результат**: Работающая инфраструктура тестирования с первыми тестами

### Этап 2: Покрытие основных компонентов (2-3 недели)

1. **Тесты элементов**:
   - Все типы элементов (Quiz, Input, Dialog, etc.)
   - Граничные случаи и ошибки

2. **Тесты класса Course**:
   - Инициализация курсов
   - Навигация по элементам
   - Обработка ошибок

3. **Тесты функций БД**:
   - CRUD операции
   - Сложные запросы

**Результат**: Покрытие основных компонентов юнит-тестами

### Этап 3: Интеграционное тестирование (2 недели)

1. **Тесты потоков**:
   - Полное прохождение курса
   - Интеграция с БД
   - Интеграция с внешними API

2. **Тесты планировщика**:
   - Отложенные элементы
   - Автоматическая блокировка

**Результат**: Интеграционные тесты для ключевых потоков

### Этап 4: E2E тестирование (2-3 недели)

1. **Тесты команд бота**:
   - /start, /create, /edit, /copy
   - Обработка различных типов сообщений

2. **Тесты пользовательских сценариев**:
   - Регистрация и начало курса
   - Прохождение различных типов элементов
   - Завершение курса

**Результат**: E2E тесты для основных пользовательских сценариев

### Этап 5: CI/CD и оптимизация (1 неделя)

1. **Настройка CI/CD**:
   - GitHub Actions / GitLab CI
   - Автоматический запуск тестов
   - Отчеты о покрытии

2. **Оптимизация**:
   - Параллельный запуск тестов
   - Кэширование зависимостей
   - Улучшение производительности

**Результат**: Полностью автоматизированный процесс тестирования

---

## Метрики и отчетность

### Метрики покрытия кода

**Целевые показатели**:
- Юнит-тесты: **80%+ покрытие**
- Интеграционные тесты: **60%+ покрытие**
- Критичные компоненты: **90%+ покрытие**

**Компоненты с высоким приоритетом**:
- `course.py` — логика курсов
- `elements/` — все типы элементов
- `db.py` — функции работы с БД
- `main.py` — обработчики команд

### Отчеты

1. **HTML отчет о покрытии**:
   ```bash
   pytest --cov=. --cov-report=html
   # Открыть htmlcov/index.html
   ```

2. **Терминальный отчет**:
   ```bash
   pytest --cov=. --cov-report=term-missing
   ```

3. **XML отчет для CI/CD**:
   ```bash
   pytest --cov=. --cov-report=xml
   ```

### Мониторинг качества

- **Ежедневные запуски**: Автоматические тесты при каждом коммите
- **Еженедельные отчеты**: Анализ покрытия и трендов
- **Перед релизом**: Полный прогон всех тестов

---

## Рекомендации и best practices

### 1. Организация тестов

- ✅ Один тест = одна проверка
- ✅ Используйте описательные имена тестов
- ✅ Группируйте связанные тесты в классы
- ✅ Используйте фикстуры для переиспользования кода

### 2. Моки и стабы

- ✅ Мокируйте внешние зависимости (API, БД)
- ✅ Используйте реальную БД только для интеграционных тестов
- ✅ Не мокируйте код, который тестируете
- ✅ Проверяйте вызовы моков (assert_called, assert_called_with)

### 3. Тестовые данные

- ✅ Используйте фикстуры для тестовых данных
- ✅ Изолируйте тесты друг от друга
- ✅ Очищайте данные после тестов
- ✅ Используйте Faker для генерации данных

### 4. Производительность

- ✅ Быстрые тесты (< 1 сек) — юнит-тесты
- ✅ Медленные тесты — интеграционные и E2E
- ✅ Используйте маркеры для группировки тестов
- ✅ Запускайте быстрые тесты чаще

### 5. Поддержка тестов

- ✅ Обновляйте тесты при изменении кода
- ✅ Удаляйте устаревшие тесты
- ✅ Рефакторите тесты для читаемости
- ✅ Документируйте сложные тесты

---

## Заключение

Предложенная стратегия автоматизации тестирования обеспечивает:

1. **Надежность**: Автоматическое обнаружение ошибок
2. **Качество**: Высокое покрытие кода тестами
3. **Скорость**: Быстрая обратная связь при разработке
4. **Документация**: Тесты как живая документация
5. **Уверенность**: Безопасный рефакторинг и изменения

Внедрение тестирования должно быть постепенным, начиная с критичных компонентов и расширяясь на всю систему. Приоритет следует отдавать тестам, которые дают наибольшую ценность при минимальных затратах.

---

## Дополнительные ресурсы

- [Документация pytest](https://docs.pytest.org/)
- [Документация pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Документация aiogram](https://docs.aiogram.dev/)
- [Testing Best Practices](https://docs.python-guide.org/writing/tests/)

---

*Документ создан: 2024*
*Версия: 1.0*
