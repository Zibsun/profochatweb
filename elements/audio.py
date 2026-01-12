from .element import Element
from utils import get_direct_download_link

class Audio(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        
        # media обязателен для audio элемента
        self.media = [get_direct_download_link(url) for url in data["element_data"]["media"]]
        
        # text опционален
        self.text = data["element_data"].get("text", "")
        
        # audio элемент не ожидает ответа пользователя
        self.wait_for_callback = False

    def save(self):
        """Save element to database (replaces send method for web)"""
        report_text = self.text if self.text else f"🎵 Аудио: {len(self.media)} файл(ов)"
        self.save_report(role="bot", report=report_text)

