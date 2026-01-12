from .element import Element

import chat
import re
import logging
import asyncio
import io

from utils import get_direct_download_link

class Dialog(Element):
    def __init__(self, id: int, course_id: str, data: str) -> None:
        super().__init__(id, course_id, data)
        element_data = data["element_data"]
        self.text = element_data["text"]
        self.prompt = element_data["prompt"] 
        
        self.params = { 
            "model": element_data.get("model"),
            "temperature": element_data.get("temperature"),
            "reasoning": element_data.get("reasoning")
        }
        
        # Language for voice message transcription (ISO-639-1 code, e.g., "el" for Greek)
        self.transcription_language = element_data.get("transcription_language")
        
        # Voice response settings
        voice_response_value = element_data.get("voice_response", False)
        # Ensure boolean conversion (YAML true/false should be bool, but handle string cases)
        if isinstance(voice_response_value, str):
            self.voice_response = voice_response_value.lower() in ("true", "yes", "1")
        else:
            self.voice_response = bool(voice_response_value)
        # Получаем значения TTS параметров, с заменой старых значений OpenAI на Eleven Labs
        tts_voice_raw = element_data.get("tts_voice", "21m00Tcm4TlvDq8ikWAM")
        tts_model_raw = element_data.get("tts_model", "eleven_multilingual_v2")
        
        # Маппинг старых значений OpenAI на значения Eleven Labs
        # Старые голоса OpenAI: alloy, echo, fable, onyx, nova, shimmer
        openai_voice_map = {
            "alloy": "21m00Tcm4TlvDq8ikWAM",  # Rachel (пример, нужно заменить на реальный ID)
            "echo": "EXAVITQu4vr4xnSDxMaL",   # Bella (пример)
            "fable": "ErXwobaYiN019PkySvjV",  # Antoni (пример)
            "onyx": "pNInz6obpgDQGcFmaJgB",   # Adam (пример)
            "nova": "21m00Tcm4TlvDq8ikWAM",   # Rachel (пример)
            "shimmer": "TxGEqnHWrfWFTfGW9XjX" # Dorothy (пример)
        }
        
        # Если используется старое значение OpenAI, заменяем на Eleven Labs
        if tts_voice_raw in openai_voice_map:
            self.tts_voice = openai_voice_map[tts_voice_raw]
            logging.warning(f"Replaced OpenAI voice '{tts_voice_raw}' with Eleven Labs voice ID '{self.tts_voice}'")
        else:
            self.tts_voice = tts_voice_raw
        
        # Маппинг старых моделей OpenAI на модели Eleven Labs
        openai_model_map = {
            "tts-1": "eleven_multilingual_v2",
            "tts-1-hd": "eleven_multilingual_v2"
        }
        
        # Если используется старая модель OpenAI, заменяем на Eleven Labs
        if tts_model_raw in openai_model_map:
            self.tts_model = openai_model_map[tts_model_raw]
            logging.warning(f"Replaced OpenAI model '{tts_model_raw}' with Eleven Labs model '{self.tts_model}'")
        else:
            self.tts_model = tts_model_raw
        
        self.tts_speed = element_data.get("tts_speed", 1.0)  # Default speed: 1.0
        
        # Auto-start dialog: если true, бот сам начнет диалог после отправки начального сообщения
        auto_start_value = element_data.get("auto_start", False)
        if isinstance(auto_start_value, str):
            self.auto_start = auto_start_value.lower() in ("true", "yes", "1")
        else:
            self.auto_start = bool(auto_start_value)
        
        # Log voice response settings for debugging
        logging.info(f"Dialog {self.id}: voice_response={self.voice_response} (from value: {voice_response_value}), tts_voice={self.tts_voice}, tts_model={self.tts_model}, tts_speed={self.tts_speed}, auto_start={self.auto_start}")
        
        if "conversation" not in element_data:
            self.set_conversation ([]) # prompt is not ready here: vars should be replaced
        else:
            self.conversation = element_data["conversation"]

        parse_mode = data["element_data"].get("parse_mode")
        if parse_mode == "HTML!":
            self.parse_mode = "HTML"
            self.model_parse_mode = "HTML"
        else:
            self.model_parse_mode = "MARKDOWN"

    def set_conversation(self, conversation):
        self.conversation = conversation
        self.data["element_data"]["conversation"] = self.conversation

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)

    def save_reply(self, reply):
        """Save reply to database (replaces send_reply method for web)"""
        self.bot_reply = reply        
        self.save_report(role = "user", report = self.message_text)
        self.save_report(role = "bot", report = self.bot_reply)


    async def chat_reply(self, message_text, ban_text=None):
        """Process chat reply (for web, without bot parameter)"""
        if ban_text is not None:
            self.BANNED = True
            self.text = ban_text
            self.save()
            return

        self.message_text = message_text        
        conversation = self.conversation
        if len(conversation) == 0:
            prompt = self.replace_vars_in_prompt()
            conversation.append({"role": "system", "content": prompt})
    
        # Call chat API directly (no typing indicator for web)
        reply, conversation = await chat.get_reply(conversation, message_text, self.params)
        self.set_conversation(conversation)

        if "{STOP}" in reply:
            reply = reply.replace("{STOP}", "")
            self.STOP = True
        elif "#конецдиалога" in reply:
            logging.warning(f"AI replied '{reply}' without 'STOP'")
            self.STOP = True
            
        reply = reply.replace("**", "*")
        reply = reply.replace("_", "\\_") # Escape underscores for markdown
        
        if reply.strip() != "": # can be if {STOP} was in AI's answer
            self.save_reply(reply)
        
    # replace_vars needs previous conversations in db, so it must be called just before sending this element
    def replace_vars_in_prompt(self):
        prompt = re.sub(r'<!--.*?-->', '', self.prompt, flags=re.DOTALL)
        pattern = re.compile(r"\{\{(.*?)\}\}")
        var_names = pattern.findall(prompt) #var_name is element_id exactly (without {{braces}})
        vars_map = {var_name: self.get_var_value(var_name) for var_name in var_names}

        def replacer(match):
            var_name = match.group(1)
            var_value = vars_map.get(var_name) # From ChatGPT: ,default=f"{{{{{var_name}}}}}")
            # logging.info(f"Variable {var_name} is replacing by this:\n{var_value}")
            if var_value != "NOT_FOUND": # Would be None if the key did not exist
                del vars_map[var_name] # Could raise an error but the key exists as this pattern is the same
            return var_value
        
        prompt = pattern.sub(replacer, prompt)
        #if '{{' in text:
        #    logging.warning(f"Not all variables replaced")
        for var_name in vars_map.keys():
            logging.warning(f"Variable {var_name} is not found among previous element keys")
        return prompt
        
    # Supports the following format: "N]name" (N first messages only) or "name[M" (M last messages only) 
    def get_var_value(self, var_name):
        limit = 0
        try:
            i = var_name.find("]")
            if i > 0:
                s = var_name[0:i]
                var_name = var_name[i+1:]
                limit = int(s)
            else:
                i = var_name.find("[")
                if i > 0:
                    s = var_name[i+1:]
                    var_name = var_name[0:i]
                    limit = -int(s)
            return self.get_conversation_text(var_name, limit)
        except ValueError:
            return self.get_conversation_text(var_name, limit)
        
    # Now, this supports intro text (from any elements) + conversation from dialogs
    # For dialogs, limit > 0 means number of first messages to return (text is counted as 1), limit < 0 - last messages.
    # TODO: support adding user's answers from input, question and other? elements
    def get_conversation_text(self, element_id, limit):
        from course import Course
        element = Course.get_last_element_of(self.chat_id, element_id)
        if element is None:
            return "NOT_FOUND"
        element_data = element.data["element_data"]
        text = element_data["text"] # text always exists in any element that could be referenced in prompt?
        if "conversation" in element_data:
            text = "### assistant:\n" + text + "\n" # One \n is already included here
            i = 1
            n = len(element_data["conversation"]) + limit # limit < 0
            for message in element_data["conversation"]:
                if message["role"] != "system":
                    if limit < 0 and i == n: # len includes system. E.g. 2 user + 2 assistant => len=5. limit=-2 -> n=3. i starts with 1 -> 1 user and 1 assistant skipped to reach 3 -> 2 messages returned
                        text = ""
                    text = text + "### " + message["role"] + ":\n" + message["content"] + "\n\n"
                    i += 1
                    if limit > 0 and i >= limit:
                        break
        #if limit != 0:
        #    logging.debug(f"{element_id} (limit={limit}): {text}")
        return text
