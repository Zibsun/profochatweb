import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { GroupParticipant } from "@/lib/types/types";

/**
 * POST /api/groups/{group_id}/participants/{participant_id}/transfer
 * Переносит участника в другую группу
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; participantId: string }> }
) {
  try {
    const { groupId, participantId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const participantIdNum = parseInt(participantId);
    const body = await request.json();

    if (isNaN(groupIdNum) || isNaN(participantIdNum)) {
      return NextResponse.json(
        {
          error: "Invalid ID",
          message: "Group ID and Participant ID must be numbers",
        },
        { status: 400 }
      );
    }

    if (!body.target_group_id) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "target_group_id is required",
        },
        { status: 400 }
      );
    }

    const targetGroupIdNum = parseInt(body.target_group_id);
    if (isNaN(targetGroupIdNum)) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "target_group_id must be a number",
        },
        { status: 400 }
      );
    }

    // Check if participant exists and belongs to source group
    const participant = await queryOne<{
      courseparticipant_id: number;
      course_group_id: number;
      course_id: number;
      account_id: number;
      chat_id: number | null;
      username: string | null;
    }>(
      `SELECT
        courseparticipant_id,
        course_group_id,
        course_id,
        account_id,
        chat_id,
        username
       FROM public.courseparticipants
       WHERE courseparticipant_id = $1 AND account_id = $2`,
      [participantIdNum, accountId]
    );

    if (!participant) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Participant not found",
        },
        { status: 404 }
      );
    }

    if (participant.course_group_id !== groupIdNum) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Participant does not belong to this group",
        },
        { status: 400 }
      );
    }

    // Check if target group exists and belongs to same account
    const targetGroup = await queryOne<{
      course_group_id: number;
      course_id: number;
      account_id: number;
    }>(
      `SELECT course_group_id, course_id, account_id
       FROM public.course_group
       WHERE course_group_id = $1 AND account_id = $2`,
      [targetGroupIdNum, accountId]
    );

    if (!targetGroup) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Target group not found",
        },
        { status: 404 }
      );
    }

    // Get course_code from course table
    const course = await queryOne<{ course_code: string | null }>(
      `SELECT course_code
       FROM public.course
       WHERE course_id = $1 AND account_id = $2`,
      [targetGroup.course_id, accountId]
    );

    const courseCode = course?.course_code || '';

    // Check if participant already exists in target group
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
        targetGroupIdNum,
        accountId,
        participant.chat_id,
        participant.username,
      ]
    );

    if (existing) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Participant already exists in target group",
        },
        { status: 409 }
      );
    }

    // Validate invite_link_id if provided
    if (body.invite_link_id !== undefined && body.invite_link_id !== null) {
      const inviteLinkIdNum = parseInt(body.invite_link_id);
      if (!isNaN(inviteLinkIdNum)) {
        const inviteLink = await queryOne<{ invite_link_id: number }>(
          `SELECT invite_link_id
           FROM public.invite_link
           WHERE invite_link_id = $1 AND course_group_id = $2`,
          [inviteLinkIdNum, targetGroupIdNum]
        );

        if (!inviteLink) {
          return NextResponse.json(
            {
              error: "Invalid request",
              message: "Invite link does not belong to target group",
            },
            { status: 400 }
          );
        }
      }
    }

    // Update participant to new group
    const result = await query<GroupParticipant>(
      `UPDATE public.courseparticipants
       SET
         course_group_id = $1,
         course_id = $2,
         course_code = $3,
         invite_link_id = $4
       WHERE courseparticipant_id = $5 AND account_id = $6
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
        targetGroupIdNum,
        targetGroup.course_id,
        courseCode,
        body.invite_link_id || null,
        participantIdNum,
        accountId,
      ]
    );

    if (result.length === 0) {
      throw new Error("Failed to transfer participant");
    }

    const transferredParticipant = result[0];

    // Get invite link info if exists
    if (transferredParticipant.invite_link_id) {
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
        [transferredParticipant.invite_link_id]
      );

      if (inviteLink) {
        transferredParticipant.invite_link = {
          invite_link_id: transferredParticipant.invite_link_id!,
          token: inviteLink.token,
          created_at: inviteLink.created_at,
          max_uses: inviteLink.max_uses,
          current_uses: inviteLink.current_uses,
          is_active: inviteLink.is_active,
        };
      }
    }

    return NextResponse.json({
      participant: transferredParticipant,
      message: "Participant transferred successfully",
    });
  } catch (error) {
    console.error("Error transferring participant:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
