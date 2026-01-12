# Требования: Переиспользование модуля chat.py в веб-версии

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Проектирование  
**Приоритет:** Высокий

---

## 1. Проблема

В настоящее время код работы с AI-моделями дублируется в двух местах:

1. **Telegram версия** использует модуль `chat.py` в корне проекта с полной функциональностью:
   - Поддержка OpenAI Completions API и Responses API
   - Поддержка Proxy API (через `proxyapi.ru`)
   - Поддержка reasoning моделей (`o1`, `gpt-5`) с параметром `reasoning`
   - Поддержка стандартных моделей с параметром `temperature`
   - Конфигурация через `config.yaml` и переменные окружения
   - Логирование использования токенов

2. **Веб-версия** использует упрощенный `webapp/backend/app/services/llm_service.py`:
   - Только базовый OpenAI API
   - Только параметр `temperature` (без поддержки reasoning моделей)
   - Прямой вызов без поддержки proxy
   - Отсутствие логирования использования токенов

**Последствия дублирования:**
- Необходимость поддерживать две реализации
- Риск расхождения функциональности между версиями
- Отсутствие в веб-версии поддержки reasoning моделей и proxy API
- Сложность синхронизации изменений между версиями

---

## 2. Цели

### 2.1 Основная цель
Переиспользовать модуль `chat.py` из Telegram версии в веб-версии для устранения дублирования кода и обеспечения единообразия работы с AI.

### 2.2 Конкретные цели
1. **Устранение дублирования:** Веб-версия должна использовать тот же модуль `chat.py`, что и Telegram версия
2. **Расширение функциональности:** Веб-версия должна получить поддержку всех возможностей `chat.py`:
   - Reasoning модели (`o1`, `gpt-5`)
   - Proxy API
   - Логирование использования токенов
   - Гибкая конфигурация через `config.yaml`
3. **Совместимость:** Изменения не должны нарушить работу Telegram версии
4. **Простота поддержки:** Все изменения в логике работы с AI должны вноситься в одно место

---

## 3. Текущая архитектура

### 3.1 Telegram версия

**Модуль:** `chat.py` (корень проекта)

**Основные функции:**
- `async def get_reply(conversation, new_prompt, params)` - основная функция для получения ответа от AI
- `async def get_reply_impl(conversation, params)` - внутренняя реализация
- `async def get_reply_sys(conversation, sys_prompt, params)` - для системных промптов

**Зависимости:**
- `globals.CONFIG_FILE` - путь к файлу конфигурации
- `config.yaml` - файл конфигурации с настройками OpenAI
- Переменные окружения: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `CURRENT_ENVIRONMENT`

**Использование в Dialog элементе:**
```python
# elements/dialog.py
import chat

reply, conversation = await chat.get_reply(conversation, message_text, self.params)
```

### 3.2 Веб-версия

**Модуль:** `webapp/backend/app/services/llm_service.py`

**Текущая реализация:**
```python
def generate_chat_response(
    messages: list[dict],
    model: str = "gpt-4",
    temperature: float = 0.7
) -> str:
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature
    )
    return response.choices[0].message.content
```

**Использование:**
```python
# webapp/backend/app/services/chat_service.py
from app.services.llm_service import generate_chat_response

assistant_response = generate_chat_response(messages, model, temperature)
```

---

## 4. Требования к реализации

### 4.1 Общие требования

1. **Обратная совместимость:** Изменения не должны нарушить работу Telegram версии
2. **Минимальные изменения:** Изменения должны быть минимальными и локализованными
3. **Конфигурация:** Веб-версия должна иметь возможность использовать `config.yaml` или переменные окружения
4. **Async/Sync совместимость:** Веб-версия может использовать синхронные вызовы, но `chat.py` - async, требуется обертка

### 4.2 Технические требования

#### 4.2.1 Изменения в `webapp/backend/app/services/llm_service.py`

**Требуется:**
1. Добавить импорт модуля `chat.py` из корня проекта
2. Инициализировать `globals.CONFIG_FILE` для работы `chat.py`
3. Создать обертку для преобразования async функции в sync
4. Обновить функцию `generate_chat_response()` для использования `chat.get_reply()`
5. Поддержать все параметры из `chat.py`: `model`, `temperature`, `reasoning`

**Интерфейс функции должен остаться совместимым:**
```python
def generate_chat_response(
    messages: list[dict],
    model: str = "gpt-4",
    temperature: float = 0.7,
    reasoning: str = None  # Новый параметр для reasoning моделей
) -> str:
    """Генерация ответа от LLM через общий chat.py модуль"""
```

#### 4.2.2 Инициализация globals

**Требуется:**
1. Перед импортом `chat.py` инициализировать `globals.CONFIG_FILE`
2. Поддержать два варианта:
   - Использование `config.yaml` из корня проекта (если доступен)
   - Использование переменных окружения (если `config.yaml` недоступен)
3. Обеспечить корректную работу в Docker-окружении

**Пример инициализации:**
```python
import sys
import os
from pathlib import Path

# Добавляем корень проекта в путь
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Инициализируем globals
import globals
if not hasattr(globals, 'CONFIG_FILE') or not globals.CONFIG_FILE:
    config_dir = os.getenv('CONFIG_DIR', '')
    globals.CONFIG_FILE = config_dir + 'config.yaml'
```

#### 4.2.3 Async/Sync обертка

**Требуется:**
1. Создать функцию-обертку для вызова async `chat.get_reply()` из sync контекста
2. Использовать `asyncio.new_event_loop()` для создания нового event loop
3. Обеспечить корректное закрытие event loop после использования
4. Обработать ошибки и исключения

**Пример реализации:**
```python
import asyncio

def _call_async_chat(conversation, new_prompt, params):
    """Обертка для вызова async chat.get_reply из sync контекста"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        reply, updated_conversation = loop.run_until_complete(
            chat.get_reply(conversation, new_prompt, params)
        )
        return reply, updated_conversation
    finally:
        loop.close()
```

#### 4.2.4 Обработка параметров

**Требуется:**
1. Извлекать system prompt из `messages` если он присутствует
2. Извлекать последнее user сообщение как `new_prompt`
3. Формировать `conversation` без последнего user сообщения
4. Формировать `params` словарь с правильными параметрами:
   - `model` - всегда передается
   - `temperature` - только для не-reasoning моделей
   - `reasoning` - только для reasoning моделей (`o1`, `gpt-5`)

**Логика определения типа модели:**
```python
def _prepare_params(model, temperature, reasoning):
    """Подготовка параметров для chat.get_reply"""
    params = {"model": model}
    
    # Reasoning модели используют параметр reasoning вместо temperature
    if model.startswith("o") or model == "gpt-5":
        if reasoning:
            params["reasoning"] = reasoning
        else:
            params["reasoning"] = "low"  # Значение по умолчанию
    else:
        # Стандартные модели используют temperature
        params["temperature"] = temperature if temperature is not None else 0.0
    
    return params
```

#### 4.2.5 Обработка conversation

**Требуется:**
1. Если `messages` содержит system prompt, он должен быть в `conversation`
2. Последнее user сообщение должно быть извлечено как `new_prompt`
3. Остальные сообщения должны остаться в `conversation`

**Пример обработки:**
```python
def _prepare_conversation_and_prompt(messages):
    """Подготовка conversation и new_prompt из messages"""
    conversation = messages.copy()
    new_prompt = ""
    
    # Если последнее сообщение - user, извлекаем его
    if conversation and conversation[-1]["role"] == "user":
        new_prompt = conversation[-1]["content"]
        conversation = conversation[:-1]
    
    return conversation, new_prompt
```

### 4.3 Обновление chat_service.py

**Требуется:**
1. Обновить вызов `generate_chat_response()` для передачи параметра `reasoning` (если доступен)
2. Извлечь `reasoning` из конфигурации шага (если присутствует)

**Пример:**
```python
# webapp/backend/app/services/chat_service.py
reasoning = content.get("reasoning")  # Новый параметр
assistant_response = generate_chat_response(
    messages, 
    model, 
    temperature, 
    reasoning=reasoning  # Передаем reasoning если есть
)
```

### 4.4 Конфигурация

#### 4.4.1 Переменные окружения

**Требуется поддержка следующих переменных:**
- `OPENAI_API_KEY` - ключ API OpenAI (обязательно)
- `ELEVENLABS_API_KEY` - ключ API Eleven Labs (опционально, для голосовых функций)
- `CURRENT_ENVIRONMENT` - окружение (`heroku` или другое)
- `CONFIG_DIR` - директория с `config.yaml` (опционально)

#### 4.4.2 config.yaml

**Если `config.yaml` доступен, он должен содержать:**
```yaml
openai:
  api_key: ${OPENAI_API_KEY}  # Может быть переопределено через env
  proxy: "https://api.proxyapi.ru/openai/v1"  # Опционально
  api: "completions"  # или "responses"
  model: "gpt-5"  # Модель по умолчанию
  temperature: 0.0  # Температура по умолчанию
  reasoning: "low"  # Reasoning effort по умолчанию
  log: true  # Логирование использования токенов
```

---

## 5. Детальная реализация

### 5.1 Обновленный llm_service.py

```python
"""Сервис для работы с LLM через общий модуль chat.py"""
import sys
import os
import asyncio
from pathlib import Path
from typing import Optional

# Добавляем корень проекта в путь для импорта chat.py
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Инициализируем globals перед импортом chat
import globals
if not hasattr(globals, 'CONFIG_FILE') or not globals.CONFIG_FILE:
    config_dir = os.getenv('CONFIG_DIR', '')
    globals.CONFIG_FILE = config_dir + 'config.yaml'

# Импортируем chat после настройки globals
import chat

def _prepare_conversation_and_prompt(messages: list[dict]) -> tuple[list[dict], str]:
    """
    Подготовка conversation и new_prompt из messages.
    
    Args:
        messages: Список сообщений с ролями (system, user, assistant)
    
    Returns:
        tuple: (conversation, new_prompt)
    """
    conversation = messages.copy()
    new_prompt = ""
    
    # Если последнее сообщение - user, извлекаем его
    if conversation and conversation[-1]["role"] == "user":
        new_prompt = conversation[-1]["content"]
        conversation = conversation[:-1]
    
    return conversation, new_prompt

def _prepare_params(
    model: str, 
    temperature: Optional[float] = None, 
    reasoning: Optional[str] = None
) -> dict:
    """
    Подготовка параметров для chat.get_reply.
    
    Args:
        model: Идентификатор модели
        temperature: Температура для стандартных моделей
        reasoning: Reasoning effort для reasoning моделей
    
    Returns:
        dict: Параметры для chat.get_reply
    """
    params = {"model": model}
    
    # Reasoning модели используют параметр reasoning вместо temperature
    if model.startswith("o") or model == "gpt-5":
        if reasoning:
            params["reasoning"] = reasoning
        else:
            params["reasoning"] = "low"  # Значение по умолчанию
    else:
        # Стандартные модели используют temperature
        params["temperature"] = temperature if temperature is not None else 0.0
    
    return params

def _call_async_chat(conversation: list[dict], new_prompt: str, params: dict) -> tuple[str, list[dict]]:
    """
    Обертка для вызова async chat.get_reply из sync контекста.
    
    Args:
        conversation: История разговора
        new_prompt: Новое сообщение пользователя
        params: Параметры модели
    
    Returns:
        tuple: (reply, updated_conversation)
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        reply, updated_conversation = loop.run_until_complete(
            chat.get_reply(conversation, new_prompt, params)
        )
        return reply, updated_conversation
    finally:
        loop.close()

def generate_chat_response(
    messages: list[dict],
    model: str = "gpt-4",
    temperature: float = 0.7,
    reasoning: Optional[str] = None
) -> str:
    """
    Генерация ответа от LLM через общий chat.py модуль.
    
    Эта функция использует общий модуль chat.py из Telegram версии,
    обеспечивая единообразие работы с AI во всех версиях приложения.
    
    Args:
        messages: Список сообщений с ролями (system, user, assistant)
        model: Идентификатор модели (например, "gpt-4", "gpt-5", "o1")
        temperature: Температура для стандартных моделей (0.0-1.0)
        reasoning: Reasoning effort для reasoning моделей ("low", "medium", "high")
    
    Returns:
        str: Ответ от AI модели
    
    Raises:
        Exception: При ошибке генерации ответа
    
    Example:
        >>> messages = [
        ...     {"role": "system", "content": "You are a helpful assistant."},
        ...     {"role": "user", "content": "Hello!"}
        ... ]
        >>> response = generate_chat_response(messages, model="gpt-4", temperature=0.7)
        >>> print(response)
        "Hello! How can I help you today?"
    """
    try:
        # Подготовка conversation и new_prompt
        conversation, new_prompt = _prepare_conversation_and_prompt(messages)
        
        # Подготовка параметров
        params = _prepare_params(model, temperature, reasoning)
        
        # Вызов async функции через обертку
        reply, updated_conversation = _call_async_chat(conversation, new_prompt, params)
        
        return reply
    except Exception as e:
        raise Exception(f"Ошибка генерации ответа: {str(e)}")
```

### 5.2 Обновленный chat_service.py

```python
# webapp/backend/app/services/chat_service.py
# ... existing code ...

def send_message_to_llm(
    db: Session,
    session_id: str,
    user_message_content: str
) -> ChatMessage:
    """Отправка сообщения в LLM и получение ответа"""
    # ... existing code до генерации ответа ...
    
    content = step.content
    system_prompt = content.get("system_prompt", "")
    model = content.get("model", "gpt-4")
    temperature = content.get("temperature", 0.7)
    reasoning = content.get("reasoning")  # Новый параметр
    
    # ... existing code для получения истории сообщений ...
    
    # Формирование сообщений для LLM
    messages = [{"role": "system", "content": system_prompt}]
    for msg in messages_history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message_content})
    
    # Генерация ответа с поддержкой reasoning
    assistant_response = generate_chat_response(
        messages, 
        model, 
        temperature, 
        reasoning=reasoning  # Передаем reasoning если есть
    )
    
    # ... existing code для сохранения ответа ...
```

---

## 6. Тестирование

### 6.1 Тесты для llm_service.py

**Требуется протестировать:**

1. **Базовое использование:**
   - Генерация ответа с стандартной моделью (gpt-4)
   - Передача temperature
   - Корректная обработка conversation

2. **Reasoning модели:**
   - Генерация ответа с reasoning моделью (o1, gpt-5)
   - Передача параметра reasoning
   - Значение по умолчанию для reasoning если не указано

3. **Обработка conversation:**
   - Корректное извлечение system prompt
   - Корректное извлечение последнего user сообщения
   - Сохранение истории разговора

4. **Обработка ошибок:**
   - Обработка ошибок API
   - Обработка некорректных параметров
   - Обработка отсутствия API ключа

5. **Конфигурация:**
   - Использование config.yaml если доступен
   - Использование переменных окружения если config.yaml недоступен
   - Корректная инициализация globals.CONFIG_FILE

### 6.2 Интеграционные тесты

**Требуется протестировать:**

1. **Интеграция с chat_service.py:**
   - Создание сессии чата
   - Отправка сообщения
   - Получение ответа от AI
   - Сохранение истории в БД

2. **Совместимость с существующими курсами:**
   - Работа с курсами без reasoning параметра
   - Работа с курсами с reasoning параметром
   - Работа с различными моделями

---

## 7. Миграция

### 7.1 План миграции

1. **Этап 1: Подготовка**
   - Создать резервную копию текущего `llm_service.py`
   - Убедиться, что `config.yaml` доступен или настроены переменные окружения

2. **Этап 2: Реализация**
   - Реализовать новый `llm_service.py` согласно требованиям
   - Обновить `chat_service.py` для поддержки reasoning
   - Добавить тесты

3. **Этап 3: Тестирование**
   - Запустить unit тесты
   - Запустить интеграционные тесты
   - Протестировать на тестовых курсах

4. **Этап 4: Развертывание**
   - Развернуть на staging окружении
   - Мониторинг ошибок
   - Развертывание на production

### 7.2 Откат

**В случае проблем:**
- Восстановить старую версию `llm_service.py` из резервной копии
- Проверить, что Telegram версия не затронута

---

## 8. Дополнительные замечания

### 8.1 Производительность

- **Event loop:** Создание нового event loop для каждого вызова может быть неоптимальным. Рассмотреть использование пула event loops или перехода на async в веб-версии в будущем.

### 8.2 Безопасность

- **API ключи:** Убедиться, что API ключи не попадают в логи
- **Валидация:** Добавить валидацию входных параметров

### 8.3 Мониторинг

- **Логирование:** Использовать логирование из `chat.py` для отслеживания использования токенов
- **Метрики:** Добавить метрики времени ответа и ошибок

### 8.4 Будущие улучшения

- **Async веб-версия:** Рассмотреть переход веб-версии на async для лучшей производительности
- **Кэширование:** Добавить кэширование ответов для одинаковых запросов
- **Streaming:** Добавить поддержку streaming ответов для лучшего UX

---

## 9. Критерии приемки

✅ **Критерии приемки:**

1. ✅ Веб-версия использует `chat.py` вместо собственной реализации
2. ✅ Веб-версия поддерживает reasoning модели (`o1`, `gpt-5`)
3. ✅ Веб-версия поддерживает proxy API через `config.yaml`
4. ✅ Telegram версия продолжает работать без изменений
5. ✅ Существующие курсы работают без изменений
6. ✅ Новые курсы с reasoning моделями работают корректно
7. ✅ Логирование использования токенов работает в веб-версии
8. ✅ Обработка ошибок корректна
9. ✅ Тесты проходят успешно
10. ✅ Документация обновлена

---

## 10. Связанные документы

- `docs/dialog_element.md` - Документация по Dialog элементу
- `docs/reqs/webversion_prd.md` - PRD веб-версии
- `chat.py` - Модуль работы с AI (Telegram версия)
- `webapp/backend/app/services/llm_service.py` - Текущая реализация веб-версии
- `webapp/backend/app/services/chat_service.py` - Сервис работы с чатом

---

## 11. История изменений

| Версия | Дата | Автор | Описание |
|--------|------|-------|----------|
| 1.0 | 2024 | - | Первоначальная версия требований |
