import { NextRequest, NextResponse } from 'next/server';
import {
  getCourseMetadata,
  getCourseFilePath,
  loadCourseYaml,
} from '@/lib/course-editor/yaml-utils';
import {
  getCourseFromDB,
  saveCourseToDB,
  courseExistsInDB,
} from '@/lib/course-editor/db-utils';
import { getAccountId } from '@/lib/db';

/**
 * POST /api/course-editor/courses/{courseId}/export
 * Экспортирует курс из YAML в базу данных
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id;
    const accountId = getAccountId(request);

    // 1. Проверяем, не существует ли уже курс в БД
    if (await courseExistsInDB(courseId, accountId)) {
      return NextResponse.json(
        {
          error: 'Course already exists',
          message: `Course with ID "${courseId}" already exists in database`,
        },
        { status: 409 }
      );
    }

    // 2. Загружаем курс из YAML
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

    // Проверяем, не хранится ли курс в БД (старая схема)
    if (courseMetadata.path === 'db') {
      return NextResponse.json(
        {
          error: 'Course already in database',
          message: `Course "${courseId}" is already stored in database (old schema)`,
        },
        { status: 409 }
      );
    }

    // Получаем путь к файлу курса
    const courseFilePath = getCourseFilePath(courseId);
    if (!courseFilePath) {
      return NextResponse.json(
        {
          error: 'Course file not found',
          message: `Could not determine file path for course "${courseId}"`,
        },
        { status: 404 }
      );
    }

    // Загружаем YAML файл курса
    const yamlContent = loadCourseYaml(courseFilePath);

    // 3. Сохраняем в БД
    await saveCourseToDB(
      courseId,
      accountId,
      yamlContent,
      {
        element: courseMetadata.element,
        restricted: courseMetadata.restricted,
        decline_text: courseMetadata.decline_text,
        ban_enabled: courseMetadata.ban_enabled,
        ban_text: courseMetadata.ban_text,
      },
      null, // title
      null  // description
    );

    return NextResponse.json({
      course_id: courseId,
      message: 'Course exported to database successfully',
    });
  } catch (error) {
    console.error('Error exporting course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
