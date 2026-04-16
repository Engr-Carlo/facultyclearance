import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

/**
 * GET /api/notifications
 * Returns notifications for the current user.
 * Query: ?unreadOnly=true
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";

  const conditions = [eq(notifications.userId, session.user.id)];
  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(notifications.createdAt);

  return NextResponse.json(rows);
}

/**
 * PATCH /api/notifications
 * Marks one or all notifications as read.
 * Body: { id?: string }   (omit id to mark all as read)
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const now = new Date();

  if (body.id) {
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.id, body.id),
          eq(notifications.userId, session.user.id)
        )
      );
  } else {
    // Mark all unread as read
    await db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt)
        )
      );
  }

  return NextResponse.json({ success: true });
}
