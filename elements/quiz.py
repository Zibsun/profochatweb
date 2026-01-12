from .element import Element, _shorten_text

from utils import get_direct_download_link

class Quiz(Element):
    """
    Sample:
    type: quiz
    text: Important
    answers:
      - text: Essential
        correct: yes
        feedback: Awesome job!
      - text: Viral
        feedback: Almost there, let's try again!
    """
    def __init__(self, id: int, course_id: str, data: str) -> None:
        super().__init__(id, course_id, data)

        self.answers = data["element_data"]["answers"]
        self.text = data["element_data"]["text"]
        quiz_options = []
        quiz_replies = []
        i = 0
        for answer in self.answers:
            quiz_options.append (answer["text"])
            quiz_replies.append (answer.get("feedback"))
            if "correct" in answer:
                correct_option_id = i
            i += 1
        self.options = quiz_options
        self.correct_option_id = correct_option_id
        self.quiz_feedback = quiz_replies
        if "media" in data["element_data"]:
            print (f'data["element_data"]={data["element_data"]}')
            self.media = [get_direct_download_link(url) for url in data["element_data"]["media"]]
        else:
            self.media = None

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report (role = "bot", report = self.text)

    def set_quiz_answer_id(self, quiz_answer_id):
        self.quiz_answer_id = quiz_answer_id

    def save_quiz_reply(self):
        """Save quiz reply to database (replaces send_quiz_reply method for web)"""
        self.quiz_feedback = self.quiz_feedback[self.quiz_answer_id]
        self.save_report(role="user", report = self.answers[self.quiz_answer_id]['text'])
        
        if self.quiz_answer_id == self.correct_option_id:
            score = 1
        else:
            score = 0
        if self.quiz_feedback:
            self.save_report(role="bot", report = self.quiz_feedback, score = score, maxscore = 1)
