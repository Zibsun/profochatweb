import { NextRequest, NextResponse } from 'next/server';
import { EnrollmentToken } from '@/lib/types/types';

/**
 * GET /api/deployments/{deployment_id}/invite
 * Возвращает токен приглашения для развертывания (или создает новый)
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
    // For now, return mock token or create one if doesn't exist
    const mockToken: EnrollmentToken = {
      token_id: 1,
      deployment_id: deploymentId,
      token: `cd_${deploymentId}_${Math.random().toString(36).substring(2, 15)}`,
      token_type: 'public',
      current_uses: 0,
      created_at: '2024-01-15T10:00:00Z',
      is_active: true,
    };

    return NextResponse.json({
      token: mockToken,
    });
  } catch (error) {
    console.error('Error loading invite token:', error);
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
 * POST /api/deployments/{deployment_id}/invite
 * Создает новый токен приглашения
 */
export async function POST(
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

    // TODO: Replace with actual database insert
    const newToken: EnrollmentToken = {
      token_id: Date.now(),
      deployment_id: deploymentId,
      token: `cd_${deploymentId}_${Math.random().toString(36).substring(2, 15)}`,
      token_type: body.token_type || 'public',
      max_uses: body.max_uses,
      current_uses: 0,
      expires_at: body.expires_at,
      created_at: new Date().toISOString(),
      created_by: 1, // TODO: Get from auth context
      is_active: true,
      metadata: body.metadata,
    };

    return NextResponse.json(
      {
        token: newToken,
        message: 'Invite token created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invite token:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
