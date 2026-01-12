# Плагинная архитектура для элементов

Документ описывает плагинную систему для добавления новых типов элементов в ProfoChatBot без изменения основного кода приложения.

## Содержание

1. [Обзор плагинной архитектуры](#обзор-плагинной-архитектуры)
2. [Структура плагина](#структура-плагина)
3. [API для создания плагинов](#api-для-создания-плагинов)
4. [Обнаружение и загрузка плагинов](#обнаружение-и-загрузка-плагинов)
5. [Управление плагинами](#управление-плагинами)
6. [Примеры плагинов](#примеры-плагинов)
7. [Безопасность плагинов](#безопасность-плагинов)
8. [Версионирование плагинов](#версионирование-плагинов)
9. [Тестирование плагинов](#тестирование-плагинов)
10. [Интеграция с существующей системой](#интеграция-с-существующей-системой)

---

## Обзор плагинной архитектуры

### Преимущества плагинной системы

1. **Расширяемость без изменения кода:**
   - Новые элементы добавляются как отдельные пакеты
   - Основной код остается неизменным
   - Легкое обновление и удаление элементов

2. **Изоляция:**
   - Плагины изолированы от основного кода
   - Ошибки в плагинах не ломают систему
   - Независимое тестирование плагинов

3. **Переиспользование:**
   - Плагины можно использовать в разных проектах
   - Распространение через репозитории (PyPI, GitHub)
   - Сообщество может создавать свои элементы

4. **Гибкость:**
   - Разные версии плагинов для разных окружений
   - Легкое включение/отключение плагинов
   - Кастомизация под конкретные нужды

### Архитектура плагинной системы

```
┌─────────────────────────────────────────────────────────┐
│              ProfoChatBot Core                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ElementRegistry                                │   │
│  │  - Обнаружение плагинов                        │   │
│  │  - Загрузка плагинов                           │   │
│  │  - Регистрация элементов                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Загрузка
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Plugin System                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Plugin 1   │  │   Plugin 2   │  │   Plugin 3   │  │
│  │  (video)    │  │  (drawing)   │  │  (code)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Регистрация
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Adapters (Telegram, Web)                        │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  Renderers   │  │ Serializers  │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## Структура плагина

### Минимальная структура плагина

```
profochatbot-plugin-video/
├── setup.py                 # Установка плагина
├── pyproject.toml          # Метаданные плагина
├── README.md               # Документация плагина
├── profochatbot_video/     # Основной пакет плагина
│   ├── __init__.py        # Точка входа плагина
│   ├── element.py         # Класс элемента
│   ├── telegram_renderer.py  # Telegram рендерер
│   ├── web_serializer.py  # Web сериализатор
│   └── react_component.tsx  # React компонент (опционально)
└── tests/                  # Тесты плагина
    └── test_element.py
```

### Метаданные плагина

**pyproject.toml:**

```toml
[project]
name = "profochatbot-plugin-video"
version = "1.0.0"
description = "Video element plugin for ProfoChatBot"
authors = [{name = "Your Name", email = "your@email.com"}]
license = {text = "MIT"}
requires-python = ">=3.12"
dependencies = [
    "profochatbot-core>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
]

[tool.profochatbot.plugin]
# Метаданные плагина для системы
element_type = "video"
display_name = "Video Element"
description = "Element for displaying video content"
version = "1.0.0"
min_core_version = "1.0.0"
max_core_version = "2.0.0"
author = "Your Name"
entry_point = "profochatbot_video:VideoPlugin"
```

**setup.py:**

```python
from setuptools import setup, find_packages

setup(
    name="profochatbot-plugin-video",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "profochatbot-core>=1.0.0",
    ],
    entry_points={
        "profochatbot.plugins": [
            "video = profochatbot_video:VideoPlugin",
        ],
    },
    python_requires=">=3.12",
)
```

---

## API для создания плагинов

### Базовый интерфейс плагина

```python
# core/plugins/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
from core.elements.base import Element

class Plugin(ABC):
    """Базовый класс для всех плагинов элементов"""
    
    @property
    @abstractmethod
    def plugin_info(self) -> Dict[str, Any]:
        """Метаданные плагина"""
        pass
    
    @property
    @abstractmethod
    def element_class(self) -> Type[Element]:
        """Класс элемента плагина"""
        pass
    
    @property
    @abstractmethod
    def element_type(self) -> str:
        """Тип элемента (например, 'video')"""
        pass
    
    def get_telegram_renderer(self):
        """Получить Telegram рендерер (опционально)"""
        return None
    
    def get_web_serializer(self):
        """Получить Web сериализатор (опционально)"""
        return None
    
    def get_react_component(self) -> Optional[str]:
        """Получить имя React компонента (опционально)"""
        return None
    
    def validate(self) -> bool:
        """Валидация плагина при загрузке"""
        return True
    
    def on_load(self):
        """Вызывается при загрузке плагина"""
        pass
    
    def on_unload(self):
        """Вызывается при выгрузке плагина"""
        pass
```

### Пример реализации плагина

```python
# profochatbot_video/__init__.py
from core.plugins.base import Plugin
from profochatbot_video.element import Video
from profochatbot_video.telegram_renderer import VideoRenderer
from profochatbot_video.web_serializer import VideoSerializer

class VideoPlugin(Plugin):
    """Плагин для элемента Video"""
    
    @property
    def plugin_info(self) -> Dict[str, Any]:
        return {
            "name": "profochatbot-plugin-video",
            "version": "1.0.0",
            "description": "Video element plugin",
            "author": "Your Name",
            "element_type": "video",
        }
    
    @property
    def element_class(self) -> Type[Element]:
        return Video
    
    @property
    def element_type(self) -> str:
        return "video"
    
    def get_telegram_renderer(self):
        return VideoRenderer
    
    def get_web_serializer(self):
        return VideoSerializer
    
    def get_react_component(self) -> Optional[str]:
        return "VideoView"
    
    def validate(self) -> bool:
        # Проверка зависимостей, версий и т.д.
        return True

# Экспорт плагина
__all__ = ["VideoPlugin"]
```

### Реализация элемента плагина

```python
# profochatbot_video/element.py
from core.elements.base import Element, ElementData
from typing import Dict, Any, Optional

class Video(Element):
    """Элемент для отображения видео"""
    
    def __init__(self, element_data: ElementData):
        super().__init__(element_data)
        self.video_url = self.element_data.get("video_url", "")
        self.title = self.element_data.get("title", "")
        self.description = self.element_data.get("description", "")
        self.autoplay = self.element_data.get("autoplay", False)
        self.loop = self.element_data.get("loop", False)
    
    def validate(self) -> bool:
        """Валидация данных элемента"""
        if not self.video_url:
            return False
        # Проверка формата URL
        if not (self.video_url.startswith("http://") or 
                self.video_url.startswith("https://")):
            return False
        return True
    
    def should_wait_for_callback(self) -> bool:
        """Video элемент не требует ответа пользователя"""
        return False
    
    def process_response(self, response: Any) -> Dict[str, Any]:
        """Обработка ответа (не требуется для video)"""
        return {"next_action": "continue"}
    
    def to_dict(self) -> Dict[str, Any]:
        """Преобразование для сериализации"""
        result = super().to_dict()
        result["data"].update({
            "video_url": self.video_url,
            "title": self.title,
            "description": self.description,
            "autoplay": self.autoplay,
            "loop": self.loop,
        })
        return result
```

### Telegram рендерер плагина

```python
# profochatbot_video/telegram_renderer.py
from adapters.telegram.renderers.base import TelegramRenderer
from aiogram import Bot
from core.elements.base import Element
from profochatbot_video.element import Video

class VideoRenderer(TelegramRenderer):
    """Рендерер для Video элемента в Telegram"""
    
    async def render(self, element: Video, bot: Bot, chat_id: int):
        """Отправка видео в Telegram"""
        # Отправка видео
        await bot.send_video(
            chat_id=chat_id,
            video=element.video_url,
            caption=element.title or element.description,
        )
        
        # Сохранение в БД
        await self.save_to_db(
            element,
            role="bot",
            report=f"Video: {element.title or element.video_url}"
        )
```

### Web сериализатор плагина

```python
# profochatbot_video/web_serializer.py
from adapters.web.serializers.base import WebSerializer
from core.elements.base import Element
from profochatbot_video.element import Video
from typing import Dict, Any

class VideoSerializer(WebSerializer):
    """Сериализатор для Video элемента"""
    
    def serialize(self, element: Video) -> Dict[str, Any]:
        """Сериализация Video элемента для веб-приложения"""
        return {
            "element_id": element.element_id,
            "element_type": element.type,
            "course_id": element.course_id,
            "video_url": element.video_url,
            "title": element.title,
            "description": element.description,
            "autoplay": element.autoplay,
            "loop": element.loop,
            "react_component": "VideoView",
            "wait_for_callback": element.should_wait_for_callback(),
        }
```

---

## Обнаружение и загрузка плагинов

### Плагин менеджер

```python
# core/plugins/manager.py
import importlib
import pkg_resources
from typing import Dict, List, Optional
from pathlib import Path
import logging

from core.plugins.base import Plugin
from core.elements.registry import ElementRegistry
from adapters.telegram.renderers import TelegramRendererRegistry
from adapters.web.serializers import WebSerializerRegistry

logger = logging.getLogger(__name__)

class PluginManager:
    """Менеджер для управления плагинами"""
    
    def __init__(self):
        self._plugins: Dict[str, Plugin] = {}
        self._loaded_plugins: List[str] = []
    
    def discover_plugins(self, plugin_dirs: Optional[List[str]] = None):
        """Обнаружение плагинов"""
        if plugin_dirs is None:
            # По умолчанию ищем в стандартных местах
            plugin_dirs = [
                "plugins",  # Локальные плагины
                "~/.profochatbot/plugins",  # Пользовательские плагины
            ]
        
        # Обнаружение через entry points
        discovered_plugins = []
        for entry_point in pkg_resources.iter_entry_points('profochatbot.plugins'):
            try:
                plugin_class = entry_point.load()
                discovered_plugins.append(plugin_class)
            except Exception as e:
                logger.error(f"Failed to load plugin {entry_point.name}: {e}")
        
        # Обнаружение в файловой системе
        for plugin_dir in plugin_dirs:
            plugin_path = Path(plugin_dir).expanduser()
            if plugin_path.exists():
                discovered_plugins.extend(self._discover_in_directory(plugin_path))
        
        return discovered_plugins
    
    def _discover_in_directory(self, directory: Path) -> List[Plugin]:
        """Обнаружение плагинов в директории"""
        plugins = []
        
        for plugin_file in directory.glob("**/plugin.py"):
            try:
                # Динамический импорт плагина
                spec = importlib.util.spec_from_file_location(
                    plugin_file.stem,
                    plugin_file
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Поиск класса Plugin
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and 
                        issubclass(attr, Plugin) and 
                        attr != Plugin):
                        plugins.append(attr())
            except Exception as e:
                logger.error(f"Failed to load plugin from {plugin_file}: {e}")
        
        return plugins
    
    def load_plugin(self, plugin: Plugin) -> bool:
        """Загрузка плагина"""
        plugin_info = plugin.plugin_info
        plugin_name = plugin_info.get("name", plugin.element_type)
        
        # Проверка версий
        if not self._check_version_compatibility(plugin):
            logger.error(f"Plugin {plugin_name} version incompatible")
            return False
        
        # Валидация плагина
        if not plugin.validate():
            logger.error(f"Plugin {plugin_name} validation failed")
            return False
        
        # Регистрация элемента
        try:
            ElementRegistry.register(
                plugin.element_type,
                plugin.element_class
            )
            
            # Регистрация рендереров
            telegram_renderer = plugin.get_telegram_renderer()
            if telegram_renderer:
                TelegramRendererRegistry.register(
                    plugin.element_type,
                    telegram_renderer
                )
            
            web_serializer = plugin.get_web_serializer()
            if web_serializer:
                WebSerializerRegistry.register(
                    plugin.element_type,
                    web_serializer
                )
            
            # Сохранение плагина
            self._plugins[plugin.element_type] = plugin
            self._loaded_plugins.append(plugin_name)
            
            # Вызов хука загрузки
            plugin.on_load()
            
            logger.info(f"Plugin {plugin_name} loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load plugin {plugin_name}: {e}")
            return False
    
    def unload_plugin(self, element_type: str) -> bool:
        """Выгрузка плагина"""
        if element_type not in self._plugins:
            return False
        
        plugin = self._plugins[element_type]
        
        try:
            # Вызов хука выгрузки
            plugin.on_unload()
            
            # Удаление из регистров
            ElementRegistry.unregister(element_type)
            TelegramRendererRegistry.unregister(element_type)
            WebSerializerRegistry.unregister(element_type)
            
            # Удаление из списка
            plugin_info = plugin.plugin_info
            plugin_name = plugin_info.get("name", element_type)
            self._loaded_plugins.remove(plugin_name)
            del self._plugins[element_type]
            
            logger.info(f"Plugin {plugin_name} unloaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to unload plugin {element_type}: {e}")
            return False
    
    def _check_version_compatibility(self, plugin: Plugin) -> bool:
        """Проверка совместимости версий"""
        plugin_info = plugin.plugin_info
        min_core_version = plugin_info.get("min_core_version")
        max_core_version = plugin_info.get("max_core_version")
        
        # Получить версию Core
        from core import __version__ as core_version
        # Простая проверка версий (можно улучшить)
        # ...
        
        return True
    
    def get_loaded_plugins(self) -> List[str]:
        """Получить список загруженных плагинов"""
        return self._loaded_plugins.copy()
    
    def get_plugin(self, element_type: str) -> Optional[Plugin]:
        """Получить плагин по типу элемента"""
        return self._plugins.get(element_type)

# Глобальный экземпляр менеджера
plugin_manager = PluginManager()
```

### Инициализация плагинов при запуске

```python
# core/plugins/__init__.py
from core.plugins.manager import plugin_manager

def initialize_plugins():
    """Инициализация плагинов при запуске приложения"""
    # Обнаружение плагинов
    plugins = plugin_manager.discover_plugins()
    
    # Загрузка плагинов
    for plugin in plugins:
        plugin_manager.load_plugin(plugin)
    
    return plugin_manager.get_loaded_plugins()

# Автоматическая инициализация при импорте
__all__ = ["plugin_manager", "initialize_plugins"]
```

**Использование в main.py:**

```python
# main.py или telegram_bot/main.py
from core.plugins import initialize_plugins

# Инициализация плагинов перед запуском бота
loaded_plugins = initialize_plugins()
logging.info(f"Loaded plugins: {loaded_plugins}")

# Остальной код...
```

---

## Управление плагинами

### CLI инструмент для управления плагинами

```python
# scripts/plugin_manager.py
#!/usr/bin/env python3
"""
CLI инструмент для управления плагинами
"""
import argparse
import sys
from core.plugins.manager import plugin_manager

def list_plugins():
    """Список всех плагинов"""
    loaded = plugin_manager.get_loaded_plugins()
    print("Loaded plugins:")
    for plugin_name in loaded:
        plugin = plugin_manager.get_plugin(plugin_name)
        if plugin:
            info = plugin.plugin_info
            print(f"  - {info.get('name')} v{info.get('version')}")
            print(f"    Type: {plugin.element_type}")
            print(f"    Description: {info.get('description', 'N/A')}")

def discover_plugins():
    """Обнаружение новых плагинов"""
    plugins = plugin_manager.discover_plugins()
    print(f"Discovered {len(plugins)} plugins:")
    for plugin in plugins:
        info = plugin.plugin_info
        print(f"  - {info.get('name')} v{info.get('version')}")

def load_plugin(plugin_path: str):
    """Загрузка плагина из файла"""
    # Реализация загрузки из файла
    pass

def unload_plugin(element_type: str):
    """Выгрузка плагина"""
    if plugin_manager.unload_plugin(element_type):
        print(f"Plugin {element_type} unloaded successfully")
    else:
        print(f"Failed to unload plugin {element_type}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="ProfoChatBot Plugin Manager")
    subparsers = parser.add_subparsers(dest="command")
    
    subparsers.add_parser("list", help="List loaded plugins")
    subparsers.add_parser("discover", help="Discover available plugins")
    
    load_parser = subparsers.add_parser("load", help="Load a plugin")
    load_parser.add_argument("plugin_path", help="Path to plugin")
    
    unload_parser = subparsers.add_parser("unload", help="Unload a plugin")
    unload_parser.add_argument("element_type", help="Element type")
    
    args = parser.parse_args()
    
    if args.command == "list":
        list_plugins()
    elif args.command == "discover":
        discover_plugins()
    elif args.command == "load":
        load_plugin(args.plugin_path)
    elif args.command == "unload":
        unload_plugin(args.element_type)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
```

### Установка плагинов через pip

```bash
# Установка плагина из PyPI
pip install profochatbot-plugin-video

# Установка из GitHub
pip install git+https://github.com/user/profochatbot-plugin-video.git

# Установка из локального файла
pip install ./profochatbot-plugin-video/

# Установка в режиме разработки
pip install -e ./profochatbot-plugin-video/
```

### Конфигурация плагинов

**config.yaml:**

```yaml
plugins:
  enabled:
    - video
    - drawing
    - code
  disabled:
    - experimental_feature
  directories:
    - plugins/
    - ~/.profochatbot/plugins/
  auto_discover: true
  auto_load: true
```

**Загрузка с учетом конфигурации:**

```python
# core/plugins/loader.py
import yaml
from pathlib import Path
from core.plugins.manager import plugin_manager

def load_plugins_from_config(config_path: str = "config.yaml"):
    """Загрузка плагинов согласно конфигурации"""
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    plugin_config = config.get("plugins", {})
    
    # Обнаружение плагинов
    if plugin_config.get("auto_discover", True):
        plugin_dirs = plugin_config.get("directories", [])
        plugins = plugin_manager.discover_plugins(plugin_dirs)
    else:
        plugins = []
    
    # Фильтрация по enabled/disabled
    enabled = set(plugin_config.get("enabled", []))
    disabled = set(plugin_config.get("disabled", []))
    
    # Загрузка плагинов
    if plugin_config.get("auto_load", True):
        for plugin in plugins:
            element_type = plugin.element_type
            if element_type in disabled:
                continue
            if enabled and element_type not in enabled:
                continue
            
            plugin_manager.load_plugin(plugin)
```

---

## Примеры плагинов

### Пример 1: Простой плагин (Video)

**Структура:**

```
profochatbot-plugin-video/
├── setup.py
├── pyproject.toml
├── README.md
└── profochatbot_video/
    ├── __init__.py
    ├── element.py
    ├── telegram_renderer.py
    └── web_serializer.py
```

**Использование в курсе:**

```yaml
# course.yml
Video_Introduction:
  type: video
  video_url: https://example.com/video.mp4
  title: Введение в курс
  description: Посмотрите это видео для начала
  autoplay: false
  loop: false
```

### Пример 2: Сложный плагин (Drawing/Whiteboard)

**Особенности:**
- Интерактивный элемент для рисования
- Сохранение рисунков пользователя
- Интеграция с внешним сервисом

```python
# profochatbot_drawing/element.py
class Drawing(Element):
    """Элемент для рисования/белой доски"""
    
    def __init__(self, element_data: ElementData):
        super().__init__(element_data)
        self.prompt = self.element_data.get("prompt", "Нарисуйте что-то")
        self.canvas_width = self.element_data.get("canvas_width", 800)
        self.canvas_height = self.element_data.get("canvas_height", 600)
        self.save_to_db = self.element_data.get("save_to_db", True)
    
    def process_response(self, response: Any) -> Dict[str, Any]:
        """Обработка сохраненного рисунка"""
        if isinstance(response, dict) and "drawing_data" in response:
            drawing_data = response["drawing_data"]
            # Сохранение рисунка
            if self.save_to_db:
                self._save_drawing(drawing_data)
            
            return {
                "feedback": "Рисунок сохранен!",
                "next_action": "continue",
            }
        
        return {"next_action": "wait"}
    
    def _save_drawing(self, drawing_data: str):
        """Сохранение рисунка в БД"""
        # Реализация сохранения
        pass
```

### Пример 3: Плагин с внешними зависимостями

**Плагин для работы с кодом (Code Editor):**

```python
# profochatbot_code/element.py
import subprocess
import tempfile
from core.elements.base import Element

class Code(Element):
    """Элемент для выполнения кода"""
    
    def __init__(self, element_data: ElementData):
        super().__init__(element_data)
        self.language = self.element_data.get("language", "python")
        self.code_template = self.element_data.get("code_template", "")
        self.timeout = self.element_data.get("timeout", 5)
    
    def process_response(self, response: Any) -> Dict[str, Any]:
        """Выполнение кода пользователя"""
        if not isinstance(response, str):
            return {"next_action": "wait"}
        
        try:
            result = self._execute_code(response)
            return {
                "feedback": f"Результат выполнения:\n```\n{result}\n```",
                "correct": True,
                "next_action": "continue",
            }
        except subprocess.TimeoutExpired:
            return {
                "feedback": "Время выполнения кода истекло",
                "correct": False,
                "next_action": "continue",
            }
        except Exception as e:
            return {
                "feedback": f"Ошибка выполнения: {str(e)}",
                "correct": False,
                "next_action": "continue",
            }
    
    def _execute_code(self, code: str) -> str:
        """Выполнение кода в изолированном окружении"""
        # Реализация выполнения кода
        # ВАЖНО: Использовать sandbox для безопасности!
        pass
```

---

## Безопасность плагинов

### Изоляция плагинов

**Sandbox для выполнения кода:**

```python
# core/plugins/sandbox.py
import sys
import importlib
from typing import Any

class PluginSandbox:
    """Песочница для безопасного выполнения плагинов"""
    
    ALLOWED_MODULES = {
        "core.elements.base",
        "core.utils.parsers",
        # Только безопасные модули
    }
    
    BLOCKED_MODULES = {
        "os",
        "sys",
        "subprocess",
        "importlib",
        # Опасные модули
    }
    
    def __init__(self):
        self._original_import = __builtins__.__import__
        self._restricted_imports = set()
    
    def restricted_import(self, name, *args, **kwargs):
        """Ограниченный импорт для плагинов"""
        if name in self.BLOCKED_MODULES:
            raise ImportError(f"Import of {name} is not allowed in plugins")
        
        if name not in self.ALLOWED_MODULES:
            # Логирование попытки импорта
            logging.warning(f"Plugin attempted to import {name}")
        
        return self._original_import(name, *args, **kwargs)
    
    def __enter__(self):
        """Вход в песочницу"""
        __builtins__.__import__ = self.restricted_import
        return self
    
    def __exit__(self, *args):
        """Выход из песочницы"""
        __builtins__.__import__ = self._original_import
```

### Валидация плагинов

**Проверка перед загрузкой:**

```python
# core/plugins/validator.py
import ast
import importlib.util
from pathlib import Path

class PluginValidator:
    """Валидатор плагинов"""
    
    DANGEROUS_FUNCTIONS = {
        "eval", "exec", "__import__", "compile",
        "open", "file", "input", "raw_input",
    }
    
    DANGEROUS_IMPORTS = {
        "os", "sys", "subprocess", "importlib",
        "socket", "urllib", "http", "ftplib",
    }
    
    def validate_plugin(self, plugin_path: Path) -> tuple[bool, list[str]]:
        """Валидация плагина"""
        errors = []
        
        # Проверка синтаксиса
        try:
            with open(plugin_path) as f:
                source = f.read()
            ast.parse(source)
        except SyntaxError as e:
            errors.append(f"Syntax error: {e}")
            return False, errors
        
        # Проверка на опасные функции
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id in self.DANGEROUS_FUNCTIONS:
                        errors.append(
                            f"Dangerous function '{node.func.id}' used"
                        )
            
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in self.DANGEROUS_IMPORTS:
                        errors.append(
                            f"Dangerous import '{alias.name}' used"
                        )
        
        return len(errors) == 0, errors
```

### Права доступа плагинов

**Система разрешений:**

```python
# core/plugins/permissions.py
from enum import Enum
from typing import Set

class Permission(Enum):
    """Разрешения для плагинов"""
    READ_DATABASE = "read_database"
    WRITE_DATABASE = "write_database"
    NETWORK_ACCESS = "network_access"
    FILE_SYSTEM = "file_system"
    EXECUTE_CODE = "execute_code"

class PluginPermissions:
    """Управление разрешениями плагинов"""
    
    def __init__(self, plugin_info: dict):
        self.plugin_info = plugin_info
        self.permissions: Set[Permission] = set(
            plugin_info.get("permissions", [])
        )
    
    def has_permission(self, permission: Permission) -> bool:
        """Проверка наличия разрешения"""
        return permission in self.permissions
    
    def require_permission(self, permission: Permission):
        """Требование разрешения (декоратор)"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                if not self.has_permission(permission):
                    raise PermissionError(
                        f"Plugin requires {permission.value} permission"
                    )
                return func(*args, **kwargs)
            return wrapper
        return decorator
```

---

## Версионирование плагинов

### Семантическое версионирование

**Формат версии:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Несовместимые изменения API
- **MINOR:** Новая функциональность с обратной совместимостью
- **PATCH:** Исправления багов

**Пример:**

```python
# profochatbot_video/__init__.py
__version__ = "1.2.3"  # MAJOR=1, MINOR=2, PATCH=3
```

### Проверка совместимости версий

```python
# core/plugins/version.py
from packaging import version

def check_version_compatibility(
    plugin_version: str,
    min_core_version: str,
    max_core_version: str,
    core_version: str
) -> bool:
    """Проверка совместимости версий"""
    # Проверка минимальной версии Core
    if version.parse(core_version) < version.parse(min_core_version):
        return False
    
    # Проверка максимальной версии Core
    if max_core_version:
        if version.parse(core_version) > version.parse(max_core_version):
            return False
    
    return True
```

### Обновление плагинов

**Стратегия обновления:**

```python
# core/plugins/updater.py
class PluginUpdater:
    """Обновление плагинов"""
    
    def update_plugin(self, plugin_name: str, target_version: str = None):
        """Обновление плагина"""
        # 1. Проверка текущей версии
        current_version = self._get_current_version(plugin_name)
        
        # 2. Проверка доступных обновлений
        available_versions = self._get_available_versions(plugin_name)
        
        # 3. Выбор версии для обновления
        if target_version:
            target = target_version
        else:
            target = available_versions[-1]  # Последняя версия
        
        # 4. Выгрузка старой версии
        plugin_manager.unload_plugin(plugin_name)
        
        # 5. Установка новой версии
        self._install_plugin_version(plugin_name, target)
        
        # 6. Загрузка новой версии
        plugin = self._load_plugin(plugin_name)
        plugin_manager.load_plugin(plugin)
```

---

## Тестирование плагинов

### Структура тестов плагина

```
profochatbot-plugin-video/
└── tests/
    ├── __init__.py
    ├── test_element.py
    ├── test_telegram_renderer.py
    ├── test_web_serializer.py
    └── fixtures/
        └── video_element_data.py
```

### Пример тестов

```python
# tests/test_element.py
import pytest
from profochatbot_video.element import Video
from core.elements.base import ElementData

class TestVideoElement:
    """Тесты для Video элемента"""
    
    @pytest.fixture
    def video_element_data(self):
        return ElementData(
            element_id="test_video_01",
            element_type="video",
            course_id="test_course",
            data={
                "element_data": {
                    "type": "video",
                    "video_url": "https://example.com/video.mp4",
                    "title": "Test Video",
                }
            }
        )
    
    def test_video_initialization(self, video_element_data):
        """Тест инициализации Video элемента"""
        element = Video(video_element_data)
        
        assert element.element_id == "test_video_01"
        assert element.video_url == "https://example.com/video.mp4"
        assert element.title == "Test Video"
    
    def test_video_validation(self, video_element_data):
        """Тест валидации Video элемента"""
        element = Video(video_element_data)
        assert element.validate() is True
        
        # Тест без video_url
        invalid_data = video_element_data
        invalid_data.data["element_data"].pop("video_url")
        element = Video(invalid_data)
        assert element.validate() is False
```

### Интеграционные тесты

```python
# tests/test_integration.py
import pytest
from core.plugins.manager import plugin_manager
from profochatbot_video import VideoPlugin

class TestVideoPluginIntegration:
    """Интеграционные тесты плагина"""
    
    def test_plugin_load(self):
        """Тест загрузки плагина"""
        plugin = VideoPlugin()
        assert plugin_manager.load_plugin(plugin) is True
        
        # Проверка регистрации
        from core.elements.registry import ElementRegistry
        assert "video" in ElementRegistry.get_types()
    
    def test_plugin_unload(self):
        """Тест выгрузки плагина"""
        plugin = VideoPlugin()
        plugin_manager.load_plugin(plugin)
        
        assert plugin_manager.unload_plugin("video") is True
        
        from core.elements.registry import ElementRegistry
        assert "video" not in ElementRegistry.get_types()
```

---

## Интеграция с существующей системой

### Миграция существующих элементов в плагины

**Шаг 1: Создание плагина из существующего элемента**

```python
# Плагин-обертка для существующего элемента
# plugins/core_elements/message_plugin.py
from core.plugins.base import Plugin
from core.elements.message import Message
from adapters.telegram.renderers.message import MessageRenderer
from adapters.web.serializers.message import MessageSerializer

class CoreMessagePlugin(Plugin):
    """Плагин-обертка для встроенного Message элемента"""
    
    @property
    def plugin_info(self):
        return {
            "name": "profochatbot-core-message",
            "version": "1.0.0",
            "description": "Core Message element",
            "builtin": True,
        }
    
    @property
    def element_class(self):
        return Message
    
    @property
    def element_type(self):
        return "message"
    
    def get_telegram_renderer(self):
        return MessageRenderer
    
    def get_web_serializer(self):
        return MessageSerializer
```

**Шаг 2: Автоматическая загрузка встроенных элементов**

```python
# core/plugins/builtin.py
from core.plugins.base import Plugin

# Автоматическая регистрация встроенных элементов как плагинов
BUILTIN_PLUGINS = [
    # Можно автоматически генерировать из ElementRegistry
]

def load_builtin_plugins():
    """Загрузка встроенных элементов как плагинов"""
    from core.elements.registry import ElementRegistry
    
    for element_type, element_class in ElementRegistry._elements.items():
        # Создание плагина-обертки
        plugin = create_builtin_plugin(element_type, element_class)
        plugin_manager.load_plugin(plugin)
```

### Обратная совместимость

**Поддержка старого API:**

```python
# core/elements/registry.py
class ElementRegistry:
    """Регистр элементов с поддержкой плагинов"""
    
    _elements: Dict[str, Type[Element]] = {}
    _plugins: Dict[str, Plugin] = {}
    
    @classmethod
    def register(cls, element_type: str, element_class: Type[Element]):
        """Регистрация элемента (старый API)"""
        cls._elements[element_type] = element_class
    
    @classmethod
    def register_plugin(cls, plugin: Plugin):
        """Регистрация через плагин (новый API)"""
        cls._plugins[plugin.element_type] = plugin
        cls._elements[plugin.element_type] = plugin.element_class
    
    @classmethod
    def create(cls, element_data) -> Element:
        """Создание элемента (работает с обоими API)"""
        element_type = element_data.data.get("element_data", {}).get("type")
        
        # Проверка плагинов
        if element_type in cls._plugins:
            plugin = cls._plugins[element_type]
            return plugin.element_class(element_data)
        
        # Fallback на старый API
        if element_type in cls._elements:
            element_class = cls._elements[element_type]
            return element_class(element_data)
        
        raise ValueError(f"Unknown element type: {element_type}")
```

---

## Заключение

Плагинная архитектура обеспечивает:

1. **Гибкость:** Легкое добавление новых элементов без изменения основного кода
2. **Изоляцию:** Плагины изолированы и не влияют на систему при ошибках
3. **Расширяемость:** Сообщество может создавать свои элементы
4. **Управляемость:** Легкое включение/отключение плагинов
5. **Безопасность:** Система проверки и изоляции плагинов

**Ключевые компоненты:**

- **Plugin API:** Базовый интерфейс для создания плагинов
- **Plugin Manager:** Обнаружение и загрузка плагинов
- **Регистры:** Интеграция плагинов в систему элементов
- **Безопасность:** Валидация и изоляция плагинов
- **Управление:** CLI инструменты для работы с плагинами

**Следующие шаги:**

1. Реализовать базовую плагинную систему
2. Мигрировать существующие элементы в плагины (опционально)
3. Создать примеры плагинов
4. Настроить репозиторий плагинов
5. Документировать процесс создания плагинов
