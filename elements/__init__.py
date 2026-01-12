from typing import Dict, Type

from .audio import Audio
from .dialog import Dialog
from .element import Element
from .input import Input
from .message import Message
from .multichoice import MultiChoice
from .question import Question
from .quiz import Quiz
from .miniapp import Miniapp
from .test import Test
from .jump import Jump
from .revision import Revision
from .delay import Delay
from .end import End

element_registry: Dict[str, Type[Element]] = {
    "message": Message,
    "audio": Audio,
    "input": Input,
    "quiz": Quiz,
    "question": Question,
    "multi_choice": MultiChoice,
    "dialog": Dialog,
    "miniapp": Miniapp,
    "test": Test,
    "jump": Jump,
    "revision": Revision,
    "delay": Delay,
    "end": End
}
