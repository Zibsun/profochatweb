import { NextRequest, NextResponse } from "next/server";
import { queryOne, getAccountId } from "@/lib/db";

/**
 * POST /api/bots/:botId/test-connection
 * Tests bot connection by calling Telegram API getMe and checking webhook status
 */
export async function POST(
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

    // Получаем реальный токен бота
    const bot = await queryOne<{ bot_token: string }>(
      `SELECT bot_token
      FROM bot
      WHERE bot_id = $1 AND account_id = $2`,
      [botIdNum, accountId]
    );

    if (!bot || !bot.bot_token) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Bot not found or token is missing",
        },
        { status: 404 }
      );
    }

    const token = bot.bot_token;
    let botApiStatus: "OK" | "ERROR" = "ERROR";
    let webhookStatus: "OK" | "ERROR" = "ERROR";
    let botApiError: string | null = null;
    let webhookError: string | null = null;

    // Тест 1: Проверка Bot API через getMe
    try {
      const getMeResponse = await fetch(
        `https://api.telegram.org/bot${token}/getMe`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (getMeResponse.ok) {
        const getMeData = await getMeResponse.json();
        if (getMeData.ok && getMeData.result) {
          botApiStatus = "OK";
        } else {
          botApiError = getMeData.description || "Invalid response from Telegram API";
        }
      } else {
        const errorData = await getMeResponse.json().catch(() => ({}));
        botApiError = errorData.description || `HTTP ${getMeResponse.status}`;
      }
    } catch (error) {
      botApiError = error instanceof Error ? error.message : "Network error";
    }

    // Тест 2: Проверка вебхука через getWebhookInfo
    try {
      const webhookResponse = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json();
        if (webhookData.ok) {
          // Вебхук считается OK если он настроен и URL валиден
          const webhookInfo = webhookData.result;
          if (webhookInfo.url && webhookInfo.url !== "") {
            webhookStatus = "OK";
          } else {
            webhookError = "Webhook is not set";
            webhookStatus = "ERROR";
          }
        } else {
          webhookError = webhookData.description || "Invalid response";
        }
      } else {
        const errorData = await webhookResponse.json().catch(() => ({}));
        webhookError = errorData.description || `HTTP ${webhookResponse.status}`;
      }
    } catch (error) {
      webhookError = error instanceof Error ? error.message : "Network error";
    }

    return NextResponse.json({
      botApi: botApiStatus,
      webhook: webhookStatus,
      errors: {
        botApi: botApiError,
        webhook: webhookError,
      },
    });
  } catch (error) {
    console.error("Error testing bot connection:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        botApi: "ERROR",
        webhook: "ERROR",
      },
      { status: 500 }
    );
  }
}
