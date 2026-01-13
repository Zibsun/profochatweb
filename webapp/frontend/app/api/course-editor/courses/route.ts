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
import { getCoursesFromDB } from '@/lib/course-editor/db-utils';
import { getAccountId } from '@/lib/db';
import path from 'path';
import fs from 'fs';

/**
 * GET /api/course-editor/courses
 * Возвращает список всех курсов из БД и courses.yml
 * Включает информацию о ext_courses и идентификацию курсов из БД
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request);

    // 1. Загружаем курсы из БД
    const dbCourses = await getCoursesFromDB(accountId);

    // 2. Загружаем курсы из YAML (legacy)
    const yamlCourses = loadCoursesYaml();
    const hasExt = hasExtCourses(yamlCourses);
    const extCoursesInfo = hasExt ? getExtCoursesInfo(yamlCourses) : null;

    // 3. Формируем список курсов из БД
    const coursesList = dbCourses.map((course) => {
      const metadata = course.metadata || {};
      return {
        course_id: course.course_id,
        path: 'db',
        title: course.title,
        description: course.description,
        element: metadata.element,
        restricted: metadata.restricted,
        decline_text: metadata.decline_text,
        ban_enabled: metadata.ban_enabled,
        ban_text: metadata.ban_text,
        is_from_db: true,
        is_active: course.is_active,
        source: 'database',
      };
    });

    // 4. Добавляем курсы из YAML (если их нет в БД)
    const dbCourseIds = new Set(dbCourses.map((c) => c.course_id));
    for (const [courseId, courseInfo] of Object.entries(yamlCourses)) {
      if (courseId === 'ext_courses') continue;
      if (!dbCourseIds.has(courseId)) {
        coursesList.push({
          course_id: courseId,
          path: courseInfo.path,
          element: courseInfo.element,
          restricted: courseInfo.restricted,
          decline_text: courseInfo.decline_text,
          ban_enabled: courseInfo.ban_enabled,
          ban_text: courseInfo.ban_text,
          is_from_db: courseInfo.path === 'db',
          is_from_ext_courses: hasExt && extCoursesInfo?.path === 'db' && courseInfo.path === 'db',
          source: courseInfo.path === 'db' ? 'database_old' : 'yaml',
        });
      }
    }

    return NextResponse.json({
      courses: coursesList,
      ext_courses: hasExt ? {
        enabled: true,
        source: extCoursesInfo?.path || 'db',
        note: extCoursesInfo?.path === 'db' 
          ? 'Courses from database (old schema) are loaded via ext_courses. They may not appear in this list if not yet loaded.'
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
 * Создает новый курс в БД или YAML
 */
export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId(request);
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

    // Преобразуем блоки в YAML
    const yamlContent = convertBlocksToYaml(body.blocks);

    // Определяем, куда сохранять: БД или YAML
    const saveToDB = body.save_to_db !== false; // По умолчанию сохраняем в БД

    if (saveToDB) {
      // Сохраняем в БД
      const { courseExistsInDB, saveCourseToDB } = await import('@/lib/course-editor/db-utils');

      // Проверяем, не существует ли уже курс в БД
      if (await courseExistsInDB(courseId, accountId)) {
        return NextResponse.json(
          {
            error: 'Course already exists',
            message: `Course with ID "${courseId}" already exists in database`,
          },
          { status: 409 }
        );
      }

      // Сохраняем в БД
      await saveCourseToDB(
        courseId,
        accountId,
        yamlContent,
        {
          element: body.settings?.element,
          restricted: body.settings?.restricted,
          decline_text: body.settings?.decline_text,
          ban_enabled: body.settings?.ban_enabled,
          ban_text: body.settings?.ban_text,
        },
        body.settings?.title,
        body.settings?.description
      );

      return NextResponse.json({
        course_id: courseId,
        path: 'db',
        course: {
          course_id: courseId,
          path: 'db',
          title: body.settings?.title,
          description: body.settings?.description,
          element: body.settings?.element,
          restricted: body.settings?.restricted,
          decline_text: body.settings?.decline_text,
          ban_enabled: body.settings?.ban_enabled,
          ban_text: body.settings?.ban_text,
        },
        source: 'database',
      }, { status: 201 });
    }

    // Сохраняем в YAML (legacy режим)
    const courses = loadCoursesYaml();

    // Проверяем, не существует ли уже курс с таким ID
    if (courses[courseId]) {
      return NextResponse.json(
        {
          error: 'Course already exists',
          message: `Course with ID "${courseId}" already exists in courses.yml`,
        },
        { status: 409 }
      );
    }

    // Определяем путь к файлу курса
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
      source: 'yaml',
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
