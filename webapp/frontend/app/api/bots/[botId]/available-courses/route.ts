import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";

/**
 * GET /api/bots/:botId/available-courses
 * Returns list of courses that are not yet attached to the bot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const { botId } = params;
    const accountId = getAccountId(request);
    const botIdNum = parseInt(botId);

    if (isNaN(botIdNum)) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "botId must be a number",
        },
        { status: 400 }
      );
    }

    // Проверяем существование бота
    const bot = await queryOne<{ bot_id: number }>(
      `SELECT bot_id FROM bot WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    if (!bot) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Bot not found",
        },
        { status: 404 }
      );
    }

    // Получаем список курсов, которые уже прикреплены к боту (используем INT course_id)
    const connectedDeployments = await query<{ course_id: number }>(
      `SELECT DISTINCT course_id
      FROM course_deployment
      WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    const connectedCourseIds = new Set(connectedDeployments.map((d) => d.course_id));

    // Получаем все курсы аккаунта (используем новую схему с course_code и course_id)
    const allCourses = await query<{
      course_id: number;
      course_code: string;
      title?: string;
      description?: string;
      date_created?: string;
      updated_at?: string;
    }>(
      `SELECT 
        course_id,
        course_code,
        title,
        description,
        date_created,
        updated_at
      FROM course
      WHERE account_id = $1
      ORDER BY updated_at DESC NULLS LAST, date_created DESC`,
      [accountId]
    );

    // Фильтруем курсы, которые еще не прикреплены к боту (используем INT course_id)
    const availableCourses = allCourses
      .filter((course) => !connectedCourseIds.has(course.course_id))
      .map((course) => ({
        course_id: course.course_code, // Возвращаем course_code для обратной совместимости
        course_code: course.course_code,
        course_id_int: course.course_id,
        title: course.title,
        description: course.description,
        date_created: course.date_created,
        updated_at: course.updated_at,
      }));

    return NextResponse.json({
      courses: availableCourses,
    });
  } catch (error) {
    console.error("Error loading available courses:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
