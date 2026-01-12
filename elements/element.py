import db
import traceback

from datetime import datetime, timedelta
import re

class Element:
    def __init__(self, id, course_id, data):
        self.id = id
        self.data = data
        self.type = data["element_data"]["type"]
        self.wait_for_callback = True
        self.course_id = course_id

        parse_mode = data["element_data"].get("parse_mode")
        if parse_mode == "HTML":
            self.parse_mode = "HTML"
        else:
            self.parse_mode = "MARKDOWN"

        self.link_preview = data["element_data"].get("link_preview") 
        # link_preview = no (default for messages with button and dialog messages) 
        # or yes (default for other messages)


    def set_user(self, chat_id, username):
        self.chat_id = chat_id
        self.username = username
        self.person = f"@{self.username}"

    def set_run_id(self, run_id):
        self.run_id = run_id
    def set_conversation_id(self, conversation_id):
        self.conversation_id = conversation_id

    def save_report (self, role, report, score = None, maxscore = None):
        # print(_get_stack_part(5, 3))
        username = "--empty--" if self.username is None else self.username
        # print (f"{self.chat_id}, {username}, {self.id}, {self.data}, {role}, {report}")
        return db.insert_element(self.chat_id, self.course_id, username, self.id, self.type, self.run_id, self.data, role, report, score = score, maxscore=maxscore)


def _shorten_text(text, N):
    if len(text) <= N:
        return text
    return text[:N-3] + "..."

def _shorten_stack_element(tb_line):
    # input sample:
    # File "..../profochatbot/course.py", line 322, in send_next_element
    # await e.send (bot)
    try:
        return tb_line.replace('\n', ': ').split('", ', 1)[1]  # e.g., 'line 322, in send_next_element: await e.send (bot)'
    except Exception:
        return tb_line  # fallback if format unexpected

def _get_stack_part(lastN, exceptM = 0):
    list = traceback.format_stack()[-(lastN+1):]
    shortened = [_shorten_stack_element(s) for s in list[:-(exceptM+1)]]
    return '\n--> '.join(shortened)

def _parse_interval(interval_str):
    # Regular expression to match strings like "2d:3h", "1h", "45m", "1d:2h:3m:4s"
    pattern = r"(?:(\d+)d)?(?::)?(?:(\d+)h)?(?::)?(?:(\d+)m)?(?::)?(?:(\d+)s)?"
    match = re.fullmatch(pattern, interval_str)

    if not match:
        raise ValueError("Invalid interval format")

    # Extract the matched groups, default to 0 if not present
    days = int(match.group(1)) if match.group(1) else 0
    hours = int(match.group(2)) if match.group(2) else 0
    minutes = int(match.group(3)) if match.group(3) else 0
    seconds = int(match.group(4)) if match.group(4) else 0

    # Create a timedelta object with the parsed values
    return timedelta(days=days, hours=hours, minutes=minutes, seconds=seconds)

def _add_interval_to_current_time(interval_str):
    # Get current date and time
    current_time = datetime.now()

    # Parse the interval and add it to the current time
    interval = _parse_interval(interval_str)
    new_time = current_time + interval

    return new_time
