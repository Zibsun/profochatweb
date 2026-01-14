import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { InviteLink } from "@/lib/types/types";

function normalizeBotName(botName: string) {
  return botName.startsWith("@") ? botName.slice(1) : botName;
}

/**
 * GET /api/groups/{group_id}/invites/{invite_link_id}
 * Возвращает детали пригласительной ссылки
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; inviteLinkId: string }> }
) {
  try {
    const { groupId, inviteLinkId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const inviteLinkIdNum = parseInt(inviteLinkId);

    if (isNaN(groupIdNum) || isNaN(inviteLinkIdNum)) {
      return NextResponse.json(
        {
          error: 'Invalid ID',
          message: 'Group ID and Invite Link ID must be numbers',
        },
        { status: 400 }
      );
    }

    const group = await queryOne<{ group_id: number; bot_name: string }>(
      `SELECT cg.course_group_id AS group_id, b.bot_name
       FROM public.course_group cg
       JOIN public.bot b ON b.bot_id = cg.bot_id AND b.account_id = cg.account_id
       WHERE cg.course_group_id = $1 AND cg.account_id = $2`,
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

    const inviteLink = await queryOne<InviteLink & { metadata: any }>(
      `SELECT
         invite_link_id,
         course_group_id AS group_id,
         token,
         max_uses,
         current_uses,
         expires_at,
         created_at,
         created_by,
         is_active,
         metadata
       FROM public.invite_link
       WHERE invite_link_id = $1 AND course_group_id = $2`,
      [inviteLinkIdNum, groupIdNum]
    );

    if (!inviteLink) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Invite link not found',
        },
        { status: 404 }
      );
    }

    const botName = normalizeBotName(group.bot_name);
    const inviteUrl = `https://t.me/${botName}?start=grp_${groupIdNum}_${inviteLink.token}`;

    return NextResponse.json({
      invite_link: {
        ...inviteLink,
        metadata: typeof inviteLink.metadata === 'string' 
          ? JSON.parse(inviteLink.metadata) 
          : inviteLink.metadata,
        invite_url: inviteUrl,
      },
    });
  } catch (error) {
    console.error('Error loading invite link:', error);
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
 * PUT /api/groups/{group_id}/invites/{invite_link_id}
 * Обновляет пригласительную ссылку
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; inviteLinkId: string }> }
) {
  try {
    const { groupId, inviteLinkId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const inviteLinkIdNum = parseInt(inviteLinkId);
    const body = await request.json();

    if (isNaN(groupIdNum) || isNaN(inviteLinkIdNum)) {
      return NextResponse.json(
        {
          error: 'Invalid ID',
          message: 'Group ID and Invite Link ID must be numbers',
        },
        { status: 400 }
      );
    }

    const group = await queryOne<{ group_id: number }>(
      `SELECT course_group_id AS group_id FROM public.course_group WHERE course_group_id = $1 AND account_id = $2`,
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

    // Check if invite link exists
    const existingLink = await queryOne<{ invite_link_id: number }>(
      `SELECT invite_link_id FROM public.invite_link 
       WHERE invite_link_id = $1 AND course_group_id = $2`,
      [inviteLinkIdNum, groupIdNum]
    );

    if (!existingLink) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Invite link not found',
        },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.max_uses !== undefined) {
      updates.push(`max_uses = $${paramIndex++}`);
      values.push(body.max_uses);
    }
    if (body.expires_at !== undefined) {
      updates.push(`expires_at = $${paramIndex++}`);
      values.push(body.expires_at);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }
    if (body.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(body.metadata));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'No fields to update',
        },
        { status: 400 }
      );
    }

    values.push(inviteLinkIdNum, groupIdNum);

    const result = await query<InviteLink>(
      `UPDATE public.invite_link 
       SET ${updates.join(', ')}
       WHERE invite_link_id = $${paramIndex++} AND course_group_id = $${paramIndex++}
       RETURNING
         invite_link_id,
         course_group_id AS group_id,
         token,
         max_uses,
         current_uses,
         expires_at,
         created_at,
         created_by,
         is_active,
         metadata`,
      values
    );

    if (result.length === 0) {
      throw new Error('Failed to update invite link');
    }

    return NextResponse.json({
      invite_link: {
        ...result[0],
        metadata: typeof result[0].metadata === 'string' 
          ? JSON.parse(result[0].metadata) 
          : result[0].metadata,
      },
      message: 'Invite link updated successfully',
    });
  } catch (error) {
    console.error('Error updating invite link:', error);
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
 * DELETE /api/groups/{group_id}/invites/{invite_link_id}
 * Удаляет пригласительную ссылку
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; inviteLinkId: string }> }
) {
  try {
    const { groupId, inviteLinkId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const inviteLinkIdNum = parseInt(inviteLinkId);

    if (isNaN(groupIdNum) || isNaN(inviteLinkIdNum)) {
      return NextResponse.json(
        {
          error: 'Invalid ID',
          message: 'Group ID and Invite Link ID must be numbers',
        },
        { status: 400 }
      );
    }

    const group = await queryOne<{ group_id: number }>(
      `SELECT course_group_id AS group_id FROM public.course_group WHERE course_group_id = $1 AND account_id = $2`,
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

    // Delete invite link
    await query(
      `DELETE FROM public.invite_link 
       WHERE invite_link_id = $1 AND course_group_id = $2`,
      [inviteLinkIdNum, groupIdNum]
    );

    return NextResponse.json({
      message: 'Invite link deleted successfully',
      invite_link_id: inviteLinkIdNum,
    });
  } catch (error) {
    console.error('Error deleting invite link:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
