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

    // Получаем список курсов, которые уже прикреплены к боту
    const connectedDeployments = await query<{ course_id: string }>(
      `SELECT DISTINCT course_id
      FROM course_deployment
      WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    const connectedCourseIds = new Set(connectedDeployments.map((d) => d.course_id));

    // Получаем все курсы аккаунта
    const allCourses = await query<{
      course_id: string;
      title?: string;
      description?: string;
      date_created?: string;
      updated_at?: string;
    }>(
      `SELECT 
        course_id,
        title,
        description,
        date_created,
        updated_at
      FROM course
      WHERE account_id = $1
      ORDER BY updated_at DESC NULLS LAST, date_created DESC`,
      [accountId]
    );

    // Фильтруем курсы, которые еще не прикреплены к боту
    const availableCourses = allCourses.filter(
      (course) => !connectedCourseIds.has(course.course_id)
    );

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
