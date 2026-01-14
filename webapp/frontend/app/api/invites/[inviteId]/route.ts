import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { InviteLink } from "@/lib/types/types";

/**
 * PATCH /api/invites/{id}
 * Deactivate invite (is_active=false)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const accountId = getAccountId(request);
    const inviteIdNum = parseInt(inviteId);
    const body = await request.json().catch(() => ({}));

    if (isNaN(inviteIdNum)) {
      return NextResponse.json(
        { error: "Invalid invite ID", message: "Invite ID must be a number" },
        { status: 400 }
      );
    }

    // Ensure invite belongs to account via course_group
    const existing = await queryOne<{ invite_link_id: number; group_id: number }>(
      `SELECT il.invite_link_id, il.course_group_id AS group_id
       FROM public.invite_link il
       JOIN public.course_group cg ON cg.course_group_id = il.course_group_id
       WHERE il.invite_link_id = $1 AND cg.account_id = $2`,
      [inviteIdNum, accountId]
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Not found", message: "Invite not found" },
        { status: 404 }
      );
    }

    // Spec requirement: always set is_active=false
    const forceInactive = body?.is_active === undefined ? false : Boolean(body.is_active) === false;
    if (!forceInactive) {
      return NextResponse.json(
        { error: "Invalid request", message: "Only deactivation is supported (is_active=false)" },
        { status: 400 }
      );
    }

    const updated = await query<InviteLink>(
      `UPDATE public.invite_link
       SET is_active = false
       WHERE invite_link_id = $1
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
      [inviteIdNum]
    );

    if (updated.length === 0) {
      throw new Error("Failed to update invite");
    }

    const row = updated[0];
    return NextResponse.json({
      invite_link: {
        ...row,
        metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
      },
      message: "Invite deactivated",
    });
  } catch (error) {
    console.error("Error updating invite:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

