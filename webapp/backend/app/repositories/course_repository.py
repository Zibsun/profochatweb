"""
Репозиторий для работы с курсами и элементами через SQLAlchemy
Заменяет функции из db.py
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.sql import case
from typing import Optional, List, Dict, Tuple, Any
import json
import os
from datetime import datetime

from app.models.run import Run
from app.models.conversation import Conversation
from app.models.waiting_element import WaitingElement
from app.models.course_db import CourseDB
from app.models.course_element_db import CourseElementDB
from app.models.banned_participant import BannedParticipant
from app.models.course_participant import CourseParticipant

from sqlalchemy import desc

BOT_NAME = os.environ.get('BOT_NAME', 'web_bot')


class CourseRepository:
    """Репозиторий для работы с курсами и элементами"""
    
    def __init__(self, db: Session):
        self.db = db
        self.bot_name = BOT_NAME
    
    # ========== Run (сессии прохождения курсов) ==========
    
    def create_run(self, course_id: str, username: Optional[str], chat_id: int, 
                   utm_source: Optional[str] = None, utm_campaign: Optional[str] = None) -> int:
        """Создание новой сессии прохождения курса"""
        run = Run(
            course_id=course_id,
            username=username,
            chat_id=chat_id,
            botname=self.bot_name,
            utm_source=utm_source,
            utm_campaign=utm_campaign
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run.run_id
    
    def get_run_id(self, chat_id: int, course_id: str) -> Optional[int]:
        """Получение ID сессии по chat_id и course_id"""
        run = self.db.query(Run).filter(
            and_(
                Run.chat_id == chat_id,
                Run.course_id == course_id,
                Run.botname == self.bot_name
            )
        ).order_by(desc(Run.date_inserted)).first()
        return run.run_id if run else None
    
    def set_course_ended(self, chat_id: int, course_id: Optional[str] = None) -> None:
        """Отметка курса как завершенного"""
        query = self.db.query(Run).filter(
            and_(
                Run.chat_id == chat_id,
                Run.botname == self.bot_name
            )
        )
        if course_id:
            query = query.filter(Run.course_id == course_id)
        
        query.update({Run.is_ended: True})
        self.db.commit()
    
    def is_course_ended(self, chat_id: int, course_id: Optional[str] = None) -> bool:
        """Проверка завершения курса"""
        query = self.db.query(Run).filter(
            and_(
                Run.chat_id == chat_id,
                Run.botname == self.bot_name
            )
        )
        if course_id:
            query = query.filter(Run.course_id == course_id)
        
        run = query.order_by(desc(Run.date_inserted)).first()
        return run.is_ended if run and run.is_ended else False
    
    def get_username_by_chat_id(self, chat_id: int) -> Optional[str]:
        """Получение username по chat_id"""
        run = self.db.query(Run).filter(
            and_(
                Run.chat_id == chat_id,
                Run.botname == self.bot_name
            )
        ).order_by(desc(Run.date_inserted)).first()
        return run.username if run else None
    
    # ========== Conversation (история взаимодействий) ==========
    
    def insert_element(self, chat_id: int, course_id: str, username: Optional[str],
                      element_id: str, element_type: str, run_id: int,
                      json_data: Dict[str, Any], role: str, report: Optional[str],
                      score: Optional[float] = None, maxscore: Optional[float] = None) -> int:
        """Сохранение элемента в историю"""
        json_string = json.dumps(json_data, ensure_ascii=False)
        
        conversation = Conversation(
            chat_id=chat_id,
            course_id=course_id,
            username=username or "--empty--",
            element_id=element_id,
            element_type=element_type,
            run_id=run_id,
            json=json_string,
            role=role,
            report=report,
            score=score,
            maxscore=maxscore
        )
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation.conversation_id
    
    def get_current_element(self, chat_id: int) -> Optional[Tuple[int, str, str, str, int, Dict[str, Any]]]:
        """Получение текущего элемента пользователя"""
        # botname берется из связанной таблицы run
        conv = self.db.query(Conversation).join(Run).filter(
            and_(
                Conversation.chat_id == chat_id,
                Run.botname == self.bot_name
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return None
        
        element_data = json.loads(conv.json) if conv.json else {}
        return (
            conv.conversation_id,
            conv.element_id,
            conv.element_type,
            conv.course_id,
            conv.run_id,
            element_data
        )
    
    def get_current_element_id(self, chat_id: int) -> Optional[str]:
        """Получение ID текущего элемента"""
        conv = self.db.query(Conversation).filter(
            Conversation.chat_id == chat_id
        ).order_by(desc(Conversation.date_inserted)).first()
        return conv.element_id if conv else None
    
    def get_current_element_ids(self, chat_id: int) -> Optional[Tuple[str, str, int]]:
        """Получение ID текущего элемента, курса и сессии"""
        conv = self.db.query(Conversation).filter(
            Conversation.chat_id == chat_id
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return None
        
        return (conv.element_id, conv.course_id, conv.run_id)
    
    def get_last_element_of(self, chat_id: int, element_id: str) -> Optional[Tuple[int, str, str, str, int, Dict[str, Any]]]:
        """Получение последнего вхождения конкретного элемента (возвращает кортеж как в db.py)"""
        conv = self.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.element_id == element_id
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return None
        
        element_data = json.loads(conv.json) if conv.json else {}
        return (
            conv.conversation_id,
            conv.element_id,
            conv.element_type,
            conv.course_id,
            conv.run_id,
            element_data
        )
    
    def get_element_type_count(self, element_type: str, run_id: int) -> int:
        """Подсчет элементов определенного типа в сессии"""
        count = self.db.query(func.count(Conversation.conversation_id)).filter(
            and_(
                Conversation.element_type == element_type,
                Conversation.run_id == run_id
            )
        ).scalar()
        return count or 0
    
    def get_revision_mistakes(self, run_id: int, prefix: str) -> List[Dict[str, Any]]:
        """Получение ошибок для повторения"""
        convs = self.db.query(Conversation).filter(
            and_(
                Conversation.run_id == run_id,
                Conversation.element_id.like(f"{prefix}%"),
                Conversation.score != 1.0
            )
        ).all()
        
        result = []
        for conv in convs:
            element_data = json.loads(conv.json) if conv.json else {}
            result.append({conv.element_id: element_data})
        
        return result
    
    def get_revision_elements(self, run_id: int, prefix: str, limit: int = 2) -> List[Dict[str, Any]]:
        """Получение элементов для повторения (правильные ответы, случайный порядок)"""
        # В оригинале используется ORDER BY RANDOM(), но SQLAlchemy не поддерживает это напрямую
        # Используем Python random для перемешивания
        import random
        convs = self.db.query(Conversation).filter(
            and_(
                Conversation.run_id == run_id,
                Conversation.element_id.like(f"{prefix}%"),
                Conversation.score == 1.0  # Правильные ответы
            )
        ).all()
        
        # Перемешиваем и берем limit элементов
        random.shuffle(convs)
        convs = convs[:limit]
        
        result = []
        for conv in convs:
            element_data = json.loads(conv.json) if conv.json else {}
            result.append({conv.element_id: element_data})
        
        return result
    
    def get_total_score(self, run_id: int, prefix: str) -> Tuple[float, float]:
        """Подсчет общего балла"""
        result = self.db.query(
            func.sum(Conversation.score).label('total_score'),
            func.sum(Conversation.maxscore).label('max_score')
        ).filter(
            and_(
                Conversation.run_id == run_id,
                Conversation.element_id.like(f"{prefix}%")
            )
        ).first()
        
        total_score = float(result.total_score) if result.total_score else 0.0
        max_score = float(result.max_score) if result.max_score else 0.0
        return (total_score, max_score)
    
    # ========== Waiting Element (отложенные элементы) ==========
    
    def add_waiting_element(self, chat_id: int, waiting_till_date: Optional[datetime] = None,
                           is_waiting: bool = True, element_id: Optional[str] = None,
                           course_id: Optional[str] = None) -> int:
        """Добавление элемента в очередь ожидания"""
        waiting = WaitingElement(
            chat_id=chat_id,
            waiting_till_date=waiting_till_date or datetime.now(),
            is_waiting=is_waiting,
            element_id=element_id,
            course_id=course_id,
            botname=self.bot_name
        )
        self.db.add(waiting)
        self.db.commit()
        self.db.refresh(waiting)
        return waiting.waiting_element_id
    
    def get_active_waiting_elements(self) -> List[Tuple[int, int, Optional[str], Optional[str]]]:
        """Получение активных отложенных элементов"""
        now = datetime.now()
        waitings = self.db.query(WaitingElement).filter(
            and_(
                WaitingElement.is_waiting == True,
                WaitingElement.waiting_till_date <= now,
                WaitingElement.botname == self.bot_name
            )
        ).all()
        
        return [(w.waiting_element_id, w.chat_id, w.element_id, w.course_id) for w in waitings]
    
    def set_is_waiting_false(self, waiting_element_id: int) -> None:
        """Деактивация элемента ожидания"""
        waiting = self.db.query(WaitingElement).filter(
            WaitingElement.waiting_element_id == waiting_element_id
        ).first()
        
        if waiting:
            waiting.is_waiting = False
            self.db.commit()
    
    # ========== Course DB (метаданные курсов) ==========
    
    def get_courses(self) -> Dict[str, Dict[str, Any]]:
        """Получение списка курсов из БД"""
        courses = self.db.query(CourseDB).filter(
            CourseDB.bot_name == self.bot_name
        ).all()
        
        result = {}
        for course in courses:
            result[course.course_id] = {"path": "db"}
        return result
    
    def get_course_info(self, course_id: str) -> Optional[Dict[str, Any]]:
        """Получение информации о курсе (возвращает словарь с ключами creator_id, date_created, yaml)"""
        course = self.db.query(CourseDB).filter(
            and_(
                CourseDB.course_id == course_id,
                CourseDB.bot_name == self.bot_name
            )
        ).first()
        
        if not course:
            return None
        
        return {
            "creator_id": course.creator_id,
            "date_created": course.date_created,
            "yaml": course.yaml
        }
    
    def get_course_as_json(self, course_id: str) -> Dict[str, Any]:
        """Получение курса в формате JSON (словарь element_id -> element_data)"""
        elements = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == self.bot_name
            )
        ).order_by(CourseElementDB.id).all()
        
        result = {}
        for elem in elements:
            json_data = json.loads(elem.json) if elem.json else {}
            element_data = json_data.get("element_data", {})
            result[elem.element_id] = element_data
        
        return result
    
    def add_replace_course(self, course_id: str, course_data: Optional[Dict[str, Any]] = None,
                          bot_name: Optional[str] = None, creator_id: Optional[str] = None,
                          course_script: Optional[str] = None) -> None:
        """Добавление или замена курса"""
        import yaml
        
        bot_name = bot_name or self.bot_name
        
        # Если course_data не передан, загружаем из course_script
        if course_data is None and course_script:
            course_data = yaml.safe_load(course_script)
        
        if not course_data:
            raise ValueError("Either course_data or course_script must be provided")
        
        # Удаляем старые элементы курса
        self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == bot_name
            )
        ).delete()
        
        # Удаляем старые метаданные курса
        self.db.query(CourseDB).filter(
            and_(
                CourseDB.course_id == course_id,
                CourseDB.bot_name == bot_name
            )
        ).delete()
        
        # Добавляем метаданные курса
        course_db = CourseDB(
            course_id=course_id,
            bot_name=bot_name,
            creator_id=creator_id,
            yaml=course_script
        )
        self.db.add(course_db)
        
        # Добавляем элементы курса
        for element_id, element_data in course_data.items():
            element_type = element_data.get("type", "message")
            
            # Формируем JSON строку
            if course_script is None:
                # Из Google Sheets - стандартная сериализация
                json_string = json.dumps({"element_data": element_data})
            else:
                # Из generator/editor - с ensure_ascii=False для кириллицы
                json_string = json.dumps({"element_data": element_data}, ensure_ascii=False)
            
            course_element = CourseElementDB(
                bot_name=bot_name,
                course_id=course_id,
                element_id=element_id,
                json=json_string,
                element_type=element_type
            )
            self.db.add(course_element)
        
        self.db.commit()
    
    def insert_course_element(self, course_id: str, element_id: str, json_data: Dict[str, Any],
                              element_type: str, bot_name: Optional[str] = None) -> Optional[int]:
        """Добавление элемента курса"""
        bot_name = bot_name or self.bot_name
        json_string = json.dumps(json_data, ensure_ascii=False)
        
        course_element = CourseElementDB(
            bot_name=bot_name,
            course_id=course_id,
            element_id=element_id,
            json=json_string,
            element_type=element_type
        )
        self.db.add(course_element)
        self.db.commit()
        self.db.refresh(course_element)
        return course_element.id
    
    def get_element_from_course_by_id(self, course_id: str, element_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Получение элемента курса по ID (возвращает (element_id, json_data))"""
        element = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.element_id == element_id,
                CourseElementDB.bot_name == self.bot_name
            )
        ).first()
        
        if not element:
            return None
        
        element_data = json.loads(element.json) if element.json else {}
        return (element.element_id, element_data)
    
    def get_first_element_from_course(self, course_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Получение первого элемента курса (возвращает (element_id, json_data))"""
        element = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == self.bot_name
            )
        ).order_by(CourseElementDB.id).first()
        
        if not element:
            return None
        
        element_data = json.loads(element.json) if element.json else {}
        return (element.element_id, element_data)
    
    def get_next_course_element_by_id(self, course_id: str, element_id: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Получение следующего элемента курса"""
        # Находим текущий элемент
        current = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.element_id == element_id,
                CourseElementDB.bot_name == self.bot_name
            )
        ).first()
        
        if not current:
            return None
        
        # Находим следующий элемент
        next_element = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == self.bot_name,
                CourseElementDB.id > current.id
            )
        ).order_by(CourseElementDB.id).first()
        
        if not next_element:
            return None
        
        element_data = json.loads(next_element.json) if next_element.json else {}
        return (next_element.element_id, element_data)
    
    def get_other_module_course_element_id(self, course_id: str, element_id: str,
                                          module: str, shift: int) -> Optional[str]:
        """Получение ID элемента из другого модуля (для навигации вперед/назад)"""
        # TODO: поддержка shift == -1 (назад) пока не реализована
        if shift != 1:
            return None
        
        # Находим максимальный course_element_id для текущего модуля
        from sqlalchemy import func as sql_func, case
        
        # Получаем все элементы текущего модуля
        module_elements = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == self.bot_name,
                CourseElementDB.element_id.like(f"{module}_%")
            )
        ).all()
        
        if not module_elements:
            return None
        
        # Находим максимальный ID среди элементов модуля
        max_id = max(elem.id for elem in module_elements)
        
        # Находим следующий элемент после максимального ID текущего модуля
        next_element = self.db.query(CourseElementDB).filter(
            and_(
                CourseElementDB.course_id == course_id,
                CourseElementDB.bot_name == self.bot_name,
                CourseElementDB.id > max_id
            )
        ).order_by(CourseElementDB.id).first()
        
        return next_element.element_id if next_element else None
    
    # ========== Banned Participants ==========
    
    def ban_users(self, ban_limit: int, ban_reason: str, exclude_users: List[int]) -> int:
        """Автоматическая блокировка пользователей"""
        # Подсчитываем сообщения типа *_chat* для каждого пользователя
        # botname берется из связанной таблицы run
        subquery = self.db.query(
            Conversation.chat_id,
            func.count(Conversation.conversation_id).label('chat_count')
        ).join(Run).filter(
            and_(
                Conversation.element_type.like('%_chat%'),
                Conversation.role == 'user',
                Run.botname == self.bot_name,
                ~Conversation.chat_id.in_(exclude_users)
            )
        ).group_by(Conversation.chat_id).having(
            func.count(Conversation.conversation_id) > ban_limit
        ).subquery()
        
        # Получаем пользователей для блокировки (исключаем уже заблокированных)
        already_banned = self.db.query(BannedParticipant.chat_id).filter(
            BannedParticipant.botname == self.bot_name
        ).subquery()
        
        chat_ids_to_ban = self.db.query(subquery.c.chat_id).filter(
            ~subquery.c.chat_id.in_(self.db.query(already_banned.c.chat_id))
        ).all()
        
        # Добавляем в bannedparticipants
        ban_count = 0
        for (chat_id,) in chat_ids_to_ban:
            banned = BannedParticipant(
                botname=self.bot_name,
                chat_id=chat_id,
                ban_reason=ban_reason
            )
            self.db.merge(banned)  # Используем merge для избежания дубликатов
            ban_count += 1
        
        self.db.commit()
        return ban_count
    
    def check_user_banned(self, chat_id: int) -> bool:
        """Проверка блокировки пользователя (возвращает True если заблокирован)"""
        banned = self.db.query(BannedParticipant).filter(
            and_(
                BannedParticipant.chat_id == chat_id,
                BannedParticipant.botname == self.bot_name,
                BannedParticipant.excluded != 1
            )
        ).first()
        
        return banned is not None
    
    # ========== Course Participants ==========
    
    def check_user_in_course(self, course_id: str, username: str) -> bool:
        """Проверка доступа пользователя к курсу"""
        participant = self.db.query(CourseParticipant).filter(
            and_(
                CourseParticipant.course_id == course_id,
                CourseParticipant.username == username,
                CourseParticipant.botname == self.bot_name
            )
        ).first()
        
        return participant is not None
    
    def delete_course(self, course_id: str, bot_name: Optional[str] = None, table_name: Optional[str] = None) -> int:
        """Удаление курса (возвращает количество удаленных записей)"""
        bot_name = bot_name or self.bot_name
        count = 0
        
        if table_name == "course_element" or table_name is None:
            # Удаляем элементы курса
            deleted = self.db.query(CourseElementDB).filter(
                and_(
                    CourseElementDB.course_id == course_id,
                    CourseElementDB.bot_name == bot_name
                )
            ).delete()
            count += deleted
        
        if table_name == "course" or table_name is None:
            # Удаляем метаданные курса
            deleted = self.db.query(CourseDB).filter(
                and_(
                    CourseDB.course_id == course_id,
                    CourseDB.bot_name == bot_name
                )
            ).delete()
            count += deleted
        
        self.db.commit()
        return count
    
    def get_creators(self) -> List[int]:
        """Получение списка создателей курсов из gen_settings"""
        # Эта функция работает с таблицей gen_settings, которой нет в моделях
        # Возвращаем пустой список, так как эта функциональность не используется в веб-приложении
        # Если понадобится, нужно будет добавить модель GenSettings
        return []
    
    # ========== Дополнительные методы для сложных запросов ==========
    
    def get_revision_conversation(self, chat_id: int, course_id: str, run_id: int) -> Optional[Tuple[str, str, str, str, int]]:
        """Получение последней записи с revision данными"""
        conv = self.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.course_id == course_id,
                Conversation.run_id == run_id,
                Conversation.role == 'bot',
                Conversation.json.like('%"revision"%')
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return None
        
        return (
            conv.element_id,
            conv.element_type,
            conv.json,
            conv.report,
            conv.conversation_id
        )
    
    def update_conversation_json(self, conversation_id: int, json_data: Dict[str, Any]) -> None:
        """Обновление JSON данных в conversation"""
        conv = self.db.query(Conversation).filter(
            Conversation.conversation_id == conversation_id
        ).first()
        
        if conv:
            conv.json = json.dumps(json_data, ensure_ascii=False)
            self.db.commit()
    
    def get_conversation_by_id(self, conversation_id: int) -> Optional[Dict[str, Any]]:
        """Получение conversation по ID для проверки"""
        conv = self.db.query(Conversation).filter(
            Conversation.conversation_id == conversation_id
        ).first()
        
        if not conv:
            return None
        
        return {
            "conversation_id": conv.conversation_id,
            "json": conv.json,
            "score": conv.score,
            "maxscore": conv.maxscore,
            "role": conv.role
        }
    
    def update_conversation_report(self, chat_id: int, course_id: str, run_id: int, 
                                   element_id: str, report: str) -> None:
        """Обновление report в последнем bot элементе"""
        conv = self.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.course_id == course_id,
                Conversation.run_id == run_id,
                Conversation.element_id == element_id,
                Conversation.role == 'bot'
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if conv:
            conv.report = report
            self.db.commit()
    
    def get_user_responses_for_elements(self, chat_id: int, course_id: str, run_id: int,
                                       elements_with_prefix: List[Tuple[str, str, Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Получение ответов пользователя для элементов (для test элементов)"""
        results = []
        
        for element_id, element_type, element_data in elements_with_prefix:
            # Ищем последний ответ пользователя для этого элемента
            conv = self.db.query(Conversation).filter(
                and_(
                    Conversation.chat_id == chat_id,
                    Conversation.course_id == course_id,
                    Conversation.run_id == run_id,
                    Conversation.element_id == element_id,
                    Conversation.role == 'user',
                    or_(
                        and_(Conversation.score.isnot(None), Conversation.maxscore.isnot(None)),
                        and_(Conversation.json.isnot(None), Conversation.json != '{}', Conversation.json != 'null')
                    )
                )
            ).order_by(
                # Приоритет: записи с score и maxscore не NULL, затем записи с непустым JSON
                desc(Conversation.score.isnot(None)),
                desc(Conversation.date_inserted)
            ).first()
            
            if conv:
                json_str = conv.json if conv.json else None
                db_score = conv.score
                db_maxscore = conv.maxscore
                
                results.append({
                    "element_id": element_id,
                    "json": json_str,
                    "score": db_score,
                    "maxscore": db_maxscore,
                    "conversation_id": conv.conversation_id
                })
        
        return results
    
    def get_test_scores(self, chat_id: int, course_id: str, run_id: int,
                       elements_with_prefix: List[Tuple[str, str, Dict[str, Any]]]) -> Tuple[float, float]:
        """Подсчет баллов для test элементов"""
        total_score = 0.0
        total_max_score = 0.0
        
        for element_id, element_type, element_data in elements_with_prefix:
            conv = self.db.query(Conversation).filter(
                and_(
                    Conversation.chat_id == chat_id,
                    Conversation.course_id == course_id,
                    Conversation.run_id == run_id,
                    Conversation.element_id == element_id,
                    Conversation.role == 'user',
                    or_(
                        and_(Conversation.score.isnot(None), Conversation.maxscore.isnot(None)),
                        and_(Conversation.json.isnot(None), Conversation.json != '{}', Conversation.json != 'null')
                    )
                )
            ).order_by(
                desc(Conversation.score.isnot(None)),
                desc(Conversation.date_inserted)
            ).first()
            
            if conv:
                if conv.score is not None and conv.maxscore is not None:
                    total_score += float(conv.score)
                    total_max_score += float(conv.maxscore)
                elif conv.json:
                    try:
                        json_data = json.loads(conv.json)
                        if isinstance(json_data, dict):
                            score = json_data.get("score")
                            maxscore = json_data.get("maxscore")
                            if score is not None and maxscore is not None:
                                total_score += float(score)
                                total_max_score += float(maxscore)
                    except (json.JSONDecodeError, ValueError):
                        pass
        
        return (total_score, total_max_score)
    
    def get_dialog_conversation(self, chat_id: int, course_id: str, run_id: int, element_id: str) -> Optional[Dict[str, Any]]:
        """Получение dialog элемента из conversation"""
        conv = self.db.query(Conversation).filter(
            and_(
                Conversation.chat_id == chat_id,
                Conversation.course_id == course_id,
                Conversation.run_id == run_id,
                Conversation.element_id == element_id,
                Conversation.role == 'bot'
            )
        ).order_by(desc(Conversation.date_inserted)).first()
        
        if not conv:
            return None
        
        element_data = json.loads(conv.json) if conv.json else {}
        return {
            "conversation_id": conv.conversation_id,
            "element_data": element_data.get("element_data", {}),
            "json": conv.json
        }
    
    def update_dialog_conversation(self, conversation_id: int, conversation_history: List[Dict[str, str]]) -> None:
        """Обновление истории диалога в conversation"""
        conv = self.db.query(Conversation).filter(
            Conversation.conversation_id == conversation_id
        ).first()
        
        if conv:
            element_data = json.loads(conv.json) if conv.json else {}
            element_data["element_data"]["conversation"] = conversation_history
            conv.json = json.dumps(element_data, ensure_ascii=False)
            self.db.commit()
