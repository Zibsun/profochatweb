import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, getAccountId } from "@/lib/db";
import { InviteLink } from "@/lib/types/types";
import crypto from "crypto";

function normalizeBotName(botName: string) {
  return botName.startsWith("@") ? botName.slice(1) : botName;
}

async function generateUniqueToken(maxAttempts = 5): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const token = crypto.randomBytes(8).toString("hex"); // 16 chars
    const exists = await queryOne<{ invite_link_id: number }>(
      `SELECT invite_link_id FROM public.invite_link WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (!exists) return token;
  }
  throw new Error("Failed to generate unique token");
}

/**
 * GET /api/groups/{group_id}/invites
 * Возвращает список пригласительных ссылок группы
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
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    const inviteLinks = await query<
      InviteLink & {
        bot_name: string;
        metadata: any;
      }
    >(
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
        il.metadata,
        b.bot_name
      FROM public.invite_link il
      JOIN public.course_group cg ON cg.course_group_id = il.course_group_id
      JOIN public.bot b ON b.bot_id = cg.bot_id AND b.account_id = cg.account_id
      WHERE il.course_group_id = $1 AND cg.account_id = $2
      ORDER BY il.created_at DESC`,
      [groupIdNum, accountId]
    );

    const botName = normalizeBotName(group.bot_name);
    const formattedLinks: InviteLink[] = inviteLinks.map((il) => {
      const inviteUrl = `https://t.me/${botName}?start=grp_${groupIdNum}_${il.token}`;
      return {
        invite_link_id: il.invite_link_id,
        group_id: il.group_id,
        token: il.token,
        max_uses: il.max_uses,
        current_uses: il.current_uses,
        expires_at: il.expires_at,
        created_at: il.created_at,
        created_by: il.created_by,
        is_active: il.is_active,
        metadata: typeof il.metadata === "string" ? JSON.parse(il.metadata) : il.metadata,
        invite_url: inviteUrl,
      };
    });

    return NextResponse.json({
      invite_links: formattedLinks,
      total: formattedLinks.length,
    });
  } catch (error) {
    console.error("Error loading invite links:", error);
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
 * POST /api/groups/{group_id}/invites
 * Создает новую пригласительную ссылку
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
          error: "Not found",
          message: "Group not found",
        },
        { status: 404 }
      );
    }

    const token = await generateUniqueToken();

    const result = await query<InviteLink>(
      `INSERT INTO public.invite_link (
        course_group_id,
        token,
        max_uses,
        current_uses,
        expires_at,
        created_by,
        is_active,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
      [
        groupIdNum,
        token,
        body.max_uses ?? null,
        0,
        body.expires_at ?? null,
        null, // TODO: Get from auth context
        body.is_active !== undefined ? body.is_active : true,
        body.metadata ? JSON.stringify(body.metadata) : null,
      ]
    );

    if (result.length === 0) {
      throw new Error("Failed to create invite link");
    }

    const newInviteLink = result[0];
    const botName = normalizeBotName(group.bot_name);
    const inviteUrl = `https://t.me/${botName}?start=grp_${groupIdNum}_${token}`;

    return NextResponse.json(
      {
        invite_link: {
          ...newInviteLink,
          invite_url: inviteUrl,
        },
        message: "Invite link created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invite link:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
