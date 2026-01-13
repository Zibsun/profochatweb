import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";

interface CourseDeployment {
  course_id: number;  // INT course_id
  course_code: string;  // TEXT course_code
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
        c.course_code,
        c.title,
        cd.environment,
        cd.is_active
      FROM course_deployment cd
      LEFT JOIN course c ON cd.course_id = c.course_id
      WHERE cd.bot_id = $1 AND cd.account_id = $2
      ORDER BY cd.created_at DESC`,
      [botIdNum, accountId]
    );

    // Форматируем результат для фронтенда
    const courses = deployments.map((deployment) => ({
      id: deployment.course_code, // Используем course_code для URL
      course_id: deployment.course_id, // Добавляем INT course_id для внутренних операций
      title: deployment.title || deployment.course_code,
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

    // Логируем входящие данные для отладки
    console.log("Attaching courses:", {
      botId: botIdNum,
      accountId,
      course_ids: body.course_ids,
      environment: body.environment,
    });

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

    // Прикрепляем каждый курс (course_ids содержат course_code)
    for (const courseCode of body.course_ids) {
      try {
        // Проверяем, что курс существует по course_code и принадлежит аккаунту
        let course = await queryOne<{ course_id: number; course_code: string }>(
          `SELECT course_id, course_code FROM course WHERE course_code = $1 AND account_id = $2`,
          [courseCode, accountId]
        );

        // Если не найден по course_code, пробуем найти по старому course_id (обратная совместимость)
        if (!course) {
          // Проверяем, может быть это старый формат где course_id был TEXT
          const oldCourse = await queryOne<{ course_id: any }>(
            `SELECT course_id FROM course WHERE course_id::text = $1 AND account_id = $2`,
            [courseCode, accountId]
          );
          
          if (oldCourse) {
            // Если найден старый курс, используем его course_id как course_code
            course = await queryOne<{ course_id: number; course_code: string }>(
              `SELECT course_id, course_code FROM course WHERE course_id = $1 AND account_id = $2`,
              [oldCourse.course_id, accountId]
            );
          }
        }

        if (!course) {
          console.error(`Course not found: course_code=${courseCode}, account_id=${accountId}`);
          // Проверяем, есть ли вообще курсы в аккаунте
          const anyCourse = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM course WHERE account_id = $1`,
            [accountId]
          );
          console.error(`Total courses in account: ${anyCourse?.count || 0}`);
          
          errors.push({
            course_id: courseCode,
            error: `Course "${courseCode}" not found in account ${accountId}`,
          });
          continue;
        }

        console.log(`Found course: course_code=${course.course_code}, course_id=${course.course_id}`);

        // Проверяем, не прикреплен ли уже курс к этому боту в этом окружении
        const existingDeployment = await queryOne<{ deployment_id: number }>(
          `SELECT deployment_id 
          FROM course_deployment 
          WHERE bot_id = $1 AND course_id = $2 AND account_id = $3 AND environment = $4`,
          [botIdNum, course.course_id, accountId, environment]
        );

        if (existingDeployment) {
          // Курс уже прикреплен, пропускаем
          attachedCourses.push({
            course_id: courseCode, // Возвращаем course_code для обратной совместимости
            deployment_id: existingDeployment.deployment_id,
          });
          continue;
        }

        // Создаем деплоймент используя INT course_id
        const result = await query<{ deployment_id: number; course_id: number }>(
          `INSERT INTO course_deployment (
            course_id,
            course_code,
            account_id,
            bot_id,
            environment,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING deployment_id, course_id`,
          [course.course_id, courseCode, accountId, botIdNum, environment, true]
        );

        if (result.length > 0) {
          attachedCourses.push({
            course_id: courseCode, // Возвращаем course_code для обратной совместимости
            deployment_id: result[0].deployment_id,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error attaching course ${courseCode}:`, error);
        console.error("Error details:", {
          courseCode,
          accountId,
          botId: botIdNum,
          environment,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        errors.push({
          course_id: courseCode,
          error: errorMessage,
        });
      }
    }

    if (errors.length > 0 && attachedCourses.length === 0) {
      const errorMessages = errors.map(e => `Course "${e.course_id}": ${e.error}`).join("; ");
      return NextResponse.json(
        {
          error: "Failed to attach courses",
          message: errorMessages,
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
