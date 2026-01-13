import { NextRequest, NextResponse } from 'next/server';
import { Bot } from '@/lib/types/types';
import { query, getAccountId } from '@/lib/db';

/**
 * GET /api/bots
 * Возвращает список всех ботов для текущего аккаунта
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request);

    const bots = await query<Bot>(
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
      WHERE account_id = $1
      ORDER BY created_at DESC`,
      [accountId]
    );

    // Маскируем токены для безопасности
    const safeBots = bots.map((bot) => ({
      ...bot,
      bot_token: bot.bot_token ? '••••••••••••••••••' : null,
    }));

    return NextResponse.json({
      bots: safeBots,
    });
  } catch (error) {
    console.error('Error loading bots:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bots
 * Создает нового бота
 */
export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId(request);
    const body = await request.json();

    // Валидация
    if (!body.bot_token || !body.bot_name) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'bot_token and bot_name are required',
        },
        { status: 400 }
      );
    }

    // Проверка уникальности bot_name в рамках аккаунта
    const existingBot = await query<{ bot_id: number }>(
      `SELECT bot_id FROM bot 
       WHERE account_id = $1 AND bot_name = $2`,
      [accountId, body.bot_name]
    );

    if (existingBot.length > 0) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: `Bot with name "${body.bot_name}" already exists`,
        },
        { status: 409 }
      );
    }

    // Проверка уникальности bot_token
    const existingToken = await query<{ bot_id: number }>(
      `SELECT bot_id FROM bot WHERE bot_token = $1`,
      [body.bot_token]
    );

    if (existingToken.length > 0) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Bot token already in use',
        },
        { status: 409 }
      );
    }

    // Создание бота
    const result = await query<Bot>(
      `INSERT INTO bot (
        account_id,
        bot_name,
        bot_token,
        display_name,
        description,
        is_active,
        settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
      [
        accountId,
        body.bot_name,
        body.bot_token,
        body.display_name || null,
        body.description || null,
        body.is_active !== undefined ? body.is_active : true,
        body.settings ? JSON.stringify(body.settings) : null,
      ]
    );

    const newBot = result[0];
    
    // Маскируем токен
    const safeBot = {
      ...newBot,
      bot_token: '••••••••••••••••••',
    };

    return NextResponse.json(
      {
        bot: safeBot,
        message: 'Bot created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating bot:', error);
    
    // Обработка ошибок уникальности от PostgreSQL
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'Bot name or token already exists',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
