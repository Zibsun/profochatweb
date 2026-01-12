# Требования: Поддержка Question элементов в MVP веб-версии

## Текущее состояние

В MVP веб-версии **не реализована** поддержка элементов типа `question`. В настоящее время MVP поддерживает только элементы типа `message`, `quiz`, `audio` и `input`.

## Описание Question элемента

Согласно документации `docs/elements.md`, элемент `question` представляет собой опрос без правильного ответа. В Telegram он отправляется как обычный Poll (не quiz), но в веб-версии должен быть реализован как интерактивный компонент с выбором варианта ответа. Все варианты равнозначны, нет правильного или неправильного ответа.

## Требования к реализации

### Параметры Question элемента

Согласно документации, элемент `question` должен поддерживать следующие параметры:

- `type`: `question` (обязательно)
- `text` (обязательно) - вопрос опроса (максимум 300 символов)
- `answers` (обязательно) - массив вариантов ответов:
  - `text` (обязательно) - текст варианта ответа
  - `feedback` (опционально) - сообщение после выбора этого варианта

### Поведение Question элемента

1. Отображается вопрос опроса
2. Пользователь может выбрать один из вариантов ответа
3. **Нет правильного ответа** - все варианты равнозначны (в отличие от `quiz`)
4. После выбора варианта отправляется соответствующий `feedback` (если указан)
5. Результат сохраняется в отчет **без оценки** (score = 0, max_score = 0)
6. После выбора ответа и показа feedback элемент переходит к следующему

**Отличия от Quiz:**
- В `quiz` есть правильный ответ (`correct: yes`), в `question` - нет
- `quiz` оценивается (score: 1 или 0), `question` - не оценивается
- `quiz` показывает правильность ответа, `question` - только feedback

## Требования к реализации

### Backend (`webapp/backend/app/api/v1/mvp.py`)

#### 1. Создать модель `QuestionElement`

Добавить новую модель Pydantic для question элементов:

```python
class QuestionAnswer(BaseModel):
    text: str
    feedback: Optional[str] = None

class QuestionElement(BaseModel):
    element_id: str
    type: str = Field(default="question", exclude=False)  # Всегда включать в JSON
    text: str
    answers: List[QuestionAnswer]
```

#### 2. Обновить функции загрузки элементов из YAML

Добавить поддержку question элементов в функции:
- `get_course_data()` - добавить фильтрацию `type: question`
- `get_first_element_from_course()` - добавить обработку `type: question`
- `get_next_element_from_course()` - добавить обработку `type: question`
- `get_current_element_from_conversation()` - добавить обработку question элементов из базы данных

**Логика обработки:**
```python
if element_type == "question":
    result = {
        "element_id": element_id,
        "type": "question",
        "text": element_data.get("text", ""),
        "answers": element_data.get("answers", []),
    }
    logger.info(f"get_first_element_from_course: question element_id={element_id}")
    return result
```

#### 3. Обновить сохранение элементов в базу данных

Модифицировать функции `start_course()` и `next_element()` для сохранения question элементов:
- Сохранять тип элемента как `"question"` в поле `type` в `json_data`
- Сохранять все параметры question (`text`, `answers`) в `json_data`

#### 4. Создать endpoint для отправки ответа на question

Добавить новый endpoint для обработки ответов пользователя:

```python
@router.post("/courses/{course_id}/question/answer")
def submit_question_answer(
    course_id: str,
    answer_data: QuestionAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """
    Обработка ответа пользователя на question элемент
    
    Параметры:
    - course_id: ID курса
    - answer_data: данные ответа (element_id, selected_answer_index)
    - chat_id: ID чата пользователя
    
    Возвращает:
    - feedback: сообщение обратной связи (если указан для выбранного варианта)
    - score: всегда 0 (question не оценивается)
    """
    # 1. Получить текущий элемент из conversation
    # 2. Проверить, что элемент является question
    # 3. Получить feedback для выбранного варианта (если указан)
    # 4. Вернуть feedback
    # 5. Сохранить результат в базу данных (без оценки)
```

**Модель запроса:**
```python
class QuestionAnswerRequest(BaseModel):
    element_id: str
    selected_answer_index: int  # Индекс выбранного ответа в массиве answers
```

**Модель ответа:**
```python
class QuestionAnswerResponse(BaseModel):
    feedback: str  # Feedback для выбранного варианта (может быть пустым)
    score: int = 0  # Всегда 0, так как question не оценивается
```

#### 5. Сохранение результатов question

Добавить сохранение результатов question в таблицу `conversation`:
- Сохранять выбранный ответ пользователя
- **Не сохранять** правильность ответа (так как нет правильного ответа)
- Сохранять `score`: 0
- Сохранять `max_score`: 0
- Сохранять feedback (если указан)

### Frontend (`webapp/frontend`)

#### 1. Обновить интерфейсы типов

Добавить интерфейсы для question элементов в `app/course/[courseId]/page.tsx`:

```typescript
interface QuestionAnswer {
  text: string
  feedback?: string
}

interface QuestionElement {
  element_id: string
  type: "question"
  text: string
  answers: QuestionAnswer[]
}

// Обновить общий тип элемента
type CourseElement = MessageElement | QuizElement | AudioElement | InputElement | QuestionElement
```

#### 2. Создать компонент QuestionView

Создать новый компонент `components/chat/QuestionView.tsx` для отображения question:

```typescript
interface QuestionViewProps {
  question: QuestionElement
  onAnswerSelected: (answerIndex: number) => void
  selectedAnswer?: number
  showFeedback?: boolean
  feedback?: string
}

export default function QuestionView({ 
  question, 
  onAnswerSelected, 
  selectedAnswer,
  showFeedback,
  feedback
}: QuestionViewProps) {
  // Отображение:
  // 1. Вопрос (text) с форматированием Markdown/HTML
  // 2. Варианты ответов (answers) - кнопки или радио-кнопки
  // 3. Feedback после выбора (если showFeedback === true)
}
```

**Требования к компоненту:**
- Отображать вопрос (`text`) с форматированием Markdown/HTML
- Отображать варианты ответов как интерактивные кнопки или радио-кнопки
- После выбора ответа:
  - Отправлять ответ на backend через API
  - Показывать feedback для выбранного ответа (если указан)
  - **Не показывать** визуальную индикацию правильности (так как нет правильного ответа)
  - Автоматически переходить к следующему элементу после показа feedback

#### 3. Интеграция QuestionView в ChatView

Обновить компонент `ChatView.tsx` для поддержки question элементов:

```typescript
const renderElement = (element: CourseElement, index: number) => {
  // Обработка question элементов
  if ('type' in element && element.type === 'question') {
    const question = element as QuestionElement
    const questionState = questionStates[question.element_id] || {}
    return (
      <div key={question.element_id || index} className="mb-3 flex flex-col justify-start px-2">
        <QuestionView
          question={question}
          onAnswerSelected={async (answerIndex) => {
            await onQuestionAnswer?.(question.element_id, answerIndex)
          }}
          selectedAnswer={questionState.selectedAnswer}
          showFeedback={questionState.showFeedback}
          feedback={questionState.feedback}
        />
      </div>
    )
  }
  // ... существующая логика для message, quiz, audio, input
}
```

#### 4. Обработка ответов на question

Добавить функцию обработки ответов в `app/course/[courseId]/page.tsx`:

```typescript
const handleQuestionAnswer = async (elementId: string, answerIndex: number) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${apiUrl}/api/mvp/courses/${courseId}/question/answer`,
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

Модифицировать функцию `handleNext()` для поддержки question элементов:
- После выбора ответа на question и показа feedback автоматически переходить к следующему элементу
- Сохранять состояние question (выбранный ответ, feedback) в истории сообщений
- Question элементы не используют автоматический переход (ожидают ответа пользователя)

#### 6. Стилизация QuestionView

**Требования к стилям:**
- Вопрос: крупный шрифт, выделение, поддержка Markdown/HTML форматирования
- Варианты ответов:
  - Кнопки с hover эффектами
  - Визуальное выделение выбранного ответа
  - **Нет цветовой индикации правильности** (в отличие от quiz)
  - Все варианты визуально равнозначны
- Feedback:
  - Отображается под вариантами ответов
  - Нейтральное выделение (без зеленого/красного цвета)
  - Плавная анимация появления

## Примеры использования

### Простой question с 2 вариантами ответа

```yaml
Test_Question_01:
  type: question
  text: |
    Делаешь ли ты что-то на уроках для создания комфортной среды?
  answers:
    - text: Да
      feedback: Ты молодец, это очень важно.
    - text: Нет, не думал про это
      feedback: Тогда этот курс точно для тебя!
```

### Question с 3 вариантами ответа

```yaml
Test_Question_02:
  type: question
  text: |
    Какой формат обучения тебе больше нравится?
  answers:
    - text: Интерактивные упражнения
      feedback: Отлично! Мы используем много интерактивных элементов.
    - text: Видео и аудио материалы
      feedback: У нас есть много аудио и видео контента!
    - text: Текстовые материалы
      feedback: Текстовые материалы тоже важны для обучения.
```

### Question с вариантами без feedback

```yaml
Test_Question_04:
  type: question
  text: |
    Какой аспект английского языка тебя интересует больше всего?
  answers:
    - text: Грамматика
    - text: Словарный запас
    - text: Произношение
    - text: Разговорная практика
```

### Question с 4 вариантами ответа

```yaml
Test_Question_03:
  type: question
  text: |
    Сколько времени в день ты готов уделять изучению английского?
  answers:
    - text: Меньше 15 минут
      feedback: Даже 15 минут в день могут дать результат, если заниматься регулярно!
    - text: 15-30 минут
      feedback: Это хороший темп для стабильного прогресса.
    - text: 30-60 минут
      feedback: Отличный темп! Ты сможешь быстро продвигаться.
    - text: Больше часа
      feedback: Впечатляюще! С таким подходом ты достигнешь отличных результатов.
```

## Приоритеты реализации

1. **Высокий приоритет:** Базовая функциональность question
   - Отображение вопроса и вариантов ответов
   - Обработка выбора ответа
   - Отображение feedback
   - Сохранение результатов (без оценки)

2. **Средний приоритет:** Улучшения UX
   - Анимации при выборе ответа
   - Визуальное выделение выбранного ответа
   - Автоматический переход к следующему элементу после feedback

3. **Низкий приоритет:** Дополнительные функции
   - Поддержка медиа файлов (если добавить в будущем)
   - Расширенная статистика по результатам опросов

## Дополнительные замечания

1. **Валидация данных:**
   - Проверка наличия `text` (обязательное поле)
   - Проверка наличия хотя бы одного варианта ответа в `answers`
   - Проверка максимальной длины вопроса (300 символов)
   - Валидация структуры `answers` (каждый должен иметь `text`)

2. **Обработка ошибок:**
   - Обработка случаев, когда question элемент не найден
   - Обработка ошибок при отправке ответа на backend
   - Обработка случаев, когда выбран неверный индекс ответа

3. **Производительность:**
   - Оптимизация рендеринга большого количества вариантов ответов
   - Кэширование результатов question

4. **Доступность (Accessibility):**
   - Поддержка клавиатурной навигации
   - ARIA атрибуты для screen readers
   - Контрастность цветов для визуальной индикации

5. **Совместимость:**
   - Обеспечить обратную совместимость с существующими курсами без question элементов
   - Курсы только с `message`, `quiz`, `audio` и `input` элементами должны работать как раньше

6. **Отличия от Quiz:**
   - Визуально question должен отличаться от quiz (нет индикации правильности)
   - Все варианты ответов должны выглядеть равнозначно
   - Feedback должен быть нейтральным (без зеленого/красного цвета)

## Тестирование

После реализации необходимо протестировать:

1. **Базовая функциональность:**
   - Отображение question элемента с вопросом и вариантами
   - Выбор варианта ответа
   - Отображение feedback после выбора
   - Переход к следующему элементу после question

2. **Различные конфигурации:**
   - Question с 2 вариантами ответов
   - Question с 3 вариантами ответов
   - Question с 4+ вариантами ответов
   - Question без feedback для некоторых вариантов
   - Question без feedback вообще

3. **Обработка ошибок:**
   - Question элемент не найден
   - Ошибки при отправке ответа на backend
   - Неверный индекс ответа

4. **Интеграция:**
   - Question после message элементов
   - Question после quiz элементов
   - Question после audio элементов
   - Question после input элементов
   - Message элементы после question
   - Несколько question элементов подряд
   - Question в начале курса
   - Question в конце курса

5. **UX:**
   - Визуальное выделение выбранного ответа
   - Отсутствие индикации правильности (в отличие от quiz)
   - Плавные анимации
   - Адаптивность на мобильных устройствах
   - Работа с клавиатурой

6. **Сохранение результатов:**
   - Корректное сохранение выбранного ответа
   - Корректное сохранение score = 0 и max_score = 0
   - Сохранение feedback (если указан)
   - Возможность просмотра истории ответов

## API Endpoints

### POST `/api/mvp/courses/{course_id}/question/answer`

Отправка ответа на question элемент.

**Request Body:**
```json
{
  "element_id": "Test_Question_01",
  "selected_answer_index": 0
}
```

**Response:**
```json
{
  "feedback": "Ты молодец, это очень важно.",
  "score": 0
}
```

**Error Responses:**
- `400 Bad Request`: Неверный формат запроса или элемент не является question
- `404 Not Found`: Элемент не найден
- `500 Internal Server Error`: Ошибка сервера

### Изменения в существующих endpoints

**GET `/api/mvp/courses/{course_id}/current`:**
- Должен возвращать `QuestionElement` или словарь с полем `type: "question"` для question элементов
- Формат ответа должен соответствовать модели `QuestionElement`

**POST `/api/mvp/courses/{course_id}/next`:**
- Должен обрабатывать переход от question элементов
- Должен сохранять question элементы в conversation с типом `"question"`
- Должен возвращать следующий элемент (может быть message, quiz, audio, input или question)

## Особенности реализации

1. **Отсутствие оценки:**
   - Question элементы не оцениваются (score всегда 0)
   - Не нужно проверять правильность ответа
   - Не нужно показывать визуальную индикацию правильности

2. **Feedback:**
   - Feedback опционален для каждого варианта ответа
   - Если feedback не указан, можно показать нейтральное сообщение или просто перейти к следующему элементу
   - Feedback должен быть нейтральным (без индикации правильности)

3. **Визуальное отличие от Quiz:**
   - Все варианты ответов должны выглядеть одинаково (нет выделения правильного/неправильного)
   - После выбора ответа не должно быть зеленого/красного цвета
   - Можно использовать нейтральный цвет (например, синий) для выделения выбранного ответа

4. **Совместимость с существующей архитектурой:**
   - Использовать тот же подход, что и для quiz элементов
   - Интегрировать в существующий `ChatView` компонент
   - Использовать существующую систему сохранения результатов в базу данных

5. **Состояние компонента:**
   - Управление состоянием выбранного ответа
   - Управление отображением feedback
   - Автоматический переход к следующему элементу после показа feedback
