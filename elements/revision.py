from .element import Element

import db

class Revision(Element):
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)
        self.text = data["element_data"]["text"]
        self.prefix = data["element_data"].get("prefix")
        self.button = data["element_data"].get("button")
        self.no_mistakes = data["element_data"].get("no_mistakes")



    def save(self):
        """Save element to database (replaces send method for web)"""
        revision_mistakes = db.get_revision_mistakes(self.run_id, self.prefix)

        if len(revision_mistakes)>0:
            revision_elements = db.get_revision_elements(self.run_id, self.prefix)

            self.data['revision'] = {"revision_element": self.data['element_data'], 'data': revision_mistakes + revision_elements}
            message = self.text
        else:
            message = self.no_mistakes

        self.save_report(role = "bot", report = message)
