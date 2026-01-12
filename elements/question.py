from .element import Element, _shorten_text

class Question(Element):
    """
    Sample:
    type: question
    text: |
        Пожалуйста, оцени курс: насколько полезны для тебя оказались пройденные уроки?
    answers:
    - text: 5+ Супер!
        feedback: Ого, я польщен твоей оценкой! 🥰 Надеюсь, оправдаю твое доверие и в следующих уроках.
    - text: 5 Отлично
    - text: 4 Хорошо
    - text: 3 Так себе
        feedback: Нда, это печально, но поверь, самое интересное еще впереди! 😉
    - text: 2 Плохо
        feedback: Мне очень жаль, но дай мне еще один шанс! 🙏
    """

    def __init__(self, id: int, course_id: str, data: str) -> None:
        super().__init__(id, course_id, data)

        self.answers = data["element_data"]["answers"]
        self.text = data["element_data"]["text"]
        quiz_options = []
        for answer in self.answers:
            quiz_options.append (answer["text"])
        self.options = quiz_options

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)

    def set_quiz_answer_id(self, quiz_answer_id):
        self.quiz_answer_id = quiz_answer_id

    def save_quiz_reply(self):
        """Save quiz reply to database (replaces send_quiz_reply method for web)"""
        self.save_report(role = "user", report = self.answers[self.quiz_answer_id]['text'])
        feedback = self.answers[self.quiz_answer_id].get("feedback")
        if feedback:
            self.save_report(role = "bot", report = feedback)
