import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { GroupParticipant } from "@/lib/types/types";

/**
 * PATCH /api/groups/{group_id}/participants/{participant_id}
 * Обновляет данные участника
 */
export async function PATCH(
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

    // Check if participant exists and belongs to group
    const participant = await queryOne<{
      courseparticipant_id: number;
      course_group_id: number;
      account_id: number;
    }>(
      `SELECT courseparticipant_id, course_group_id, account_id
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

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.chat_id !== undefined) {
      updates.push(`chat_id = $${paramIndex}`);
      values.push(body.chat_id || null);
      paramIndex++;
    }

    if (body.username !== undefined) {
      updates.push(`username = $${paramIndex}`);
      values.push(body.username || null);
      paramIndex++;
    }

    if (body.invite_link_id !== undefined) {
      updates.push(`invite_link_id = $${paramIndex}`);
      values.push(body.invite_link_id || null);
      paramIndex++;
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

    values.push(participantIdNum, accountId);

    // Update participant
    const result = await query<GroupParticipant>(
      `UPDATE public.courseparticipants
       SET ${updates.join(", ")}
       WHERE courseparticipant_id = $${paramIndex} AND account_id = $${paramIndex + 1}
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
      values
    );

    if (result.length === 0) {
      throw new Error("Failed to update participant");
    }

    const updatedParticipant = result[0];

    // Get invite link info if exists
    if (updatedParticipant.invite_link_id) {
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
        [updatedParticipant.invite_link_id]
      );

      if (inviteLink) {
        updatedParticipant.invite_link = {
          invite_link_id: updatedParticipant.invite_link_id!,
          token: inviteLink.token,
          created_at: inviteLink.created_at,
          max_uses: inviteLink.max_uses,
          current_uses: inviteLink.current_uses,
          is_active: inviteLink.is_active,
        };
      }
    }

    return NextResponse.json({
      participant: updatedParticipant,
      message: "Participant updated successfully",
    });
  } catch (error) {
    console.error("Error updating participant:", error);
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
 * DELETE /api/groups/{group_id}/participants/{participant_id}
 * Удаляет участника из группы
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; participantId: string }> }
) {
  try {
    const { groupId, participantId } = await params;
    const accountId = getAccountId(request);
    const groupIdNum = parseInt(groupId);
    const participantIdNum = parseInt(participantId);

    if (isNaN(groupIdNum) || isNaN(participantIdNum)) {
      return NextResponse.json(
        {
          error: "Invalid ID",
          message: "Group ID and Participant ID must be numbers",
        },
        { status: 400 }
      );
    }

    // Check if participant exists and belongs to group
    const participant = await queryOne<{
      courseparticipant_id: number;
      course_group_id: number;
    }>(
      `SELECT courseparticipant_id, course_group_id
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

    // Delete participant
    await query(
      `DELETE FROM public.courseparticipants
       WHERE courseparticipant_id = $1 AND account_id = $2`,
      [participantIdNum, accountId]
    );

    return NextResponse.json({
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
