import os
import logging
import requests
import yaml
from openai import OpenAI

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not installed, skip
    pass

# Load configuration settings
CONFIG_FILE = os.environ.get('CONFIG_FILE', 'config.yaml')
with open(CONFIG_FILE, 'r') as file:
    CONFIG = yaml.safe_load(file)["openai"]
API_KEY = os.getenv('OPENAI_API_KEY', CONFIG.get("api_key"))
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
CURRENT_ENV = os.getenv('CURRENT_ENVIRONMENT', '')

def set_param(request_params, params, name, default_value = None):
    """
    Helper function to set parameters from different sources
    """
    request_params[name] = params.get(name) or CONFIG.get(name) or default_value

async def get_reply_sys(conversation, sys_prompt, params = {}):
    """
    Unlike get_reply, conversation must not be modified here.
    The method is used by Flows (for admins), so the default params differs from the defaults for users.
    """
    conversation = [{"role": "system", "content": sys_prompt}] + conversation # + creates new array
    reply = await get_reply_impl(conversation, params)
    return reply, conversation

async def get_reply(conversation, new_prompt, params):
    """
    params is a dictionary containing model, temperature, etc.
    """
    conversation.append({"role": "user", "content": new_prompt})
    reply = await get_reply_impl(conversation, params)
    conversation.append({"role": "assistant", "content": reply})
    return reply, conversation

async def get_reply_impl(conversation, params):
    if CURRENT_ENV == 'heroku':
        base_url = "https://api.openai.com/v1"
    else:
        base_url = CONFIG.get("proxy") or "https://api.proxyapi.ru/openai/v1"

    is_responses = CONFIG.get("api") == "responses"
 
    request_params = {}
    # Add parameters based on model capabilities (both APIs)
    set_param(request_params, params, "model", "gpt-5")
    model_name = request_params.get("model")

    if model_name.startswith("o") or model_name == "gpt-5":
        # Reasoning models: use `reasoning` instead of temperature
        pname = "reasoning" if is_responses else "reasoning_effort"
        set_param(request_params, params, pname, "low")  
        # Note: before gpt-5, "minimal" is not supported
        if is_responses:
            request_params[pname] = {"effort": request_params[pname]}
    else:
        set_param(request_params, params, "temperature", 0.0)

    if is_responses:
        client = OpenAI(api_key=API_KEY, base_url=base_url)
        # Responses API: convert system messages to instructions; keep the rest as input messages
        input_messages = []
        system_messages = []
        for msg in conversation:
            role = msg.get("role")
            if role == "system":
                system_messages.append(str(msg.get("content", "")))
            else:
                input_messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })

        if system_messages:
            request_params["instructions"] = "\n\n".join(m for m in system_messages if m)

        request_params["input"] = input_messages if input_messages else conversation

    # Call API
    if is_responses:
        response = client.responses.create(**request_params)
        # If we’re here, it’s complete
    else: # Completions API
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        request_params["messages"] = conversation
        response = requests.post(base_url+"/chat/completions", headers=headers, json=request_params)
        if response.status_code != 200:
            raise Exception(f"Error: {response.status_code} - {response.text}")

    if CONFIG.get("log"):
        logging.info(f"AI: conversation length = {len(conversation)}")
        if is_responses:
            log_response(response) # Log token usage information

    if is_responses:
        reply = response.output_text
        # if reply is None:
        #     # Fallback: aggregate text from output array
        #     texts = []
        #     try:
        #         for item in getattr(response, "output", []) or []:
        #             for c in item.get("content", []) or []:
        #                 if isinstance(c, dict) and c.get("type") in ("output_text", "text") and c.get("text"):
        #                     texts.append(c["text"])
        #     except Exception:
        #         pass
        #     reply = "".join(texts) if texts else ""
    else:
        #  reply = completion.choices[0].message.content # AI coder replaced this for some reason:
        reply = response.json()["choices"][0]["message"]["content"]

    return reply

def log_response(response):
    """
    Log token usage information from the Responses API response
    """
    usage = getattr(response, "usage", None)
    # usage = dict(usage) if isinstance(usage, dict) else getattr(usage, "__dict__", {}) or usage
    input_tokens = getattr(usage, "input_tokens", None)
    output_tokens = getattr(usage, "output_tokens", None)
    cached_tokens = getattr(usage, "input_tokens_details", None)
    if cached_tokens:
        cached_tokens = getattr(cached_tokens, "cached_tokens", None)
        cached_ratio = "0" if cached_tokens is None else round(cached_tokens * 100 / input_tokens)
    else:
        cached_ratio = ""
    r_tokens = getattr(usage, "output_tokens_details", None)
    if r_tokens:
        r_tokens = getattr(r_tokens, "reasoning_tokens", None)
        r_ratio = "0" if r_tokens is None else round(r_tokens * 100 / output_tokens)
    else:
        r_ratio = ""
    logging.info(
        f"Usage: input_tokens = {input_tokens} (cached = {cached_tokens}, {cached_ratio}%), output_tokens = {output_tokens} (reasoning = {r_tokens}, {r_ratio}%)"
    )
