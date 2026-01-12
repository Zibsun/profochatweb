import yaml
import db
from elements import element_registry
from elements.element import _get_stack_part
import logging
import os

COURSES_FILE = "courses.yml"
DEFAULT_ID = "default"
EXT_ID = "ext_courses"

def load_courses():
    """
    Returns courses (course_id: path, optional element and maybe settings) from courses.yml. 
    Settings:
        ban_enabled: yes
        ban_text: "⚠️ Извини, но мы уже исчерпали лимит общения, и наш бюджет на использование ИИ превышен. Теперь, без ИИ, я не смогу тебе помогать 😢\n\nЕсли считаешь, что это ошибка, пожалуйста, напиши организаторам курса на ..."
        restricted: yes
        decline_text: "Хочешь присоединиться к курсу? Регистрируйся! ..."
    To support adding courses dynamically (db), if EXT_ID exists in courses.yml, it adds extra courses from db
      (ext_courses: path: db). All such courses have path: db and no settings (if needed, add them to course table).
    Can also add courses from another file from the same folder (ext_courses: path: file.yml).
    Note: even DEFAULT_ID course can be overriden this way.
    """
    BOT_FOLDER = os.environ.get('BOT_FOLDER', '')
    folder = f"scripts/{BOT_FOLDER}"
    with open(folder + COURSES_FILE, 'r') as file:
        try:
            courses = yaml.safe_load(file)
            if EXT_ID in courses:
                ext_file = courses[EXT_ID].get("path")
                if ext_file == "db":
                    ext = db.get_courses()
                else: # can throw io and missing path exceptions (uncaught)
                    with open(folder + ext_file, 'r') as ext_file:
                        ext = yaml.safe_load(ext_file)
                del courses[EXT_ID]
                courses.update(ext) # Overrides if the same key existed in courses
            return courses
        except yaml.YAMLError as e:
            logging.error(f"Error reading {folder + COURSES_FILE}: {e}")
            return None

class Course:
    def __init__(self, command):
        command = self.extract_params(command)
        self.course_id = command if command else DEFAULT_ID
        self.not_found = False
        courses = load_courses()
        if self.course_id:
            if self.course_id in courses:
                # Course found
                cdata = courses.get(self.course_id)
                self.course_path = cdata.get("path")
                if self.course_path != "db" and not self.course_path.startswith("scripts/"):
                    BOT_FOLDER = os.environ.get('BOT_FOLDER', '')
                    folder = f"scripts/{BOT_FOLDER}"
                    self.course_path = folder + self.course_path
                    
                self.course_element = cdata.get("element") # element to start from
                self.restricted = cdata.get("restricted") # if yes, main.init_course checks on course start; db checks in courseparticipants for the course_id
                self.decline_text = cdata.get("decline_text")
                self.ban_enabled = cdata.get("ban_enabled") # if yes, get_user_banned_text may return ban_text; db checks in bannedparticipants for the botname
                self.ban_text = cdata.get("ban_text")
            else:
                self.not_found = True
                # logging.error(f"Course not found with command={command}") logged later

    def extract_params(self, command):
        self.params = {} # utms, utmc, etc.
        if not command:
            return None
        # Allowed characters in start parameter are: a-z, A-Z, 0-9, _, - (no = or & or | allowed)
        # So, the format is start=course_id__utmsIItg__utmcIItg-aidea-blog-oy1
        if '__' in command:
            parts = command.split('__')
            if 'utm' in parts[0]:
                command = ""
                index1 = 0
            else:
                command = parts[0]
                index1 = 1
            for param in parts[index1:]:
                if 'II' in param:
                    key, value = param.split('II')
                    self.params[key] = value
        return command

    def set_user(self, chat_id, username):
        self.chat_id = chat_id
        self.username = username

    def validatedUser(self, username):
        return db.check_user_in_course(self.course_id, username)

    def start_run(self):
        run_id = db.create_run(self.course_id, self.username, self.chat_id, 
                              self.params.get('utms'), self.params.get('utmc'))
        self.run_id = run_id
        return run_id

    def get_course_data(self):
        # This slow implementation for db is not needed as this method is called for non-db only
        # if self.course_path == "db":
        #     return db.get_course_as_json(self.course_id)        
        with open(self.course_path, 'r') as file:
            return yaml.safe_load(file)

    def get_element(self, element_id = None):
        if element_id:
            e = Course._get_element_from_course(self.course_id, element_id)
            if e:
                e.set_run_id(self.run_id)
                e.set_user(self.chat_id, self.username)
                return e
        else:
            e = Course._get_element_from_course(self.course_id, element_id)
            return e

    def get_first_element(self):
        e = self.get_element(self.course_element)
        e.set_user(self.chat_id, self.username)
        e.set_run_id(self.run_id)
        return e

    def get_user_ban_text(self, chat_id):
        """
        Called in main.reply_user. To work properly, waiting.ban_users should be scheduled.
        Returns ban_text if ban is enabled and limit is exceeded, None otherwise.
        """
        if self.ban_enabled:
            if db.check_user_banned(chat_id): 
                return self.ban_text
        return None        

    @classmethod
    def get_next_element(cls, chat_id):
        conversation_id, element_id, element_type, course_id, run_id, element_data = db.get_current_element(chat_id)

        #print ("GET CURRENT ELEMENT")

        #print (f"{element_id} {element_type}, {course_id}, {run_id}\n {element_data}")


        if "revision" in element_data:
            if len(element_data["revision"]['data'])>0:
                revision_element = element_data["revision"]['revision_element']
                revision_elements = element_data["revision"]['data']
                next_element_data = revision_elements.pop(0)

                next_element_id, element_data = next(iter(next_element_data.items()))

                data = {
                    'revision':{
                        'revision_element': revision_element,
                        'data': revision_elements
                    },
                    "element_data": element_data["element_data"]
                }

                e = Course._get_element_from_data(element_id, course_id, data)
                e.set_run_id (run_id)
                return e

        e = Course._get_next_element_from_course(course_id, element_id)
        if e:
            e.set_run_id (run_id)
            return e
        return None



    @classmethod
    def get_element_by_id(cls, chat_id, element_id, course_id=None):
        if course_id is None:
            current_element_id, current_course_id, current_run_id = db.get_current_element_ids(chat_id)
        else:
            current_course_id = course_id
            current_run_id = db.get_run_id(chat_id, course_id)

        if not current_course_id: # can't be?
            logging.info(f"No current element for {chat_id}")
            return None

        e = Course._get_element_from_course(current_course_id, element_id)
        if e:
            e.set_run_id(current_run_id)
        else:
            logging.info(f"Can't get element {element_id} of {current_course_id} for {chat_id}")
        return e

    @classmethod
    def _get_element_from_course(cls, course_id, element_id = None):
        course = Course(course_id)
        if course.course_path == "db":
            if element_id:
                element_id, json = db.get_element_from_course_by_id(course_id, element_id)
            else:
                element_id, json = db.get_first_element_from_course(course_id)
            e = Course._get_element_from_data(element_id, course_id, json)
            return e
        else:
            course_data = course.get_course_data()
            if element_id:
                if element_id in course_data:
                    e = Course._get_element_from_data(element_id, course_id, {"element_data":course_data[element_id]})
                    # e.set_run_id(self.run_id)
                    # e.set_user(self.chat_id, self.username)
                    return e
            for element_key, element_data in course_data.items():
                return Course._get_element_from_data(element_key, course_id, {"element_data":element_data})

    @classmethod
    def _get_next_element_from_course(cls, course_id, element_id):
        course = Course(course_id)
        if course.course_path == "db":
            next_element_id, json = db.get_next_course_element_by_id(course_id, element_id)
            e = Course._get_element_from_data(next_element_id, course_id, json)
            return e
        else:
            next_element = False
            course_data = course.get_course_data()

            for key, element_data in course_data.items():
                if next_element:
                    e = Course._get_element_from_data(key, course_id, {"element_data":element_data})
                    return e
                if key==element_id:
                    next_element = True
            return None

    @classmethod
    def _get_module_id_from_course(cls, course_id, chat_id, shift):
        """ shift is either 1 (next module) or 0 (beginning of current module) or -1 (previous module).
            Note: shift==0 assumes that the first element of the module is {module}_0
            Note: shift==-1 is not supported for db courses yet.
            "Module" here is the first element of the module.
            If such module is not found, current element_id is returned.
        """
        element_id = db.get_current_element_id(chat_id)
        module = element_id[:element_id.find("_")] # if _ was not found, module = Ex8- for element_id == Ex8-1
        
        if shift == 0:
            if len(element_id) == len(module) + 1: # if _ was not found
                id = module + "0"
            else:
                id = module + "_0"
            logging.info(f"Restarting from {element_id} to {id}")
            return id;
        
        course = Course(course_id)
        if course.course_path == "db":
            element_id = db.get_other_module_course_element_id(course_id, element_id, module, shift)
            #TODO: think if this is dangerous because of None element_id
        else:
            prev_module = None
            current = False # if the key belongs to the current module (where the user is now)
            course_keys = list(course.get_course_data().keys())
            if shift < 0:
                course_keys = list(reversed(course_keys))
                if element_id == course_keys[0]: #it's last element: the course is over. Simulating next module:
                    prev_module = module + "END"
                    course_keys.insert(0, prev_module + "_0")
            last_i = len(course_keys) - 1
            for i, key in enumerate(course_keys):
                mod = key[:key.find("_")]
                if module == mod: # e.g. Ex7
                    current = True
                if shift == 1: # searching next module
                    if current and (module != mod or i == last_i): # current == True if the previous element belongs to the current module
                        logging.info(f"Going forward from {element_id} to {key} (element #{i})")
                        element_id = key # e.g. Ex8_0
                        break
                else: # searching previous module
                    if current and module != mod: # current == True if the next element (prev in the keys list) belongs to the current module
                        if prev_module is None: # e.g. key == Ex6_2
                            prev_module = mod
                        elif prev_module != mod: # e.g. Ex5_3
                            logging.info(f"Going back from {element_id} to {course_keys[i-1]} (element #{i-1})")
                            element_id = course_keys[i-1] # e.g. Ex6_0
                            break
                        elif i == last_i: # e.g. Ex0_0
                            logging.info(f"Going back from {element_id} to {key} (last element)")
                            element_id = key # e.g. Ex0_0
                            break
        return element_id

    @classmethod
    def get_current_element(cls, chat_id):
        # First get the current element to determine the course_id
        result = db.get_current_element(chat_id)
        if result is None:
            return None
        
        conversation_id, element_id, element_type, course_id, run_id, element_data = result
        
        if db.is_course_ended(chat_id, course_id):
            logging.info(f"Course {course_id} has been marked as ended for {chat_id}")
            return None
        element = Course._get_element_from_data(element_id, course_id, element_data)
        element.set_run_id(run_id)
        element.set_conversation_id(conversation_id)

        return element

    @classmethod
    def get_last_element_of(cls, chat_id, element_id):
        result = db.get_last_element_of(chat_id, element_id)
        if result is None:
            return None
        
        conversation_id, element_id, element_type, course_id, run_id, element_data = result
        
        element = Course._get_element_from_data(element_id, course_id, element_data)
        element.set_run_id(run_id)
        element.set_conversation_id(conversation_id)
        return element

    @classmethod
    def _get_element_from_data(cls, element_key, course_id, element_data):
        if not element_key:
            return None
        element_type = element_data["element_data"]['type']
        element_class = element_registry.get(element_type)
        if element_class:
            element = element_class(element_key, course_id, element_data)
            return element

