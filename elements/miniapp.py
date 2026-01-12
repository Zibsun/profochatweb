from .element import Element

class Miniapp(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)

        self.text = data["element_data"]["text"]
        self.id = id
        self.button = data["element_data"]["button"]
        self.app_url = data["element_data"]["app_url"]
        self.question = data["element_data"]["question"]

    def save(self):
        """Save element to database (replaces send method for web)"""
        question_id = self.save_report(role = "bot", report = self.text)
