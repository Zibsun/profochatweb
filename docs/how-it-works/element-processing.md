# Обработка элементов

Техническое описание обработки элементов, регистра элементов и их жизненного цикла.

## Регистр элементов

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

## Создание элемента

### Из данных курса

```python
element = Course._get_element_from_data(element_key, course_id, element_data)
```

**Процесс:**
1. Извлечение типа элемента: `element_type = element_data["element_data"]['type']`
2. Получение класса из регистра: `element_class = element_registry.get(element_type)`
3. Создание экземпляра: `element = element_class(element_key, course_id, element_data)`

### Инициализация

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

## Жизненный цикл элемента

### 1. Создание

Элемент создается при загрузке курса или получении текущего элемента.

### 2. Установка контекста

```python
element.set_user(chat_id, username)
element.set_run_id(run_id)
element.set_conversation_id(conversation_id)
```

### 3. Обработка

Каждый тип элемента имеет свою логику обработки:

**Message:**
- Отправка текста
- Ожидание кнопки (если указана)

**Dialog:**
- Создание сессии чата
- Отправка сообщений в LLM
- Сохранение истории диалога

**Quiz:**
- Отображение вопроса
- Проверка ответа
- Сохранение результата

### 4. Сохранение результата

```python
conversation_id = element.save_report(
    role="user",  # или "assistant", "system"
    report="Текст сообщения",
    score=5.0,  # опционально
    maxscore=10.0  # опционально
)
```

**Вызывает:** `db.insert_element()` для сохранения в таблицу `conversation`

### 5. Переход к следующему

После обработки элемента происходит переход к следующему через `Course.get_next_element()`.

## Типы элементов

### Информационные

- **Message** — текстовое сообщение
- **Audio** — аудиосообщение

**Особенности:**
- Не требуют ответа пользователя (кроме Message с кнопкой)
- Автоматически переходят к следующему элементу

### Интерактивные

- **Input** — ввод текста
- **Quiz** — викторина с одним правильным ответом
- **Question** — опрос без правильного ответа
- **MultiChoice** — множественный выбор

**Особенности:**
- Требуют ответа пользователя
- Сохраняют результат в `conversation`
- Переходят к следующему элементу после ответа

### ИИ-диалоги

- **Dialog** — диалог с ИИ-ассистентом

**Особенности:**
- Создает сессию чата
- Отправляет сообщения в OpenAI API
- Сохраняет историю диалога
- Может иметь системный промпт

### Навигационные

- **Jump** — переход к произвольному элементу
- **Delay** — задержка перед следующим элементом
- **End** — завершение курса

**Особенности:**
- Изменяют поток выполнения курса
- Delay добавляет элемент в `waiting_element`

### Аналитические

- **Test** — итоговый тест с подсчетом баллов
- **Revision** — повторение ошибок

**Особенности:**
- Test подсчитывает результаты из `conversation`
- Revision загружает элементы с ошибками из истории

## Обработка ошибок

**Неизвестный тип элемента:**
```python
element_class = element_registry.get(element_type)
if element_class is None:
    logging.error(f"Unknown element type: {element_type}")
    return None
```

**Ошибка создания элемента:**
```python
try:
    element = element_class(element_key, course_id, element_data)
except Exception as e:
    logging.error(f"Error creating element {element_key}: {e}")
    return None
```

## Расширение системы элементов

### Добавление нового типа элемента

1. Создать класс в `elements/new_element.py`:
```python
from .element import Element

class NewElement(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        # Дополнительная инициализация
```

2. Зарегистрировать в `elements/__init__.py`:
```python
from .new_element import NewElement

element_registry = {
    # ...
    "new_element": NewElement
}
```

3. Добавить обработку на frontend (если нужно)
