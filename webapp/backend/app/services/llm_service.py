"""Сервис для работы с LLM через общий модуль chat.py"""
import sys
import os
import asyncio
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Добавляем корень проекта в путь для импорта chat.py
project_root = Path(__file__).parent.parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Устанавливаем CONFIG_FILE через переменную окружения перед импортом chat
# chat.py использует переменную окружения CONFIG_FILE
if not os.environ.get('CONFIG_FILE'):
    config_dir = os.getenv('CONFIG_DIR', '')
    config_file_path = config_dir + 'config.yaml'
    # Проверяем существование файла, если не указан CONFIG_DIR
    if not config_dir:
        config_file_path = str(project_root / 'config.yaml')
    os.environ['CONFIG_FILE'] = config_file_path

# Импортируем chat после настройки переменных окружения
CHAT_MODULE_AVAILABLE = False
fallback_client = None

try:
    import chat
    CHAT_MODULE_AVAILABLE = True
except Exception as e:
    logger.error(f"Failed to import chat module: {e}")
    CHAT_MODULE_AVAILABLE = False
    # Fallback на прямую работу с OpenAI (если chat.py недоступен)
    try:
        from openai import OpenAI
        from app.config import settings
        fallback_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as fallback_error:
        logger.error(f"Failed to initialize fallback OpenAI client: {fallback_error}")
        fallback_client = None

def _prepare_conversation_and_prompt(messages: list[dict]) -> tuple[list[dict], str]:
    """
    Подготовка conversation и new_prompt из messages.
    
    Args:
        messages: Список сообщений с ролями (system, user, assistant)
    
    Returns:
        tuple: (conversation, new_prompt)
    """
    conversation = messages.copy()
    new_prompt = ""
    
    logger.info(f"_prepare_conversation_and_prompt: Input messages count={len(messages)}, last role={messages[-1].get('role') if messages else 'none'}")
    
    # Если последнее сообщение - user, извлекаем его
    if conversation and conversation[-1]["role"] == "user":
        new_prompt = conversation[-1]["content"]
        conversation = conversation[:-1]
        logger.info(f"_prepare_conversation_and_prompt: Extracted user prompt, conversation length={len(conversation)}, new_prompt length={len(new_prompt)}")
    else:
        logger.warning(f"_prepare_conversation_and_prompt: Last message is not user, role={conversation[-1].get('role') if conversation else 'none'}")
    
    logger.info(f"_prepare_conversation_and_prompt: Final conversation={[{'role': m.get('role'), 'content_length': len(m.get('content', ''))} for m in conversation]}")
    
    return conversation, new_prompt

def _prepare_params(
    model: Optional[str], 
    temperature: Optional[float] = None, 
    reasoning: Optional[str] = None
) -> dict:
    """
    Подготовка параметров для chat.get_reply.
    
    Args:
        model: Идентификатор модели
        temperature: Температура для стандартных моделей
        reasoning: Reasoning effort для reasoning моделей
    
    Returns:
        dict: Параметры для chat.get_reply
    """
    # Маппинг нестандартных названий моделей
    model_mapping = {
        "gpt-4.1": "gpt-4-turbo",  # gpt-4.1 -> gpt-4-turbo
        "gpt-4": "gpt-4-turbo",     # По умолчанию используем turbo версию
    }
    
    # Если модель не указана, используем дефолтную
    if not model:
        model = "gpt-4-turbo"
    
    # Применяем маппинг если нужно
    model = model_mapping.get(model, model)
    
    params = {"model": model}
    
    # Reasoning модели используют параметр reasoning вместо temperature
    if model.startswith("o") or model == "gpt-5":
        if reasoning:
            params["reasoning"] = reasoning
        else:
            params["reasoning"] = "low"  # Значение по умолчанию
    else:
        # Стандартные модели используют temperature
        params["temperature"] = temperature if temperature is not None else 0.0
    
    return params

def _call_async_chat(conversation: list[dict], new_prompt: str, params: dict) -> tuple[str, list[dict]]:
    """
    Обертка для вызова async chat.get_reply из sync контекста.
    
    Args:
        conversation: История разговора
        new_prompt: Новое сообщение пользователя
        params: Параметры модели
    
    Returns:
        tuple: (reply, updated_conversation)
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        reply, updated_conversation = loop.run_until_complete(
            chat.get_reply(conversation, new_prompt, params)
        )
        return reply, updated_conversation
    finally:
        loop.close()

def generate_chat_response(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    reasoning: Optional[str] = None
) -> str:
    """
    Генерация ответа от LLM через общий chat.py модуль.
    
    Эта функция использует общий модуль chat.py из Telegram версии,
    обеспечивая единообразие работы с AI во всех версиях приложения.
    
    Args:
        messages: Список сообщений с ролями (system, user, assistant)
        model: Идентификатор модели (например, "gpt-4", "gpt-5", "o1")
        temperature: Температура для стандартных моделей (0.0-1.0)
        reasoning: Reasoning effort для reasoning моделей ("low", "medium", "high")
    
    Returns:
        str: Ответ от AI модели
    
    Raises:
        Exception: При ошибке генерации ответа
    
    Example:
        >>> messages = [
        ...     {"role": "system", "content": "You are a helpful assistant."},
        ...     {"role": "user", "content": "Hello!"}
        ... ]
        >>> response = generate_chat_response(messages, model="gpt-4", temperature=0.7)
        >>> print(response)
        "Hello! How can I help you today?"
    """
    # Если модель не указана, используем дефолтную
    if not model:
        model = "gpt-4-turbo"
    
    # Маппинг нестандартных названий моделей
    model_mapping = {
        "gpt-4.1": "gpt-4-turbo",
        "gpt-4": "gpt-4-turbo",
    }
    model = model_mapping.get(model, model)
    
    # Если chat модуль недоступен, используем fallback
    if not CHAT_MODULE_AVAILABLE:
        if fallback_client is None:
            raise Exception("chat module not available and fallback client not initialized")
        
        logger.warning("chat module not available, using fallback OpenAI client")
        try:
            # Reasoning модели не поддерживаются в fallback
            if reasoning and (model.startswith("o") or model == "gpt-5"):
                logger.warning(f"Reasoning parameter not supported in fallback mode for model {model}")
            
            logger.info(f"generate_chat_response (fallback): Sending to OpenAI with model={model}, messages_count={len(messages)}, messages={[{'role': m.get('role'), 'content_length': len(m.get('content', ''))} for m in messages]}")
            response = fallback_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature if temperature is not None else 0.7
            )
            reply_content = response.choices[0].message.content
            logger.info(f"generate_chat_response (fallback): Received reply, length={len(reply_content)}")
            return reply_content
        except Exception as e:
            raise Exception(f"Ошибка генерации ответа (fallback): {str(e)}")
    
    try:
        # Подготовка conversation и new_prompt
        conversation, new_prompt = _prepare_conversation_and_prompt(messages)
        
        logger.info(f"generate_chat_response: Prepared conversation length={len(conversation)}, new_prompt length={len(new_prompt)}, conversation={[{'role': m.get('role'), 'content_length': len(m.get('content', ''))} for m in conversation]}")
        
        # Подготовка параметров
        params = _prepare_params(model, temperature, reasoning)
        
        logger.info(f"generate_chat_response: Calling chat.get_reply with model={params.get('model')}, params={params}")
        
        # Вызов async функции через обертку
        reply, updated_conversation = _call_async_chat(conversation, new_prompt, params)
        
        logger.info(f"generate_chat_response: Received reply, length={len(reply)}, updated_conversation length={len(updated_conversation)}")
        
        return reply
    except Exception as e:
        logger.error(f"Error in chat.get_reply: {e}", exc_info=True)
        raise Exception(f"Ошибка генерации ответа: {str(e)}")

