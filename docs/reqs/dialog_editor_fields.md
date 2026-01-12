# Требования: Редактирование всех полей элемента Dialog в Course Editor

**Версия:** 1.0  
**Дата:** 2024-12  
**Статус:** Требования  
**Приоритет:** Высокий

---

## Краткое резюме

Этот документ описывает требования для добавления редактирования всех полей элемента Dialog в Course Editor согласно документации `docs/elements.md`. В настоящее время редактор поддерживает только часть полей Dialog, необходимо добавить поддержку всех параметров.

---

## 1. Текущее состояние

### 1.1 Поддерживаемые поля Dialog в редакторе

В настоящее время в редакторе доступны следующие поля для Dialog:

- ✅ **Dialog title** (`dialogTitle`) - заголовок диалога (не соответствует `text` из YAML)
- ✅ **System prompt** (`systemPrompt`) - системный промпт (соответствует `prompt` в YAML)
- ✅ **Temperature** (`temperature`) - температура для генерации (0-1)
- ✅ **Max tokens** (`maxTokens`) - максимальное количество токенов (сохраняется как `max_messages` в YAML)
- ✅ **Parse mode** (`parseMode`) - режим форматирования (общее поле для всех блоков)
- ✅ **Link preview** (`linkPreview`) - показывать ли превью ссылок (общее поле для всех блоков)

### 1.2 Недостающие поля

Согласно документации `docs/elements.md`, следующие поля отсутствуют в редакторе:

- ❌ **Text** (`text`) - начальное сообщение от бота (обязательное поле)
- ❌ **Model** (`model`) - модель ИИ для использования (частично поддерживается, но нет UI)
- ❌ **Reasoning** (`reasoning`) - параметр reasoning для модели
- ❌ **Conversation** (`conversation`) - начальная история диалога
- ❌ **Transcription language** (`transcription_language`) - язык для транскрибации голосовых сообщений
- ❌ **Voice response** (`voice_response`) - включить голосовые ответы
- ❌ **Auto start** (`auto_start`) - автоматически начать диалог
- ❌ **TTS Voice** (`tts_voice`) - ID голоса Eleven Labs для синтеза речи
- ❌ **TTS Model** (`tts_model`) - модель Eleven Labs TTS
- ❌ **TTS Speed** (`tts_speed`) - скорость речи

---

## 2. Требования к полям

### 2.1 Обязательные поля

#### FR-1: Поле Text (начальное сообщение)

**Описание:** Начальное сообщение от бота, которое отправляется пользователю при старте диалога.

**Требования:**
- Поле должно быть обязательным (валидация на пустое значение)
- Текстовое поле с поддержкой многострочного текста
- Кнопка "Expand" для расширенного редактирования (аналогично System prompt)
- Placeholder: "Initial message to the user..."
- Минимальная высота: 5 строк

**YAML маппинг:**
- `text` в YAML ↔ `text` в Block (не `dialogTitle`)

**Приоритет:** Высокий

---

### 2.2 Основные параметры модели

#### FR-2: Поле Model (модель ИИ)

**Описание:** Выбор модели ИИ для использования в диалоге.

**Требования:**
- Выпадающий список (select) с доступными моделями
- Опции: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`, `o1`, `o1-mini`, `o3`, `o3-mini` и другие
- Возможность ввода произвольного значения (combobox или input с автодополнением)
- Placeholder: "Select AI model..."
- Подсказка: "Model to use for AI responses"

**YAML маппинг:**
- `model` в YAML ↔ `model` в Block

**Приоритет:** Высокий

#### FR-3: Поле Reasoning (параметр reasoning)

**Описание:** Параметр reasoning для reasoning-моделей (o1, o3).

**Требования:**
- Текстовое поле (input)
- Отображается только если выбрана reasoning-модель (o1, o3)
- Placeholder: "low, medium, high"
- Подсказка: "Reasoning effort level (only for reasoning models). Common values: low, medium, high"
- Пользователь может ввести любое значение

**YAML маппинг:**
- `reasoning` в YAML ↔ `reasoning` в Block

**Приоритет:** Средний

---

### 2.3 Параметры голосовых сообщений

#### FR-4: Поле Voice Response (включить голосовые ответы)

**Описание:** Включение/выключение голосовых ответов от бота.

**Требования:**
- Чекбокс (checkbox)
- По умолчанию: `false`
- Label: "Enable voice responses"
- Подсказка: "Bot will respond with voice messages using Eleven Labs TTS"

**YAML маппинг:**
- `voice_response: true/false` в YAML ↔ `voiceResponse: boolean` в Block

**Приоритет:** Высокий

#### FR-5: Поле Transcription Language (язык транскрибации)

**Описание:** Язык для транскрибации входящих голосовых сообщений.

**Требования:**
- Выпадающий список с ISO-639-1 кодами языков
- Популярные языки: `en` (English), `el` (Greek), `ru` (Russian), `es` (Spanish), `fr` (French), `de` (German), `it` (Italian), `pt` (Portuguese), `ja` (Japanese), `zh` (Chinese)
- Возможность ввода произвольного ISO-639-1 кода
- Placeholder: "Auto-detect" или пустое значение (автоопределение)
- Подсказка: "Language for voice message transcription (ISO-639-1 code). Leave empty for auto-detection."

**YAML маппинг:**
- `transcription_language` в YAML ↔ `transcriptionLanguage` в Block

**Приоритет:** Средний

#### FR-6: Поле TTS Voice (ID голоса)

**Описание:** ID голоса Eleven Labs для синтеза речи.

**Требования:**
- Текстовое поле (input)
- Placeholder: "21m00Tcm4TlvDq8ikWAM" (значение по умолчанию)
- Подсказка: "Eleven Labs voice ID (default: 21m00Tcm4TlvDq8ikWAM). Legacy OpenAI voices are automatically converted."
- Значение по умолчанию: `21m00Tcm4TlvDq8ikWAM`

**YAML маппинг:**
- `tts_voice` в YAML ↔ `ttsVoice` в Block

**Приоритет:** Средний

#### FR-7: Поле TTS Model (модель TTS)

**Описание:** Модель Eleven Labs TTS для синтеза речи.

**Требования:**
- Выпадающий список с опциями:
  - `eleven_multilingual_v2` (по умолчанию)
  - `eleven_turbo_v2`
  - `eleven_monolingual_v1`
- Поддержка старых значений OpenAI: `tts-1`, `tts-1-hd` (автоматическое преобразование в `eleven_multilingual_v2`)
- Подсказка: "Eleven Labs TTS model"

**YAML маппинг:**
- `tts_model` в YAML ↔ `ttsModel` в Block

**Приоритет:** Средний

#### FR-8: Поле TTS Speed (скорость речи)

**Описание:** Скорость речи для голосовых ответов.

**Требования:**
- Числовое поле (number input) с ползунком (slider)
- Диапазон: `0.25` (медленно) до `4.0` (быстро)
- Шаг: `0.05`
- Значение по умолчанию: `1.0`
- Рекомендация: `0.8-0.9` для более медленной и понятной речи
- Подсказка: "Speech speed multiplier (recommended: 0.8-0.9 for slower, clearer speech)"

**YAML маппинг:**
- `tts_speed` в YAML ↔ `ttsSpeed` в Block

**Приоритет:** Средний

---

### 2.4 Дополнительные параметры

#### FR-9: Поле Auto Start (автоматический старт)

**Описание:** Автоматически начать диалог после начального сообщения.

**Требования:**
- Чекбокс (checkbox)
- По умолчанию: `false`
- Label: "Auto-start dialog"
- Подсказка: "Bot will automatically send the first message after initial text, without waiting for user input"

**YAML маппинг:**
- `auto_start: true/false` в YAML ↔ `autoStart: boolean` в Block

**Приоритет:** Средний

#### FR-10: Поле Conversation (начальная история диалога)

**Описание:** Начальная история диалога для предзаполнения контекста.

**Требования:**
- Многострочное текстовое поле (textarea)
- Кнопка "Expand" для расширенного редактирования
- Формат: JSON массив сообщений `[{role: "user", content: "..."}, {role: "assistant", content: "..."}]`
- Валидация JSON формата
- Placeholder: "Initial conversation history (JSON format)..."
- Подсказка: "Optional initial conversation history in JSON format"
- Минимальная высота: 4 строки

**YAML маппинг:**
- `conversation` в YAML ↔ `conversation` в Block (массив объектов)

**Приоритет:** Низкий

---

## 3. Изменения в интерфейсе

### 3.1 Структура полей Dialog

Поля должны быть организованы в следующие секции:

1. **Основные параметры:**
   - Text (начальное сообщение) - обязательное
   - System prompt - обязательное
   - Dialog title - опциональное (для внутреннего использования)

2. **Параметры модели:**
   - Model
   - Temperature
   - Reasoning (условно, только для reasoning-моделей)
   - Max tokens

3. **Голосовые параметры:**
   - Voice response (чекбокс)
   - Transcription language (условно, если voice response включен)
   - TTS Voice (условно, если voice response включен)
   - TTS Model (условно, если voice response включен)
   - TTS Speed (условно, если voice response включен)

4. **Дополнительные параметры:**
   - Auto start (чекбокс)
   - Conversation (начальная история)

5. **Общие параметры:**
   - Parse mode
   - Link preview

### 3.2 Условное отображение полей

- **Reasoning:** Отображается только если выбрана reasoning-модель (o1, o3)
- **Голосовые параметры:** Группа полей отображается только если включен "Voice response"
- **Transcription language:** Отображается только если включен "Voice response"

### 3.3 Валидация

- **Text:** Обязательное поле, не может быть пустым
- **System prompt:** Обязательное поле, не может быть пустым
- **Temperature:** Должно быть в диапазоне 0-1
- **Max tokens:** Должно быть положительным числом
- **TTS Speed:** Должно быть в диапазоне 0.25-4.0
- **Conversation:** Должен быть валидным JSON массивом (если заполнено)

---

## 4. Изменения в типах данных

### 4.1 Интерфейс Block

Необходимо расширить интерфейс `Block` в `ai-service.ts`:

```typescript
export interface Block {
  id: string;
  type: BlockType;
  // ... существующие поля ...
  
  // Dialog-specific fields
  text?: string;                    // Начальное сообщение (обязательно для Dialog)
  dialogTitle?: string;             // Заголовок диалога (опционально)
  systemPrompt?: string;             // Системный промпт (обязательно для Dialog)
  model?: string;                    // Модель ИИ
  temperature?: number;              // Температура (0-1)
  reasoning?: string;                // Reasoning параметр (текстовое поле)
  maxTokens?: number;                // Максимальное количество токенов
  conversation?: Array<{             // Начальная история диалога
    role: "user" | "assistant";
    content: string;
  }>;
  transcriptionLanguage?: string;    // ISO-639-1 код языка
  voiceResponse?: boolean;           // Включить голосовые ответы
  autoStart?: boolean;               // Автоматический старт диалога
  ttsVoice?: string;                 // ID голоса Eleven Labs
  ttsModel?: string;                 // Модель Eleven Labs TTS
  ttsSpeed?: number;                 // Скорость речи (0.25-4.0)
  
  // Общие поля
  parseMode: string;
  linkPreview: boolean;
}
```

### 4.2 Преобразование YAML ↔ Block

#### YAML → Block (`convertDialogToBlock`)

```typescript
function convertDialogToBlock(elementId: string, elementData: any): Block {
  const block: Block = {
    id: elementId,
    type: 'Dialog',
    text: elementData.text || '',                    // Начальное сообщение
    systemPrompt: elementData.prompt || '',          // Системный промпт
    dialogTitle: elementData.text?.substring(0, 50), // Первые 50 символов как заголовок
    model: elementData.model,
    temperature: elementData.temperature ?? 0.7,
    reasoning: elementData.reasoning,
    maxTokens: elementData.max_messages || elementData.max_tokens || 150,
    conversation: elementData.conversation,
    transcriptionLanguage: elementData.transcription_language,
    voiceResponse: elementData.voice_response === true || elementData.voice_response === 'yes',
    autoStart: elementData.auto_start === true || elementData.auto_start === 'yes',
    ttsVoice: elementData.tts_voice || '21m00Tcm4TlvDq8ikWAM',
    ttsModel: elementData.tts_model || 'eleven_multilingual_v2',
    ttsSpeed: elementData.tts_speed ?? 1.0,
    parseMode: elementData.parse_mode === 'HTML' || elementData.parse_mode === 'HTML!' ? 'HTML' : 
               elementData.parse_mode === 'MARKDOWN' ? 'MARKDOWN' : 'TEXT',
    linkPreview: elementData.link_preview !== 'no' && elementData.link_preview !== false,
  };
  
  return block;
}
```

#### Block → YAML (`convertDialogToYaml`)

```typescript
function convertDialogToYaml(block: Block): Record<string, any> {
  const yamlElement: Record<string, any> = {
    type: 'dialog',
    text: block.text || '',                    // Начальное сообщение
    prompt: block.systemPrompt || '',          // Системный промпт
  };
  
  // Опциональные поля модели
  if (block.model) {
    yamlElement.model = block.model;
  }
  if (block.temperature !== undefined) {
    yamlElement.temperature = block.temperature;
  }
  if (block.reasoning) {
    yamlElement.reasoning = block.reasoning;
  }
  if (block.maxTokens !== undefined) {
    yamlElement.max_messages = block.maxTokens;
  }
  
  // Голосовые параметры
  if (block.voiceResponse === true) {
    yamlElement.voice_response = true;
    if (block.transcriptionLanguage) {
      yamlElement.transcription_language = block.transcriptionLanguage;
    }
    if (block.ttsVoice && block.ttsVoice !== '21m00Tcm4TlvDq8ikWAM') {
      yamlElement.tts_voice = block.ttsVoice;
    }
    if (block.ttsModel && block.ttsModel !== 'eleven_multilingual_v2') {
      yamlElement.tts_model = block.ttsModel;
    }
    if (block.ttsSpeed !== undefined && block.ttsSpeed !== 1.0) {
      yamlElement.tts_speed = block.ttsSpeed;
    }
  }
  
  // Дополнительные параметры
  if (block.autoStart === true) {
    yamlElement.auto_start = true;
  }
  if (block.conversation && block.conversation.length > 0) {
    yamlElement.conversation = block.conversation;
  }
  
  // Parse mode (HTML! для HTML в ответах модели)
  if (block.parseMode && block.parseMode !== 'TEXT') {
    if (block.parseMode === 'HTML') {
      yamlElement.parse_mode = 'HTML!';
    } else {
      yamlElement.parse_mode = 'MARKDOWN';
    }
  }
  
  // Link preview
  if (block.linkPreview === false) {
    yamlElement.link_preview = 'no';
  }
  
  return yamlElement;
}
```

---

## 5. UI/UX требования

### 5.1 Группировка полей

Поля должны быть сгруппированы в секции с заголовками:

```
┌─────────────────────────────────────┐
│ Dialog                              │
├─────────────────────────────────────┤
│ Basic Settings                      │
│  • Text (required)                 │
│  • System prompt (required)        │
│  • Dialog title (optional)         │
├─────────────────────────────────────┤
│ Model Settings                      │
│  • Model                           │
│  • Temperature                     │
│  • Reasoning (text, if reasoning model) │
│  • Max tokens                      │
├─────────────────────────────────────┤
│ Voice Settings                      │
│  ☐ Voice response                  │
│    • Transcription language        │
│    • TTS Voice                     │
│    • TTS Model                     │
│    • TTS Speed                     │
├─────────────────────────────────────┤
│ Advanced Settings                   │
│  ☐ Auto start                      │
│  • Conversation                    │
├─────────────────────────────────────┤
│ General Settings                    │
│  • Parse mode                      │
│  ☐ Link preview                    │
└─────────────────────────────────────┘
```

### 5.2 Визуальные индикаторы

- Обязательные поля должны быть помечены звездочкой (*) или другим индикатором
- Условные поля должны быть визуально сгруппированы (отступ, фон)
- Подсказки (tooltips) для всех полей с описанием их назначения

### 5.3 Валидация и ошибки

- Валидация в реальном времени
- Подсветка невалидных полей красной рамкой
- Сообщения об ошибках под полями
- Блокировка сохранения при наличии ошибок валидации

---

## 6. План реализации

### Фаза 1: Основные обязательные поля (MVP)

**Цель:** Добавить обязательные поля для базовой функциональности Dialog.

**Задачи:**
1. Добавить поле **Text** (начальное сообщение)
   - Текстовое поле с кнопкой Expand
   - Валидация обязательности
   - Обновление преобразования YAML ↔ Block

2. Добавить поле **Model**
   - Выпадающий список с моделями
   - Обновление преобразования YAML ↔ Block

**Оценка:** 1-2 дня

### Фаза 2: Параметры модели

**Цель:** Добавить все параметры модели.

**Задачи:**
1. Добавить поле **Reasoning**
   - Текстовое поле с условным отображением для reasoning-моделей
   - Обновление преобразования YAML ↔ Block

**Оценка:** 1 день

### Фаза 3: Голосовые параметры

**Цель:** Добавить поддержку голосовых сообщений.

**Задачи:**
1. Добавить чекбокс **Voice response**
2. Добавить условные поля голосовых параметров:
   - Transcription language
   - TTS Voice
   - TTS Model
   - TTS Speed
3. Реализовать условное отображение группы полей
4. Обновить преобразование YAML ↔ Block

**Оценка:** 2-3 дня

### Фаза 4: Дополнительные параметры

**Цель:** Добавить оставшиеся параметры.

**Задачи:**
1. Добавить чекбокс **Auto start**
2. Добавить поле **Conversation**
   - JSON валидация
   - Кнопка Expand
3. Обновить преобразование YAML ↔ Block

**Оценка:** 1-2 дня

---

## 7. Критерии приемки

Редактирование Dialog считается завершенным, если:

1. ✅ Все обязательные поля (Text, System prompt) редактируемы и валидируются
2. ✅ Все опциональные поля из документации `docs/elements.md` доступны для редактирования
3. ✅ Условное отображение полей работает корректно (Reasoning, голосовые параметры)
4. ✅ Преобразование YAML ↔ Block работает для всех полей
5. ✅ Валидация всех полей работает корректно
6. ✅ UI интуитивен и понятен пользователю
7. ✅ Сохранение курса сохраняет все поля Dialog в правильном формате YAML

---

## 8. Связанные документы

- `docs/elements.md` - Документация по типам элементов (Dialog)
- `docs/dialog_element.md` - Техническая документация по элементу Dialog
- `docs/course_editor_how_it_works.md` - Описание работы редактора курсов
- `docs/reqs/course_editor_production_requirements.md` - Требования к редактору курсов

---

## 9. Примечания

### 9.1 Обратная совместимость

- Старые курсы с Dialog должны корректно загружаться
- Поля, отсутствующие в старых курсах, должны иметь значения по умолчанию
- Преобразование старых форматов должно работать корректно

### 9.2 Миграция данных

- При загрузке старых Dialog элементов необходимо:
  - Извлечь `text` из YAML и сохранить в `block.text`
  - Сохранить `dialogTitle` как первые 50 символов `text` (для обратной совместимости)
  - Установить значения по умолчанию для отсутствующих полей

### 9.3 Производительность

- Условное отображение полей не должно влиять на производительность рендеринга
- Валидация должна быть асинхронной и не блокировать UI
