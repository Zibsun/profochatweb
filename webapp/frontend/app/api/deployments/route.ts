import { NextRequest, NextResponse } from 'next/server';
import { Deployment } from '@/lib/types/types';

/**
 * GET /api/deployments
 * Возвращает список всех развертываний с фильтрацией
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const botId = searchParams.get('bot_id');
    const status = searchParams.get('status'); // 'active' | 'archived' | 'all'
    const search = searchParams.get('search');

    // TODO: Replace with actual database query
    // For now, return mock data
    const mockDeployments: Deployment[] = [
      {
        deployment_id: 1,
        course_id: 'greek_a1',
        account_id: 1,
        bot_id: 1,
        name: 'prod',
        environment: 'prod',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        course: {
          course_id: 'greek_a1',
          title: 'Greek A1',
        },
        bot: {
          bot_id: 1,
          bot_name: 'greek_bot',
          display_name: 'Greek Learning Bot',
        },
        stats: {
          active_runs: 5,
          completed_runs: 12,
        },
      },
      {
        deployment_id: 2,
        course_id: 'greek_a1',
        account_id: 1,
        bot_id: 1,
        name: 'demo',
        environment: 'staging',
        is_active: true,
        created_at: '2024-01-20T10:00:00Z',
        updated_at: '2024-01-20T10:00:00Z',
        course: {
          course_id: 'greek_a1',
          title: 'Greek A1',
        },
        bot: {
          bot_id: 1,
          bot_name: 'greek_bot',
          display_name: 'Greek Learning Bot',
        },
        stats: {
          active_runs: 2,
          completed_runs: 3,
        },
      },
    ];

    // Apply filters
    let filtered = mockDeployments;

    if (courseId) {
      filtered = filtered.filter((d) => d.course_id === courseId);
    }

    if (botId) {
      filtered = filtered.filter((d) => d.bot_id === parseInt(botId));
    }

    if (status && status !== 'all') {
      const isActive = status === 'active';
      filtered = filtered.filter((d) => d.is_active === isActive);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name?.toLowerCase().includes(searchLower) ||
          d.course?.title.toLowerCase().includes(searchLower) ||
          d.bot?.bot_name.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      deployments: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error loading deployments:', error);
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
 * POST /api/deployments
 * Создает новое развертывание
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидация входных данных
    if (!body.course_id || !body.bot_id) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'course_id and bot_id are required',
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database insert
    const newDeployment: Deployment = {
      deployment_id: Date.now(), // Temporary ID
      course_id: body.course_id,
      account_id: 1, // TODO: Get from auth context
      bot_id: body.bot_id,
      name: body.name || body.environment || 'prod',
      environment: body.environment || 'prod',
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: body.settings,
    };

    return NextResponse.json(
      {
        deployment: newDeployment,
        message: 'Deployment created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating deployment:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
