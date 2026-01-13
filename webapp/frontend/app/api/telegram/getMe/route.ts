import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/telegram/getMe
 * Validates a Telegram bot token by calling Telegram's getMe API
 * 
 * This is a mock implementation. In production, this should:
 * 1. Call Telegram Bot API: https://api.telegram.org/bot{token}/getMe
 * 2. Handle rate limiting and errors properly
 * 3. Cache results if needed
 * 4. Validate token format before making the API call
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Basic token format validation
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token.trim())) {
      return NextResponse.json(
        { error: "Invalid token format" },
        { status: 400 }
      );
    }

    // Call Telegram Bot API
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token.trim()}/getMe`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData.description || "Invalid token. Make sure you copied it entirely from BotFather.",
        },
        { status: 400 }
      );
    }

    const telegramData = await telegramResponse.json();
    
    if (!telegramData.ok || !telegramData.result) {
      return NextResponse.json(
        {
          error: "Invalid response from Telegram API",
        },
        { status: 500 }
      );
    }

    const botInfo = telegramData.result;

    // Получаем фото бота (опционально)
    let photoUrl: string | undefined;
    try {
      const photoResponse = await fetch(
        `https://api.telegram.org/bot${token.trim()}/getUserProfilePhotos?user_id=${botInfo.id}&limit=1`
      );
      if (photoResponse.ok) {
        const photoData = await photoResponse.json();
        if (photoData.ok && photoData.result?.photos?.[0]?.[0]?.file_id) {
          const fileId = photoData.result.photos[0][0].file_id;
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${token.trim()}/getFile?file_id=${fileId}`
          );
          if (fileResponse.ok) {
            const fileData = await fileResponse.json();
            if (fileData.ok && fileData.result?.file_path) {
              photoUrl = `https://api.telegram.org/file/bot${token.trim()}/${fileData.result.file_path}`;
            }
          }
        }
      }
    } catch (photoError) {
      // Игнорируем ошибки получения фото
      console.warn("Failed to fetch bot photo:", photoError);
    }

    return NextResponse.json({
      bot: {
        id: botInfo.id,
        is_bot: botInfo.is_bot,
        first_name: botInfo.first_name,
        username: botInfo.username,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries,
        photo_url: photoUrl,
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      {
        error: "Network error. Please check your connection and try again.",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
