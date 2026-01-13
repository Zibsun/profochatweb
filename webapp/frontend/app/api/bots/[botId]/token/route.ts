import { NextRequest, NextResponse } from "next/server";
import { queryOne, getAccountId } from "@/lib/db";

/**
 * GET /api/bots/:botId/token
 * Returns the unmasked bot token (for authorized users only)
 * 
 * WARNING: This endpoint should be protected with authentication
 * and only accessible to authorized users who own the bot.
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

    // TODO: Add authentication check here
    // Only allow users who own the bot to see the token

    const bot = await queryOne<{ bot_token: string }>(
      `SELECT bot_token
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

    return NextResponse.json({
      token: bot.bot_token,
    });
  } catch (error) {
    console.error("Error loading bot token:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
