from .element import Element
from .element import _add_interval_to_current_time
import db

class Jump(Element):
    """
    Sample:
    type: jump
    text: Ну что, продолжим дальше?
    options:
    - text: Продолжим!
    - text: Давай завтра
        wait: 1d
    - text: Нет, хватит!
        goto: e_id1
    """
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        self.text = data["element_data"]["text"]
        self.options = data["element_data"].get("options")

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)

    def set_to_wait(self, wait_time):
        wait_till_date = _add_interval_to_current_time(wait_time)
        # print (f"wait_till_date={wait_till_date}")
        # print (f"self.conversation_id={self.conversation_id}")

        db.add_waiting_element(self.chat_id, wait_till_date, is_waiting=True, element_id=None, course_id=self.course_id)
