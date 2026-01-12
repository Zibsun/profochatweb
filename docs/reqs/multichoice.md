# Требования: Поддержка MultiChoice элементов в MVP веб-версии

## Текущее состояние

В MVP веб-версии **не реализована** поддержка элементов типа `multi_choice`. В настоящее время MVP поддерживает только элементы типа `message`, `quiz`, `audio`, `input` и `question`.

## Описание MultiChoice элемента

Согласно документации `docs/elements.md`, элемент `multi_choice` представляет собой множественный выбор с несколькими правильными ответами. Пользователь может выбрать несколько вариантов одновременно. В Telegram он отправляется как Poll с `allows_multiple_answers = True`, но в веб-версии должен быть реализован как интерактивный компонент с чекбоксами или множественным выбором.

## Требования к реализации

### Параметры MultiChoice элемента

Согласно документации, элемент `multi_choice` должен поддерживать следующие параметры:

- `type`: `multi_choice` (обязательно)
- `text` (обязательно) - вопрос (максимум 300 символов)
- `answers` (обязательно) - массив вариантов ответов:
  - `text` (обязательно) - текст варианта ответа
  - `correct` (опционально) - `yes` для правильного ответа, `no` для неправильного
  - `feedback` (опционально) - сообщение для этого варианта
- `feedback_correct` (обязательно) - сообщение при полностью правильном ответе
- `feedback_partial` (обязательно) - сообщение при частично правильном ответе
- `feedback_incorrect` (обязательно) - сообщение при неправильном ответе

### Поведение MultiChoice элемента

1. Отображается вопрос
2. Пользователь может выбрать **несколько** вариантов ответа одновременно (чекбоксы)
3. После выбора вариантов и отправки ответа:
   - Показывается детальный feedback по каждому выбранному варианту
   - Затем показывается итоговое сообщение в зависимости от результата:
     - `feedback_correct` - если все правильные выбраны и все неправильные не выбраны
     - `feedback_partial` - если есть частично правильные ответы (выбраны не все правильные или выбраны некоторые неправильные)
     - `feedback_incorrect` - если все выбранные ответы неправильные или не выбраны правильные
4. Оценка: 1 (полностью правильно), 0.5 (частично), 0 (неправильно)
5. После показа feedback элемент переходит к следующему

**Отличия от Quiz и Question:**
- В `quiz` можно выбрать только один вариант, в `multi_choice` - несколько
- В `quiz` есть один правильный ответ, в `multi_choice` - несколько правильных
- В `question` нет правильных ответов, в `multi_choice` - есть правильные и неправильные
- `multi_choice` имеет три типа итогового feedback (correct, partial, incorrect)
- `multi_choice` оценивается по шкале 0, 0.5, 1

## Требования к реализации

### Backend (`webapp/backend/app/api/v1/mvp.py`)

#### 1. Создать модель `MultiChoiceElement`

Добавить новую модель Pydantic для multi_choice элементов:

```python
class MultiChoiceAnswer(BaseModel):
    text: str
    correct: Optional[str] = None  # "yes" для правильного, "no" для неправильного
    feedback: Optional[str] = None

class MultiChoiceElement(BaseModel):
    element_id: str
    type: str = Field(default="multi_choice", exclude=False)  # Всегда включать в JSON
    text: str
    answers: List[MultiChoiceAnswer]
    feedback_correct: str
    feedback_partial: str
    feedback_incorrect: str
```

#### 2. Обновить функции загрузки элементов из YAML

Добавить поддержку multi_choice элементов в функции:
- `get_course_data()` - добавить фильтрацию `type: multi_choice`
- `get_first_element_from_course()` - добавить обработку `type: multi_choice`
- `get_next_element_from_course()` - добавить обработку `type: multi_choice`
- `get_current_element_from_conversation()` - добавить обработку multi_choice элементов из базы данных

**Логика обработки:**
```python
if element_type == "multi_choice":
    # Нормализуем answers: преобразуем correct из boolean в строку "yes"/"no"
    answers = element_data.get("answers", [])
    normalized_answers = []
    for answer in answers:
        normalized_answer = answer.copy()
        correct_value = answer.get("correct")
        if correct_value is True or correct_value == "yes":
            normalized_answer["correct"] = "yes"
        elif correct_value is False or correct_value == "no":
            normalized_answer["correct"] = "no"
        normalized_answers.append(normalized_answer)
    
    result = {
        "element_id": element_id,
        "type": "multi_choice",
        "text": element_data.get("text", ""),
        "answers": normalized_answers,
        "feedback_correct": element_data.get("feedback_correct", ""),
        "feedback_partial": element_data.get("feedback_partial", ""),
        "feedback_incorrect": element_data.get("feedback_incorrect", ""),
    }
    logger.info(f"get_first_element_from_course: multi_choice element_id={element_id}")
    return result
```

#### 3. Обновить сохранение элементов в базу данных

Модифицировать функции `start_course()` и `next_element()` для сохранения multi_choice элементов:
- Сохранять тип элемента как `"multi_choice"` в поле `type` в `json_data`
- Сохранять все параметры multi_choice (`text`, `answers`, `feedback_correct`, `feedback_partial`, `feedback_incorrect`) в `json_data`

#### 4. Создать endpoint для отправки ответа на multi_choice

Добавить новый endpoint для обработки ответов пользователя:

```python
@router.post("/courses/{course_id}/multichoice/answer")
def submit_multichoice_answer(
    course_id: str,
    answer_data: MultiChoiceAnswerRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """
    Обработка ответа пользователя на multi_choice элемент
    
    Параметры:
    - course_id: ID курса
    - answer_data: данные ответа (element_id, selected_answer_indices)
    - chat_id: ID чата пользователя
    
    Возвращает:
    - feedback: итоговое сообщение обратной связи (correct/partial/incorrect)
    - individual_feedbacks: массив feedback для каждого выбранного варианта
    - score: оценка (1, 0.5 или 0)
    - is_correct: полностью правильно (True) или нет (False)
    """
    # 1. Получить текущий элемент из conversation
    # 2. Проверить, что элемент является multi_choice
    # 3. Определить правильные и неправильные ответы
    # 4. Вычислить результат (correct/partial/incorrect)
    # 5. Вернуть feedback и результат
    # 6. Сохранить результат в базу данных
```

**Модель запроса:**
```python
class MultiChoiceAnswerRequest(BaseModel):
    element_id: str
    selected_answer_indices: List[int]  # Массив индексов выбранных ответов
```

**Модель ответа:**
```python
class IndividualFeedback(BaseModel):
    answer_index: int
    answer_text: str
    feedback: Optional[str] = None

class MultiChoiceAnswerResponse(BaseModel):
    is_correct: bool  # True если полностью правильно
    feedback: str  # Итоговое сообщение (correct/partial/incorrect)
    individual_feedbacks: List[IndividualFeedback]  # Feedback для каждого выбранного варианта
    score: float  # 1.0, 0.5 или 0.0
```

**Логика определения результата:**
```python
def calculate_multichoice_result(selected_indices: List[int], answers: List[dict]) -> tuple:
    """
    Вычисляет результат multi_choice ответа
    
    Возвращает:
    - (is_correct, result_type, score)
    - result_type: "correct", "partial" или "incorrect"
    """
    # Находим все правильные и неправильные ответы
    correct_indices = [i for i, ans in enumerate(answers) if ans.get("correct") == "yes"]
    incorrect_indices = [i for i, ans in enumerate(answers) if ans.get("correct") == "no"]
    
    selected_correct = [i for i in selected_indices if i in correct_indices]
    selected_incorrect = [i for i in selected_indices if i in incorrect_indices]
    
    # Определяем результат
    all_correct_selected = len(selected_correct) == len(correct_indices)
    no_incorrect_selected = len(selected_incorrect) == 0
    
    if all_correct_selected and no_incorrect_selected:
        return (True, "correct", 1.0)
    elif len(selected_correct) > 0 or len(selected_incorrect) < len(incorrect_indices):
        return (False, "partial", 0.5)
    else:
        return (False, "incorrect", 0.0)
```

#### 5. Сохранение результатов multi_choice

Добавить сохранение результатов multi_choice в таблицу `conversation`:
- Сохранять выбранные ответы пользователя (массив индексов)
- Сохранять результат (`is_correct`, `result_type`)
- Сохранять оценку (`score`: 1.0, 0.5 или 0.0)
- Сохранять `max_score`: 1.0

### Frontend (`webapp/frontend`)

#### 1. Обновить интерфейсы типов

Добавить интерфейсы для multi_choice элементов в `app/course/[courseId]/page.tsx`:

```typescript
interface MultiChoiceAnswer {
  text: string
  correct?: string  // "yes" для правильного, "no" для неправильного
  feedback?: string
}

interface MultiChoiceElement {
  element_id: string
  type: "multi_choice"
  text: string
  answers: MultiChoiceAnswer[]
  feedback_correct: string
  feedback_partial: string
  feedback_incorrect: string
}

// Обновить общий тип элемента
type CourseElement = MessageElement | QuizElement | AudioElement | InputElement | QuestionElement | MultiChoiceElement
```

#### 2. Создать компонент MultiChoiceView

Создать новый компонент `components/chat/MultiChoiceView.tsx` для отображения multi_choice:

```typescript
interface MultiChoiceViewProps {
  multiChoice: MultiChoiceElement
  onAnswersSubmitted: (selectedIndices: number[]) => Promise<void>
  selectedAnswers?: number[]
  showFeedback?: boolean
  feedback?: string
  individualFeedbacks?: Array<{ answer_index: number; answer_text: string; feedback?: string }>
  isCorrect?: boolean
  score?: number
}

export default function MultiChoiceView({ 
  multiChoice, 
  onAnswersSubmitted, 
  selectedAnswers,
  showFeedback,
  feedback,
  individualFeedbacks,
  isCorrect,
  score
}: MultiChoiceViewProps) {
  // Отображение:
  // 1. Вопрос (text) с форматированием Markdown/HTML
  // 2. Варианты ответов (answers) - чекбоксы для множественного выбора
  // 3. Кнопка "Отправить" для подтверждения выбора
  // 4. Детальный feedback по каждому выбранному варианту
  // 5. Итоговое сообщение (correct/partial/incorrect)
}
```

**Требования к компоненту:**
- Отображать вопрос (`text`) с форматированием Markdown/HTML
- Отображать варианты ответов как чекбоксы (множественный выбор)
- Пользователь может выбрать несколько вариантов
- После выбора вариантов и нажатия "Отправить":
  - Отправлять ответ на backend через API
  - Показывать детальный feedback по каждому выбранному варианту
  - Показывать итоговое сообщение (correct/partial/incorrect)
  - Визуально выделять правильные/неправильные выбранные ответы
  - Автоматически переходить к следующему элементу после показа feedback

#### 3. Интеграция MultiChoiceView в ChatView

Обновить компонент `ChatView.tsx` для поддержки multi_choice элементов:

```typescript
const renderElement = (element: CourseElement, index: number) => {
  // Обработка multi_choice элементов
  if ('type' in element && element.type === 'multi_choice') {
    const multiChoice = element as MultiChoiceElement
    const multiChoiceState = multiChoiceStates[multiChoice.element_id] || {}
    return (
      <div key={multiChoice.element_id || index} className="mb-3 flex flex-col justify-start px-2">
        <MultiChoiceView
          multiChoice={multiChoice}
          onAnswersSubmitted={async (selectedIndices) => {
            await onMultiChoiceAnswer?.(multiChoice.element_id, selectedIndices)
          }}
          selectedAnswers={multiChoiceState.selectedAnswers}
          showFeedback={multiChoiceState.showFeedback}
          feedback={multiChoiceState.feedback}
          individualFeedbacks={multiChoiceState.individualFeedbacks}
          isCorrect={multiChoiceState.isCorrect}
          score={multiChoiceState.score}
        />
      </div>
    )
  }
  // ... существующая логика для других элементов
}
```

#### 4. Обработка ответов на multi_choice

Добавить функцию обработки ответов в `app/course/[courseId]/page.tsx`:

```typescript
const handleMultiChoiceAnswer = async (elementId: string, selectedIndices: number[]) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(
      `${apiUrl}/api/mvp/courses/${courseId}/multichoice/answer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          element_id: elementId,
          selected_answer_indices: selectedIndices,
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

Модифицировать функцию `handleNext()` для поддержки multi_choice элементов:
- После отправки ответа на multi_choice и показа feedback автоматически переходить к следующему элементу
- Сохранять состояние multi_choice (выбранные ответы, feedback) в истории сообщений
- Multi_choice элементы не используют автоматический переход (ожидают ответа пользователя)

#### 6. Стилизация MultiChoiceView

**Требования к стилям:**
- Вопрос: крупный шрифт, выделение, поддержка Markdown/HTML форматирования
- Варианты ответов:
  - Чекбоксы для множественного выбора
  - Кнопки с hover эффектами
  - Визуальное выделение выбранных ответов
  - После отправки: цветовая индикация правильности:
    - Правильный выбранный ответ: зеленый фон/граница
    - Неправильный выбранный ответ: красный фон/граница
    - Правильный невыбранный ответ: серый фон (показывается как пропущенный)
- Кнопка "Отправить":
  - Disabled если ничего не выбрано
  - Disabled во время отправки
- Детальный feedback:
  - Отображается под каждым выбранным вариантом
  - Выделение цветом (зеленый для правильного, красный для неправильного)
- Итоговое сообщение:
  - Отображается после детального feedback
  - Выделение цветом (зеленый для correct, желтый для partial, красный для incorrect)
  - Показ оценки (score: 1.0, 0.5 или 0.0)

## Примеры использования

### MultiChoice с 2 правильными ответами из 4 вариантов

```yaml
Test_MultiChoice_01:
  type: multi_choice
  text: |
    Выбери те критерии INVEST, которым эта история соответствует.
  feedback_correct: |
    ✅ Итог: отлично, все абсолютно верно!
    
    Ты правильно выбрал все критерии.
  feedback_partial: |
    ⚠️ Итог: почти верно, но есть одна неточность.
    
    Проверь свой выбор еще раз.
  feedback_incorrect: |
    ❌ Итог: неправильно.
    
    Эту тему нужно изучить подробнее.
  answers:
    - text: Независимая (Independent)
      correct: no
      feedback: Нет, эта история не является независимой.
    - text: Обсуждаемая (Negotiable)
      correct: yes
      feedback: Да! История обсуждаемая.
    - text: Оцениваемая (Estimable)
      correct: no
      feedback: Нет, история не оцениваемая.
    - text: Тестируемая (Testable)
      correct: yes
      feedback: Да! История тестируемая.
```

### MultiChoice с 3 правильными ответами из 5 вариантов

```yaml
Test_MultiChoice_02:
  type: multi_choice
  text: |
    Какие из следующих слов являются синонимами слова "Important"?
    
    Выбери все подходящие варианты.
  feedback_correct: |
    ✅ Отлично! Ты правильно выбрал все синонимы.
  feedback_partial: |
    ⚠️ Почти правильно! Некоторые варианты верны, но не все.
  feedback_incorrect: |
    ❌ Неправильно. Попробуй еще раз.
  answers:
    - text: Essential
      correct: yes
      feedback: Верно! "Essential" — синоним "Important".
    - text: Significant
      correct: yes
      feedback: Верно! "Significant" означает "важный".
    - text: Trivial
      correct: no
      feedback: Нет, "Trivial" означает "незначительный", это антоним.
    - text: Crucial
      correct: yes
      feedback: Верно! "Crucial" — синоним "Important".
    - text: Unimportant
      correct: no
      feedback: Нет, "Unimportant" — это антоним, означает "неважный".
```

### MultiChoice с вариантами без индивидуального feedback

```yaml
Test_MultiChoice_05:
  type: multi_choice
  text: |
    Какие из следующих форматов файлов поддерживаются для аудио?
  feedback_correct: |
    ✅ Правильно! Все выбранные форматы поддерживаются.
  feedback_partial: |
    ⚠️ Частично правильно.
  feedback_incorrect: |
    ❌ Неправильно.
  answers:
    - text: MP3
      correct: yes
    - text: WAV
      correct: yes
    - text: PDF
      correct: no
    - text: OGG
      correct: yes
```

## Приоритеты реализации

1. **Высокий приоритет:** Базовая функциональность multi_choice
   - Отображение вопроса и вариантов с чекбоксами
   - Обработка множественного выбора
   - Вычисление результата (correct/partial/incorrect)
   - Отображение детального и итогового feedback
   - Сохранение результатов

2. **Средний приоритет:** Улучшения UX
   - Визуальная индикация правильности выбранных ответов
   - Показ правильных невыбранных ответов после отправки
   - Анимации при выборе и отправке
   - Автоматический переход к следующему элементу после feedback

3. **Низкий приоритет:** Дополнительные функции
   - Поддержка медиа файлов (если добавить в будущем)
   - Расширенная статистика по результатам
   - Возможность изменения выбора перед отправкой

## Дополнительные замечания

1. **Валидация данных:**
   - Проверка наличия `text` (обязательное поле)
   - Проверка наличия хотя бы одного варианта ответа в `answers`
   - Проверка наличия всех трех типов feedback (`feedback_correct`, `feedback_partial`, `feedback_incorrect`)
   - Проверка наличия хотя бы одного правильного ответа (`correct: yes`)
   - Проверка максимальной длины вопроса (300 символов)

2. **Обработка ошибок:**
   - Обработка случаев, когда multi_choice элемент не найден
   - Обработка ошибок при отправке ответа на backend
   - Обработка случаев, когда не выбрано ни одного варианта
   - Обработка случаев, когда выбран неверный индекс ответа

3. **Производительность:**
   - Оптимизация рендеринга большого количества вариантов ответов
   - Кэширование результатов multi_choice

4. **Доступность (Accessibility):**
   - Поддержка клавиатурной навигации для чекбоксов
   - ARIA атрибуты для screen readers
   - Контрастность цветов для визуальной индикации

5. **Совместимость:**
   - Обеспечить обратную совместимость с существующими курсами без multi_choice элементов
   - Курсы только с другими типами элементов должны работать как раньше

6. **Логика вычисления результата:**
   - Правильно определять полностью правильный ответ (все правильные выбраны, все неправильные не выбраны)
   - Правильно определять частично правильный ответ (выбраны некоторые правильные или некоторые неправильные)
   - Правильно определять неправильный ответ (не выбраны правильные или выбраны только неправильные)

## Тестирование

После реализации необходимо протестировать:

1. **Базовая функциональность:**
   - Отображение multi_choice элемента с вопросом и вариантами
   - Выбор нескольких вариантов (чекбоксы)
   - Отправка ответа
   - Отображение детального feedback по каждому выбранному варианту
   - Отображение итогового сообщения (correct/partial/incorrect)
   - Переход к следующему элементу после multi_choice

2. **Различные конфигурации:**
   - Multi_choice с 2 правильными ответами из 4 вариантов
   - Multi_choice с 3 правильными ответами из 5 вариантов
   - Multi_choice с 1 правильным ответом из 3 вариантов
   - Multi_choice с 4 правильными ответами из 6 вариантов
   - Multi_choice без индивидуального feedback для некоторых вариантов

3. **Различные сценарии ответов:**
   - Полностью правильный ответ (все правильные выбраны, неправильные не выбраны)
   - Частично правильный ответ (выбраны некоторые правильные)
   - Частично правильный ответ (выбраны некоторые неправильные вместе с правильными)
   - Неправильный ответ (не выбраны правильные)
   - Неправильный ответ (выбраны только неправильные)

4. **Обработка ошибок:**
   - Multi_choice элемент не найден
   - Ошибки при отправке ответа на backend
   - Не выбрано ни одного варианта
   - Неверные индексы ответов

5. **Интеграция:**
   - Multi_choice после message элементов
   - Multi_choice после quiz элементов
   - Multi_choice после audio элементов
   - Multi_choice после input элементов
   - Multi_choice после question элементов
   - Message элементы после multi_choice
   - Несколько multi_choice элементов подряд
   - Multi_choice в начале курса
   - Multi_choice в конце курса

6. **UX:**
   - Визуальная индикация правильности выбранных ответов
   - Показ правильных невыбранных ответов после отправки
   - Плавные анимации
   - Адаптивность на мобильных устройствах
   - Работа с клавиатурой
   - Отображение оценки (score)

7. **Сохранение результатов:**
   - Корректное сохранение выбранных ответов (массив индексов)
   - Корректное сохранение результата (`is_correct`, `result_type`)
   - Корректное сохранение оценки (`score`: 1.0, 0.5 или 0.0)
   - Возможность просмотра истории ответов

## API Endpoints

### POST `/api/mvp/courses/{course_id}/multichoice/answer`

Отправка ответа на multi_choice элемент.

**Request Body:**
```json
{
  "element_id": "Test_MultiChoice_01",
  "selected_answer_indices": [1, 3]
}
```

**Response:**
```json
{
  "is_correct": true,
  "feedback": "✅ Итог: отлично, все абсолютно верно!\n\nТы правильно выбрал все критерии.",
  "individual_feedbacks": [
    {
      "answer_index": 1,
      "answer_text": "Обсуждаемая (Negotiable)",
      "feedback": "Да! История обсуждаемая."
    },
    {
      "answer_index": 3,
      "answer_text": "Тестируемая (Testable)",
      "feedback": "Да! История тестируемая."
    }
  ],
  "score": 1.0
}
```

**Error Responses:**
- `400 Bad Request`: Неверный формат запроса или элемент не является multi_choice
- `404 Not Found`: Элемент не найден
- `500 Internal Server Error`: Ошибка сервера

### Изменения в существующих endpoints

**GET `/api/mvp/courses/{course_id}/current`:**
- Должен возвращать `MultiChoiceElement` или словарь с полем `type: "multi_choice"` для multi_choice элементов
- Формат ответа должен соответствовать модели `MultiChoiceElement`

**POST `/api/mvp/courses/{course_id}/next`:**
- Должен обрабатывать переход от multi_choice элементов
- Должен сохранять multi_choice элементы в conversation с типом `"multi_choice"`
- Должен возвращать следующий элемент (может быть любой тип)

## Особенности реализации

1. **Множественный выбор:**
   - Использовать чекбоксы вместо радио-кнопок
   - Пользователь может выбрать несколько вариантов одновременно
   - Кнопка "Отправить" должна быть disabled если ничего не выбрано

2. **Вычисление результата:**
   - Правильно определять полностью правильный ответ (все правильные выбраны, неправильные не выбраны)
   - Правильно определять частично правильный ответ (выбраны некоторые правильные или некоторые неправильные)
   - Правильно определять неправильный ответ (не выбраны правильные или выбраны только неправильные)

3. **Feedback:**
   - Сначала показывать детальный feedback по каждому выбранному варианту
   - Затем показывать итоговое сообщение (correct/partial/incorrect)
   - Визуально выделять правильные/неправильные выбранные ответы

4. **Оценка:**
   - Score = 1.0 для полностью правильного ответа
   - Score = 0.5 для частично правильного ответа
   - Score = 0.0 для неправильного ответа
   - Max_score = 1.0

5. **Совместимость с существующей архитектурой:**
   - Использовать тот же подход, что и для quiz элементов
   - Интегрировать в существующий `ChatView` компонент
   - Использовать существующую систему сохранения результатов в базу данных

6. **Визуальное отличие от Quiz:**
   - Чекбоксы вместо радио-кнопок
   - Возможность выбора нескольких вариантов
   - Показ детального feedback по каждому выбранному варианту
   - Три типа итогового сообщения (correct/partial/incorrect)
