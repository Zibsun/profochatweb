import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Проверяем, что мы в Node.js окружении
if (typeof window !== 'undefined') {
  throw new Error('yaml-utils can only be used in server-side code (API routes)');
}

// Путь к корню проекта (относительно webapp/frontend)
// process.cwd() в Next.js API routes возвращает корень Next.js приложения (webapp/frontend)
// Нужно подняться на 2 уровня вверх, чтобы попасть в корень проекта (profochatbot)
function getProjectRoot(): string {
  const cwd = process.cwd();
  // Если мы в webapp/frontend, поднимаемся на 2 уровня
  if (cwd.endsWith('webapp/frontend') || cwd.endsWith('webapp\\frontend')) {
    return path.resolve(cwd, '..', '..');
  }
  // Иначе пытаемся найти корень проекта по наличию scripts/courses.yml
  let current = cwd;
  for (let i = 0; i < 5; i++) {
    const scriptsPath = path.join(current, 'scripts', 'courses.yml');
    if (fs.existsSync(scriptsPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break; // Достигли корня файловой системы
    current = parent;
  }
  // Fallback: предполагаем стандартную структуру
  return path.resolve(cwd, '..', '..');
}

const PROJECT_ROOT = getProjectRoot();
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const COURSES_YML_PATH = path.join(SCRIPTS_DIR, 'courses.yml');

// Константы для работы с ext_courses (соответствуют course.py)
const EXT_COURSES_ID = 'ext_courses';
const DEFAULT_COURSE_ID = 'default';

export interface CourseMetadata {
  course_id: string;
  path: string;
  element?: string;
  restricted?: boolean | string;
  decline_text?: string;
  ban_enabled?: boolean | string;
  ban_text?: string;
}

export interface CoursesYaml {
  [courseId: string]: {
    path: string;
    element?: string;
    restricted?: boolean | string;
    decline_text?: string;
    ban_enabled?: boolean | string;
    ban_text?: string;
  };
}

/**
 * Нормализует путь курса согласно логике из course.py (метод __init__ класса Course)
 * 
 * Правила нормализации:
 * - Если путь равен "db", возвращается "db" без изменений
 * - Если путь начинается с "scripts/", возвращается как есть
 * - Если путь относительный и не начинается с "scripts/", добавляется префикс "scripts/"
 * - Абсолютные пути возвращаются без изменений
 * 
 * В Python коде также добавляется BOT_FOLDER: "scripts/" + globals.BOT_FOLDER + coursePath
 * В веб-редакторе мы не знаем BOT_FOLDER, поэтому просто добавляем "scripts/"
 * 
 * @param coursePath - Путь к файлу курса или "db"
 * @returns Нормализованный путь
 */
export function normalizeCoursePath(coursePath: string): string {
  if (coursePath === 'db') {
    return 'db';
  }
  if (coursePath.startsWith('scripts/')) {
    return coursePath;
  }
  // Если путь относительный и не начинается с scripts/, добавляем префикс
  if (!path.isAbsolute(coursePath)) {
    return `scripts/${coursePath}`;
  }
  return coursePath;
}

/**
 * Валидирует course_id согласно требованиям
 * Разрешенные символы: a-z, A-Z, 0-9, _, -
 */
export function validateCourseId(courseId: string): { valid: boolean; error?: string } {
  if (!courseId || courseId.trim() === '') {
    return { valid: false, error: 'course_id cannot be empty' };
  }
  
  // Проверка на допустимые символы
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(courseId)) {
    return { 
      valid: false, 
      error: 'course_id can only contain letters, numbers, underscores, and hyphens' 
    };
  }
  
  return { valid: true };
}

/**
 * Валидирует путь курса
 */
export function validateCoursePath(coursePath: string): { valid: boolean; error?: string } {
  if (!coursePath || coursePath.trim() === '') {
    return { valid: false, error: 'path cannot be empty' };
  }
  
  // Разрешаем "db" для курсов из базы данных
  if (coursePath === 'db') {
    return { valid: true };
  }
  
  // Защита от path traversal
  if (coursePath.includes('..')) {
    return { valid: false, error: 'path cannot contain ".." (path traversal protection)' };
  }
  
  return { valid: true };
}

/**
 * Загружает courses.yml и возвращает его содержимое
 * 
 * Примечание об ext_courses:
 * - В Python коде (course.py) при наличии ключа ext_courses происходит загрузка курсов из БД или файла
 * - В веб-редакторе мы просто загружаем courses.yml как есть
 * - Курсы из ext_courses с path: "db" должны быть идентифицированы через hasExtCourses()
 * - Загрузка курсов из БД требует подключения к БД и выполняется в Python коде
 * 
 * @returns Объект с метаданными всех курсов
 */
export function loadCoursesYaml(): CoursesYaml {
  try {
    if (!fs.existsSync(COURSES_YML_PATH)) {
      throw new Error(`courses.yml not found at ${COURSES_YML_PATH}`);
    }

    const content = fs.readFileSync(COURSES_YML_PATH, 'utf-8');
    const courses = yaml.load(content) as CoursesYaml;
    
    // Проверяем наличие ext_courses, но не загружаем их здесь
    // (загрузка из БД требует подключения к БД, что делается в Python коде)
    // В веб-редакторе мы просто отмечаем наличие ext_courses
    
    return courses || {};
  } catch (error) {
    console.error('Error loading courses.yml:', error);
    throw new Error(`Failed to load courses.yml: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Проверяет, есть ли в courses.yml ключ ext_courses
 */
export function hasExtCourses(courses: CoursesYaml): boolean {
  return EXT_COURSES_ID in courses;
}

/**
 * Получает информацию о ext_courses
 */
export function getExtCoursesInfo(courses: CoursesYaml): { path: string } | null {
  if (!hasExtCourses(courses)) {
    return null;
  }
  const extCourses = courses[EXT_COURSES_ID];
  return {
    path: extCourses.path || 'db',
  };
}

/**
 * Сохраняет courses.yml
 */
export function saveCoursesYaml(courses: CoursesYaml): void {
  try {
    // Создаем backup перед сохранением
    if (fs.existsSync(COURSES_YML_PATH)) {
      const backupPath = `${COURSES_YML_PATH}.backup`;
      fs.copyFileSync(COURSES_YML_PATH, backupPath);
    }

    const content = yaml.dump(courses, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });

    // Атомарная запись: пишем во временный файл, затем переименовываем
    const tempPath = `${COURSES_YML_PATH}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, COURSES_YML_PATH);
  } catch (error) {
    console.error('Error saving courses.yml:', error);
    throw new Error(`Failed to save courses.yml: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получает путь к файлу курса по course_id
 * Нормализует путь согласно логике из course.py
 */
export function getCourseFilePath(courseId: string): string | null {
  const courses = loadCoursesYaml();
  
  if (!courses[courseId]) {
    return null;
  }

  const courseInfo = courses[courseId];
  const coursePath = courseInfo.path;

  // Если путь "db", курс хранится в БД
  if (coursePath === 'db') {
    return null; // Возвращаем null для курсов из БД
  }

  // Нормализуем путь
  const normalizedPath = normalizeCoursePath(coursePath);
  
  // Если путь начинается с "scripts/", используем его относительно PROJECT_ROOT
  if (normalizedPath.startsWith('scripts/')) {
    return path.join(PROJECT_ROOT, normalizedPath);
  }

  // Если путь абсолютный, используем его как есть
  if (path.isAbsolute(normalizedPath)) {
    return normalizedPath;
  }

  // Fallback: относительный путь относительно SCRIPTS_DIR
  return path.join(SCRIPTS_DIR, normalizedPath);
}

/**
 * Загружает YAML файл курса
 */
export function loadCourseYaml(courseFilePath: string): Record<string, any> {
  try {
    if (!fs.existsSync(courseFilePath)) {
      throw new Error(`Course file not found: ${courseFilePath}`);
    }

    const content = fs.readFileSync(courseFilePath, 'utf-8');
    const courseData = yaml.load(content) as Record<string, any>;
    return courseData || {};
  } catch (error) {
    console.error('Error loading course YAML:', error);
    
    // Улучшенная обработка ошибок YAML
    if (error instanceof Error && error.message.includes('duplicated mapping key')) {
      const match = error.message.match(/\((\d+):(\d+)\)/);
      if (match) {
        const line = match[1];
        const column = match[2];
        throw new Error(`YAML syntax error: duplicated mapping key at line ${line}, column ${column}. Please check the YAML file for duplicate keys.`);
      }
      throw new Error(`YAML syntax error: duplicated mapping key. Please check the YAML file for duplicate keys.`);
    }
    
    throw new Error(`Failed to load course YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Сохраняет YAML файл курса
 */
export function saveCourseYaml(courseFilePath: string, courseData: Record<string, any>): void {
  try {
    // Создаем директорию, если её нет
    const dir = path.dirname(courseFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Создаем backup перед сохранением
    if (fs.existsSync(courseFilePath)) {
      const backupPath = `${courseFilePath}.backup`;
      fs.copyFileSync(courseFilePath, backupPath);
    }

    // Преобразуем объект в YAML с сохранением порядка ключей
    const content = yaml.dump(courseData, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
      sortKeys: false, // Сохраняем порядок элементов
    });

    // Атомарная запись: пишем во временный файл, затем переименовываем
    const tempPath = `${courseFilePath}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, courseFilePath);
  } catch (error) {
    console.error('Error saving course YAML:', error);
    throw new Error(`Failed to save course YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Получает метаданные курса по course_id
 */
export function getCourseMetadata(courseId: string): CourseMetadata | null {
  const courses = loadCoursesYaml();
  
  if (!courses[courseId]) {
    return null;
  }

  const courseInfo = courses[courseId];
  return {
    course_id: courseId,
    path: courseInfo.path,
    element: courseInfo.element,
    restricted: courseInfo.restricted,
    decline_text: courseInfo.decline_text,
    ban_enabled: courseInfo.ban_enabled,
    ban_text: courseInfo.ban_text,
  };
}

/**
 * Нормализует булевые значения для restricted и ban_enabled
 * Принимает boolean или string ("yes"/"no") и возвращает boolean
 */
function normalizeBoolean(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'yes' || lower === 'true' || lower === '1') {
      return true;
    }
    if (lower === 'no' || lower === 'false' || lower === '0') {
      return false;
    }
  }
  return undefined;
}

/**
 * Обновляет метаданные курса в courses.yml
 * Включает валидацию и нормализацию данных
 * 
 * Особенности:
 * - Пути нормализуются автоматически (добавление префикса scripts/ при необходимости)
 * - Булевые значения (restricted, ban_enabled) нормализуются из строк ("yes"/"no") в boolean
 * - Пустые строки для опциональных полей удаляются из метаданных
 * - Для курсов с path: "db" выводится предупреждение, что изменения могут не влиять на курс
 * 
 * @param courseId - Идентификатор курса
 * @param metadata - Частичные метаданные для обновления
 * @throws Error если курс не найден или данные невалидны
 */
export function updateCourseMetadata(courseId: string, metadata: Partial<CourseMetadata>): void {
  const courses = loadCoursesYaml();
  
  if (!courses[courseId]) {
    throw new Error(`Course ${courseId} not found in courses.yml`);
  }

  // Проверяем, не является ли курс частью ext_courses
  // (курсы из ext_courses с path: db могут не обновляться через courses.yml)
  const courseInfo = courses[courseId];
  if (courseInfo.path === 'db') {
    console.warn(`Warning: Course ${courseId} has path: "db". Metadata updates may not affect the course if it's managed through the database.`);
  }

  // Валидация и нормализация path
  if (metadata.path !== undefined) {
    const pathValidation = validateCoursePath(metadata.path);
    if (!pathValidation.valid) {
      throw new Error(`Invalid path: ${pathValidation.error}`);
    }
    // Нормализуем путь перед сохранением
    courses[courseId].path = normalizeCoursePath(metadata.path);
  }
  
  // Обновляем остальные метаданные
  if (metadata.element !== undefined) {
    if (metadata.element !== null && metadata.element.trim() === '') {
      // Удаляем пустой element
      delete courses[courseId].element;
    } else {
      courses[courseId].element = metadata.element;
    }
  }
  
  if (metadata.restricted !== undefined) {
    const normalized = normalizeBoolean(metadata.restricted);
    if (normalized === undefined) {
      delete courses[courseId].restricted;
    } else {
      courses[courseId].restricted = normalized;
    }
  }
  
  if (metadata.decline_text !== undefined) {
    if (metadata.decline_text === null || metadata.decline_text.trim() === '') {
      delete courses[courseId].decline_text;
    } else {
      courses[courseId].decline_text = metadata.decline_text;
    }
  }
  
  if (metadata.ban_enabled !== undefined) {
    const normalized = normalizeBoolean(metadata.ban_enabled);
    if (normalized === undefined) {
      delete courses[courseId].ban_enabled;
    } else {
      courses[courseId].ban_enabled = normalized;
    }
  }
  
  if (metadata.ban_text !== undefined) {
    if (metadata.ban_text === null || metadata.ban_text.trim() === '') {
      delete courses[courseId].ban_text;
    } else {
      courses[courseId].ban_text = metadata.ban_text;
    }
  }

  saveCoursesYaml(courses);
}

/**
 * Добавляет новый курс в courses.yml
 * Включает валидацию и нормализацию данных
 * 
 * Валидация:
 * - course_id проверяется на допустимые символы (a-z, A-Z, 0-9, _, -)
 * - path проверяется на отсутствие path traversal (..)
 * - Проверка уникальности course_id
 * 
 * Нормализация:
 * - Путь нормализуется автоматически
 * - Булевые значения нормализуются из строк в boolean
 * - Пустые строки для опциональных полей не добавляются
 * 
 * @param courseId - Идентификатор курса
 * @param coursePath - Путь к файлу курса или "db"
 * @param metadata - Опциональные метаданные курса
 * @throws Error если курс уже существует или данные невалидны
 */
export function addCourseToCoursesYaml(courseId: string, coursePath: string, metadata?: Partial<CourseMetadata>): void {
  // Валидация course_id
  const idValidation = validateCourseId(courseId);
  if (!idValidation.valid) {
    throw new Error(`Invalid course_id: ${idValidation.error}`);
  }
  
  // Валидация path
  const pathValidation = validateCoursePath(coursePath);
  if (!pathValidation.valid) {
    throw new Error(`Invalid path: ${pathValidation.error}`);
  }
  
  const courses = loadCoursesYaml();
  
  if (courses[courseId]) {
    throw new Error(`Course ${courseId} already exists in courses.yml`);
  }

  // Нормализуем путь перед сохранением
  const normalizedPath = normalizeCoursePath(coursePath);
  
  // Нормализуем булевые значения
  const restricted = metadata?.restricted !== undefined ? normalizeBoolean(metadata.restricted) : undefined;
  const banEnabled = metadata?.ban_enabled !== undefined ? normalizeBoolean(metadata.ban_enabled) : undefined;

  courses[courseId] = {
    path: normalizedPath,
    ...(metadata?.element && metadata.element.trim() !== '' && { element: metadata.element }),
    ...(restricted !== undefined && { restricted }),
    ...(metadata?.decline_text && metadata.decline_text.trim() !== '' && { decline_text: metadata.decline_text }),
    ...(banEnabled !== undefined && { ban_enabled: banEnabled }),
    ...(metadata?.ban_text && metadata.ban_text.trim() !== '' && { ban_text: metadata.ban_text }),
  };

  saveCoursesYaml(courses);
}
