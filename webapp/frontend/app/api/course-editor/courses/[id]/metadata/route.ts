import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseMetadata,
  updateCourseMetadata,
  validateCourseId,
  validateCoursePath,
  normalizeCoursePath,
  hasExtCourses,
  getExtCoursesInfo,
  loadCoursesYaml,
} from '@/lib/course-editor/yaml-utils';

/**
 * GET /api/course-editor/courses/{course_id}/metadata
 * Возвращает только метаданные курса (без содержимого YAML файла)
 * Более легковесный, чем GET /api/course-editor/courses/{course_id}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;

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

    // Проверяем, является ли курс частью ext_courses
    const courses = loadCoursesYaml();
    const isFromExtCourses = hasExtCourses(courses);
    const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
    const isFromDb = extCoursesInfo?.path === 'db' && courseMetadata.path === 'db';

    return NextResponse.json({
      ...courseMetadata,
      is_from_db: courseMetadata.path === 'db',
      is_from_ext_courses: isFromExtCourses && courseMetadata.path === 'db',
      ext_courses_source: extCoursesInfo?.path || null,
    });
  } catch (error) {
    console.error('Error loading course metadata:', error);
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
 * PUT /api/course-editor/courses/{course_id}/metadata
 * Обновляет только метаданные курса в courses.yml
 * Не изменяет содержимое YAML файла курса
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const body = await request.json();

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

    // Получаем текущие метаданные
    const currentMetadata = getCourseMetadata(courseId);
    if (!currentMetadata) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course with ID "${courseId}" not found in courses.yml`,
        },
        { status: 404 }
      );
    }

    // Проверяем, является ли курс из БД
    const courses = loadCoursesYaml();
    const isFromExtCourses = hasExtCourses(courses);
    const extCoursesInfo = isFromExtCourses ? getExtCoursesInfo(courses) : null;
    const isFromDb = currentMetadata.path === 'db';

    // Предупреждение для курсов из БД
    if (isFromDb) {
      const warning = isFromExtCourses && extCoursesInfo?.path === 'db'
        ? 'This course is loaded from database via ext_courses. Changes to courses.yml may not affect the course.'
        : 'This course is stored in database. Changes to courses.yml may not affect the course.';
      
      // Можно продолжить обновление, но предупредить пользователя
      console.warn(`Warning for course ${courseId}: ${warning}`);
    }

    // Валидация path, если он обновляется
    if (body.path !== undefined) {
      const pathValidation = validateCoursePath(body.path);
      if (!pathValidation.valid) {
        return NextResponse.json(
          {
            error: 'Invalid path',
            message: pathValidation.error,
          },
          { status: 400 }
        );
      }
    }

    // Подготавливаем метаданные для обновления
    const metadataToUpdate: Partial<typeof currentMetadata> = {};
    
    if (body.path !== undefined) {
      metadataToUpdate.path = body.path;
    }
    if (body.element !== undefined) {
      metadataToUpdate.element = body.element || undefined;
    }
    if (body.restricted !== undefined) {
      metadataToUpdate.restricted = body.restricted;
    }
    if (body.decline_text !== undefined) {
      metadataToUpdate.decline_text = body.decline_text || undefined;
    }
    if (body.ban_enabled !== undefined) {
      metadataToUpdate.ban_enabled = body.ban_enabled;
    }
    if (body.ban_text !== undefined) {
      metadataToUpdate.ban_text = body.ban_text || undefined;
    }

    // Обновляем метаданные
    updateCourseMetadata(courseId, metadataToUpdate);

    // Получаем обновленные метаданные
    const updatedMetadata = getCourseMetadata(courseId);
    if (!updatedMetadata) {
      throw new Error('Failed to retrieve updated metadata');
    }

    return NextResponse.json({
      ...updatedMetadata,
      updated_at: new Date().toISOString(),
      warning: isFromDb ? (isFromExtCourses && extCoursesInfo?.path === 'db'
        ? 'Course is loaded from database. Changes may not affect the course.'
        : 'Course is stored in database. Changes may not affect the course.') : undefined,
    });
  } catch (error) {
    console.error('Error updating course metadata:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
