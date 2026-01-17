# Работа телеграм бота с курсами и метаданными

**Версия:** 1.0  
**Дата:** 2024-12  
**Статус:** Документация

---

## Содержание

1. [Обзор](#обзор)
2. [Структура courses.yml](#структура-coursesyml)
3. [Загрузка курсов](#загрузка-курсов)
4. [Метаданные курсов](#метаданные-курсов)
5. [Инициализация курса](#инициализация-курса)
6. [Хранение курсов](#хранение-курсов)
7. [Работа с элементами курса](#работа-с-элементами-курса)
8. [Примеры использования](#примеры-использования)

---

## Обзор

Телеграм бот работает с курсами через систему метаданных, которая определяет:
- Где хранится курс (YAML файл или база данных)
- С какого элемента начинать курс
- Ограничения доступа к курсу
- Настройки блокировок пользователей

Курсы могут храниться в двух форматах:
1. **YAML файлы** — статические курсы в файловой системе
2. **База данных** — динамически создаваемые курсы

Метаданные всех курсов хранятся в файле `courses.yml`, который находится в папке `scripts/{bot_folder}/courses.yml`.

---

## Структура courses.yml

Файл `courses.yml` содержит метаданные всех доступных курсов в формате YAML:

```yaml
course_id:
  path: scripts/course_file.yml  # Путь к файлу курса или "db" для БД
  element: StartElement          # Опционально: начальный элемент
  restricted: yes                 # Опционально: ограниченный доступ
  decline_text: "..."            # Опционально: текст отказа
  ban_enabled: yes               # Опционально: включены блокировки
  ban_text: "..."                # Опционально: текст блокировки
```

### Поля метаданных

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `path` | string | Да | Путь к YAML файлу курса или `"db"` для курсов из БД |
| `element` | string | Нет | ID элемента, с которого начинать курс (если не указан, используется первый элемент) |
| `restricted` | boolean/string | Нет | Если `yes`/`true`, доступ ограничен (проверяется в БД) |
| `decline_text` | string | Нет | Текст сообщения при отказе в доступе |
| `ban_enabled` | boolean/string | Нет | Если `yes`/`true`, включена система блокировок |
| `ban_text` | string | Нет | Текст сообщения при блокировке пользователя |

### Примеры

**Простой курс:**
```yaml
default:
  path: scripts/default.yml
```

**Курс с начальным элементом:**
```yaml
us:
  path: scripts/userstory.yml
  element: Course_intro_end
```

**Ограниченный курс:**
```yaml
forming2:
  path: scripts/teacher.yaml
  restricted: "yes"
  decline_text: |
    Хочешь присоединиться к курсу? Регистрируйся! 
    https://trendyenglish.ru/page53699999.html
```

**Курс из базы данных:**
```yaml
testdb:
  path: db
```

**Курс с блокировками:**
```yaml
course_with_ban:
  path: scripts/course.yml
  ban_enabled: yes
  ban_text: |
    ⚠️ Извини, но мы уже исчерпали лимит общения, 
    и наш бюджет на использование ИИ превышен.
```

### Расширенные курсы (ext_courses)

Для динамического добавления курсов из базы данных или другого файла используется специальный ключ `ext_courses`:

```yaml
ext_courses:
  path: db  # или path: another_courses.yml
```

Если в `courses.yml` присутствует ключ `ext_courses`:
- Если `path: db`, курсы загружаются из таблицы `course` в базе данных
- Если `path: file.yml`, курсы загружаются из указанного YAML файла
- Все курсы из `ext_courses` имеют `path: "db"` (для БД) или соответствующий путь
- Курсы из `ext_courses` переопределяют курсы с теми же `course_id` из основного файла

**Важно:** Курс `default` также может быть переопределен через `ext_courses`.

---

## Загрузка курсов

### Функция `load_courses()`

Функция `load_courses()` в модуле `course.py` загружает все курсы из `courses.yml`:

```python
def load_courses():
    """
    Returns courses (course_id: path, optional element and maybe settings) from courses.yml.
    """
    folder = "scripts/" + globals.BOT_FOLDER
    with open(folder + COURSES_FILE, 'r') as file:
        courses = yaml.safe_load(file)
        
        # Обработка ext_courses
        if EXT_ID in courses:
            ext_file = courses[EXT_ID].get("path")
            if ext_file == "db":
                ext = db.get_courses()  # Загрузка из БД
            else:
                with open(folder + ext_file, 'r') as ext_file:
                    ext = yaml.safe_load(ext_file)  # Загрузка из файла
            del courses[EXT_ID]
            courses.update(ext)  # Объединение курсов
        
        return courses
```

**Процесс загрузки:**

1. Чтение файла `scripts/{bot_folder}/courses.yml`
2. Парсинг YAML
3. Если найден ключ `ext_courses`:
   - Загрузка дополнительных курсов из БД или файла
   - Удаление ключа `ext_courses` из словаря
   - Объединение с основными курсами (курсы из `ext_courses` переопределяют существующие)
4. Возврат словаря `{course_id: metadata}`

**Обработка ошибок:**
- При ошибке парсинга YAML логируется ошибка и возвращается `None`
- При отсутствии файла выбрасывается исключение `FileNotFoundError`

### Загрузка при старте бота

При запуске бота (`main.py`) курсы загружаются один раз:

```python
async def main():
    # ...
    courses = load_courses()
    # Проверка наличия курсов с ban_enabled для инициализации планировщика
    if is_ban_enabled(courses):
        init_banning(scheduler)
    # ...
```

---

## Метаданные курсов

### Класс `Course`

Класс `Course` в `course.py` инкапсулирует работу с метаданными курса:

```python
class Course:
    def __init__(self, command):
        command = self.extract_params(command)
        self.course_id = command if command else DEFAULT_ID
        self.not_found = False
        courses = load_courses()
        
        if self.course_id in courses:
            cdata = courses.get(self.course_id)
            self.course_path = cdata.get("path")
            # Нормализация пути
            if self.course_path != "db" and not self.course_path.startswith("scripts/"):
                folder = "scripts/" + globals.BOT_FOLDER
                self.course_path = folder + self.course_path
            
            # Загрузка метаданных
            self.course_element = cdata.get("element")
            self.restricted = cdata.get("restricted")
            self.decline_text = cdata.get("decline_text")
            self.ban_enabled = cdata.get("ban_enabled")
            self.ban_text = cdata.get("ban_text")
        else:
            self.not_found = True
```

### Свойства класса Course

| Свойство | Тип | Описание |
|----------|-----|----------|
| `course_id` | string | Идентификатор курса |
| `course_path` | string | Путь к файлу курса или `"db"` |
| `course_element` | string/None | ID начального элемента |
| `restricted` | boolean/string/None | Флаг ограниченного доступа |
| `decline_text` | string/None | Текст отказа в доступе |
| `ban_enabled` | boolean/string/None | Флаг включения блокировок |
| `ban_text` | string/None | Текст блокировки |
| `not_found` | boolean | Флаг, что курс не найден |
| `params` | dict | Параметры из команды (utm_source, utm_campaign и т.д.) |

### Извлечение параметров из команды

Метод `extract_params()` извлекает дополнительные параметры из команды `/start`:

**Формат команды:**
```
/start course_id__utmsIItg__utmcIItg-aidea-blog-oy1
```

**Разбор:**
- Разделитель параметров: `__`
- Разделитель ключ-значение: `II`
- Первая часть до `__` — `course_id`
- Остальные части — параметры (например, `utms`, `utmc`)

**Пример:**
```python
command = "course_id__utmsIItg__utmcIItg-aidea-blog-oy1"
# Результат:
# self.course_id = "course_id"
# self.params = {"utms": "tg", "utmc": "tg-aidea-blog-oy1"}
```

Эти параметры сохраняются в таблице `run` для аналитики.

---

## Инициализация курса

### Функция `init_course()`

При получении команды `/start` вызывается функция `init_course()`:

```python
async def init_course(command, chat_id, username):
    course = Course(command)
    course.set_user(chat_id, username)
    
    # Проверка существования курса
    if course.not_found:
        await bot.send_message(chat_id, "Упс, эта ссылка на бот не работает 😭")
        return None
    
    # Проверка ограниченного доступа
    if course.restricted:
        if not course.validatedUser(username):
            await bot.send_message(chat_id, course.decline_text, parse_mode=ParseMode.MARKDOWN)
            return None
    
    # Создание сессии прохождения (run)
    course.start_run()
    return course
```

**Процесс инициализации:**

1. **Создание объекта Course** — загрузка метаданных из `courses.yml`
2. **Установка пользователя** — сохранение `chat_id` и `username`
3. **Проверка существования** — если курс не найден, отправляется сообщение об ошибке
4. **Проверка доступа** — если курс ограничен (`restricted: yes`):
   - Проверка наличия пользователя в таблице `courseparticipants`
   - Если пользователь не найден, отправляется `decline_text`
5. **Создание сессии** — вызов `start_run()` создает запись в таблице `run`
6. **Возврат объекта** — возвращается объект `Course` для дальнейшей работы

### Метод `start_run()`

Создает новую сессию прохождения курса:

```python
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

**Что сохраняется:**
- `course_id` — идентификатор курса
- `username` — имя пользователя Telegram
- `chat_id` — ID чата
- `utm_source` — источник трафика (из параметров команды)
- `utm_campaign` — кампания (из параметров команды)
- `botname` — имя бота (из `globals.BOT_NAME`)
- `date_inserted` — время создания сессии

### Метод `validatedUser()`

Проверяет, есть ли пользователь в списке участников курса:

```python
def validatedUser(self, username):
    return db.check_user_in_course(self.course_id, username)
```

Проверка выполняется в таблице `courseparticipants` по полям `course_id` и `username`.

### Метод `get_user_ban_text()`

Проверяет, заблокирован ли пользователь:

```python
def get_user_ban_text(self, chat_id):
    if self.ban_enabled:
        if db.check_user_banned(chat_id): 
            return self.ban_text
    return None
```

**Условия блокировки:**
- В метаданных курса `ban_enabled: yes`
- В таблице `bannedparticipants` есть запись для `chat_id` и `botname`

Этот метод вызывается в `reply_user()` перед отправкой ответа ИИ в диалоговых элементах.

---

## Хранение курсов

### Курсы из YAML файлов

**Структура:**
- Файлы курсов находятся в `scripts/{bot_folder}/*.yml`
- Путь указывается в метаданных: `path: scripts/course_file.yml` или `path: course_file.yml`
- При загрузке путь нормализуется: если не начинается с `scripts/`, добавляется префикс `scripts/{bot_folder}/`

**Загрузка данных курса:**
```python
def get_course_data(self):
    with open(self.course_path, 'r') as file:
        return yaml.safe_load(file)
```

**Формат файла курса:**
```yaml
element_id_1:
  type: message
  text: "Привет!"
  
element_id_2:
  type: dialog
  prompt: "Ты помощник..."
```

### Курсы из базы данных

**Структура БД:**

**Таблица `course`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `course_id` | text (PK) | Идентификатор курса |
| `bot_name` | text (PK) | Имя бота |
| `creator_id` | int8 | Telegram chat ID создателя |
| `date_created` | timestamp | Дата создания |
| `yaml` | text | YAML-представление курса (опционально) |

**Таблица `course_element`:**
| Поле | Тип | Описание |
|------|-----|----------|
| `course_element_id` | int8 (PK) | ID записи |
| `course_id` | text | Идентификатор курса |
| `bot_name` | text | Имя бота |
| `element_id` | text | ID элемента |
| `element_type` | text | Тип элемента |
| `json` | text | JSON-данные элемента |

**Загрузка курсов из БД:**
```python
def get_courses():
    # Возвращает словарь {course_id: {"path": "db"}}
    query = "SELECT course_id FROM course WHERE bot_name = %s;"
    results = {}
    for row in cur.fetchall():
        results[row[0]] = {"path": "db"}
    return results
```

**Загрузка элементов курса:**
```python
def get_element_from_course_by_id(course_id, element_id):
    query = """
    SELECT element_id, json
    FROM course_element
    WHERE course_id = %s AND bot_name = %s AND element_id = %s;
    """
    # Возвращает (element_id, json_data)
```

**Сохранение курса в БД:**
```python
def add_replace_course(course_id, course_data, bot_name, creator_id, course_script):
    # 1. Удаление старых данных
    delete_course(conn, "course_element", course_id, bot_name)
    delete_course(conn, "course", course_id, bot_name)
    
    # 2. Сохранение метаданных
    INSERT INTO course (course_id, bot_name, creator_id, yaml)
    VALUES (course_id, bot_name, creator_id, course_script);
    
    # 3. Сохранение элементов
    for element_id, json_data in course_data.items():
        INSERT INTO course_element (bot_name, course_id, element_id, json, element_type)
        VALUES (bot_name, course_id, element_id, json_string, element_type);
```

---

## Работа с элементами курса

### Получение элементов

**Первый элемент курса:**
```python
def get_first_element(self):
    e = self.get_element(self.course_element)  # Если указан course_element
    # или первый элемент из курса
    e.set_user(self.chat_id, self.username)
    e.set_run_id(self.run_id)
    return e
```

**Текущий элемент пользователя:**
```python
@classmethod
def get_current_element(cls, chat_id):
    result = db.get_current_element(chat_id)
    # Получение из таблицы conversation
    conversation_id, element_id, element_type, course_id, run_id, element_data = result
    
    # Проверка завершения курса
    if db.is_course_ended(chat_id, course_id):
        return None
    
    element = Course._get_element_from_data(element_id, course_id, element_data)
    element.set_run_id(run_id)
    element.set_conversation_id(conversation_id)
    return element
```

**Следующий элемент:**
```python
@classmethod
def get_next_element(cls, chat_id):
    # Получение текущего элемента из БД
    conversation_id, element_id, element_type, course_id, run_id, element_data = db.get_current_element(chat_id)
    
    # Обработка revision (повторение ошибок)
    if "revision" in element_data:
        # ...
    
    # Получение следующего элемента из курса
    e = Course._get_next_element_from_course(course_id, element_id)
    if e:
        e.set_run_id(run_id)
        return e
    return None  # Курс завершен
```

### Загрузка элемента из курса

**Для YAML файлов:**
```python
@classmethod
def _get_element_from_course(cls, course_id, element_id=None):
    course = Course(course_id)
    course_data = course.get_course_data()  # Загрузка YAML
    
    if element_id:
        if element_id in course_data:
            e = Course._get_element_from_data(
                element_id, 
                course_id, 
                {"element_data": course_data[element_id]}
            )
            return e
    else:
        # Первый элемент
        for element_key, element_data in course_data.items():
            return Course._get_element_from_data(
                element_key, 
                course_id, 
                {"element_data": element_data}
            )
```

**Для БД:**
```python
@classmethod
def _get_element_from_course(cls, course_id, element_id=None):
    course = Course(course_id)
    if course.course_path == "db":
        if element_id:
            element_id, json = db.get_element_from_course_by_id(course_id, element_id)
        else:
            element_id, json = db.get_first_element_from_course(course_id)
        e = Course._get_element_from_data(element_id, course_id, json)
        return e
```

### Создание объекта элемента

```python
@classmethod
def _get_element_from_data(cls, element_key, course_id, element_data):
    element_type = element_data["element_data"]['type']
    element_class = element_registry.get(element_type)  # Получение класса элемента
    if element_class:
        element = element_class(element_key, course_id, element_data)
        return element
```

---

## Примеры использования

### Пример 1: Запуск простого курса

**Команда пользователя:**
```
/start default
```

**Процесс:**
1. `init_course("default", chat_id, username)` создает объект `Course`
2. Загружаются метаданные из `courses.yml`: `{path: "scripts/default.yml"}`
3. Проверяется доступ (если `restricted` не установлен, проверка пропускается)
4. Создается сессия в таблице `run`
5. Загружается первый элемент из `scripts/default.yml`
6. Элемент отправляется пользователю

### Пример 2: Запуск ограниченного курса

**Метаданные в courses.yml:**
```yaml
forming2:
  path: scripts/teacher.yaml
  restricted: "yes"
  decline_text: |
    Хочешь присоединиться к курсу? Регистрируйся! 
    https://trendyenglish.ru/page53699999.html
```

**Команда пользователя:**
```
/start forming2
```

**Процесс:**
1. Создается объект `Course` с `restricted: "yes"`
2. Вызывается `course.validatedUser(username)`
3. Проверка в таблице `courseparticipants`:
   - Если пользователь найден → курс запускается
   - Если не найден → отправляется `decline_text`, курс не запускается

### Пример 3: Курс с блокировками

**Метаданные:**
```yaml
course_with_ban:
  path: scripts/course.yml
  ban_enabled: yes
  ban_text: "⚠️ Лимит превышен"
```

**Использование:**
При отправке сообщения в диалоговом элементе:
```python
course = Course(e.course_id)
ban_text = course.get_user_ban_text(chat_id)
if ban_text:
    # Отправляется ban_text вместо ответа ИИ
else:
    # Обычный ответ ИИ
```

### Пример 4: Курс с начальным элементом

**Метаданные:**
```yaml
us:
  path: scripts/userstory.yml
  element: Course_intro_end
```

**Процесс:**
При запуске курса загружается элемент с ID `Course_intro_end` вместо первого элемента файла.

### Пример 5: Динамические курсы из БД

**courses.yml:**
```yaml
ext_courses:
  path: db
```

**Процесс:**
1. При загрузке `load_courses()` обнаруживает `ext_courses`
2. Вызывается `db.get_courses()`, который возвращает:
   ```python
   {
       "testdb": {"path": "db"},
       "tst": {"path": "db"}
   }
   ```
3. Эти курсы добавляются к основным курсам
4. При обращении к курсу `testdb` элементы загружаются из таблицы `course_element`

### Пример 6: Курс с UTM параметрами

**Команда:**
```
/start course_id__utmsIItg__utmcIItg-aidea-blog-oy1
```

**Результат:**
- `course_id = "course_id"`
- `params = {"utms": "tg", "utmc": "tg-aidea-blog-oy1"}`
- Эти параметры сохраняются в таблице `run` для аналитики

---

## Связанные документы

- `docs/database.md` — описание структуры базы данных
- `docs/architecture.md` — общая архитектура бота
- `docs/reqs/course_list_editor_requirements.md` — требования к редактору списка курсов
- `docs/telegram_progress_saving.md` — сохранение прогресса пользователей

---

## История изменений

| Версия | Дата | Автор | Описание |
|--------|------|-------|----------|
| 1.0 | 2024-12 | - | Первоначальная версия документации |
