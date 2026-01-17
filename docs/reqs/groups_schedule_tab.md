# Требования к вкладке Schedule в странице /groups

**Версия:** 1.1  
**Дата:** 2024  
**Статус:** Реализовано  
**Основано на:** `groups_model.md`, `frontend_page_guidelines.md`

---

## Обзор

Вкладка **Schedule** в странице `/groups/[groupId]` позволяет управлять расписанием запуска секций курса для группы. Расписание определяет, когда каждая секция курса становится доступной студентам группы.

### Назначение

- Управление временем запуска секций курса
- Синхронизация расписания с актуальной структурой курса
- Визуализация состояния расписания для каждой секции

---

## Структура данных

### Формат `schedule_config`

Расписание хранится в поле `schedule_config` таблицы `schedule` в формате JSON:

```json
{
  "sections": {
    "Section_Intro": {
      "start_time": "2024-01-15T09:00:00Z",
      "status": "scheduled"
    },
    "Section_Main": {
      "start_time": null,
      "status": "immediate"
    },
    "Section_Deleted": {
      "start_time": "2024-01-20T10:00:00Z",
      "status": "scheduled"
    }
  }
}
```

**Поля секции:**
- `start_time` — дата и время начала секции в формате ISO 8601 (UTC) или `null` для "Starts immediately"
- `status` — статус секции:
  - `"scheduled"` — секция запланирована на конкретное время
  - `"immediate"` — секция запускается сразу (без расписания)

**Примечание:** Если `start_time` равен `null`, то `status` должен быть `"immediate"`. Если `start_time` указан, то `status` должен быть `"scheduled"`.

---

## Логика загрузки данных

### Шаг 1: Чтение YAML курса

При заходе на вкладку Schedule:

1. Получить `course_code` из группы (используется `course_code`, а не `course_id`)
2. Загрузить секции курса через API `/api/courses/[courseCode]/sections`
3. API автоматически парсит YAML и извлекает все элементы с `type: section`
4. Сформировать список секций курса:
   ```typescript
   interface CourseSection {
     elementId: string;  // ID элемента (например, "Section_Intro")
     title: string;       // title из YAML
   }
   ```

**Пример:**
```yaml
Section_Intro:
  type: section
  title: Введение

Section_Main:
  type: section
  title: Основная часть курса
```

Результат:
```typescript
[
  { elementId: "Section_Intro", title: "Введение" },
  { elementId: "Section_Main", title: "Основная часть курса" }
]
```

### Шаг 2: Чтение `schedule_config`

1. Загрузить расписание группы через API `/api/groups/[groupId]/schedule`
2. Если расписание отсутствует, использовать пустой объект `{}`
3. Извлечь `schedule_config.sections` (если есть)

### Шаг 3: Merge логика

Объединить данные из курса и расписания в единую таблицу:

#### Случай 1: Секция есть и в курсе, и в schedule

**Поведение:**
- Показываем секцию как обычную строку
- В колонке **Section** выводим `title` из курса
- В колонке **Start** выводим:
  - Если `start_time` указан: дату и время в формате `"DD.MM.YYYY HH:mm"` (локальное время пользователя)
  - Если `start_time` равен `null`: текст `"Starts immediately"`

**Пример:**
```
Section: "Introduction"
Start: "01/15/2024, 12:00 PM"
```

или

```
Section: "Introduction"
Start: "Starts immediately"
```

#### Случай 2: Секция есть в курсе, но нет в schedule

**Поведение:**
- Добавляем строку для этой секции
- В колонке **Section** выводим `title` из курса
- В колонке **Start** выводим значение по умолчанию: `"Starts immediately"`
- При сохранении эта секция будет добавлена в `schedule_config` со статусом `"immediate"`

**Пример:**
```
Section: "New Section"
Start: "Starts immediately"  (default)
```

#### Случай 3: Секция есть в schedule, но её больше нет в курсе

**Поведение:**
- Показываем строку с пометкой об удалении
- В колонке **Section** выводим текст: `"[Removed from course] {old title}"`
  - Если `title` был сохранен в `schedule_config`, используем его
  - Если `title` не был сохранен, используем `elementId`
- Строка подсвечена:
  - Используется `bg-muted/30` с `opacity-75` для визуального отличия
  - Соответствует стилю course_editor (без специфичных цветов)
- В колонке **Start** выводим дату/время или `"Starts immediately"` как обычно
- В колонке **Actions** показываем кнопку удаления

**Пример:**
```
Section: "[Removed from course] Old Section"
Start: "01/20/2024, 10:00 AM"
[Delete]  (button)
```

**Визуальное оформление:**
- Строка с удаленной секцией визуально отличается через `bg-muted/30 opacity-75`
- Используются стандартные классы из course_editor для консистентности

---

## Структура таблицы

### Колонки

1. **Section** (обязательно)
   - Название секции из курса
   - Для удаленных секций: `"[Removed from course] {title}"`

2. **Start** (обязательно)
   - Дата и время начала или `"Starts immediately"`
   - Редактируемое поле (date-time picker или inline editing)

3. **Actions** (опционально)
   - Кнопка удаления для удаленных секций
   - Кнопка сброса в "Starts immediately" для запланированных секций

### Порядок строк

- Секции из курса (случаи 1 и 2) — в порядке их появления в YAML
- Удаленные секции (случай 3) — в конце таблицы, отдельно или с пометкой

---

## CRUD-операции

### Create / Update

**UX:**
- Все изменения делаются прямо в таблице (inline editing)
- Пользователь может:
  - Выставлять/менять дату и время начала секции через date-time picker
  - Сбрасывать расписание секции в состояние "Starts immediately" (кнопка или опция в picker)

**Реализация:**
- При изменении даты/времени:
  - Обновить локальное состояние таблицы
  - Валидировать формат даты/времени
  - Показывать индикатор сохранения (опционально)
- При сбросе в "Starts immediately":
  - Установить `start_time: null` и `status: "immediate"`
  - Обновить отображение в таблице

**Валидация:**
- Дата и время должны быть в будущем (или текущее время)
- Формат: ISO 8601 (UTC) для хранения, локальное время для отображения

### Delete

**Для удаленных секций (случай 3):**
- Пользователь может удалить строку из расписания
- При удалении:
  - Удалить секцию из `schedule_config.sections`
  - Обновить таблицу (строка исчезает)

**Для обычных секций:**
- Удалять саму секцию из расписания не даём
- Управление секциями остается на стороне курса
- Максимум — сбросить расписание в "Starts immediately"

**UX:**
- Кнопка удаления видна только для удаленных секций
- Удаление происходит без подтверждения (можно добавить при необходимости)

### Save

**Кнопка "Save Schedule":**
- Расположение: вверху таблицы, справа от заголовка
- Стиль: primary button
- Состояния:
  - Обычное: "Save Schedule" с иконкой Save
  - При сохранении: "Saving..." с иконкой RefreshCw (spinning, disabled)

**Процесс сохранения:**
1. Собрать текущее состояние таблицы в JSON формат `schedule_config`
2. Отправить POST запрос на `/api/groups/[groupId]/schedule`
3. Показать toast уведомление:
   - Успех: "Schedule saved" / "Schedule has been saved successfully"
   - Ошибка: "Error" / "Failed to save schedule"
4. После успешного сохранения перезагрузить данные для синхронизации

**Формат запроса:**
```typescript
POST /api/groups/[groupId]/schedule
{
  schedule_type: "custom",  // или существующий тип
  schedule_config: {
    sections: {
      "Section_Intro": {
        start_time: "2024-01-15T09:00:00Z",
        status: "scheduled"
      },
      "Section_Main": {
        start_time: null,
        status: "immediate"
      }
    }
  },
  is_active: true
}
```

---

## API изменения

### GET /api/groups/[groupId]/schedule

**Текущее поведение:** Возвращает расписание группы

**Реализация:**
- Использует таблицу `course_group` (не `group`)
- Использует поле `course_group_id` в таблице `schedule` (маппится в `group_id` в ответе)
- Безопасный парсинг `schedule_config` с обработкой ошибок
- Поддерживает структуру с секциями в `schedule_config.sections`

### POST /api/groups/[groupId]/schedule

**Текущее поведение:** Создает или обновляет расписание группы

**Реализация:** 
- Использует таблицу `course_group` для проверки группы
- Использует поле `course_group_id` в таблице `schedule`
- Принимает и сохраняет `schedule_config` с секциями
- Автоматически создает или обновляет запись в зависимости от наличия
- Сохраняет `schedule_type: "custom"` для расписания по секциям
- Безопасный парсинг `schedule_config` при возврате данных

### Новый endpoint: GET /api/courses/[courseCode]/sections

**Назначение:** Получить список секций из YAML курса

**Параметры:**
- `courseCode` — `course_code` курса (строка), не `course_id` (число)

**Реализация:**
- Поддерживает курсы из БД и из YAML файлов
- Для курсов из БД: загружает элементы через `getCourseElementsFromDB` и преобразует в YAML
- Для курсов из YAML: загружает файл через `loadCourseYaml`
- Парсит YAML и извлекает элементы с `type: section` и полем `title`
- Возвращает список секций

**Ответ:**
```json
{
  "sections": [
    {
      "elementId": "Section_Intro",
      "title": "Introduction"
    },
    {
      "elementId": "Section_Main",
      "title": "Main Section"
    }
  ]
}
```

**Ошибки:**
- 404 — курс не найден
- 500 — ошибка парсинга YAML или загрузки данных

---

## UI/UX требования

### Визуальное оформление

1. **Таблица:**
   - Современный дизайн в стиле course_editor
   - Использует стандартные классы: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`
   - Адаптивная верстка (responsive)
   - Строки с удаленными секциями визуально отличаются через `bg-muted/30 opacity-75`
   - Hover эффекты: `hover:bg-muted/30`

2. **Date-time picker:**
   - Используется встроенный `input[type="datetime-local"]`
   - Поддержка выбора даты и времени
   - Отображение в локальном времени пользователя (en-US формат)
   - Кнопка "Immediate" для сброса в "Starts immediately"
   - Inline editing: редактирование прямо в таблице

3. **Индикаторы состояния:**
   - Loading: иконка `RefreshCw` с `animate-spin` и текст "Loading schedule..."
   - Saving: кнопка disabled с текстом "Saving..." и spinning иконкой
   - Toast уведомления для успеха/ошибки (на английском)

### Обработка ошибок

1. **Ошибка загрузки курса:**
   - Показать сообщение: "Error loading schedule" / "Failed to load course sections"
   - Кнопка "Try again" для повторной попытки
   - Отображается в блоке с иконкой `AlertCircle` и красным цветом

2. **Ошибка загрузки расписания:**
   - Ошибка игнорируется, используется пустое расписание
   - Продолжить работу с пустым `schedule_config`

3. **Ошибка сохранения:**
   - Показать toast с ошибкой: "Error" / "Failed to save schedule"
   - Локальные изменения сохраняются в состоянии компонента
   - Можно повторить сохранение

4. **Валидация:**
   - Формат даты/времени валидируется браузером через `input[type="datetime-local"]`
   - При пустом значении устанавливается "Starts immediately"

---

## Примеры использования

### Пример 1: Создание расписания для нового курса

1. Пользователь открывает вкладку Schedule
2. Система загружает секции из курса: `["Introduction", "Main Section", "Conclusion"]`
3. Все секции отображаются со статусом "Starts immediately"
4. Пользователь нажимает "Edit" и устанавливает даты для каждой секции через date-time picker
5. Нажимает "Save Schedule"
6. Расписание сохраняется в `schedule_config` с `schedule_type: "custom"`

### Пример 2: Обновление расписания после изменения курса

1. Пользователь удалил секцию "Main Section" из курса
2. Открывает вкладку Schedule
3. Видит:
   - Секции "Introduction" и "Conclusion" как обычные строки
   - Секцию "[Removed from course] Main Section" с `bg-muted/30 opacity-75`
4. Пользователь может удалить удаленную секцию из расписания кнопкой "Delete" или оставить её

### Пример 3: Добавление новой секции в курс

1. Пользователь добавил новую секцию "Practice" в курс
2. Открывает вкладку Schedule
3. Видит новую секцию "Practice" со статусом "Starts immediately"
4. Нажимает "Edit", устанавливает дату начала через date-time picker
5. Нажимает "Save Schedule"
6. Расписание обновляется с новой секцией

---

## Технические детали

### Компоненты

1. **ScheduleTab.tsx** — основной компонент вкладки
   - Загружает секции курса и расписание
   - Реализует merge логику
   - Управляет состоянием и сохранением

2. **ScheduleTable.tsx** — таблица с расписанием секций
   - Разделяет секции на обычные и удаленные
   - Рендерит таблицу со стандартными стилями

3. **ScheduleRow.tsx** — строка таблицы (для каждой секции)
   - Inline editing даты/времени через `input[type="datetime-local"]`
   - Кнопка "Immediate" для сброса
   - Кнопка "Delete" для удаленных секций

4. **DateTimePicker** — не создан отдельно, используется встроенный `input[type="datetime-local"]`

### Состояние

```typescript
interface ScheduleState {
  sections: ScheduleSection[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

interface ScheduleSection {
  elementId: string;
  title: string;
  startTime: string | null;  // ISO 8601 или null
  status: "scheduled" | "immediate";
  isDeleted: boolean;  // true если секции нет в курсе
}
```

### Хуки

Хуки не создавались отдельно. Вся логика реализована внутри компонента `ScheduleTab`:
- Загрузка данных в `useEffect` с зависимостями `[groupId, courseCode]`
- Сохранение через функцию `handleSave`
- Обновление секций через `handleSectionUpdate` и `handleSectionDelete`

---

## Чеклист реализации

- [x] API endpoint для получения секций курса (`GET /api/courses/[courseCode]/sections`)
- [x] Компонент ScheduleTab
- [x] Компонент ScheduleTable
- [x] Компонент ScheduleRow с inline editing
- [x] Inline date-time picker (встроенный `input[type="datetime-local"]`)
- [x] Логика merge секций курса и расписания
- [x] Обработка удаленных секций
- [x] Валидация даты/времени (браузерная)
- [x] Сохранение расписания через API
- [x] Обработка ошибок
- [x] Toast уведомления (на английском)
- [x] Адаптивная верстка
- [x] Интеграция в GroupDetailsPanel и GroupDetailView
- [x] Исправление SQL запросов для использования `course_group` и `course_group_id`
- [ ] Тесты компонентов
- [ ] Тесты API endpoints

---

## Связанные документы

- [Groups Model](groups_model.md) — модель данных групп
- [Frontend Page Guidelines](frontend_page_guidelines.md) — стандарты создания страниц
- [Elements Documentation](../reference/elements/elements.md) — описание элементов курса, включая Section

---

## Важные замечания по реализации

### База данных

- Используется таблица `course_group`, а не `group`
- В таблице `schedule` используется поле `course_group_id`, а не `group_id`
- При возврате данных `course_group_id` маппится в `group_id` для совместимости с типами

### API параметры

- Для получения секций используется `course_code` (строка), а не `course_id` (число)
- Endpoint: `/api/courses/[courseCode]/sections`

### Интерфейс

- Все тексты на английском языке
- Стили соответствуют course_editor
- Формат даты/времени: en-US (например, "01/15/2024, 12:00 PM")
- Удаленные секции используют `bg-muted/30 opacity-75` вместо специфичных цветов

### Интеграция

- Вкладка добавлена в `GroupDetailsPanel` (используется на `/groups`)
- Вкладка добавлена в `GroupDetailView` (используется на `/groups/[groupId]`)
- Оба компонента используют систему вкладок с переключением между "Overview" и "Schedule"

---

**Дата создания:** 2024  
**Дата обновления:** 2024  
**Статус:** Реализовано  
**Следующие шаги:**
1. Тестирование всех сценариев использования
2. Добавление unit тестов для компонентов
3. Добавление интеграционных тестов для API endpoints
4. Оптимизация производительности при большом количестве секций
