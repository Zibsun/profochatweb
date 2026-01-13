# Course Editor: Работа с курсами

Документ описывает, как Course Editor загружает и сохраняет курсы.

## Содержание

- [Обзор](#обзор)
- [Структура хранения курсов](#структура-хранения-курсов)
- [Загрузка курсов](#загрузка-курсов)
- [Сохранение курсов](#сохранение-курсов)
- [Файлы и пути](#файлы-и-пути)
- [Ограничения](#ограничения)

---

## Обзор

Course Editor работает с курсами, которые хранятся в двух местах:

1. **YAML файлы** - курсы хранятся в файлах формата YAML в папке `scripts/`
2. **База данных** - некоторые курсы могут храниться в БД (обозначаются как `path: "db"`)

Редактор может редактировать только курсы из YAML файлов. Курсы из БД не могут быть отредактированы через редактор.

---

## Структура хранения курсов

### Файл метаданных: `scripts/courses.yml`

Файл `scripts/courses.yml` содержит метаданные всех курсов в системе. Каждый курс описывается следующим образом:

```yaml
course_id:
  path: scripts/course_file.yml  # или "db" для курсов из БД
  element: StartElement           # опционально
  restricted: false               # опционально
  decline_text: "..."             # опционально
  ban_enabled: false              # опционально
  ban_text: "..."                 # опционально
```

**Пример:**
```yaml
default:
  path: scripts/default.yml
test:
  path: scripts/test.yml
testdb:
  path: db                        # Курс из БД - не редактируется
ai_bee1_v12:
  path: scripts/ai_bee1_v12.yml
  element: StartElement
  restricted: false
```

### Файлы курсов: `scripts/*.yml`

Каждый курс (кроме курсов из БД) хранится в отдельном YAML файле. Путь к файлу указывается в `courses.yml` в поле `path`.

**Пример структуры файла курса:**
```yaml
StartElement:
  type: Message
  text: "Добро пожаловать!"
  next: section1

section1:
  type: Section
  title: "Раздел 1"
  ...
```

---

## Загрузка курсов

### Процесс загрузки

1. **Получение метаданных из `courses.yml`**
   - Редактор загружает файл `scripts/courses.yml`
   - Ищет курс по `course_id` в запросе
   - Получает метаданные курса (включая `path`)

2. **Проверка источника курса**
   - Если `path === "db"`, курс хранится в БД
   - Редактор возвращает ошибку 409: "Course stored in database"
   - Курсы из БД не могут быть отредактированы через редактор

3. **Определение пути к файлу курса**
   - Если `path` начинается с `scripts/`, используется как есть
   - Если `path` относительный, добавляется префикс `scripts/`
   - Абсолютные пути используются без изменений
   - Функция `getCourseFilePath()` нормализует путь

4. **Загрузка YAML файла курса**
   - Файл читается из файловой системы
   - Парсится через библиотеку `js-yaml`
   - Возвращается объект JavaScript

5. **Преобразование в блоки редактора**
   - YAML структура преобразуется в блоки через `convertYamlToBlocks()`
   - Каждый элемент YAML становится блоком в редакторе
   - Блоки отображаются в интерфейсе редактора

### API Endpoint: `GET /api/course-editor/courses/{courseId}`

**Код обработки (Backend):**
```typescript
// webapp/frontend/app/api/course-editor/courses/[id]/route.ts

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const courseId = params.id;
  
  // 1. Получаем метаданные из courses.yml
  const courseMetadata = getCourseMetadata(courseId);
  if (!courseMetadata) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  
  // 2. Проверяем, что курс не в БД
  if (courseMetadata.path === 'db') {
    return NextResponse.json({ 
      error: 'Course stored in database',
      message: 'Course cannot be edited through the editor'
    }, { status: 409 });
  }
  
  // 3. Получаем путь к файлу курса
  const courseFilePath = getCourseFilePath(courseId);
  if (!courseFilePath) {
    return NextResponse.json({ error: 'Course file path not found' }, { status: 404 });
  }
  
  // 4. Загружаем YAML файл курса
  const yamlContent = loadCourseYaml(courseFilePath);
  
  // 5. Преобразуем YAML в блоки редактора
  const blocks = convertYamlToBlocks(yamlContent);
  
  return NextResponse.json({
    course: courseMetadata,
    yaml_content: yamlContent,
    blocks
  });
}
```

**Код загрузки (Frontend):**
```typescript
// webapp/frontend/components/course-editor/CourseEditor.tsx

const loadCourse = async (id: string) => {
  setLoading(true);
  try {
    const response = await fetch(`/api/course-editor/courses/${id}`);
    
    if (!response.ok) {
      if (response.status === 409) {
        setError('Курс хранится в базе данных и не может быть отредактирован');
      } else {
        setError('Ошибка загрузки курса');
      }
      return;
    }
    
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

### Утилиты для загрузки

**`yaml-utils.ts`** содержит функции:

- `loadCoursesYaml()` - загружает `scripts/courses.yml`
- `getCourseMetadata(courseId)` - получает метаданные курса
- `getCourseFilePath(courseId)` - определяет путь к файлу курса
- `loadCourseYaml(filePath)` - загружает YAML файл курса
- `normalizeCoursePath(path)` - нормализует путь к файлу

---

## Сохранение курсов

### Процесс сохранения

1. **Валидация блоков**
   - Проверка уникальности ID блоков
   - Проверка обязательных полей для каждого типа блока
   - Проверка формата ID (только буквы, цифры, подчеркивания)

2. **Преобразование блоков в YAML**
   - Блоки редактора преобразуются в YAML структуру через `convertBlocksToYaml()`
   - Сохраняется структура и порядок элементов
   - Генерируется валидный YAML формат

3. **Создание backup**
   - Перед сохранением создается backup файла: `{filename}.backup`
   - Если файл существует, он копируется в backup

4. **Сохранение YAML файла**
   - YAML записывается во временный файл: `{filename}.tmp`
   - После успешной записи файл переименовывается в основной
   - Это обеспечивает атомарность операции

5. **Обновление метаданных в `courses.yml`**
   - Если изменились настройки курса (element, restricted, etc.)
   - Метаданные обновляются в `courses.yml`
   - Также создается backup файла `courses.yml`

### API Endpoint: `PUT /api/course-editor/courses/{courseId}`

**Код обработки (Backend):**
```typescript
// webapp/frontend/app/api/course-editor/courses/[id]/route.ts

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const courseId = params.id;
  const body = await request.json();
  
  // Валидация
  if (!body.blocks || !Array.isArray(body.blocks)) {
    return NextResponse.json({ error: 'blocks array is required' }, { status: 400 });
  }
  
  // Получаем метаданные курса
  const courseMetadata = getCourseMetadata(courseId);
  if (!courseMetadata) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }
  
  // Проверяем, что курс не в БД
  if (courseMetadata.path === 'db') {
    return NextResponse.json({ 
      error: 'Course stored in database' 
    }, { status: 409 });
  }
  
  // Получаем путь к файлу курса
  const courseFilePath = getCourseFilePath(courseId);
  if (!courseFilePath) {
    return NextResponse.json({ error: 'Course file path not found' }, { status: 404 });
  }
  
  // Преобразуем блоки в YAML
  const yamlContent = convertBlocksToYaml(body.blocks);
  
  // Сохраняем YAML файл курса
  saveCourseYaml(courseFilePath, yamlContent);
  
  // Обновляем метаданные в courses.yml, если они изменились
  if (body.settings) {
    updateCourseMetadata(courseId, {
      element: body.settings.element,
      restricted: body.settings.restricted,
      decline_text: body.settings.decline_text,
      ban_enabled: body.settings.ban_enabled,
      ban_text: body.settings.ban_text,
    });
  }
  
  return NextResponse.json({
    course_id: courseId,
    path: courseMetadata.path,
    saved_at: new Date().toISOString(),
    message: 'Draft saved successfully'
  });
}
```

**Код сохранения (Frontend):**
```typescript
// webapp/frontend/components/course-editor/CourseEditor.tsx

const handleSave = async () => {
  // Валидация
  const validationErrors = validateBlocks();
  if (validationErrors.length > 0) {
    // Показать ошибки валидации
    return;
  }
  
  setSaving(true);
  
  try {
    const url = isNewCourse 
      ? "/api/course-editor/courses"
      : `/api/course-editor/courses/${courseId}`;
    
    const method = isNewCourse ? "POST" : "PUT";
    
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course_id: courseId || courseTitle,
        blocks,
        settings: {}
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ошибка сохранения');
    }
    
    // Успешное сохранение
    toast({ title: "Курс сохранен", description: "Черновик успешно сохранен" });
  } catch (err) {
    setError(`Ошибка сохранения: ${err.message}`);
  } finally {
    setSaving(false);
  }
};
```

### Создание нового курса

При создании нового курса используется `POST /api/course-editor/courses`:

1. Валидация `course_id` (только буквы, цифры, подчеркивания, дефисы)
2. Определение пути к файлу (по умолчанию: `{courseId}.yml`)
3. Нормализация пути (добавление префикса `scripts/` при необходимости)
4. Сохранение YAML файла курса
5. Добавление записи в `courses.yml` через `addCourseToCoursesYaml()`

### Утилиты для сохранения

**`yaml-utils.ts`** содержит функции:

- `saveCourseYaml(filePath, courseData)` - сохраняет YAML файл курса
- `saveCoursesYaml(courses)` - сохраняет `courses.yml`
- `updateCourseMetadata(courseId, metadata)` - обновляет метаданные курса
- `addCourseToCoursesYaml(courseId, path, metadata)` - добавляет новый курс

---

## Файлы и пути

### Структура файлов

```
profochatweb/
├── scripts/
│   ├── courses.yml              # Метаданные всех курсов
│   ├── default.yml              # Файл курса "default"
│   ├── test.yml                 # Файл курса "test"
│   ├── ai_bee1_v12.yml          # Файл курса "ai_bee1_v12"
│   └── ...
└── webapp/
    └── frontend/
        ├── app/
        │   └── api/
        │       └── course-editor/
        │           └── courses/
        │               ├── route.ts              # POST: создание курса
        │               └── [id]/route.ts         # GET/PUT/DELETE: работа с курсом
        └── lib/
            └── course-editor/
                ├── yaml-utils.ts                 # Утилиты для работы с YAML
                └── yaml-converter.ts             # Преобразование YAML ↔ Блоки
```

### Нормализация путей

Пути к файлам курсов нормализуются согласно следующим правилам:

1. Если `path === "db"` → курс из БД, путь не используется
2. Если `path` начинается с `scripts/` → используется как есть
3. Если `path` относительный → добавляется префикс `scripts/`
4. Если `path` абсолютный → используется без изменений

**Примеры нормализации:**

| Входной путь | Нормализованный путь |
|--------------|---------------------|
| `"db"` | `"db"` (курс из БД) |
| `"scripts/test.yml"` | `"scripts/test.yml"` |
| `"test.yml"` | `"scripts/test.yml"` |
| `"/absolute/path.yml"` | `"/absolute/path.yml"` |

**Функция нормализации:**
```typescript
export function normalizeCoursePath(coursePath: string): string {
  if (coursePath === 'db') {
    return 'db';
  }
  if (coursePath.startsWith('scripts/')) {
    return coursePath;
  }
  if (!path.isAbsolute(coursePath)) {
    return `scripts/${coursePath}`;
  }
  return coursePath;
}
```

### Определение пути к файлу курса

Функция `getCourseFilePath(courseId)` определяет полный путь к файлу курса:

1. Загружает `courses.yml`
2. Находит курс по `courseId`
3. Если `path === "db"`, возвращает `null`
4. Нормализует путь через `normalizeCoursePath()`
5. Если путь начинается с `scripts/`, объединяет с `PROJECT_ROOT`
6. Если путь абсолютный, возвращает как есть
7. Иначе объединяет с `SCRIPTS_DIR`

---

## Ограничения

### Курсы из базы данных

- Курсы с `path: "db"` **не могут быть отредактированы** через редактор
- При попытке загрузки возвращается ошибка 409
- Сообщение: "Course stored in database and cannot be edited through the editor"
- Для редактирования таких курсов их нужно сначала экспортировать в YAML

### Валидация course_id

- Разрешены только символы: `a-z`, `A-Z`, `0-9`, `_`, `-`
- Не может быть пустым
- Проверка выполняется через `validateCourseId()`

### Валидация пути

- Не может быть пустым
- Не может содержать `..` (защита от path traversal)
- Может быть `"db"` для курсов из БД
- Проверка выполняется через `validateCoursePath()`

### Backup файлов

- Перед сохранением создается backup: `{filename}.backup`
- Backup создается для:
  - Файлов курсов (`scripts/*.yml`)
  - Файла метаданных (`scripts/courses.yml`)
- Backup перезаписывается при каждом сохранении

### Атомарность операций

- Сохранение выполняется атомарно:
  1. Запись во временный файл: `{filename}.tmp`
  2. Переименование в основной файл
- Это предотвращает повреждение файлов при сбоях

---

## Связанные документы

- `docs/course_editor_how_it_works.md` - общее описание работы редактора
- `docs/course_editor_structure.md` - структура компонентов редактора
- `webapp/frontend/lib/course-editor/yaml-utils.ts` - исходный код утилит
- `webapp/frontend/app/api/course-editor/courses/[id]/route.ts` - API endpoints
