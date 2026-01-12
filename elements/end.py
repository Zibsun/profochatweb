from .element import Element
import db

class End(Element):
    """
    This is typically used with Delay elements
    """
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        self.text = data["element_data"].get("text", "")
        # End elements "wait": self.wait_for_callback remains True

    def save(self):
        """Save element to database (replaces send method for web)"""
        if self.text:
            self.save_report(role="bot", report=self.text)
        else:
            self.save_report(role="bot", report="Course ended")
        
        db.set_course_ended(self.chat_id, self.course_id)