import { NextRequest, NextResponse } from 'next/server';
import { query, getAccountId } from '@/lib/db';
import { getCoursesFromDB } from '@/lib/course-editor/db-utils';

interface CourseWithBots {
  course_id: number;
  course_code: string;
  title?: string;
  description?: string;
  bots: Array<{
    bot_id: number;
    bot_name: string;
    display_name?: string;
  }>;
}

/**
 * GET /api/v1/courses
 * Returns list of courses with connected bots information
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request);

    // Get all courses from database
    const dbCourses = await getCoursesFromDB(accountId);

    // Get deployments with bot information for each course
    const coursesWithBots: CourseWithBots[] = await Promise.all(
      dbCourses.map(async (course) => {
        // Get bots connected to this course through deployments
        const deployments = await query<{
          bot_id: number;
          bot_name: string;
          display_name?: string;
        }>(
          `SELECT DISTINCT 
            b.bot_id,
            b.bot_name,
            b.display_name
          FROM course_deployment cd
          INNER JOIN bot b ON cd.bot_id = b.bot_id
          WHERE cd.course_id = $1 AND cd.account_id = $2 AND b.account_id = $2
          ORDER BY b.bot_name`,
          [course.course_id, accountId]
        );

        return {
          course_id: course.course_id,
          course_code: course.course_code,
          title: course.title,
          description: course.description,
          bots: deployments.map((d) => ({
            bot_id: d.bot_id,
            bot_name: d.bot_name,
            display_name: d.display_name,
          })),
        };
      })
    );

    return NextResponse.json({
      courses: coursesWithBots,
    });
  } catch (error) {
    console.error('Error loading courses:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
