# Требования: Поддержка Input элементов в MVP веб-версии

## Текущее состояние

В MVP веб-версии **не реализована** поддержка элементов типа `input`. В настоящее время MVP поддерживает только элементы типа `message`, `quiz` и `audio`.

## Описание Input элемента

Согласно документации `docs/elements.md`, элемент `input` предназначен для получения текстового ответа от пользователя. Может проверять правильность ответа с различными типами нормализации ввода. Используется для упражнений на ввод текста, ответов на вопросы, последовательностей цифр и т.д.

## Требования к реализации

### Параметры Input элемента

Согласно документации, элемент `input` должен поддерживать следующие параметры:

- `type`: `input` (обязательно)
- `text` (обязательно) - вопрос или инструкция для пользователя
- `correct_answer` (опционально) - правильный ответ для проверки
- `feedback_correct` (опционально) - сообщение при правильном ответе
- `feedback_incorrect` (опционально) - сообщение при неправильном ответе
- `input_type` (опционально) - тип нормализации ввода:
  - `text` (по умолчанию) - стандартное текстовое сравнение (регистронезависимое)
  - `sequence` - нормализация последовательностей цифр (игнорирует разделители: пробелы, запятые и т.д.)

### Поведение Input элемента

1. Отображается вопрос или инструкция (`text`)
2. Пользователь вводит текстовый ответ в поле ввода
3. Если указан `correct_answer`, ответ проверяется:
   - Для `input_type: text` - регистронезависимое сравнение строк
   - Для `input_type: sequence` - нормализация последовательностей цифр (убираются все разделители перед сравнением)
4. В зависимости от результата отправляется соответствующий feedback
5. Результат сохраняется в отчет с оценкой (1 за правильный ответ, 0 за неправильный)
6. После отправки ответа и показа feedback элемент переходит к следующему

**Особенности нормализации:**

- **`input_type: text` (по умолчанию):**
  - Регистронезависимое сравнение (например, "Байден" = "байден" = "БАЙДЕН")
  - Сравнение без учета пробелов в начале и конце строки
  - Точное совпадение содержимого

- **`input_type: sequence`:**
  - Все нецифровые символы игнорируются при сравнении
  - Примеры эквивалентных ответов: `"1,2,3"`, `"1 2 3"`, `"1, 2, 3"`, `"123"`
  - Используется для последовательностей цифр (номера картинок, порядок элементов и т.д.)

## Требования к реализации

### Backend (`webapp/backend/app/api/v1/mvp.py`)

#### 1. Создать модель `InputElement`

Добавить новую модель Pydantic для input элементов:

```python
class InputElement(BaseModel):
    element_id: str
    type: str = Field(default="input", exclude=False)  # Всегда включать в JSON
    text: str
    correct_answer: Optional[str] = None
    feedback_correct: Optional[str] = None
    feedback_incorrect: Optional[str] = None
    input_type: Optional[str] = "text"  # "text" или "sequence"
```

#### 2. Обновить функции загрузки элементов из YAML

Добавить поддержку input элементов в функции:
- `get_course_data()` - добавить фильтрацию `type: input`
- `get_first_element_from_course()` - добавить обработку `type: input`
- `get_next_element_from_course()` - добавить обработку `type: input`
- `get_current_element_from_conversation()` - добавить обработку input элементов из базы данных

**Логика обработки:**
```python
if element_type == "input":
    result = {
        "element_id": element_id,
        "type": "input",
        "text": element_data.get("text", ""),
        "correct_answer": element_data.get("correct_answer"),
        "feedback_correct": element_data.get("feedback_correct"),
        "feedback_incorrect": element_data.get("feedback_incorrect"),
        "input_type": element_data.get("input_type", "text"),
    }
    logger.info(f"get_first_element_from_course: input element_id={element_id}")
    return result
```

#### 3. Обновить сохранение элементов в базу данных

Модифицировать функции `start_course()` и `next_element()` для сохранения input элементов:
- Сохранять тип элемента как `"input"` в поле `type` в `json_data`
- Сохранять все параметры input (`text`, `correct_answer`, `feedback_correct`, `feedback_incorrect`, `input_type`) в `json_data`

#### 4. Создать endpoint для отправки ответа на input

Добавить новый endpoint для обработки ответов пользователя:

```python
@router.post("/courses/{course_id}/input/answer")
def submit_input_answer(
    course_id: str,
    answer_data: InputAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """
    Обработка ответа пользователя на input элемент
    
    Параметры:
    - course_id: ID курса
    - answer_data: данные ответа (element_id, user_answer)
    - chat_id: ID чата пользователя
    
    Возвращает:
    - feedback: сообщение обратной связи
    - is_correct: правильность ответа
    - score: оценка (1 или 0)
    """
    # 1. Получить текущий элемент из conversation
    # 2. Проверить, что элемент является input
    # 3. Нормализовать ответ пользователя в зависимости от input_type
    # 4. Сравнить с correct_answer (если указан)
    # 5. Вернуть feedback и результат
    # 6. Сохранить результат в базу данных
```

**Модель запроса:**
```python
class InputAnswerRequest(BaseModel):
    element_id: str
    user_answer: str  # Ответ пользователя
```

**Модель ответа:**
```python
class InputAnswerResponse(BaseModel):
    is_correct: bool
    feedback: str
    score: int  # 1 или 0
```

**Логика нормализации и сравнения:**

```python
def normalize_answer(answer: str, input_type: str) -> str:
    """Нормализация ответа в зависимости от типа input"""
    if input_type == "sequence":
        # Убираем все нецифровые символы
        import re
        return re.sub(r'\D', '', answer)
    else:  # input_type == "text"
        # Регистронезависимое сравнение, убираем пробелы в начале и конце
        return answer.strip().lower()

def compare_answers(user_answer: str, correct_answer: str, input_type: str) -> bool:
    """Сравнение ответов с учетом типа нормализации"""
    normalized_user = normalize_answer(user_answer, input_type)
    normalized_correct = normalize_answer(correct_answer, input_type)
    return normalized_user == normalized_correct
```

#### 5. Сохранение результатов input

Добавить сохранение результатов input в таблицу `conversation`:
- Сохранять введенный ответ пользователя (`user_answer`)
- Сохранять правильность ответа (`is_correct`)
- Сохранять оценку (`score`: 1 или 0)
- Сохранять `max_score`: 1
- Сохранять `input_type` для возможности повторной проверки

### Frontend (`webapp/frontend`)

#### 1. Обновить интерфейсы типов

Добавить интерфейсы для input элементов в `app/course/[courseId]/page.tsx`:

```typescript
interface InputElement {
  element_id: string
  type: "input"
  text: string
  correct_answer?: string
  feedback_correct?: string
  feedback_incorrect?: string
  input_type?: string  // "text" или "sequence"
}

// Обновить общий тип элемента
type CourseElement = MessageElement | QuizElement | AudioElement | InputElement
```

#### 2. Создать компонент InputView

Создать новый компонент `components/chat/InputView.tsx` для отображения input:

```typescript
interface InputViewProps {
  input: InputElement
  onAnswerSubmitted: (answer: string) => void
  submittedAnswer?: string
  showFeedback?: boolean
  feedback?: string
  isCorrect?: boolean
}

export default function InputView({ 
  input, 
  onAnswerSubmitted, 
  submittedAnswer,
  showFeedback,
  feedback,
  isCorrect 
}: InputViewProps) {
  // Отображение:
  // 1. Вопрос/инструкция (text) с форматированием Markdown/HTML
  // 2. Поле ввода текста
  // 3. Кнопка отправки ответа
  // 4. Feedback после отправки (если showFeedback === true)
}
```

**Требования к компоненту:**
- Отображать вопрос/инструкцию (`text`) с форматированием Markdown/HTML
- Отображать поле ввода текста (`<input type="text">` или `<textarea>`)
- Для `input_type: sequence` можно добавить подсказку о формате ввода
- После отправки ответа:
  - Отправлять ответ на backend через API
  - Показывать feedback (правильный/неправильный)
  - Визуально выделять результат (зеленый для правильного, красный для неправильного)
  - Автоматически переходить к следующему элементу после показа feedback

#### 3. Интеграция InputView в ChatView

Обновить компонент `ChatView.tsx` для поддержки input элементов:

```typescript
const renderElement = (element: CourseElement, index: number) => {
  // Обработка input элементов
  if ('type' in element && element.type === 'input') {
    const input = element as InputElement
    return (
      <div key={input.element_id || index} className="mb-3 flex flex-col justify-start px-2">
        <InputView
          input={input}
          onAnswerSubmitted={handleInputAnswer}
          // ... другие пропсы
        />
      </div>
    )
  }
  // ... существующая логика для message, quiz, audio
}
```

#### 4. Обработка ответов на input

Добавить функцию обработки ответов в `app/course/[courseId]/page.tsx`:

```typescript
const handleInputAnswer = async (elementId: string, userAnswer: string) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${apiUrl}/api/mvp/courses/${courseId}/input/answer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          element_id: elementId,
          user_answer: userAnswer,
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

Модифицировать функцию `handleNext()` для поддержки input элементов:
- После отправки ответа на input и показа feedback автоматически переходить к следующему элементу
- Сохранять состояние input (введенный ответ, feedback) в истории сообщений

#### 6. Стилизация InputView

**Требования к стилям:**
- Вопрос/инструкция: крупный шрифт, выделение, поддержка Markdown/HTML форматирования
- Поле ввода:
  - Адаптивная ширина
  - Поддержка многострочного ввода (если нужно)
  - Плейсхолдер с подсказкой (особенно для `input_type: sequence`)
  - Валидация ввода (для `input_type: sequence` можно ограничить только цифрами и разделителями)
- Кнопка отправки:
  - Выделенная кнопка "Отправить" или "Проверить"
  - Disabled состояние во время отправки
- Feedback:
  - Отображается под полем ввода
  - Выделение цветом (зеленый для правильного, красный для неправильного)
  - Плавная анимация появления
  - Показ правильного ответа при неправильном ответе (если указан `correct_answer`)

## Примеры использования

### Простой текстовый input

```yaml
Test_Input_01:
  type: input
  text: |
    ✏️ Задание
    
    Как переводится слово "Important"?
    
    Напиши синоним на английском языке.
  correct_answer: Essential
  feedback_correct: |
    ✅ Правильно!
    
    "Important" и "Essential" — синонимы, означают "важный", "существенный".
  feedback_incorrect: |
    ❌ Неправильно.
    
    Правильный ответ: Essential
    
    "Important" означает "важный", а его синоним — "Essential" (существенный).
```

### Input с последовательностью цифр

```yaml
Test_Input_03:
  type: input
  input_type: sequence
  text: |
    ✏️ Задание на аудирование
    
    Прослушай аудио и соотнеси описания с картинками.
    
    Напиши номера картинок в том порядке, как они идут в аудио.
    
    Можно использовать любые разделители (пробелы, запятые и т.д.).
    
    Пример: 3 1 6 2 4 5
  correct_answer: "3 1 6 2 4 5"
  feedback_correct: |
    ✅ Отлично!
    
    Ты правильно сопоставил все описания с картинками.
  feedback_incorrect: |
    ❌ Почти получилось.
    
    Проверь порядок и переслушай аудио.
    
    Правильный ответ: 3 1 6 2 4 5
```

### Input без проверки (только сбор ответа)

```yaml
Test_Input_06:
  type: input
  text: |
    Расскажи о себе.
    
    Напиши несколько предложений о своих интересах и увлечениях.
  # Нет correct_answer, feedback не требуется
```

### Input с HTML форматированием

```yaml
Test_Input_04:
  type: input
  parse_mode: HTML
  text: |
    <b>Задание на перевод</b>
    
    Как будет по-английски фраза <i>"я полагаю"</i>?
    
    Напиши формальный вариант (2 слова).
  correct_answer: I reckon
  feedback_correct: |
    ✅ Правильно!
    
    "I reckon" — это более формальный способ сказать "I think" (я полагаю, я считаю).
  feedback_incorrect: |
    ❌ Неправильно.
    
    Правильный ответ: I reckon
    
    "I reckon" — это формальный вариант фразы "I think" (я полагаю).
```

## Приоритеты реализации

1. **Высокий приоритет:** Базовая функциональность input
   - Отображение вопроса и поля ввода
   - Обработка отправки ответа
   - Нормализация и сравнение ответов (оба типа: text и sequence)
   - Отображение feedback
   - Сохранение результатов

2. **Средний приоритет:** Улучшения UX
   - Валидация ввода для `input_type: sequence` (только цифры и разделители)
   - Подсказки о формате ввода
   - Поддержка многострочного ввода (textarea для длинных ответов)
   - Автоматический переход к следующему элементу после feedback

3. **Низкий приоритет:** Дополнительные функции
   - Поддержка автодополнения (если нужно)
   - Подсветка правильных/неправильных частей ответа
   - Возможность редактирования ответа перед отправкой
   - История введенных ответов

## Дополнительные замечания

1. **Валидация данных:**
   - Проверка наличия `text` (обязательное поле)
   - Если указан `correct_answer`, должны быть указаны оба feedback (`feedback_correct` и `feedback_incorrect`)
   - Валидация `input_type` (только "text" или "sequence")
   - Проверка формата `correct_answer` для `input_type: sequence` (должен содержать цифры)

2. **Обработка ошибок:**
   - Обработка случаев, когда input элемент не найден
   - Обработка ошибок при отправке ответа на backend
   - Валидация пустого ответа пользователя
   - Обработка случаев, когда `correct_answer` не указан (только сбор ответа без проверки)

3. **Производительность:**
   - Оптимизация нормализации ответов (особенно для `input_type: sequence`)
   - Кэширование результатов проверки (если нужно)
   - Оптимизация рендеринга длинных текстов вопросов

4. **Доступность (Accessibility):**
   - Поддержка клавиатурной навигации
   - ARIA атрибуты для screen readers
   - Подсказки для пользователей о формате ввода
   - Контрастность цветов для визуальной индикации

5. **Совместимость:**
   - Обеспечить обратную совместимость с существующими курсами без input элементов
   - Курсы только с `message`, `quiz` и `audio` элементами должны работать как раньше
   - Поддержка различных браузеров и их возможностей ввода текста

6. **Нормализация ответов:**
   - Для `input_type: text`: регистронезависимое сравнение, удаление пробелов в начале и конце
   - Для `input_type: sequence`: удаление всех нецифровых символов перед сравнением
   - Учет различных вариантов написания (если нужно, можно расширить логику нормализации)

## Тестирование

После реализации необходимо протестировать:

1. **Базовая функциональность:**
   - Отображение input элемента с вопросом
   - Ввод текстового ответа
   - Отправка ответа
   - Отображение feedback после отправки
   - Переход к следующему элементу после input

2. **Различные типы нормализации:**
   - `input_type: text` - регистронезависимое сравнение
   - `input_type: sequence` - нормализация последовательностей цифр
   - Различные варианты разделителей для sequence (пробелы, запятые, точки с запятой)

3. **Различные конфигурации:**
   - Input с `correct_answer` и feedback
   - Input без `correct_answer` (только сбор ответа)
   - Input с HTML форматированием текста
   - Input с Markdown форматированием текста

4. **Обработка ошибок:**
   - Пустой ответ пользователя
   - Input элемент не найден
   - Ошибки при отправке ответа на backend
   - Некорректный формат `correct_answer` для `input_type: sequence`

5. **Интеграция:**
   - Input после message элементов
   - Input после quiz элементов
   - Input после audio элементов
   - Message элементы после input
   - Несколько input элементов подряд
   - Input в начале курса
   - Input в конце курса

6. **UX:**
   - Визуальная индикация правильного/неправильного ответа
   - Плавные анимации
   - Адаптивность на мобильных устройствах
   - Работа с клавиатурой
   - Валидация ввода для `input_type: sequence`

7. **Нормализация:**
   - Правильное сравнение для `input_type: text` (регистронезависимое)
   - Правильное сравнение для `input_type: sequence` (игнорирование разделителей)
   - Различные варианты написания одного и того же ответа

## API Endpoints

### POST `/api/mvp/courses/{course_id}/input/answer`

Отправка ответа на input элемент.

**Request Body:**
```json
{
  "element_id": "Test_Input_01",
  "user_answer": "Essential"
}
```

**Response:**
```json
{
  "is_correct": true,
  "feedback": "✅ Правильно!\n\n\"Important\" и \"Essential\" — синонимы, означают \"важный\", \"существенный\".",
  "score": 1
}
```

**Error Responses:**
- `400 Bad Request`: Неверный формат запроса или элемент не является input
- `404 Not Found`: Элемент не найден
- `500 Internal Server Error`: Ошибка сервера

### Изменения в существующих endpoints

**GET `/api/mvp/courses/{course_id}/current`:**
- Должен возвращать `InputElement` или словарь с полем `type: "input"` для input элементов
- Формат ответа должен соответствовать модели `InputElement`

**POST `/api/mvp/courses/{course_id}/next`:**
- Должен обрабатывать переход от input элементов
- Должен сохранять input элементы в conversation с типом `"input"`
- Должен возвращать следующий элемент (может быть message, quiz, audio или input)

## Особенности реализации

1. **Нормализация ответов:**
   - Для `input_type: text`: использовать `.strip().lower()` для регистронезависимого сравнения
   - Для `input_type: sequence`: использовать регулярное выражение для удаления всех нецифровых символов
   - Убедиться, что нормализация применяется одинаково к ответу пользователя и `correct_answer`

2. **Обработка пустых ответов:**
   - Если пользователь отправил пустой ответ, можно показать предупреждение или обработать как неправильный ответ
   - Для `input_type: sequence` пустой ответ должен считаться неправильным

3. **Input без проверки:**
   - Если `correct_answer` не указан, элемент должен просто собирать ответ пользователя
   - В этом случае не нужно показывать feedback о правильности
   - Можно показать сообщение типа "Ответ сохранен" или просто перейти к следующему элементу

4. **Совместимость с существующей архитектурой:**
   - Использовать тот же подход, что и для quiz элементов
   - Интегрировать в существующий `ChatView` компонент
   - Использовать существующую систему сохранения результатов в базу данных

5. **Валидация ввода на фронтенде:**
   - Для `input_type: sequence` можно добавить валидацию в реальном времени
   - Показывать подсказку о допустимых символах
   - Предотвращать ввод недопустимых символов (опционально)

6. **Многострочный ввод:**
   - Для длинных ответов можно использовать `<textarea>` вместо `<input>`
   - Определять необходимость многострочного ввода по длине `text` или специальному параметру (если добавить)
