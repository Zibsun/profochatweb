# Course Editor: Интеграция с базой данных

Документ описывает, как можно переделать Course Editor для работы с курсами из базы данных вместо YAML файлов.

## Содержание

- [Обзор](#обзор)
- [Текущая ситуация](#текущая-ситуация)
- [Целевая архитектура](#целевая-архитектура)
- [Структура базы данных](#структура-базы-данных)
- [API Endpoints](#api-endpoints)
- [Преобразование данных](#преобразование-данных)
- [Миграция существующих курсов](#миграция-существующих-курсов)
- [План реализации](#план-реализации)

---

## Обзор

### Цель

Переделать Course Editor для работы с курсами, хранящимися в базе данных PostgreSQL, вместо YAML файлов. Это позволит:

- ✅ Редактировать курсы из БД через веб-интерфейс
- ✅ Централизованное хранение всех курсов
- ✅ Поддержка мультитенантности (изоляция по аккаунтам)
- ✅ Версионирование и история изменений
- ✅ Совместная работа над курсами
- ✅ Управление доступом и правами

### Текущие ограничения

Сейчас Course Editor:
- ❌ Работает только с YAML файлами
- ❌ Не может редактировать курсы из БД (`path: "db"`)
- ❌ Возвращает ошибку 409 при попытке загрузить курс из БД

---

## Текущая ситуация

### Как работает сейчас

1. **Загрузка курсов:**
   - Читает `scripts/courses.yml` для получения метаданных
   - Если `path === "db"`, возвращает ошибку 409
   - Иначе загружает YAML файл из `scripts/*.yml`

2. **Сохранение курсов:**
   - Сохраняет в YAML файл
   - Обновляет метаданные в `courses.yml`

3. **Курсы из БД:**
   - Обозначаются как `path: "db"` в `courses.yml`
   - Не могут быть отредактированы через редактор
   - Загружаются через Python код (`course.py`, `CourseRepository`)

### Примеры работы с БД в других страницах

**Паттерн работы с БД (из `webapp/frontend/app/api/bots/route.ts`):**

```typescript
import { query, queryOne, getAccountId } from '@/lib/db';

export async function GET(request: NextRequest) {
  const accountId = getAccountId(request);
  
  const bots = await query<Bot>(
    `SELECT bot_id, bot_name, display_name, ...
     FROM bot
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [accountId]
  );
  
  return NextResponse.json({ bots });
}
```

**Ключевые функции из `@/lib/db`:**
- `query<T>(sql, params)` - выполнение SQL запроса, возвращает массив строк
- `queryOne<T>(sql, params)` - выполнение SQL запроса, возвращает первую строку или null
- `getAccountId(request)` - получение account_id из контекста запроса

---

## Целевая архитектура

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
       │ SQL Queries
       ▼
┌─────────────────────┐
│   PostgreSQL DB     │
│  - course           │
│  - course_element   │
└─────────────────────┘
```

### Два режима работы

1. **Режим БД (приоритетный):**
   - Курсы загружаются из таблиц `course` и `course_element`
   - Сохраняются обратно в БД
   - Метаданные хранятся в таблице `course`

2. **Режим YAML (legacy):**
   - Для обратной совместимости
   - Курсы из YAML файлов продолжают работать
   - Можно экспортировать YAML → БД

---

## Структура базы данных

### Таблица `course`

Метаданные курсов (SaaS схема).

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `course_id` | text (PK) | Идентификатор курса |
| `account_id` | int4 (PK, FK) | Идентификатор аккаунта |
| `title` | text | Название курса |
| `description` | text | Описание курса |
| `creator_id` | int8 | Telegram user ID создателя |
| `created_at` | timestamp | Дата создания |
| `updated_at` | timestamp | Дата последнего обновления |
| `yaml` | text | YAML представление (опционально) |
| `metadata` | jsonb | Дополнительные метаданные |
| `is_active` | boolean | Флаг активности |

**Составной первичный ключ:** `(course_id, account_id)`

**Метаданные курса в `metadata` (jsonb):**
```json
{
  "element": "StartElement",
  "restricted": false,
  "decline_text": "...",
  "ban_enabled": false,
  "ban_text": "..."
}
```

### Таблица `course_element`

Элементы курсов.

**Структура:**

| Поле | Тип | Описание |
|------|-----|----------|
| `course_element_id` | int8 (PK) | Уникальный идентификатор |
| `course_id` | text | Идентификатор курса |
| `account_id` | int4 | Идентификатор аккаунта |
| `element_id` | text | ID элемента (например, "Ex1_2") |
| `json` | text | JSON-строка с данными элемента |
| `element_type` | text | Тип элемента (message, quiz, test, etc.) |
| `created_at` | timestamp | Дата создания |

**Уникальное ограничение:** `(course_id, account_id, element_id)`

**Индексы:**
- `idx_course_element_course` на `(course_id, account_id)`
- `idx_course_element_type` на `(course_id, account_id, element_type)`
- `idx_course_element_order` на `(course_id, account_id, course_element_id)`

**Структура JSON в поле `json`:**
```json
{
  "element_data": {
    "type": "Message",
    "text": "Добро пожаловать!",
    "next": "section1"
  }
}
```

---

## API Endpoints

### GET /api/course-editor/courses/{courseId}

**Загрузка курса из БД.**

**Логика:**
1. Проверяем, существует ли курс в БД
2. Если нет в БД, проверяем YAML файлы (legacy режим)
3. Загружаем метаданные из таблицы `course`
4. Загружаем элементы из таблицы `course_element`
5. Преобразуем элементы в блоки редактора

**Пример реализации:**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const accountId = getAccountId(request);

    // 1. Проверяем существование курса в БД
    const course = await queryOne<{
      course_id: string;
      title: string | null;
      description: string | null;
      metadata: any;
      yaml: string | null;
    }>(
      `SELECT course_id, title, description, metadata, yaml
       FROM course
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    if (course) {
      // Курс найден в БД
      // 2. Загружаем элементы курса
      const elements = await query<{
        element_id: string;
        json: string;
        element_type: string;
      }>(
        `SELECT element_id, json, element_type
         FROM course_element
         WHERE course_id = $1 AND account_id = $2
         ORDER BY course_element_id`,
        [courseId, accountId]
      );

      // 3. Преобразуем элементы в YAML структуру
      const yamlContent: Record<string, any> = {};
      for (const elem of elements) {
        const jsonData = JSON.parse(elem.json);
        yamlContent[elem.element_id] = jsonData.element_data;
      }

      // 4. Преобразуем YAML в блоки редактора
      const blocks = convertYamlToBlocks(yamlContent);

      // 5. Извлекаем метаданные
      const metadata = course.metadata || {};
      
      return NextResponse.json({
        course: {
          course_id: course.course_id,
          path: 'db', // Указываем, что курс из БД
          element: metadata.element,
          restricted: metadata.restricted,
          decline_text: metadata.decline_text,
          ban_enabled: metadata.ban_enabled,
          ban_text: metadata.ban_text,
          title: course.title,
          description: course.description,
        },
        yaml_content: yamlContent,
        blocks,
        source: 'database',
      });
    }

    // Курс не найден в БД, пробуем загрузить из YAML (legacy)
    // ... существующая логика загрузки из YAML ...
    
  } catch (error) {
    console.error('Error loading course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### PUT /api/course-editor/courses/{courseId}

**Сохранение курса в БД.**

**Логика:**
1. Преобразуем блоки в YAML структуру
2. Сохраняем метаданные в таблицу `course`
3. Удаляем старые элементы курса
4. Сохраняем новые элементы в таблицу `course_element`
5. Обновляем `updated_at` в метаданных

**Пример реализации:**

```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const accountId = getAccountId(request);
    const body = await request.json();

    // Валидация
    if (!body.blocks || !Array.isArray(body.blocks)) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'blocks array is required' },
        { status: 400 }
      );
    }

    // 1. Преобразуем блоки в YAML
    const yamlContent = convertBlocksToYaml(body.blocks);

    // 2. Проверяем существование курса
    const existingCourse = await queryOne<{ course_id: string }>(
      `SELECT course_id FROM course
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    // 3. Подготавливаем метаданные
    const metadata = {
      element: body.settings?.element,
      restricted: body.settings?.restricted,
      decline_text: body.settings?.decline_text,
      ban_enabled: body.settings?.ban_enabled,
      ban_text: body.settings?.ban_text,
    };

    if (existingCourse) {
      // Обновляем существующий курс
      await query(
        `UPDATE course
         SET title = $3,
             description = $4,
             metadata = $5,
             yaml = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE course_id = $1 AND account_id = $2`,
        [
          courseId,
          accountId,
          body.settings?.title || null,
          body.settings?.description || null,
          JSON.stringify(metadata),
          yaml.dump(yamlContent), // YAML представление для совместимости
        ]
      );
    } else {
      // Создаем новый курс
      await query(
        `INSERT INTO course (
          course_id, account_id, title, description,
          metadata, yaml, creator_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          courseId,
          accountId,
          body.settings?.title || null,
          body.settings?.description || null,
          JSON.stringify(metadata),
          yaml.dump(yamlContent),
          null, // TODO: получить creator_id из сессии
        ]
      );
    }

    // 4. Удаляем старые элементы
    await query(
      `DELETE FROM course_element
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    // 5. Сохраняем новые элементы
    for (const [elementId, elementData] of Object.entries(yamlContent)) {
      const elementType = (elementData as any).type || 'message';
      const jsonData = JSON.stringify({ element_data: elementData });

      await query(
        `INSERT INTO course_element (
          course_id, account_id, element_id, json, element_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [courseId, accountId, elementId, jsonData, elementType]
      );
    }

    return NextResponse.json({
      course_id: courseId,
      path: 'db',
      saved_at: new Date().toISOString(),
      message: 'Course saved successfully to database',
    });
  } catch (error) {
    console.error('Error saving course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### GET /api/course-editor/courses

**Список всех курсов (БД + YAML).**

**Логика:**
1. Загружаем курсы из БД для текущего аккаунта
2. Загружаем курсы из `courses.yml` (legacy)
3. Объединяем списки, помечая источник

**Пример реализации:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request);

    // 1. Загружаем курсы из БД
    const dbCourses = await query<{
      course_id: string;
      title: string | null;
      description: string | null;
      metadata: any;
      is_active: boolean;
    }>(
      `SELECT course_id, title, description, metadata, is_active
       FROM course
       WHERE account_id = $1
       ORDER BY created_at DESC`,
      [accountId]
    );

    // 2. Загружаем курсы из YAML (legacy)
    const yamlCourses = loadCoursesYaml();

    // 3. Формируем список курсов из БД
    const coursesList = dbCourses.map((course) => {
      const metadata = course.metadata || {};
      return {
        course_id: course.course_id,
        path: 'db',
        title: course.title,
        description: course.description,
        element: metadata.element,
        restricted: metadata.restricted,
        decline_text: metadata.decline_text,
        ban_enabled: metadata.ban_enabled,
        ban_text: metadata.ban_text,
        is_from_db: true,
        is_active: course.is_active,
      };
    });

    // 4. Добавляем курсы из YAML (если их нет в БД)
    const dbCourseIds = new Set(dbCourses.map((c) => c.course_id));
    for (const [courseId, courseInfo] of Object.entries(yamlCourses)) {
      if (courseId === 'ext_courses') continue;
      if (!dbCourseIds.has(courseId)) {
        coursesList.push({
          course_id: courseId,
          path: courseInfo.path,
          element: courseInfo.element,
          restricted: courseInfo.restricted,
          decline_text: courseInfo.decline_text,
          ban_enabled: courseInfo.ban_enabled,
          ban_text: courseInfo.ban_text,
          is_from_db: courseInfo.path === 'db',
        });
      }
    }

    return NextResponse.json({
      courses: coursesList,
    });
  } catch (error) {
    console.error('Error loading courses list:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## Преобразование данных

### Из БД в блоки редактора

**Процесс:**
1. Загружаем элементы из `course_element` (упорядоченные по `course_element_id`)
2. Парсим JSON из поля `json`
3. Извлекаем `element_data` из каждого элемента
4. Формируем YAML структуру: `{ element_id: element_data }`
5. Преобразуем YAML в блоки через `convertYamlToBlocks()`

**Пример:**

```typescript
// Элементы из БД
const elements = [
  {
    element_id: 'StartElement',
    json: '{"element_data": {"type": "Message", "text": "Привет!", "next": "section1"}}',
    element_type: 'message',
  },
  {
    element_id: 'section1',
    json: '{"element_data": {"type": "Section", "title": "Раздел 1"}}',
    element_type: 'section',
  },
];

// Преобразуем в YAML структуру
const yamlContent: Record<string, any> = {};
for (const elem of elements) {
  const jsonData = JSON.parse(elem.json);
  yamlContent[elem.element_id] = jsonData.element_data;
}

// Результат:
// {
//   StartElement: { type: "Message", text: "Привет!", next: "section1" },
//   section1: { type: "Section", title: "Раздел 1" }
// }

// Преобразуем в блоки редактора
const blocks = convertYamlToBlocks(yamlContent);
```

### Из блоков редактора в БД

**Процесс:**
1. Преобразуем блоки в YAML через `convertBlocksToYaml()`
2. Для каждого элемента YAML:
   - Определяем `element_type` из данных элемента
   - Формируем JSON: `{ element_data: elementData }`
   - Сохраняем в `course_element`

**Пример:**

```typescript
// Блоки редактора
const blocks = [
  { id: 'StartElement', type: 'Message', text: 'Привет!', next: 'section1' },
  { id: 'section1', type: 'Section', title: 'Раздел 1' },
];

// Преобразуем в YAML
const yamlContent = convertBlocksToYaml(blocks);
// Результат:
// {
//   StartElement: { type: "Message", text: "Привет!", next: "section1" },
//   section1: { type: "Section", title: "Раздел 1" }
// }

// Сохраняем в БД
for (const [elementId, elementData] of Object.entries(yamlContent)) {
  const elementType = elementData.type || 'message';
  const jsonData = JSON.stringify({ element_data: elementData });

  await query(
    `INSERT INTO course_element (course_id, account_id, element_id, json, element_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [courseId, accountId, elementId, jsonData, elementType]
  );
}
```

---

## Миграция существующих курсов

### Экспорт YAML → БД

**Функция экспорта:**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const accountId = getAccountId(request);

    // 1. Загружаем курс из YAML
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata || courseMetadata.path === 'db') {
      return NextResponse.json(
        { error: 'Course not found or already in database' },
        { status: 404 }
      );
    }

    const courseFilePath = getCourseFilePath(courseId);
    if (!courseFilePath) {
      return NextResponse.json(
        { error: 'Course file not found' },
        { status: 404 }
      );
    }

    const yamlContent = loadCourseYaml(courseFilePath);

    // 2. Проверяем, не существует ли уже курс в БД
    const existingCourse = await queryOne<{ course_id: string }>(
      `SELECT course_id FROM course
       WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course already exists in database' },
        { status: 409 }
      );
    }

    // 3. Сохраняем метаданные в БД
    const metadata = {
      element: courseMetadata.element,
      restricted: courseMetadata.restricted,
      decline_text: courseMetadata.decline_text,
      ban_enabled: courseMetadata.ban_enabled,
      ban_text: courseMetadata.ban_text,
    };

    await query(
      `INSERT INTO course (
        course_id, account_id, metadata, yaml, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        courseId,
        accountId,
        JSON.stringify(metadata),
        yaml.dump(yamlContent),
      ]
    );

    // 4. Сохраняем элементы в БД
    for (const [elementId, elementData] of Object.entries(yamlContent)) {
      const elementType = (elementData as any).type || 'message';
      const jsonData = JSON.stringify({ element_data: elementData });

      await query(
        `INSERT INTO course_element (
          course_id, account_id, element_id, json, element_type
        ) VALUES ($1, $2, $3, $4, $5)`,
        [courseId, accountId, elementId, jsonData, elementType]
      );
    }

    return NextResponse.json({
      course_id: courseId,
      message: 'Course exported to database successfully',
    });
  } catch (error) {
    console.error('Error exporting course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### Импорт БД → YAML

Для обратной совместимости можно добавить функцию импорта из БД в YAML файл.

---

## План реализации

### Этап 1: Подготовка инфраструктуры

- [ ] Создать утилиты для работы с БД (`lib/course-editor/db-utils.ts`)
- [ ] Добавить функции загрузки курсов из БД
- [ ] Добавить функции сохранения курсов в БД
- [ ] Протестировать подключение к БД

### Этап 2: Модификация API endpoints

- [ ] Обновить `GET /api/course-editor/courses/{courseId}` для поддержки БД
- [ ] Обновить `PUT /api/course-editor/courses/{courseId}` для сохранения в БД
- [ ] Обновить `GET /api/course-editor/courses` для объединения БД + YAML
- [ ] Добавить `POST /api/course-editor/courses/{courseId}/export` для экспорта YAML → БД

### Этап 3: Обновление Frontend

- [ ] Обновить `CourseEditor.tsx` для работы с курсами из БД
- [ ] Добавить индикатор источника курса (БД или YAML)
- [ ] Добавить кнопку экспорта YAML → БД
- [ ] Обновить список курсов для отображения источника

### Этап 4: Тестирование и миграция

- [ ] Протестировать загрузку курсов из БД
- [ ] Протестировать сохранение курсов в БД
- [ ] Протестировать экспорт YAML → БД
- [ ] Мигрировать существующие курсы из YAML в БД (опционально)

### Этап 5: Документация и cleanup

- [ ] Обновить документацию
- [ ] Удалить legacy код (если решено полностью перейти на БД)
- [ ] Добавить миграционные скрипты

---

## Связанные документы

- `docs/reqs/course_editor_courses_workflow.md` - текущая работа с YAML файлами
- `docs/database.md` - структура базы данных
- `webapp/frontend/lib/db.ts` - утилиты для работы с БД
- `webapp/frontend/app/api/bots/route.ts` - примеры работы с БД
