# Требования: Поддержка Quiz элементов в MVP веб-версии

## Текущее состояние

В MVP веб-версии **не реализована** поддержка элементов типа `quiz`. В настоящее время MVP поддерживает только элементы типа `message`.

## Описание Quiz элемента

Согласно документации `docs/elements.md`, элемент `quiz` представляет собой викторину с одним правильным ответом. В Telegram он отправляется как Poll типа "quiz", но в веб-версии должен быть реализован как интерактивный компонент с выбором варианта ответа.

## Требования к реализации

### Параметры Quiz элемента

Согласно документации, элемент `quiz` должен поддерживать следующие параметры:

- `type`: `quiz` (обязательно)
- `text` (обязательно) - вопрос викторины (максимум 300 символов)
- `answers` (обязательно) - массив вариантов ответов:
  - `text` (обязательно) - текст варианта ответа
  - `correct` (опционально) - `yes` для правильного ответа
  - `feedback` (опционально) - сообщение после выбора этого варианта
- `media` (опционально) - массив URL изображений (отправляются перед викториной)

### Поведение Quiz элемента

1. Отображается вопрос викторины
2. Пользователь может выбрать один из вариантов ответа
3. Один из вариантов должен быть помечен как правильный (`correct: yes`)
4. После выбора варианта отправляется соответствующий `feedback`
5. Результат сохраняется в отчет с оценкой (1 за правильный ответ, 0 за неправильный)
6. После выбора ответа и показа feedback элемент переходит к следующему

## Требования к реализации

### Backend (`webapp/backend/app/api/v1/mvp.py`)

#### 1. Создать модель `QuizElement`

Добавить новую модель Pydantic для quiz элементов:

```python
class QuizAnswer(BaseModel):
    text: str
    correct: Optional[str] = None  # "yes" для правильного ответа
    feedback: Optional[str] = None

class QuizElement(BaseModel):
    element_id: str
    type: str = "quiz"
    text: str
    answers: List[QuizAnswer]
    media: Optional[List[str]] = None
```

#### 2. Обновить функции загрузки элементов из YAML

Добавить поддержку quiz элементов в функции:
- `get_first_element_from_course()` - добавить обработку `type: quiz`
- `get_next_element_from_course()` - добавить обработку `type: quiz`
- `get_current_element_from_conversation()` - добавить обработку quiz элементов из базы данных

**Логика обработки:**
```python
if element_data.get("type") == "quiz":
    quiz_element = {
        "element_id": element_id,
        "type": "quiz",
        "text": element_data.get("text", ""),
        "answers": element_data.get("answers", []),
        "media": element_data.get("media"),
    }
    return quiz_element
```

#### 3. Обновить сохранение элементов в базу данных

Модифицировать функции `start_course()` и `next_element()` для сохранения quiz элементов:
- Сохранять тип элемента как `"quiz"` в поле `type` в `json_data`
- Сохранять все параметры quiz (`text`, `answers`, `media`) в `json_data`

#### 4. Создать endpoint для отправки ответа на quiz

Добавить новый endpoint для обработки ответов пользователя:

```python
@router.post("/courses/{course_id}/quiz/answer")
def submit_quiz_answer(
    course_id: str,
    answer_data: QuizAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """
    Обработка ответа пользователя на quiz элемент
    
    Параметры:
    - course_id: ID курса
    - answer_data: данные ответа (element_id, selected_answer_index)
    - chat_id: ID чата пользователя
    
    Возвращает:
    - feedback: сообщение обратной связи
    - is_correct: правильность ответа
    - score: оценка (1 или 0)
    """
    # 1. Получить текущий элемент из conversation
    # 2. Проверить, что элемент является quiz
    # 3. Найти правильный ответ (correct: yes)
    # 4. Сравнить выбранный ответ с правильным
    # 5. Вернуть feedback и результат
    # 6. Сохранить результат в базу данных
```

**Модель запроса:**
```python
class QuizAnswerRequest(BaseModel):
    element_id: str
    selected_answer_index: int  # Индекс выбранного ответа в массиве answers
```

**Модель ответа:**
```python
class QuizAnswerResponse(BaseModel):
    is_correct: bool
    feedback: str
    score: int  # 1 или 0
```

#### 5. Сохранение результатов quiz

Добавить сохранение результатов quiz в таблицу `conversation`:
- Сохранять выбранный ответ пользователя
- Сохранять правильность ответа (`is_correct`)
- Сохранять оценку (`score`: 1 или 0)
- Сохранять `max_score`: 1

### Frontend (`webapp/frontend`)

#### 1. Обновить интерфейсы типов

Добавить интерфейсы для quiz элементов в `app/course/[courseId]/page.tsx`:

```typescript
interface QuizAnswer {
  text: string
  correct?: string  // "yes" для правильного ответа
  feedback?: string
}

interface QuizElement {
  element_id: string
  type: "quiz"
  text: string
  answers: QuizAnswer[]
  media?: string[]
}

// Обновить общий тип элемента
type CourseElement = MessageElement | QuizElement
```

#### 2. Создать компонент QuizView

Создать новый компонент `components/chat/QuizView.tsx` для отображения quiz:

```typescript
interface QuizViewProps {
  quiz: QuizElement
  onAnswerSelected: (answerIndex: number) => void
  selectedAnswer?: number
  showFeedback?: boolean
  feedback?: string
  isCorrect?: boolean
}

export default function QuizView({ 
  quiz, 
  onAnswerSelected, 
  selectedAnswer,
  showFeedback,
  feedback,
  isCorrect 
}: QuizViewProps) {
  // Отображение:
  // 1. Медиа файлы (если есть)
  // 2. Вопрос (text)
  // 3. Варианты ответов (answers) - кнопки или радио-кнопки
  // 4. Feedback после выбора (если showFeedback === true)
}
```

**Требования к компоненту:**
- Отображать медиа файлы (изображения) перед вопросом, если они указаны
- Отображать вопрос (`text`) с форматированием Markdown/HTML
- Отображать варианты ответов как интерактивные кнопки или радио-кнопки
- После выбора ответа:
  - Отправлять ответ на backend через API
  - Показывать feedback для выбранного ответа
  - Визуально выделять правильный/неправильный ответ
  - Автоматически переходить к следующему элементу после показа feedback

#### 3. Интеграция QuizView в ChatView

Обновить компонент `ChatView.tsx` для поддержки quiz элементов:

```typescript
const renderMessage = (element: CourseElement, index: number) => {
  if (element.type === "quiz") {
    return (
      <QuizView
        quiz={element}
        onAnswerSelected={handleQuizAnswer}
        // ... другие пропсы
      />
    )
  }
  // ... существующая логика для message
}
```

#### 4. Обработка ответов на quiz

Добавить функцию обработки ответов в `app/course/[courseId]/page.tsx`:

```typescript
const handleQuizAnswer = async (elementId: string, answerIndex: number) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${apiUrl}/api/mvp/courses/${courseId}/quiz/answer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          element_id: elementId,
          selected_answer_index: answerIndex,
        }),
      }
    )
    
    const result = await response.json()
    
    // Обновить состояние для отображения feedback
    // После показа feedback перейти к следующему элементу
  } catch (error) {
    console.error('Ошибка отправки ответа:', error)
  }
}
```

#### 5. Обновить логику навигации

Модифицировать функцию `handleNext()` для поддержки quiz элементов:
- После выбора ответа на quiz и показа feedback автоматически переходить к следующему элементу
- Сохранять состояние quiz (выбранный ответ, feedback) в истории сообщений

#### 6. Стилизация QuizView

**Требования к стилям:**
- Вопрос: крупный шрифт, выделение, поддержка Markdown/HTML форматирования
- Варианты ответов:
  - Кнопки с hover эффектами
  - Визуальное выделение выбранного ответа
  - Цветовая индикация правильного/неправильного ответа:
    - Правильный ответ: зеленый фон/граница
    - Неправильный ответ: красный фон/граница
- Feedback:
  - Отображается под вариантами ответов
  - Выделение цветом (зеленый для правильного, красный для неправильного)
  - Плавная анимация появления
- Медиа файлы:
  - Отображаются перед вопросом
  - Адаптивная ширина
  - Поддержка lazy loading

## Примеры использования

### Простой quiz с 2 вариантами ответа

```yaml
Test_Quiz_01:
  type: quiz
  text: Important (1/5)
  answers:
    - text: Viral
      feedback: Почти, но это не совсем то. Попробуй еще раз!
    - text: Essential
      correct: yes
      feedback: Отлично! "Important" означает "Essential" — важный, существенный.
```

### Quiz с 4 вариантами ответа

```yaml
Test_Quiz_03:
  type: quiz
  text: |
    Выбери правильный синоним для слова "Gradually":
  answers:
    - text: Быстро
      feedback: Нет, "gradually" означает постепенно, медленно, а не быстро.
    - text: Внезапно
      feedback: Не совсем. "Gradually" — это постепенно, а не внезапно.
    - text: Постепенно
      correct: yes
      feedback: Правильно! "Gradually" означает "постепенно", "постепенно".
    - text: Сразу
      feedback: Нет, "gradually" означает постепенно, а не сразу.
```

### Quiz с изображением

```yaml
Graph_Quiz:
  type: quiz
  text: The sales figures increased steadily according to the graph.
  media:
    - https://drive.google.com/file/d/1abc123/view
  answers:
    - text: 'TRUE'
      correct: yes
      feedback: Great job!
    - text: 'FALSE'
      feedback: Oops! That's not correct.
```

## Приоритеты реализации

1. **Высокий приоритет:** Базовая функциональность quiz
   - Отображение вопроса и вариантов ответов
   - Обработка выбора ответа
   - Отображение feedback
   - Сохранение результатов

2. **Средний приоритет:** Поддержка медиа файлов
   - Отображение изображений перед вопросом
   - Обработка различных источников медиа (Google Drive, прямые ссылки)

3. **Низкий приоритет:** Улучшения UX
   - Анимации при выборе ответа
   - Звуковые эффекты (опционально)
   - Расширенная статистика по результатам

## Дополнительные замечания

1. **Валидация данных:**
   - Проверка наличия хотя бы одного правильного ответа (`correct: yes`)
   - Проверка максимальной длины вопроса (300 символов)
   - Валидация URL медиа файлов

2. **Обработка ошибок:**
   - Обработка случаев, когда quiz элемент не найден
   - Обработка ошибок при отправке ответа на backend
   - Fallback для недоступных медиа файлов

3. **Производительность:**
   - Lazy loading для медиа файлов
   - Оптимизация рендеринга большого количества вариантов ответов
   - Кэширование результатов quiz

4. **Доступность (Accessibility):**
   - Поддержка клавиатурной навигации
   - ARIA атрибуты для screen readers
   - Контрастность цветов для визуальной индикации

5. **Совместимость:**
   - Обеспечить обратную совместимость с существующими курсами без quiz элементов
   - Курсы только с `message` элементами должны работать как раньше

## Тестирование

После реализации необходимо протестировать:

1. **Базовая функциональность:**
   - Отображение quiz элемента с вопросом и вариантами
   - Выбор варианта ответа
   - Отображение feedback после выбора
   - Переход к следующему элементу после quiz

2. **Различные конфигурации:**
   - Quiz с 2 вариантами ответов
   - Quiz с 3 вариантами ответов
   - Quiz с 4+ вариантами ответов
   - Quiz без feedback для некоторых вариантов
   - Quiz с медиа файлами

3. **Обработка ошибок:**
   - Quiz без правильного ответа (валидация)
   - Ошибки при отправке ответа на backend
   - Недоступные медиа файлы

4. **Интеграция:**
   - Quiz после message элементов
   - Message элементы после quiz
   - Несколько quiz элементов подряд
   - Quiz в начале курса
   - Quiz в конце курса

5. **UX:**
   - Визуальная индикация правильного/неправильного ответа
   - Плавные анимации
   - Адаптивность на мобильных устройствах
   - Работа с клавиатурой

6. **Сохранение результатов:**
   - Корректное сохранение выбранного ответа
   - Корректное сохранение оценки (score)
   - Возможность просмотра истории ответов

## API Endpoints

### POST `/api/mvp/courses/{course_id}/quiz/answer`

Отправка ответа на quiz элемент.

**Request Body:**
```json
{
  "element_id": "Test_Quiz_01",
  "selected_answer_index": 1
}
```

**Response:**
```json
{
  "is_correct": true,
  "feedback": "Отлично! \"Important\" означает \"Essential\" — важный, существенный.",
  "score": 1
}
```

**Error Responses:**
- `400 Bad Request`: Неверный формат запроса или элемент не является quiz
- `404 Not Found`: Элемент не найден
- `500 Internal Server Error`: Ошибка сервера
