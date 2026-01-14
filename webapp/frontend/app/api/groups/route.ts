import { NextRequest, NextResponse } from "next/server";
import { query, getAccountId } from "@/lib/db";

type GroupListItem = {
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

/**
 * GET /api/groups
 * List groups (course_group) for account_id=1, created_at DESC
 */
export async function GET(request: NextRequest) {
  try {
    const accountId = getAccountId(request); // пока всегда 1

    const groups = await query<GroupListItem>(
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
      WHERE cg.account_id = $1
      ORDER BY cg.created_at DESC`,
      [accountId]
    );

    return NextResponse.json({
      groups: groups.map((g) => ({
        group_id: g.group_id,
        account_id: g.account_id,
        bot_id: g.bot_id,
        course_id: g.course_id,
        name: g.name,
        description: g.description ?? undefined,
        is_active: g.is_active,
        created_at: g.created_at,
        updated_at: g.updated_at,
        bot: {
          bot_id: g.bot_id,
          bot_name: g.bot_name,
          display_name: g.bot_display_name ?? undefined,
        },
        course: {
          course_id: g.course_id,
          course_code: g.course_code,
          title: g.course_title || g.course_code,
        },
      })),
      total: groups.length,
    });
  } catch (error) {
    console.error("Error loading groups:", error);
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
 * POST /api/groups
 * Create course_group
 */
export async function POST(request: NextRequest) {
  try {
    const accountId = getAccountId(request);
    const body = await request.json();

    if (!body.name || !body.course_id || !body.bot_id) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "name, course_id, and bot_id are required",
        },
        { status: 400 }
      );
    }

    const courseId = Number(body.course_id);
    const botId = Number(body.bot_id);
    if (!Number.isFinite(courseId) || !Number.isFinite(botId)) {
      return NextResponse.json(
        { error: "Invalid request", message: "course_id and bot_id must be numbers" },
        { status: 400 }
      );
    }

    const course = await query<{ course_id: number }>(
      `SELECT course_id FROM public.course WHERE course_id = $1 AND account_id = $2`,
      [courseId, accountId]
    );
    if (course.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "Course not found" },
        { status: 404 }
      );
    }

    const bot = await query<{ bot_id: number }>(
      `SELECT bot_id FROM public.bot WHERE bot_id = $1 AND account_id = $2`,
      [botId, accountId]
    );
    if (bot.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "Bot not found" },
        { status: 404 }
      );
    }

    const existing = await query<{ course_group_id: number }>(
      `SELECT course_group_id
       FROM public.course_group
       WHERE bot_id = $1 AND course_id = $2 AND name = $3 AND account_id = $4`,
      [botId, courseId, body.name, accountId]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Group with this name already exists for this bot and course",
        },
        { status: 409 }
      );
    }

    const result = await query<{
      group_id: number;
      account_id: number;
      bot_id: number;
      course_id: number;
      name: string;
      description: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
      settings: any;
    }>(
      `INSERT INTO public.course_group (
        account_id,
        bot_id,
        course_id,
        name,
        description,
        is_active,
        settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
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
      [
        accountId,
        botId,
        courseId,
        body.name,
        body.description || null,
        body.is_active !== undefined ? body.is_active : true,
        body.settings ? JSON.stringify(body.settings) : null,
      ]
    );

    return NextResponse.json(
      {
        group: result[0],
        message: "Group created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
