from .element import Element
import re

class Input(Element):
    """
    Sample:
        type: input
        text: |
            Кто президент США?
        correct_answer: Байден (Opional)
        feedback_correct: Правильно (Opional)
        feedback_incorrect: Неправильно (Opional)
        input_type: text (Optional, default: text) - "text" или "sequence"
    """
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)

        self.text = data["element_data"]["text"]
        self.id = id

        self.correct_answer = data["element_data"].get("correct_answer")
        self.feedback_correct = data["element_data"].get("feedback_correct")
        self.feedback_incorrect = data["element_data"].get("feedback_incorrect")
        
        # Новый параметр для типа нормализации ввода
        self.input_type = data["element_data"].get("input_type", "text")  # "text" или "sequence"

    def _normalize_sequence(self, text):
        """
        Нормализует последовательность цифр, убирая все разделители.
        Примеры:
        "1,2,3,6,8" -> "12368"
        "1 2 3 6 8" -> "12368"
        "1, 2, 3, 6, 8" -> "12368"
        """
        # Убираем все нецифровые символы
        return re.sub(r'\D', '', text)

    def _compare_answers(self, user_answer, correct_answer):
        """
        Сравнивает ответы в зависимости от типа ввода.
        Для типа "sequence" нормализует последовательности цифр перед сравнением.
        """
        if self.input_type == "sequence":
            # Нормализуем обе последовательности (убираем все разделители)
            user_normalized = self._normalize_sequence(user_answer)
            correct_normalized = self._normalize_sequence(correct_answer)
            return user_normalized == correct_normalized
        else:
            # Стандартное сравнение для текста (регистронезависимое)
            return user_answer.strip().lower() == correct_answer.strip().lower()

    def set_message(self, message):
        self.user_answer = message
        self.save_report(role = "user", report=message)

    def save_reply(self):
        """Save reply to database (replaces send_reply method for web)"""
        if self.correct_answer:
            if self._compare_answers(self.user_answer, self.correct_answer):
                if self.feedback_correct:
                    self.save_report(role = "bot", report = self.feedback_correct, score = 1, maxscore = 1)
            else:
                if self.feedback_incorrect:
                    self.save_report(role = "bot", report = self.feedback_incorrect, score = 0, maxscore = 1)

    def save(self):
        """Save element to database (replaces send method for web)"""
        self.save_report(role = "bot", report = self.text)
