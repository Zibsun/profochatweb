import { NextRequest, NextResponse } from "next/server";
import { Bot } from "@/lib/types/types";
import { query, queryOne, getAccountId } from "@/lib/db";

/**
 * GET /api/bots/:botId
 * Returns details for a specific bot
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

    const bot = await queryOne<Bot>(
      `SELECT 
        bot_id,
        account_id,
        bot_name,
        bot_token,
        display_name,
        description,
        created_at,
        updated_at,
        is_active,
        settings
      FROM bot
      WHERE bot_id = $1 AND account_id = $2`,
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

    // Маскируем токен для безопасности
    const safeBot = {
      ...bot,
      bot_token: bot.bot_token ? "••••••••••••••••••" : null,
    };

    return NextResponse.json(safeBot);
  } catch (error) {
    console.error("Error loading bot:", error);
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
 * PATCH /api/bots/:botId
 * Updates a bot's settings
 */
export async function PATCH(
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

    // Проверяем существование бота и принадлежность к аккаунту
    const existingBot = await queryOne<{ bot_id: number }>(
      `SELECT bot_id FROM bot WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    if (!existingBot) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Bot not found",
        },
        { status: 404 }
      );
    }

    // Формируем список полей для обновления
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(body.display_name);
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }

    if (body.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(body.settings));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "No fields to update",
        },
        { status: 400 }
      );
    }

    // Добавляем updated_at и параметры для WHERE
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(botIdNum, accountId);

    const result = await query<Bot>(
      `UPDATE bot 
       SET ${updates.join(", ")}
       WHERE bot_id = $${paramIndex} AND account_id = $${paramIndex + 1}
       RETURNING 
         bot_id,
         account_id,
         bot_name,
         bot_token,
         display_name,
         description,
         created_at,
         updated_at,
         is_active,
         settings`,
      values
    );

    const updatedBot = result[0];
    
    // Маскируем токен
    const safeBot = {
      ...updatedBot,
      bot_token: updatedBot.bot_token ? "••••••••••••••••••" : null,
    };

    return NextResponse.json({
      bot: safeBot,
      message: "Bot updated successfully",
    });
  } catch (error) {
    console.error("Error updating bot:", error);
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
 * DELETE /api/bots/:botId
 * Deletes a bot and all related course_deployment records
 */
export async function DELETE(
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

    // Check if bot exists and belongs to account
    const existingBot = await queryOne<{ bot_id: number; bot_name: string }>(
      `SELECT bot_id, bot_name FROM bot WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    if (!existingBot) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Bot not found",
        },
        { status: 404 }
      );
    }

    // Delete related course_deployment records
    // Note: Foreign key constraint with ON DELETE CASCADE should handle this automatically,
    // but we'll do it explicitly for clarity
    await query(
      `DELETE FROM course_deployment WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    // Delete the bot
    await query(
      `DELETE FROM bot WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    return NextResponse.json({
      bot_id: botIdNum,
      message: "Bot deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bot:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
