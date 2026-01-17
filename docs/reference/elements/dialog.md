# Dialog Element - Detailed Documentation

## Overview

The `Dialog` element enables interactive conversations between users and an AI assistant within a course flow. It provides a flexible framework for natural language interactions, supporting both text and voice messages, with configurable AI models, conversation history management, and advanced features like variable substitution and auto-start capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Initialization](#initialization)
3. [Core Functionality](#core-functionality)
4. [Conversation Management](#conversation-management)
5. [Voice Message Support](#voice-message-support)
6. [Voice Response Generation](#voice-response-generation)
7. [Variable Substitution](#variable-substitution)
8. [Auto-Start Feature](#auto-start-feature)
9. [Stop Conditions](#stop-conditions)
10. [Integration Points](#integration-points)
11. [Configuration Parameters](#configuration-parameters)
12. [Examples](#examples)

---

## Architecture

The Dialog element inherits from the base `Element` class and integrates with:

- **AI Chat Service** (`chat.py`): Handles API calls to OpenAI/ProxyAPI for generating responses
- **Telegram Bot** (`main.py`): Processes user messages and voice inputs
- **Course System**: Manages element flow and progression
- **Database**: Stores conversation history and reports
- **Eleven Labs API**: Provides TTS (text-to-speech) and ASR (automatic speech recognition) capabilities

### Class Hierarchy

```
Element (base class)
  └── Dialog
```

### Key Components

1. **Conversation State**: Maintains a list of message dictionaries with `role` and `content` fields
2. **Prompt Processing**: Handles variable substitution before initializing conversation
3. **Response Generation**: Manages async API calls with typing indicators
4. **Message Formatting**: Handles Markdown/HTML parsing and Telegram-specific formatting

---

## Initialization

### Constructor Parameters

```python
Dialog(id: int, course_id: str, data: dict)
```

The `data` dictionary contains `element_data` with the following structure:

### Required Fields

- **`type`**: Must be `"dialog"`
- **`text`**: Initial message sent to the user when the dialog starts
- **`prompt`**: System prompt for the AI model (can contain variables)

### Optional Fields

- **`model`**: AI model identifier (e.g., `"gpt-4"`, `"gpt-5"`, `"o1"`)
- **`temperature`**: Float between 0-1 for response randomness (default: 0.0 for non-reasoning models)
- **`reasoning`**: Reasoning effort level for reasoning models (`"low"`, `"medium"`, `"high"`)
- **`conversation`**: Initial conversation history (list of message dicts)
- **`parse_mode`**: `"HTML"`, `"MARKDOWN"`, or `"HTML!"` (affects model output format)
- **`link_preview`**: Boolean to enable/disable link previews
- **`transcription_language`**: ISO-639-1 language code (e.g., `"el"` for Greek)
- **`voice_response`**: Boolean to enable voice responses (default: `False`)
- **`auto_start`**: Boolean to auto-initiate conversation (default: `False`)
- **`tts_voice`**: Eleven Labs voice ID (default: `"21m00Tcm4TlvDq8ikWAM"`)
- **`tts_model`**: Eleven Labs TTS model (default: `"eleven_multilingual_v2"`)
- **`tts_speed`**: Speech speed multiplier (default: `1.0`, range: 0.25-4.0)

### Initialization Process

1. **Base Element Setup**: Calls `super().__init__()` to set up common element properties
2. **Text and Prompt Extraction**: Reads `text` and `prompt` from `element_data`
3. **Model Parameters**: Builds `params` dictionary for AI API calls
4. **Voice Settings**: Configures TTS parameters with backward compatibility for OpenAI voice names
5. **Conversation Initialization**: Sets up empty conversation list or loads existing history
6. **Parse Mode Configuration**: Sets parsing modes for user messages and model responses

### Voice Mapping (Backward Compatibility)

The Dialog element automatically maps legacy OpenAI voice names to Eleven Labs voice IDs:

```python
openai_voice_map = {
    "alloy": "21m00Tcm4TlvDq8ikWAM",
    "echo": "EXAVITQu4vr4xnSDxMaL",
    "fable": "ErXwobaYiN019PkySvjV",
    "onyx": "pNInz6obpgDQGcFmaJgB",
    "nova": "21m00Tcm4TlvDq8ikWAM",
    "shimmer": "TxGEqnHWrfWFTfGW9XjX"
}
```

Similarly, OpenAI TTS models are mapped:
- `"tts-1"` → `"eleven_multilingual_v2"`
- `"tts-1-hd"` → `"eleven_multilingual_v2"`

---

## Core Functionality

### 1. Sending the Initial Message

**Method**: `async def send(self, bot)`

**Process**:
1. Sends `self.text` to the user via Telegram
2. Saves the message to the report database with role `"bot"`
3. If `auto_start` is enabled, automatically calls `chat_reply()` with an empty message to initiate the conversation

**Code Flow**:
```python
await _send_message(bot, self.chat_id, self.text, self.parse_mode, self.link_preview)
self.save_report(role="bot", report=self.text)

if self.auto_start:
    course = Course(self.course_id)
    ban_text = course.get_user_ban_text(self.chat_id)
    await self.chat_reply(bot, "", ban_text)
```

### 2. Processing User Messages

**Method**: `async def chat_reply(self, bot, message_text, ban_text=None)`

**Process**:
1. **Ban Check**: If `ban_text` is provided, sends ban message and returns
2. **Conversation Initialization**: If conversation is empty, replaces variables in prompt and adds system message
3. **Typing Indicator**: Shows "typing..." status while generating response
4. **Response Generation**: Calls AI API via `chat_caller()` method
5. **Stop Detection**: Checks for `{STOP}` or `#конецдиалога` markers
6. **Formatting**: Escapes Markdown characters for Telegram compatibility
7. **Response Delivery**: Sends reply via `send_reply()` method

**Key Implementation Details**:

```python
# Initialize conversation with system prompt if empty
if len(conversation) == 0:
    prompt = self.replace_vars_in_prompt()
    conversation.append({"role": "system", "content": prompt})

# Generate response with typing indicator
reply = await keep_typing_while(bot, self.chat_id, self.chat_caller)

# Check for stop conditions
if "{STOP}" in reply:
    reply = reply.replace("{STOP}", "")
    self.STOP = True

# Format for Telegram
reply = reply.replace("**", "*")
reply = reply.replace("_", "\\_")
```

### 3. Response Generation

**Method**: `async def chat_caller(self)`

**Process**:
1. Runs blocking API call in a separate thread using `run_in_executor`
2. Creates a new event loop for the thread to avoid blocking the main event loop
3. Calls `chat.get_reply()` with conversation history and user message
4. Updates conversation state via `set_conversation()`
5. Returns the generated reply

**Why Thread Execution?**
- Prevents blocking the main event loop
- Allows typing indicator to continue updating
- Ensures responsive user experience during long API calls

### 4. Sending Replies

**Method**: `async def send_reply(self, bot, reply)`

**Process**:
1. Saves user message and bot reply to report database
2. Checks if `voice_response` is enabled
3. If voice enabled: calls `send_voice_reply()` to generate and send audio
4. If voice disabled: sends text message via `_send_message()`

---

## Conversation Management

### Conversation Structure

The conversation is stored as a list of message dictionaries:

```python
conversation = [
    {"role": "system", "content": "System prompt..."},
    {"role": "user", "content": "User message 1"},
    {"role": "assistant", "content": "AI response 1"},
    {"role": "user", "content": "User message 2"},
    {"role": "assistant", "content": "AI response 2"},
    # ...
]
```

### Conversation State Methods

**`set_conversation(conversation)`**:
- Updates internal conversation state
- Persists conversation to `self.data["element_data"]["conversation"]`
- Ensures conversation history is saved for future reference

**Conversation Lifecycle**:
1. **Initialization**: Empty list `[]` or loaded from `element_data`
2. **First Message**: System prompt added when first user message arrives
3. **Subsequent Messages**: User and assistant messages appended sequentially
4. **Persistence**: Conversation saved after each API call

### Conversation Persistence

The conversation is stored in:
- **Element Data**: `self.data["element_data"]["conversation"]`
- **Database**: Saved via `save_report()` for each message exchange
- **Course State**: Maintained across element transitions

---

## Voice Message Support

### Incoming Voice Messages

**Handler**: `reply_user_voice()` in `main.py`

**Process**:
1. **Validation**: Checks if current element is a Dialog
2. **File Download**: Downloads voice file from Telegram
3. **Transcription**: Calls Eleven Labs Scribe API to convert speech to text
4. **Language Detection**: Uses `transcription_language` if specified, otherwise auto-detects
5. **User Feedback**: Sends transcribed text to user: `"🎤 Распознано: {text}"`
6. **Dialog Processing**: Passes transcribed text to `chat_reply()` as regular message

**Transcription API**:
- **Endpoint**: `https://api.elevenlabs.io/v1/audio/transcription`
- **Method**: POST with multipart/form-data
- **Parameters**: 
  - `file`: Audio file (MP3, OGG, WAV, etc.)
  - `language`: Optional ISO-639-1 code
- **Response**: JSON with `text` field containing transcription

**Error Handling**:
- Falls back to text message if transcription fails
- Logs errors for debugging
- Continues dialog flow even if transcription has issues

### Voice Message Flow

```
User sends voice message
    ↓
Telegram Bot receives message
    ↓
Download voice file
    ↓
Call Eleven Labs Scribe API
    ↓
Receive transcription
    ↓
Send "🎤 Распознано: {text}" to user
    ↓
Pass text to Dialog.chat_reply()
    ↓
Process as regular text message
```

---

## Voice Response Generation

### TTS (Text-to-Speech) Process

**Method**: `async def send_voice_reply(self, bot, text)`

**Process**:
1. **Text Cleaning**: Removes Markdown formatting for TTS
2. **Language Filtering**: Optionally extracts specific language text (e.g., Greek)
3. **API Call**: Sends request to Eleven Labs TTS API
4. **Audio Generation**: Receives MP3 audio data
5. **Telegram Upload**: Sends voice message with text caption (hidden in spoiler)
6. **Error Handling**: Falls back to text message if TTS fails

### Text Cleaning

The TTS process removes formatting that doesn't translate well to speech:

```python
# Remove Markdown formatting
clean_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', clean_text)  # **bold**
clean_text = re.sub(r'\*([^*]+)\*', r'\1', clean_text)      # *italic*
clean_text = re.sub(r'`([^`]+)`', r'\1', clean_text)        # `code`
clean_text = re.sub(r'#+\s*', '', clean_text)                # Headers
clean_text = re.sub(r'---+\s*', '', clean_text)             # Horizontal rules
clean_text = re.sub(r'>{1,}\s*', '', clean_text)            # Blockquotes
clean_text = ' '.join(clean_text.split())                    # Normalize whitespace
```

### TTS API Configuration

**Endpoint**: `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Request Format**:
```json
{
  "text": "Text to synthesize",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "use_speaker_boost": true,
    "speed": 1.0
  }
}
```

**Response**: MP3 audio data (binary)

### Voice Settings

- **`stability`**: Controls voice consistency (0.0-1.0, default: 0.5)
- **`similarity_boost`**: Enhances similarity to original voice (0.0-1.0, default: 0.75)
- **`style`**: Voice style variation (0.0-1.0, default: 0.0)
- **`use_speaker_boost`**: Enhances clarity (boolean, default: true)
- **`speed`**: Speech rate multiplier (0.25-4.0, default: 1.0)

### Telegram Voice Message Format

- **Format**: MP3 audio file
- **Caption**: Text response (up to 1024 characters) wrapped in `<tg-spoiler>` tags
- **Parse Mode**: HTML (for spoiler support)

---

## Variable Substitution

### Variable Syntax

Variables in prompts use double curly braces: `{{variable_name}}`

**Basic Format**:
```yaml
prompt: |
  You are a teacher. Use this context:
  {{previous_dialog}}
```

### Variable Formats

1. **Full Conversation**: `{{element_id}}`
   - Returns all messages from the referenced element

2. **First N Messages**: `{{N]element_id}}`
   - Returns first N messages (including intro text)
   - Example: `{{3]lesson_01}}` returns first 3 messages

3. **Last M Messages**: `{{element_id[M}}`
   - Returns last M messages
   - Example: `{{lesson_01[2}}` returns last 2 messages

### Variable Resolution Process

**Method**: `replace_vars_in_prompt()`

**Steps**:
1. **Extract Variables**: Finds all `{{...}}` patterns in prompt
2. **Remove Comments**: Strips HTML-style comments `<!-- ... -->`
3. **Resolve Values**: Calls `get_var_value()` for each variable
4. **Substitute**: Replaces variables with resolved text
5. **Warning**: Logs warnings for unresolved variables

**Example**:
```python
prompt = "Context: {{5]lesson_01}}"
# Extracts: "5]lesson_01"
# Parses: limit=5, var_name="lesson_01"
# Calls: get_conversation_text("lesson_01", 5)
# Returns: First 5 messages from lesson_01
```

### Conversation Text Retrieval

**Method**: `get_conversation_text(element_id, limit)`

**Process**:
1. **Element Lookup**: Finds the referenced element in course history
2. **Text Extraction**: Gets intro text from element
3. **Conversation Appending**: Adds conversation messages if available
4. **Limit Application**: 
   - `limit > 0`: Returns first N messages
   - `limit < 0`: Returns last M messages
   - `limit == 0`: Returns all messages

**Format**:
```
### assistant:
{intro_text}

### user:
{user_message_1}

### assistant:
{assistant_message_1}

...
```

---

## Auto-Start Feature

### Purpose

Allows the bot to initiate the conversation automatically without waiting for user input.

### Configuration

Set `auto_start: true` in element configuration:

```yaml
dialog_element:
  type: dialog
  text: "Let's start our conversation!"
  prompt: "You are a helpful assistant. Start by greeting the user."
  auto_start: true
```

### Behavior

1. **Initial Message**: Bot sends `text` message to user
2. **Automatic Initiation**: Immediately calls `chat_reply()` with empty message
3. **First AI Response**: Bot generates and sends first response automatically
4. **Voice Support**: If `voice_response: true`, first response is sent as voice message

### Use Cases

- **Language Practice**: Bot asks first question in target language
- **Tutorials**: Bot explains what will happen next
- **Conversation Starters**: Bot initiates discussion on a topic
- **Voice-Only Dialogs**: Bot speaks first in voice-only interactions

### Implementation

```python
if self.auto_start:
    logging.info(f"Auto-start enabled for dialog {self.id}, initiating conversation")
    course = Course(self.course_id)
    ban_text = course.get_user_ban_text(self.chat_id)
    await self.chat_reply(bot, "", ban_text)
```

---

## Stop Conditions

### Stop Markers

The dialog continues until the AI model includes one of these markers in its response:

1. **`{STOP}`**: Explicit stop marker (removed from response)
2. **`#конецдиалога`**: Alternative stop marker (Russian: "end of dialog")

### Stop Detection

```python
if "{STOP}" in reply:
    reply = reply.replace("{STOP}", "")
    self.STOP = True
elif "#конецдиалога" in reply:
    logging.warning(f"AI replied '{reply}' without 'STOP'")
    self.STOP = True
```

### Flow Control

When `self.STOP` is set:
- Dialog element completes
- Course system calls `send_next_element()` to proceed to next element
- Conversation history is preserved for future reference

### Prompting for Stop

Include in system prompt:
```
When the conversation is complete, end your response with {STOP}.
```

---

## Integration Points

### 1. Telegram Bot Integration

**Text Messages** (`main.py:reply_user()`):
```python
if e.type == "dialog":
    course = Course(e.course_id)
    ban_text = course.get_user_ban_text(chat_id)
    await e.chat_reply(bot, message_text, ban_text)
    
    if hasattr(e, 'STOP'):
        await Course.send_next_element(bot, chat_id, username)
```

**Voice Messages** (`main.py:reply_user_voice()`):
```python
if e.type == "dialog":
    transcription_language = getattr(e, 'transcription_language', None)
    message_text = await transcribe_voice_message(bot, message, transcription_language)
    await e.chat_reply(bot, message_text, ban_text)
```

### 2. AI Chat Service

**API Call** (`chat.py:get_reply()`):
```python
conversation.append({"role": "user", "content": new_prompt})
reply = await get_reply_impl(conversation, params)
conversation.append({"role": "assistant", "content": reply})
return reply, conversation
```

**Supported APIs**:
- OpenAI Chat Completions API
- OpenAI Responses API (for reasoning models)
- Proxy API (configurable endpoint)

### 3. Course System

**Element Progression**:
- Dialog waits for user input (or auto-starts)
- Continues until `STOP` condition
- Transitions to next element automatically

**State Management**:
- Conversation history stored in element data
- Reports saved to database
- User progress tracked per element

### 4. Database Integration

**Report Saving**:
- Each user message saved with `role="user"`
- Each bot response saved with `role="bot"`
- Enables conversation replay and analytics

---

## Configuration Parameters

### Complete Parameter Reference

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | Yes | - | Must be `"dialog"` |
| `text` | string | Yes | - | Initial message to user |
| `prompt` | string | Yes | - | System prompt for AI (supports variables) |
| `model` | string | No | `"gpt-5"` | AI model identifier |
| `temperature` | float | No | `0.0` | Response randomness (0-1) |
| `reasoning` | string | No | `"low"` | Reasoning effort for reasoning models |
| `conversation` | array | No | `[]` | Initial conversation history |
| `parse_mode` | string | No | `"MARKDOWN"` | `"HTML"`, `"MARKDOWN"`, or `"HTML!"` |
| `link_preview` | boolean | No | `false` | Enable link previews |
| `transcription_language` | string | No | `null` | ISO-639-1 code for voice transcription |
| `voice_response` | boolean | No | `false` | Enable voice responses |
| `auto_start` | boolean | No | `false` | Auto-initiate conversation |
| `tts_voice` | string | No | `"21m00Tcm4TlvDq8ikWAM"` | Eleven Labs voice ID |
| `tts_model` | string | No | `"eleven_multilingual_v2"` | Eleven Labs TTS model |
| `tts_speed` | float | No | `1.0` | Speech speed (0.25-4.0) |

### Model Configuration

**Reasoning Models** (e.g., `o1`, `gpt-5`):
- Use `reasoning` parameter instead of `temperature`
- Values: `"low"`, `"medium"`, `"high"` (or `"minimal"` for newer models)

**Standard Models** (e.g., `gpt-4`, `gpt-3.5-turbo`):
- Use `temperature` parameter
- Range: 0.0 (deterministic) to 1.0 (creative)

### Parse Mode Behavior

- **`MARKDOWN`**: Default, supports `*bold*`, `_italic_`, `` `code` ``
- **`HTML`**: Supports HTML tags, used for user messages
- **`HTML!`**: HTML for both user messages and model responses (enables HTML in AI output)

---

## Examples

### Example 1: Basic Dialog

```yaml
simple_dialog:
  type: dialog
  text: "Hello! How can I help you today?"
  prompt: |
    You are a helpful assistant.
    Answer questions clearly and concisely.
  model: gpt-4
  temperature: 0.7
```

### Example 2: Dialog with Context

```yaml
contextual_dialog:
  type: dialog
  text: "Let's discuss what you learned."
  prompt: |
    You are a teacher reviewing a lesson.
    
    Previous lesson content:
    {{lesson_01}}
    
    Ask questions about the material and provide feedback.
  model: gpt-4
  temperature: 0.7
```

### Example 3: Language Learning Dialog

```yaml
greek_practice:
  type: dialog
  text: |
    Теперь давай попрактикуемся в разговоре на греческом языке!
    Можешь писать или говорить голосовыми сообщениями.
  prompt: |
    Ты — преподаватель греческого языка.
    Помогай ученику практиковать разговорную речь.
    Исправляй ошибки мягко и объясняй грамматику.
  transcription_language: el  # Greek language code
  model: gpt-4
  temperature: 0.7
```

### Example 4: Voice-Only Dialog

```yaml
voice_dialog:
  type: dialog
  text: |
    Я буду отвечать голосом, чтобы ты мог слышать правильное произношение.
  prompt: |
    Ты — преподаватель греческого языка.
    Начни диалог с приветствия на греческом языке.
    Говори медленно и четко.
  voice_response: true
  auto_start: true
  tts_voice: 21m00Tcm4TlvDq8ikWAM
  tts_model: eleven_multilingual_v2
  tts_speed: 0.8
  transcription_language: el
  model: gpt-4
  temperature: 0.7
```

### Example 5: Dialog with Limited Context

```yaml
focused_dialog:
  type: dialog
  text: "Let's focus on the last part of the lesson."
  prompt: |
    You are reviewing the recent lesson.
    
    Last 3 messages from previous discussion:
    {{previous_dialog[3}}
    
    Focus only on these topics.
  model: gpt-4
  temperature: 0.5
```

### Example 6: Reasoning Model Dialog

```yaml
analytical_dialog:
  type: dialog
  text: "Let's analyze this problem step by step."
  prompt: |
    You are a math tutor.
    Help the student solve problems by thinking through them carefully.
    Show your reasoning process.
  model: o1
  reasoning: medium
```

---

## Error Handling

### Common Error Scenarios

1. **API Failures**: Falls back gracefully, logs errors
2. **Voice Generation Failures**: Falls back to text messages
3. **Transcription Failures**: Logs error, may skip voice processing
4. **Variable Resolution Failures**: Logs warning, leaves variable placeholder
5. **Empty Responses**: Checks for empty strings before sending

### Logging

The Dialog element uses Python's `logging` module for:
- Initialization parameters
- Voice response settings
- API call status
- Error conditions
- Variable resolution warnings

---

## Performance Considerations

### Typing Indicator

- Updates every ~1 second while waiting for API response
- Cancels immediately when response arrives
- Prevents event loop blocking via thread execution

### Conversation Length

- No explicit limit on conversation length
- Consider token limits of AI models
- Long conversations may increase API costs

### Voice Processing

- TTS generation adds latency (~1-3 seconds)
- Transcription adds latency (~2-5 seconds)
- Consider user experience for real-time interactions

---

## Best Practices

1. **Prompt Design**: Be clear and specific about desired behavior
2. **Stop Conditions**: Always include stop instructions in prompt
3. **Variable Usage**: Use variables to provide context without duplicating content
4. **Voice Settings**: Test TTS speed and voice selection for target language
5. **Error Handling**: Design prompts to handle edge cases gracefully
6. **Conversation Limits**: Consider using message limits (`{{N]element_id}}`) for long conversations
7. **Language Support**: Specify `transcription_language` for non-English languages

---

## Troubleshooting

### Dialog Not Responding

- Check API key configuration
- Verify model name is correct
- Check network connectivity
- Review error logs

### Voice Not Working

- Verify `ELEVENLABS_API_KEY` is set
- Check voice ID is valid
- Ensure audio format is supported
- Review TTS API error responses

### Variables Not Resolving

- Verify element IDs exist in course
- Check variable syntax (`{{...}}`)
- Review element history in database
- Check logs for resolution warnings

### Stop Condition Not Triggering

- Ensure prompt includes stop instructions
- Check for exact string match (`{STOP}` or `#конецдиалога`)
- Verify model is following instructions
- Consider adjusting temperature/reasoning parameters

---

## Future Enhancements

Potential improvements:
- Conversation length limits
- Token usage tracking
- Multi-language TTS support
- Custom stop markers
- Conversation export/import
- Advanced variable filters
- Streaming responses
- Conversation templates

---

## Related Documentation

- [Elements Overview](./elements.md)
- [Course System](./database.md)
- [Telegram Integration](./telegram_progress_saving.md)
- [Feature Delays](./feature_delay.md)
