# Migration 0004: Course ID to INT

## Описание

Эта миграция изменяет структуру таблицы `course` и связанных таблиц:
- Старое поле `course_id` (TEXT) переименовывается в `course_code`
- Добавляется новое поле `course_id` (INT) с автоинкрементом как первичный ключ
- Обновляются все внешние ключи для использования нового `course_id` (INT)

## Изменения

### Таблица `course`
- ✅ `course_id` (TEXT) → `course_code` (TEXT)
- ✅ Добавлен `course_id` (INT) как PRIMARY KEY с автоинкрементом
- ✅ Удален составной PRIMARY KEY `(course_id, bot_name)`
- ✅ Добавлен UNIQUE constraint на `(course_code, account_id)` для обратной совместимости

### Связанные таблицы

Все таблицы, которые ссылаются на `course.course_id`, получают изменения:

1. **course_element**
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - Обновлен FOREIGN KEY на `course(course_id)`

2. **course_deployment**
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - Обновлен FOREIGN KEY на `course(course_id)`

3. **courseparticipants**
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - Обновлен FOREIGN KEY на `course(course_id)`

4. **run** (опционально)
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - FOREIGN KEY закомментирован (можно включить при необходимости)

5. **conversation** (опционально)
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - FOREIGN KEY закомментирован (можно включить при необходимости)

6. **waiting_element** (опционально)
   - `course_id` (TEXT) → `course_code` (TEXT)
   - Добавлена колонка `course_id` (INT)
   - FOREIGN KEY закомментирован (можно включить при необходимости)

## Процесс миграции

Миграция выполняется в несколько фаз:

1. **Создание sequence** для нового `course_id`
2. **Добавление временной колонки** `course_id_int` в таблицу `course`
3. **Заполнение** `course_id_int` уникальными значениями для каждой комбинации `(course_code, account_id)`
4. **Переименование старых колонок** `course_id` (TEXT) → `course_code` в связанных таблицах
5. **Добавление колонок** `course_id_int` в связанные таблицы и их заполнение
6. **Удаление старых FOREIGN KEY** constraints
7. **Удаление старых PRIMARY KEY** и UNIQUE constraints
8. **Переименование колонок**: в `course`: `course_id` → `course_code`, `course_id_int` → `course_id`; в связанных таблицах: `course_id_int` → `course_id`
9. **Создание нового PRIMARY KEY** на `course_id`
10. **Создание новых FOREIGN KEY** constraints
11. **Обновление индексов**

## Обратная совместимость

- Старые колонки `course_id` (TEXT) переименованы в `course_code` во всех таблицах
- Новые колонки `course_id` (INT) добавлены для использования в FOREIGN KEY и JOIN операциях
- Можно постепенно обновлять код приложения для использования нового `course_id` (INT)
- Старые колонки `course_code` (TEXT) остаются для обратной совместимости и могут быть удалены в будущем

## Требования к коду приложения

После применения миграции необходимо обновить:

1. **SQL запросы**: использовать `course_id` (INT) вместо `course_id` (TEXT)
2. **ORM модели**: обновить типы полей с TEXT на INT
3. **API endpoints**: обновить параметры и ответы для использования INT
4. **Внешние ключи**: использовать новый `course_id` (INT) в JOIN операциях

## Откат миграции

Для отката потребуется:
1. Переименовать `course_code` обратно в `course_id` (TEXT)
2. Удалить колонку `course_id` (INT)
3. Восстановить составной PRIMARY KEY `(course_id, bot_name)`
4. Восстановить старые FOREIGN KEY constraints
5. Удалить колонки `course_id` (INT) из связанных таблиц

## Проверка миграции

После применения миграции проверьте:

```sql
-- Проверка структуры таблицы course
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'course'
ORDER BY ordinal_position;

-- Проверка PRIMARY KEY
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'course'::regclass
AND contype = 'p';

-- Проверка FOREIGN KEY constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'course';

-- Проверка данных
SELECT course_id, course_code, account_id, bot_name
FROM course
LIMIT 10;
```

## Примечания

- Миграция сохраняет все существующие данные
- Старые колонки `course_id` (TEXT) в связанных таблицах остаются для обратной совместимости
- Можно удалить старые колонки в будущей миграции после обновления всего кода
