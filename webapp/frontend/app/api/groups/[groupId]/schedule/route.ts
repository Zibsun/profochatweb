import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, getAccountId } from '@/lib/db';
import { Schedule } from '@/lib/types/types';

/**
 * GET /api/groups/{group_id}/schedule
 * Возвращает расписание группы
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

    // Check if group exists and belongs to account
    const group = await queryOne<{ course_group_id: number }>(
      `SELECT course_group_id FROM course_group WHERE course_group_id = $1 AND account_id = $2`,
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

    // Get schedule
    const schedule = await queryOne<Schedule & {
      schedule_config: string;
      course_group_id: number;
    }>(
      `SELECT * FROM schedule WHERE course_group_id = $1 AND is_active = true LIMIT 1`,
      [groupIdNum]
    );

    if (!schedule) {
      return NextResponse.json({
        schedule: null,
      });
    }

    // Безопасный парсинг schedule_config
    let scheduleConfig: any = {};
    try {
      if (typeof schedule.schedule_config === 'string') {
        scheduleConfig = JSON.parse(schedule.schedule_config);
      } else if (schedule.schedule_config) {
        scheduleConfig = schedule.schedule_config;
      }
    } catch (parseError) {
      console.error('Error parsing schedule_config:', parseError);
      scheduleConfig = {};
    }

    const formattedSchedule: Schedule = {
      schedule_id: schedule.schedule_id,
      group_id: schedule.course_group_id, // Используем course_group_id как group_id
      schedule_type: schedule.schedule_type as 'weekly' | 'daily' | 'custom',
      schedule_config: scheduleConfig,
      is_active: schedule.is_active,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
    };

    return NextResponse.json({
      schedule: formattedSchedule,
    });
  } catch (error) {
    console.error('Error loading schedule:', error);
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
 * POST /api/groups/{group_id}/schedule
 * Создает или обновляет расписание группы
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const body = await request.json();

    if (isNaN(groupIdNum)) {
      return NextResponse.json(
        {
          error: 'Invalid group ID',
          message: 'Group ID must be a number',
        },
        { status: 400 }
      );
    }

    // Validate request body
    if (!body.schedule_type || !body.schedule_config) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'schedule_type and schedule_config are required',
        },
        { status: 400 }
      );
    }

    if (!['weekly', 'daily', 'custom'].includes(body.schedule_type)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'schedule_type must be one of: weekly, daily, custom',
        },
        { status: 400 }
      );
    }

    // Check if group exists and belongs to account
    const group = await queryOne<{ course_group_id: number }>(
      `SELECT course_group_id FROM course_group WHERE course_group_id = $1 AND account_id = $2`,
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

    // Check if schedule already exists
    const existingSchedule = await queryOne<{ schedule_id: number }>(
      `SELECT schedule_id FROM schedule WHERE course_group_id = $1`,
      [groupIdNum]
    );

    let result;
    if (existingSchedule) {
      // Update existing schedule
      result = await query<Schedule & { course_group_id: number }>(
        `UPDATE schedule 
         SET schedule_type = $1,
             schedule_config = $2,
             is_active = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE course_group_id = $4
         RETURNING *`,
        [
          body.schedule_type,
          JSON.stringify(body.schedule_config),
          body.is_active !== undefined ? body.is_active : true,
          groupIdNum,
        ]
      );
    } else {
      // Create new schedule
      result = await query<Schedule & { course_group_id: number }>(
        `INSERT INTO schedule (
          course_group_id,
          schedule_type,
          schedule_config,
          is_active
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          groupIdNum,
          body.schedule_type,
          JSON.stringify(body.schedule_config),
          body.is_active !== undefined ? body.is_active : true,
        ]
      );
    }

    if (result.length === 0) {
      throw new Error('Failed to save schedule');
    }

    const schedule = result[0];
    
    // Безопасный парсинг schedule_config
    let scheduleConfig: any = {};
    try {
      if (typeof schedule.schedule_config === 'string') {
        scheduleConfig = JSON.parse(schedule.schedule_config);
      } else if (schedule.schedule_config) {
        scheduleConfig = schedule.schedule_config;
      }
    } catch (parseError) {
      console.error('Error parsing schedule_config:', parseError);
      scheduleConfig = {};
    }

    const formattedSchedule: Schedule = {
      schedule_id: schedule.schedule_id,
      group_id: schedule.course_group_id, // Используем course_group_id как group_id
      schedule_type: schedule.schedule_type as 'weekly' | 'daily' | 'custom',
      schedule_config: scheduleConfig,
      is_active: schedule.is_active,
      created_at: schedule.created_at,
      updated_at: schedule.updated_at,
    };

    return NextResponse.json({
      schedule: formattedSchedule,
      message: existingSchedule ? 'Schedule updated successfully' : 'Schedule created successfully',
    });
  } catch (error) {
    console.error('Error saving schedule:', error);
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
 * DELETE /api/groups/{group_id}/schedule
 * Удаляет расписание группы
 */
export async function DELETE(
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

    // Check if group exists and belongs to account
    const group = await queryOne<{ course_group_id: number }>(
      `SELECT course_group_id FROM course_group WHERE course_group_id = $1 AND account_id = $2`,
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

    // Delete schedule
    await query(
      `DELETE FROM schedule WHERE course_group_id = $1`,
      [groupIdNum]
    );

    return NextResponse.json({
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
