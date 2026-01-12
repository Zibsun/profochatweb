from .element import Element
from .element import _add_interval_to_current_time
import db

class Delay(Element):
  """
  Sample course:
    e_delay0:
      type: delay
      wait: 1h
      goto: e_message1
      text: (optional)
    e_message0:
      type: message
      text: Here is the main course
    e_end:
      type: end
      text: (optional)

    e_message1:
      type: message
      text: This may be any element
    e_delay2:
      type: delay
      wait: 7d
      goto: e_message2
    e_message2:
      type: message
      text: This is the end of the chain of delayed elements
  """
  def __init__(self, id, course_id, data):
    super().__init__(id, course_id, data)
    self.text = data["element_data"].get("text", "")
    self.wait = data["element_data"].get("wait")
    self.goto = data["element_data"].get("goto")
    # Delay elements "wait": self.wait_for_callback remains True

  def save(self):
    """Save element to database (replaces send method for web)"""
    if self.text:
      self.save_report(role="bot", report=self.text)
    
    if self.wait and self.goto:
      self.set_to_wait()
      if not self.text: # Avoiding duplicate messages from this element
        self.save_report(role="bot", report=f"Silent delay to element '{self.goto}' for {self.wait}")

  # Unlike Jump, this is called immediately, not from callback in main
  def set_to_wait(self):
    wait_till_date = _add_interval_to_current_time(self.wait)
    db.add_waiting_element(self.chat_id, wait_till_date, True, self.goto, self.course_id)
