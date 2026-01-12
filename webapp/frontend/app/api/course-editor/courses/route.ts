import { NextRequest, NextResponse } from 'next/server';
import {
  loadCoursesYaml,
  addCourseToCoursesYaml,
  getCourseFilePath,
  saveCourseYaml,
  validateCourseId,
  validateCoursePath,
  normalizeCoursePath,
  hasExtCourses,
  getExtCoursesInfo,
} from '@/lib/course-editor/yaml-utils';
import { convertBlocksToYaml } from '@/lib/course-editor/yaml-converter';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/course-editor/courses
 * Возвращает список всех курсов из courses.yml
 * Включает информацию о ext_courses и идентификацию курсов из БД
 */
export async function GET() {
  try {
    const courses = loadCoursesYaml();
    const hasExt = hasExtCourses(courses);
    const extCoursesInfo = hasExt ? getExtCoursesInfo(courses) : null;

    // Преобразуем в массив с метаданными
    const coursesList = Object.entries(courses)
      // Исключаем ext_courses из списка курсов (это служебный ключ)
      .filter(([courseId]) => courseId !== 'ext_courses')
      .map(([courseId, courseInfo]) => ({
        course_id: courseId,
        path: courseInfo.path,
        element: courseInfo.element,
        restricted: courseInfo.restricted,
        decline_text: courseInfo.decline_text,
        ban_enabled: courseInfo.ban_enabled,
        ban_text: courseInfo.ban_text,
        // Дополнительная информация для идентификации курсов из БД
        is_from_db: courseInfo.path === 'db',
        is_from_ext_courses: hasExt && extCoursesInfo?.path === 'db' && courseInfo.path === 'db',
      }));

    return NextResponse.json({
      courses: coursesList,
      ext_courses: hasExt ? {
        enabled: true,
        source: extCoursesInfo?.path || 'db',
        note: extCoursesInfo?.path === 'db' 
          ? 'Courses from database are loaded via ext_courses. They may not appear in this list if not yet loaded.'
          : `Courses are loaded from ${extCoursesInfo?.path}`,
      } : null,
    });
  } catch (error) {
    console.error('Error loading courses list:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/course-editor/courses
 * Создает новый курс
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация входных данных
    if (!body.course_id) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'course_id is required',
        },
        { status: 400 }
      );
    }

    const courseId = body.course_id;
    
    // Валидация course_id
    const idValidation = validateCourseId(courseId);
    if (!idValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid course_id',
          message: idValidation.error,
        },
        { status: 400 }
      );
    }

    if (!body.blocks || !Array.isArray(body.blocks)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'blocks array is required',
        },
        { status: 400 }
      );
    }

    const courses = loadCoursesYaml();

    // Проверяем, не существует ли уже курс с таким ID
    if (courses[courseId]) {
      return NextResponse.json(
        {
          error: 'Course already exists',
          message: `Course with ID "${courseId}" already exists`,
        },
        { status: 409 }
      );
    }

    // Определяем путь к файлу курса
    // Если путь указан в body.path, используем его, иначе генерируем по умолчанию
    let coursePath = body.path || `${courseId}.yml`;
    
    // Валидация пути
    const pathValidation = validateCoursePath(coursePath);
    if (!pathValidation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid path',
          message: pathValidation.error,
        },
        { status: 400 }
      );
    }
    
    // Нормализуем путь (добавляем префикс scripts/ если нужно)
    coursePath = normalizeCoursePath(coursePath);
    
    const PROJECT_ROOT = path.join(process.cwd(), '..', '..', '..');
    const courseFilePath = path.join(PROJECT_ROOT, coursePath);

    // Преобразуем блоки в YAML
    const yamlContent = convertBlocksToYaml(body.blocks);

    // Сохраняем YAML файл курса
    saveCourseYaml(courseFilePath, yamlContent);

    // Добавляем запись в courses.yml
    addCourseToCoursesYaml(courseId, coursePath, {
      element: body.settings?.element,
      restricted: body.settings?.restricted,
      decline_text: body.settings?.decline_text,
      ban_enabled: body.settings?.ban_enabled,
      ban_text: body.settings?.ban_text,
    });

    return NextResponse.json({
      course_id: courseId,
      path: coursePath,
      course: {
        course_id: courseId,
        path: coursePath,
        element: body.settings?.element,
        restricted: body.settings?.restricted,
        decline_text: body.settings?.decline_text,
        ban_enabled: body.settings?.ban_enabled,
        ban_text: body.settings?.ban_text,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
