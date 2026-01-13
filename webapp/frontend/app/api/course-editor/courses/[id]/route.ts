import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseMetadata,
  getCourseFilePath,
  loadCourseYaml,
} from '@/lib/course-editor/yaml-utils';
import { convertYamlToBlocks } from '@/lib/course-editor/yaml-converter';
import {
  getCourseFromDB,
  getCourseElementsFromDB,
  elementsToYaml,
} from '@/lib/course-editor/db-utils';
import { getAccountId } from '@/lib/db';

/**
 * GET /api/course-editor/courses/{course_id}
 * Загружает курс из базы данных или YAML файла
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseCode = params.id; // Это course_code для URL
    const accountId = getAccountId(request);

    // 1. Сначала проверяем, существует ли курс в БД по course_code
    const dbCourse = await getCourseFromDB(courseCode, accountId);

    if (dbCourse) {
      // Курс найден в БД
      // Загружаем элементы курса используя INT course_id
      const elements = await getCourseElementsFromDB(dbCourse.course_id, accountId);

      // Преобразуем элементы в YAML структуру
      const yamlContent = elementsToYaml(elements);

      // Преобразуем YAML в блоки редактора
      const blocks = convertYamlToBlocks(yamlContent);

      // Извлекаем метаданные
      const metadata = dbCourse.metadata || {};

      return NextResponse.json({
        course: {
          course_id: dbCourse.course_code, // Возвращаем course_code для обратной совместимости
          course_code: dbCourse.course_code,
          course_id_int: dbCourse.course_id, // Добавляем INT course_id
          path: 'db',
          element: metadata.element,
          restricted: metadata.restricted,
          decline_text: metadata.decline_text,
          ban_enabled: metadata.ban_enabled,
          ban_text: metadata.ban_text,
          title: dbCourse.title,
          description: dbCourse.description,
          is_active: dbCourse.is_active,
        },
        yaml_content: yamlContent,
        blocks,
        source: 'database',
      });
    }

    // 2. Курс не найден в БД, пробуем загрузить из YAML (legacy режим)
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in database or courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, не хранится ли курс в БД (старая схема с bot_name)
    if (courseMetadata.path === 'db') {
      const { hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
      const courses = await import('@/lib/course-editor/yaml-utils').then(m => m.loadCoursesYaml());
      const isFromExtCourses = hasExtCourses(courses);
      const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
      
      const message = isFromExtCourses && extCoursesInfo?.path === 'db'
        ? `Course "${courseId}" is loaded from database via ext_courses (old schema). Please migrate it to the new database schema first.`
        : `Course "${courseId}" is stored in database (old schema). Please migrate it to the new database schema first.`;
      
      return NextResponse.json(
        {
          error: 'Course stored in database (old schema)',
          message,
          is_from_ext_courses: isFromExtCourses && extCoursesInfo?.path === 'db',
        },
        { status: 409 }
      );
    }

    // Получаем путь к файлу курса
    const courseFilePath = getCourseFilePath(courseId);
    if (!courseFilePath) {
      return NextResponse.json(
        {
          error: 'Course file path not found',
          message: `Could not determine file path for course "${courseId}"`,
        },
        { status: 404 }
      );
    }

    // Загружаем YAML файл курса
    const yamlContent = loadCourseYaml(courseFilePath);

    // Преобразуем YAML в блоки редактора
    const blocks = convertYamlToBlocks(yamlContent);

    return NextResponse.json({
      course: {
        course_id: courseMetadata.course_id,
        path: courseMetadata.path,
        element: courseMetadata.element,
        restricted: courseMetadata.restricted,
        decline_text: courseMetadata.decline_text,
        ban_enabled: courseMetadata.ban_enabled,
        ban_text: courseMetadata.ban_text,
      },
      yaml_content: yamlContent,
      blocks,
      source: 'yaml',
    });
  } catch (error) {
    console.error('Error loading course:', error);
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
 * PUT /api/course-editor/courses/{course_id}
 * Сохраняет курс в базу данных или YAML файл
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseCode = params.id; // Это course_code для URL
    const accountId = getAccountId(request);
    const body = await request.json();

    // Валидация входных данных
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
    const { convertBlocksToYaml } = await import('@/lib/course-editor/yaml-converter');
    const yamlContent = convertBlocksToYaml(body.blocks);

    // Проверяем, существует ли курс в БД по course_code
    const dbCourse = await getCourseFromDB(courseCode, accountId);

    if (dbCourse || body.save_to_db === true) {
      // Сохраняем в БД
      const { saveCourseToDB } = await import('@/lib/course-editor/db-utils');
      
      await saveCourseToDB(
        courseCode,  // Используем courseCode вместо courseId
        accountId,
        yamlContent,
        {
          element: body.settings?.element,
          restricted: body.settings?.restricted,
          decline_text: body.settings?.decline_text,
          ban_enabled: body.settings?.ban_enabled,
          ban_text: body.settings?.ban_text,
        },
        body.settings?.title,  // Передаем title для сохранения
        body.settings?.description
      );

      return NextResponse.json({
        course_id: courseCode,  // Возвращаем course_code для обратной совместимости
        course_code: courseCode,
        path: 'db',
        saved_at: new Date().toISOString(),
        message: 'Course saved successfully to database',
        source: 'database',
      });
    }

    // Сохраняем в YAML (legacy режим)
    const courseMetadata = getCourseMetadata(courseCode);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, не хранится ли курс в БД (старая схема)
    if (courseMetadata.path === 'db') {
      const { hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
      const courses = await import('@/lib/course-editor/yaml-utils').then(m => m.loadCoursesYaml());
      const isFromExtCourses = hasExtCourses(courses);
      const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
      
      const message = isFromExtCourses && extCoursesInfo?.path === 'db'
        ? `Course "${courseId}" is loaded from database via ext_courses (old schema). Please migrate it to the new database schema first.`
        : `Course "${courseId}" is stored in database (old schema). Please migrate it to the new database schema first.`;
      
      return NextResponse.json(
        {
          error: 'Course stored in database (old schema)',
          message,
          is_from_ext_courses: isFromExtCourses && extCoursesInfo?.path === 'db',
        },
        { status: 409 }
      );
    }

    // Получаем путь к файлу курса
    const courseFilePath = getCourseFilePath(courseId);
    if (!courseFilePath) {
      return NextResponse.json(
        {
          error: 'Course file path not found',
          message: `Could not determine file path for course "${courseId}"`,
        },
        { status: 404 }
      );
    }

    // Импортируем функции сохранения
    const { saveCourseYaml, updateCourseMetadata } = await import('@/lib/course-editor/yaml-utils');

    // Сохраняем YAML файл курса
    saveCourseYaml(courseFilePath, yamlContent);

    // Обновляем метаданные в courses.yml, если они изменились
    if (body.settings) {
      updateCourseMetadata(courseId, {
        element: body.settings.element,
        restricted: body.settings.restricted,
        decline_text: body.settings.decline_text,
        ban_enabled: body.settings.ban_enabled,
        ban_text: body.settings.ban_text,
      });
    }

    return NextResponse.json({
      course_id: courseId,
      path: courseMetadata.path,
      saved_at: new Date().toISOString(),
      message: 'Draft saved successfully',
      source: 'yaml',
    });
  } catch (error) {
    console.error('Error saving course:', error);
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
 * DELETE /api/course-editor/courses/{course_id}
 * Удаляет курс из БД или YAML
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const accountId = getAccountId(request);

    // Проверяем, существует ли курс в БД
    const dbCourse = await getCourseFromDB(courseId, accountId);

    if (dbCourse) {
      // Удаляем из БД
      const { query } = await import('@/lib/db');
      
      // Удаляем элементы курса
      await query(
        `DELETE FROM course_element
         WHERE course_id = $1 AND account_id = $2`,
        [courseId, accountId]
      );

      // Удаляем метаданные курса
      await query(
        `DELETE FROM course
         WHERE course_id = $1 AND account_id = $2`,
        [courseId, accountId]
      );

      return NextResponse.json({
        course_id: courseId,
        message: 'Course deleted successfully from database',
        source: 'database',
      });
    }

    // Удаляем из YAML (legacy режим)
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in database or courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, является ли курс из БД (старая схема)
    const isFromDb = courseMetadata.path === 'db';
    const { loadCoursesYaml, saveCoursesYaml, hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
    const courses = loadCoursesYaml();
    const isFromExtCourses = hasExtCourses(courses);
    const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
    const isFromExtCoursesDb = isFromExtCourses && extCoursesInfo?.path === 'db' && isFromDb;

    // Предупреждение для курсов из БД (старая схема)
    if (isFromDb) {
      const warning = isFromExtCoursesDb
        ? 'Course is loaded from database via ext_courses (old schema). Removing it from courses.yml will not delete it from the database.'
        : 'Course is stored in database (old schema). Removing it from courses.yml will not delete it from the database.';
      
      console.warn(`Warning for course ${courseId}: ${warning}`);
    }

    // Получаем путь к файлу курса
    const courseFilePath = getCourseFilePath(courseId);
    
    // Удаляем файл курса, если он существует и не является курсом из БД
    if (courseFilePath && !isFromDb) {
      const fs = await import('fs');
      if (fs.existsSync(courseFilePath)) {
        // Проверяем, не используется ли файл другими курсами
        const otherCoursesUsingFile = Object.entries(courses)
          .filter(([id, info]) => id !== courseId && id !== 'ext_courses')
          .some(([_, info]) => {
            const otherPath = getCourseFilePath(_);
            return otherPath === courseFilePath;
          });
        
        if (!otherCoursesUsingFile) {
          fs.unlinkSync(courseFilePath);
        }
      }
    }

    // Удаляем запись из courses.yml
    delete courses[courseId];
    saveCoursesYaml(courses);

    return NextResponse.json({
      course_id: courseId,
      message: 'Course deleted successfully',
      warning: isFromDb ? (isFromExtCoursesDb
        ? 'Course remains in database (old schema). It can be added back via ext_courses.'
        : 'Course remains in database (old schema).') : undefined,
      file_deleted: courseFilePath && !isFromDb,
      source: 'yaml',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
