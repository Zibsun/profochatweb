import { NextRequest, NextResponse } from "next/server";
import { query, getAccountId } from "@/lib/db";

/**
 * GET /api/courses
 * Возвращает список всех курсов
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request);

    const courses = await query<{
      course_id: number;
      course_code: string;
      title: string | null;
      description: string | null;
      creator_id: number | null;
      date_created: string | null;
      updated_at: string | null;
      is_active: boolean;
    }>(
      `SELECT
        course_id,
        course_code,
        title,
        description,
        creator_id,
        date_created,
        updated_at,
        is_active
       FROM public.course
       WHERE account_id = $1
       ORDER BY date_created DESC`,
      [accountId]
    );

    return NextResponse.json({
      courses: courses.map((course) => ({
        course_id: String(course.course_id),
        course_code: course.course_code,
        title: course.title || course.course_code,
        description: course.description || undefined,
        creator_id: course.creator_id ? String(course.creator_id) : undefined,
        is_restricted: false,
        created_at: course.date_created || course.updated_at || new Date().toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error loading courses:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
