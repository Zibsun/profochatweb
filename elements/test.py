from .element import Element

import db

import logging

def replace_to_number(text, variable, score):
    if score == int(score):
        score = int(score)
    return text.replace(variable, str(score))

class Test(Element):
    """
    Sample for 7 quizzes which ids started with "q_":
    type: test
    prefix: q_
    text: |
        *Ваша готовность к внедрению ИИ: {score} из {maxscore}.*
    score:
        20: Вы готовы запускать!
        65: У вас есть база, но стоит доработать детали.
        100: Притормозите запуск. Подготовка сейчас сэкономит время и деньги.
    button: OK
    """
    def __init__(self, id, course_id, data):
        super().__init__(id, course_id, data)

        self.text = data["element_data"].get("text")
        self.id = id
        self.prefix = data["element_data"].get("prefix")
        self.button = data["element_data"].get("button")

        if not self.button:
            self.wait_for_callback = False
        self.score = data["element_data"].get("score")

    def save(self):
        """Save element to database (replaces send method for web)"""
        score, maxscore = db.get_total_score(self.run_id, self.prefix)

        if not score:
            score = 0
            logging.info(f"Score = None for {self.id}, set it to 0")
        if not maxscore:
            maxscore = 1
            logging.info(f"maxscore = None for {self.id}, set it to 1")

        mistake_rate = (maxscore-score)/maxscore*100

        message = replace_to_number(self.text, "{score}", score)
        message = replace_to_number(message, "{maxscore}", maxscore) + "\n"

        self.score = dict(sorted(self.score.items()))

        for key, val in self.score.items():
            # print(f"key={key}, mistake_rate={mistake_rate}")
            if mistake_rate <= float(key):
                message += val
                break

        self.save_report(role = "bot", report = message, score = score, maxscore = maxscore)
