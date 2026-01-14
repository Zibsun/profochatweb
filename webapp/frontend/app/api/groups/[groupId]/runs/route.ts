import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, getAccountId } from '@/lib/db';
import { Run } from '@/lib/types/types';

/**
 * GET /api/groups/{group_id}/runs
 * Возвращает список сессий (runs) группы
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);

    if (isNaN(groupIdNum)) {
      return NextResponse.json(
        {
          error: 'Invalid group ID',
          message: 'Group ID must be a number',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'all' | 'active' | 'completed'

    // Check if group exists and belongs to account
    const group = await queryOne<{ group_id: number }>(
      `SELECT group_id FROM "group" WHERE group_id = $1 AND account_id = $2`,
      [groupIdNum, accountId]
    );

    if (!group) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Group not found',
        },
        { status: 404 }
      );
    }

    // Build query with optional status filter
    let whereClause = 'r.group_id = $1';
    const queryParams: any[] = [groupIdNum];

    if (status === 'active') {
      whereClause += ' AND r.is_active = true AND (r.is_ended IS NULL OR r.is_ended = false)';
    } else if (status === 'completed') {
      whereClause += ' AND r.is_ended = true';
    }

    // Get runs
    const runs = await query<Run>(
      `SELECT 
        r.run_id,
        r.group_id,
        r.account_id,
        r.bot_id,
        r.chat_id,
        r.username,
        r.course_id,
        r.invite_link_id,
        r.date_inserted,
        r.utm_source,
        r.utm_medium,
        r.utm_campaign,
        r.utm_term,
        r.utm_content,
        r.is_ended,
        r.is_active,
        r.ended_at,
        r.metadata
      FROM run r
      WHERE ${whereClause}
      ORDER BY r.date_inserted DESC`,
      queryParams
    );

    return NextResponse.json({
      runs: runs.map((r) => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      })),
      total: runs.length,
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
