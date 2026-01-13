# План миграции course_id: TEXT → INT

## Обзор

После применения миграции базы данных `0004_course_id_to_int`, необходимо обновить код приложения для работы с новой структурой данных, где:
- `course.course_id` теперь INT (автоинкремент, PRIMARY KEY)
- Старое `course_id` (TEXT) переименовано в `course_code`
- Все FOREIGN KEY теперь используют новый `course_id` (INT)

## Стратегия миграции

### Принципы
1. **Обратная совместимость**: Старые колонки `course_code` (TEXT) остаются в таблицах для постепенной миграции
2. **URL параметры**: В URL продолжает использоваться `course_code` (строка) для удобства пользователей
3. **Внутренние операции**: Все JOIN и FOREIGN KEY используют новый `course_id` (INT)
4. **Постепенная миграция**: Можно мигрировать компоненты поэтапно

## Изменения в базе данных

### Таблица `course`
- ✅ `course_id` (TEXT) → `course_code` (TEXT)
- ✅ Новый `course_id` (INT) - PRIMARY KEY с автоинкрементом
- ✅ UNIQUE constraint на `(course_code, account_id)`

### Связанные таблицы
Все таблицы получают:
- `course_code` (TEXT) - старое значение для обратной совместимости
- `course_id` (INT) - новый FK на `course.course_id`

## План изменений по компонентам

### 1. Backend API (Python)

#### 1.1. Модели данных (`webapp/backend/app/models/`)

**Файл: `course_db.py`**
- [ ] Обновить модель `Course`:
  - Изменить `course_id` с `String` на `Integer` (primary_key=True)
  - Добавить `course_code` как `String`
  - Обновить relationships для использования `course_id` (INT)

**Файл: `course_element_db.py`** (если существует)
- [ ] Обновить `course_id` с `String` на `Integer`
- [ ] Обновить ForeignKey на `course.course_id`

**Файл: `course_deployment_db.py`** (если существует)
- [ ] Обновить `course_id` с `String` на `Integer`
- [ ] Обновить ForeignKey на `course.course_id`

#### 1.2. Репозитории (`webapp/backend/app/repositories/`)

**Файл: `course_repository.py`**
- [ ] Обновить методы для работы с `course_id` (INT):
  - `get_course_by_id()` - принимать INT вместо STRING
  - `create_course()` - возвращать INT course_id
  - `update_course()` - использовать INT для поиска
  - `delete_course()` - использовать INT для поиска
- [ ] Добавить методы для конвертации:
  - `get_course_id_by_code(course_code: str, account_id: int) -> Optional[int]`
  - `get_course_code_by_id(course_id: int) -> Optional[str]`

**Файл: `db_adapter.py`**
- [ ] Обновить функции для работы с `course_id` (INT):
  - `create_run()` - принимать INT course_id
  - `get_run_id()` - использовать INT course_id
  - `delete_course()` - использовать INT course_id

#### 1.3. API Endpoints (`webapp/backend/app/api/`)

**Файл: `v1/courses.py`**
- [ ] Обновить endpoints:
  - `GET /courses/{course_id}` - принимать `course_code` (str) в URL, конвертировать в `course_id` (int)
  - `POST /courses` - возвращать `course_id` (int) в ответе
  - `PUT /courses/{course_id}` - использовать `course_code` для поиска
  - `DELETE /courses/{course_id}` - использовать `course_code` для поиска

**Файл: `v1/mvp.py`**
- [ ] Обновить endpoints:
  - `GET /courses/{course_id}` - конвертировать `course_code` → `course_id`
  - `GET /courses/{course_id}/current` - использовать INT course_id
  - `POST /courses/{course_id}/start` - использовать INT course_id
  - Все методы, принимающие `course_id: str` → добавить конвертацию

**Стратегия конвертации в API:**
```python
async def get_course_id_from_code(course_code: str, account_id: int) -> Optional[int]:
    """Конвертирует course_code в course_id"""
    course = await db.query(Course).filter(
        Course.course_code == course_code,
        Course.account_id == account_id
    ).first()
    return course.course_id if course else None
```

### 2. Frontend API Routes (Next.js)

#### 2.1. Course Editor API (`webapp/frontend/app/api/course-editor/`)

**Файл: `courses/[id]/route.ts`**
- [ ] Обновить `getCourseFromDB()`:
  - Изменить SQL запрос: `WHERE course_code = $1` вместо `course_id = $1`
  - Возвращать оба поля: `course_id` (INT) и `course_code` (TEXT)
- [ ] Обновить `getCourseElementsFromDB()`:
  - Изменить SQL: использовать `course_id` (INT) для JOIN
- [ ] Обновить `saveCourseToDB()`:
  - При создании: использовать `course_code` для поиска, `course_id` для FK
  - При обновлении: использовать `course_code` для WHERE

**Файл: `courses/[id]/metadata/route.ts`**
- [ ] Обновить запросы для использования `course_code` в WHERE
- [ ] Возвращать `course_id` (INT) в ответе

**Файл: `courses/route.ts`**
- [ ] Обновить список курсов:
  - SELECT должен включать `course_id` (INT) и `course_code` (TEXT)
  - Возвращать оба поля в ответе

#### 2.2. Bots API (`webapp/frontend/app/api/bots/`)

**Файл: `[botId]/courses/route.ts`**
- [ ] Обновить SQL запрос:
  ```sql
  SELECT 
    cd.course_id,  -- теперь INT
    c.course_code, -- TEXT для отображения
    c.title,
    cd.environment,
    cd.is_active
  FROM course_deployment cd
  LEFT JOIN course c ON cd.course_id = c.course_id
  WHERE cd.bot_id = $1 AND cd.account_id = $2
  ```
- [ ] Обновить форматирование ответа:
  ```typescript
  const courses = deployments.map((deployment) => ({
    id: deployment.course_code, // используем course_code для URL
    course_id: deployment.course_id, // INT для внутренних операций
    title: deployment.title || deployment.course_code,
    environment: deployment.environment,
    is_active: deployment.is_active,
  }));
  ```

**Файл: `[botId]/courses/[courseId]/route.ts`**
- [ ] Обновить PATCH:
  - Конвертировать `courseId` (course_code) → `course_id` (INT) для WHERE
  - Использовать `course_code` для поиска курса
- [ ] Обновить DELETE:
  - Конвертировать `courseId` (course_code) → `course_id` (INT)
  - Использовать JOIN с `course` для получения `course_id`

**Файл: `[botId]/available-courses/route.ts`**
- [ ] Обновить SQL для исключения уже прикрепленных курсов:
  - Использовать `course_id` (INT) для JOIN с `course_deployment`
  - Возвращать `course_code` для отображения

#### 2.3. Deployments API (`webapp/frontend/app/api/deployments/`)

**Файл: `[deploymentId]/route.ts`**
- [ ] Обновить запросы для использования `course_id` (INT) в JOIN
- [ ] Возвращать `course_code` в ответе для удобства

**Файл: `[deploymentId]/runs/route.ts`**
- [ ] Обновить запросы для использования `course_id` (INT)

#### 2.4. Utils (`webapp/frontend/lib/course-editor/`)

**Файл: `db-utils.ts`**
- [ ] Обновить интерфейсы:
  ```typescript
  export interface CourseFromDB {
    course_id: number;      // INT
    course_code: string;    // TEXT
    title: string | null;
    description: string | null;
    metadata: any;
    yaml: string | null;
    is_active: boolean;
  }
  ```
- [ ] Обновить `getCourseFromDB()`:
  ```typescript
  export async function getCourseFromDB(
    courseCode: string,  // переименовать courseId → courseCode
    accountId: number
  ): Promise<CourseFromDB | null> {
    const course = await queryOne<CourseFromDB>(
      `SELECT 
        course_id,
        course_code,
        title,
        description,
        metadata,
        yaml,
        is_active
      FROM course
      WHERE course_code = $1 AND account_id = $2`,
      [courseCode, accountId]
    );
    return course;
  }
  ```
- [ ] Обновить `getCourseElementsFromDB()`:
  ```typescript
  export async function getCourseElementsFromDB(
    courseId: number,  // теперь INT
    accountId: number
  ): Promise<CourseElement[]> {
    const elements = await query<CourseElement>(
      `SELECT 
        element_id,
        json,
        element_type
      FROM course_element
      WHERE course_id = $1 AND account_id = $2
      ORDER BY course_element_id`,
      [courseId, accountId]
    );
    return elements;
  }
  ```
- [ ] Обновить `saveCourseToDB()`:
  - Использовать `course_code` для поиска существующего курса
  - Использовать `course_id` (INT) для FK в `course_element`

### 3. Frontend Components (React)

#### 3.1. Course Editor (`webapp/frontend/components/course-editor/`)

**Файл: `CourseEditor.tsx`**
- [ ] Обновить типы:
  - `courseId` prop остается `string` (course_code для URL)
  - Внутреннее состояние использовать `course_id` (number) для операций с БД
- [ ] Обновить загрузку курса:
  ```typescript
  const dbCourse = await getCourseFromDB(courseId, accountId);
  if (dbCourse) {
    // Использовать dbCourse.course_id (INT) для элементов
    const elements = await getCourseElementsFromDB(dbCourse.course_id, accountId);
  }
  ```
- [ ] Обновить сохранение:
  - Использовать `course_code` для идентификации курса
  - Использовать `course_id` (INT) при сохранении элементов

**Файл: `CourseListEditor.tsx`**
- [ ] Обновить отображение списка курсов:
  - Показывать `course_code` в списке
  - Использовать `course_code` для навигации
  - Хранить `course_id` (INT) для внутренних операций

#### 3.2. Bots Management (`webapp/frontend/components/bots/`)

**Файл: `ConnectedCoursesSection.tsx`**
- [ ] Обновить интерфейс `ConnectedCourse`:
  ```typescript
  interface ConnectedCourse {
    id: string;        // course_code для URL
    course_id?: number; // INT для внутренних операций (опционально)
    title: string;
    environment: string;
    is_active: boolean;
  }
  ```
- [ ] Обновить API вызовы:
  - Использовать `course_code` в URL (`/api/bots/${botId}/courses/${courseCode}`)
  - Обрабатывать ответы с обоими полями

**Файл: `BotInspector.tsx`**
- [ ] Обновить типы для `connected_courses`
- [ ] Использовать `course_code` для отображения и навигации

**Файл: `AttachCourseModal.tsx`**
- [ ] Обновить интерфейс `Course`:
  ```typescript
  interface Course {
    course_id: number;  // INT
    course_code: string; // TEXT для отображения
    title: string;
  }
  ```
- [ ] Обновить отображение: показывать `course_code` или `title`
- [ ] При прикреплении: передавать `course_id` (INT) в API

#### 3.3. Course Pages (`webapp/frontend/app/course/`)

**Файл: `[courseId]/page.tsx`**
- [ ] Обновить параметр `courseId` - остается `string` (course_code)
- [ ] При загрузке курса:
  - Конвертировать `course_code` → `course_id` (INT) для API вызовов
  - Или обновить API для принятия `course_code`

**Файл: `course-editor/[courseId]/page.tsx`**
- [ ] Аналогично - `courseId` остается `string` (course_code)
- [ ] Использовать `course_code` для навигации и отображения

### 4. Типы и интерфейсы

#### 4.1. Общие типы (`webapp/frontend/lib/types/`)

**Создать файл: `course-types.ts`**
```typescript
/**
 * Course identifier - используется в URL и для отображения
 */
export type CourseCode = string;

/**
 * Course ID - внутренний идентификатор (INT из БД)
 */
export type CourseId = number;

/**
 * Полная информация о курсе
 */
export interface Course {
  course_id: CourseId;
  course_code: CourseCode;
  title?: string | null;
  description?: string | null;
  account_id: number;
  is_active: boolean;
  // ... другие поля
}

/**
 * Минимальная информация о курсе для списков
 */
export interface CourseListItem {
  course_code: CourseCode;
  course_id?: CourseId; // опционально для обратной совместимости
  title?: string | null;
}
```

#### 4.2. Обновить существующие типы

**Файл: `types.ts`** (если существует)
- [ ] Обновить все интерфейсы, использующие `course_id: string` → разделить на `course_id: number` и `course_code: string`

### 5. Утилиты для конвертации

**Создать файл: `webapp/frontend/lib/course-utils.ts`**
```typescript
import { queryOne } from '@/lib/db';

/**
 * Конвертирует course_code в course_id
 */
export async function getCourseIdByCode(
  courseCode: string,
  accountId: number
): Promise<number | null> {
  const result = await queryOne<{ course_id: number }>(
    `SELECT course_id FROM course 
     WHERE course_code = $1 AND account_id = $2`,
    [courseCode, accountId]
  );
  return result?.course_id || null;
}

/**
 * Конвертирует course_id в course_code
 */
export async function getCourseCodeById(
  courseId: number,
  accountId: number
): Promise<string | null> {
  const result = await queryOne<{ course_code: string }>(
    `SELECT course_code FROM course 
     WHERE course_id = $1 AND account_id = $2`,
    [courseId, accountId]
  );
  return result?.course_code || null;
}
```

## Порядок выполнения миграции

### Этап 1: Backend (Python)
1. ✅ Обновить модели данных
2. ✅ Обновить репозитории
3. ✅ Обновить API endpoints с конвертацией course_code ↔ course_id
4. ✅ Добавить утилиты конвертации

### Этап 2: Frontend API Routes
1. ✅ Обновить SQL запросы в course-editor API
2. ✅ Обновить SQL запросы в bots API
3. ✅ Обновить SQL запросы в deployments API
4. ✅ Обновить db-utils.ts

### Этап 3: Frontend Components
1. ✅ Обновить типы и интерфейсы
2. ✅ Обновить Course Editor компоненты
3. ✅ Обновить Bots Management компоненты
4. ✅ Обновить Course Pages

### Этап 4: Тестирование
1. ✅ Проверить создание курса
2. ✅ Проверить редактирование курса
3. ✅ Проверить прикрепление курса к боту
4. ✅ Проверить отображение списков курсов
5. ✅ Проверить навигацию по курсам

## Обратная совместимость

### Поддержка старого кода
- Старые колонки `course_code` (TEXT) остаются в БД
- Можно постепенно мигрировать компоненты
- URL параметры продолжают использовать `course_code` (строка)

### Миграция данных
- Все существующие курсы автоматически получают `course_id` (INT) при применении миграции БД
- Старые `course_id` (TEXT) автоматически копируются в `course_code`

## Риски и митигация

### Риск 1: Потеря данных при миграции
**Митигация**: Миграция БД выполняется в транзакции, все данные сохраняются

### Риск 2: Ошибки в SQL запросах
**Митигация**: 
- Тщательное тестирование всех SQL запросов
- Использование параметризованных запросов
- Проверка на существование данных перед операциями

### Риск 3: Несовместимость типов
**Митигация**:
- Четкое разделение `course_code` (string) и `course_id` (number)
- Использование TypeScript типов
- Валидация типов на этапе разработки

## Типичные ошибки и решения

### Ошибка 1: Использование course_code в JOIN вместо course_id
**Проблема:**
```sql
-- ❌ Неправильно (медленно, нет индекса)
SELECT * FROM course_element ce
JOIN course c ON ce.course_code = c.course_code
WHERE c.course_code = 'greek_a1';
```

**Решение:**
```sql
-- ✅ Правильно (быстро, использует индекс на course_id)
SELECT * FROM course_element ce
JOIN course c ON ce.course_id = c.course_id
WHERE c.course_code = 'greek_a1';
```

### Ошибка 2: Передача course_code в параметр, ожидающий INT
**Проблема:**
```typescript
// ❌ Неправильно
const courseId = params.courseId; // это course_code (string)
await getCourseElementsFromDB(courseId, accountId); // ожидает number
```

**Решение:**
```typescript
// ✅ Правильно
const courseCode = params.courseId; // это course_code (string)
const course = await getCourseFromDB(courseCode, accountId);
if (course) {
  const elements = await getCourseElementsFromDB(course.course_id, accountId);
}
```

### Ошибка 3: Смешивание course_code и course_id в одном запросе
**Проблема:**
```sql
-- ❌ Неправильно (course_code vs course_id)
SELECT * FROM course_deployment
WHERE course_id = 'greek_a1'; -- 'greek_a1' это course_code, не course_id!
```

**Решение:**
```sql
-- ✅ Правильно
SELECT cd.* FROM course_deployment cd
JOIN course c ON cd.course_id = c.course_id
WHERE c.course_code = 'greek_a1' AND cd.account_id = 1;
```

### Ошибка 4: Использование старого course_id (TEXT) в WHERE
**Проблема:**
```sql
-- ❌ Неправильно (старая колонка переименована)
SELECT * FROM course_element
WHERE course_id = 'greek_a1'; -- course_id теперь INT!
```

**Решение:**
```sql
-- ✅ Правильно (используем course_code или JOIN)
SELECT ce.* FROM course_element ce
JOIN course c ON ce.course_id = c.course_id
WHERE c.course_code = 'greek_a1' AND ce.account_id = 1;
```

### Ошибка 5: Неправильный тип в TypeScript
**Проблема:**
```typescript
// ❌ Неправильно
interface Course {
  course_id: string; // должно быть number!
}
```

**Решение:**
```typescript
// ✅ Правильно
interface Course {
  course_id: number;  // INT из БД
  course_code: string; // TEXT для URL и отображения
}
```

## Чеклист миграции

### Backend
- [ ] Обновлены модели (`course_db.py`, `course_element_db.py`, `course_deployment_db.py`)
- [ ] Обновлены репозитории (`course_repository.py`, `db_adapter.py`)
- [ ] Обновлены API endpoints (`v1/courses.py`, `v1/mvp.py`)
- [ ] Добавлены утилиты конвертации
- [ ] Обновлены тесты

### Frontend API Routes
- [ ] Обновлен `course-editor/courses/[id]/route.ts`
- [ ] Обновлен `course-editor/courses/[id]/metadata/route.ts`
- [ ] Обновлен `course-editor/courses/route.ts`
- [ ] Обновлен `bots/[botId]/courses/route.ts`
- [ ] Обновлен `bots/[botId]/courses/[courseId]/route.ts`
- [ ] Обновлен `bots/[botId]/available-courses/route.ts`
- [ ] Обновлен `deployments/[deploymentId]/route.ts`
- [ ] Обновлен `lib/course-editor/db-utils.ts`

### Frontend Components
- [ ] Обновлен `CourseEditor.tsx`
- [ ] Обновлен `CourseListEditor.tsx`
- [ ] Обновлен `ConnectedCoursesSection.tsx`
- [ ] Обновлен `BotInspector.tsx`
- [ ] Обновлен `AttachCourseModal.tsx`
- [ ] Обновлен `[courseId]/page.tsx`
- [ ] Обновлен `course-editor/[courseId]/page.tsx`

### Типы и утилиты
- [ ] Создан `lib/types/course-types.ts`
- [ ] Создан `lib/course-utils.ts`
- [ ] Обновлены все существующие типы

### Тестирование
- [ ] Протестировано создание курса
- [ ] Протестировано редактирование курса
- [ ] Протестировано удаление курса
- [ ] Протестировано прикрепление курса к боту
- [ ] Протестировано открепление курса от бота
- [ ] Протестирована навигация по курсам
- [ ] Протестированы все API endpoints

## Примеры SQL запросов

### До миграции (старый формат)

```sql
-- Получение курса
SELECT * FROM course 
WHERE course_id = 'greek_a1' AND account_id = 1;

-- Получение элементов курса
SELECT * FROM course_element 
WHERE course_id = 'greek_a1' AND account_id = 1;

-- JOIN с course_deployment
SELECT cd.*, c.title 
FROM course_deployment cd
JOIN course c ON cd.course_id = c.course_id AND cd.account_id = c.account_id
WHERE cd.bot_id = 1;
```

### После миграции (новый формат)

```sql
-- Получение курса по course_code (для API endpoints)
SELECT course_id, course_code, title, description 
FROM course 
WHERE course_code = 'greek_a1' AND account_id = 1;

-- Получение курса по course_id (для внутренних операций)
SELECT course_id, course_code, title, description 
FROM course 
WHERE course_id = 123 AND account_id = 1;

-- Получение элементов курса (используем INT course_id)
SELECT * FROM course_element 
WHERE course_id = 123 AND account_id = 1;

-- JOIN с course_deployment (используем INT course_id)
SELECT cd.*, c.course_code, c.title 
FROM course_deployment cd
JOIN course c ON cd.course_id = c.course_id
WHERE cd.bot_id = 1 AND cd.account_id = 1;

-- Поиск курса по course_code для получения course_id
SELECT course_id FROM course 
WHERE course_code = 'greek_a1' AND account_id = 1;
```

### Конвертация course_code → course_id

```sql
-- В одном запросе (рекомендуется)
SELECT ce.* 
FROM course_element ce
JOIN course c ON ce.course_id = c.course_id
WHERE c.course_code = 'greek_a1' AND c.account_id = 1;

-- Или через подзапрос
SELECT * FROM course_element 
WHERE course_id = (
  SELECT course_id FROM course 
  WHERE course_code = 'greek_a1' AND account_id = 1
);
```

## Дополнительные заметки

### URL структура
- URL продолжает использовать `course_code` (строка) для удобства:
  - `/course-editor/my_course_123`
  - `/course/greek_a1`
  - `/api/course-editor/courses/my_course_123`

### Внутренние операции
- Все JOIN и FOREIGN KEY используют `course_id` (INT)
- Поиск по `course_code` выполняется через JOIN с таблицей `course`

### Производительность
- Индексы на `course_id` (INT) обеспечивают быстрые JOIN
- Индекс на `(course_code, account_id)` обеспечивает быстрый поиск по коду

### Рекомендации по запросам
1. **Для API endpoints**: Используйте `course_code` в WHERE, возвращайте оба поля
2. **Для JOIN операций**: Используйте `course_id` (INT) для производительности
3. **Для поиска**: Используйте `course_code` для пользовательского ввода
4. **Для FK**: Всегда используйте `course_id` (INT) в FOREIGN KEY constraints

## Связанные документы

- [Миграция БД](../migrations/versions/0004_course_id_to_int_README.md)
- [Database Schema](../database.md)
- [Course Editor DB Integration](./course_editor_db_integration.md)
- [Course Editor Workflow](./course_editor_courses_workflow.md)
