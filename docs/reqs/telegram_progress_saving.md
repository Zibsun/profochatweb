# Документация: Сохранение прогресса в Telegram боте

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Актуальная документация  

---

## Обзор

Telegram бот использует подход на основе **истории взаимодействий** для отслеживания прогресса пользователя по курсу. Вместо отдельной таблицы прогресса, текущее состояние определяется по последней записи в таблице `conversation`, которая хранит всю историю сообщений бота и ответов пользователя.

---

## Архитектура сохранения прогресса

### Основные концепции

1. **Run (Сессия)** - сессия прохождения курса пользователем
2. **Conversation (История)** - все взаимодействия пользователя с элементами курса
3. **Current Element (Текущий элемент)** - определяется как последняя запись в `conversation`

### Ключевое отличие от веб-версии

**Telegram бот:**
- Не использует отдельную таблицу `course_progress`
- Прогресс определяется динамически из таблицы `conversation`
- Каждое взаимодействие сохраняется как отдельная запись
- Текущий элемент = последняя запись в `conversation` для данного `chat_id`

**Веб-версия (планируемая):**
- Использует таблицу `course_progress` для хранения текущего состояния
- Обновляет прогресс при каждом переходе к следующему шагу
- Более структурированный подход с явным отслеживанием прогресса

---

## Структура базы данных

### Таблица `run` (Сессия прохождения курса)

**Назначение:** Отслеживание начала и завершения прохождения курса пользователем.

**Структура:**
```sql
CREATE TABLE run (
    run_id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    username TEXT,
    botname TEXT NOT NULL,
    course_id TEXT NOT NULL,
    date_inserted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    utm_source TEXT,
    utm_campaign TEXT,
    is_ended BOOLEAN
);
```

**Ключевые поля:**
- `run_id` - уникальный идентификатор сессии
- `chat_id` - Telegram chat ID пользователя
- `course_id` - идентификатор курса
- `is_ended` - флаг завершения курса

**Создание сессии:**
```python
# В course.py, метод start_run()
def start_run(self):
    run_id = db.create_run(
        self.course_id, 
        self.username, 
        self.chat_id, 
        self.params.get('utms'), 
        self.params.get('utmc')
    )
    self.run_id = run_id
    return run_id
```

**Когда создается:**
- При команде `/start` с указанием курса
- Вызывается в `init_course()` перед отправкой первого элемента

---

### Таблица `conversation` (История взаимодействий)

**Назначение:** Хранение всех сообщений бота и ответов пользователя.

**Структура:**
```sql
CREATE TABLE conversation (
    conversation_id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    username TEXT,
    course_id TEXT NOT NULL,
    element_id TEXT NOT NULL,
    element_type TEXT NOT NULL,
    role TEXT NOT NULL,  -- 'user' или 'bot'
    json TEXT NOT NULL,  -- JSON-строка с данными элемента
    report TEXT,         -- Текст сообщения/ответа
    score FLOAT,         -- Оценка (для элементов с проверкой)
    maxscore FLOAT,      -- Максимальная оценка
    date_inserted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    run_id INTEGER REFERENCES run(run_id)
);
```

**Ключевые поля:**
- `conversation_id` - уникальный идентификатор записи
- `element_id` - идентификатор элемента курса (например, "Course_intro_01")
- `role` - роль: `"bot"` (сообщение от бота) или `"user"` (ответ пользователя)
- `report` - текст сообщения или ответа
- `run_id` - связь с сессией прохождения курса

**Важно:**
- Каждое взаимодействие сохраняется как отдельная запись
- Сообщение бота и ответ пользователя - это разные записи
- Текущий элемент определяется как последняя запись по `conversation_id DESC`

---

## Процесс сохранения прогресса

### 1. Начало курса (`/start`)

**Поток выполнения:**

```
1. Пользователь отправляет /start course_id
   ↓
2. main.py: start_command_handler()
   ↓
3. init_course() - создание объекта Course
   ↓
4. course.start_run() - создание записи в таблице run
   ↓
5. course.get_first_element() - получение первого элемента курса
   ↓
6. element.send(bot) - отправка элемента пользователю
   ↓
7. element.save_report(role="bot", report=text) - сохранение в conversation
   ↓
8. Если элемент не требует callback (wait_for_callback=False):
   → Course.send_next_element() - автоматический переход к следующему
```

**Код:**

```python
# main.py
@dp.message(Command("start"))
async def start_command_handler(message: types.Message, command: CommandObject):
    command = command.args
    chat_id = message.from_user.id
    username = message.from_user.username
    
    course = await init_course(command, chat_id, username)
    if course is None:
        return
    
    e = course.get_first_element()
    await e.send(bot)
    if not e.wait_for_callback:
        await Course.send_next_element(bot, chat_id, username)
```

**Создание сессии:**

```python
# course.py
def start_run(self):
    run_id = db.create_run(
        self.course_id, 
        self.username, 
        self.chat_id, 
        self.params.get('utms'), 
        self.params.get('utmc')
    )
    self.run_id = run_id
    return run_id
```

---

### 2. Отправка элемента ботом

**Поток выполнения:**

```
1. element.send(bot) вызывается для отправки элемента
   ↓
2. Элемент отправляется пользователю через Telegram API
   ↓
3. element.save_report(role="bot", report=text) - сохранение сообщения бота
   ↓
4. Если элемент не требует callback (wait_for_callback=False):
   → Автоматический переход к следующему элементу
```

**Пример для элемента Message:**

```python
# elements/message.py
class Message(Element):
    async def send(self, bot):
        # Отправка сообщения пользователю
        if self.button:
            # Отправка с кнопкой
            await _send_message(bot, self.chat_id, self.text, ...)
        else:
            # Отправка без кнопки
            await _send_message(bot, self.chat_id, self.text, ...)
        
        # Сохранение в историю
        self.save_report(role="bot", report=self.text)
```

**Метод save_report():**

```python
# elements/element.py
def save_report(self, role, report, score=None, maxscore=None):
    username = "--empty--" if self.username is None else self.username
    return db.insert_element(
        self.chat_id, 
        self.course_id, 
        username, 
        self.id,           # element_id
        self.type,         # element_type
        self.run_id, 
        self.data,         # json данные элемента
        role,              # "bot" или "user"
        report,            # текст сообщения
        score=score, 
        maxscore=maxscore
    )
```

**Функция insert_element():**

```python
# db.py
def insert_element(chat_id, course_id, username, element_id, element_type, 
                   run_id, json_data, role, report, score=None, maxscore=None):
    conn = get_connection()
    cursor = conn.cursor()
    
    json_string = json.dumps(json_data)
    
    sql = '''
    INSERT INTO conversation (chat_id, course_id, username, element_id, 
                              element_type, run_id, json, role, report, score, maxscore)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
    RETURNING conversation_id;
    '''
    cursor.execute(sql, (chat_id, course_id, username, element_id, element_type, 
                         run_id, json_string, role, report, score, maxscore))
    
    item_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return item_id
```

---

### 3. Ответ пользователя

**Поток выполнения:**

```
1. Пользователь отправляет сообщение или нажимает кнопку
   ↓
2. main.py: обработчик (callback_query или message handler)
   ↓
3. Course.get_current_element(chat_id) - получение текущего элемента
   ↓
4. Обработка ответа пользователя (в зависимости от типа элемента)
   ↓
5. element.save_report(role="user", report=answer) - сохранение ответа
   ↓
6. Отправка обратной связи (если требуется)
   ↓
7. Course.send_next_element() - переход к следующему элементу
```

**Пример: нажатие кнопки "Далее" (got_it):**

```python
# main.py
@dp.callback_query(F.data == "got_it")
async def got_it_click(callback: types.CallbackQuery):
    await callback.message.edit_reply_markup(reply_markup=None)
    await Course.send_next_element(bot, callback.from_user.id, callback.from_user.username)
```

**Пример: ответ на элемент Input:**

```python
# elements/input.py
async def send_reply(self, bot):
    # Сохранение ответа пользователя
    self.save_report(role="user", report=self.message)
    
    # Проверка правильности и отправка обратной связи
    if self.correct_answer:
        if self.message.lower().strip() == self.correct_answer.lower().strip():
            self.save_report(role="bot", report=self.feedback_correct, score=1, maxscore=1)
            await _send_message(bot, self.chat_id, self.feedback_correct, ...)
        else:
            self.save_report(role="bot", report=self.feedback_incorrect, score=0, maxscore=1)
            await _send_message(bot, self.chat_id, self.feedback_incorrect, ...)
```

---

### 4. Получение текущего элемента

**Метод get_current_element():**

```python
# course.py
@classmethod
def get_current_element(cls, chat_id):
    # Получение последней записи из conversation
    conversation_id, element_id, element_type, course_id, run_id, element_data = \
        db.get_current_element(chat_id)
    
    # Проверка завершения курса
    if db.is_course_ended(chat_id, course_id):
        return None
    
    # Восстановление объекта элемента из JSON данных
    element = Course._get_element_from_data(element_id, course_id, element_data)
    element.set_run_id(run_id)
    element.set_conversation_id(conversation_id)
    
    return element
```

**SQL запрос:**

```python
# db.py
def get_current_element(chat_id):
    conn = get_connection()
    cursor = conn.cursor()
    sql = '''
    SELECT conversation_id, element_id, element_type, course_id, run_id, json
    FROM conversation
    WHERE chat_id = %s
    ORDER BY conversation_id DESC
    LIMIT 1
    '''
    cursor.execute(sql, (chat_id,))
    result = cursor.fetchone()
    conn.close()
    if result:
        conversation_id, element_id, element_type, course_id, run_id, json_data = result
        return conversation_id, element_id, element_type, course_id, run_id, json.loads(json_data)
    else:
        return None
```

**Важно:**
- Текущий элемент определяется как **последняя запись** в `conversation` для данного `chat_id`
- Используется `ORDER BY conversation_id DESC LIMIT 1`
- Если записей нет, возвращается `None` (курс не начат)

---

### 5. Переход к следующему элементу

**Метод send_next_element():**

```python
# course.py
@classmethod
async def send_next_element(cls, bot, chat_id, username, element_id=None, course_id=None):
    try:
        if element_id:
            # Переход к конкретному элементу
            e = Course.get_element_by_id(chat_id=chat_id, element_id=element_id, course_id=course_id)
        else:
            # Переход к следующему элементу
            e = Course.get_next_element(chat_id)
        
        if e:
            e.set_user(chat_id, username)
            if e.type != "":
                await e.send(bot)  # Отправка элемента и сохранение в conversation
                
                # Если элемент не требует callback, автоматически переходим дальше
                if not e.wait_for_callback:
                    await Course.send_next_element(bot, chat_id, username)
        else:
            # Курс завершен
            db.set_course_ended(chat_id)
            logging.info(f"Course is over for {chat_id}")
    except Exception as e:
        logging.error("error sending next element", exc_info=True)
```

**Метод get_next_element():**

```python
# course.py
@classmethod
def get_next_element(cls, chat_id):
    # Получение текущего элемента
    conversation_id, element_id, element_type, course_id, run_id, element_data = \
        db.get_current_element(chat_id)
    
    # Обработка revision элементов (повторение ошибок)
    if "revision" in element_data:
        # ... логика для revision ...
    
    # Получение следующего элемента из курса
    e = Course._get_next_element_from_course(course_id, element_id)
    if e:
        e.set_run_id(run_id)
        return e
    return None
```

**Определение следующего элемента:**

Для курсов из YAML файлов:
```python
# course.py
@classmethod
def _get_next_element_from_course(cls, course_id, element_id):
    course = Course(course_id)
    course_data = course.get_course_data()
    
    next_element = False
    for key, element_data in course_data.items():
        if next_element:
            e = Course._get_element_from_data(key, course_id, {"element_data": element_data})
            return e
        if key == element_id:
            next_element = True
    return None
```

Для курсов из БД:
```python
# db.py
def get_next_course_element_by_id(course_id, element_id):
    query = """
    SELECT element_id, json
    FROM course_element
    WHERE course_element_id > (
        SELECT course_element_id
        FROM course_element
        WHERE element_id = %s AND course_id = %s AND bot_name = %s
    ) AND course_id = %s AND bot_name = %s
    ORDER BY course_element_id
    LIMIT 1;
    """
    # Выполнение запроса...
```

---

## Особенности работы с различными типами элементов

### Message (без кнопки)

**Поведение:**
- `wait_for_callback = False`
- После отправки автоматически переходит к следующему элементу
- Сохраняется только одно сообщение бота (`role="bot"`)

**Код:**
```python
# elements/message.py
class Message(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        self.button = data["element_data"].get("button")
        if not self.button:
            self.wait_for_callback = False  # Автоматический переход
    
    async def send(self, bot):
        await _send_message(bot, self.chat_id, self.text, ...)
        self.save_report(role="bot", report=self.text)
```

### Message (с кнопкой)

**Поведение:**
- `wait_for_callback = True`
- Ждет нажатия кнопки пользователем
- После нажатия кнопки переходит к следующему элементу

**Код:**
```python
# elements/message.py
class Message(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        self.button = data["element_data"].get("button")
        # wait_for_callback остается True (по умолчанию)
    
    async def send(self, bot):
        builder = InlineKeyboardBuilder()
        builder.add(types.InlineKeyboardButton(
            text=self.button,
            callback_data="got_it")
        )
        await _send_message(bot, self.chat_id, self.text, ..., builder.as_markup())
        self.save_report(role="bot", report=self.text)
```

### Input (текстовый ответ)

**Поведение:**
- Сохраняет ответ пользователя (`role="user"`)
- Проверяет правильность ответа
- Сохраняет обратную связь (`role="bot"`) с оценкой

**Код:**
```python
# elements/input.py
async def send_reply(self, bot):
    # Сохранение ответа пользователя
    self.save_report(role="user", report=self.message)
    
    # Проверка и обратная связь
    if self.correct_answer:
        if self.message.lower().strip() == self.correct_answer.lower().strip():
            self.save_report(role="bot", report=self.feedback_correct, score=1, maxscore=1)
        else:
            self.save_report(role="bot", report=self.feedback_incorrect, score=0, maxscore=1)
```

### Quiz (викторина)

**Поведение:**
- Сохраняет вопрос бота (`role="bot"`)
- Сохраняет выбранный ответ пользователя (`role="user"`)
- Сохраняет обратную связь (`role="bot"`) с оценкой

**Код:**
```python
# elements/quiz.py
async def send(self, bot):
    # Отправка викторины как Telegram Poll
    await bot.send_poll(...)
    self.save_report(role="bot", report=self.text)

async def send_reply(self, bot):
    # Сохранение ответа пользователя
    self.save_report(role="user", report=self.answers[self.quiz_answer_id]['text'])
    
    # Определение правильности и обратная связь
    score = 1 if self.answers[self.quiz_answer_id].get('correct') == 'yes' else 0
    self.save_report(role="bot", report=self.quiz_feedback, score=score, maxscore=1)
```

### Dialog (чат с ИИ)

**Поведение:**
- Сохраняет начальное сообщение бота (`role="bot"`)
- Сохраняет каждое сообщение пользователя (`role="user"`)
- Сохраняет каждый ответ ИИ (`role="bot"`)
- Множественные записи в `conversation` для одного элемента

**Код:**
```python
# elements/dialog.py
async def send(self, bot):
    await _send_message(bot, self.chat_id, self.text, ...)
    self.save_report(role="bot", report=self.text)

async def chat_reply(self, bot, message_text, ban_text):
    # Сохранение сообщения пользователя
    self.save_report(role="user", report=message_text)
    
    # Получение ответа от ИИ
    bot_reply = await self.get_bot_reply(...)
    
    # Сохранение ответа ИИ
    self.save_report(role="bot", report=bot_reply)
```

---

## Завершение курса

**Метод set_course_ended():**

```python
# db.py
def set_course_ended(chat_id, course_id=None):
    """Mark a course as ended for a specific chat_id and course_id"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            query = """
            UPDATE run SET is_ended = TRUE 
            WHERE chat_id = %s AND botname = %s
            """
            if course_id:
                query = query + " AND course_id = %s"
                cursor.execute(query, (chat_id, globals.BOT_NAME, course_id))
            else:
                cursor.execute(query, (chat_id, globals.BOT_NAME))
            conn.commit()
    except Exception as e:
        conn.rollback()
        logging.error("Error marking course as ended", exc_info=True)
    finally:
        conn.close()
```

**Когда вызывается:**
- Когда `get_next_element()` возвращает `None` (нет следующего элемента)
- В методе `send_next_element()` при отсутствии следующего элемента

**Проверка завершения:**

```python
# db.py
def is_course_ended(chat_id, course_id=None):
    """Check if a course has been marked as ended"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            query = """SELECT is_ended FROM run 
            WHERE chat_id = %s AND botname = %s
            ORDER BY run_id DESC LIMIT 1"""
            if course_id:
                query = query.replace("botname", "course_id = %s AND botname")
                cursor.execute(query, (chat_id, course_id, globals.BOT_NAME))
            else:
                cursor.execute(query, (chat_id, globals.BOT_NAME))
            result = cursor.fetchone()
            return result and result[0] is True
    except Exception as e:
        logging.error("Error checking if course is ended", exc_info=True)
        return False
    finally:
        conn.close()
```

---

## Примеры запросов к базе данных

### Получить текущий элемент пользователя

```sql
SELECT conversation_id, element_id, element_type, course_id, run_id, json
FROM conversation
WHERE chat_id = 123456789
ORDER BY conversation_id DESC
LIMIT 1;
```

### Получить всю историю прохождения курса

```sql
SELECT 
    conversation_id,
    element_id,
    element_type,
    role,
    report,
    score,
    maxscore,
    date_inserted
FROM conversation
WHERE chat_id = 123456789 
  AND course_id = 'testmessages'
  AND run_id = 42
ORDER BY conversation_id ASC;
```

### Получить статистику по курсу

```sql
SELECT 
    element_type,
    COUNT(*) as count,
    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
    SUM(CASE WHEN role = 'bot' THEN 1 ELSE 0 END) as bot_messages,
    SUM(score) as total_score,
    SUM(maxscore) as max_score
FROM conversation
WHERE chat_id = 123456789 
  AND course_id = 'testmessages'
  AND run_id = 42
GROUP BY element_type;
```

### Получить последний элемент каждого типа

```sql
SELECT DISTINCT ON (element_type)
    element_id,
    element_type,
    date_inserted
FROM conversation
WHERE chat_id = 123456789 
  AND course_id = 'testmessages'
ORDER BY element_type, conversation_id DESC;
```

---

## Преимущества и недостатки подхода

### Преимущества

1. **Полная история взаимодействий** - все сообщения и ответы сохраняются
2. **Простота восстановления** - можно восстановить состояние из истории
3. **Аналитика** - легко получить статистику по прохождению курса
4. **Отладка** - можно проследить весь путь пользователя
5. **Гибкость** - легко добавить новые типы элементов без изменения схемы

### Недостатки

1. **Производительность** - при большом количестве записей запрос `get_current_element()` может быть медленным
2. **Нет явного прогресса** - нужно вычислять прогресс из истории
3. **Дублирование данных** - JSON данные элемента хранятся в каждой записи
4. **Сложность навигации** - сложнее реализовать переход к конкретному шагу

---

## Рекомендации для веб-версии

Для веб-версии рекомендуется использовать **гибридный подход**:

1. **Сохранять историю** в таблице `conversation` (для аналитики и отладки)
2. **Добавить таблицу `course_progress`** для быстрого доступа к текущему состоянию
3. **Обновлять обе таблицы** при каждом взаимодействии:
   - `conversation` - для полной истории
   - `course_progress` - для быстрого доступа к текущему шагу

Это обеспечит:
- ✅ Быстрый доступ к текущему состоянию
- ✅ Полную историю взаимодействий
- ✅ Возможность вычисления прогресса
- ✅ Совместимость с существующей системой аналитики

---

## Связанные документы

- `docs/database.md` - общая документация по базе данных
- `docs/webversion_messages_only_requirements.md` - требования для веб-версии
- `docs/elements.md` - документация по типам элементов

---

**Конец документа**
