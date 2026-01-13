import { NextRequest, NextResponse } from 'next/server';
import { Run } from '@/lib/types/types';

/**
 * GET /api/deployments/{deployment_id}/runs
 * Возвращает список сессий (runs) для развертывания
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const deploymentId = parseInt(params.deploymentId);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'all' | 'active' | 'completed'

    if (isNaN(deploymentId)) {
      return NextResponse.json(
        {
          error: 'Invalid deployment ID',
          message: 'Deployment ID must be a number',
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database query
    // For now, return mock data
    const mockRuns: Run[] = [
      {
        run_id: 1,
        deployment_id: deploymentId,
        account_id: 1,
        bot_id: 1,
        chat_id: 123456789,
        username: 'student1',
        course_id: 'greek_a1',
        date_inserted: '2024-01-20T10:00:00Z',
        is_active: true,
        is_ended: false,
      },
      {
        run_id: 2,
        deployment_id: deploymentId,
        account_id: 1,
        bot_id: 1,
        chat_id: 987654321,
        username: 'student2',
        course_id: 'greek_a1',
        date_inserted: '2024-01-19T15:30:00Z',
        is_active: false,
        is_ended: true,
        ended_at: '2024-01-25T12:00:00Z',
      },
      {
        run_id: 3,
        deployment_id: deploymentId,
        account_id: 1,
        bot_id: 1,
        chat_id: 555666777,
        username: 'student3',
        course_id: 'greek_a1',
        date_inserted: '2024-01-22T09:15:00Z',
        is_active: true,
        is_ended: false,
      },
    ];

    // Apply status filter
    let filtered = mockRuns;
    if (status === 'active') {
      filtered = filtered.filter((r) => r.is_active && !r.is_ended);
    } else if (status === 'completed') {
      filtered = filtered.filter((r) => r.is_ended);
    }

    // Sort by date_inserted (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date_inserted).getTime();
      const dateB = new Date(b.date_inserted).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      runs: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error loading runs:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
