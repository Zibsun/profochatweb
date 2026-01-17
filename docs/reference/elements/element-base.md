# Базовый класс Element

Техническая спецификация базового класса для всех элементов курсов.

## Файл

`elements/element.py`

## Класс

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
```

## Поля

- `id` — идентификатор элемента
- `course_id` — идентификатор курса
- `data` — полные данные элемента
- `type` — тип элемента (message, dialog, quiz и т.д.)
- `wait_for_callback` — ожидает ли элемент ответа пользователя
- `parse_mode` — режим форматирования (MARKDOWN, HTML)
- `link_preview` — показывать ли превью ссылок

## Методы

### `set_user(chat_id, username)`

Установка пользователя для элемента.

```python
element.set_user(chat_id, username)
```

### `set_run_id(run_id)`

Установка ID сессии прохождения курса.

```python
element.set_run_id(run_id)
```

### `set_conversation_id(conversation_id)`

Установка ID conversation записи.

```python
element.set_conversation_id(conversation_id)
```

### `save_report(role, report, score=None, maxscore=None)`

Сохранение взаимодействия в таблицу `conversation`.

```python
conversation_id = element.save_report(
    role="user",  # или "assistant", "system"
    report="Текст сообщения",
    score=5.0,  # опционально
    maxscore=10.0  # опционально
)
```

**Параметры:**
- `role` — роль сообщения ('user', 'assistant', 'system')
- `report` — текст сообщения/ответа
- `score` — оценка (для тестовых элементов)
- `maxscore` — максимальная оценка

**Возвращает:** `conversation_id` — ID созданной записи

## Создание элементов

Элементы создаются через регистр элементов:

```python
from elements import element_registry

element_type = element_data["element_data"]['type']
element_class = element_registry.get(element_type)
element = element_class(element_id, course_id, element_data)
```

## Наследование

Все типы элементов наследуются от `Element`:

```python
class Message(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        # Дополнительная инициализация
```
