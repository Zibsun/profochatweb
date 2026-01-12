# Требования: Поддержка Dialog элементов в веб-версии

**Версия:** 1.0  
**Дата:** 2024  
**Статус:** Проектирование  
**Приоритет:** Высокий

---

## 1. Обзор

Dialog элемент (`type: dialog`) позволяет пользователям вести интерактивные диалоги с AI-ассистентом в рамках курса. Элемент поддерживает настройку модели AI, параметров генерации, автоматический старт диалога, голосовые ответы и другие продвинутые функции.

## 2. Текущее состояние

### 2.1 Telegram версия

В Telegram версии Dialog элемент полностью реализован со следующими возможностями:
- ✅ Текстовые диалоги с AI
- ✅ Голосовые сообщения (входящие и исходящие)
- ✅ Настройка модели AI (gpt-4, gpt-5, o1 и др.)
- ✅ Параметры temperature и reasoning
- ✅ Автоматический старт диалога (`auto_start`)
- ✅ Подстановка переменных в промпт (`{{variable}}`)
- ✅ Условия остановки диалога (`{STOP}`, `#конецдиалога`)
- ✅ Различные режимы форматирования (MARKDOWN, HTML)
- ✅ Сохранение истории диалога

### 2.2 Веб-версия (MVP)

В MVP веб-версии существует частичная реализация:
- ✅ Базовый компонент `ChatStep` для диалогов
- ✅ API endpoints для работы с чат-сессиями (`/api/v1/chat/...`)
- ✅ Сохранение сообщений в базу данных
- ✅ Интеграция с LLM через `llm_service.py` (использует общий `chat.py`)
- ❌ Не интегрирован с системой элементов курса (MVP использует отдельную архитектуру)
- ❌ Не поддерживает все параметры Dialog элемента
- ❌ Не поддерживает голосовые сообщения
- ❌ Не поддерживает auto_start
- ❌ Не поддерживает подстановку переменных
- ❌ Не поддерживает условия остановки

## 3. Требования к реализации

### 3.1 Интеграция с системой элементов курса

**Проблема:** В MVP веб-версии Dialog элементы не обрабатываются как часть потока элементов курса.

**Требования:**

#### Backend (`webapp/backend/app/api/v1/mvp.py`):

1. **Добавить обработку dialog элементов в `get_current_element_from_conversation()`:**
   ```python
   elif element_type == "dialog":
       logger.info(f"get_current_element from DB: dialog element_id={element.get('element_id')}")
       dialog_element = DialogElement(**element)
       result_dict = dialog_element.dict()
       result_dict['type'] = 'dialog'
       return result_dict
   ```

2. **Создать модель `DialogElement`:**
   ```python
   class DialogElement(BaseModel):
       element_id: str
       type: str = "dialog"
       text: str  # Начальное сообщение
       prompt: str  # Системный промпт для AI
       model: Optional[str] = None
       temperature: Optional[float] = None
       reasoning: Optional[str] = None
       parse_mode: Optional[str] = "MARKDOWN"
       link_preview: Optional[bool] = None
       auto_start: Optional[bool] = False
       voice_response: Optional[bool] = False
       transcription_language: Optional[str] = None
       tts_voice: Optional[str] = None
       tts_model: Optional[str] = None
       tts_speed: Optional[float] = 1.0
       conversation: Optional[List[Dict[str, str]]] = []  # История диалога
   ```

3. **Обновить функции загрузки элементов:**
   - `get_first_element_from_course()` - добавить обработку dialog элементов
   - `get_next_element_from_course()` - добавить обработку dialog элементов
   - Извлекать все параметры dialog из `element_data`

4. **Создать endpoint для отправки сообщения в dialog:**
   ```python
   @router.post("/courses/{course_id}/dialog/message", response_model=DialogMessageResponse)
   def send_dialog_message(
       course_id: str,
       message_data: DialogMessageRequest,
       chat_id: Optional[int] = Cookie(None),
       response: Response = None
   ):
       """Отправка сообщения в dialog элемент"""
       # Получаем текущий элемент
       # Проверяем, что это dialog элемент
       # Отправляем сообщение в LLM через chat_service
       # Сохраняем в conversation элемента
       # Проверяем условия остановки
       # Возвращаем ответ
   ```

5. **Обновить `next_element()` для обработки завершения dialog:**
   - Проверять наличие `STOP` флага в conversation
   - Автоматически переходить к следующему элементу при завершении диалога

#### Frontend (`webapp/frontend`):

1. **Создать компонент `DialogView` в `components/chat/DialogView.tsx`:**
   - Отображение начального сообщения (`text`)
   - Поле ввода для сообщений пользователя
   - Отображение истории диалога
   - Индикатор печати (typing indicator)
   - Обработка auto_start

2. **Обновить `ChatView.tsx` для поддержки dialog элементов:**
   - Добавить обработку `type: "dialog"` в `renderElement()`
   - Интегрировать `DialogView` компонент

3. **Создать API функции в `lib/api/dialog.ts`:**
   ```typescript
   export const dialogApi = {
     sendMessage: async (courseId: string, elementId: string, message: string) => {
       // POST /api/v1/mvp/courses/{course_id}/dialog/message
     }
   }
   ```

### 3.2 Поддержка параметров Dialog элемента

#### 3.2.1 Обязательные параметры

**`text`** - Начальное сообщение
- Отображается при старте dialog элемента
- Может содержать Markdown/HTML форматирование
- Сохраняется в истории как первое сообщение бота

**`prompt`** - Системный промпт для AI
- Используется для настройки поведения AI
- Поддерживает подстановку переменных (`{{variable}}`)
- Передается в LLM как system message

#### 3.2.2 Параметры модели AI

**`model`** - Идентификатор модели
- Примеры: `"gpt-4"`, `"gpt-5"`, `"o1"`, `"gpt-4.1"`
- По умолчанию: из `config.yaml` или `"gpt-4"`

**`temperature`** - Температура для стандартных моделей
- Диапазон: 0.0 - 1.0
- По умолчанию: 0.0 для не-reasoning моделей
- Используется только для стандартных моделей (не для reasoning)

**`reasoning`** - Reasoning effort для reasoning моделей
- Значения: `"low"`, `"medium"`, `"high"`, `"minimal"`
- По умолчанию: `"low"`
- Используется только для reasoning моделей (o1, gpt-5)

**Требования к реализации:**
- Backend должен передавать правильные параметры в `generate_chat_response()`
- Frontend не должен отображать эти параметры пользователю (внутренние настройки)

#### 3.2.3 Параметры форматирования

**`parse_mode`** - Режим форматирования
- Значения: `"MARKDOWN"`, `"HTML"`, `"HTML!"`
- По умолчанию: `"MARKDOWN"`
- `"HTML!"` - HTML форматирование для ответов AI

**`link_preview`** - Показывать ли превью ссылок
- Boolean значение
- По умолчанию: `false` для dialog элементов

**Требования к реализации:**
- Frontend должен поддерживать рендеринг Markdown и HTML
- Использовать `react-markdown` для Markdown
- Использовать `DOMPurify` для безопасного рендеринга HTML

#### 3.2.4 Автоматический старт (`auto_start`)

**Описание:**
Если `auto_start: true`, бот автоматически отправляет первое сообщение после отображения начального текста.

**Требования к реализации:**

**Backend:**
- При загрузке dialog элемента с `auto_start: true`, автоматически генерировать первое сообщение от AI
- Сохранять это сообщение в conversation

**Frontend:**
- При получении dialog элемента с `auto_start: true`, автоматически запрашивать первое сообщение от AI
- Показывать индикатор загрузки во время генерации

**Пример использования:**
```yaml
Dialog_With_AutoStart:
  type: dialog
  text: Привет! Давай начнем диалог.
  prompt: Ты дружелюбный помощник. Начни диалог с вопроса.
  auto_start: true
```

#### 3.2.5 Подстановка переменных (`{{variable}}`)

**Описание:**
Промпт может содержать переменные вида `{{element_id}}` или `{{N]element_id}}` или `{{element_id[M}}`, которые заменяются на текст из предыдущих элементов.

**Требования к реализации:**

**Backend:**
- При инициализации dialog элемента, заменять переменные в промпте
- Использовать функцию `replace_vars_in_prompt()` из Telegram версии или реализовать аналогичную
- Переменные заменяются перед отправкой промпта в LLM

**Пример использования:**
```yaml
Dialog_With_Vars:
  type: dialog
  text: Давай обсудим предыдущий урок.
  prompt: |
    Ты преподаватель. Обсуди с учеником следующее:
    {{previous_lesson}}
    
    Задавай вопросы и давай обратную связь.
```

#### 3.2.6 Условия остановки диалога

**Описание:**
Диалог завершается при обнаружении маркеров `{STOP}` или `#конецдиалога` в ответе AI.

**Требования к реализации:**

**Backend:**
- После получения ответа от LLM проверять наличие `{STOP}` или `#конецдиалога`
- Удалять маркеры из ответа перед отправкой пользователю
- Устанавливать флаг завершения диалога
- Автоматически переходить к следующему элементу

**Frontend:**
- После получения сообщения с маркером остановки, автоматически переходить к следующему элементу
- Показывать индикатор завершения диалога

**Пример использования в промпте:**
```yaml
prompt: |
  Когда диалог завершен, напиши {STOP} в конце ответа.
```

### 3.3 Управление историей диалога

**Требования:**

1. **Сохранение истории:**
   - История диалога сохраняется в `conversation` поле элемента в базе данных
   - Формат: список словарей `[{"role": "system/user/assistant", "content": "..."}]`
   - История обновляется после каждого обмена сообщениями

2. **Загрузка истории:**
   - При загрузке dialog элемента, загружать существующую историю из `conversation`
   - Отображать историю в интерфейсе чата

3. **Очистка истории:**
   - История сохраняется до завершения курса или явной очистки
   - Можно использовать для анализа и отчетности

### 3.4 Голосовые сообщения (опционально, низкий приоритет)

**Описание:**
Dialog элемент поддерживает голосовые входящие и исходящие сообщения через Eleven Labs API.

**Параметры:**
- `voice_response` - включить голосовые ответы (boolean)
- `transcription_language` - язык для транскрипции (ISO-639-1 код)
- `tts_voice` - ID голоса Eleven Labs
- `tts_model` - модель TTS
- `tts_speed` - скорость речи (0.25-4.0)

**Требования (для будущей реализации):**

**Backend:**
- Интеграция с Eleven Labs API для TTS
- Интеграция с Eleven Labs Scribe API для ASR
- Генерация аудио файлов из текста ответов AI

**Frontend:**
- Компонент для записи голосовых сообщений
- Компонент для воспроизведения голосовых ответов
- Визуализация процесса записи/воспроизведения

**Приоритет:** Низкий (можно реализовать позже)

## 4. Детальная реализация

### 4.1 Backend: Модель DialogElement

```python
# webapp/backend/app/api/v1/mvp.py

class DialogElement(BaseModel):
    element_id: str
    type: str = "dialog"
    text: str
    prompt: str
    model: Optional[str] = None
    temperature: Optional[float] = None
    reasoning: Optional[str] = None
    parse_mode: Optional[str] = "MARKDOWN"
    link_preview: Optional[bool] = None
    auto_start: Optional[bool] = False
    voice_response: Optional[bool] = False
    transcription_language: Optional[str] = None
    tts_voice: Optional[str] = None
    tts_model: Optional[str] = None
    tts_speed: Optional[float] = 1.0
    conversation: Optional[List[Dict[str, str]]] = []
    
    class Config:
        extra = "allow"  # Для обратной совместимости
```

### 4.2 Backend: Endpoint для отправки сообщений

```python
@router.post("/courses/{course_id}/dialog/message", response_model=DialogMessageResponse)
def send_dialog_message(
    course_id: str,
    message_data: DialogMessageRequest,
    chat_id: Optional[int] = Cookie(None),
    response: Response = None
):
    """Отправка сообщения в dialog элемент"""
    current_chat_id = get_or_create_chat_id(chat_id)
    if not chat_id:
        response.set_cookie(key="chat_id", value=str(current_chat_id), max_age=31536000)
    
    run_id = get_active_run(current_chat_id, course_id)
    if not run_id:
        raise HTTPException(status_code=404, detail="Активная сессия не найдена")
    
    # Получаем текущий элемент
    current_element = get_current_element_from_conversation(current_chat_id, course_id, run_id)
    if not current_element or current_element.get("type") != "dialog":
        raise HTTPException(status_code=400, detail="Текущий элемент не является dialog")
    
    # Получаем conversation
    conversation = current_element.get("conversation", [])
    
    # Инициализируем промпт если conversation пуст
    if not conversation:
        prompt = replace_vars_in_prompt(current_element.get("prompt"), current_chat_id, course_id)
        conversation = [{"role": "system", "content": prompt}]
    
    # Добавляем сообщение пользователя
    conversation.append({"role": "user", "content": message_data.message})
    
    # Генерируем ответ через chat_service
    from app.services.llm_service import generate_chat_response
    
    reply = generate_chat_response(
        messages=conversation,
        model=current_element.get("model"),
        temperature=current_element.get("temperature"),
        reasoning=current_element.get("reasoning")
    )
    
    # Проверяем условия остановки
    stop_detected = False
    if "{STOP}" in reply:
        reply = reply.replace("{STOP}", "")
        stop_detected = True
    elif "#конецдиалога" in reply:
        reply = reply.replace("#конецдиалога", "").strip()
        stop_detected = True
    
    # Добавляем ответ ассистента
    conversation.append({"role": "assistant", "content": reply})
    
    # Сохраняем обновленную conversation
    update_element_conversation(current_chat_id, course_id, run_id, conversation)
    
    # Если диалог завершен, переходим к следующему элементу
    if stop_detected:
        # Логика перехода к следующему элементу
        pass
    
    return {
        "reply": reply,
        "stop": stop_detected,
        "conversation": conversation
    }
```

### 4.3 Frontend: Компонент DialogView

```typescript
// webapp/frontend/components/chat/DialogView.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { dialogApi } from '@/lib/api/dialog'

interface DialogElement {
  element_id: string
  type: "dialog"
  text: string
  prompt: string
  model?: string
  temperature?: number
  reasoning?: string
  parse_mode?: string
  auto_start?: boolean
  conversation?: Array<{role: string, content: string}>
}

interface DialogViewProps {
  element: DialogElement
  courseId: string
  onNext?: () => void
}

export default function DialogView({ element, courseId, onNext }: DialogViewProps) {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Инициализация: добавляем начальное сообщение
    const initialMessages: Array<{role: string, content: string}> = [
      { role: "assistant", content: element.text }
    ]
    
    // Добавляем существующую историю если есть
    if (element.conversation && element.conversation.length > 0) {
      // Пропускаем system message, добавляем остальные
      const history = element.conversation.filter(msg => msg.role !== "system")
      initialMessages.push(...history)
    }
    
    setMessages(initialMessages)
    
    // Auto-start: автоматически отправляем первое сообщение
    if (element.auto_start) {
      handleAutoStart()
    }
  }, [element])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleAutoStart = async () => {
    setLoading(true)
    setTyping(true)
    
    try {
      const response = await dialogApi.sendMessage(courseId, element.element_id, "")
      setMessages(prev => [...prev, { role: "assistant", content: response.reply }])
      
      if (response.stop && onNext) {
        setTimeout(() => onNext(), 1000)
      }
    } catch (error) {
      console.error('Ошибка auto-start:', error)
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }
  
  const handleSend = async () => {
    if (!inputValue.trim() || loading) return
    
    const userMessage = { role: "user", content: inputValue }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setLoading(true)
    setTyping(true)
    
    try {
      const response = await dialogApi.sendMessage(courseId, element.element_id, inputValue)
      setMessages(prev => [...prev, { role: "assistant", content: response.reply }])
      
      if (response.stop && onNext) {
        setTimeout(() => onNext(), 1000)
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.role === 'assistant' ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg">
              <span className="animate-pulse">Печатает...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Введите сообщение..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4.4 Frontend: API функции

```typescript
// webapp/frontend/lib/api/dialog.ts

import { apiClient } from './client'

export interface DialogMessageRequest {
  element_id: string
  message: string
}

export interface DialogMessageResponse {
  reply: string
  stop: boolean
  conversation: Array<{role: string, content: string}>
}

export const dialogApi = {
  sendMessage: async (
    courseId: string,
    elementId: string,
    message: string
  ): Promise<DialogMessageResponse> => {
    const response = await apiClient.post(
      `/mvp/courses/${courseId}/dialog/message`,
      {
        element_id: elementId,
        message: message
      }
    )
    return response.data
  }
}
```

## 5. Интеграция с существующей архитектурой

### 5.1 Использование chat_service.py

Dialog элемент должен использовать существующий `chat_service.py` и `llm_service.py`, которые уже интегрированы с общим модулем `chat.py`.

**Требования:**
- Использовать `generate_chat_response()` из `llm_service.py`
- Поддерживать все параметры модели (model, temperature, reasoning)
- Сохранять историю диалога в conversation элемента

### 5.2 Интеграция с MVP архитектурой

Dialog элемент должен работать в рамках существующей MVP архитектуры:
- Использовать `conversation` таблицу для хранения состояния
- Интегрироваться с системой элементов курса
- Поддерживать переход к следующему элементу

## 6. Приоритеты реализации

### Фаза 1: Базовая функциональность (Высокий приоритет)
1. ✅ Интеграция dialog элементов в систему элементов курса
2. ✅ Отображение начального сообщения (`text`)
3. ✅ Отправка сообщений пользователя
4. ✅ Получение ответов от AI
5. ✅ Отображение истории диалога
6. ✅ Сохранение conversation в базу данных

### Фаза 2: Продвинутые функции (Средний приоритет)
1. ✅ Поддержка параметров модели (model, temperature, reasoning)
2. ✅ Поддержка parse_mode (MARKDOWN, HTML)
3. ✅ Автоматический старт (`auto_start`)
4. ✅ Условия остановки (`{STOP}`, `#конецдиалога`)
5. ✅ Автоматический переход к следующему элементу

### Фаза 3: Дополнительные функции (Низкий приоритет)
1. ⏳ Подстановка переменных в промпт
2. ⏳ Голосовые сообщения (входящие и исходящие)
3. ⏳ Улучшенная обработка ошибок
4. ⏳ Оптимизация производительности

## 7. Тестирование

После реализации необходимо протестировать:

1. **Базовые функции:**
   - Отображение начального сообщения
   - Отправка сообщения пользователя
   - Получение ответа от AI
   - Отображение истории диалога

2. **Параметры модели:**
   - Работа с разными моделями (gpt-4, gpt-5, o1)
   - Передача temperature для стандартных моделей
   - Передача reasoning для reasoning моделей

3. **Автоматический старт:**
   - Диалог с `auto_start: true` автоматически начинает диалог
   - Диалог без `auto_start` ждет первого сообщения пользователя

4. **Условия остановки:**
   - Диалог завершается при получении `{STOP}`
   - Диалог завершается при получении `#конецдиалога`
   - Автоматический переход к следующему элементу

5. **Интеграция:**
   - Dialog элемент работает в потоке элементов курса
   - История диалога сохраняется между сессиями
   - Переход к следующему элементу работает корректно

6. **Обработка ошибок:**
   - Обработка ошибок API LLM
   - Обработка сетевых ошибок
   - Отображение понятных сообщений об ошибках

## 8. Дополнительные замечания

### 8.1 Производительность

- **Кэширование:** Рассмотреть кэширование промптов с переменными
- **Оптимизация запросов:** Минимизировать количество запросов к API
- **Lazy loading:** Загружать историю диалога по требованию

### 8.2 Безопасность

- **Валидация входных данных:** Проверять сообщения пользователя перед отправкой
- **Санитизация:** Очищать HTML/Markdown перед отображением
- **Rate limiting:** Ограничивать частоту запросов к API

### 8.3 UX улучшения

- **Индикатор печати:** Показывать "Печатает..." во время генерации ответа
- **Автопрокрутка:** Автоматически прокручивать к новым сообщениям
- **Адаптивность:** Обеспечить работу на мобильных устройствах
- **Клавиатура:** Поддержка Enter для отправки сообщения

### 8.4 Совместимость

- **Обратная совместимость:** Курсы без dialog элементов должны работать как раньше
- **Миграция данных:** Обеспечить миграцию существующих данных если необходимо

## 9. Критерии приемки

✅ **Критерии приемки:**

1. ✅ Dialog элементы отображаются в потоке элементов курса
2. ✅ Начальное сообщение (`text`) отображается при старте диалога
3. ✅ Пользователь может отправлять сообщения
4. ✅ AI генерирует ответы на основе промпта и истории
5. ✅ История диалога сохраняется и отображается
6. ✅ Поддерживаются параметры модели (model, temperature, reasoning)
7. ✅ Автоматический старт работает при `auto_start: true`
8. ✅ Условия остановки работают (`{STOP}`, `#конецдиалога`)
9. ✅ Автоматический переход к следующему элементу работает
10. ✅ Поддерживается форматирование Markdown и HTML
11. ✅ Обработка ошибок работает корректно
12. ✅ Интерфейс адаптивен для мобильных устройств

## 10. Связанные документы

- `docs/dialog_element.md` - Детальная документация Dialog элемента (Telegram версия)
- `docs/reqs/webversion_chat_reuse.md` - Требования к переиспользованию chat.py
- `docs/reqs/message.md` - Требования к Message элементам в веб-версии
- `docs/reqs/webversion_prd.md` - PRD веб-версии
- `elements/dialog.py` - Реализация Dialog элемента (Telegram версия)
- `webapp/backend/app/services/chat_service.py` - Сервис работы с чатом
- `webapp/backend/app/services/llm_service.py` - Сервис работы с LLM

## 11. История изменений

| Версия | Дата | Автор | Описание |
|--------|------|-------|----------|
| 1.0 | 2024 | - | Первоначальная версия требований |
