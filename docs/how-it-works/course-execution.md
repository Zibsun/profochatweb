# Выполнение курса

Техническое описание выполнения курса, навигации по элементам и управления состоянием.

## Загрузка курса

Курсы могут загружаться из двух источников:

### 1. YAML файлы

**Путь:** `scripts/{BOT_FOLDER}/*.yml`

**Загрузка:**
```python
course = Course(course_id)
course_data = course.get_course_data()  # yaml.safe_load()
```

**Структура:**
```yaml
Element_ID:
  type: message
  text: "Текст сообщения"
```

### 2. База данных

**Таблицы:** `course`, `course_element`

**Загрузка:**
```python
element_id, json = db.get_element_from_course_by_id(course_id, element_id)
```

**Определение:** Курсы из БД имеют `path: "db"` в `courses.yml`

## Навигация по элементам

### Получение текущего элемента

```python
element = Course.get_current_element(chat_id)
```

**Логика:**
1. Получение текущего элемента из БД через `db.get_current_element(chat_id)`
2. Проверка завершения курса через `db.is_course_ended(chat_id, course_id)`
3. Создание экземпляра элемента через `_get_element_from_data()`
4. Установка `run_id` и `conversation_id`

### Получение следующего элемента

```python
element = Course.get_next_element(chat_id)
```

**Логика:**
1. Получение текущего элемента из БД
2. Обработка revision элементов (если есть)
3. Получение следующего элемента через `_get_next_element_from_course()`
4. Установка `run_id`

### Получение элемента по ID

```python
element = Course.get_element_by_id(chat_id, element_id, course_id)
```

## Управление состоянием

### Сессия прохождения (run)

**Создание:**
```python
run_id = course.start_run()
# Вызывает db.create_run(course_id, username, chat_id, utms, utmc)
```

**Хранение:**
- Таблица `run` (или `conversation.run_id`)
- Связывает пользователя с курсом
- Содержит UTM метки для аналитики

### Текущий элемент

**Хранение:**
- Таблица `conversation` с `role = 'system'`
- Последняя запись для пользователя определяет текущий элемент
- `element_id` определяет текущий элемент курса

### Переход к следующему элементу

**Процесс:**
1. Пользователь завершает текущий элемент
2. Сохранение результата в `conversation`
3. Получение следующего элемента через `get_next_element()`
4. Сохранение нового элемента в `conversation` как текущий

## Особые случаи

### Revision элементы

Если текущий элемент содержит `revision`:
```python
if "revision" in element_data:
    revision_elements = element_data["revision"]['data']
    next_element_data = revision_elements.pop(0)
    # Создание элемента из revision_elements
```

### Jump элементы

Элементы типа `jump` могут переходить к произвольному элементу:
```python
if element.type == "jump":
    target_element_id = element.data["element_data"]["target"]
    element = Course.get_element_by_id(chat_id, target_element_id)
```

### Delay элементы

Элементы типа `delay` добавляются в `waiting_element`:
```python
if element.type == "delay":
    wait_time = element.data["element_data"]["wait"]
    element.set_to_wait(wait_time)
    # Добавляет запись в waiting_element
```

### End элементы

Элементы типа `end` завершают курс:
```python
if element.type == "end":
    db.mark_course_ended(chat_id, course_id)
```

## Обработка ошибок

**Курс не найден:**
```python
course = Course(course_id)
if course.not_found:
    # Обработка ошибки
```

**Элемент не найден:**
```python
element = Course.get_element_by_id(chat_id, element_id)
if element is None:
    # Обработка ошибки
```

**Курс завершен:**
```python
if db.is_course_ended(chat_id, course_id):
    # Курс уже завершен
```
