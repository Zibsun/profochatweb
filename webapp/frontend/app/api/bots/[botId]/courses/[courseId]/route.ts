import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";

/**
 * PATCH /api/bots/:botId/courses/:courseId
 * Updates course deployment settings (e.g., is_active)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { botId: string; courseId: string } }
) {
  try {
    const { botId, courseId } = params;
    const accountId = getAccountId(request);
    const botIdNum = parseInt(botId);
    const body = await request.json();

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

    // Проверяем существование деплоймента
    // courseId в URL это course_code, нужно найти course_id
    const course = await queryOne<{ course_id: number }>(
      `SELECT course_id FROM course
      WHERE course_code = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    if (!course) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Course not found",
        },
        { status: 404 }
      );
    }

    const deployment = await queryOne<{ deployment_id: number }>(
      `SELECT deployment_id FROM course_deployment
      WHERE bot_id = $1 AND course_id = $2 AND account_id = $3`,
      [botIdNum, course.course_id, accountId]
    );

    if (!deployment) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Course is not attached to this bot",
        },
        { status: 404 }
      );
    }

    // Обновляем is_active если передан
    if (typeof body.is_active === "boolean") {
      await query(
        `UPDATE course_deployment
        SET is_active = $1, updated_at = CURRENT_TIMESTAMP
        WHERE bot_id = $2 AND course_id = $3 AND account_id = $4`,
        [body.is_active, botIdNum, course.course_id, accountId]
      );
    }

    // Обновляем environment если передан
    if (typeof body.environment === "string" && body.environment.trim() !== "") {
      // Проверяем, не существует ли уже deployment с таким environment
      const existingDeployment = await queryOne<{ deployment_id: number }>(
        `SELECT deployment_id FROM course_deployment
        WHERE bot_id = $1 AND course_id = $2 AND account_id = $3 AND environment = $4`,
        [botIdNum, course.course_id, accountId, body.environment]
      );

      if (existingDeployment && existingDeployment.deployment_id !== deployment.deployment_id) {
        return NextResponse.json(
          {
            error: "Conflict",
            message: `A deployment with environment "${body.environment}" already exists for this course and bot`,
          },
          { status: 409 }
        );
      }

      await query(
        `UPDATE course_deployment
        SET environment = $1, updated_at = CURRENT_TIMESTAMP
        WHERE bot_id = $2 AND course_id = $3 AND account_id = $4`,
        [body.environment, botIdNum, course.course_id, accountId]
      );
    }

    // Получаем обновленный деплоймент
    const updatedDeployment = await queryOne<{
      course_code: string;
      environment: string;
      is_active: boolean;
    }>(
      `SELECT c.course_code, cd.environment, cd.is_active
      FROM course_deployment cd
      JOIN course c ON cd.course_id = c.course_id
      WHERE cd.bot_id = $1 AND cd.course_id = $2 AND cd.account_id = $3`,
      [botIdNum, course.course_id, accountId]
    );

    return NextResponse.json({
      message: "Course deployment updated successfully",
      deployment: {
        course_id: updatedDeployment?.course_code, // Возвращаем course_code для обратной совместимости
        ...updatedDeployment,
      },
    });
  } catch (error) {
    console.error("Error updating course deployment:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

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

    // courseId в URL это course_code, нужно найти course_id
    const course = await queryOne<{ course_id: number }>(
      `SELECT course_id FROM course
      WHERE course_code = $1 AND account_id = $2`,
      [courseId, accountId]
    );

    if (!course) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Course not found",
        },
        { status: 404 }
      );
    }

    // Удаляем деплоймент (открепляем курс от бота) используя INT course_id
    const result = await query<{ deployment_id: number }>(
      `DELETE FROM course_deployment
      WHERE bot_id = $1 AND course_id = $2 AND account_id = $3
      RETURNING deployment_id`,
      [botIdNum, course.course_id, accountId]
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
