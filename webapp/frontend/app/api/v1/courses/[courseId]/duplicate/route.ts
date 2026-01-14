import { NextRequest, NextResponse } from 'next/server';
import { query, getAccountId } from '@/lib/db';
import {
  getCourseFromDB,
  getCourseElementsFromDB,
  saveCourseToDB,
  courseExistsInDB,
} from '@/lib/course-editor/db-utils';
import { elementsToYaml } from '@/lib/course-editor/db-utils';

/**
 * POST /api/v1/courses/[courseId]/duplicate
 * Creates a duplicate of a course with all elements
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseCode = params.courseId; // course_code from URL
    const accountId = getAccountId(request);

    // Get original course
    const originalCourse = await getCourseFromDB(courseCode, accountId);

    if (!originalCourse) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course "${courseCode}" not found`,
        },
        { status: 404 }
      );
    }

    // Get original course elements
    const originalElements = await getCourseElementsFromDB(originalCourse.course_id, accountId);

    // Convert elements to YAML
    const yamlContent = elementsToYaml(originalElements);

    // Generate new course code with (Copy) suffix
    let newCourseCode = `${originalCourse.course_code} (Copy)`;
    let copyNumber = 1;

    // Check if course with this name already exists, increment number if needed
    while (await courseExistsInDB(newCourseCode, accountId)) {
      copyNumber++;
      newCourseCode = `${originalCourse.course_code} (Copy ${copyNumber})`;
    }

    // Get original metadata
    const metadata = originalCourse.metadata || {};

    // Generate title for the copy
    let newTitle: string | undefined;
    if (originalCourse.title) {
      newTitle = copyNumber === 1 
        ? `${originalCourse.title} (Copy)`
        : `${originalCourse.title} (Copy ${copyNumber})`;
    }

    // Create new course
    await saveCourseToDB(
      newCourseCode,
      accountId,
      yamlContent,
      {
        element: metadata.element,
        restricted: metadata.restricted,
        decline_text: metadata.decline_text,
        ban_enabled: metadata.ban_enabled,
        ban_text: metadata.ban_text,
      },
      newTitle,
      originalCourse.description || undefined
    );

    // Get the newly created course
    const newCourse = await getCourseFromDB(newCourseCode, accountId);

    if (!newCourse) {
      throw new Error('Failed to retrieve created course');
    }

    return NextResponse.json({
      course_id: newCourse.course_code,
      course_code: newCourse.course_code,
      course_id_int: newCourse.course_id,
      title: newCourse.title,
      message: 'Course duplicated successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error duplicating course:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
