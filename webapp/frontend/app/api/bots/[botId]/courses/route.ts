import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";

interface CourseDeployment {
  course_id: string;
  title?: string;
  environment: string;
  is_active: boolean;
}

/**
 * GET /api/bots/:botId/courses
 * Returns list of courses connected to a bot
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

    // Проверяем существование бота и принадлежность к аккаунту
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

    // Получаем курсы, связанные с ботом через course_deployment
    const deployments = await query<CourseDeployment>(
      `SELECT 
        cd.course_id,
        c.title,
        cd.environment,
        cd.is_active
      FROM course_deployment cd
      LEFT JOIN course c ON cd.course_id = c.course_id AND cd.account_id = c.account_id
      WHERE cd.bot_id = $1 AND cd.account_id = $2
      ORDER BY cd.created_at DESC`,
      [botIdNum, accountId]
    );

    // Форматируем результат для фронтенда
    const courses = deployments.map((deployment) => ({
      id: deployment.course_id,
      title: deployment.title || deployment.course_id,
      environment: deployment.environment,
      is_active: deployment.is_active,
    }));

    return NextResponse.json({
      courses,
    });
  } catch (error) {
    console.error("Error loading bot courses:", error);
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
 * POST /api/bots/:botId/courses
 * Attaches one or more courses to a bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } }
) {
  try {
    const { botId } = params;
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

    if (!body.course_ids || !Array.isArray(body.course_ids) || body.course_ids.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "course_ids must be a non-empty array",
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

    const environment = body.environment || "prod";
    const attachedCourses: Array<{ course_id: string; deployment_id: number }> = [];
    const errors: Array<{ course_id: string; error: string }> = [];

    // Прикрепляем каждый курс
    for (const courseId of body.course_ids) {
      try {
        // Проверяем, что курс существует и принадлежит аккаунту
        const course = await queryOne<{ course_id: string }>(
          `SELECT course_id FROM course WHERE course_id = $1 AND account_id = $2`,
          [courseId, accountId]
        );

        if (!course) {
          errors.push({
            course_id: courseId,
            error: "Course not found",
          });
          continue;
        }

        // Проверяем, не прикреплен ли уже курс к этому боту в этом окружении
        const existingDeployment = await queryOne<{ deployment_id: number }>(
          `SELECT deployment_id 
          FROM course_deployment 
          WHERE bot_id = $1 AND course_id = $2 AND account_id = $3 AND environment = $4`,
          [botIdNum, courseId, accountId, environment]
        );

        if (existingDeployment) {
          // Курс уже прикреплен, пропускаем
          attachedCourses.push({
            course_id: courseId,
            deployment_id: existingDeployment.deployment_id,
          });
          continue;
        }

        // Создаем деплоймент
        const result = await query<{ deployment_id: number; course_id: string }>(
          `INSERT INTO course_deployment (
            course_id,
            account_id,
            bot_id,
            environment,
            is_active
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING deployment_id, course_id`,
          [courseId, accountId, botIdNum, environment, true]
        );

        if (result.length > 0) {
          attachedCourses.push({
            course_id: result[0].course_id,
            deployment_id: result[0].deployment_id,
          });
        }
      } catch (error) {
        console.error(`Error attaching course ${courseId}:`, error);
        errors.push({
          course_id: courseId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (errors.length > 0 && attachedCourses.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to attach courses",
          errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Successfully attached ${attachedCourses.length} course(s)`,
      attached: attachedCourses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error attaching courses:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
