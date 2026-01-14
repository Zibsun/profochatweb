import { NextRequest, NextResponse } from 'next/server';
import { query, getAccountId } from '@/lib/db';
import { getCourseFromDB } from '@/lib/course-editor/db-utils';

/**
 * DELETE /api/v1/courses/[courseId]
 * Deletes a course with deployment check
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseCode = params.courseId; // course_code from URL
    const accountId = getAccountId(request);

    // Get course from database
    const dbCourse = await getCourseFromDB(courseCode, accountId);

    if (!dbCourse) {
      return NextResponse.json(
        {
          error: 'Course not found',
          message: `Course "${courseCode}" not found`,
        },
        { status: 404 }
      );
    }

    // Check if course has any deployments
    const deployments = await query<{ deployment_id: number; bot_name: string }>(
      `SELECT cd.deployment_id, b.bot_name
       FROM course_deployment cd
       INNER JOIN bot b ON cd.bot_id = b.bot_id
       WHERE cd.course_id = $1 AND cd.account_id = $2`,
      [dbCourse.course_id, accountId]
    );

    if (deployments.length > 0) {
      const botNames = deployments.map((d) => d.bot_name).join(', ');
      return NextResponse.json(
        {
          error: 'Cannot delete course',
          message: `Cannot delete course. This course is connected to one or more bots: ${botNames}. Please remove all deployments before deleting the course.`,
          bots: deployments.map((d) => d.bot_name),
        },
        { status: 400 }
      );
    }

    // Delete course elements
    await query(
      `DELETE FROM course_element
       WHERE course_id = $1 AND account_id = $2`,
      [dbCourse.course_id, accountId]
    );

    // Delete course
    await query(
      `DELETE FROM course
       WHERE course_id = $1 AND account_id = $2`,
      [dbCourse.course_id, accountId]
    );

    return NextResponse.json({
      course_id: courseCode,
      message: 'Course deleted successfully',
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
