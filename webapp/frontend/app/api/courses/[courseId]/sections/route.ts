import { NextRequest, NextResponse } from 'next/server';
import { getAccountId } from '@/lib/db';
import { getCourseFromDB, getCourseElementsFromDB, elementsToYaml } from '@/lib/course-editor/db-utils';
import { getCourseFilePath, loadCourseYaml, getCourseMetadata } from '@/lib/course-editor/yaml-utils';

/**
 * GET /api/courses/{course_id}/sections
 * Возвращает список секций из YAML курса
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const accountId = getAccountId(request);

    // Пытаемся загрузить курс из БД
    const dbCourse = await getCourseFromDB(courseId, accountId);

    let courseYaml: Record<string, any> = {};

    if (dbCourse) {
      // Курс найден в БД - загружаем элементы и преобразуем в YAML
      const elements = await getCourseElementsFromDB(dbCourse.course_id, accountId);
      courseYaml = elementsToYaml(elements);
    } else {
      // Курс не найден в БД - пробуем загрузить из YAML
      const courseMetadata = getCourseMetadata(courseId);
      if (!courseMetadata) {
        return NextResponse.json(
          {
            error: 'Course not found',
            message: `Course with ID "${courseId}" not found`,
          },
          { status: 404 }
        );
      }

      const courseFilePath = getCourseFilePath(courseId);
      if (!courseFilePath) {
        return NextResponse.json(
          {
            error: 'Course file not found',
            message: `Course file for "${courseId}" not found`,
          },
          { status: 404 }
        );
      }

      courseYaml = loadCourseYaml(courseFilePath);
    }

    // Извлекаем секции из YAML
    const sections: Array<{ elementId: string; title: string }> = [];

    for (const [elementId, elementData] of Object.entries(courseYaml)) {
      if (
        elementData &&
        typeof elementData === 'object' &&
        'type' in elementData &&
        elementData.type === 'section' &&
        'title' in elementData
      ) {
        sections.push({
          elementId,
          title: String(elementData.title || elementId),
        });
      }
    }

    return NextResponse.json({
      sections,
    });
  } catch (error) {
    console.error('Error loading course sections:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
