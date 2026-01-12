from .element import Element
from utils import get_direct_download_link

class Message(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)

        self.text = data["element_data"]["text"]
        self.id = id

        if "media" in data["element_data"]:
            self.media = [get_direct_download_link(url) for url in data["element_data"]["media"]]
        else:
            self.media = None
        
        self.button = data["element_data"].get("button")
        if not self.button:
            # print ("self.wait_for_callback = False")
            self.wait_for_callback = False

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)
