import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";

/**
 * DELETE /api/bots/:botId/courses/:courseId
 * Detaches a course from a bot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { botId: string; courseId: string } }
) {
  try {
    const { botId, courseId } = params;
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

    // Удаляем деплоймент (открепляем курс от бота)
    const result = await query<{ deployment_id: number }>(
      `DELETE FROM course_deployment
      WHERE bot_id = $1 AND course_id = $2 AND account_id = $3
      RETURNING deployment_id`,
      [botIdNum, courseId, accountId]
    );

    if (result.length === 0) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Course is not attached to this bot",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Course detached successfully",
      deployment_id: result[0].deployment_id,
    });
  } catch (error) {
    console.error("Error detaching course:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
