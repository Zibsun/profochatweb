# Требования: Поддержка всех возможностей Message элементов в MVP веб-версии

## Текущее состояние

В MVP веб-версии реализованы следующие возможности для элементов типа `message`:
- ✅ `text` - текст сообщения
- ✅ `button` - кнопка для продолжения
- ✅ `parse_mode` - режим форматирования (MARKDOWN, HTML)
- ✅ `options` - inline кнопки (добавлено дополнительно, не в документации)

## Недостающие возможности

Согласно документации `docs/elements.md`, следующие возможности Message элементов **не реализованы** в MVP веб-версии:

### 1. Поддержка медиа файлов (`media`)

**Описание:**
Элемент `message` должен поддерживать отображение медиа файлов (изображения и видео) вместе с текстом сообщения.

**Параметры:**
- `media` (опционально) - массив URL медиафайлов
  - Изображения: JPG, PNG и другие форматы изображений
  - Видео: MP4

**Требования к реализации:**

#### Backend (`webapp/backend/app/api/v1/mvp.py`):
1. Добавить поле `media` в модель `MessageElement`:
   ```python
   class MessageElement(BaseModel):
       element_id: str
       text: str
       button: Optional[str] = None
       options: Optional[list] = None
       parse_mode: Optional[str] = "MARKDOWN"
       media: Optional[List[str]] = None  # Новое поле
   ```

2. Обновить функции загрузки элементов из YAML:
   - `get_first_element_from_course()` - добавить извлечение `media` из `element_data.get("media")`
   - `get_next_element_from_course()` - добавить извлечение `media` из `element_data.get("media")`
   - `get_current_element_from_conversation()` - добавить извлечение `media` из `element_info.get("media")`

3. Обновить сохранение элементов в базу данных:
   - В `start_course()` - добавить `"media": element.get("media")` в `element_data`
   - В `next_element()` - добавить `"media": next_element_data.get("media")` в `element_data`

#### Frontend (`webapp/frontend`):

1. Обновить интерфейс `MessageElement` в `app/course/[courseId]/page.tsx`:
   ```typescript
   interface MessageElement {
     element_id: string
     text: string
     button?: string
     options?: Array<{ text: string; goto?: string; wait?: string }>
     parse_mode?: string
     media?: string[]  // Новое поле
   }
   ```

2. Обновить компонент `ChatView` (`components/chat/ChatView.tsx`):
   - Добавить отображение медиа файлов под текстом сообщения
   - Для изображений: использовать `<img>` тег с поддержкой lazy loading
   - Для видео: использовать HTML5 `<video>` тег или библиотеку `react-player`
   - Поддержать группу изображений (media group) - отображать несколько изображений в сетке
   - Обработать ошибки загрузки медиа (fallback на placeholder)

3. Стилизация:
   - Изображения: адаптивная ширина, закругленные углы, тени
   - Видео: адаптивный размер, контролы воспроизведения
   - Media group: сетка изображений (grid layout) для нескольких файлов

**Пример использования в YAML:**
```yaml
Message_With_Media:
  type: message
  text: Посмотри на эти картинки
  media:
    - https://example.com/image1.jpg
    - https://example.com/image2.jpg
  button: Далее
```

**Пример с видео:**
```yaml
Message_With_Video:
  type: message
  text: Посмотри это видео
  media:
    - https://example.com/video.mp4
  button: Продолжить
```

---

### 2. Поддержка `link_preview`

**Описание:**
Параметр `link_preview` определяет, показывать ли превью ссылок в сообщении. В Telegram это влияет на отображение карточек ссылок (Open Graph превью).

**Параметры:**
- `link_preview` (опционально):
  - `yes` - показывать превью (по умолчанию для большинства элементов)
  - `no` - не показывать превью (по умолчанию для Message с кнопкой)

**Требования к реализации:**

#### Backend (`webapp/backend/app/api/v1/mvp.py`):
1. Добавить поле `link_preview` в модель `MessageElement`:
   ```python
   class MessageElement(BaseModel):
       element_id: str
       text: str
       button: Optional[str] = None
       options: Optional[list] = None
       parse_mode: Optional[str] = "MARKDOWN"
       media: Optional[List[str]] = None
       link_preview: Optional[bool] = None  # Новое поле
   ```

2. Обновить функции загрузки элементов:
   - Извлекать `link_preview` из YAML (может быть `yes`/`no` или `true`/`false`)
   - Преобразовывать строковые значения в boolean

3. Сохранять `link_preview` в базу данных при создании элементов

#### Frontend (`webapp/frontend`):

1. Обновить интерфейс `MessageElement`:
   ```typescript
   interface MessageElement {
     element_id: string
     text: string
     button?: string
     options?: Array<{ text: string; goto?: string; wait?: string }>
     parse_mode?: string
     media?: string[]
     link_preview?: boolean  // Новое поле
   }
   ```

2. Реализовать отображение превью ссылок:
   - Использовать библиотеку для парсинга Open Graph метаданных (например, `react-link-preview` или собственный сервис)
   - Отображать карточку ссылки с:
     - Изображением превью (если есть)
     - Заголовком страницы
     - Описанием
     - Доменом источника
   - Если `link_preview: false`, ссылки должны отображаться как обычный текст или простые ссылки без превью

3. Обработка ссылок в тексте:
   - Автоматически находить ссылки в тексте (Markdown и HTML)
   - Для каждой ссылки проверять `link_preview` и отображать превью соответственно
   - Кэшировать превью ссылок для оптимизации производительности

**Пример использования в YAML:**
```yaml
Message_With_Link:
  type: message
  text: |
    Посмотри на этот сайт: https://example.com
  link_preview: yes
  button: Далее
```

```yaml
Message_Without_Preview:
  type: message
  text: |
    Ссылка без превью: https://example.com
  link_preview: no
  button: Продолжить
```

---

## Приоритеты реализации

1. **Высокий приоритет:** Поддержка медиа файлов (`media`)
   - Необходимо для полноценной работы курсов с визуальным контентом
   - Улучшает пользовательский опыт

2. **Средний приоритет:** Поддержка `link_preview`
   - Улучшает отображение ссылок в сообщениях
   - Может быть реализовано позже, так как не критично для базовой функциональности

## Дополнительные замечания

1. **Обработка URL медиа:**
   - Необходимо поддерживать различные источники медиа (прямые ссылки, Google Drive, облачные хранилища)
   - Возможно, потребуется проксирование медиа через backend для CORS и безопасности

2. **Производительность:**
   - Lazy loading для изображений
   - Оптимизация размера изображений (responsive images)
   - Кэширование превью ссылок

3. **Обработка ошибок:**
   - Fallback для недоступных медиа файлов
   - Обработка таймаутов при загрузке превью ссылок
   - Показ placeholder для не загрузившихся изображений

4. **Безопасность:**
   - Валидация URL медиа файлов
   - Санитизация URL для предотвращения XSS
   - Проверка типов файлов перед отображением

5. **Совместимость:**
   - Обеспечить обратную совместимость с существующими курсами без медиа
   - Курсы без `media` и `link_preview` должны работать как раньше

## Тестирование

После реализации необходимо протестировать:
1. Отображение одиночных изображений
2. Отображение группы изображений (media group)
3. Отображение видео файлов
4. Работа с различными форматами изображений (JPG, PNG, WebP)
5. Отображение превью ссылок
6. Отключение превью ссылок (`link_preview: no`)
7. Сообщения без медиа (обратная совместимость)
8. Обработка ошибок загрузки медиа
9. Адаптивность на мобильных устройствах
