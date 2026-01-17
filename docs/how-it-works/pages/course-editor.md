# Как работает редактор курсов

Этот документ описывает архитектуру и принципы работы редактора курсов (Course Editor) - визуального инструмента для создания и редактирования курсов в формате YAML.

## Содержание

- [Обзор](#обзор)
- [Архитектура](#архитектура)
- [Загрузка курса](#загрузка-курса)
- [Редактирование курса](#редактирование-курса)
- [Сохранение курса](#сохранение-курса)
- [Преобразование данных](#преобразование-данных)
- [API Endpoints](#api-endpoints)
- [Типы блоков](#типы-блоков)
- [Структура файлов](#структура-файлов)

---

## Обзор

Редактор курсов - это веб-приложение на React/Next.js, которое позволяет визуально редактировать курсы, хранящиеся в YAML файлах. Редактор работает напрямую с файловой системой, читая и записывая YAML файлы курсов.

### Основные возможности

- ✅ Загрузка существующих курсов из YAML файлов
- ✅ Создание новых курсов
- ✅ Визуальное редактирование структуры курса (блоков)
- ✅ Редактирование свойств каждого блока
- ✅ Drag & Drop для изменения порядка блоков
- ✅ Сохранение изменений обратно в YAML файлы
- ✅ Поддержка 5 типов элементов: Section, Message, Quiz, Input, Dialog
- ✅ AI Assistant для улучшения контента (stub-реализация)

### Технологический стек

**Frontend:**
- React + TypeScript
- Next.js (App Router)
- Tailwind CSS
- shadcn/ui компоненты

**Backend:**
- Next.js API Routes
- Node.js файловая система (fs)
- js-yaml для работы с YAML

---

## Архитектура

Редактор состоит из следующих основных компонентов:

```
webapp/frontend/
├── app/
│   ├── course-editor/
│   │   ├── [courseId]/page.tsx      # Страница редактора с courseId
│   │   └── page.tsx                 # Страница создания нового курса
│   └── api/
│       └── course-editor/
│           └── courses/
│               ├── route.ts         # POST: создание курса
│               └── [id]/
│                   └── route.ts     # GET/PUT/DELETE: работа с курсом
├── components/
│   └── course-editor/
│       └── CourseEditor.tsx         # Главный компонент редактора
└── lib/
    └── course-editor/
        ├── yaml-converter.ts        # Преобразование YAML ↔ Блоки
        ├── yaml-utils.ts            # Утилиты для работы с YAML файлами
        └── ai-service.ts            # AI Assistant (stub)
```

### Поток данных

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────┐
│  Next.js API Route  │
│  (/api/course-...)  │
└──────┬──────────────┘
       │
       │ File System Operations
       ▼
┌─────────────────────┐
│   YAML Files        │
│  (scripts/*.yml)     │
└─────────────────────┘
```

---

## Загрузка курса

### Процесс загрузки

1. **Пользователь открывает редактор** с `courseId` в URL: `/course-editor/[courseId]`

2. **Frontend делает запрос** к API:
   ```typescript
   GET /api/course-editor/courses/{courseId}
   ```

3. **Backend обрабатывает запрос:**
   - Читает `scripts/courses.yml` для получения метаданных курса
   - Проверяет, что курс существует
   - Проверяет, что курс не хранится в БД (`path !== "db"`)
   - Получает путь к файлу курса из метаданных
   - Загружает YAML файл курса по пути
   - Парсит YAML в объект JavaScript
   - Преобразует YAML элементы в блоки редактора (`convertYamlToBlocks`)

4. **Backend возвращает данные:**
   ```json
   {
     "course": {
       "course_id": "ai_bee1_v12",
       "path": "scripts/ai_bee1_v12.yml",
       "element": "StartElement",
       ...
     },
     "yaml_content": { ... },
     "blocks": [ ... ]
   }
   ```

5. **Frontend отображает курс:**
   - Сохраняет блоки в состояние React (`useState`)
   - Отображает структуру курса в левой панели
   - Позволяет редактировать блоки

### Код загрузки (Frontend)

```typescript
const loadCourse = async (id: string) => {
  setLoading(true);
  try {
    const response = await fetch(`/api/course-editor/courses/${id}`);
    const data = await response.json();
    setBlocks(data.blocks || []);
    setCourseTitle(data.course?.course_id || id);
  } catch (err) {
    setError(`Ошибка загрузки: ${err.message}`);
  } finally {
    setLoading(false);
  }
};
```

### Код загрузки (Backend)

```typescript
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const courseId = params.id;
  
  // Получаем метаданные из courses.yml
  const courseMetadata = getCourseMetadata(courseId);
  if (!courseMetadata) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  
  // Проверяем, что курс не в БД
  if (courseMetadata.path === 'db') {
    return NextResponse.json({ error: 'Course stored in database' }, { status: 409 });
  }
  
  // Получаем путь к файлу и загружаем YAML
  const courseFilePath = getCourseFilePath(courseId);
  const yamlContent = loadCourseYaml(courseFilePath);
  
  // Преобразуем YAML в блоки
  const blocks = convertYamlToBlocks(yamlContent);
  
  return NextResponse.json({ course: courseMetadata, blocks });
}
```

---

## Редактирование курса

### Интерфейс редактора

Редактор имеет триколонный интерфейс:

1. **Левая панель (Structure)** - структура курса
   - Список всех блоков курса
   - Drag & Drop для изменения порядка
   - Выбор блока для редактирования
   - Кнопка добавления новых блоков

2. **Центральная панель (Content)** - содержимое выбранного блока
   - Форма редактирования свойств блока
   - Разные поля в зависимости от типа блока
   - AI Assistant для улучшения контента

3. **Правая панель (Properties)** - дополнительные свойства
   - Общие свойства (parseMode, linkPreview)
   - Метаданные блока

### Операции редактирования

#### Добавление блока

```typescript
const handleAddBlock = (type: BlockType) => {
  const newId = type === "Section" ? `section_${Date.now()}` : `block_${Date.now()}`;
  const newBlock: Block = {
    id: newId,
    type,
    parseMode: "TEXT",
    linkPreview: false,
    // ... специфичные поля для типа
  };
  setBlocks([...blocks, newBlock]);
};
```

#### Удаление блока

```typescript
const handleDeleteBlock = (id: string) => {
  if (confirm("Are you sure?")) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }
};
```

#### Изменение порядка (Drag & Drop)

```typescript
const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
  e.preventDefault();
  const draggedIndex = blocks.findIndex((b) => b.id === draggedBlockId);
  const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);
  
  const newBlocks = [...blocks];
  const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
  newBlocks.splice(targetIndex, 0, draggedBlock);
  setBlocks(newBlocks);
};
```

#### Обновление свойств блока

```typescript
const handleUpdateBlock = (id: string, updates: Partial<Block>) => {
  setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
};
```

### Валидация

Перед сохранением выполняется валидация блоков:

```typescript
const validateBlocks = (): string[] => {
  const errors: string[] = [];
  
  for (const block of blocks) {
    switch (block.type) {
      case "Section":
        if (!block.title?.trim()) {
          errors.push(`Section "${block.id}": заголовок обязателен`);
        }
        break;
      case "Message":
        if (!block.text?.trim()) {
          errors.push(`Message "${block.id}": текст обязателен`);
        }
        break;
      case "Quiz":
        if (!block.question?.trim()) {
          errors.push(`Quiz "${block.id}": вопрос обязателен`);
        }
        if (!block.answers || block.answers.length < 2) {
          errors.push(`Quiz "${block.id}": необходимо минимум 2 варианта ответа`);
        }
        if (!block.answers?.some(a => a.correct)) {
          errors.push(`Quiz "${block.id}": должен быть хотя бы один правильный ответ`);
        }
        break;
      // ... другие типы
    }
  }
  
  return errors;
};
```

---

## Сохранение курса

### Процесс сохранения

1. **Пользователь нажимает "Save draft"**

2. **Frontend валидирует данные:**
   - Проверяет обязательные поля всех блоков
   - Показывает ошибки, если есть

3. **Frontend отправляет запрос:**
   ```typescript
   PUT /api/course-editor/courses/{courseId}
   {
     "blocks": [ ... ],
     "settings": { ... }
   }
   ```

4. **Backend обрабатывает запрос:**
   - Валидирует входные данные
   - Преобразует блоки в YAML формат (`convertBlocksToYaml`)
   - Сохраняет YAML файл курса (`saveCourseYaml`)
   - Обновляет метаданные в `courses.yml`, если нужно
   - Создает backup файла перед перезаписью

5. **Backend возвращает подтверждение:**
   ```json
   {
     "course_id": "ai_bee1_v12",
     "path": "scripts/ai_bee1_v12.yml",
     "saved_at": "2024-12-20T10:30:00Z",
     "message": "Draft saved successfully"
   }
   ```

### Код сохранения (Frontend)

```typescript
const handleSave = async () => {
  // Валидация
  const validationErrors = validateBlocks();
  if (validationErrors.length > 0) {
    toast({ title: "Ошибки валидации", description: validationErrors.join(", ") });
    return;
  }
  
  setSaving(true);
  try {
    const response = await fetch(`/api/course-editor/courses/${courseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    
    if (!response.ok) throw new Error("Ошибка сохранения");
    
    toast({ title: "Курс сохранен", description: "Черновик успешно сохранен" });
  } catch (err) {
    toast({ title: "Ошибка сохранения", variant: "destructive" });
  } finally {
    setSaving(false);
  }
};
```

### Код сохранения (Backend)

```typescript
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const courseId = params.id;
  const body = await request.json();
  
  // Валидация
  if (!body.blocks || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: 'blocks array is required' }, { status: 400 });
  }
  
  // Получаем метаданные и путь к файлу
  const courseMetadata = getCourseMetadata(courseId);
  const courseFilePath = getCourseFilePath(courseId);
  
  // Преобразуем блоки в YAML
  const yamlContent = convertBlocksToYaml(body.blocks);
  
  // Сохраняем YAML файл
  saveCourseYaml(courseFilePath, yamlContent);
  
  // Обновляем метаданные, если нужно
  if (body.settings) {
    updateCourseMetadata(courseId, body.settings);
  }
  
  return NextResponse.json({ course_id: courseId, message: 'Draft saved successfully' });
}
```

### Безопасность сохранения

- **Атомарная запись:** файл пишется во временный файл, затем переименовывается
- **Backup:** создается резервная копия перед перезаписью (`*.backup`)
- **Валидация:** проверка данных перед записью
- **Обработка ошибок:** понятные сообщения об ошибках

---

## Преобразование данных

Редактор работает с двумя форматами данных:
- **YAML** - формат хранения курсов в файлах
- **Блоки (Blocks)** - внутренний формат редактора для удобного редактирования

### YAML → Блоки

Функция `convertYamlToBlocks` преобразует YAML структуру в массив блоков:

```typescript
export function convertYamlToBlocks(yamlContent: Record<string, any>): Block[] {
  const blocks: Block[] = [];
  
  // Проходим по всем ключам верхнего уровня (element_id)
  for (const [elementId, elementData] of Object.entries(yamlContent)) {
    const elementType = elementData.type;
    
    switch (elementType) {
      case 'section':
        blocks.push(convertSectionToBlock(elementId, elementData));
        break;
      case 'message':
        blocks.push(convertMessageToBlock(elementId, elementData));
        break;
      // ... другие типы
    }
  }
  
  return blocks;
}
```

**Пример преобразования:**

**YAML:**
```yaml
Section_Intro:
  type: section
  title: Введение

Test_Quiz_01:
  type: quiz
  text: Important (1/5)
  answers:
    - text: Viral
      feedback: Почти, но это не совсем то.
    - text: Essential
      correct: yes
      feedback: Отлично!
```

**Блоки:**
```typescript
[
  {
    id: "Section_Intro",
    type: "Section",
    title: "Введение",
    parseMode: "TEXT",
    linkPreview: false
  },
  {
    id: "Test_Quiz_01",
    type: "Quiz",
    question: "Important (1/5)",
    answers: [
      { text: "Viral", correct: false },
      { text: "Essential", correct: true }
    ],
    parseMode: "TEXT",
    linkPreview: false
  }
]
```

### Блоки → YAML

Функция `convertBlocksToYaml` преобразует массив блоков обратно в YAML:

```typescript
export function convertBlocksToYaml(blocks: Block[]): Record<string, any> {
  const yamlContent: Record<string, any> = {};
  
  for (const block of blocks) {
    switch (block.type) {
      case 'Section':
        yamlContent[block.id] = convertSectionToYaml(block);
        break;
      case 'Message':
        yamlContent[block.id] = convertMessageToYaml(block);
        break;
      // ... другие типы
    }
  }
  
  return yamlContent;
}
```

### Особенности преобразования

1. **Порядок элементов:** порядок блоков в редакторе соответствует порядку элементов в YAML
2. **Типы данных:**
   - `parse_mode`: `"HTML"` / `"MARKDOWN"` / `"TEXT"` ↔ `"HTML"` / `"MARKDOWN"` / отсутствует
   - `link_preview`: `true`/`false` ↔ `"yes"`/`"no"` или отсутствует
   - `correct`: `true`/`false` ↔ `"yes"` / отсутствует
3. **Опциональные поля:** поля со значениями по умолчанию не сохраняются в YAML
4. **Section элементы:** сохраняются в YAML, но игнорируются чатботом при выполнении курса

---

## API Endpoints

### GET /api/course-editor/courses/{courseId}

Загружает курс из YAML файла.

**Response:**
```json
{
  "course": {
    "course_id": "ai_bee1_v12",
    "path": "scripts/ai_bee1_v12.yml",
    "element": "StartElement",
    "restricted": false,
    ...
  },
  "yaml_content": { ... },
  "blocks": [ ... ]
}
```

**Ошибки:**
- `404` - курс не найден в `courses.yml`
- `409` - курс хранится в БД (`path: "db"`)
- `500` - ошибка сервера

### PUT /api/course-editor/courses/{courseId}

Сохраняет курс в YAML файл.

**Request:**
```json
{
  "blocks": [ ... ],
  "settings": {
    "element": "StartElement",
    "restricted": false,
    ...
  }
}
```

**Response:**
```json
{
  "course_id": "ai_bee1_v12",
  "path": "scripts/ai_bee1_v12.yml",
  "saved_at": "2024-12-20T10:30:00Z",
  "message": "Draft saved successfully"
}
```

**Ошибки:**
- `400` - невалидные данные
- `404` - курс не найден
- `409` - курс хранится в БД
- `500` - ошибка сервера

### POST /api/course-editor/courses

Создает новый курс.

**Request:**
```json
{
  "course_id": "new_course",
  "title": "Новый курс",
  "blocks": [ ... ],
  "settings": { ... }
}
```

**Response:**
```json
{
  "course_id": "new_course",
  "path": "scripts/new_course.yml",
  "course": { ... }
}
```

### DELETE /api/course-editor/courses/{courseId}

Удаляет курс (удаляет YAML файл и запись из `courses.yml`).

**Response:**
```json
{
  "course_id": "ai_bee1_v12",
  "message": "Course deleted successfully"
}
```

---

## Типы блоков

Редактор поддерживает 5 типов блоков (в MVP):

### 1. Section

Разделитель секций для визуальной организации курса.

**Поля:**
- `id` - уникальный идентификатор
- `type: "Section"`
- `title` - название секции (обязательно)

**YAML формат:**
```yaml
Section_Intro:
  type: section
  title: Введение
```

**Примечание:** Section элементы сохраняются в YAML, но игнорируются чатботом при выполнении курса.

### 2. Message

Текстовое сообщение от бота.

**Поля:**
- `id` - уникальный идентификатор
- `type: "Message"`
- `text` - текст сообщения (обязательно)
- `title` - заголовок (опционально)
- `parseMode` - режим форматирования: `"TEXT"` | `"MARKDOWN"` | `"HTML"`
- `linkPreview` - показывать ли превью ссылок: `true` | `false`

**YAML формат:**
```yaml
Test_Message_01:
  type: message
  text: |
    Привет! Рад тебя видеть!
  parse_mode: MARKDOWN
  link_preview: no
```

### 3. Quiz

Викторина с одним правильным ответом.

**Поля:**
- `id` - уникальный идентификатор
- `type: "Quiz"`
- `question` - вопрос викторины (обязательно)
- `answers` - массив вариантов ответов (обязательно, минимум 2)
  - `text` - текст варианта
  - `correct` - правильный ответ: `true` | `false`
- `parseMode` - режим форматирования
- `linkPreview` - показывать ли превью ссылок

**YAML формат:**
```yaml
Test_Quiz_01:
  type: quiz
  text: Important (1/5)
  answers:
    - text: Viral
      feedback: Почти, но это не совсем то.
    - text: Essential
      correct: yes
      feedback: Отлично!
```

### 4. Input

Поле ввода текста пользователем.

**Поля:**
- `id` - уникальный идентификатор
- `type: "Input"`
- `prompt` - вопрос или инструкция (обязательно)
- `normalization` - тип нормализации: `"text"` | `"sequence"`
- `correctAnswer` - правильный ответ (опционально)
- `feedbackCorrect` - сообщение при правильном ответе (опционально)
- `feedbackIncorrect` - сообщение при неправильном ответе (опционально)
- `parseMode` - режим форматирования
- `linkPreview` - показывать ли превью ссылок

**YAML формат:**
```yaml
Question_01:
  type: input
  text: Кто президент США?
  correct_answer: Байден
  feedback_correct: Правильно!
  feedback_incorrect: Неправильно. Правильный ответ: Байден
  input_type: text
```

### 5. Dialog

Диалог с ИИ-ассистентом.

**Поля:**
- `id` - уникальный идентификатор
- `type: "Dialog"`
- `text` - начальное сообщение от бота (обязательно)
- `systemPrompt` - системный промпт для ИИ (обязательно)
- `temperature` - температура для генерации (по умолчанию 0.7)
- `maxTokens` - максимальное количество токенов (по умолчанию 150)
- `model` - модель ИИ (опционально)
- `parseMode` - режим форматирования (`"HTML"` → `"HTML!"` в YAML)
- `linkPreview` - показывать ли превью ссылок

**YAML формат:**
```yaml
Taboo_lesson_08:
  type: dialog
  text: >
    Давай обсудим. Как ты понял(а), почему задания не подходят для первого урока?
  prompt: >
    # Persona
    
    Your role is a friendly teacher who created the course.
    You are talking with a user who has just started the course.
  model: gpt-4
  temperature: 0.7
```

---

## Структура файлов

### courses.yml

Файл со списком всех курсов и их метаданными:

```yaml
course_id:
  path: scripts/course_file.yml  # Путь к файлу курса
  element: StartElement           # Опционально: начальный элемент
  restricted: yes                 # Опционально: ограниченный доступ
  decline_text: "..."             # Опционально: текст отказа
  ban_enabled: yes                # Опционально: включены блокировки
  ban_text: "..."                 # Опционально: текст блокировки
```

**Расположение:** `scripts/courses.yml`

### Файлы курсов

YAML файлы с элементами курса:

```yaml
Element_ID:
  type: message
  text: "Текст сообщения"
  button: "Текст кнопки"  # Опционально
  parse_mode: HTML        # Опционально
  link_preview: no        # Опционально

Another_Element_ID:
  type: quiz
  text: "Вопрос"
  answers:
    - text: "Вариант 1"
      correct: yes
      feedback: "Правильно!"
    - text: "Вариант 2"
      feedback: "Неправильно"
```

**Расположение:** `scripts/{bot_folder}/*.yml` или путь из `courses.yml`

### Работа с файлами

**Чтение:**
- Чтение `courses.yml` для получения метаданных
- Чтение YAML файла курса по пути из метаданных
- Парсинг YAML в объект JavaScript

**Запись:**
- Создание backup перед перезаписью
- Атомарная запись (временный файл → переименование)
- Сохранение порядка элементов
- Обновление `courses.yml` при изменении метаданных

**Обработка ошибок:**
- Файл не найден → 404
- Ошибка парсинга YAML → 400 с деталями ошибки
- Ошибка записи → 500
- Курс в БД (`path: "db"`) → 409

---

## Состояния редактора

Редактор имеет следующие состояния:

1. **Loading** - загрузка курса из файла
   - Показывается spinner
   - Блокируется интерфейс

2. **Editing** - редактирование курса
   - Нормальное состояние работы
   - Все функции доступны

3. **Saving** - сохранение изменений
   - Показывается индикатор "Saving..."
   - Блокируется кнопка сохранения

4. **Error** - ошибка загрузки/сохранения
   - Показывается сообщение об ошибке
   - Предлагается повторить операцию

5. **Dirty** - есть несохраненные изменения
   - Предупреждение при попытке закрыть страницу
   - (В будущем: автосохранение)

---

## Ограничения MVP

### Поддерживаемые типы элементов (5 типов)

- ✅ Section (`type: section`)
- ✅ Message (`type: message`)
- ✅ Quiz (`type: quiz`)
- ✅ Input (`type: input`)
- ✅ Dialog (`type: dialog`)

### Не поддерживаются в MVP

- ❌ Audio (`type: audio`)
- ❌ Question (`type: question`)
- ❌ MultiChoice (`type: multi_choice`)
- ❌ Test (`type: test`)
- ❌ Jump (`type: jump`)
- ❌ Revision (`type: revision`)
- ❌ Delay (`type: delay`)
- ❌ End (`type: end`)

### Другие ограничения

- Комментарии в YAML могут теряться при сохранении
- Форматирование YAML может изменяться (многострочный текст)
- Курсы с `path: "db"` не могут быть отредактированы (требуют экспорта в YAML)
- Нет истории изменений
- Нет автосохранения
- Нет предпросмотра курса

---

## Связанные документы

- `docs/course_editor_structure.md` - структура папки course_editor
- `docs/reqs/course_editor_production_requirements.md` - требования к редактору
- `docs/elements.md` - документация по типам элементов
- `docs/dialog_element.md` - документация по элементу Dialog
