import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { Group, InviteLink } from "@/lib/types/types";

type GroupDetailsRow = {
  group_id: number; // course_group.course_group_id
  account_id: number;
  bot_id: number;
  course_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bot_name: string;
  bot_display_name: string | null;
  course_code: string;
  course_title: string | null;
};

function normalizeBotName(botName: string) {
  return botName.startsWith("@") ? botName.slice(1) : botName;
}

/**
 * GET /api/groups/{group_id}
 * Возвращает детальную информацию о группе (course_group) + invites
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
          error: "Invalid group ID",
          message: "Group ID must be a number",
        },
        { status: 400 }
      );
    }

    const groupRow = await queryOne<GroupDetailsRow>(
      `SELECT
        cg.course_group_id AS group_id,
        cg.account_id,
        cg.bot_id,
        cg.course_id,
        cg.name,
        cg.description,
        cg.is_active,
        cg.created_at,
        cg.updated_at,
        b.bot_name,
        b.display_name AS bot_display_name,
        c.course_code,
        c.title AS course_title
      FROM public.course_group cg
      JOIN public.bot b ON b.bot_id = cg.bot_id AND b.account_id = cg.account_id
      JOIN public.course c ON c.course_id = cg.course_id AND c.account_id = cg.account_id
      WHERE cg.course_group_id = $1 AND cg.account_id = $2`,
      [groupIdNum, accountId]
    );

    if (!groupRow) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    const botName = normalizeBotName(groupRow.bot_name);

    const formattedGroup: Group = {
      group_id: groupRow.group_id,
      account_id: groupRow.account_id,
      bot_id: groupRow.bot_id,
      course_id: groupRow.course_id,
      name: groupRow.name,
      description: groupRow.description ?? undefined,
      is_active: groupRow.is_active,
      created_at: groupRow.created_at,
      updated_at: groupRow.updated_at,
      course: {
        course_id: groupRow.course_id,
        course_code: groupRow.course_code,
        title: groupRow.course_title || groupRow.course_code,
      },
      bot: {
        bot_id: groupRow.bot_id,
        bot_name: groupRow.bot_name,
        display_name: groupRow.bot_display_name ?? undefined,
      },
    };

    const inviteRows = await query<{
      invite_link_id: number;
      group_id: number; // course_group_id
      token: string;
      max_uses: number | null;
      current_uses: number;
      expires_at: string | null;
      created_at: string;
      created_by: number | null;
      is_active: boolean;
      metadata: any;
    }>(
      `SELECT
        il.invite_link_id,
        il.course_group_id AS group_id,
        il.token,
        il.max_uses,
        il.current_uses,
        il.expires_at,
        il.created_at,
        il.created_by,
        il.is_active,
        il.metadata
      FROM public.invite_link il
      JOIN public.course_group cg ON cg.course_group_id = il.course_group_id
      WHERE il.course_group_id = $1 AND cg.account_id = $2
      ORDER BY il.created_at DESC`,
      [groupIdNum, accountId]
    );

    const inviteLinks: InviteLink[] = inviteRows.map((r) => ({
      invite_link_id: r.invite_link_id,
      group_id: r.group_id,
      token: r.token,
      max_uses: r.max_uses ?? undefined,
      current_uses: r.current_uses,
      expires_at: r.expires_at ?? undefined,
      created_at: r.created_at,
      created_by: r.created_by ?? undefined,
      is_active: r.is_active,
      metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
      invite_url: `https://t.me/${botName}?start=grp_${groupIdNum}_${r.token}`,
    }));

    return NextResponse.json({
      group: formattedGroup,
      invite_links: inviteLinks,
    });
  } catch (error) {
    console.error("Error loading group:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/{group_id}
 * Update course_group fields: is_active, name, description
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const body = await request.json();
    
    console.log("PATCH /api/groups/[groupId] - Received:", { groupId, groupIdNum, body });

    if (isNaN(groupIdNum)) {
      return NextResponse.json(
        {
          error: "Invalid group ID",
          message: "Group ID must be a number",
        },
        { status: 400 }
      );
    }

    const existingGroup = await queryOne<{
      course_group_id: number;
      bot_id: number;
      course_id: number;
      name: string;
    }>(
      `SELECT course_group_id, bot_id, course_id, name
       FROM public.course_group
       WHERE course_group_id = $1 AND account_id = $2`,
      [groupIdNum, accountId]
    );

    if (!existingGroup) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const nextBotId = body.bot_id !== undefined ? Number(body.bot_id) : existingGroup.bot_id;
    const nextCourseId =
      body.course_id !== undefined ? Number(body.course_id) : existingGroup.course_id;
    const nextName = body.name !== undefined ? body.name : existingGroup.name;

    if (!Number.isFinite(nextBotId) || !Number.isFinite(nextCourseId)) {
      return NextResponse.json(
        { error: "Invalid request", message: "bot_id and course_id must be numbers" },
        { status: 400 }
      );
    }

    if (body.bot_id !== undefined) {
      const botExists = await queryOne<{ bot_id: number }>(
        `SELECT bot_id FROM public.bot WHERE bot_id = $1 AND account_id = $2`,
        [nextBotId, accountId]
      );
      if (!botExists) {
        return NextResponse.json(
          { error: "Not found", message: "Bot not found" },
          { status: 404 }
        );
      }
      updates.push(`bot_id = $${paramIndex++}`);
      values.push(nextBotId);
    }

    if (body.course_id !== undefined) {
      const courseExists = await queryOne<{ course_id: number }>(
        `SELECT course_id FROM public.course WHERE course_id = $1 AND account_id = $2`,
        [nextCourseId, accountId]
      );
      if (!courseExists) {
        return NextResponse.json(
          { error: "Not found", message: "Course not found" },
          { status: 404 }
        );
      }
      updates.push(`course_id = $${paramIndex++}`);
      values.push(nextCourseId);
    }

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(nextName);
    }
    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(body.description);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "No fields to update",
        },
        { status: 400 }
      );
    }

    const duplicate = await queryOne<{ course_group_id: number }>(
      `SELECT course_group_id FROM public.course_group
       WHERE bot_id = $1 AND course_id = $2 AND name = $3 AND account_id = $4
         AND course_group_id != $5`,
      [nextBotId, nextCourseId, nextName, accountId, groupIdNum]
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Group with this name already exists for this bot and course",
        },
        { status: 409 }
      );
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(groupIdNum, accountId);

    const result = await query<Group>(
      `UPDATE public.course_group
       SET ${updates.join(", ")}
       WHERE course_group_id = $${paramIndex++} AND account_id = $${paramIndex++}
       RETURNING
         course_group_id AS group_id,
         account_id,
         bot_id,
         course_id,
         name,
         description,
         is_active,
         created_at,
         updated_at,
         settings`,
      values
    );

    if (result.length === 0) {
      throw new Error("Failed to update group");
    }

    return NextResponse.json({
      group: result[0],
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Backward-compat for old UI code paths (PUT -> PATCH)
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ groupId: string }> }
) {
  return PATCH(request, ctx);
}
