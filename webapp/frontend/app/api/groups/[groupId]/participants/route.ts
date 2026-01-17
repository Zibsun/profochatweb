import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { GroupParticipant } from "@/lib/types/types";

type ParticipantRow = {
  courseparticipant_id: number;
  course_id: number;
  course_group_id: number;
  invite_link_id: number | null;
  account_id: number;
  chat_id: number | null;
  username: string | null;
  added_at: string;
  added_by: number | null;
  invite_link_token: string | null;
  invite_link_created_at: string | null;
  invite_link_max_uses: number | null;
  invite_link_current_uses: number | null;
  invite_link_is_active: boolean | null;
};

/**
 * GET /api/groups/{group_id}/participants
 * Возвращает список участников группы
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

    // Check if group exists and belongs to account
    const group = await queryOne<{ course_group_id: number }>(
      `SELECT course_group_id
       FROM public.course_group
       WHERE course_group_id = $1 AND account_id = $2`,
      [groupIdNum, accountId]
    );

    if (!group) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const inviteLinkId = searchParams.get("invite_link_id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build WHERE clause
    let whereClause = "cp.course_group_id = $1 AND cp.account_id = $2";
    const queryParams: any[] = [groupIdNum, accountId];
    let paramIndex = 3;

    if (inviteLinkId) {
      if (inviteLinkId === 'null') {
        // Filter for participants without invite_link_id
        whereClause += ` AND cp.invite_link_id IS NULL`;
      } else {
        const inviteLinkIdNum = parseInt(inviteLinkId);
        if (!isNaN(inviteLinkIdNum)) {
          whereClause += ` AND cp.invite_link_id = $${paramIndex}`;
          queryParams.push(inviteLinkIdNum);
          paramIndex++;
        }
      }
    }

    if (search) {
      whereClause += ` AND (
        cp.username ILIKE $${paramIndex} OR
        CAST(cp.chat_id AS TEXT) ILIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM public.courseparticipants cp
       WHERE ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult?.count || "0");

    // Get participants with invite link info
    queryParams.push(limit, (page - 1) * limit);
    const participants = await query<ParticipantRow>(
      `SELECT
        cp.courseparticipant_id,
        cp.course_id,
        cp.course_group_id,
        cp.invite_link_id,
        cp.account_id,
        cp.chat_id,
        cp.username,
        cp.added_at,
        cp.added_by,
        il.token AS invite_link_token,
        il.created_at AS invite_link_created_at,
        il.max_uses AS invite_link_max_uses,
        il.current_uses AS invite_link_current_uses,
        il.is_active AS invite_link_is_active
      FROM public.courseparticipants cp
      LEFT JOIN public.invite_link il ON il.invite_link_id = cp.invite_link_id
      WHERE ${whereClause}
      ORDER BY cp.added_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    );

    const formattedParticipants: GroupParticipant[] = participants.map((p) => ({
      courseparticipant_id: p.courseparticipant_id,
      course_id: p.course_id,
      course_group_id: p.course_group_id,
      invite_link_id: p.invite_link_id,
      account_id: p.account_id,
      chat_id: p.chat_id,
      username: p.username,
      added_at: p.added_at,
      added_by: p.added_by,
      invite_link: p.invite_link_id && p.invite_link_token
        ? {
            invite_link_id: p.invite_link_id,
            token: p.invite_link_token,
            created_at: p.invite_link_created_at!,
            max_uses: p.invite_link_max_uses,
            current_uses: p.invite_link_current_uses || 0,
            is_active: p.invite_link_is_active || false,
          }
        : null,
    }));

    return NextResponse.json({
      participants: formattedParticipants,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error loading participants:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });
    
    // Check if error is about missing columns (migration not applied)
    if (errorMessage.includes("column") && (errorMessage.includes("does not exist") || errorMessage.includes("не существует"))) {
      return NextResponse.json(
        {
          error: "Migration required",
          message: "Database migration 0006 needs to be applied. Missing columns: course_group_id or invite_link_id in courseparticipants table.",
          details: errorMessage,
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/{group_id}/participants
 * Добавляет участника в группу
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
          error: "Invalid group ID",
          message: "Group ID must be a number",
        },
        { status: 400 }
      );
    }

    // Validate input
    if (!body.chat_id && !body.username) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Either chat_id or username must be provided",
        },
        { status: 400 }
      );
    }

    // Check if group exists and get course_id
    const group = await queryOne<{ course_group_id: number; course_id: number }>(
      `SELECT course_group_id, course_id
       FROM public.course_group
       WHERE course_group_id = $1 AND account_id = $2`,
      [groupIdNum, accountId]
    );

    if (!group) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    // Get course_code from course table
    const course = await queryOne<{ course_code: string | null }>(
      `SELECT course_code
       FROM public.course
       WHERE course_id = $1 AND account_id = $2`,
      [group.course_id, accountId]
    );

    const courseCode = course?.course_code || '';

    // Validate invite_link_id if provided
    if (body.invite_link_id !== undefined && body.invite_link_id !== null) {
      const inviteLinkIdNum = parseInt(body.invite_link_id);
      if (!isNaN(inviteLinkIdNum)) {
        const inviteLink = await queryOne<{ invite_link_id: number }>(
          `SELECT invite_link_id
           FROM public.invite_link
           WHERE invite_link_id = $1 AND course_group_id = $2`,
          [inviteLinkIdNum, groupIdNum]
        );

        if (!inviteLink) {
          return NextResponse.json(
            {
              error: "Invalid request",
              message: "Invite link does not belong to this group",
            },
            { status: 400 }
          );
        }
      }
    }

    // Check if participant already exists
    const existing = await queryOne<{ courseparticipant_id: number }>(
      `SELECT courseparticipant_id
       FROM public.courseparticipants
       WHERE course_group_id = $1
         AND account_id = $2
         AND (
           (chat_id IS NOT NULL AND chat_id = $3) OR
           (username IS NOT NULL AND username = $4)
         )`,
      [
        groupIdNum,
        accountId,
        body.chat_id || null,
        body.username || null,
      ]
    );

    if (existing) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Participant already exists in this group",
        },
        { status: 409 }
      );
    }

    // Insert participant
    const result = await query<GroupParticipant>(
      `INSERT INTO public.courseparticipants (
        course_group_id,
        course_id,
        course_code,
        account_id,
        chat_id,
        username,
        invite_link_id,
        added_at,
        added_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, NULL)
      RETURNING
        courseparticipant_id,
        course_id,
        course_group_id,
        invite_link_id,
        account_id,
        chat_id,
        username,
        added_at,
        added_by`,
      [
        groupIdNum,
        group.course_id,
        courseCode,
        accountId,
        body.chat_id || null,
        body.username || null,
        body.invite_link_id || null,
      ]
    );

    if (result.length === 0) {
      throw new Error("Failed to create participant");
    }

    const participant = result[0];

    // Get invite link info if exists
    if (participant.invite_link_id) {
      const inviteLink = await queryOne<{
        token: string;
        created_at: string;
        max_uses: number | null;
        current_uses: number;
        is_active: boolean;
      }>(
        `SELECT token, created_at, max_uses, current_uses, is_active
         FROM public.invite_link
         WHERE invite_link_id = $1`,
        [participant.invite_link_id]
      );

      if (inviteLink) {
        participant.invite_link = {
          invite_link_id: participant.invite_link_id!,
          token: inviteLink.token,
          created_at: inviteLink.created_at,
          max_uses: inviteLink.max_uses,
          current_uses: inviteLink.current_uses,
          is_active: inviteLink.is_active,
        };
      }
    }

    return NextResponse.json(
      {
        participant,
        message: "Participant added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding participant:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
