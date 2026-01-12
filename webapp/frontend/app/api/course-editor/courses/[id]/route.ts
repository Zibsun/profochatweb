import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseMetadata,
  getCourseFilePath,
  loadCourseYaml,
} from '@/lib/course-editor/yaml-utils';
import { convertYamlToBlocks } from '@/lib/course-editor/yaml-converter';

/**
 * GET /api/course-editor/courses/{course_id}
 * Загружает курс из YAML файла
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    // Получаем метаданные курса из courses.yml
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, не хранится ли курс в БД
    if (courseMetadata.path === 'db') {
      const { hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
      const courses = await import('@/lib/course-editor/yaml-utils').then(m => m.loadCoursesYaml());
      const isFromExtCourses = hasExtCourses(courses);
      const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
      
      const message = isFromExtCourses && extCoursesInfo?.path === 'db'
        ? `Course "${courseId}" is loaded from database via ext_courses and cannot be edited through the editor. Please export it to YAML first.`
        : `Course "${courseId}" is stored in database and cannot be edited through the editor. Please export it to YAML first.`;
      
      return NextResponse.json(
        {
          error: 'Course stored in database',
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
 * Сохраняет курс в YAML файл
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
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

    // Получаем метаданные курса
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, не хранится ли курс в БД
    if (courseMetadata.path === 'db') {
      const { hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
      const courses = await import('@/lib/course-editor/yaml-utils').then(m => m.loadCoursesYaml());
      const isFromExtCourses = hasExtCourses(courses);
      const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
      
      const message = isFromExtCourses && extCoursesInfo?.path === 'db'
        ? `Course "${courseId}" is loaded from database via ext_courses and cannot be edited through the editor.`
        : `Course "${courseId}" is stored in database and cannot be edited through the editor.`;
      
      return NextResponse.json(
        {
          error: 'Course stored in database',
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

    // Импортируем функции преобразования и сохранения
    const { convertBlocksToYaml } = await import('@/lib/course-editor/yaml-converter');
    const { saveCourseYaml, updateCourseMetadata } = await import('@/lib/course-editor/yaml-utils');

    // Преобразуем блоки в YAML
    const yamlContent = convertBlocksToYaml(body.blocks);

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
 * Удаляет курс (опционально)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

    // Получаем метаданные курса
    const courseMetadata = getCourseMetadata(courseId);
    if (!courseMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, является ли курс из БД
    const isFromDb = courseMetadata.path === 'db';
    const { loadCoursesYaml, saveCoursesYaml, hasExtCourses, getExtCoursesInfo } = await import('@/lib/course-editor/yaml-utils');
    const courses = loadCoursesYaml();
    const isFromExtCourses = hasExtCourses(courses);
    const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
    const isFromExtCoursesDb = isFromExtCourses && extCoursesInfo?.path === 'db' && isFromDb;

    // Предупреждение для курсов из БД
    if (isFromDb) {
      const warning = isFromExtCoursesDb
        ? 'Course is loaded from database via ext_courses. Removing it from courses.yml will not delete it from the database.'
        : 'Course is stored in database. Removing it from courses.yml will not delete it from the database.';
      
      // Можно продолжить удаление из courses.yml, но предупредить пользователя
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
        ? 'Course remains in database. It can be added back via ext_courses.'
        : 'Course remains in database.') : undefined,
      file_deleted: courseFilePath && !isFromDb,
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
