# Архитектура переиспользования кода между Telegram-ботом и веб-приложением

Документ описывает рекомендуемую архитектуру для максимального переиспользования кода между Telegram-ботом и веб-приложением, с акцентом на систему элементов курсов.

## Содержание

1. [Принципы архитектуры](#принципы-архитектуры)
2. [Предлагаемая структура проекта](#предлагаемая-структура-проекта)
3. [Слои архитектуры](#слои-архитектуры)
4. [Система элементов](#система-элементов)
5. [Адаптеры для интерфейсов](#адаптеры-для-интерфейсов)
6. [Примеры реализации](#примеры-реализации)
7. [Миграционный путь](#миграционный-путь)

---

## Принципы архитектуры

### 1. Разделение ответственности

**Три основных слоя:**

1. **Core (Ядро)** — бизнес-логика, независимая от интерфейса
   - Определение элементов и их поведения
   - Валидация данных
   - Обработка ответов пользователей
   - Логика навигации по курсу

2. **Adapters (Адаптеры)** — преобразование для конкретных интерфейсов
   - Telegram Adapter — отправка через Bot API
   - Web Adapter — преобразование в JSON/React компоненты
   - API Adapter — REST API endpoints

3. **Presentation (Представление)** — UI компоненты
   - React компоненты для веб-приложения
   - Telegram UI (встроенный в адаптер)

### 2. Единый источник истины

- Элементы определяются один раз в Core
- Поведение элементов контролируется из одного места
- Адаптеры только преобразуют данные, не изменяя логику

### 3. Расширяемость

- Легко добавлять новые типы элементов
- Легко добавлять новые интерфейсы (например, мобильное приложение)
- Минимальные изменения при добавлении функциональности

---

## Предлагаемая структура проекта

```
profochatbot/
├── core/                          # Общее ядро (Python)
│   ├── __init__.py
│   ├── elements/                 # Система элементов
│   │   ├── __init__.py
│   │   ├── base.py               # Базовый класс Element
│   │   ├── registry.py           # Регистр элементов
│   │   ├── message.py            # Элемент Message
│   │   ├── dialog.py             # Элемент Dialog
│   │   ├── quiz.py               # Элемент Quiz
│   │   ├── input.py              # Элемент Input
│   │   └── ...                   # Другие элементы
│   ├── course/                   # Логика курсов
│   │   ├── __init__.py
│   │   ├── course.py             # Класс Course
│   │   ├── loader.py             # Загрузка курсов
│   │   └── navigator.py          # Навигация по курсу
│   ├── database/                 # Работа с БД
│   │   ├── __init__.py
│   │   ├── repository.py         # Репозиторий для элементов
│   │   ├── models.py             # Модели данных
│   │   └── migrations/          # Миграции
│   ├── services/                 # Сервисы
│   │   ├── __init__.py
│   │   ├── llm_service.py        # Интеграция с LLM
│   │   ├── storage_service.py    # Хранение данных
│   │   └── progress_service.py  # Отслеживание прогресса
│   └── utils/                    # Утилиты
│       ├── __init__.py
│       ├── parsers.py            # Парсинг YAML, интервалов
│       └── validators.py         # Валидация данных
│
├── adapters/                      # Адаптеры для интерфейсов
│   ├── __init__.py
│   ├── telegram/                 # Telegram адаптер
│   │   ├── __init__.py
│   │   ├── bot.py                # Инициализация бота
│   │   ├── handlers.py           # Обработчики команд
│   │   ├── renderers/             # Рендереры элементов
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # Базовый рендерер
│   │   │   ├── message.py        # Рендерер Message
│   │   │   ├── dialog.py         # Рендерер Dialog
│   │   │   └── ...               # Другие рендереры
│   │   └── middleware.py          # Middleware для бота
│   ├── web/                      # Web адаптер
│   │   ├── __init__.py
│   │   ├── serializers/          # Сериализаторы элементов
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # Базовый сериализатор
│   │   │   ├── message.py        # Сериализатор Message
│   │   │   └── ...               # Другие сериализаторы
│   │   └── api/                  # API endpoints
│   │       ├── __init__.py
│   │       ├── courses.py        # Endpoints для курсов
│   │       └── elements.py       # Endpoints для элементов
│   └── common/                   # Общие адаптеры
│       ├── __init__.py
│       └── validators.py         # Валидация для всех интерфейсов
│
├── telegram_bot/                 # Telegram бот (точка входа)
│   ├── __init__.py
│   ├── main.py                   # Запуск бота
│   └── config.py                 # Конфигурация бота
│
├── webapp/                        # Веб-приложение
│   ├── backend/                  # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py           # FastAPI app
│   │   │   └── routes/           # Маршруты (используют адаптеры)
│   │   └── ...
│   └── frontend/                  # Next.js frontend
│       ├── components/
│       │   └── elements/         # React компоненты элементов
│       │       ├── Message.tsx
│       │       ├── Dialog.tsx
│       │       └── ...
│       └── ...
│
└── scripts/                       # YAML файлы курсов
    └── {bot_folder}/
        ├── courses.yml
        └── *.yml
```

---

## Слои архитектуры

### Слой 1: Core (Ядро)

**Назначение:** Содержит всю бизнес-логику, независимую от интерфейса.

**Компоненты:**

#### 1.1 Элементы (`core/elements/`)

**Базовый класс элемента:**

```python
# core/elements/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ElementData:
    """Данные элемента из YAML/БД"""
    element_id: str
    element_type: str
    course_id: str
    data: Dict[str, Any]

class Element(ABC):
    """Базовый класс для всех элементов курса"""
    
    def __init__(self, element_data: ElementData):
        self.element_id = element_data.element_id
        self.course_id = element_data.course_id
        self.type = element_data.element_type
        self.data = element_data.data
        self.element_data = element_data.data.get("element_data", {})
        
        # Контекст выполнения
        self.chat_id: Optional[int] = None
        self.username: Optional[str] = None
        self.run_id: Optional[int] = None
        self.conversation_id: Optional[int] = None
    
    def set_context(self, chat_id: int, username: str, run_id: int):
        """Установка контекста выполнения"""
        self.chat_id = chat_id
        self.username = username
        self.run_id = run_id
    
    @abstractmethod
    def validate(self) -> bool:
        """Валидация данных элемента"""
        pass
    
    @abstractmethod
    def process_response(self, response: Any) -> Dict[str, Any]:
        """Обработка ответа пользователя
        
        Returns:
            Dict с результатами обработки:
            - feedback: str - сообщение для пользователя
            - correct: Optional[bool] - правильность ответа
            - score: Optional[float] - набранные баллы
            - maxscore: Optional[float] - максимальные баллы
            - next_action: Optional[str] - следующее действие
        """
        pass
    
    def get_metadata(self) -> Dict[str, Any]:
        """Метаданные элемента для адаптеров"""
        return {
            "element_id": self.element_id,
            "element_type": self.type,
            "course_id": self.course_id,
            "wait_for_callback": self.should_wait_for_callback(),
        }
    
    def should_wait_for_callback(self) -> bool:
        """Должен ли элемент ждать ответа пользователя"""
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование элемента в словарь для сериализации"""
        return {
            "element_id": self.element_id,
            "element_type": self.type,
            "course_id": self.course_id,
            "data": self.element_data,
            "metadata": self.get_metadata(),
        }
```

**Пример конкретного элемента:**

```python
# core/elements/message.py
from .base import Element
from typing import Dict, Any

class Message(Element):
    """Элемент сообщения"""
    
    def __init__(self, element_data):
        super().__init__(element_data)
        self.text = self.element_data.get("text", "")
        self.button = self.element_data.get("button")
        self.media = self.element_data.get("media", [])
        self.parse_mode = self.element_data.get("parse_mode", "MARKDOWN")
        self.link_preview = self.element_data.get("link_preview", True)
    
    def validate(self) -> bool:
        """Валидация данных"""
        if not self.text:
            return False
        return True
    
    def should_wait_for_callback(self) -> bool:
        """Ждет ответа только если есть кнопка"""
        return bool(self.button)
    
    def process_response(self, response: Any) -> Dict[str, Any]:
        """Обработка ответа (для кнопки)"""
        if not self.button:
            return {"next_action": "continue"}
        
        # Если есть кнопка, ответ - это нажатие на кнопку
        return {
            "feedback": None,
            "next_action": "continue",
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование для сериализации"""
        result = super().to_dict()
        result["data"].update({
            "text": self.text,
            "button": self.button,
            "media": self.media,
            "parse_mode": self.parse_mode,
            "link_preview": self.link_preview,
        })
        return result
```

#### 1.2 Регистр элементов (`core/elements/registry.py`)

```python
# core/elements/registry.py
from typing import Dict, Type
from .base import Element

class ElementRegistry:
    """Регистр всех типов элементов"""
    
    _elements: Dict[str, Type[Element]] = {}
    
    @classmethod
    def register(cls, element_type: str, element_class: Type[Element]):
        """Регистрация типа элемента"""
        cls._elements[element_type] = element_class
    
    @classmethod
    def create(cls, element_data) -> Element:
        """Создание элемента по данным"""
        element_type = element_data.data.get("element_data", {}).get("type")
        if element_type not in cls._elements:
            raise ValueError(f"Unknown element type: {element_type}")
        
        element_class = cls._elements[element_type]
        return element_class(element_data)
    
    @classmethod
    def get_types(cls) -> list[str]:
        """Получение списка зарегистрированных типов"""
        return list(cls._elements.keys())

# Регистрация элементов
from .message import Message
from .dialog import Dialog
from .quiz import Quiz
# ... другие элементы

ElementRegistry.register("message", Message)
ElementRegistry.register("dialog", Dialog)
ElementRegistry.register("quiz", Quiz)
# ...
```

#### 1.3 Сервисы (`core/services/`)

**LLM Service:**

```python
# core/services/llm_service.py
from typing import List, Dict, Optional
from abc import ABC, abstractmethod

class LLMProvider(ABC):
    """Абстракция для провайдера LLM"""
    
    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: Optional[float] = None,
        reasoning: Optional[str] = None,
    ) -> str:
        pass

class OpenAIProvider(LLMProvider):
    """Провайдер OpenAI"""
    
    async def generate_response(self, messages, model, temperature=None, reasoning=None):
        # Реализация через OpenAI API
        pass

class LLMService:
    """Сервис для работы с LLM"""
    
    def __init__(self, provider: LLMProvider):
        self.provider = provider
    
    async def get_reply(
        self,
        conversation: List[Dict[str, str]],
        prompt: str,
        model: str = "gpt-4",
        temperature: Optional[float] = None,
        reasoning: Optional[str] = None,
    ) -> str:
        """Получение ответа от LLM"""
        messages = conversation + [{"role": "user", "content": prompt}]
        return await self.provider.generate_response(
            messages, model, temperature, reasoning
        )
```

### Слой 2: Adapters (Адаптеры)

**Назначение:** Преобразование элементов Core для конкретных интерфейсов.

#### 2.1 Telegram Adapter (`adapters/telegram/`)

**Базовый рендерер:**

```python
# adapters/telegram/renderers/base.py
from abc import ABC, abstractmethod
from aiogram import Bot
from core.elements.base import Element

class TelegramRenderer(ABC):
    """Базовый класс для рендеринга элементов в Telegram"""
    
    @abstractmethod
    async def render(self, element: Element, bot: Bot, chat_id: int):
        """Рендеринг элемента в Telegram"""
        pass
    
    async def save_to_db(self, element: Element, role: str, report: str):
        """Сохранение элемента в БД"""
        from core.database.repository import ElementRepository
        repo = ElementRepository()
        await repo.save_element(
            element.chat_id,
            element.course_id,
            element.element_id,
            element.type,
            element.run_id,
            element.to_dict(),
            role,
            report,
        )
```

**Рендерер Message:**

```python
# adapters/telegram/renderers/message.py
from aiogram import Bot
from aiogram.types import InlineKeyboardBuilder, InlineKeyboardButton
from aiogram.enums import ParseMode
from core.elements.message import Message
from .base import TelegramRenderer

class MessageRenderer(TelegramRenderer):
    """Рендерер для элемента Message в Telegram"""
    
    async def render(self, element: Message, bot: Bot, chat_id: int):
        """Отправка сообщения в Telegram"""
        parse_mode = ParseMode.HTML if element.parse_mode == "HTML" else ParseMode.MARKDOWN
        
        # Отправка медиа
        if element.media:
            await self._send_media(bot, chat_id, element.media)
        
        # Отправка текста с кнопкой
        markup = None
        if element.button:
            builder = InlineKeyboardBuilder()
            builder.add(InlineKeyboardButton(
                text=element.button,
                callback_data="got_it"
            ))
            markup = builder.as_markup()
        
        await bot.send_message(
            chat_id,
            element.text,
            parse_mode=parse_mode,
            reply_markup=markup,
            link_preview_options=LinkPreviewOptions(
                is_disabled=not element.link_preview
            )
        )
        
        # Сохранение в БД
        await self.save_to_db(element, "bot", element.text)
    
    async def _send_media(self, bot: Bot, chat_id: int, media: list):
        """Отправка медиафайлов"""
        # Реализация отправки медиа
        pass
```

**Регистр рендереров:**

```python
# adapters/telegram/renderers/__init__.py
from typing import Dict, Type
from .base import TelegramRenderer
from .message import MessageRenderer
from .dialog import DialogRenderer
# ... другие рендереры

class TelegramRendererRegistry:
    """Регистр рендереров для Telegram"""
    
    _renderers: Dict[str, Type[TelegramRenderer]] = {}
    
    @classmethod
    def register(cls, element_type: str, renderer_class: Type[TelegramRenderer]):
        """Регистрация рендерера"""
        cls._renderers[element_type] = renderer_class
    
    @classmethod
    def get_renderer(cls, element_type: str) -> TelegramRenderer:
        """Получение рендерера для типа элемента"""
        if element_type not in cls._renderers:
            raise ValueError(f"No renderer for element type: {element_type}")
        return cls._renderers[element_type]()

# Регистрация
TelegramRendererRegistry.register("message", MessageRenderer)
TelegramRendererRegistry.register("dialog", DialogRenderer)
# ...
```

#### 2.2 Web Adapter (`adapters/web/`)

**Базовый сериализатор:**

```python
# adapters/web/serializers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any
from core.elements.base import Element

class WebSerializer(ABC):
    """Базовый класс для сериализации элементов для веб-приложения"""
    
    @abstractmethod
    def serialize(self, element: Element) -> Dict[str, Any]:
        """Сериализация элемента в формат для веб-приложения"""
        pass
    
    def get_react_component_name(self) -> str:
        """Имя React компонента для этого элемента"""
        return self.__class__.__name__.replace("Serializer", "View")

class MessageSerializer(WebSerializer):
    """Сериализатор для элемента Message"""
    
    def serialize(self, element: Message) -> Dict[str, Any]:
        """Преобразование в JSON для веб-приложения"""
        return {
            "element_id": element.element_id,
            "element_type": element.type,
            "course_id": element.course_id,
            "text": element.text,
            "button": element.button,
            "media": element.media,
            "parse_mode": element.parse_mode,
            "link_preview": element.link_preview,
            "wait_for_callback": element.should_wait_for_callback(),
            "react_component": "MessageView",  # Имя React компонента
        }
```

**API Endpoints:**

```python
# adapters/web/api/elements.py
from fastapi import APIRouter, HTTPException
from core.elements.registry import ElementRegistry
from core.course.course import Course
from adapters.web.serializers import WebSerializerRegistry

router = APIRouter()

@router.get("/courses/{course_id}/current")
async def get_current_element(course_id: str, chat_id: int):
    """Получение текущего элемента для веб-приложения"""
    # Получение элемента через Core
    element = Course.get_current_element(chat_id)
    
    if not element:
        raise HTTPException(status_code=404, detail="No current element")
    
    # Сериализация через Web Adapter
    serializer = WebSerializerRegistry.get_serializer(element.type)
    return serializer.serialize(element)
```

### Слой 3: Presentation (Представление)

**React компоненты для веб-приложения:**

```typescript
// webapp/frontend/components/elements/Message.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MessageElement {
  element_id: string;
  element_type: 'message';
  text: string;
  button?: string;
  media?: string[];
  parse_mode?: 'HTML' | 'MARKDOWN';
  link_preview?: boolean;
  wait_for_callback: boolean;
}

interface MessageProps {
  element: MessageElement;
  onButtonClick?: () => void;
}

export function MessageView({ element, onButtonClick }: MessageProps) {
  const renderContent = () => {
    if (element.parse_mode === 'HTML') {
      // HTML рендеринг
      return <div dangerouslySetInnerHTML={{ __html: element.text }} />;
    } else {
      // Markdown рендеринг
      return <ReactMarkdown>{element.text}</ReactMarkdown>;
    }
  };

  return (
    <div className="message-element">
      {element.media && (
        <div className="media">
          {element.media.map((url, idx) => (
            <img key={idx} src={url} alt={`Media ${idx}`} />
          ))}
        </div>
      )}
      <div className="content">{renderContent()}</div>
      {element.button && (
        <button onClick={onButtonClick}>{element.button}</button>
      )}
    </div>
  );
}
```

---

## Система элементов

### Добавление нового элемента

**Шаг 1: Определение в Core**

```python
# core/elements/new_element.py
from .base import Element

class NewElement(Element):
    """Новый тип элемента"""
    
    def __init__(self, element_data):
        super().__init__(element_data)
        # Инициализация специфичных полей
    
    def validate(self) -> bool:
        # Валидация данных
        pass
    
    def process_response(self, response: Any) -> Dict[str, Any]:
        # Обработка ответа пользователя
        pass
```

**Шаг 2: Регистрация в Core**

```python
# core/elements/__init__.py
from .new_element import NewElement
from .registry import ElementRegistry

ElementRegistry.register("new_element", NewElement)
```

**Шаг 3: Telegram рендерер**

```python
# adapters/telegram/renderers/new_element.py
from .base import TelegramRenderer
from core.elements.new_element import NewElement

class NewElementRenderer(TelegramRenderer):
    async def render(self, element: NewElement, bot: Bot, chat_id: int):
        # Реализация отправки в Telegram
        pass
```

**Шаг 4: Web сериализатор**

```python
# adapters/web/serializers/new_element.py
from .base import WebSerializer
from core.elements.new_element import NewElement

class NewElementSerializer(WebSerializer):
    def serialize(self, element: NewElement) -> Dict[str, Any]:
        # Сериализация для веб-приложения
        return {
            "element_id": element.element_id,
            "element_type": element.type,
            # ... специфичные поля
            "react_component": "NewElementView",
        }
```

**Шаг 5: React компонент**

```typescript
// webapp/frontend/components/elements/NewElement.tsx
export function NewElementView({ element }: { element: NewElementType }) {
  // Реализация UI компонента
}
```

**Шаг 6: Регистрация адаптеров**

```python
# adapters/telegram/renderers/__init__.py
TelegramRendererRegistry.register("new_element", NewElementRenderer)

# adapters/web/serializers/__init__.py
WebSerializerRegistry.register("new_element", NewElementSerializer)
```

### Контроль поведения элементов

**Единая точка контроля:**

```python
# core/elements/base.py
class Element(ABC):
    def get_behavior_config(self) -> Dict[str, Any]:
        """Конфигурация поведения элемента
        
        Может быть переопределена в конкретных элементах
        для настройки поведения в разных интерфейсах
        """
        return {
            "telegram": {
                "supports_voice": False,
                "supports_media": True,
                "max_message_length": 4096,
            },
            "web": {
                "supports_voice": True,
                "supports_media": True,
                "max_message_length": None,  # Нет ограничений
            },
        }
```

**Использование в адаптерах:**

```python
# adapters/telegram/renderers/base.py
class TelegramRenderer(ABC):
    async def render(self, element: Element, bot: Bot, chat_id: int):
        config = element.get_behavior_config()["telegram"]
        
        if config.get("supports_voice") and element.has_voice():
            await self._send_voice(bot, chat_id, element)
        
        # ...
```

---

## Примеры реализации

### Пример 1: Элемент Dialog

**Core:**

```python
# core/elements/dialog.py
from .base import Element
from core.services.llm_service import LLMService

class Dialog(Element):
    def __init__(self, element_data):
        super().__init__(element_data)
        self.text = self.element_data.get("text", "")
        self.prompt = self.element_data.get("prompt", "")
        self.model = self.element_data.get("model", "gpt-4")
        self.temperature = self.element_data.get("temperature")
        self.reasoning = self.element_data.get("reasoning")
        self.voice_response = self.element_data.get("voice_response", False)
    
    def process_response(self, user_message: str) -> Dict[str, Any]:
        """Обработка сообщения пользователя"""
        # Получение истории диалога
        history = self._get_conversation_history()
        
        # Генерация ответа через LLM Service
        llm_service = LLMService(self._get_llm_provider())
        response = await llm_service.get_reply(
            history,
            user_message,
            self.model,
            self.temperature,
            self.reasoning,
        )
        
        return {
            "feedback": response,
            "next_action": "continue" if self._is_stop_signal(response) else "wait",
        }
```

**Telegram рендерер:**

```python
# adapters/telegram/renderers/dialog.py
class DialogRenderer(TelegramRenderer):
    async def render(self, element: Dialog, bot: Bot, chat_id: int):
        # Отправка начального сообщения
        await bot.send_message(chat_id, element.text)
        
        # Если auto_start, отправка первого сообщения от бота
        if element.auto_start:
            await self._send_auto_start_message(element, bot, chat_id)
    
    async def process_user_message(self, element: Dialog, bot: Bot, message: str):
        """Обработка сообщения пользователя"""
        result = element.process_response(message)
        
        # Отправка ответа
        if element.voice_response:
            await self._send_voice_response(bot, element.chat_id, result["feedback"])
        else:
            await bot.send_message(element.chat_id, result["feedback"])
```

**Web сериализатор:**

```python
# adapters/web/serializers/dialog.py
class DialogSerializer(WebSerializer):
    def serialize(self, element: Dialog) -> Dict[str, Any]:
        return {
            "element_id": element.element_id,
            "element_type": element.type,
            "text": element.text,
            "prompt": element.prompt,
            "model": element.model,
            "temperature": element.temperature,
            "reasoning": element.reasoning,
            "voice_response": element.voice_response,
            "react_component": "DialogView",
        }
```

**React компонент:**

```typescript
// webapp/frontend/components/elements/Dialog.tsx
export function DialogView({ element }: { element: DialogElement }) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSendMessage = async (content: string) => {
    // Отправка через API
    const response = await dialogApi.sendMessage(
      element.course_id,
      element.element_id,
      content
    );
    setMessages([...messages, { role: 'user', content }, response]);
  };
  
  return (
    <div className="dialog-element">
      <div className="initial-text">{element.text}</div>
      <ChatMessages messages={messages} />
      <MessageInput onSend={handleSendMessage} />
    </div>
  );
}
```

---

## Автоматизация тестирования

### Стратегия тестирования

**Пирамида тестов:**

```
                    ┌─────────────┐
                    │   E2E Tests │  (10%) - Полные сценарии через UI
                    └─────────────┘
              ┌─────────────────────┐
              │ Integration Tests   │  (20%) - Взаимодействие компонентов
              └─────────────────────┘
        ┌───────────────────────────────┐
        │      Unit Tests (Core)        │  (70%) - Бизнес-логика элементов
        └───────────────────────────────┘
```

**Принципы:**

1. **Большинство тестов в Core** — быстрые, изолированные unit-тесты
2. **Интеграционные тесты для адаптеров** — проверка преобразования данных
3. **Минимум E2E тестов** — только критичные пользовательские сценарии
4. **Автоматическая проверка новых элементов** — шаблоны и генераторы тестов

### Структура тестов

```
tests/
├── unit/                          # Unit-тесты
│   ├── core/
│   │   ├── elements/             # Тесты элементов
│   │   │   ├── test_message.py
│   │   │   ├── test_dialog.py
│   │   │   ├── test_quiz.py
│   │   │   └── test_element_base.py
│   │   ├── course/                # Тесты курсов
│   │   └── services/              # Тесты сервисов
│   └── fixtures/                  # Фикстуры для тестов
│       ├── elements.py           # Тестовые данные элементов
│       └── courses.py            # Тестовые курсы
│
├── integration/                   # Интеграционные тесты
│   ├── adapters/
│   │   ├── telegram/             # Тесты Telegram адаптера
│   │   │   ├── test_renderers.py
│   │   │   └── test_handlers.py
│   │   └── web/                  # Тесты Web адаптера
│   │       ├── test_serializers.py
│   │       └── test_api.py
│   └── database/                 # Тесты работы с БД
│       └── test_repository.py
│
├── e2e/                          # E2E тесты
│   ├── telegram/                 # Тесты Telegram бота
│   │   └── test_course_flow.py
│   └── web/                      # Тесты веб-приложения
│       └── test_course_flow.py
│
├── generators/                    # Генераторы тестов
│   ├── element_test_generator.py # Автогенерация тестов для элементов
│   └── fixture_generator.py      # Генерация фикстур
│
└── conftest.py                   # Общие фикстуры pytest
```

### Unit-тесты для Core элементов

**Базовый тест для элемента:**

```python
# tests/unit/core/elements/test_element_base.py
import pytest
from core.elements.base import Element, ElementData
from core.elements.message import Message

@pytest.fixture
def sample_element_data():
    """Фикстура для тестовых данных элемента"""
    return ElementData(
        element_id="test_message_01",
        element_type="message",
        course_id="test_course",
        data={
            "element_data": {
                "type": "message",
                "text": "Test message",
                "button": "Continue"
            }
        }
    )

class TestElementBase:
    """Базовые тесты для всех элементов"""
    
    def test_element_initialization(self, sample_element_data):
        """Тест инициализации элемента"""
        element = Message(sample_element_data)
        
        assert element.element_id == "test_message_01"
        assert element.type == "message"
        assert element.course_id == "test_course"
    
    def test_element_context(self, sample_element_data):
        """Тест установки контекста"""
        element = Message(sample_element_data)
        element.set_context(chat_id=12345, username="test_user", run_id=1)
        
        assert element.chat_id == 12345
        assert element.username == "test_user"
        assert element.run_id == 1
    
    def test_element_to_dict(self, sample_element_data):
        """Тест преобразования в словарь"""
        element = Message(sample_element_data)
        element_dict = element.to_dict()
        
        assert element_dict["element_id"] == "test_message_01"
        assert element_dict["element_type"] == "message"
        assert "data" in element_dict
        assert "metadata" in element_dict
```

**Тест конкретного элемента:**

```python
# tests/unit/core/elements/test_message.py
import pytest
from core.elements.message import Message
from tests.unit.fixtures.elements import message_element_data

class TestMessageElement:
    """Тесты для элемента Message"""
    
    def test_message_validation(self, message_element_data):
        """Тест валидации Message элемента"""
        element = Message(message_element_data)
        assert element.validate() is True
    
    def test_message_without_text_fails_validation(self):
        """Тест валидации Message без текста"""
        data = ElementData(
            element_id="test",
            element_type="message",
            course_id="test",
            data={"element_data": {"type": "message"}}
        )
        element = Message(data)
        assert element.validate() is False
    
    def test_message_wait_for_callback(self, message_element_data):
        """Тест определения необходимости ожидания ответа"""
        # С кнопкой - ждет ответа
        data_with_button = message_element_data
        data_with_button.data["element_data"]["button"] = "Continue"
        element = Message(data_with_button)
        assert element.should_wait_for_callback() is True
        
        # Без кнопки - не ждет
        data_without_button = message_element_data
        data_without_button.data["element_data"].pop("button", None)
        element = Message(data_without_button)
        assert element.should_wait_for_callback() is False
    
    def test_message_process_response(self, message_element_data):
        """Тест обработки ответа пользователя"""
        element = Message(message_element_data)
        result = element.process_response("button_click")
        
        assert result["next_action"] == "continue"
        assert result["feedback"] is None
```

**Тест элемента с бизнес-логикой:**

```python
# tests/unit/core/elements/test_quiz.py
import pytest
from core.elements.quiz import Quiz
from tests.unit.fixtures.elements import quiz_element_data

class TestQuizElement:
    """Тесты для элемента Quiz"""
    
    def test_quiz_process_correct_answer(self, quiz_element_data):
        """Тест обработки правильного ответа"""
        element = Quiz(quiz_element_data)
        result = element.process_response(1)  # Правильный ответ
        
        assert result["correct"] is True
        assert result["score"] == 1
        assert result["maxscore"] == 1
        assert "feedback" in result
    
    def test_quiz_process_incorrect_answer(self, quiz_element_data):
        """Тест обработки неправильного ответа"""
        element = Quiz(quiz_element_data)
        result = element.process_response(0)  # Неправильный ответ
        
        assert result["correct"] is False
        assert result["score"] == 0
        assert result["maxscore"] == 1
        assert "feedback" in result
    
    def test_quiz_validation(self, quiz_element_data):
        """Тест валидации Quiz элемента"""
        element = Quiz(quiz_element_data)
        assert element.validate() is True
        
        # Проверка обязательных полей
        invalid_data = quiz_element_data
        invalid_data.data["element_data"].pop("answers", None)
        element = Quiz(invalid_data)
        assert element.validate() is False
```

**Тест элемента Dialog с мокированием LLM:**

```python
# tests/unit/core/elements/test_dialog.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from core.elements.dialog import Dialog
from core.services.llm_service import LLMService
from tests.unit.fixtures.elements import dialog_element_data

class TestDialogElement:
    """Тесты для элемента Dialog"""
    
    @pytest.fixture
    def mock_llm_service(self):
        """Мок LLM сервиса"""
        service = MagicMock(spec=LLMService)
        service.get_reply = AsyncMock(return_value="AI response")
        return service
    
    @pytest.mark.asyncio
    async def test_dialog_process_user_message(self, dialog_element_data, mock_llm_service):
        """Тест обработки сообщения пользователя в диалоге"""
        element = Dialog(dialog_element_data)
        element._llm_service = mock_llm_service
        
        result = await element.process_response("User message")
        
        assert result["feedback"] == "AI response"
        assert "next_action" in result
        mock_llm_service.get_reply.assert_called_once()
    
    def test_dialog_stop_signal_detection(self, dialog_element_data):
        """Тест определения сигнала остановки диалога"""
        element = Dialog(dialog_element_data)
        
        assert element._is_stop_signal("{STOP}") is True
        assert element._is_stop_signal("#конецдиалога") is True
        assert element._is_stop_signal("Normal message") is False
```

### Интеграционные тесты для адаптеров

**Тест Telegram рендерера:**

```python
# tests/integration/adapters/telegram/test_renderers.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from aiogram import Bot
from core.elements.message import Message
from adapters.telegram.renderers.message import MessageRenderer
from tests.unit.fixtures.elements import message_element_data

class TestMessageRenderer:
    """Интеграционные тесты для MessageRenderer"""
    
    @pytest.fixture
    def mock_bot(self):
        """Мок Telegram бота"""
        bot = MagicMock(spec=Bot)
        bot.send_message = AsyncMock()
        bot.send_media_group = AsyncMock()
        return bot
    
    @pytest.fixture
    def message_element(self, message_element_data):
        """Создание элемента Message"""
        element = Message(message_element_data)
        element.set_context(chat_id=12345, username="test", run_id=1)
        return element
    
    @pytest.mark.asyncio
    async def test_render_message_with_button(self, mock_bot, message_element):
        """Тест рендеринга сообщения с кнопкой"""
        renderer = MessageRenderer()
        
        await renderer.render(message_element, mock_bot, 12345)
        
        # Проверка вызова send_message
        mock_bot.send_message.assert_called_once()
        call_args = mock_bot.send_message.call_args
        
        assert call_args.kwargs["chat_id"] == 12345
        assert call_args.kwargs["text"] == message_element.text
        assert call_args.kwargs["reply_markup"] is not None
    
    @pytest.mark.asyncio
    async def test_render_message_without_button(self, mock_bot, message_element):
        """Тест рендеринга сообщения без кнопки"""
        message_element.button = None
        renderer = MessageRenderer()
        
        await renderer.render(message_element, mock_bot, 12345)
        
        call_args = mock_bot.send_message.call_args
        assert call_args.kwargs["reply_markup"] is None
```

**Тест Web сериализатора:**

```python
# tests/integration/adapters/web/test_serializers.py
import pytest
from core.elements.message import Message
from adapters.web.serializers.message import MessageSerializer
from tests.unit.fixtures.elements import message_element_data

class TestMessageSerializer:
    """Тесты для MessageSerializer"""
    
    def test_serialize_message(self, message_element_data):
        """Тест сериализации Message элемента"""
        element = Message(message_element_data)
        serializer = MessageSerializer()
        
        result = serializer.serialize(element)
        
        assert result["element_id"] == element.element_id
        assert result["element_type"] == "message"
        assert result["text"] == element.text
        assert result["button"] == element.button
        assert result["react_component"] == "MessageView"
        assert "wait_for_callback" in result
    
    def test_serialize_message_with_media(self, message_element_data):
        """Тест сериализации Message с медиа"""
        message_element_data.data["element_data"]["media"] = [
            "https://example.com/image.jpg"
        ]
        element = Message(message_element_data)
        serializer = MessageSerializer()
        
        result = serializer.serialize(element)
        
        assert "media" in result
        assert len(result["media"]) == 1
```

### E2E тесты

**Тест полного потока курса:**

```python
# tests/e2e/telegram/test_course_flow.py
import pytest
from aiogram import Bot
from core.course.course import Course
from adapters.telegram.renderers import TelegramRendererRegistry

class TestCourseFlow:
    """E2E тесты для полного потока прохождения курса"""
    
    @pytest.fixture
    def test_course(self):
        """Создание тестового курса"""
        return Course("test_course")
    
    @pytest.mark.asyncio
    async def test_complete_course_flow(self, test_course, mock_bot):
        """Тест полного прохождения курса"""
        # Начало курса
        element = test_course.get_first_element()
        element.set_context(chat_id=12345, username="test", run_id=1)
        
        # Отправка первого элемента
        renderer = TelegramRendererRegistry.get_renderer(element.type)
        await renderer.render(element, mock_bot, 12345)
        
        # Обработка ответа пользователя
        result = element.process_response("response")
        
        # Переход к следующему элементу
        next_element = test_course.get_next_element(12345)
        assert next_element is not None
        
        # Проверка сохранения в БД
        from core.database.repository import ElementRepository
        repo = ElementRepository()
        saved = await repo.get_element(12345, element.element_id)
        assert saved is not None
```

### Автоматизация проверки новых элементов

**Генератор тестов для новых элементов:**

```python
# tests/generators/element_test_generator.py
"""
Автоматическая генерация базовых тестов для нового элемента
"""
import os
from pathlib import Path

class ElementTestGenerator:
    """Генератор тестов для элементов"""
    
    TEMPLATE = '''"""
Автоматически сгенерированные тесты для элемента {element_type}
Добавьте специфичные тесты для вашего элемента
"""
import pytest
from core.elements.{element_type_lower} import {element_type}
from tests.unit.fixtures.elements import {element_type_lower}_element_data

class Test{element_type}Element:
    """Тесты для элемента {element_type}"""
    
    def test_{element_type_lower}_initialization(self, {element_type_lower}_element_data):
        """Тест инициализации элемента"""
        element = {element_type}({element_type_lower}_element_data)
        
        assert element.element_id is not None
        assert element.type == "{element_type_lower}"
        assert element.course_id is not None
    
    def test_{element_type_lower}_validation(self, {element_type_lower}_element_data):
        """Тест валидации элемента"""
        element = {element_type}({element_type_lower}_element_data)
        # TODO: Добавьте специфичную валидацию
        assert element.validate() is True
    
    def test_{element_type_lower}_to_dict(self, {element_type_lower}_element_data):
        """Тест преобразования в словарь"""
        element = {element_type}({element_type_lower}_element_data)
        element_dict = element.to_dict()
        
        assert element_dict["element_id"] == element.element_id
        assert element_dict["element_type"] == element.type
        assert "data" in element_dict
        assert "metadata" in element_dict
    
    # TODO: Добавьте специфичные тесты для вашего элемента
    # def test_{element_type_lower}_specific_behavior(self, {element_type_lower}_element_data):
    #     """Тест специфичного поведения"""
    #     pass
'''
    
    @classmethod
    def generate_test_file(cls, element_type: str):
        """Генерация файла с тестами для элемента"""
        element_type_lower = element_type.lower()
        
        content = cls.TEMPLATE.format(
            element_type=element_type,
            element_type_lower=element_type_lower
        )
        
        test_file = Path(f"tests/unit/core/elements/test_{element_type_lower}.py")
        test_file.parent.mkdir(parents=True, exist_ok=True)
        
        if test_file.exists():
            print(f"⚠️  Файл {test_file} уже существует, пропускаем генерацию")
            return
        
        test_file.write_text(content)
        print(f"✅ Создан файл тестов: {test_file}")
    
    @classmethod
    def generate_fixture(cls, element_type: str, element_data: dict):
        """Генерация фикстуры для элемента"""
        element_type_lower = element_type.lower()
        
        fixture_code = f'''
@pytest.fixture
def {element_type_lower}_element_data():
    """Фикстура для тестовых данных элемента {element_type}"""
    return ElementData(
        element_id="test_{element_type_lower}_01",
        element_type="{element_type_lower}",
        course_id="test_course",
        data={element_data}
    )
'''
        
        fixtures_file = Path("tests/unit/fixtures/elements.py")
        fixtures_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(fixtures_file, "a") as f:
            f.write(fixture_code)
        
        print(f"✅ Добавлена фикстура для {element_type}")
```

**CLI инструмент для генерации тестов:**

```python
# scripts/generate_element_tests.py
#!/usr/bin/env python3
"""
CLI инструмент для генерации тестов при создании нового элемента
"""
import sys
from tests.generators.element_test_generator import ElementTestGenerator

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_element_tests.py <ElementType>")
        print("Example: python scripts/generate_element_tests.py NewElement")
        sys.exit(1)
    
    element_type = sys.argv[1]
    
    print(f"🔧 Генерация тестов для элемента {element_type}...")
    
    # Генерация тестов
    ElementTestGenerator.generate_test_file(element_type)
    
    # Генерация фикстуры (требует данных элемента)
    print(f"⚠️  Не забудьте добавить фикстуру в tests/unit/fixtures/elements.py")
    print(f"⚠️  Не забудьте создать рендерер в adapters/telegram/renderers/")
    print(f"⚠️  Не забудьте создать сериализатор в adapters/web/serializers/")
    print(f"✅ Готово! Запустите тесты: pytest tests/unit/core/elements/test_{element_type.lower()}.py")

if __name__ == "__main__":
    main()
```

**Автоматическая проверка всех элементов:**

```python
# tests/test_all_elements.py
"""
Автоматическая проверка всех зарегистрированных элементов
"""
import pytest
from core.elements.registry import ElementRegistry
from tests.unit.fixtures.elements import get_element_fixtures

class TestAllElements:
    """Автоматические тесты для всех элементов"""
    
    @pytest.mark.parametrize("element_type", ElementRegistry.get_types())
    def test_element_registration(self, element_type):
        """Проверка регистрации всех элементов"""
        assert element_type in ElementRegistry.get_types()
    
    @pytest.mark.parametrize("element_type", ElementRegistry.get_types())
    def test_element_creation(self, element_type):
        """Проверка создания всех элементов"""
        fixture_data = get_element_fixtures().get(element_type)
        if not fixture_data:
            pytest.skip(f"No fixture for {element_type}")
        
        element = ElementRegistry.create(fixture_data)
        assert element is not None
        assert element.type == element_type
    
    @pytest.mark.parametrize("element_type", ElementRegistry.get_types())
    def test_element_validation(self, element_type):
        """Проверка валидации всех элементов"""
        fixture_data = get_element_fixtures().get(element_type)
        if not fixture_data:
            pytest.skip(f"No fixture for {element_type}")
        
        element = ElementRegistry.create(fixture_data)
        assert element.validate() is True
    
    @pytest.mark.parametrize("element_type", ElementRegistry.get_types())
    def test_element_serialization(self, element_type):
        """Проверка сериализации всех элементов"""
        fixture_data = get_element_fixtures().get(element_type)
        if not fixture_data:
            pytest.skip(f"No fixture for {element_type}")
        
        element = ElementRegistry.create(fixture_data)
        element_dict = element.to_dict()
        
        assert "element_id" in element_dict
        assert "element_type" in element_dict
        assert "data" in element_dict
        assert "metadata" in element_dict
```

### CI/CD интеграция

**GitHub Actions workflow:**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
      
      - name: Run unit tests
        run: |
          pytest tests/unit/ -v --cov=core --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: profochatbot_test
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
          pip install -r requirements.txt
          pip install pytest pytest-asyncio
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/profochatbot_test
        run: |
          pytest tests/integration/ -v
  
  element-regression-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio
      
      - name: Run element regression tests
        run: |
          pytest tests/test_all_elements.py -v
```

**Pre-commit hook для проверки:**

```python
# scripts/pre-commit-checks.py
#!/usr/bin/env python3
"""
Pre-commit проверки для новых элементов
"""
import sys
import subprocess
from pathlib import Path

def check_new_element():
    """Проверка наличия тестов для нового элемента"""
    # Получаем измененные файлы
    result = subprocess.run(
        ["git", "diff", "--cached", "--name-only"],
        capture_output=True,
        text=True
    )
    
    changed_files = result.stdout.strip().split("\n")
    
    # Проверяем новые элементы
    new_elements = []
    for file in changed_files:
        if file.startswith("core/elements/") and file.endswith(".py"):
            element_name = Path(file).stem
            if element_name not in ["__init__", "base", "registry"]:
                new_elements.append(element_name)
    
    # Проверяем наличие тестов
    missing_tests = []
    for element in new_elements:
        test_file = Path(f"tests/unit/core/elements/test_{element}.py")
        if not test_file.exists():
            missing_tests.append(element)
    
    if missing_tests:
        print("❌ Обнаружены новые элементы без тестов:")
        for element in missing_tests:
            print(f"   - {element}")
        print("\n💡 Запустите: python scripts/generate_element_tests.py <ElementType>")
        return False
    
    return True

def run_tests():
    """Запуск быстрых тестов"""
    print("🧪 Запуск unit-тестов...")
    result = subprocess.run(["pytest", "tests/unit/", "-v", "--tb=short"])
    return result.returncode == 0

if __name__ == "__main__":
    if not check_new_element():
        sys.exit(1)
    
    if not run_tests():
        print("❌ Тесты не прошли!")
        sys.exit(1)
    
    print("✅ Все проверки пройдены!")
```

### Инструменты и конфигурация

**pytest.ini:**

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function

markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests

# Coverage
addopts = 
    --strict-markers
    --cov=core
    --cov=adapters
    --cov-report=term-missing
    --cov-report=html
    --cov-report=xml
```

**conftest.py:**

```python
# tests/conftest.py
import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock

# Общие фикстуры
@pytest.fixture
def mock_bot():
    """Мок Telegram бота"""
    bot = MagicMock()
    bot.send_message = AsyncMock()
    bot.send_photo = AsyncMock()
    bot.send_video = AsyncMock()
    bot.send_audio = AsyncMock()
    bot.send_poll = AsyncMock()
    return bot

@pytest.fixture
def mock_llm_service():
    """Мок LLM сервиса"""
    service = MagicMock()
    service.get_reply = AsyncMock(return_value="Mocked AI response")
    return service

@pytest.fixture
def mock_db_repository():
    """Мок репозитория БД"""
    repo = MagicMock()
    repo.save_element = AsyncMock(return_value=1)
    repo.get_element = AsyncMock(return_value=None)
    return repo

# Настройка asyncio
@pytest.fixture(scope="session")
def event_loop():
    """Создание event loop для asyncio тестов"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

### Workflow для разработчика

**При создании нового элемента:**

1. **Создание элемента в Core:**
   ```bash
   # Создать файл core/elements/new_element.py
   # Реализовать класс NewElement
   ```

2. **Генерация тестов:**
   ```bash
   python scripts/generate_element_tests.py NewElement
   ```

3. **Добавление фикстуры:**
   ```bash
   # Добавить фикстуру в tests/unit/fixtures/elements.py
   ```

4. **Написание специфичных тестов:**
   ```bash
   # Дополнить сгенерированные тесты в tests/unit/core/elements/test_new_element.py
   ```

5. **Создание адаптеров:**
   ```bash
   # Создать Telegram рендерер
   # Создать Web сериализатор
   ```

6. **Запуск тестов:**
   ```bash
   # Unit-тесты
   pytest tests/unit/core/elements/test_new_element.py -v
   
   # Все тесты элемента
   pytest tests/unit/core/elements/test_new_element.py tests/integration/adapters/ -v
   
   # Регрессионные тесты
   pytest tests/test_all_elements.py -v
   ```

7. **Проверка перед коммитом:**
   ```bash
   python scripts/pre-commit-checks.py
   ```

### Метрики и отчеты

**Покрытие кода:**

```bash
# Генерация отчета о покрытии
pytest --cov=core --cov=adapters --cov-report=html

# Открыть отчет
open htmlcov/index.html
```

**Статистика тестов:**

```bash
# Показать статистику тестов
pytest --collect-only | grep "test session"

# Показать медленные тесты
pytest --durations=10
```

### Преимущества автоматизации тестирования

1. **Быстрая обратная связь:**
   - Тесты запускаются автоматически при каждом коммите
   - Проблемы обнаруживаются до merge в основную ветку

2. **Уверенность в изменениях:**
   - Рефакторинг безопасен благодаря тестам
   - Новые функции проверяются автоматически

3. **Документация через тесты:**
   - Тесты показывают, как использовать элементы
   - Примеры использования в тестах

4. **Масштабируемость:**
   - Легко добавлять новые элементы
   - Автоматическая проверка всех элементов
   - Регрессионные тесты предотвращают поломки

5. **Экономия времени:**
   - Не нужно вручную тестировать каждый элемент
   - Автоматическая проверка через CI/CD
   - Фокус на разработке, а не на ручном тестировании

---

## Миграционный путь

### Фаза 1: Подготовка (1-2 недели)

1. **Создание структуры Core:**
   - Создать папку `core/`
   - Выделить базовый класс `Element`
   - Создать регистр элементов

2. **Выделение бизнес-логики:**
   - Перенести логику элементов из `elements/` в `core/elements/`
   - Убрать зависимости от aiogram из Core
   - Создать абстракции для внешних сервисов

3. **Настройка тестирования:**
   - Создать структуру папок `tests/`
   - Настроить pytest и зависимости
   - Создать базовые фикстуры в `conftest.py`
   - Настроить CI/CD pipeline для автоматического запуска тестов

### Фаза 2: Создание адаптеров (2-3 недели)

1. **Telegram адаптер:**
   - Создать `adapters/telegram/`
   - Реализовать рендереры для существующих элементов
   - Обновить `main.py` для использования адаптеров

2. **Web адаптер:**
   - Создать `adapters/web/`
   - Реализовать сериализаторы для элементов
   - Обновить API endpoints

### Фаза 3: Миграция элементов (3-4 недели)

1. **Постепенная миграция:**
   - Мигрировать элементы по одному
   - Начать с простых (Message, Audio)
   - Затем сложные (Dialog, Quiz)

2. **Тестирование каждого элемента:**
   - Для каждого элемента:
     - Сгенерировать базовые тесты через `generate_element_tests.py`
     - Написать unit-тесты для бизнес-логики
     - Написать интеграционные тесты для адаптеров
     - Убедиться в прохождении всех тестов
   - Запускать регрессионные тесты после каждого элемента
   - Проверка работы в Telegram и веб-приложении
   - Убедиться в консистентности поведения

### Фаза 4: Рефакторинг и оптимизация (2-3 недели)

1. **Улучшение архитектуры:**
   - Оптимизация адаптеров
   - Добавление кэширования
   - Улучшение обработки ошибок

2. **Расширение тестового покрытия:**
   - Добавление E2E тестов для критичных сценариев
   - Улучшение покрытия кода до >80%
   - Настройка автоматических проверок перед коммитом
   - Создание тестовых сценариев для всех типов элементов

3. **Документация:**
   - Обновление документации
   - Создание гайдов для добавления элементов
   - Примеры использования
   - Документация по тестированию

### Преимущества постепенной миграции

- Минимальный риск для production
- Возможность тестирования на каждом этапе
- Постепенное обучение команды новой архитектуре
- Возможность отката при проблемах

---

## Преимущества предлагаемой архитектуры

### 1. Переиспользование кода

- **Единая бизнес-логика** в Core
- **Минимальное дублирование** между интерфейсами
- **Легкое добавление** новых интерфейсов

### 2. Контроль поведения

- **Единая точка контроля** поведения элементов
- **Консистентность** между интерфейсами
- **Легкая настройка** поведения для разных интерфейсов

### 3. Расширяемость

- **Простое добавление** новых элементов
- **Легкое добавление** новых интерфейсов
- **Гибкая архитектура** для будущих изменений

### 4. Тестируемость

- **Изоляция** бизнес-логики от интерфейсов
- **Легкое мокирование** адаптеров
- **Unit-тесты** для Core без зависимостей
- **Автоматическая генерация** базовых тестов для новых элементов
- **Регрессионные тесты** для всех элементов
- **CI/CD интеграция** для автоматической проверки
- **Минимальная необходимость** ручного тестирования через UI

### 5. Поддерживаемость

- **Четкое разделение** ответственности
- **Понятная структура** проекта
- **Легкий рефакторинг** отдельных компонентов

---

## Заключение

Предлагаемая архитектура обеспечивает:

1. **Максимальное переиспользование кода** между Telegram-ботом и веб-приложением
2. **Единую точку контроля** поведения элементов
3. **Легкое добавление** новых элементов и интерфейсов
4. **Консистентность** поведения между платформами
5. **Автоматизированное тестирование** с минимальной необходимостью ручного тестирования через UI
6. **Хорошую тестируемость** и поддерживаемость

Архитектура построена на принципах:
- **Разделения ответственности** (Core, Adapters, Presentation)
- **Единого источника истины** (бизнес-логика в Core)
- **Расширяемости** (легкое добавление новых компонентов)
- **Тестируемости** (автоматизация проверки на всех уровнях)

**Ключевые особенности тестирования:**
- Автоматическая генерация базовых тестов для новых элементов
- Пирамида тестов: 70% unit-тестов, 20% интеграционных, 10% E2E
- CI/CD интеграция для автоматической проверки при каждом коммите
- Регрессионные тесты для всех элементов
- Минимальная необходимость ручного тестирования через пользовательский интерфейс

Миграция может быть выполнена постепенно, что минимизирует риски и позволяет тестировать изменения на каждом этапе. Автоматизация тестирования обеспечивает быструю обратную связь и уверенность в корректности работы новых элементов без необходимости ручного тестирования через UI.
