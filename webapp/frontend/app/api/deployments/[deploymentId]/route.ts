import { NextRequest, NextResponse } from 'next/server';
import { Deployment } from '@/lib/types/types';

/**
 * GET /api/deployments/{deployment_id}
 * Возвращает детальную информацию о развертывании
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const deploymentId = parseInt(params.deploymentId);

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
    const mockDeployment: Deployment = {
      deployment_id: deploymentId,
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
    };

    return NextResponse.json({
      deployment: mockDeployment,
    });
  } catch (error) {
    console.error('Error loading deployment:', error);
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
 * PUT /api/deployments/{deployment_id}
 * Обновляет развертывание
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const deploymentId = parseInt(params.deploymentId);
    const body = await request.json();

    if (isNaN(deploymentId)) {
      return NextResponse.json(
        {
          error: 'Invalid deployment ID',
          message: 'Deployment ID must be a number',
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database update
    const updatedDeployment: Deployment = {
      deployment_id: deploymentId,
      course_id: body.course_id || 'greek_a1',
      account_id: 1,
      bot_id: body.bot_id || 1,
      name: body.name,
      environment: body.environment || 'prod',
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: new Date().toISOString(),
      settings: body.settings,
    };

    return NextResponse.json({
      deployment: updatedDeployment,
      message: 'Deployment updated successfully',
    });
  } catch (error) {
    console.error('Error updating deployment:', error);
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
 * DELETE /api/deployments/{deployment_id}
 * Удаляет развертывание (или архивирует)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  try {
    const deploymentId = parseInt(params.deploymentId);

    if (isNaN(deploymentId)) {
      return NextResponse.json(
        {
          error: 'Invalid deployment ID',
          message: 'Deployment ID must be a number',
        },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database delete/archive
    // For now, just return success

    return NextResponse.json({
      message: 'Deployment deleted successfully',
      deployment_id: deploymentId,
    });
  } catch (error) {
    console.error('Error deleting deployment:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
