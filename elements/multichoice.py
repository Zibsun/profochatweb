from .element import Element, _shorten_text

class MultiChoice(Element):
    """
    Sample:
    type: multi_choice
    text: Выбери те критерии INVEST, которым она соответствует.
    feedback_correct: >
        Итог: отлично, все абсолютно верно!
    feedback_partial:  >
        Итог: почти верно, но есть одна неточность. Стоит вникнуть в ответы еще разок.
    feedback_incorrect:  >
        Эх, эту тему ты пока не знаешь. Но я верю, что разберешься!
    answers:
      - text: Независимая (Independent)
        correct: no
        feedback: >
            Нет, эта история не является независимой, так как утверждение "интуитивно понятное" может затрагивать разные аспекты приложения, требующие выполнения других историй.
      - text: Обсуждаемая (Negotiable)
        correct: yes
        feedback: >
            Да! История обсуждаемая, так как "интуитивно понятное" приложение можно обсуждать и уточнять с командой разработки и заинтересованными сторонами.
      - text: Оцениваемая (Estimable)
        correct: no
        feedback: >
            Нет, история не оцениваемая, так как трудно определить, что именно значит "интуитивно понятное", и какие конкретные шаги потребуются для его достижения.
      - text: Тестируемая (Testable)
        correct: yes
        feedback: >
            Да! История тестируемая, так как можно провести тесты с пользователями для определения, является ли приложение интуитивно понятным.
    """
    def __init__(self, id: int, course_id:str, data: str) -> None:
        super().__init__(id, course_id, data)
        self.text = data["element_data"]["text"]
        self.answers = data["element_data"]["answers"]
        self.feedback_correct = data["element_data"]["feedback_correct"]
        self.feedback_partial = data["element_data"]["feedback_partial"]
        self.feedback_incorrect = data["element_data"]["feedback_incorrect"]

        quiz_options = []
        quiz_feedbacks = []
        correct_options = []
        i = 0
        for answer in self.answers:
            quiz_options.append (answer["text"])
            if "feedback" in answer:
                quiz_feedbacks.append (answer["feedback"])
            if answer.get("correct"):
                correct_options.append(i)
            i += 1
        self.options = quiz_options
        self.correct_options = correct_options
        self.quiz_feedbacks = quiz_feedbacks


    def set_multi_answer_ids(self, option_ids):
        self.answer_ids = option_ids

    def save_multi_reply(self):
        """Save multi-choice reply to database (replaces send_milti_reply method for web)"""
        feedback = self._get_feedback()
        self.save_report(role = "bot", report = feedback)

        reply = self._get_reply()
        self.save_report(role = "bot", report=reply, score = self.score, maxscore = 1)


    def _get_feedback(self):
        feedback = ""
        for i in self.answer_ids:
            if self.answers[i].get("correct"):
                emoji = "✅"
            else:
                emoji = "🚫"
            feedback += f"{emoji} {self.answers[i]['text']}\n"
            if "feedback" in self.answers[i]:
                feedback += f"   👉 {self.answers[i]['feedback']}\n"
        return feedback

    def _get_reply(self):
        correct_answers = 0
        total = len(self.answers)
        reply = ""

        for i in range(0, total):
            if i in self.correct_options and i in self.answer_ids:
                correct_answers += 1
            if (i not in self.correct_options) and (i not in self.answer_ids):
                correct_answers += 1
        if correct_answers == total:
            reply = self.feedback_correct
            self.score = 1
        elif correct_answers == 0:
            reply = self.feedback_incorrect
            self.score = 0
        else:
            reply = self.feedback_partial
            self.score = 0.5
        return reply

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)
