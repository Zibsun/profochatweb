# Внешние интеграции

Документ описывает интеграции с внешними сервисами.

## OpenAI API

**Файл:** `chat.py`

**Назначение:** Интеграция с OpenAI API для диалоговых элементов.

### Конфигурация

```python
CONFIG_FILE = os.environ.get('CONFIG_FILE', 'config.yaml')
CONFIG = yaml.safe_load(file)["openai"]
API_KEY = os.getenv('OPENAI_API_KEY', CONFIG.get("api_key"))
```

**Переменные окружения:**
- `OPENAI_API_KEY` — API ключ OpenAI

**config.yaml:**
```yaml
openai:
  api_key: "sk-..."
  proxy: "https://api.proxyapi.ru/openai/v1"  # опционально
  api: "completions"  # или "responses"
  model: "gpt-5"
  temperature: 0.0
  log: true
```

### Поддерживаемые API

1. **Completions API** (стандартный)
   - Endpoint: `/chat/completions`
   - Использует `requests.post()`
   - Стандартный формат conversation

2. **Responses API** (альтернативный)
   - Использует `client.responses.create()`
   - Системные сообщения преобразуются в `instructions`
   - Поддержка reasoning моделей через `reasoning_effort`

### Поддерживаемые модели

**Reasoning модели:**
- `o1`, `o1-mini`, `o1-preview`
- `gpt-5`
- Используют `reasoning`/`reasoning_effort` вместо `temperature`

**Обычные модели:**
- `gpt-4`, `gpt-3.5-turbo`
- Используют `temperature` (по умолчанию 0.0)

### Функции

**`get_reply(conversation, new_prompt, params)`**
- Стандартный запрос к API
- Добавляет новое сообщение пользователя
- Возвращает ответ и обновленную conversation

**`get_reply_sys(conversation, sys_prompt, params)`**
- Запрос с системным промптом
- Используется для Flows (админских функций)

**`get_reply_impl(conversation, params)`**
- Внутренняя реализация запроса
- Поддерживает оба API (Completions и Responses)

### Прокси

- **Production** (`CURRENT_ENV == 'heroku'`): `https://api.openai.com/v1`
- **Development**: `CONFIG.get("proxy")` или `https://api.proxyapi.ru/openai/v1`

## Eleven Labs API

**Назначение:** Транскрибация голоса (STT) и синтез речи (TTS).

### Конфигурация

```python
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
```

**Переменные окружения:**
- `ELEVENLABS_API_KEY` — API ключ Eleven Labs

### Использование в элементах

**Dialog элемент поддерживает:**
- `transcription_language` — язык для транскрибации
- `voice_response` — включение голосовых ответов
- `tts_voice` — ID голоса для синтеза
- `tts_model` — модель TTS
- `tts_speed` — скорость речи

### API

**Scribe API:**
- Транскрибация голосовых сообщений
- Endpoint: `https://api.elevenlabs.io/v1/scribe/...`

**TTS API:**
- Синтез речи для голосовых ответов
- Endpoint: `https://api.elevenlabs.io/v1/text-to-speech/...`

## Обработка ошибок

Все API вызовы должны обрабатывать ошибки:

```python
try:
    response = requests.post(url, headers=headers, json=data)
    if response.status_code != 200:
        raise Exception(f"Error: {response.status_code} - {response.text}")
except Exception as e:
    logging.error(f"API error: {e}")
    raise
```

## Логирование

При `CONFIG.get("log") == true` логируется:
- Длина conversation
- Использование токенов (для Responses API)
- Reasoning токены (для reasoning моделей)
